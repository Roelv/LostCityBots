import InvType from '#/cache/config/InvType.js';
import ObjType from '#/cache/config/ObjType.js';
import Player from '#/engine/entity/Player.js';
import { PlayerStatMap } from '#/engine/entity/PlayerStat.js';
import { Require } from './BotData.js';

export function meetRequire(player: Player, requires: Require[] | undefined): boolean {
    if (!requires) return true;
    for (const require of requires) {
        if (require.varp !== undefined) {
            const varp = player.getVar(require.varp) as number;
            if (!meetValue(varp, require)) {
                return false;
            }
        } else if (require.inv) {
            const inv = player.getInventory(InvType.INV);
            if (!inv) return false;
            let count = 0;
            if (require.inv === '') {
                count = inv.freeSlotCount;
            } else {
                for (let i = 0; i < inv.capacity; i++) {
                    const item = inv.get(i);
                    if (!item) continue;
                    const name = ObjType.get(item.id).name?.toLowerCase();
                    if (name === require.inv.toLowerCase()) {
                        count += item.count;
                    }
                }
            }
            if (!meetValue(count, require)) {
                return false;
            }
        } else if (require.stat) {
            if (require.stat.toLowerCase() === 'combat') {
                if (!meetValue(player.combatLevel, require)) {
                    return false;
                }
            } else {
                const id = PlayerStatMap.get(require.stat.toUpperCase());
                if (id === undefined) continue;
                if (!meetValue(player.baseLevels[id], require)) {
                    return false;
                }
            }
        }
    }

    return true;
}

function meetValue(value: number, require: Require): boolean {
    if (require.value !== undefined && value !== require.value) {
        return false;
    }
    if (require.min !== undefined && value < require.min) {
        return false;
    }
    if (require.max !== undefined && value > require.max) {
        return false;
    }
    return true;
}
