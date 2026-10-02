import Player from '#/engine/entity/Player.js';
import ScriptProvider from '#/engine/script/ScriptProvider.js';
import ScriptRunner from '#/engine/script/ScriptRunner.js';
import ServerTriggerType from '#/engine/script/ServerTriggerType.js';

export function TutClickSideHandler(player: Player, tab: number): boolean {
    if (tab < 0 || tab > 13) {
        return false;
    }

    const script = ScriptProvider.getByTriggerSpecific(ServerTriggerType.TUTORIAL, -1, -1);
    if (script) {
        player.executeScript(ScriptRunner.init(script, player), true);
    }

    return true;
}
