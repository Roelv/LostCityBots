import Component from '#/cache/config/Component.js';
import { Interaction } from '#/engine/entity/Interaction.js';
import Npc from '#/engine/entity/Npc.js';
import Player from '#/engine/entity/Player.js';
import ServerTriggerType from '#/engine/script/ServerTriggerType.js';
import UnsetMapFlag from "#/network/game/server/model/UnsetMapFlag.js";

export function OpNpcUHandler(player: Player, npc: Npc, useObj: number, useSlot: number, useComId: number): boolean {
    if (player.delayed) {
        // normal: cannot interact while delayed
        player.write(new UnsetMapFlag());
        return false;
    }

    const useCom = Component.get(useComId);
    if (typeof useCom === 'undefined' || !useCom.usable) {
        // bad client: component is not acceptable for this packet
        player.write(new UnsetMapFlag());
        return false;
    } else if (!player.isComponentVisible(useCom)) {
        // bad client or lag: component is not visible
        player.write(new UnsetMapFlag());
        return false;
    }

    const useListener = player.invListeners.find(l => l.com === useComId);
    const useInv = player.getInventoryFromListener(useListener);
    if (!useInv) {
        // bad client or lag: inventory is not transmitted to client
        player.write(new UnsetMapFlag());
        return false;
    }

    if (!useInv.validSlot(useSlot)) {
        // bad client: real inventory is smaller
        player.write(new UnsetMapFlag());
        return false;
    } else if (!useInv.hasAt(useSlot, useObj)) {
        // bad client or lag: item does not exist in inventory
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
    player.lastUseItem = useObj;
    player.lastUseSlot = useSlot;

    player.setInteraction(Interaction.ENGINE, npc, ServerTriggerType.APNPCU);
    return true;
}
