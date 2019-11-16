import { AllowNull, AutoIncrement, Column, Model, PrimaryKey, Table } from "sequelize-typescript";

@Table({
    tableName: "trello_boards_to_rooms",
    underscored: false,
    timestamps: false,
})
export default class BoardRooms extends Model<BoardRooms> {
    @PrimaryKey
    @AutoIncrement
    @Column
    id: number;

    @Column
    boardId: string;

    @Column
    roomId: string;

    @AllowNull
    @Column
    boardUrl: string;

    @AllowNull
    @Column
    boardName: string;
}
