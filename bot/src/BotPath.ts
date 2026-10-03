import { CoordGrid } from '#/engine/CoordGrid.js';
import Player from '#/engine/entity/Player.js';
import { findPath, isMapBlocked } from '#/engine/GameMap.js';
import { Action, BotData, Node, Spot } from './BotData.js';
import { dijkstra, directPath } from './BotPathFinder.js';
import { distance, random } from './Utility.js';

export class BotPath {
    private player: Player;
    waypoints: number[] = [];
    actions: Action[] = [];
    stage = { value: 0 };
    private triedNodes: Node[] = [];

    constructor(player: Player) {
        this.player = player;
    }

    tick(): boolean {
        this.actions = [];
        if (this.player.hasWaypoints()) {
            if (!this.player.isActive) return true;
            if (this.player.stepsTaken > 0) return true;

            // Got stuck with simple waypoint, fully calculate path instead.
            const coord = CoordGrid.unpackCoord(this.player.waypoints[0]);
            this.player.clearWaypoints();
            this.player.queueWaypoints(findPath(this.player.level, this.player.x, this.player.z, coord.x, coord.z));
            return true;
        }

        if (this.waypoints.length < 2) return false;
        if (!this.player.isActive) return true;
        let src = this.waypoints[this.waypoints.length - 1];
        let dest = this.waypoints[this.waypoints.length - 2];
        let a = BotData.nodes[src];
        let b = BotData.nodes[dest];
        if (this.isPlayerAt(b)) {
            this.waypoints.pop();
            this.stage.value = 0;
            if (this.waypoints.length < 2) return false;
            src = dest;
            a = b;
            dest = this.waypoints[this.waypoints.length - 2];
            b = BotData.nodes[dest];
        } else if (!this.isPlayerAt(a)) {
            this.pathToNode(a);
            return true;
        }

        if (!a.links) return false;
        for (const link of a.links) {
            // If not at the same floor.
            if ((link.coord[2] ?? 0) !== (b.coord[2] ?? 0)) {
                continue;
            }
            if (link.coord[0] !== b.coord[0] || link.coord[1] !== b.coord[1]) {
                continue;
            }

            if (link.actions && this.stage.value < link.actions.length) {
                this.actions = link.actions;
                return false;
            }

            this.stage.value = 0;
            break;
        }

        this.pathToNode(b);
        return true;
    }

    /**
     * First get to the closest reachable node.
     * Then we can safely find the full path.
     * For performance this is only calculated once per task.
     */
    getPath(spots: Spot[]): number[] {
        let src = -1;
        for (let i = 0; i < BotData.nodes.length; i++) {
            if (this.isPlayerAt(BotData.nodes[i])) {
                src = i;
                break;
            }
        }

        if (src === -1) {
            // The closest node is not always reachable.
            // The bot will get stuck and try the next closest.
            // This limit is set for safety.
            if (this.triedNodes.length >= 10) {
                this.triedNodes = [];
            }

            let best: Node | null = null;
            let bestDist = Infinity;
            for (const node of BotData.nodes) {
                if (this.player.level !== (node.coord[2] ?? 0)) {
                    continue;
                }
                const dist = distance(this.player.x, this.player.z, node.coord[0], node.coord[1]);
                if (dist < bestDist) {
                    let skip = false;
                    for (const tried of this.triedNodes) {
                        if (node.coord[0] === tried.coord[0] && node.coord[1] === tried.coord[1]) {
                            skip = true;
                            break;
                        }
                    }

                    if (!skip) {
                        best = node;
                        bestDist = dist;
                    }
                }
            }
            if (!best) return [];

            this.pathToNode(best);
            if (this.player.isActive) {
                this.triedNodes.push(best);
            }
            return [];
        }

        this.triedNodes = [];
        return dijkstra(src, spots);
    }

    private isPlayerAt(node: Node): boolean {
        if (this.player.level !== (node.coord[2] ?? 0)) {
            return false;
        }
        const radius = node.radius ?? 0;
        const xMin = node.coord[0] - radius;
        const xMax = node.coord[0] + radius;
        const zMin = node.coord[1] - radius;
        const zMax = node.coord[1] + radius;
        const p = this.player;
        if (p.x >= xMin && p.x <= xMax && p.z >= zMin && p.z <= zMax) {
            return true;
        }
        return false;
    }

    /**
     * If the node has a radius, path to a random reachable tile.
     * Limit attempts to prevent an infinite loop.
     * Though bots get stuck if a node has no reachable tiles.
     */
    private pathToNode(node: Node): void {
        let x = node.coord[0];
        let z = node.coord[1];
        const radius = node.radius ?? 0;
        if (radius > 0) {
            const xMin = node.coord[0] - radius;
            const xMax = node.coord[0] + radius;
            const zMin = node.coord[1] - radius;
            const zMax = node.coord[1] + radius;
            let attempts = 10;
            while (attempts > 0) {
                attempts--;
                const rx = random(xMin, xMax);
                const rz = random(zMin, zMax);
                if (!isMapBlocked(rx, rz, this.player.level)) {
                    x = rx;
                    z = rz;
                    break;;
                }
            }
        }
        directPath(this.player, x, z);
    }
}
