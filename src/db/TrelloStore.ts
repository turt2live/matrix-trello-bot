import { LogService } from "matrix-js-snippets";
import config from "../config";
import { Sequelize } from "sequelize-typescript";
import TrelloToken from "./models/TrelloToken";
import * as path from "path";
import * as Umzug from "umzug";
import BoardRooms from "./models/BoardRooms";
import TrelloWebhook from "./models/TrelloWebhook";

class _TrelloStore {
    private sequelize: Sequelize;

    constructor() {
        this.sequelize = new Sequelize({
            dialect: 'sqlite',
            database: "dimension",
            storage: config.dbFile,
            username: "",
            password: "",
            logging: i => LogService.verbose("TrelloStore [SQL]", i)
        });
        this.sequelize.addModels([
            TrelloToken,
            BoardRooms,
            TrelloWebhook,
        ]);
    }

    public updateSchema(): Promise<any> {
        LogService.info("TrelloStore", "Updating schema...");

        const migrator = new Umzug({
            storage: "sequelize",
            storageOptions: {sequelize: this.sequelize},
            migrations: {
                params: [this.sequelize.getQueryInterface()],
                path: path.join(__dirname, "migrations"),
            }
        });

        return migrator.up();
    }
}

export const TrelloStore = new _TrelloStore();
