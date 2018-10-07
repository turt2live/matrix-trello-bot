import { MatrixClient } from "matrix-bot-sdk";
import BoardRooms from "./db/models/BoardRooms";
import { LogService } from "matrix-js-snippets";

export interface RoomDefaults {
    boardId: string;
}

export class DefaultsManager {

    private cachedDefaults: { [roomId: string]: RoomDefaults } = {};

    constructor(private client: MatrixClient) {
    }

    public async calculateNewDefaults(roomId: string): Promise<RoomDefaults> {
        const roomDefaults: RoomDefaults = {
            boardId: null,
        };

        try {
            const state = await this.client.getRoomStateEvents(roomId, "m.room.bot.options", "_" + (await this.client.getUserId()));
            if (typeof(state) !== "object" || !state) {
                throw new Error("Expected exactly one state event for bot options in " + roomId);
            } else {
                if (state["trello"]) {
                    roomDefaults.boardId = state["trello"]["defaultBoardId"];
                }
            }
        } catch (e) {
            if (e["body"] && typeof(e["body"]) === "string") e["body"] = JSON.parse(e["body"]);
            if (e["body"] && e["body"]["errcode"] === "M_NOT_FOUND") {
                LogService.verbose("DefaultsManager", "Bot options not found in " + roomId);
            } else {
                throw e;
            }
        }

        if (!roomDefaults.boardId) {
            const boards = await BoardRooms.findAll({where: {roomId: roomId}});
            if (boards && boards.length === 1) {
                roomDefaults.boardId = boards[0].boardId;
            }
        }

        LogService.verbose("DefaultsManager", "New defaults for " + roomId + " are: " + JSON.stringify(roomDefaults));
        this.cachedDefaults[roomId] = roomDefaults;
        return roomDefaults;
    }

    public async getRoomDefaults(roomId: string): Promise<RoomDefaults> {
        if (!this.cachedDefaults[roomId]) {
            this.cachedDefaults[roomId] = await this.calculateNewDefaults(roomId);
        }
        return this.cachedDefaults[roomId];
    }

    public async setDefaultBoardId(roomId: string, boardId: string): Promise<RoomDefaults> {
        const current = await this.getRoomDefaults(roomId);
        const newDefaults: RoomDefaults = JSON.parse(JSON.stringify(current));
        newDefaults.boardId = boardId;

        await this.setDefaults(roomId, newDefaults);
        return this.calculateNewDefaults(roomId);
    }

    private async setDefaults(roomId: string, defaults: RoomDefaults): Promise<any> {
         const stateKey = "_" + (await this.client.getUserId());
         return this.client.sendStateEvent(roomId, "m.room.bot.options", stateKey, {
             defaultBoardId: defaults.boardId,
         });
    }
}