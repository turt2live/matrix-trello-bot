import { MatrixClient } from "matrix-bot-sdk";
import * as PubSub from "pubsub-js";
import { TrelloBoard } from "../trello/models/board";
import BoardRooms from "../db/models/BoardRooms";
import { TrelloCard } from "../trello/models/card";
import { TrelloList } from "../trello/models/list";
import { TrelloMember } from "../trello/models/member";
import striptags = require("striptags");

export class WebhookProcessor {
    constructor(private client: MatrixClient) {
        PubSub.subscribe("webhook", this.onWebhook.bind(this));
    }

    private async onWebhook(_action: string, payload: any) {
        if (!payload["model"]) return;
        console.log(payload);
        if (!payload["action"] || !payload["action"]["data"]) return;

        const board = <TrelloBoard>payload["model"];
        const rooms = await BoardRooms.findAll({where: {boardId: board.id}});
        if (!rooms || rooms.length === 0) return;

        const action = payload["action"];
        let message = null;
        if (action["type"] === "createCard") {
            const card = <TrelloCard>action["data"]["card"];
            const list = <TrelloList>action["data"]["list"];
            const creator = <TrelloMember>action["memberCreator"];
            if (!card || !list || !creator) return;

            message = creator.fullName + " created the card '" + card.name + "' under '" + list.name + "' on '" + board.name + "'";
        } else if (action["type"] === "updateCard") {
            // TODO: We need a lot more intelligence on parsing updates

            const card = <TrelloCard>action["data"]["card"];
            const list = <TrelloList>action["data"]["list"];
            const listBefore = <TrelloList>action["data"]["listBefore"];
            const listAfter = <TrelloList>action["data"]["listAfter"];
            const creator = <TrelloMember>action["memberCreator"];
            const old = action["data"]["old"];
            if (!card || !creator || !old) return;
            if (!list && (!listAfter || !listBefore)) return;
            console.log(action);
            console.log(action["data"]);

            if (listAfter && listBefore) {
                message = creator.fullName + " moved the card '" + card.name + "' from '" + listBefore.name + "' to '" + listAfter.name + "' on '" + board.name + "'";
            } else if (old.closed !== card.closed) {
                if (card.closed) message = creator.fullName + " archived the card '" + card.name + "' under '" + list.name + "' on '" + board.name + "'";
                else message = creator.fullName + " restored the card '" + card.name + "' under '" + list.name + "' on '" + board.name + "'";
            } else if (old.pos === undefined) message = creator.fullName + " updated the card '" + card.name + "' under '" + list.name + "' on '" + board.name + "'";
        } else if (action["type"] === "deleteCard") {
            const card = <TrelloCard>action["data"]["card"];
            const list = <TrelloList>action["data"]["list"];
            const creator = <TrelloMember>action["memberCreator"];
            if (!card || !list || !creator) return;

            message = creator.fullName + " deleted the card '" + card.name + "' under '" + list.name + "' on '" + board.name + "'";
        } else if (action["type"] === "addMemberToCard") {
            const card = <TrelloCard>action["data"]["card"];
            const creator = <TrelloMember>action["memberCreator"];
            const member = <TrelloMember>action["member"];
            if (!card || !member || !creator) return;

            message = creator.fullName + " added " + member.fullName + " to the card '" + card.name + "' on '" + board.name + "'";
        } else if (action["type"] === "removeMemberFromCard") {
            const card = <TrelloCard>action["data"]["card"];
            const creator = <TrelloMember>action["memberCreator"];
            const member = <TrelloMember>action["member"];
            if (!card || !member || !creator) return;

            message = creator.fullName + " removed " + member.fullName + " from the card '" + card.name + "' on '" + board.name + "'";
        } else console.log(action);

        if (message) {
            for (const room of rooms) {
                this.sendHtmlMessage(room.roomId, message);
            }
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
}