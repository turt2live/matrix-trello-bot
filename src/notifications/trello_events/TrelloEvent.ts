import { TrelloBoard } from "../../trello/models/board";
import { TrelloEventDef } from "./TrelloEvents";

export class TrelloEvent {
    public templateString = "";
    public templateStringWithBoard = "";
    public templateVariables: any = {};

    constructor(public readonly board: TrelloBoard, public readonly def: TrelloEventDef) {
    }
}