import LocType from '#/cache/config/LocType.js';
import { Interaction } from '#/engine/entity/Interaction.js';
import Loc from '#/engine/entity/Loc.js';
import Player from '#/engine/entity/Player.js';
import ServerTriggerType from '#/engine/script/ServerTriggerType.js';
import UnsetMapFlag from '#/network/game/server/model/UnsetMapFlag.js';

export function OpLocHandler(player: Player, loc: Loc, op: number): boolean {
    if (player.delayed) {
        // normal: cannot interact while delayed
        player.write(new UnsetMapFlag());
        return false;
    }

    if (!loc) {
        // bad client or lag: loc does not exist
        player.write(new UnsetMapFlag());
        return false;
    }

    const locType = LocType.get(loc.type);
    if (!locType.op || locType.op[op - 1] === null || locType.op[op - 1] === 'hidden') {
        // bad client: not a valid loc option
        player.write(new UnsetMapFlag());
        return false;
    }

    const trigger: ServerTriggerType = ServerTriggerType.APLOC1 + (op - 1);
    player.clearPendingAction();
    player.setInteraction(Interaction.ENGINE, loc, trigger);
    return true;
}
