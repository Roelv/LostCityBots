import { CoordGrid } from '#/engine/CoordGrid.js';
import Npc from '#/engine/entity/Npc.js';
import Player from '#/engine/entity/Player.js';
import { isMapBlocked } from '#/engine/GameMap.js';
import { directPath } from '../BotPathFinder.js';
import { getWorld } from '../BotWorld.js';
import { OpObjHandler } from '../handler/OpObjHandler.js';
import { opHeld } from './OpInv.js';

export function loot(player: Player, npc: Npc, lastCombat: number): boolean {
    if (player.level !== npc.level || isMapBlocked(npc.x, npc.z, npc.level)) {
        return true;
    }

    // Wait for drops to spawn.
    if (lastCombat + 4 > getWorld().currentTick) {
        return false;
    }

    const zone = getWorld().gameMap.getZone(npc.x, npc.z, npc.level);
    const objs = zone.getObjsSafe(CoordGrid.packZoneCoord(npc.x, npc.z));
    for (const obj of objs) {
        if (obj.receiver64 !== player.hash64) {
            continue;
        }
        if (player.x !== obj.x || player.z !== obj.z) {
            directPath(player, obj.x, obj.z);
            return false;
        }
        if (OpObjHandler(player, obj, 3)) {
            return false;
        }
    }

    opHeld(player, 'bury');
    return true;
}
