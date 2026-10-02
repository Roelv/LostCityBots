import Component from '#/cache/config/Component.js';
import InvType from '#/cache/config/InvType.js';
import LocType from '#/cache/config/LocType.js';
import ObjType from '#/cache/config/ObjType.js';
import Player from '#/engine/entity/Player.js';
import { isMapBlocked } from '#/engine/GameMap.js';
import { directPath } from '../BotPathFinder.js';
import { getWorld } from '../BotWorld.js';
import { InvButtonHandler } from '../handler/InvButtonHandler.js';
import { OpHeldHandler } from '../handler/OpHeldHandler.js';
import { OpHeldUHandler } from '../handler/OpHeldUHandler.js';

export function opHeld(player: Player, option: string, nameItem?: string): boolean {
    const item = findItem(player, 'inv', nameItem, option);
    if (item.length === 0) return true;

    OpHeldHandler(player, item[0], item[1], 3214, item[2]);
    return true;
}

export function opHeldU(player: Player, item1: string, item2: string): boolean {
    item1 = item1.toLowerCase();
    item2 = item2.toLowerCase();
    if (item1 === 'tinderbox' || item2 === 'tinderbox') {
        if (!firemaking(player)) return false;
    }

    const useItem = findItem(player, 'inv', item1);
    if (useItem.length === 0) return true;
    const onItem = findItem(player, 'inv', item2);
    if (onItem.length === 0) return true;

    OpHeldUHandler(player, onItem[0], onItem[1], 3214, useItem[0], useItem[1], 3214);
    return true;
}

export function invButton(player: Player, nameItem: string, invName: string, comId: number, option: string): boolean {
    const item = findItem(player, invName, nameItem);
    if (item.length === 0) return true;

    const iop = Component.get(comId).iop;
    if (!iop) return true;
    const op = findOp(item[0], option, iop);
    if (op === 0) return true;

    InvButtonHandler(player, item[0], item[1], comId, op)
    return true;
}

function findItem(player: Player, invName: string, nameItem?: string, option?: string): number[] {
    const inv = player.getInventory(InvType.getId(invName));
    if (!inv) return [];

    if (nameItem) {
        nameItem = nameItem.toLowerCase();
    }
    let obj, slot;
    let op = 0;
    for (let i = 0; i < inv.capacity; i++) {
        const item = inv.get(i);
        if (!item) continue;

        const type = ObjType.get(item.id);
        const name = type.name?.toLowerCase();
        if (!nameItem || name === nameItem || type.debugname?.startsWith(nameItem)) {
            if (option) {
                op = findOp(item.id, option);
                if (op === 0) continue;
            }
            obj = item.id;
            slot = i;
            break;
        }
    }

    if (obj === undefined || slot === undefined) {
        return [];
    }
    return [obj, slot, op];
}

function findOp(obj: number, option: string, iop?: (string | null)[]): number {
    let ops = ObjType.get(obj).iop;
    if (iop) ops = iop;
    if (!ops) return 0;
    option = option.toLowerCase();
    let op = 0;
    for (let i = 0; i < ops.length; i++) {
        if (ops[i]?.toLowerCase() === option) {
            op = i + 1;
            break;
        }
    }
    return op;
}

/**
 * Start from player tile and check if there isn't already a fire.
 * Else check surrounding tiles, increase radius until a tile is available.
 * Path to new tile if current tile isn't available.
 */
function firemaking(player: Player): boolean {
    const px = player.x;
    const pz = player.z;
    for (let d = 0; d < 16; d++) {
        for (let x = px - d; x <= px + d; x++) {
            for (let z = pz - d; z <= pz + d; z++) {
                if (x !== px - d && x !== px + d && z !== pz - d && z !== pz + d) {
                    continue;
                }
                let found = false;
                const zone = getWorld().gameMap.getZone(x, z, player.level);
                for (const loc of zone.getAllLocsSafe(true)) {
                    const name = LocType.get(loc.type).name;
                    if (loc.x === x && loc.z === z && name === 'Fire') {
                        found = true;
                        break;
                    }
                }

                if (!found) {
                    if (x === player.x && z === player.z) {
                        return true;
                    } else if (!isMapBlocked(x, z, player.level)) {
                        directPath(player, x, z);
                        return false;
                    }
                }
            }
        }
    }
    return true;
}
