import { readdirSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { PlayerStatMap } from '#/engine/entity/PlayerStat.js';
import { isIndoors } from '#/engine/GameMap.js';
const dir = dirname(fileURLToPath(import.meta.url));

export interface Task {
    requires?: Require[];
    spots?: Spot[];
    actions?: Action[];
}

export interface Require {
    varp?: number;
    stat?: string;
    owns?: string;
    inv?: string;
    worn?: string;
    value?: number;
    min?: number;
    max?: number;
}

export interface Spot {
    name: string;
    slots?: number;
}

export interface Action {
    requires?: Require[];
    wait?: Wait;
    repeat?: number;
    interact?: Interact;
    button?: number;
    design?: boolean;
    resume?: boolean;
    tutClickSide?: number;
}

interface Wait {
    changed?: boolean;
    moved?: boolean;
}

export interface Interact {
    option?: string;
    use?: string;
    inv?: string;
    invName?: string;
    comId?: number;
    loc?: string;
    npc?: string;
    obj?: string;
    range?: number;
    keepDistance?: boolean;
    loot?: boolean;
}

export interface Node {
    coord: number[];
    radius?: number;
    name?: string;
    links?: Link[];
}

interface Link {
    coord: number[];
    actions?: Action[];
}

export class BotData {
    static tasksQuest: Task[][] = [];
    static tasksSkill: Task[][] = [];
    static nodes: Node[] = [];
    static adjacent: number[][][] = [];

    static readTasks(): void {
        let directory = join(dir, '../tasks/quests');
        let files = readdirSync(directory);
        for (const file of files) {
            const fileName = join(directory, `/${file}`);
            const content = readFileSync(fileName, 'utf8');
            const tasks: Task[] = [];
            for (const task of JSON.parse(content).tasks) {
                tasks.push(task);
            }
            this.tasksQuest.push(tasks);
        }

        directory = join(dir, '../tasks/skills');
        files = readdirSync(directory);
        for (const file of files) {
            const skill = file.slice(0, -5);
            const id = PlayerStatMap.get(skill.toUpperCase());
            if (id === undefined) continue;
            const fileName = join(directory, `/${file}`);
            const content = readFileSync(fileName, 'utf8');
            for (const task of JSON.parse(content).tasks) {
                this.tasksSkill[id].push(task);
            }
        }
    }

    static readNodes(): void {
        const directories = [join(dir, '../nodes')];
        while (directories.length > 0) {
            const files = readdirSync(directories[0], { withFileTypes: true });
            for (const file of files) {
                const fileName = join(directories[0], `/${file.name}`);
                if (file.isDirectory()) {
                    directories.push(fileName);
                    continue;
                }
                const content = readFileSync(fileName, 'utf8');
                for (const node of JSON.parse(content).nodes) {
                    if (node.links) {
                        const nodeIndoors = isIndoors(node.coord[0], node.coord[1], node.coord[2] ?? 0);
                        for (const link of node.links) {
                            const linkIndoors = isIndoors(link.coord[0], link.coord[1], link.coord[2] ?? 0);
                            if (!link.actions && nodeIndoors !== linkIndoors) {
                                link.actions = [{ interact: { option: 'open', loc: 'door', range: 1 } }];
                            }
                        }
                    }
                    this.nodes.push(node);
                }
            }
            directories.shift();
        }

        for (const node of this.nodes) {
            const adjCurr: number[][] = [];
            if (!node.links) {
                this.adjacent.push(adjCurr);
                continue;
            }
            for (const link of node.links) {
                for (let i = 0; i < this.nodes.length; i++) {
                    const coord = this.nodes[i].coord;
                    if (coord[0] === link.coord[0] && coord[1] === link.coord[1]) {
                        const dx = Math.abs(link.coord[0] - node.coord[0]);
                        const dz = Math.abs(link.coord[1] - node.coord[1]);
                        const dist = Math.max(dx, dz);
                        adjCurr.push([i, dist]);
                        break;
                    }
                }
            }
            this.adjacent.push(adjCurr);
        }
    }
}
