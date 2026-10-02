import Player from '#/engine/entity/Player.js';
import { printInfo } from '#/util/Logger.js';
import { opHeld } from './action/OpInv.js';
import { BotConfig } from './BotConfig.js';
import { BotTask } from './BotTask.js';
import { IfButtonHandler } from './handler/IfButtonHandler.js';

export class BotPlayer {
    task: BotTask;
    player: Player;
    private id: number;
    private goal: number;
    login = false;
    logout = false;
    delete = false;
    private lastActive = 0;

    constructor(player: Player, id: number) {
        this.task = new BotTask(player);
        this.player = player;
        this.id = id;
        this.goal = this.setGoal();
    }

    tick(tick: number): void {
        // Player has been attacked in the last 8 ticks.
        const inCombat = this.player.getVar(38) as number + 8 > tick;
        if (inCombat && this.player.run === 0 && this.player.runenergy >= 100) {
            IfButtonHandler(this.player, 153); // Run button.
        }
        
        if ((tick - this.id) % 50 === 0) { // Every 30 seconds.
            if ((tick - this.id) % 1000 === 0 && this.id >= 0) { // Every 10 minutes.
                let total = 0;
                for (let stat = 0; stat < this.player.baseLevels.length; stat++) {
                    total += this.player.baseLevels[stat];
                }
                // If total level goal is reached, delete character.
                if (total >= this.goal) {
                    this.delete = true;
                    this.player.requestLogout = true;
                } else if (this.player.isActive && tick - this.player.lastMovement >= 1000) {
                    // Bot hasn't moved for 10 minutes.
                    if (this.task.task) {
                        console.log(this.task.task);
                        printInfo(`[Bot] ${this.player.username} is stuck at the above task.`);
                    } else {
                        printInfo(`[Bot] ${this.player.username} cannot find a path to any task.`);
                    }
                }
            }

            if (this.player.isActive) {
                // Run when energy is at least 75% to keep reserves for combat.
                if (this.player.run === 0 && this.player.runenergy >= 7500) {
                    IfButtonHandler(this.player, 153); // Run button.
                } else if (!inCombat && this.player.run !== 0 && this.player.runenergy < 7500) {
                    IfButtonHandler(this.player, 152); // Walk button.
                }
            } else {
                this.player.lastMovement = tick;
            }
        }

        if (this.player.isActive && this.player.levels[3] < 0.75 * this.player.baseLevels[3]) {
            if (this.player.levels[3] === 0) {
                this.reset(this.player);
            } else {
                // Eat any food in inventory when health is below 75%.
                opHeld(this.player, 'eat');
            }
        }

        if (this.player.delayed) return;

        // Only false if no task is available.
        if (this.task.tick(tick)) {
            if (this.player.isActive) {
                this.lastActive = tick;
            } else if (this.id >= 0) {
                this.login = true;
            }
        } else if (this.player.isActive && tick - this.lastActive >= 50 && this.id >= 0) {
            this.logout = true;
            this.player.requestLogout = true;
        }
    }

    /**
     * Bots are given a total level goal based on their id.
     * The bots with the most xp were given the lowest id,
     * so they get the highest goal.
     */
    private setGoal(): number {
        const min = 9 + this.player.stats.length;
        const max = 99 * this.player.stats.length;
        if (BotConfig.percentMax >= 100) {
            return max + 1;
        }

        const diff = (max - min) / (1 - BotConfig.percentMax / 100);
        const num = BotConfig.numBots;
        return Math.ceil(min + (num - this.id) * diff / num);
    }

    reset(player: Player): void {
        this.task.releaseSlot();
        this.task = new BotTask(player);
        this.player = player;
        this.login = false;
        this.logout = false;
        this.delete = false;
    }
}
