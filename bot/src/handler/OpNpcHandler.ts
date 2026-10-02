import NpcType from '#/cache/config/NpcType.js';
import { Interaction } from '#/engine/entity/Interaction.js';
import Npc from '#/engine/entity/Npc.js';
import Player from '#/engine/entity/Player.js';
import ServerTriggerType from '#/engine/script/ServerTriggerType.js';
import UnsetMapFlag from '#/network/game/server/model/UnsetMapFlag.js';

export function OpNpcHandler(player: Player, npc: Npc, op: number): boolean {
    if (player.delayed) {
        // normal: cannot interact while delayed
        player.write(new UnsetMapFlag());
        return false;
    }

    if (!npc) {
        // bad client or lag: npc does not exist
        player.write(new UnsetMapFlag());
        return false;
    } else if (npc.delayed) {
        // normal: cannot interact with delayed npcs
        player.write(new UnsetMapFlag());
        return false;
    }

    const npcType = NpcType.get(npc.type);
    if (!npcType.op || npcType.op[op - 1] === null || npcType.op[op - 1] === 'hidden') {
        // bad client: not a valid npc option
        player.write(new UnsetMapFlag());
        return false;
    }

    const trigger: ServerTriggerType = ServerTriggerType.APNPC1 + (op - 1);
    player.clearPendingAction();
    player.setInteraction(Interaction.ENGINE, npc, trigger);
    return true;
}
