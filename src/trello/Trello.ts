import TrelloToken from "../db/models/TrelloToken";
import { TrelloBoard } from "./models/board";
import { OAuthHandler } from "../web/OAuth";
import config from "../config";
import request = require("request");

export class Trello {
    private constructor() {
    }

    public static getBoards(token: TrelloToken): Promise<TrelloBoard[]> {
        return OAuthHandler.authedGet(token, "/1/members/me/boards");
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
}