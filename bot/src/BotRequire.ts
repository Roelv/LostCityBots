import ObjType from '#/cache/config/ObjType.js';
import Player from '#/engine/entity/Player.js';
import { PlayerStatMap } from '#/engine/entity/PlayerStat.js';
import { Require } from './BotData.js';

export function meetRequire(player: Player, requires: Require[] | undefined): boolean {
    if (!requires) return true;

    for (const require of requires) {
        let value;
        if (require.varp !== undefined) {
            value = player.getVar(require.varp) as number;
        } else if (require.stat) {
            if (require.stat.toLowerCase() === 'combat') {
                value = player.combatLevel;
            } else {
                const id = PlayerStatMap.get(require.stat.toUpperCase());
                if (id === undefined) {
                    continue;
                }
                value = player.baseLevels[id];
            }
        } else if (require.owns) {
            value = countItem(player, require.owns);
        } else if (require.inv && require.inv !== '') {
            value = countItem(player, require.inv);
        } else if (require.worn) {
            value = countItem(player, require.worn);
        }

        if (value === undefined) {
            continue;
        }
        if (require.value !== undefined && value !== require.value) {
            return false;
        }
        if (require.min !== undefined && value < require.min) {
            return false;
        }
        if (require.max !== undefined && value > require.max) {
            return false;
        }
    }

    return true;
}

function countItem(player: Player, nameItem: string): number {
    let count = 0;
    for (let type = 93; type <= 95; type++) {
        const inv = player.getInventory(type);
        if (!inv) continue;
        for (let i = 0; i < inv.capacity; i++) {
            const item = inv.get(i);
            if (!item) {
                if (type === 95) {
                    break;
                } else {
                    continue;
                }
            }
            const name = ObjType.get(item.id).name?.toLowerCase();
            if (name === nameItem.toLowerCase()) {
                count += item.count;
                if (type === 95) {
                    break;
                }
            }
        }
    }
    return count;
}
