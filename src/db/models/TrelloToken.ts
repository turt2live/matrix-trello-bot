import {
    AllowNull, AutoIncrement, BelongsTo, Column, ForeignKey, Model, PrimaryKey,
    Table
} from "sequelize-typescript";

@Table({
    tableName: "trello_tokens",
    underscored: false,
    timestamps: false,
})
export default class TrelloToken extends Model<TrelloToken> {
    @PrimaryKey
    @AutoIncrement
    @Column
    id: number;

    @Column
    userId: string;

    @Column
    token: string;

    @Column
    tokenSecret: string;
}
