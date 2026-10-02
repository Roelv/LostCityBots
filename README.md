# Lost City Quest Bots
A mod that can be added to your local <a href="https://github.com/LostCityRS/Server">Lost City server</a>. The aim is to fill the 2004 RuneScape world with bots that engage in skilling activities and even complete quests.

This is a just personal project that I decided to share so others can also make use of it. It's inspired by other projects like <a href="https://github.com/2004sp/2004sp-progressive">2004SP Progressive</a> and <a href="https://github.com/GregHib/void">Void</a> but the code is newly written with my own approach.

Current content is limited to Tutorial Island.

## Goals
- Bots should follow the same rules as the player where possible (no cheating items, xp or teleports). This increases development time as every step of a quest needs to be carefully configured.
- Optimize to run up to 2000 bots without lag.
- Tasks spread out over many different locations, not just the most optimal ones.
- Easily add more content through JSON files.

## Installation
1.  - Option 1: Install the <a href="https://github.com/LostCityRS/Server">Lost City server</a> (click link). Compatible with all revisions 225-274, saves can be copied from older to newer but not the other way around.
    - Option 2: Install <a href="https://github.com/2004sp/2004sp-progressive">2004SP Progressive</a>. The bots should work alongside the other bots. In the next steps you can rename the bot folder if you also change it in the World import.
2. Configure as production world or full-stack development so accounts are enabled.
3. Download the zip from this page and extract the bot folder to `/engine/src/engine` of your server.
4. Optionally download more bot names from the release page. Place the zip in the bot folder, do NOT extract.
5. For revision 274, replace `/engine/src/engine/World.ts` with the file from this repo. For other revisions, edit it manually as shown below.

    Add at the top:
    ```bash
    import { Bot } from '#/engine/bot/src/Bot.js';
    ```
    Search for:
    ```bash
    this.processPlayers();
    ```
    And add this line after.
    ```bash
    Bot.tick(this);
    ```

Make sure you don't keep backup saves in `/engine/data/players/main` as the bots claim any saves that don't have an account.
Use Ctrl+C to shutdown the server. If you force quit, bots can lose items and possibly get stuck on a quest. For stuck bots you can delete their save file when the server is offline so they create a new one.

## Features
- Persistent saves so bots can also reach high levels eventually.
- Bots can quit the game, their save gets deleted and a new one takes their place to keep low level content active. Each bot quits at a different total level. By default 10% of the bots can max and never quit (can be changed in the config).
- Bots change their name every time the server restarts, unless disabled. The included sample has 55000 names but if you download the full version, it has 55 million names. It doesn't affect memory usage, only disk space. They were real RuneScape usernames, released in the 2014 name clean-up.
- The player can configure their own account to be bot controlled when logged in through the client, useful for testing. This can be an alternative to a botting client but there is currently no way to make choices, the bot acts just like the rest.
- Tasks have slots so bots don't overcrowd areas.
- Bots have login/logout mechanics and spawn at Tutorial Island one at a time. They logout when no tasks are available. As more content gets added, more bots can stay logged in.
- Awareness of nearby bots and players. Bots will try to spread out to reduce resource competition instead of stacking on the same tile.
- An efficient pathfinder. When walking to other areas, bots follow pre-configured paths and can calculate the shortest route through many obstacles like gates, stairs, boats.