import { QueryInterface } from "sequelize";
import { DataType } from "sequelize-typescript";

export default {
    up: (queryInterface: QueryInterface) => {
        return queryInterface.createTable("trello_boards_to_rooms", {
            "id": {type: DataType.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false},
            "boardId": {type: DataType.STRING, allowNull: false},
            "roomId": {type: DataType.STRING, allowNull: false},
        });
    },
    down: (queryInterface: QueryInterface) => {
        return queryInterface.dropTable("trello_boards_to_rooms");
    }
}