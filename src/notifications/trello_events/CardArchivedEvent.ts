import { TrelloEvent } from "./TrelloEvent";
import { getCardUrl, TrelloCard } from "../../trello/models/card";
import { TrelloList } from "../../trello/models/list";
import { TrelloMember } from "../../trello/models/member";
import { TrelloBoard } from "../../trello/models/board";
import { TrelloEvents } from "./TrelloEvents";

export class CardArchivedEvent extends TrelloEvent {
    constructor(card: TrelloCard, list: TrelloList, member: TrelloMember, board: TrelloBoard) {
        super(board, TrelloEvents.CARD_ARCHIVED);
        this.templateString = `{member} archived the card <a href="{card_url}">{card_name}</a> under {list_name}`;
        this.templateStringWithBoard = this.templateString + " on {board_name}";
        this.templateVariables = {
            member: member.fullName,
            card_name: card.name,
            card_url: getCardUrl(card),
            list_name: list.name,
            board_name: board.name,
        };
    }
}