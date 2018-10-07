import { QueryInterface } from "sequelize";
import { DataType } from "sequelize-typescript";

export default {
    up: (queryInterface: QueryInterface) => {
        return Promise.resolve()
            .then(() => queryInterface.addColumn("trello_boards_to_rooms", "boardUrl", DataType.STRING))
            .then(() => queryInterface.addColumn("trello_boards_to_rooms", "boardName", DataType.STRING));
    },
    down: (queryInterface: QueryInterface) => {
        return Promise.resolve()
            .then(() => queryInterface.removeColumn("trello_boards_to_rooms", "boardUrl"))
            .then(() => queryInterface.removeColumn("trello_boards_to_rooms", "boardName"));
    }
}