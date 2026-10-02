import Player from '#/engine/entity/Player.js';
import { findPath, isLineOfWalk } from '#/engine/GameMap.js';
import { BotData, Spot } from './BotData.js';

class MinHeap {
    heap: number[][] = [];

    push(item: number[]) {
        this.heap.push(item);
        this._bubbleUp();
    }

    pop() {
        if (this.heap.length === 1) return this.heap.pop();
        const top = this.heap[0];
        this.heap[0] = this.heap.pop() as number[];
        this._bubbleDown();
        return top;
    }

    _bubbleUp() {
        let i = this.heap.length - 1;
        while (i > 0) {
            const p = Math.floor((i - 1) / 2);
            if (this.heap[p][0] <= this.heap[i][0]) break;
            [this.heap[p], this.heap[i]] = [this.heap[i], this.heap[p]];
            i = p;
        }
    }

    _bubbleDown() {
        let i = 0;
        const n = this.heap.length;
        while (true) {
            const l = 2 * i + 1, r = 2 * i + 2;
            let smallest = i;

            if (l < n && this.heap[l][0] < this.heap[smallest][0]) smallest = l;
            if (r < n && this.heap[r][0] < this.heap[smallest][0]) smallest = r;

            if (smallest === i) break;
            [this.heap[i], this.heap[smallest]] = [this.heap[smallest], this.heap[i]];
            i = smallest;
        }
    }

    isEmpty() {
        return this.heap.length === 0;
    }
}

/**
 * Dijkstra's Algorithm, source:
 * https://www.geeksforgeeks.org/dsa/dijkstras-shortest-path-algorithm-greedy-algo-7/
 * Used to travel between nodes which is faster than calculating every tile.
 * Adjusted to store parents and check conditions of our nodes.
 */
export function dijkstra(src: number, spots: Spot[]): number[] {
    const V = BotData.adjacent.length;

    // Min-heap (priority queue) storing pairs of (distance, node)
    const pq = new MinHeap();

    const dist = Array(V).fill(Number.MAX_SAFE_INTEGER);
    const parents = Array(V).fill(-1);

    // Distance from source to itself is 0
    dist[src] = 0;
    pq.push([0, src]);

    // Process the queue until all reachable vertices are finalized
    while (!pq.isEmpty()) {
        const pop = pq.pop() as number[];
        const name = BotData.nodes[pop[1]].name;
        if (name) {
            for (const spot of spots) {
                if (name === spot.name && spot.slots !== 0) {
                    return getParents(src, pop[1], parents);
                }
            }
        }
        const [d, u] = pop;

        // If this distance not the latest shortest one, skip it
        if (d > dist[u]) continue;

        // Explore all neighbors of the current vertex
        for (const [v, w] of BotData.adjacent[u]) {

            // If we found a shorter path to v through u, update it
            if (dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                parents[v] = u;
                pq.push([dist[v], v]);
            }
        }
    }

    let dest: number | null = null;
    let bestDist = Infinity;
    for (let i = 0; i < dist.length; i++) {
        if (dist[i] < bestDist) {
            const name = BotData.nodes[i].name;
            if (name) {
                for (const spot of spots) {
                    if (name === spot.name && spot.slots !== 0) {
                        dest = i;
                        bestDist = dist[i];
                        break;
                    }
                }
            }
        }
    }

    if (!dest) return [];
    return getParents(src, dest, parents);
}

function getParents(src: number, dest: number, parents: number[]): number[] {
    if (src === dest) return [dest];
    if (parents[dest] === -1) return [];
    const path: number[] = [];
    while (dest !== src) {
        path.push(dest);
        dest = parents[dest];
    }
    path.push(dest);
    return path;
}

/**
 * Only used for short distances.
 * Try simple waypoint if there are no obstables.
 * Otherwise fall back to BFS pathfinder.
 * It's slow so we avoid it as much as possible.
 */
export function directPath(player: Player, destX: number, destZ: number): void {
    if (isLineOfWalk(player.level, player.x, player.z, destX, destZ)) {
        player.queueWaypoint(destX, destZ);
    } else {
        player.queueWaypoints(findPath(player.level, player.x, player.z, destX, destZ));
    }
}
