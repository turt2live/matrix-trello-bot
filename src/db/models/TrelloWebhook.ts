import {
    AllowNull, AutoIncrement, BelongsTo, Column, ForeignKey, Model, PrimaryKey,
    Table
} from "sequelize-typescript";

@Table({
    tableName: "trello_webhooks",
    underscoredAll: false,
    timestamps: false,
})
export default class TrelloWebhook extends Model<TrelloWebhook> {
    @PrimaryKey
    @Column
    webhookId: string;

    @Column
    boardId: string;
}