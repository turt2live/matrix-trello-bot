import { MatrixClient, RichReply } from "matrix-bot-sdk";
import TrelloToken from "./db/models/TrelloToken";
import { OAuthHandler } from "./web/OAuth";
import { LogService } from "matrix-js-snippets";
import { Trello } from "./trello/Trello";
import { Webserver } from "./web/Webserver";
import TrelloWebhook from "./db/models/TrelloWebhook";
import BoardRooms from "./db/models/BoardRooms";
import { BotOptionsManager } from "./BotOptionsManager";
import { TrelloBoard } from "./trello/models/board";
import { TrelloList } from "./trello/models/list";
import striptags = require("striptags");

export class CommandProcessor {
    constructor(private client: MatrixClient, private optionsManager: BotOptionsManager) {
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
                if (args[0] === "board") {
                    if (!args[1]) {
                        return this.sendHtmlReply(roomId, event, "Please specify a board URL. Eg: <code>!trello default board https://trello.com/b/abc123/your-board</code>")
                    }
                    return this.doSetDefaultBoardCommand(roomId, event, args[1]);
                }

                if (args[0] === "list") {
                    if (!args[1]) {
                        return this.sendHtmlReply(roomId, event, "Please specify a list name. Eg: <code>!trello default list My List</code>");
                    }
                    return this.doSetDefaultListCommand(roomId, event, args.splice(1).join(" "));
                }

                return this.sendHtmlReply(roomId, event, "Unrecognized command. Try <code>!trello help</code>");
            } else if (command === "board") {
                if (args[0] === "lists") return this.doListListsCommand(roomId, event, null);

                if (args.length < 2) {
                    return this.sendHtmlReply(roomId, event, "Too few arguments. Try <code>!trello help</code>");
                }

                if (args[1] === "lists") return this.doListListsCommand(roomId, event, args[0]);

                if (args[0] === "create") {
                    return this.doCreateBoardCommand(roomId, event, args.splice(1).join(" "));
                }

                const handleInvite = (board, username) => {
                    if (!username) {
                        return this.sendHtmlReply(roomId, event, "Please specify a username. Eg: <code>!trello board https://trello.com/b/abc123/your-board invite yourfriend</code>");
                    }
                    return this.doInviteToBoardCommand(roomId, event, board, username);
                };
                if (args[0] === "invite") return handleInvite(null, args[1]);
                if (args[1] === "invite") return handleInvite(args[0], args[2]);

                const handleRemove = (board, username) => {
                    if (!username) {
                        return this.sendHtmlReply(roomId, event, "Please specify a username. Eg: <code>!trello board https://trello.com/b/abc123/your-board remove yourfriend</code>");
                    }
                    return this.doRemoveFromBoardCommand(roomId, event, board, username);
                };
                if (args[0] === "remove") return handleRemove(null, args[1]);
                if (args[1] === "remove") return handleRemove(args[0], args[2]);

                if (args[1] === "alias") {
                    if (!args[2]) {
                        return this.sendHtmlReply(roomId, event, "Please specify an alternative name for the board. Eg: <code>!trello board https://trello.com/b/abc123/your-board alias MyBoardName</code>");
                    }
                    return this.doAliasBoardCommand(roomId, event, args[0], args[2]);
                }

                if (args[1] === "delete") {
                    return this.doDeleteBoardCommand(roomId, event, args[0]);
                }

                return this.sendHtmlReply(roomId, event, "Unrecognized command. Try <code>!trello help</code>");
            } else if (command === "list") {
                if (args[0] === "cards") return this.doListCardsCommand(roomId, event, null, args.splice(1).join(" "));

                if (args.length < 2) {
                    return this.sendHtmlReply(roomId, event, "Too few arguments. Try <code>!trello help</code>");
                }

                if (args[1] === "cards") return this.doListCardsCommand(roomId, event, args[0], args.splice(2).join(" "));

                if (args[0] === "alias") return this.doAliasListCommand(roomId, event, null, args.splice(1, args.length - 2).join(" "), args[args.length - 1]);
                if (args[1] === "alias") return this.doAliasListCommand(roomId, event, args[0], args.splice(2, args.length - 2).join(" "), args[args.length - 1]);

                if (args[0] === "create") return this.doListCreateCommand(roomId, event, null, args.splice(1).join(" "));
                if (args[1] === "create") return this.doListCreateCommand(roomId, event, args[0], args.splice(2).join(" "));

                if (args[0] === "delete") return this.doListDeleteCommand(roomId, event, null, args.splice(1).join(" "));
                if (args[1] === "delete") return this.doListDeleteCommand(roomId, event, args[0], args.splice(2).join(" "));

                return this.sendHtmlReply(roomId, event, "Unrecognized command. Try <code>!trello help</code>");
            } else {
                const htmlMessage = "" +
                    "<h4>Authorization</h4>" +
                    "<pre><code>" +
                    `!trello login      - Generates a link for you to click and authorize the bot\n` +
                    `!trello logout     - Invalidates and deletes all previously authorized tokens\n` +
                    "</code></pre>" +
                    "<h4>Board management</h4>" +
                    "<pre><code>" +
                    `!trello watch &lt;board url&gt;                         - Watches the given board in this room\n` +
                    `!trello unwatch &lt;board url&gt;                       - Unwatches the given board in this room\n` +
                    `!trello default board &lt;board url&gt;                 - Sets the default board for the room\n` +
                    `!trello boards [room id/alias]                    - Lists the boards being watched in the room\n` +
                    `!trello board &lt;board url&gt; alias &lt;new name&gt;        - Sets an alias for the given board\n` +
                    `!trello board create &lt;name&gt;                       - Creates a new board\n` +
                    `!trello board &lt;board url/alias&gt; delete            - Deletes a board\n` +
                    `!trello board [board url/alias] invite &lt;username&gt; - Invite a user to the board\n` +
                    `!trello board [board url/alias] remove &lt;username&gt; - Remove a user from the board\n` +
                    "</code></pre>" +
                    "<h4>List management</h4>" +
                    "<pre><code>" +
                    `!trello board [board url/alias] lists                        - Lists the lists on a given board\n` +
                    `!trello default list &lt;list name/alias&gt;                       - Sets the default list for this room\n` +
                    `!trello list [board url/alias] alias &lt;list name&gt; &lt;new name&gt;  - Sets an alias for the given list on a board\n` +
                    `!trello list [board url/alias] create &lt;name&gt;                 - Creates a new list on a board\n` +
                    `!trello list [board url/alias] delete &lt;list name/alias&gt;      - Deletes a list from a board\n` +
                    `!trello list [board url/alias] cards [list name/alias]       - Lists the active cards in a list on a board\n` +
                    "</code></pre>" +
                    "<br/><p>For help or more information, visit <a href='https://matrix.to/#/#help:t2bot.io'>#help:t2bot.io</a></p>";
                return this.sendHtmlReply(roomId, event, htmlMessage);
            }
        } catch (err) {
            LogService.error("CommandProcessor", err);
            return this.sendHtmlReply(roomId, event, "There was an error processing your command");
        }
    }

    private async findBoardByReference(roomId: string, token: TrelloToken, reference: string): Promise<TrelloBoard> {
        const roomOptions = await this.optionsManager.getRoomOptions(roomId);
        for (const boardId in roomOptions.boardAliases) {
            const alias = roomOptions.boardAliases[boardId];
            if (alias === reference) {
                return Trello.getBoard(token, boardId).catch(e => {
                    LogService.error("CommandProcessor#findBoardByReference", e);
                    return null;
                });
            }
        }

        return Trello.idOrUrlToBoard(token, reference).catch(e => {
            LogService.error("CommandProcessor#findBoardByReference", e);
            return null;
        });
    }

    private async findOrUseDefaultBoard(roomId: string, token: TrelloToken, reference: string): Promise<TrelloBoard> {
        if (!reference) {
            const roomOptions = await this.optionsManager.getRoomOptions(roomId);
            if (roomOptions.boardId) {
                return Trello.getBoard(token, roomOptions.boardId).catch(e => {
                    LogService.error("CommandProcessor#findOrUseDefaultBoard", e);
                    return null;
                });
            }
        }

        return this.findBoardByReference(roomId, token, reference).catch(e => {
            LogService.error("CommandProcessor#findOrUseDefaultBoard", e);
            return null;
        });
    }

    private async findListByReference(roomId: string, token: TrelloToken, board: TrelloBoard, reference: string): Promise<TrelloList> {
        const roomOptions = await this.optionsManager.getRoomOptions(roomId);
        for (const listId in roomOptions.listAliases) {
            const alias = roomOptions.listAliases[listId];
            if (alias === reference) {
                return Trello.getList(token, board.id, listId);
            }
        }

        const lists = await Trello.getLists(token, board.id);
        for (const list of lists) {
            if (list.name.toLowerCase() === reference.toLowerCase()) {
                return list;
            }
        }

        return Trello.getList(token, board.id, reference); // last ditch attempt
    }

    private async findOrUseDefaultList(roomId: string, token: TrelloToken, board: TrelloBoard, reference: string): Promise<TrelloList> {
        if (!reference) {
            const roomOptions = await this.optionsManager.getRoomOptions(roomId);
            if (roomOptions.listId) {
                if (board.id !== roomOptions.boardId) {
                    throw new Error("Board references do not match");
                }
                return Trello.getList(token, roomOptions.boardId, roomOptions.listId);
            }
        }

        return this.findListByReference(roomId, token, board, reference);
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

        const roomOptions = await this.optionsManager.getRoomOptions(roomId);

        let message = "The watched boards are:<br /><ul>" +
            "<li>" + boards.map(b => {
                const name = b.boardName ? b.boardName : "&lt;No Name&gt;";
                const url = b.boardUrl ? `<a href="${b.boardUrl}">${name}</a>` : name;
                const alias = roomOptions.boardAliases[b.boardId] ? `(Alias: ${roomOptions.boardAliases[b.boardId]})` : "";
                return `${url} ${alias}`;
            }).join("</li><li>") + "</li>" +
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
                    await this.optionsManager.setDefaultBoardId(roomId, watchedBoard.boardId);
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
            await this.optionsManager.setDefaultBoardId(roomId, board.id);
        } catch (e) {
            LogService.error("CommandProcessor", e);
            return this.sendHtmlReply(roomId, event, "Failed to set default board - am I a moderator in the room?");
        }
        return this.sendHtmlReply(roomId, event, "Default board set");
    }

    private async doSetDefaultListCommand(roomId: string, event: any, listName: string): Promise<any> {
        if (!(await this.client.userHasPowerLevelFor(event["sender"], roomId, "io.t2l.bots.trello.defaults", true))) {
            return this.sendHtmlReply(roomId, event, "You do not have permission to run this command");
        }

        const roomOptions = await this.optionsManager.getRoomOptions(roomId);
        if (!roomOptions.boardId) {
            return this.sendHtmlReply(roomId, event, "No default board is set for this room.");
        }

        const token = await TrelloToken.findOne({where: {userId: event['sender']}});
        if (!token) {
            return this.sendHtmlReply(roomId, event, "You must authorize me to use your account before you can run this command.");
        }

        const lists = await Trello.getLists(token, roomOptions.boardId);
        const list = lists.find(s => s.name.toLowerCase() === listName.toLowerCase());
        if (!list) {
            return this.sendHtmlReply(roomId, event, "List not found");
        }

        try {
            await this.optionsManager.setDefaultBoardId(roomId, roomOptions.boardId);
            await this.optionsManager.setDefaultListId(roomId, list.id);
        } catch (e) {
            LogService.error("CommandProcessor", e);
            return this.sendHtmlReply(roomId, event, "Failed to set default list - am I a moderator in the room?");
        }
        return this.sendHtmlReply(roomId, event, "Default list set");
    }

    private async doAliasBoardCommand(roomId: string, event: any, boardUrl: string, alias: string): Promise<any> {
        if (!(await this.client.userHasPowerLevelFor(event["sender"], roomId, "io.t2l.bots.trello.aliases", true))) {
            return this.sendHtmlReply(roomId, event, "You do not have permission to run this command");
        }

        let watchedBoards = await BoardRooms.findAll({where: {roomId: roomId}});
        if (!watchedBoards) watchedBoards = [];

        for (const watchedBoard of watchedBoards) {
            if (watchedBoard.boardId.startsWith(boardUrl) || (watchedBoard.boardUrl && boardUrl.startsWith(watchedBoard.boardUrl))) {
                try {
                    await this.optionsManager.setBoardAlias(roomId, watchedBoard.boardId, alias);
                } catch (e) {
                    LogService.error("CommandProcessor", e);
                    return this.sendHtmlReply(roomId, event, "Failed to set board alias - am I a moderator in the room?");
                }
                return this.sendHtmlReply(roomId, event, `The board can now be referenced as '${alias}' when managing cards`);
            }
        }

        const token = await TrelloToken.findOne({where: {userId: event['sender']}});
        if (!token) {
            return this.sendHtmlReply(roomId, event, "You must authorize me to use your account before you can run this command.");
        }

        const board = await Trello.idOrUrlToBoard(token, boardUrl);
        if (!board) {
            return this.sendHtmlReply(roomId, event, "Board not found");
        }

        try {
            await this.optionsManager.setBoardAlias(roomId, board.id, alias);
        } catch (e) {
            LogService.error("CommandProcessor", e);
            return this.sendHtmlReply(roomId, event, "Failed to set board alias - am I a moderator in the room?");
        }
        return this.sendHtmlReply(roomId, event, `The board can now be referenced as '${alias}' when managing cards`);
    }

    private async doAliasListCommand(roomId: string, event: any, boardRef: string, listName: string, alias: string): Promise<any> {
        if (!(await this.client.userHasPowerLevelFor(event["sender"], roomId, "io.t2l.bots.trello.aliases", true))) {
            return this.sendHtmlReply(roomId, event, "You do not have permission to run this command");
        }

        const token = await TrelloToken.findOne({where: {userId: event['sender']}});
        if (!token) {
            return this.sendHtmlReply(roomId, event, "You must authorize me to use your account before you can run this command.");
        }

        const board = await this.findOrUseDefaultBoard(roomId, token, boardRef);
        if (!board) {
            return this.sendHtmlReply(roomId, event, "Board not found");
        }

        const lists = await Trello.getLists(token, board.id);
        const list = lists.find(s => s.name.toLowerCase() === listName.toLowerCase());
        if (!list) {
            return this.sendHtmlReply(roomId, event, "List not found");
        }

        try {
            await this.optionsManager.setListAlias(roomId, list.id, alias);
        } catch (e) {
            LogService.error("CommandProcessor", e);
            return this.sendHtmlReply(roomId, event, "Failed to set list alias - am I a moderator in the room?");
        }
        return this.sendHtmlReply(roomId, event, `The list can now be referenced as '${alias}' when managing cards`);
    }

    private async doCreateBoardCommand(roomId: string, event: any, boardName: string): Promise<any> {
        const token = await TrelloToken.findOne({where: {userId: event['sender']}});
        if (!token) {
            return this.sendHtmlReply(roomId, event, "You must authorize me to use your account before you can run this command.");
        }

        const board = await Trello.createBoard(token, boardName);
        return this.sendHtmlReply(roomId, event, "Board created: " + board.shortUrl);
    }

    private async doDeleteBoardCommand(roomId: string, event: any, boardRef: string): Promise<any> {
        const token = await TrelloToken.findOne({where: {userId: event['sender']}});
        if (!token) {
            return this.sendHtmlReply(roomId, event, "You must authorize me to use your account before you can run this command.");
        }

        const board = await this.findBoardByReference(roomId, token, boardRef);
        if (!board) {
            return this.sendHtmlReply(roomId, event, "Board not found");
        }

        await Trello.deleteBoard(token, board.id);
        return this.sendHtmlReply(roomId, event, "Board deleted");
    }

    private async doInviteToBoardCommand(roomId: string, event: any, boardRef: string, username: string): Promise<any> {
        const token = await TrelloToken.findOne({where: {userId: event['sender']}});
        if (!token) {
            return this.sendHtmlReply(roomId, event, "You must authorize me to use your account before you can run this command.");
        }

        const board = await this.findOrUseDefaultBoard(roomId, token, boardRef);
        if (!board) {
            return this.sendHtmlReply(roomId, event, "Board not found");
        }

        let memberId = null;
        try {
            const objectInfo = await Trello.getType(token, username);
            if (objectInfo.type !== "member") {
                return this.sendHtmlReply(roomId, event, `'${username}' is not a user`);
            }
            memberId = objectInfo.id;
        } catch (e) {
            LogService.error("CommandProcessor", e);
            return this.sendHtmlReply(roomId, event, "User not found or another error has occurred");
        }

        await Trello.inviteMemberToBoard(token, board.id, memberId, "normal");
        return this.sendHtmlReply(roomId, event, `${username} has been invited to ${board.name}`);
    }

    private async doRemoveFromBoardCommand(roomId: string, event: any, boardRef: string, username: string): Promise<any> {
        const token = await TrelloToken.findOne({where: {userId: event['sender']}});
        if (!token) {
            return this.sendHtmlReply(roomId, event, "You must authorize me to use your account before you can run this command.");
        }

        const board = await this.findOrUseDefaultBoard(roomId, token, boardRef);
        if (!board) {
            return this.sendHtmlReply(roomId, event, "Board not found");
        }

        let memberId = null;
        try {
            const objectInfo = await Trello.getType(token, username);
            if (objectInfo.type !== "member") {
                return this.sendHtmlReply(roomId, event, `'${username}' is not a user`);
            }
            memberId = objectInfo.id;
        } catch (e) {
            LogService.error("CommandProcessor", e);
            return this.sendHtmlReply(roomId, event, "User not found or another error has occurred");
        }

        await Trello.removeMemberFromBoard(token, board.id, memberId);
        return this.sendHtmlReply(roomId, event, `${username} has been removed from ${board.name}`);
    }

    private async doListListsCommand(roomId: string, event: any, boardRef: string): Promise<any> {
        const token = await TrelloToken.findOne({where: {userId: event['sender']}});
        if (!token) {
            return this.sendHtmlReply(roomId, event, "You must authorize me to use your account before you can run this command.");
        }

        const board = await this.findOrUseDefaultBoard(roomId, token, boardRef);
        if (!board) {
            return this.sendHtmlReply(roomId, event, "Board not found");
        }

        const lists = await Trello.getLists(token, board.id);
        if (lists.length === 0) {
            return this.sendHtmlReply(roomId, event, "There are no lists on the board");
        }

        const roomOptions = await this.optionsManager.getRoomOptions(roomId);

        const message = `'${board.name}' has the following lists:<br /><ul>` +
            "<li>" + lists.map(s => {
                const alias = roomOptions.listAliases[s.id] ? `(Alias: ${roomOptions.listAliases[s.id]})` : "";
                return `${s.name} ${alias}`;
            }).join("</li><li>") + "</li>" +
            "</ul>";
        return this.sendHtmlReply(roomId, event, message);
    }

    private async doListCreateCommand(roomId: string, event: any, boardRef: string, name: string): Promise<any> {
        const token = await TrelloToken.findOne({where: {userId: event['sender']}});
        if (!token) {
            return this.sendHtmlReply(roomId, event, "You must authorize me to use your account before you can run this command.");
        }

        const board = await this.findOrUseDefaultBoard(roomId, token, boardRef);
        if (!board) {
            return this.sendHtmlReply(roomId, event, "Board not found");
        }

        await Trello.createList(token, board.id, name);
        return this.sendHtmlReply(roomId, event, "List created on " + board.shortUrl);
    }

    private async doListDeleteCommand(roomId: string, event: any, boardRef: string, listRef: string): Promise<any> {
        const token = await TrelloToken.findOne({where: {userId: event['sender']}});
        if (!token) {
            return this.sendHtmlReply(roomId, event, "You must authorize me to use your account before you can run this command.");
        }

        const board = await this.findOrUseDefaultBoard(roomId, token, boardRef);
        if (!board) {
            return this.sendHtmlReply(roomId, event, "Board not found");
        }

        const list = await this.findListByReference(roomId, token, board, listRef);
        if (!list) {
            return this.sendHtmlReply(roomId, event, "List not found");
        }

        await Trello.deleteList(token, board.id, list.id);
        return this.sendHtmlReply(roomId, event, "List deleted from " + board.shortUrl);
    }

    private async doListCardsCommand(roomId: string, event: any, boardRef: string, listRef: string): Promise<string> {
        const token = await TrelloToken.findOne({where: {userId: event['sender']}});
        if (!token) {
            return this.sendHtmlReply(roomId, event, "You must authorize me to use your account before you can run this command.");
        }

        const board = await this.findOrUseDefaultBoard(roomId, token, boardRef);
        if (!board) {
            return this.sendHtmlReply(roomId, event, "Board not found");
        }

        const list = await this.findOrUseDefaultList(roomId, token, board, listRef);
        if (!list) {
            return this.sendHtmlReply(roomId, event, "List not found");
        }

        const cards = await Trello.getCards(token, board.id, list.id);
        const message = `<p>Open cards on ${list.name} on <a href="${board.shortUrl}">${board.name}</a>:</p><ul><li>` +
            cards.map(c => `<a href="${c.shortUrl}">${c.name}</a>`).join("</li><li>") +
            `</li></ul>`;
        return this.sendHtmlReply(roomId, event, message);
    }
}