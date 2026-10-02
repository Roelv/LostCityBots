import HashTable from '#/datastruct/HashTable.js';
import Player from '#/engine/entity/Player.js';
import GameMap from '#/engine/GameMap.js';

export interface BotWorld {
    gameMap: GameMap;
    newPlayers: Set<Player>;
    playerLoop: HashTable<Player>;
    currentTick: number;
    shutdown: boolean;
}

let world: BotWorld;

export function setWorld(newWorld: BotWorld): void {
    world = newWorld;
}
export function getWorld(): BotWorld {
    return world;
}
