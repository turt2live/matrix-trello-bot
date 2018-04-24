import * as config from "config";
import { LogConfig } from "matrix-js-snippets";

interface IConfig {
    homeserverUrl: string;
    accessToken: string;

    dbFile: string;

    trelloApiKey: string;
    trelloApiSecret: string;

    bind: string;
    port: number;
    publicBaseUrl: string;

    logging: LogConfig;
}

export default <IConfig>config;