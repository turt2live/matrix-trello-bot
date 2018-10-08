import { TrelloEvent } from "./TrelloEvent";
import { getCardUrl, TrelloCard } from "../../trello/models/card";
import { TrelloMember } from "../../trello/models/member";
import { TrelloBoard } from "../../trello/models/board";
import { TrelloEvents } from "./TrelloEvents";

export class CardAssignedEvent extends TrelloEvent {
    constructor(card: TrelloCard, member: TrelloMember, assigned: TrelloMember, board: TrelloBoard) {
        super(board, TrelloEvents.CARD_ASSIGNED);
        this.templateString = `{member} assigned the card <a href="{card_url}">{card_name}</a> to {assigned}`;
        this.templateStringWithBoard = this.templateString + " on {board_name}";
        this.templateVariables = {
            member: member.fullName,
            assigned: assigned.fullName,
            card_name: card.name,
            card_url: getCardUrl(card),
            board_name: board.name,
        };
    }
}