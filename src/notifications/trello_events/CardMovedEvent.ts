import { TrelloEvent } from "./TrelloEvent";
import { getCardUrl, TrelloCard } from "../../trello/models/card";
import { TrelloList } from "../../trello/models/list";
import { TrelloMember } from "../../trello/models/member";
import { TrelloBoard } from "../../trello/models/board";
import { TrelloEvents } from "./TrelloEvents";

export class CardMovedEvent extends TrelloEvent {
    constructor(card: TrelloCard, oldList: TrelloList, newList: TrelloList, member: TrelloMember, board: TrelloBoard) {
        super(board, TrelloEvents.CARD_MOVED);
        console.log(card);
        this.templateString = `{member} moved <a href="{card_url}">{card_name}</a> from {old_list_name} to {new_list_name}`;
        this.templateStringWithBoard = this.templateString + " on {board_name}";
        this.templateVariables = {
            member: member.fullName,
            card_name: card.name,
            card_url: getCardUrl(card),
            old_list_name: oldList.name,
            new_list_name: newList.name,
            board_name: board.name,
        };
    }
}