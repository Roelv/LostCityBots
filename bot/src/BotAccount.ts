import { existsSync, readdirSync, renameSync } from 'fs';
import { parentPort } from 'worker_threads';
import { db } from '#/db/query.js';
import { BotConfig } from './BotConfig.js';

if (parentPort) {
    parentPort.on('message', ({ botNames, numBots, renameBots }) =>
        loadAccounts(botNames, numBots, renameBots));
}

async function loadAccounts(botNames: string[], numBots: number, renameBots: boolean): Promise<void> {
    const usernameQueue: string[] = [];
    let accounts;
    while (!accounts || accounts.length === 0) {
        try {
            accounts = await db
                .selectFrom('account')
                .select(['username', 'password'])
                .execute();
            await sleep(1);
        } catch (err) {
            console.error(err);
        }
    }
    const usedNames: string[] = [];
    for (const account of accounts) {
        usedNames.push(account.username);
    }

    let remaining = numBots;
    const path = `data/players/${BotConfig.profile}`;
    let files: string[] = [];
    if (existsSync(path)) {
        files = readdirSync(path);
    }
    for (const file of files) {
        let username = file.slice(0, -4);
        let isPlayer = false;
        for (const account of accounts) {
            if (account.password !== 'bot' && account.username === username) {
                isPlayer = true;
                break;
            }
        }
        if (isPlayer) continue;

        if (renameBots) {
            const newUsername = await findUsername(botNames, usedNames);
            if (newUsername !== '') {
                const oldPath = `${path}/${username}.sav`;
                const newPath = `${path}/${newUsername}.sav`;
                try {
                    renameSync(oldPath, newPath);
                    username = newUsername;
                } catch (err) {
                    console.error(err);
                }
            }
        }

        usedNames.push(username);
        usernameQueue.push(username);
        remaining--;
        if (remaining === 0) break;
    }

    while (remaining > 0) {
        const username = await findUsername(botNames, usedNames);
        if (username === '') break;
        usedNames.push(username);
        usernameQueue.push(username);
        remaining--;
    }
    if (parentPort) parentPort.postMessage(usernameQueue);

    // Bots are ready to login.
    // Database operations are slow and done in the background.

    const freeAccounts: string[] = [];
    for (const account of accounts) {
        if (account.password !== 'bot') continue;
        let exists = false;
        for (const username of usernameQueue) {
            if (account.username === username) {
                exists = true;
                break;
            }
        }
        if (exists) continue;
        freeAccounts.push(account.username);
    }

    for (const username of usernameQueue) {
        let exists = false;
        for (const account of accounts) {
            if (account.username === username) {
                exists = true;
                break;
            }
        }
        if (exists) continue;

        if (freeAccounts.length > 0) {
            try {
                await db
                    .updateTable('account')
                    .set({ username })
                    .where('username', '=', freeAccounts[0])
                    .executeTakeFirst();
                await sleep(1);
            } catch (err) {
                console.error(err);
            }
            freeAccounts.shift();
        } else {
            let success = false;
            while (!success) {
                try {
                    const result = await db
                        .replaceInto('account')
                        .values({ username, password: 'bot', members: 1 })
                        .executeTakeFirst();
                    await sleep(1);
                    if (result.numInsertedOrUpdatedRows && result.numInsertedOrUpdatedRows > 0) {
                        success = true;
                    }
                } catch (err) {
                    console.error(err);
                }
            }
        }
    }

    return;
}

async function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function findUsername(botNames: string[], usedNames?: string[]): Promise<string> {
    for (const _botName of botNames) {
        const i = Math.floor(Math.random() * botNames.length);
        const username = botNames[i];
        if (usedNames) {
            let taken = false;
            for (const usedName of usedNames) {
                if (usedName === username) {
                    taken = true;
                    break;
                }
            }
            if (taken) continue;
        } else {
            const account = await db
                .selectFrom('account')
                .select('username')
                .where('username', '=', username)
                .executeTakeFirst();
            if (account) continue;
        }
        return username;
    }
    return '';
}

export async function changeUsername(oldUsername: string, botNames: string[]): Promise<string> {
    const username = await findUsername(botNames);
    if (username === '') return username;
    await db
        .updateTable('account')
        .set({ username })
        .where('username', '=', oldUsername)
        .executeTakeFirst();
    return username;
}
