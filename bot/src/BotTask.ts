import Loc from '#/engine/entity/Loc.js';
import Npc from '#/engine/entity/Npc.js';
import Obj from '#/engine/entity/Obj.js';
import Player from '#/engine/entity/Player.js';
import { design } from './action/Design.js';
import { loot } from './action/Loot.js';
import { opEntity } from './action/OpEntity.js';
import { invButton, opHeld, opHeldU } from './action/OpInv.js';
import { BotData, Spot, Task } from './BotData.js';
import { BotPath } from './BotPath.js';
import { meetRequire } from './BotRequire.js';
import { IfButtonHandler } from './handler/IfButtonHandler.js';
import { OpNpcHandler } from './handler/OpNpcHandler.js';
import { ResumePauseButtonHandler } from './handler/ResumePauseButtonHandler.js';
import { TutClickSideHandler } from './handler/TutClickSideHandler.js';
import { shuffleArray } from './Utility.js';

export class BotTask {
    private path: BotPath;
    private player: Player;
    release = false;
    task: Task | null = null;
    private spot: Spot | null = null;
    private stage = { value: 0 };
    private lastEntity: Loc | Npc | Obj | null = null;
    private lastCombat = 0;

    constructor(player: Player) {
        this.path = new BotPath(player);
        this.player = player;
    }

    tick(tick: number): boolean {
        if (this.path.tick()) {
            return true;
        }

        if (!this.task) {
            this.task = this.pickTask();
            if (!this.task) return false;
        }

        if (this.task.spots && !this.spot) {
            this.path.waypoints = this.path.getPath(this.task.spots);
            if (this.path.waypoints.length > 0) {
                this.claimSlot(this.task.spots);
                if (this.path.tick()) return true;
            } else {
                this.task = null;
                return true;
            }
        }

        let actions = this.task.actions;
        let stage = this.stage;
        if (this.path.actions.length > 0) {
            actions = this.path.actions;
            stage = this.path.stage;
        } else if (!actions) {
            this.release = true;
            return true;
        }

        if (!this.player.isActive) {
            return true;
        }

        if (this.lastEntity instanceof Npc) {
            const lastAttack = this.lastEntity.getVar(8) as number;
            if (lastAttack + 8 > tick && this.lastEntity.levels[3] > 0) {
                // Npc has been attacked in the last 8 ticks but still alive.
                this.lastCombat = tick;
                if (!this.player.target) {
                    OpNpcHandler(this.player, this.lastEntity, 1);
                }
                return true;
            }
        }

        while (stage.value < actions.length) {
            let action = actions[stage.value];
            let done = false;
            let retry = false;

            if (!meetRequire(this.player, action.requires)) {
                done = true;
                retry = true;
            } else if (action.wait) {
                // Resume button is used when a skill levels up.
                if (action.wait.changed && this.lastEntity instanceof Loc) {
                    if (this.lastEntity.isChanged() || ResumePauseButtonHandler(this.player)) {
                        done = true;
                        retry = true;
                    }
                } else if (action.wait.moved && this.lastEntity) {
                    if (!this.player.inOperableDistance(this.lastEntity) || ResumePauseButtonHandler(this.player)) {
                        done = true;
                        retry = true;
                    }
                } else {
                    done = true;
                }
            } else if (action.repeat) {
                stage.value -= action.repeat;
                if (stage.value < 0) stage.value = 0;
                retry = true;
            } else if (action.interact) {
                const ai = action.interact;
                if (ai.inv) {
                    if (ai.option) {
                        if (ai.invName && ai.comId !== undefined) {
                            if (invButton(this.player, ai.inv, ai.invName, ai.comId, ai.option)) {
                                done = true;
                            }
                        } else if (opHeld(this.player, ai.option, ai.inv)) {
                            done = true;
                            retry = true;
                        }
                    } else if (ai.use) {
                        if (opHeldU(this.player, ai.use, ai.inv)) {
                            done = true;
                        }
                    }
                } else if (ai.loc || ai.npc || ai.obj) {
                    let src = this.path.waypoints[this.path.waypoints.length - 1];
                    const entity = opEntity(this.player, ai, src);
                    if (entity) {
                        this.lastEntity = entity;
                        done = true;
                    }
                } else if (ai.loot && this.lastEntity instanceof Npc) {
                    if (loot(this.player, this.lastEntity, this.lastCombat)) {
                        done = true;
                        retry = true;
                    }
                }
            } else if (action.button !== undefined) {
                if (!IfButtonHandler(this.player, action.button)) {
                    retry = true;
                }
                done = true;
            } else if (action.design) {
                design(this.player);
                done = true;
            } else if (action.tutClickSide !== undefined) {
                TutClickSideHandler(this.player, action.tutClickSide);
                done = true;
            } else if (action.resume) {
                if (!ResumePauseButtonHandler(this.player)) {
                    retry = true;
                }
                done = true;
            }

            if (this.path.actions.length > 0 && !done) {
                done = true;
                retry = true;
            }
            if (done) {
                stage.value++;
            }
            if (stage.value >= actions.length) {
                break;
            }
            if (!retry) {
                return true;
            }
        }

        if (this.path.actions.length > 0) {
            this.path.tick();
        } else {
            this.release = true;
        }
        return true;
    }

    /**
     * First try to find a questing task that has free slots and
     * the bot meets the requirements.
     * If none are found, find an available skilling task.
     */
    private pickTask(): Task | null {
        const tutorial = this.player.getVar(281) as number <= 660;
        for (const tasks of BotData.tasksQuest) {
            if (tasks.length === 0) continue;

            // Check the requirements for the last task of the quest.
            // If the quest is completed, we can skip checking all tasks.
            const lastTask = tasks[tasks.length - 1];
            let completed = false;
            if (lastTask.requires) {
                for (const require of lastTask.requires) {
                    if (require.varp !== undefined) {
                        // If still in the tutorial, skip all other quests.
                        if (tutorial && require.varp !== 281) {
                            completed = true;
                            break;
                        }
                        const varp = this.player.getVar(require.varp) as number;
                        if (require.value !== undefined && varp > require.value) {
                            completed = true;
                            break;
                        }
                        if (require.max !== undefined && varp > require.max) {
                            completed = true;
                            break;
                        }
                    }
                }
            }
            if (completed) continue;

            for (const task of tasks) {
                if (this.taskReady(task)) {
                    return task;
                }
            }
        }
        if (tutorial) return null;

        // Skilling tasks give priority to the skill with the lowest xp.
        const stats: number[][] = [];
        for (let stat = 0; stat < this.player.stats.length; stat++) {
            stats.push([stat, this.player.stats[stat]]);
        }
        shuffleArray(stats);
        stats.sort((a, b) => a[1] - b[1]);
        for (const stat of stats) {
            if (BotData.tasksSkill[stat[0]] === undefined) {
                continue;
            }
            const tasks = BotData.tasksSkill[stat[0]].slice();
            shuffleArray(tasks);
            for (const task of tasks) {
                if (this.taskReady(task)) {
                    return task;
                }
            }
        }

        return null;
    }

    private taskReady(task: Task): boolean {
        if (task.spots) {
            let ready = false;
            for (const spot of task.spots) {
                if (spot.slots === undefined || spot.slots > 0) {
                    ready = true;
                    break;
                }
            }
            if (!ready) return false;
        }

        return meetRequire(this.player, task.requires);
    }

    private claimSlot(spots: Spot[]): void {
        const name = BotData.nodes[this.path.waypoints[0]].name;
        if (name) {
            for (const spot of spots) {
                if (name === spot.name) {
                    if (spot.slots !== undefined) {
                        spot.slots--;
                    }
                    this.spot = spot;
                    break;
                }
            }
        }
    }

    releaseSlot(): void {
        if (this.spot && this.spot.slots !== undefined) {
            this.spot.slots++;
        }
        this.release = false;
        this.task = null;
        this.spot = null;
        this.stage.value = 0;
    }
}
