import { TrelloEvent } from "./TrelloEvent";
import { getCardUrl, TrelloCard } from "../../trello/models/card";
import { TrelloList } from "../../trello/models/list";
import { TrelloMember } from "../../trello/models/member";
import { TrelloBoard } from "../../trello/models/board";
import { TrelloEvents } from "./TrelloEvents";

export class CardCreatedEvent extends TrelloEvent {
    constructor(card: TrelloCard, list: TrelloList, creator: TrelloMember, board: TrelloBoard) {
        super(board, TrelloEvents.CARD_CREATED);
        this.templateString = `{creator} created the card <a href="{card_url}">{card_name}</a> under {list_name}`;
        this.templateStringWithBoard = this.templateString + " on {board_name}";
        this.templateVariables = {
            creator: creator.fullName,
            card_name: card.name,
            card_url: getCardUrl(card),
            list_name: list.name,
            board_name: board.name,
        };
    }
}