import ObjType from '#/cache/config/ObjType.js';
import { Interaction } from '#/engine/entity/Interaction.js';
import Obj from '#/engine/entity/Obj.js';
import Player from '#/engine/entity/Player.js';
import ServerTriggerType from '#/engine/script/ServerTriggerType.js';
import UnsetMapFlag from '#/network/game/server/model/UnsetMapFlag.js';

export function OpObjHandler(player: Player, obj: Obj, op: number): boolean {
    if (player.delayed) {
        // normal: cannot interact while delayed
        player.write(new UnsetMapFlag());
        return false;
    }

    if (!obj) {
        // bad client or lag: obj does not exist
        player.write(new UnsetMapFlag());
        return false;
    }

    const type = ObjType.get(obj.type);
    if (type.op[op - 1] === null || type.op[op - 1] === 'hidden') {
        // bad client or lag: obj does not exist
        player.write(new UnsetMapFlag());
        return false;
    }

    const trigger: ServerTriggerType = ServerTriggerType.APOBJ1 + (op - 1);
    player.clearPendingAction();
    player.setInteraction(Interaction.ENGINE, obj, trigger);
    return true;
}
