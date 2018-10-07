import { MatrixClient } from "matrix-bot-sdk";
import TrelloToken from "./db/models/TrelloToken";
import { OAuthHandler } from "./web/OAuth";
import { LogService } from "matrix-js-snippets";
import { Trello } from "./trello/Trello";
import { Webserver } from "./web/Webserver";
import TrelloWebhook from "./db/models/TrelloWebhook";
import BoardRooms from "./db/models/BoardRooms";
import striptags = require("striptags");

export class CommandProcessor {
    constructor(private client: MatrixClient) {
    }

    public tryCommand(roomId: string, event: any): Promise<any> {
        const message = event['content']['body'];
        if (!message || !message.startsWith("!trello")) return;

        let command = "help";
        const args = message.substring("!trello".length).trim().split(" ");
        if (args.length > 0) {
            command = args[0];
            args.splice(0, 1);
        }

        try {
            if (command === "login") {
                return this.doLoginCommand(roomId, event);
            } else if (command === "logout") {
                return this.doLogoutCommand(roomId, event);
            } else if (command === "watch") {
                if (!args[0]) {
                    return this.sendHtmlMessage(roomId, "Please specify a board URL. Eg: <code>!trello watch https://trello.com/b/abc123/your-board</code>");
                }
                return this.doWatchBoardCommand(roomId, event, args[0]);
            } else if (command === "unwatch") {
                if (!args[0]) {
                    return this.sendHtmlMessage(roomId, "Please specify a board URL. Eg: <code>!trello watch https://trello.com/b/abc123/your-board</code>");
                }
                return this.doUnwatchBoardCommand(roomId, event, args[0]);
            } else {
                const htmlMessage = "<p>Trello bot help:<br /><pre><code>" +
                    `!trello login                - Generates a link for you to click and authorize the bot\n` +
                    `!trello logout               - Invalidates and deletes all previously authorized tokens\n` +
                    `!trello watch &lt;board url&gt;    - Watches the given board in this room\n` +
                    `!trello unwatch &lt;board url&gt;  - Unwatches the given board in this room\n` +
                    "!trello help                 - This menu\n" +
                    "</code></pre></p>" +
                    "<p>For help or more information, visit <a href='https://matrix.to/#/#help:t2bot.io'>#help:t2bot.io</a></p>";
                return this.sendHtmlMessage(roomId, htmlMessage);
            }
        } catch (err) {
            LogService.error("CommandProcessor", err);
            return this.sendHtmlMessage(roomId, "There was an error processing your command");
        }
    }

    private sendHtmlMessage(roomId: string, message: string): Promise<any> {
        return Promise.resolve(this.client.sendMessage(roomId, {
            msgtype: "m.notice",
            body: striptags(message),
            format: "org.matrix.custom.html",
            formatted_body: message,
        }));
    }

    private async doLoginCommand(roomId: string, event: any): Promise<any> {
        const members = await this.client.getJoinedRoomMembers(roomId);
        if (members.length !== 2) {
            return this.sendHtmlMessage(roomId, "This room is not a private chat and therefor cannot be used to log in.");
        }

        const url = await OAuthHandler.getAuthUrl(async (username: string, token: string, tokenSecret: string) => {
            await TrelloToken.create({userId: event['sender'], token: token, tokenSecret: tokenSecret});
            await this.sendHtmlMessage(roomId, "Thanks " + username + "! You've authorized me to use your account.");
        });

        const message = 'Please click here to authorize me to use your account: <a href="' + url + '">' + url + '</a>';
        return this.sendHtmlMessage(roomId, message);
    }

    private async doLogoutCommand(roomId: string, event: any): Promise<any> {
        const tokens = await TrelloToken.findAll({where: {userId: event.sender}});

        for (const token of tokens) {
            await Trello.deleteToken(token).catch(e => {
                LogService.error("CommandProcessor", "Error deleting tokens for " + event.sender);
                LogService.error("CommandProcessor", e)
            });

            await token.destroy().catch(e => {
                LogService.error("CommandProcessor", "Error deleting token from database for " + event.sender);
                LogService.error("CommandProcessor", e)
            });
        }

        const message = 'Your have been logged out.';
        return this.sendHtmlMessage(roomId, message);
    }

    private async doWatchBoardCommand(roomId: string, event: any, boardUrl: string): Promise<any> {
        const token = await TrelloToken.findOne({where: {userId: event['sender']}});
        if (!token) {
            return this.sendHtmlMessage(roomId, "You must authorize me to use your account before you can run this command.");
        }

        const boards = await Trello.getBoards(token);
        const board = boards.find(b => boardUrl.startsWith(b.shortUrl));
        if (!board) {
            return this.sendHtmlMessage(roomId, "Board not found. Please verify the URL and try again.");
        }

        try {
            const webhook = await Trello.newWebhook(token, board.id, Webserver.getWebhookUrl(), "Matrix Trello Bot");
            await TrelloWebhook.create({boardId: board.id, webhookId: webhook.id});
        } catch (err) {
            if (err !== "A webhook with that callback, model, and token already exists") throw err;
        }

        await BoardRooms.create({boardId: board.id, roomId: roomId});
        return this.sendHtmlMessage(roomId, "This room will be notified when activity on the board happens.");
    }

    private async doUnwatchBoardCommand(roomId: string, event: any, boardUrl: string): Promise<any> {
        const token = await TrelloToken.findOne({where: {userId: event['sender']}});
        if (!token) {
            return this.sendHtmlMessage(roomId, "You must authorize me to use your account before you can run this command.");
        }

        const boards = await Trello.getBoards(token);
        const board = boards.find(b => boardUrl.startsWith(b.shortUrl));
        if (!board) {
            return this.sendHtmlMessage(roomId, "Board not found. Please verify the URL and try again.");
        }

        const webhooks = await TrelloWebhook.findAll({where: {boardId: board.id}});
        for (const webhook of webhooks) {
            await Trello.deleteWebhook(token, webhook.webhookId);
            await webhook.destroy();
        }

        const mappings = await BoardRooms.findAll({where: {roomId: roomId, boardId: board.id}});
        for (const mapping of mappings) {
            await mapping.destroy();
        }

        return this.sendHtmlMessage(roomId, "That board will no longer notify this room of any activity.");
    }
}