import { QueryInterface } from "sequelize";
import { DataType } from "sequelize-typescript";

export default {
    up: (queryInterface: QueryInterface) => {
        return queryInterface.createTable("trello_webhooks", {
            "webhookId": {type: DataType.STRING, allowNull: false, primaryKey: true},
            "boardId": {type: DataType.STRING, allowNull: false},
        });
    },
    down: (queryInterface: QueryInterface) => {
        return queryInterface.dropTable("trello_webhooks");
    }
}