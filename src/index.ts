import { AutojoinRoomsMixin, MatrixClient, SimpleRetryJoinStrategy } from "matrix-bot-sdk";
import config from "./config";
import { LogService } from "matrix-js-snippets";
import { LocalstorageStorageProvider } from "./LocalstorageStorageProvider";
import { TrelloStore } from "./db/TrelloStore";
import { CommandProcessor } from "./CommandProcessor";
import { WebhookProcessor } from "./notifications/WebhookProcessor";
import { BotOptionsManager } from "./BotOptionsManager";

LogService.configure(config.logging);
const storageProvider = new LocalstorageStorageProvider(config.dataPath);
const client = new MatrixClient(config.homeserverUrl, config.accessToken, storageProvider);
const optionsManager = new BotOptionsManager(client);
const commands = new CommandProcessor(client, optionsManager);
const processor = new WebhookProcessor(client, optionsManager);

AutojoinRoomsMixin.setupOnClient(client);
client.setJoinStrategy(new SimpleRetryJoinStrategy());

async function finishInit() {
    const userId = await client.getUserId();
    LogService.info("index", "Trello bot logged in as " + userId);

    await TrelloStore.updateSchema();

    client.on("room.message", (roomId, event) => {
        if (event['sender'] === userId) return;
        if (event['type'] !== "m.room.message") return;
        if (!event['content']) return;
        if (event['content']['msgtype'] !== "m.text") return;

        return Promise.resolve(commands.tryCommand(roomId, event)).catch(err => {
            LogService.error("index", err);
            return client.sendNotice(roomId, "There was an error processing your command");
        });
    });

    client.on("room.event", (roomId, event) => {
        if (event['type'] !== "m.room.bot.options") return;
        if (event['state_key'] !== "_" + userId) return;

        optionsManager.calculateNewRoomOptions(roomId);
    });

    return client.start();
}

finishInit().then(() => LogService.info("index", "Trello bot started!"));
