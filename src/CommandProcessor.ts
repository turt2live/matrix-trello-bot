import { MatrixClient, RichReply } from "matrix-bot-sdk";
import TrelloToken from "./db/models/TrelloToken";
import { OAuthHandler } from "./web/OAuth";
import { LogService } from "matrix-js-snippets";
import { Trello } from "./trello/Trello";
import { Webserver } from "./web/Webserver";
import TrelloWebhook from "./db/models/TrelloWebhook";
import BoardRooms from "./db/models/BoardRooms";
import { DefaultsManager } from "./DefaultsManager";
import striptags = require("striptags");

export class CommandProcessor {
    constructor(private client: MatrixClient, private defaultsManager: DefaultsManager) {
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
                    return this.sendHtmlReply(roomId, event, "Please specify a board URL. Eg: <code>!trello watch https://trello.com/b/abc123/your-board</code>");
                }
                return this.doWatchBoardCommand(roomId, event, args[0]);
            } else if (command === "unwatch") {
                if (!args[0]) {
                    return this.sendHtmlReply(roomId, event, "Please specify a board URL. Eg: <code>!trello watch https://trello.com/b/abc123/your-board</code>");
                }
                return this.doUnwatchBoardCommand(roomId, event, args[0]);
            } else if (command === "boards") {
                let inRoom = roomId;
                if (args[0]) {
                    inRoom = args[0];
                }
                return this.doListBoardsCommand(roomId, inRoom, event);
            } else if (command === "default") {
                if (args[0] !== "board") {
                    return this.sendHtmlReply(roomId, event, "Unrecognized command. Try <code>!trello help</code>");
                }
                if (!args[1]) {
                    return this.sendHtmlReply(roomId, event, "Please specify a board URL. Eg: <code>!trello default " + args[0] + " https://trello.com/b/abc123/your-board</code>")
                }
                if (args[0] === "board") {
                    return this.doSetDefaultBoardCommand(roomId, event, args[1]);
                }
            } else {
                const htmlMessage = "<p>Trello bot help:<br /><pre><code>" +
                    `!trello login                      - Generates a link for you to click and authorize the bot\n` +
                    `!trello logout                     - Invalidates and deletes all previously authorized tokens\n` +
                    `!trello watch &lt;board url&gt;          - Watches the given board in this room\n` +
                    `!trello unwatch &lt;board url&gt;        - Unwatches the given board in this room\n` +
                    `!trello boards [room]              - Lists the boards being watched in the room\n` +
                    `!trello default board &lt;board url&gt;  - Sets the default board for the room\n` +
                    "!trello help                       - This menu\n" +
                    "</code></pre></p>" +
                    "<p>For help or more information, visit <a href='https://matrix.to/#/#help:t2bot.io'>#help:t2bot.io</a></p>";
                return this.sendHtmlReply(roomId, event, htmlMessage);
            }
        } catch (err) {
            LogService.error("CommandProcessor", err);
            return this.sendHtmlReply(roomId, event, "There was an error processing your command");
        }
    }

    private sendHtmlReply(roomId: string, event: any, message: string): Promise<any> {
        const reply = RichReply.createFor(event, striptags(message), message);
        reply["msgtype"] = "m.notice";
        return this.client.sendMessage(roomId, reply);
    }

    private async doLoginCommand(roomId: string, event: any): Promise<any> {
        const members = await this.client.getJoinedRoomMembers(roomId);
        if (members.length !== 2) {
            return this.sendHtmlReply(roomId, event, "This room is not a private chat and therefor cannot be used to log in.");
        }

        const url = await OAuthHandler.getAuthUrl(async (username: string, token: string, tokenSecret: string) => {
            await TrelloToken.create({userId: event['sender'], token: token, tokenSecret: tokenSecret});
            await this.sendHtmlReply(roomId, event, "Thanks " + username + "! You've authorized me to use your account.");
        });

        const message = 'Please click here to authorize me to use your account: <a href="' + url + '">' + url + '</a>';
        return this.sendHtmlReply(roomId, event, message);
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
        return this.sendHtmlReply(roomId, event, message);
    }

    private async doWatchBoardCommand(roomId: string, event: any, boardUrl: string): Promise<any> {
        const token = await TrelloToken.findOne({where: {userId: event['sender']}});
        if (!token) {
            return this.sendHtmlReply(roomId, event, "You must authorize me to use your account before you can run this command.");
        }

        const board = await Trello.idOrUrlToBoard(token, boardUrl);
        if (!board) {
            return this.sendHtmlReply(roomId, event, "Board not found. Please verify the URL and try again.");
        }

        const existingBoards = await BoardRooms.findAll({where: {boardId: board.id, roomId: roomId}});
        if (existingBoards && existingBoards.length > 0) {
            return this.sendHtmlReply(roomId, event, "That board is already being watched in this room");
        }

        try {
            const webhook = await Trello.newWebhook(token, board.id, Webserver.getWebhookUrl(), "Matrix Trello Bot");
            await TrelloWebhook.create({boardId: board.id, webhookId: webhook.id});
        } catch (err) {
            if (err !== "A webhook with that callback, model, and token already exists") throw err;
        }

        await BoardRooms.create({boardId: board.id, roomId: roomId, boardUrl: board.shortUrl, boardName: board.name});
        return this.sendHtmlReply(roomId, event, "This room will be notified when activity on the board happens.");
    }

    private async doUnwatchBoardCommand(roomId: string, event: any, boardUrl: string): Promise<any> {
        const token = await TrelloToken.findOne({where: {userId: event['sender']}});
        if (!token) {
            return this.sendHtmlReply(roomId, event, "You must authorize me to use your account before you can run this command.");
        }

        const boards = await Trello.getBoards(token);
        const board = boards.find(b => boardUrl.startsWith(b.shortUrl));
        if (!board) {
            return this.sendHtmlReply(roomId, event, "Board not found. Please verify the URL and try again.");
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

        return this.sendHtmlReply(roomId, event, "That board will no longer notify this room of any activity.");
    }

    private async doListBoardsCommand(roomId: string, inRoom: string, event: any): Promise<any> {
        const inRoomId = await this.client.resolveRoom(inRoom);

        // Make sure the user is a member of the room
        try {
            const members = await this.client.getJoinedRoomMembers(inRoomId);
            if (members.indexOf(event["sender"]) === -1) {
                return this.sendHtmlReply(roomId, event, "You are not in that room.");
            }
        } catch (e) {
            if (e["body"] && typeof(e["body"]) === "string") {
                e["body"] = JSON.parse(e["body"]);
            }
            if (e["body"] && e["body"]["errcode"]) {
                return this.sendHtmlReply(roomId, event, "Error retrieving room members - am I in the room?");
            }
            throw e;
        }

        // Get board information
        let boards = await BoardRooms.findAll({where: {roomId: inRoomId}});
        if (!boards) boards = [];

        let message = "The watched boards are:<br /><ul>" +
            "<li>" + boards.map(b => `${b.boardId.substring(0, 6)} ${b.boardUrl ? `<a href="${b.boardUrl}">` : ""}${b.boardName ? b.boardName : "&lt;No Name&gt;"}${b.boardUrl ? "</a>" : ""}`).join("</li><li>") + "</li>" +
            "</ul>";
        if (boards.length === 0) message = "There are no watched boards.";

        return this.sendHtmlReply(roomId, event, message);
    }

    private async doSetDefaultBoardCommand(roomId: string, event: any, boardUrlOrId: string): Promise<any> {
        if (!(await this.client.userHasPowerLevelFor(event["sender"], roomId, "io.t2l.bots.trello.defaults", true))) {
            return this.sendHtmlReply(roomId, event, "You do not have permission to run this command");
        }

        let watchedBoards = await BoardRooms.findAll({where: {roomId: roomId}});
        if (!watchedBoards) watchedBoards = [];

        for (const watchedBoard of watchedBoards) {
            if (watchedBoard.boardId.startsWith(boardUrlOrId)) {
                try {
                    await this.defaultsManager.setDefaultBoardId(roomId, watchedBoard.boardId);
                } catch (e) {
                    LogService.error("CommandProcessor", e);
                    return this.sendHtmlReply(roomId, event, "Failed to set default board - am I a moderator in the room?");
                }
                return this.sendHtmlReply(roomId, event, "Default board set");
            }
        }

        const token = await TrelloToken.findOne({where: {userId: event['sender']}});
        if (!token) {
            return this.sendHtmlReply(roomId, event, "You must authorize me to use your account before you can run this command.");
        }

        const board = await Trello.idOrUrlToBoard(token, boardUrlOrId);
        if (!board) {
            return this.sendHtmlReply(roomId, event, "Board not found");
        }

        try {
            await this.defaultsManager.setDefaultBoardId(roomId, board.id);
        } catch (e) {
            LogService.error("CommandProcessor", e);
            return this.sendHtmlReply(roomId, event, "Failed to set default board - am I a moderator in the room?");
        }
        return this.sendHtmlReply(roomId, event, "Default board set");
    }
}