import TrelloToken from "../db/models/TrelloToken";
import { TrelloBoard } from "./models/board";
import { OAuthHandler } from "../web/OAuth";
import config from "../config";
import * as request from "request";
import { TrelloType } from "./models/type";

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