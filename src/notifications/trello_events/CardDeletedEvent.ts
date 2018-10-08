import { TrelloEvent } from "./TrelloEvent";
import { TrelloCard } from "../../trello/models/card";
import { TrelloList } from "../../trello/models/list";
import { TrelloMember } from "../../trello/models/member";
import { TrelloBoard } from "../../trello/models/board";
import { TrelloEvents } from "./TrelloEvents";

export class CardDeletedEvent extends TrelloEvent {
    constructor(card: TrelloCard, list: TrelloList, member: TrelloMember, board: TrelloBoard) {
        super(board, TrelloEvents.CARD_DELETED);
        this.templateString = `{member} deleted card #{card_id} from {list_name}`;
        this.templateStringWithBoard = this.templateString + " on {board_name}";
        this.templateVariables = {
            member: member.fullName,
            card_id: card.idShort,
            list_name: list.name,
            board_name: board.name,
        };
    }
}