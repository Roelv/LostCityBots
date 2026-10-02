import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { parentPort } from 'worker_threads';
import { toBase37, fromBase37 } from '#/util/JString.js';
import { getZipFileHeaders, unzipFile } from './ReadZip.js';
const dir = dirname(fileURLToPath(import.meta.url));

const path = join(dir, '../botnames.txt');
if (existsSync(path) && parentPort) {
    const data = readFileSync(path, 'utf8');
    parentPort.postMessage(fetchUsernames(data));
} else {
    let pathZip = join(dir, '../botnames.zip');
    if (!existsSync(pathZip)) {
        pathZip = join(dir, '../botnames_sample.zip');
    }
    unzipRandom(pathZip)
        .then(data => {
            if (parentPort)
                parentPort.postMessage(fetchUsernames(data));
        })
        .catch(err => console.error(err));
}

function fetchUsernames(data: string): string[] {
    const botNames: string[] = [];
    const lines = data.split(/\r?\n/);
    for (const username of lines) {
        if (username !== '') {
            botNames.push(fromBase37(toBase37(username)));
        }
    }
    return botNames;
}

async function unzipRandom(path: string): Promise<string> {
    const content = readFileSync(path);
    const responseBuffer: ArrayBuffer = new Uint8Array(content).buffer;
    try {
        const zipFileHeaders = getZipFileHeaders(responseBuffer);
        const i = Math.floor(Math.random() * zipFileHeaders.length);
        const selectedFileHeader = zipFileHeaders[i];
        if (selectedFileHeader) {
            const fileData = await unzipFile(responseBuffer, selectedFileHeader);
            const textDecoder = new TextDecoder('utf-8');
            return textDecoder.decode(fileData);
        }
    } catch (err) {
        console.error(err);
    }
    return '';
}
