import { MatrixClient } from "matrix-bot-sdk";
import { BotOptionsManager } from "../BotOptionsManager";
import { TrelloEvent } from "./trello_events/TrelloEvent";
import BoardRooms from "../db/models/BoardRooms";
import * as formatTemplate from "string-template";
import striptags = require("striptags");

export class RoomAnnouncer {
    constructor(private client: MatrixClient, private optionsManager: BotOptionsManager) {
    }

    public async sendNotification(event: TrelloEvent): Promise<any> {
        const rooms = await BoardRooms.findAll({where: {boardId: event.board.id}});
        if (!rooms || rooms.length === 0) return; // No notifications to send

        return Promise.all(rooms.map(r => this.sendEventToRoom(event, r)));
    }

    private async sendEventToRoom(event: TrelloEvent, room: BoardRooms): Promise<any> {
        const roomOptions = await this.optionsManager.getRoomOptions(room.roomId);
        const template = roomOptions.boardId === event.board.id ? event.templateString : event.templateStringWithBoard;
        if (!template) return;

        if (!(await this.optionsManager.isEventWatched(room.roomId, event.board.id, event.def))) {
            return;
        }

        const htmlMessage = formatTemplate(template, event.templateVariables);
        return this.client.sendMessage(room.roomId, {
            msgtype: "m.notice",
            body: striptags(htmlMessage),
            format: "org.matrix.custom.html",
            formatted_body: htmlMessage,
        });
    }
}