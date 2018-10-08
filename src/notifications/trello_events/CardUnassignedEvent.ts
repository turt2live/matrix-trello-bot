import { TrelloEvent } from "./TrelloEvent";
import { getCardUrl, TrelloCard } from "../../trello/models/card";
import { TrelloMember } from "../../trello/models/member";
import { TrelloBoard } from "../../trello/models/board";
import { TrelloEvents } from "./TrelloEvents";

export class CardUnassignedEvent extends TrelloEvent {
    constructor(card: TrelloCard, member: TrelloMember, assigned: TrelloMember, board: TrelloBoard) {
        super(board, TrelloEvents.CARD_UNASSIGNED);
        this.templateString = `{member} removed {assigned} from the card <a href="{card_url}">{card_name}</a>`;
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