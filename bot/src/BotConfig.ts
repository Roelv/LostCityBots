import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import Environment from '#/util/Environment.js';
import { readIniFile } from './ReadIni.js';
const dir = dirname(fileURLToPath(import.meta.url));

export class BotConfig {
    static profile = 'main';
    static maxConnected = 2000;
    static numBots = 1999;
    static renameBots = true;
    static percentMax = 10;
    static botClients = ['bot', 'bot2', 'bot3', 'bot4'];

    static readConfig(): void {
        const path = join(dir, '../config.ini');
        const json = readIniFile(path, ({ key, value }) => {
            if (value === 'true') {
                return true;
            }
            if (value === 'false') {
                return false;
            }
            if (key === 'botClients') {
                if (value.includes(',')) return value.split(',');
                return [value];
            }
            return value;
        });
        Object.assign(this, json);

        let profile;
        if ('NODE_PROFILE' in Environment) {
            profile = Environment.NODE_PROFILE;
        }
        if ('node' in Environment && typeof Environment.node === 'object') {
            if (Environment.node && 'profile' in Environment.node) {
                profile = Environment.node.profile;
            }
        }
        if (typeof profile === 'string') {
            this.profile = profile;
        }

        if ('NODE_MAX_CONNECTED' in Environment) {
            Environment.NODE_MAX_CONNECTED = this.maxConnected;
        }
        if ('node' in Environment && typeof Environment.node === 'object') {
            if (Environment.node && 'maxConnected' in Environment.node) {
                Environment.node.maxConnected = this.maxConnected;
            }
        }
    }
}
