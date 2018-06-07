import * as config from "config";
import { LogConfig } from "matrix-js-snippets";

interface IConfig {
    homeserverUrl: string;
    accessToken: string;

    dbFile: string;
    dataPath: string;

    trelloApiKey: string;
    trelloApiSecret: string;

    bind: string;
    port: number;
    publicBaseUrl: string;

    logging: LogConfig;
}

const conf = <IConfig>config;

if (process.env["BOT_PORT"]) {
    const realPort = Number(process.env["BOT_PORT"]);
    if (realPort !== Number(conf.port)) {
        console.warn("Configuration and environment variables do not agree on the webserver port. Using " + realPort);
    }

    conf.port = realPort;
}

if (process.env["BOT_BIND"]) {
    const realBind = process.env["BOT_BIND"];
    if (realBind !== conf.bind) {
        console.warn("Configuration and environment variables do not agree on the webserver bind address. Using " + realBind);
    }

    conf.bind = realBind;
}

if (process.env["BOT_DATABASE"]) {
    const readlDbPath = process.env["BOT_DATABASE"];
    if (readlDbPath !== conf.dbFile) {
        console.warn("Configuration and environment variables do not agree on the database path. Using " + readlDbPath);
    }

    conf.dbFile = readlDbPath;
}

if (process.env["BOT_DATA_PATH"]) {
    const realPath = process.env["BOT_DATA_PATH"];
    if (realPath !== conf.dataPath) {
        console.warn("Configuration and environment variables do not agree on the data path. Using " + realPath);
    }

    conf.dataPath = realPath;
}

if (process.env["BOT_DOCKER_LOGS"]) {
    console.log("Altering log configuration to only write out to console");
    conf.logging = {
        file: "/data/logs/trello.log",
        console: true,
        consoleLevel: conf.logging.consoleLevel,
        fileLevel: "error",
        writeFiles: false,
        rotate: {
            size: 0,
            count: 0,
        },
    };
}

export default conf;
