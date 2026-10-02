import { existsSync, readFileSync, unlink } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { Worker } from 'worker_threads';
import { isClientConnected } from '#/engine/entity/NetworkPlayer.js';
import Player from '#/engine/entity/Player.js';
import { PlayerLoading } from '#/engine/entity/PlayerLoading.js';
import Packet from '#/io/Packet.js';
import { printInfo } from '#/util/Logger.js';
import { changeUsername } from './BotAccount.js';
import { BotConfig } from './BotConfig.js';
import { BotData } from './BotData.js';
import { BotPlayer } from './BotPlayer.js';
import { setWorld, BotWorld } from './BotWorld.js';
const dir = dirname(fileURLToPath(import.meta.url));

export class Bot {
    private static bots: BotPlayer[] = [];
    private static botNames: string[] = [];
    private static lastLogin = -Infinity;

    static tick(world: BotWorld): void {
        if (world.shutdown) return;

        // Only allow bots to login after 10 ticks to
        // avoid creating too many listener events at server start.
        if (world.currentTick < 10) {
            if (world.currentTick === 0) {
                setWorld(world);
                BotConfig.readConfig();
                BotData.readTasks();
                BotData.readNodes();
                // Load bots in seperate thread to avoid slowing down world.
                const worker = new Worker(join(dir, 'BotName.js'));
                worker.on('message', (result) => {
                    this.botNames = result;
                    this.accountWorker();
                });
            }
            return;
        }

        for (const player of world.playerLoop.all()) {
            if (!isClientConnected(player)) continue;
            for (const name of BotConfig.botClients) {
                // If player logged in to bot client, active bot.
                if (player.username === name) {
                    let exists = false;
                    for (const bot of this.bots) {
                        if (player.username === bot.player.username) {
                            if (player !== bot.player) {
                                bot.reset(player);
                            }
                            exists = true;
                            break;
                        }
                    }
                    if (!exists) {
                        this.bots.unshift(new BotPlayer(player, -1));
                    }
                    break;
                }
            }
        }

        for (const bot of this.bots) {
            bot.player.lastResponse = world.currentTick;
            bot.player.lastConnected = world.currentTick;
            bot.player.requestIdleLogout = false;
            if (!bot.player.isActive) {
                if (bot.delete) {
                    this.deleteSave(bot);
                    continue;
                }
                if (bot.logout) {
                    bot.reset(this.loadSave(bot.player.username, bot.player));
                }
            }

            bot.tick(world.currentTick);
            if (bot.login) {
                // New bots are spread out to avoid overcrowding the tutorial.
                if (bot.player.playtime > 0 || world.currentTick - this.lastLogin >= 25) {
                    this.lastLogin = world.currentTick;
                    bot.login = false;
                    world.newPlayers.add(bot.player);
                }
            }
        }

        for (const bot of this.bots) {
            if (bot.task.release) {
                bot.task.releaseSlot();
            }
        }
    }

    private static accountWorker(): void {
        const worker = new Worker(join(dir, 'BotAccount.js'));
        worker.on('message', (usernames) => {
            const players: Player[] = [];
            for (const username of usernames) {
                players.push(this.loadSave(username));
            }
            this.createBots(players);
            printInfo(`[Bot] Finished loading ${this.bots.length} bots.`);
        });
        const botNames = this.botNames;
        const numBots = BotConfig.numBots;
        const renameBots = BotConfig.renameBots;
        worker.postMessage({ botNames, numBots, renameBots });
    }

    /**
     * Sort bots by their total xp in descending order.
     */
    private static createBots(players: Player[]): void {
        interface playerXP {
            player: Player;
            xp: number;
        }
        const playersXP: playerXP[] = [];
        for (const player of players) {
            let xp = 0;
            for (let stat = 0; stat < player.stats.length; stat++) {
                xp += player.stats[stat];
            }
            playersXP.push({ player, xp });
        }
        playersXP.sort((a, b) => b.xp - a.xp);

        let id = 0;
        for (const playerXP of playersXP) {
            this.bots.push(new BotPlayer(playerXP.player, id));
            id++;
        }
    }

    private static loadSave(username: string, player?: Player): Player {
        let save: Uint8Array = new Uint8Array();
        if (player) {
            save = player.save();
        } else {
            const path = `data/players/${BotConfig.profile}/${username}.sav`;
            if (existsSync(path)) {
                save = readFileSync(path);
            }
        }

        try {
            player = PlayerLoading.load(username, new Packet(save), null);
        } catch (err) {
            if (err instanceof Error) {
                console.error(username, err.message);
            }
            save = new Uint8Array();
            player = PlayerLoading.load(username, new Packet(save), null);
        }
        return player;
    }

    private static deleteSave(bot: BotPlayer): void {
        unlink(`data/players/${BotConfig.profile}/${bot.player.username}.sav`, () => {
            changeUsername(bot.player.username, this.botNames)
                .then(newUsername => {
                    if (newUsername !== '') bot.player.username = newUsername;
                })
                .catch(err => console.error(err))
                .finally(() => {
                    bot.reset(this.loadSave(bot.player.username));
                });
        });
    }
}
