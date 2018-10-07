import { MatrixClient } from "matrix-bot-sdk";
import BoardRooms from "./db/models/BoardRooms";
import { LogService } from "matrix-js-snippets";

export interface RoomOptions {
    boardId: string;
    listId: string;
    boardAliases: { [boardId: string]: string };
    listAliases: { [listId: string]: string };
}

export class BotOptionsManager {

    private cachedOptions: { [roomId: string]: RoomOptions } = {};

    constructor(private client: MatrixClient) {
    }

    public async calculateNewRoomOptions(roomId: string): Promise<RoomOptions> {
        const roomOptions: RoomOptions = {
            boardId: null,
            listId: null,
            boardAliases: {},
            listAliases: {},
        };

        try {
            const state = await this.client.getRoomStateEvents(roomId, "m.room.bot.options", "_" + (await this.client.getUserId()));
            if (typeof(state) !== "object" || !state) {
                throw new Error("Expected exactly one state event for bot options in " + roomId);
            } else {
                if (state["trello"]) {
                    roomOptions.boardId = state["trello"]["defaultBoardId"];
                    roomOptions.listId = state["trello"]["defaultListId"];
                    roomOptions.boardAliases = state["trello"]["boardAliases"];
                    roomOptions.listAliases = state["trello"]["listAliases"];
                }
            }
        } catch (e) {
            if (e["body"] && typeof(e["body"]) === "string") e["body"] = JSON.parse(e["body"]);
            if (e["body"] && e["body"]["errcode"] === "M_NOT_FOUND") {
                LogService.verbose("BotOptionsManager", "Bot options not found in " + roomId);
            } else {
                throw e;
            }
        }

        if (!roomOptions.boardId) {
            const boards = await BoardRooms.findAll({where: {roomId: roomId}});
            if (boards && boards.length === 1) {
                roomOptions.boardId = boards[0].boardId;
            }
        }

        if (!roomOptions.boardAliases) roomOptions.boardAliases = {};
        if (!roomOptions.listAliases) roomOptions.listAliases = {};

        LogService.verbose("BotOptionsManager", "New options for " + roomId + " are: " + JSON.stringify(roomOptions));
        this.cachedOptions[roomId] = roomOptions;
        return roomOptions;
    }

    public async getRoomOptions(roomId: string): Promise<RoomOptions> {
        if (!this.cachedOptions[roomId]) {
            this.cachedOptions[roomId] = await this.calculateNewRoomOptions(roomId);
        }
        return this.cachedOptions[roomId];
    }

    public async setDefaultBoardId(roomId: string, boardId: string): Promise<RoomOptions> {
        const current = await this.getRoomOptions(roomId);
        const newOptions: RoomOptions = JSON.parse(JSON.stringify(current));
        newOptions.boardId = boardId;
        newOptions.listId = null;

        await this.setRoomOptions(roomId, newOptions);
        return this.calculateNewRoomOptions(roomId);
    }

    public async setDefaultListId(roomId: string, listId: string): Promise<RoomOptions> {
        const current = await this.getRoomOptions(roomId);
        const newOptions: RoomOptions = JSON.parse(JSON.stringify(current));
        newOptions.listId = listId;

        await this.setRoomOptions(roomId, newOptions);
        return this.calculateNewRoomOptions(roomId);
    }

    public async setBoardAlias(roomId: string, boardId: string, alias: string): Promise<RoomOptions> {
        const current = await this.getRoomOptions(roomId);
        const newOptions: RoomOptions = JSON.parse(JSON.stringify(current));
        if (!newOptions.boardAliases) newOptions.boardAliases = {};
        newOptions.boardAliases[boardId] = alias;

        await this.setRoomOptions(roomId, newOptions);
        return this.calculateNewRoomOptions(roomId);
    }

    public async setListAlias(roomId: string, listId: string, alias: string): Promise<RoomOptions> {
        const current = await this.getRoomOptions(roomId);
        const newOptions: RoomOptions = JSON.parse(JSON.stringify(current));
        if (!newOptions.listAliases) newOptions.listAliases = {};
        newOptions.listAliases[listId] = alias;

        await this.setRoomOptions(roomId, newOptions);
        return this.calculateNewRoomOptions(roomId);
    }

    private async setRoomOptions(roomId: string, options: RoomOptions): Promise<any> {
        const stateKey = "_" + (await this.client.getUserId());
        let current = {};
        try {
            current = await this.client.getRoomStateEvents(roomId, "m.room.bot.options", stateKey);
        } catch (e) {
            if (e["body"] && typeof(e["body"]) === "string") e["body"] = JSON.parse(e["body"]);
            if (e["body"] && e["body"]["errcode"] === "M_NOT_FOUND") {
                current = {};
            } else {
                throw e;
            }
        }
        current["trello"] = {
            defaultBoardId: options.boardId,
            defaultListId: options.listId,
            boardAliases: options.boardAliases,
            listAliases: options.listAliases,
        };
        return this.client.sendStateEvent(roomId, "m.room.bot.options", stateKey, current);
    }
}