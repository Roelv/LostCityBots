import Player from '#/engine/entity/Player.js';
import ScriptState from '#/engine/script/ScriptState.js';

export function ResumePauseButtonHandler(player: Player): boolean {
    if (!player.activeScript || player.activeScript.execution !== ScriptState.PAUSEBUTTON) {
        return false;
    }

    player.executeScript(player.activeScript, true, true);
    return true;
}
