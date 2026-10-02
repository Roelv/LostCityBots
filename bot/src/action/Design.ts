import Player from '#/engine/entity/Player.js';
import { IdkSaveDesignHandler } from '../handler/IdkSaveDesignHandler.js';
import { IfButtonHandler } from '../handler/IfButtonHandler.js';
import { random } from '../Utility.js';

export function design(player: Player): boolean {
    const gender = Math.round(Math.random());
    const idkit: number[] = [];
    const color: number[] = [];

    if (gender === 0) {
        idkit.push(random(0, 8));
        idkit.push(random(10, 17));
        idkit.push(random(18, 25));
        idkit.push(random(26, 31));
        idkit.push(random(33, 34));
        idkit.push(random(36, 40));
        idkit.push(random(42, 43));
    } else {
        idkit.push(random(45, 54));
        idkit.push(-1);
        idkit.push(random(56, 60));
        idkit.push(random(61, 65));
        idkit.push(random(67, 68));
        idkit.push(random(70, 77));
        idkit.push(random(79, 80));
    }

    color.push(random(0, 11));
    color.push(random(0, 15));
    color.push(random(0, 15));
    color.push(random(0, 5));
    color.push(random(0, 7));

    IdkSaveDesignHandler(player, gender, idkit, color);
    return IfButtonHandler(player, 3651); // Accept button
}
