import * as express from "express";
import * as url from "url";
import config from "../config";
import { LogService } from "matrix-js-snippets";
import { OAuthHandler } from "./OAuth";
import * as crypto from "crypto";
import * as bodyParser from "body-parser";
import * as PubSub from "pubsub-js";

class _Webserver {

    private app: any;

    constructor() {
        this.app = express();
        this.app.use(bodyParser.json());

        this.app.get("/api/v1/oauth/callback", this.onCallback.bind(this));
        this.app.head("/api/v1/trello/webhook", (req, res) => res.sendStatus(200));
        this.app.post("/api/v1/trello/webhook", this.onWebhook.bind(this));

        this.app.listen(config.port, config.bind);
    }

    public getWebhookUrl() {
        let baseUrl = config.publicBaseUrl;
        if (baseUrl.endsWith("/")) baseUrl = baseUrl.substring(0, baseUrl.length - 1);
        return baseUrl + "/api/v1/trello/webhook";
    }

    private onCallback(req, res) {
        LogService.info("Webserver", "OAuth callback called. Analyzing request");
        const query = url.parse(req.url, true).query;
        const token = <string>query.oauth_token;
        const verifier = <string>query.oauth_verifier;

        OAuthHandler.verifyCallback(token, verifier)
            .then(() => res.status(200).send("Thank you! You may now close this window and return to the bot."))
            .catch(() => res.status(500).send("Error processing request"));
    }

    private onWebhook(req, res) {
        LogService.info("Webserver", "Incoming webhook");

        const base64Digest = (s) => {
            return crypto.createHmac('sha1', config.trelloApiSecret).update(s).digest('base64');
        };
        const content = JSON.stringify(req.body) + this.getWebhookUrl();
        const doubleHash = base64Digest(base64Digest(content));
        const headerHash = base64Digest(req.headers['x-trello-webhook']);

        if (doubleHash !== headerHash) {
            LogService.warn("Webserver", "Unauthorized webhook request: Invalid signature");
            res.sendStatus(400);
            return;
        }

        PubSub.publish("webhook", req.body);
        res.sendStatus(200);
    }
}

export const Webserver = new _Webserver();