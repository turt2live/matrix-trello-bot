import TrelloToken from "../db/models/TrelloToken";
import { TrelloBoard } from "./models/board";
import { OAuthHandler } from "../web/OAuth";
import config from "../config";
import * as request from "request";
import { TrelloType } from "./models/type";
import { TrelloList } from "./models/list";
import { TrelloCard } from "./models/card";

export class Trello {
    private constructor() {
    }

    public static getType(token: TrelloToken, resource: string): Promise<TrelloType> {
        return OAuthHandler.authedGet(token, "/1/types/" + resource);
    }

    public static createBoard(token: TrelloToken, boardName: string, options: any = {}): Promise<TrelloBoard> {
        return OAuthHandler.authedPost(token, "/1/boards", {}, Object.assign({name: boardName}, options));
    }

    public static getBoards(token: TrelloToken): Promise<TrelloBoard[]> {
        return OAuthHandler.authedGet(token, "/1/members/me/boards");
    }

    public static getBoard(token: TrelloToken, boardId: string): Promise<TrelloBoard> {
        return OAuthHandler.authedGet(token, "/1/boards/" + boardId);
    }

    public static deleteBoard(token: TrelloToken, boardId: string): Promise<any> {
        return OAuthHandler.authedDelete(token, "/1/boards/" + boardId);
    }

    public static async idOrUrlToBoard(token: TrelloToken, reference: string): Promise<TrelloBoard> {
        const boards = await this.getBoards(token);
        for (const board of boards) {
            if (board.id.startsWith(reference)) return board;
            if (reference.startsWith(board.shortUrl)) return board;
        }

        return null;
    }

    public static inviteMemberToBoard(token: TrelloToken, boardId: string, memberId: string, memberRole: "admin" | "normal" | "observer"): Promise<any> {
        return OAuthHandler.authedPut(token, "/1/boards/" + boardId + "/members/" + memberId, {}, {type: memberRole});
    }

    public static removeMemberFromBoard(token: TrelloToken, boardId: string, memberId: string): Promise<any> {
        return OAuthHandler.authedDelete(token, "/1/boards/" + boardId + "/members/" + memberId);
    }

    public static getLists(token: TrelloToken, boardId: string, type: "all" | "closed" | "none" | "open" = "open"): Promise<TrelloList[]> {
        return OAuthHandler.authedGet(token, "/1/boards/" + boardId + "/lists/" + type);
    }

    public static async getList(token: TrelloToken, boardId: string, listId: string): Promise<TrelloList> {
        const lists = await this.getLists(token, boardId);
        const list = lists.find(s => s.id === listId);
        if (list) return list;
        else throw new Error("List not found");
    }

    public static async createList(token: TrelloToken, boardId: string, name: string): Promise<TrelloList> {
        return OAuthHandler.authedPost(token, "/1/boards/" + boardId + "/lists", {}, {name: name});
    }

    public static async deleteList(token: TrelloToken, boardId: string, listId: string): Promise<any> {
        return OAuthHandler.authedPut(token, "/1/lists/" + listId + "/closed", {}, {value: true});
    }

    public static async getCards(token: TrelloToken, boardId: string, listId: string): Promise<TrelloCard[]> {
        return OAuthHandler.authedGet(token, "/1/lists/" + listId + "/cards");
    }

    public static newWebhook(token: TrelloToken, idModel: string, callbackUrl: string, description: string): Promise<{ id: string }> {
        return new Promise((resolve, reject) => {
            request({
                url: "https://api.trello.com/1/tokens/" + token.token + "/webhooks",
                method: "POST",
                qs: {key: config.trelloApiKey},
                json: {
                    description: description,
                    idModel: idModel,
                    callbackURL: callbackUrl,
                },
            }, (err, body, response) => {
                if (err) reject(err);
                else if (body.statusCode !== 200) reject(response);
                else resolve(response);
            });
        });
    }

    public static deleteWebhook(token: TrelloToken, webhookId: string): Promise<any> {
        return new Promise((resolve, reject) => {
            request({
                url: "https://api.trello.com/1/tokens/" + token.token + "/webhooks/" + webhookId,
                method: "DELETE",
                qs: {key: config.trelloApiKey},
            }, (err, body, response) => {
                if (err) reject(err);
                else if (body.statusCode !== 200) reject(response);
                else resolve(response);
            });
        });
    }

    public static deleteToken(token: TrelloToken): Promise<any> {
        return new Promise((resolve, reject) => {
            request({
                url: "https://api.trello.com/1/tokens/" + token.token,
                method: "DELETE",
                qs: {key: config.trelloApiKey},
            }, (err, body, response) => {
                if (err) reject(err);
                else if (body.statusCode !== 200) reject(response);
                else resolve(response);
            });
        });
    }
}