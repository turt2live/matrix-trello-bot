import { QueryInterface } from "sequelize";
import { DataType } from "sequelize-typescript";

export default {
    up: (queryInterface: QueryInterface) => {
        return queryInterface.createTable("trello_tokens", {
            "id": {type: DataType.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false},
            "userId": {type: DataType.STRING, allowNull: false},
            "token": {type: DataType.STRING, allowNull: false},
            "tokenSecret": {type: DataType.STRING, allowNull: false},
        });
    },
    down: (queryInterface: QueryInterface) => {
        return queryInterface.dropTable("trello_tokens");
    }
}