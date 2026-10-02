import Component, { ComActionTarget } from '#/cache/config/Component.js';
import { Interaction } from '#/engine/entity/Interaction.js';
import Npc from '#/engine/entity/Npc.js';
import Player from '#/engine/entity/Player.js';
import ServerTriggerType from '#/engine/script/ServerTriggerType.js';
import UnsetMapFlag from "#/network/game/server/model/UnsetMapFlag.js";

export function OpNpcTHandler(player: Player, npc: Npc, spellComId: number): boolean {
    if (player.delayed) {
        // normal: cannot interact while delayed
        player.write(new UnsetMapFlag());
        return false;
    }

    const spellCom = Component.get(spellComId);
    if (typeof spellCom === 'undefined' || (spellCom.actionTarget & ComActionTarget.NPC) === 0) {
        // bad client: component is not acceptable for this packet
        player.write(new UnsetMapFlag());
        return false;
    } else if (!player.isComponentVisible(spellCom)) {
        // bad client or lag: component is not visible
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

    player.clearPendingAction();
    player.setInteraction(Interaction.ENGINE, npc, ServerTriggerType.APNPCT, spellComId);
    return true;
}
