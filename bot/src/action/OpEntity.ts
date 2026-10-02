import InvType from '#/cache/config/InvType.js';
import LocType from '#/cache/config/LocType.js';
import NpcType from '#/cache/config/NpcType.js';
import ObjType from '#/cache/config/ObjType.js';
import { CoordGrid } from '#/engine/CoordGrid.js';
import Loc from '#/engine/entity/Loc.js';
import Npc from '#/engine/entity/Npc.js';
import Obj from '#/engine/entity/Obj.js';
import Player from '#/engine/entity/Player.js';
import { isMapBlocked } from '#/engine/GameMap.js';
import { BotData, Interact } from '../BotData.js';
import { directPath } from '../BotPathFinder.js';
import { getWorld } from '../BotWorld.js';
import { OpLocHandler } from '../handler/OpLocHandler.js';
import { OpLocTHandler } from '../handler/OpLocTHandler.js';
import { OpLocUHandler } from '../handler/OpLocUHandler.js';
import { OpNpcHandler } from '../handler/OpNpcHandler.js';
import { OpNpcTHandler } from '../handler/OpNpcTHandler.js';
import { OpNpcUHandler } from '../handler/OpNpcUHandler.js';
import { OpObjHandler } from '../handler/OpObjHandler.js';
import { OpObjTHandler } from '../handler/OpObjTHandler.js';
import { OpObjUHandler } from '../handler/OpObjUHandler.js';
import { distance } from '../Utility.js';

export function opEntity(player: Player, interact: Interact, dest: number | undefined): Loc | Npc | Obj | null {
    if (dest === undefined) return null;
    const coord = BotData.nodes[dest].coord;
    const entity = findEntity(player, interact, coord);
    if (!entity) return null;

    // Spell used on entity
    if (interact.comId) {
        if (entity instanceof Loc && OpLocTHandler(player, entity, interact.comId)) {
            return entity;
        } else if (entity instanceof Npc && OpNpcTHandler(player, entity, interact.comId)) {
            return entity;
        } else if (entity instanceof Obj && OpObjTHandler(player, entity, interact.comId)) {
            return entity;
        }
        return null;
    }

    if (interact.option) {
        let ops;
        if (entity instanceof Loc) {
            ops = LocType.get(entity.type).op;
        } else if (entity instanceof Npc) {
            ops = NpcType.get(entity.type).op;
        } else if (entity instanceof Obj) {
            ops = ObjType.get(entity.type).op;
        }

        if (!ops) return null;
        const option = interact.option.toLowerCase();
        let op = 0;
        for (let i = 0; i < ops.length; i++) {
            if (ops[i]?.toLowerCase() === option) {
                op = i + 1;
                break;
            }
        }
        if (op === 0) return null;
        if (entity instanceof Loc && OpLocHandler(player, entity, op)) {
            return entity;
        } else if (entity instanceof Npc && OpNpcHandler(player, entity, op)) {
            return entity;
        } else if (entity instanceof Obj && OpObjHandler(player, entity, op)) {
            return entity;
        }
    }

    if (!interact.use) return null;
    const inv = player.getInventory(InvType.INV);
    if (!inv) return entity;
    const use = interact.use.toLowerCase();
    let useObj, useSlot;
    for (let i = 0; i < inv.capacity; i++) {
        const item = inv.get(i);
        if (!item) continue;

        const type = ObjType.get(item.id);
        if (type.name?.toLowerCase() === use || type.debugname?.startsWith(use)) {
            useObj = item.id;
            useSlot = i;
            break;
        }
    }

    if (!useObj || !useSlot) {
        return entity;
    }
    if (entity instanceof Loc) {
        OpLocUHandler(player, entity, useObj, useSlot, 3214);
    } else if (entity instanceof Npc) {
        OpNpcUHandler(player, entity, useObj, useSlot, 3214);
    } else if (entity instanceof Obj) {
        OpObjUHandler(player, entity, useObj, useSlot, 3214);
    }
    return entity;
}

function findEntity(player: Player, interact: Interact, coord: number[]): Loc | Npc | Obj | null {
    let nameEntity;
    if (interact.loc) {
        nameEntity = interact.loc.toLowerCase();
    } else if (interact.npc) {
        nameEntity = interact.npc.toLowerCase();
    } else if (interact.obj) {
        nameEntity = interact.obj.toLowerCase();
    } else {
        return null;
    }

    let range = 16;
    if (interact.range) {
        range = interact.range;
    }

    let near = false;
    let best: Loc | Npc | Obj | null = null;
    let bestDist = Infinity;
    let bestCount = Infinity;
    const xMin = coord[0] - range;
    const xMax = coord[0] + range;
    const zMin = coord[1] - range;
    const zMax = coord[1] + range;
    const xMin8 = Math.floor((xMin) / 8);
    const xMax8 = Math.ceil((xMax) / 8);
    const zMin8 = Math.floor((zMin) / 8);
    const zMax8 = Math.ceil((zMax) / 8);
    const players = playersIn(player, xMin8, xMax8, zMin8, zMax8);
    for (let x = xMin8; x <= xMax8; x++) {
        for (let z = zMin8; z <= zMax8; z++) {
            const zone = getWorld().gameMap.getZone(x << 3, z << 3, player.level);
            let entities;
            if (interact.loc) {
                entities = zone.getAllLocsSafe(true);
            } else if (interact.npc) {
                entities = zone.getAllNpcsSafe(true);
            } else {
                entities = zone.getAllObjsSafe(true);
            }

            for (const entity of entities) {
                let type;
                if (entity instanceof Loc) {
                    type = LocType.get(entity.type);
                } else if (entity instanceof Npc) {
                    if (interact.option === 'attack' || interact.comId) {
                        // If npc has been attacked in the last 8 ticks.
                        if (entity.getVar(8) as number + 8 > getWorld().currentTick) {
                            continue;
                        }
                    }
                    type = NpcType.get(entity.type);
                } else {
                    if (entity.receiver64 !== Obj.NO_RECEIVER && entity.receiver64 !== player.hash64) {
                        continue;
                    }
                    type = ObjType.get(entity.type);
                }

                const name = type.name?.toLowerCase() === nameEntity;
                const debugname = type.debugname?.startsWith(nameEntity);
                const changed = entity instanceof Loc && entity.isChanged();
                if (!name && (!debugname || changed)) {
                    continue;
                }
                if (entity.x + entity.length - 1 < xMin || entity.x > xMax) {
                    continue;
                }
                if (entity.z + entity.width - 1 < zMin || entity.z > zMax) {
                    continue;
                }

                if (player.inOperableDistance(entity)) {
                    const exMin = entity.x - 1;
                    const exMax = entity.x + entity.length;
                    const ezMin = entity.z - 1;
                    const ezMax = entity.z + entity.width;
                    const atEntityX = player.x > exMin && player.x < exMax;
                    const atEntityZ = player.z > ezMin && player.z < ezMax;
                    const atEntity = atEntityX && atEntityZ;
                    const npcNotAt = entity instanceof Npc && !atEntity;
                    const objAt = entity instanceof Obj && atEntity;
                    if (entity instanceof Loc || npcNotAt || objAt) {
                        best = entity;
                        near = true;
                        break;
                    }
                }

                const count = playerCountAt(players, entity);
                const entityX = entity.x + (entity.length - 1) / 2;
                const entityZ = entity.z + (entity.width - 1) / 2;
                const dist = distance(player.x, player.z, entityX, entityZ);
                if (count < bestCount || (count === bestCount && dist < bestDist)) {
                    best = entity;
                    bestDist = dist;
                    bestCount = count;
                }
            }
            if (near) break;
        }
        if (near) break;
    }
    if (!best) return null;

    if (!near && !interact.keepDistance) {
        approachSide(player, best);
        return null;
    }
    return best;
}

function playersIn(player: Player, xMin: number, xMax: number, zMin: number, zMax: number): Player[] {
    const players: Player[] = [];
    for (let x = xMin; x <= xMax; x++) {
        for (let z = zMin; z <= zMax; z++) {
            const zone = getWorld().gameMap.getZone(x << 3, z << 3, player.level);
            for (const p of zone.getAllPlayersSafe()) {
                if (p !== player) {
                    players.push(p);
                }
            }
        }
    }
    return players;
}

/**
 * Count the amount of players adjacent to an entity.
 * If a player has a waypoint, use their destination instead.
 */
function playerCountAt(players: Player[], entity: Loc | Npc | Obj): number {
    if (players.length === 0) return 0;
    let count = 0;
    const xMin = entity.x - 1;
    const xMax = entity.x + entity.length;
    const zMin = entity.z - 1;
    const zMax = entity.z + entity.width;
    for (const p of players) {
        let x = p.x;
        let z = p.z;
        if (p.hasWaypoints()) {
            const coord = CoordGrid.unpackCoord(p.waypoints[0]);
            x = coord.x;
            z = coord.z;
        }
        if (x < xMin || x > xMax || z < zMin || z > zMax) {
            continue;
        }
        if ((x === xMin || x === xMax) && (z === zMin || z === zMax)) {
            continue;
        }
        count++;
    }
    return count;
}

function approachSide(player: Player, entity: Loc | Npc | Obj): void {
    if (entity instanceof Obj && !isMapBlocked(entity.x, entity.z, entity.level)) {
        directPath(player, entity.x, entity.z);
        return;
    }

    const xMin = entity.x - 1;
    const xMax = entity.x + entity.length;
    const zMin = entity.z - 1;
    const zMax = entity.z + entity.width;
    let bestX = xMin;
    let bestZ = entity.z;
    let bestDist = Infinity;

    for (let x = xMin; x <= xMax; x += xMax - xMin) {
        for (let z = entity.z; z < zMax; z++) {
            const dist = distance(player.x, player.z, x, z);
            if (dist < bestDist && !isMapBlocked(x, z, player.level)) {
                bestDist = dist;
                bestX = x;
                bestZ = z;
            }
        }
    }

    for (let z = zMin; z <= zMax; z += zMax - zMin) {
        for (let x = entity.x; x < xMax; x++) {
            const dist = distance(player.x, player.z, x, z);
            if (dist < bestDist && !isMapBlocked(x, z, player.level)) {
                bestDist = dist;
                bestX = x;
                bestZ = z;
            }
        }
    }

    directPath(player, bestX, bestZ);
}
