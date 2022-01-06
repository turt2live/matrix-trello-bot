import * as PubSub from "pubsub-js";
import { TrelloBoard } from "../trello/models/board";
import { TrelloCard } from "../trello/models/card";
import { TrelloList } from "../trello/models/list";
import { TrelloMember } from "../trello/models/member";
import { RoomAnnouncer } from "./RoomAnnouncer";
import { TrelloEvent } from "./trello_events/TrelloEvent";
import { CardCreatedEvent } from "./trello_events/CardCreatedEvent";
import { CardMovedEvent } from "./trello_events/CardMovedEvent";
import { CardArchivedEvent } from "./trello_events/CardArchivedEvent";
import { CardRestoredEvent } from "./trello_events/CardRestoredEvent";
import { CardUpdatedEvent } from "./trello_events/CardUpdatedEvent";
import { CardDeletedEvent } from "./trello_events/CardDeletedEvent";
import { CardAssignedEvent } from "./trello_events/CardAssignedEvent";
import { CardUnassignedEvent } from "./trello_events/CardUnassignedEvent";
import { CardCommentedEvent } from "./trello_events/CardCommentedEvent";
import { LogService } from "matrix-js-snippets";
import { ConsoleLogger } from "matrix-bot-sdk";

export class WebhookProcessor {
    constructor(private announcer: RoomAnnouncer) {
        PubSub.subscribe("webhook", this.onWebhook.bind(this));
    }

    private onWebhook(_action: string, payload: any) {
        try {
            if (!payload["model"]) return;
            if (!payload["action"] || !payload["action"]["data"]) return;

            const board = <TrelloBoard>payload["model"];

            let event: TrelloEvent = null;

            const action = payload["action"];

            if (action["type"] === "createCard") {
                const card = <TrelloCard>action["data"]["card"];
                const list = <TrelloList>action["data"]["list"];
                const creator = <TrelloMember>action["memberCreator"];
                if (!card || !list || !creator) return;

                event = new CardCreatedEvent(card, list, creator, board);
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

                if (listAfter && listBefore) {
                    event = new CardMovedEvent(card, listBefore, listAfter, creator, board);
                } else if (old.closed !== card.closed) {
                    if (card.closed) event = new CardArchivedEvent(card, list, creator, board);
                    else event = new CardRestoredEvent(card, list, creator, board);
                } else if (old.pos === undefined) event = new CardUpdatedEvent(card, list, creator, board);
            } else if (action["type"] === "deleteCard") {
                const card = <TrelloCard>action["data"]["card"];
                const list = <TrelloList>action["data"]["list"];
                const creator = <TrelloMember>action["memberCreator"];
                if (!card || !list || !creator) return;

                event = new CardDeletedEvent(card, list, creator, board);
            } else if (action["type"] === "addMemberToCard") {
                const card = <TrelloCard>action["data"]["card"];
                const creator = <TrelloMember>action["memberCreator"];
                const member = <TrelloMember>action["member"];
                if (!card || !member || !creator) return;

                event = new CardAssignedEvent(card, creator, member, board);
            } else if (action["type"] === "removeMemberFromCard") {
                const card = <TrelloCard>action["data"]["card"];
                const creator = <TrelloMember>action["memberCreator"];
                const member = <TrelloMember>action["member"];
                if (!card || !member || !creator) return;

                event = new CardUnassignedEvent(card, creator, member, board);
            } else if (action["type"] === "commentCard") {
                const card = <TrelloCard>action["data"]["card"];
                const list = <TrelloList>action["data"]["list"];
                const creator = <TrelloMember>action["memberCreator"];

                if (!card || !list || !creator) return;

                event = new CardCommentedEvent(card, list, creator, board);
            } else {
                LogService.warn("WebhookProcessor", "Unrecognized action");
                LogService.warn("WebhookProcessor", action);
            }

            if (event) return this.announcer.sendNotification(event);
        } catch (e) {
            LogService.error("WebhookProcessor", e);
        }
    }
}