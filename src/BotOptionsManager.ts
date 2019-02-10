import { MatrixClient } from "matrix-bot-sdk";
import BoardRooms from "./db/models/BoardRooms";
import { LogService } from "matrix-js-snippets";
import { TrelloEventDef, TrelloEvents } from "./notifications/trello_events/TrelloEvents";

export interface RoomOptions {
    boardId: string;
    listId: string;
    boardAliases: { [boardId: string]: string };
    listAliases: { [listId: string]: string };
    watchedEvents: { [boardId: string]: string[] };
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
            watchedEvents: {},
        };

        try {
            const state = await this.client.getRoomStateEvent(roomId, "m.room.bot.options", "_" + (await this.client.getUserId()));
            if (state["trello"]) {
                roomOptions.boardId = state["trello"]["defaultBoardId"];
                roomOptions.listId = state["trello"]["defaultListId"];
                roomOptions.boardAliases = state["trello"]["boardAliases"];
                roomOptions.listAliases = state["trello"]["listAliases"];
                roomOptions.watchedEvents = state["trello"]["watchedEvents"];
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
        if (!roomOptions.watchedEvents) roomOptions.watchedEvents = {};

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

    public async addWatchedEvents(roomId: string, boardId: string, events: TrelloEventDef[]): Promise<RoomOptions> {
        const current = await this.getRoomOptions(roomId);
        const newOptions: RoomOptions = JSON.parse(JSON.stringify(current));
        if (!newOptions.watchedEvents) newOptions.watchedEvents = {};
        if (!newOptions.watchedEvents[boardId]) newOptions.watchedEvents[boardId] = [];

        for (const event of events) {
            const index = newOptions.watchedEvents[boardId].indexOf(event.name);
            if (index === -1) newOptions.watchedEvents[boardId].push(event.name);
        }

        await this.setRoomOptions(roomId, newOptions);
        return this.calculateNewRoomOptions(roomId);
    }

    public async removeWatchedEvents(roomId: string, boardId: string, events: TrelloEventDef[]): Promise<RoomOptions> {
        const current = await this.getRoomOptions(roomId);
        const newOptions: RoomOptions = JSON.parse(JSON.stringify(current));
        if (!newOptions.watchedEvents) newOptions.watchedEvents = {};
        if (!newOptions.watchedEvents[boardId]) newOptions.watchedEvents[boardId] = [];

        for (const event of events) {
            const index = newOptions.watchedEvents[boardId].indexOf(event.name);
            if (index !== -1) newOptions.watchedEvents[boardId].splice(index, 1);
        }

        await this.setRoomOptions(roomId, newOptions);
        return this.calculateNewRoomOptions(roomId);
    }

    public async setWatchedEvents(roomId: string, boardId: string, events: TrelloEventDef[]): Promise<RoomOptions> {
        const current = await this.getRoomOptions(roomId);
        const newOptions: RoomOptions = JSON.parse(JSON.stringify(current));
        if (!newOptions.watchedEvents) newOptions.watchedEvents = {};
        newOptions.watchedEvents[boardId] = events.map(e => e.name);

        await this.setRoomOptions(roomId, newOptions);
        return this.calculateNewRoomOptions(roomId);
    }

    public async isEventWatched(roomId: string, boardId: string, event: TrelloEventDef): Promise<boolean> {
        const watchedEvents = await this.getWatchedEvents(roomId, boardId);
        const watchingRooms = await BoardRooms.findAll({where: {roomId: roomId, boardId: boardId}});
        return Promise.resolve(watchingRooms && watchingRooms.length > 0 && !!watchedEvents.find(e => e.name === event.name));
    }

    public async getWatchedEvents(roomId: string, boardId: string, allowDefaults = true): Promise<TrelloEventDef[]> {
        const options = await this.getRoomOptions(roomId);
        if (!options.watchedEvents) options.watchedEvents = {};
        if (!options.watchedEvents[boardId] && !Array.isArray(options.watchedEvents[boardId])) {
            options.watchedEvents[boardId] = allowDefaults ? TrelloEvents.DEFAULT_WATCHED_EVENTS.map(e => e.name) : [];
        }

        return options.watchedEvents[boardId].map(e => TrelloEvents.ALL.find(k => k.name === e)).filter(e => !!e);
    }

    public async setRoomOptions(roomId: string, options: RoomOptions): Promise<any> {
        const stateKey = "_" + (await this.client.getUserId());
        let current = {};
        try {
            current = await this.client.getRoomStateEvent(roomId, "m.room.bot.options", stateKey);
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
            watchedEvents: options.watchedEvents,
        };
        return this.client.sendStateEvent(roomId, "m.room.bot.options", stateKey, current);
    }
}