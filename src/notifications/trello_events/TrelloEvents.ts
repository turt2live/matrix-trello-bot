export interface TrelloEventDef {
    name: string;
    description: string;
}

export class TrelloEvents {

    public static readonly CARD_CREATED = TrelloEvents.createDef("cardCreated", "Fired when a new card has been created");
    public static readonly CARD_MOVED = TrelloEvents.createDef("cardMoved", "Fired when a card has been moved between lists");
    public static readonly CARD_ARCHIVED = TrelloEvents.createDef("cardArchived", "Fired when a card has been archived");
    public static readonly CARD_RESTORED = TrelloEvents.createDef("cardRestored", "Fired when a card has been restored from the archive");
    public static readonly CARD_DELETED = TrelloEvents.createDef("cardDeleted", "Fired when a card has been deleted");
    public static readonly CARD_ASSIGNED = TrelloEvents.createDef("cardAssigned", "Fired when a user has been added to a card");
    public static readonly CARD_UNASSIGNED = TrelloEvents.createDef("cardUnassigned", "Fired when a user has been removed from a card");
    public static readonly CARD_UPDATED = TrelloEvents.createDef("cardUpdated", "Fired when an unhandled update happens to a card");

    public static readonly DEFAULT_WATCHED_EVENTS: TrelloEventDef[] = [
        TrelloEvents.CARD_CREATED,
        TrelloEvents.CARD_MOVED,
        TrelloEvents.CARD_ARCHIVED,
        TrelloEvents.CARD_RESTORED,
        TrelloEvents.CARD_DELETED,
        TrelloEvents.CARD_ASSIGNED,
        TrelloEvents.CARD_UNASSIGNED,
        TrelloEvents.CARD_UPDATED,
    ];

    public static get ALL(): TrelloEventDef[] {
        const propNames = Object.keys(TrelloEvents);
        const defs: TrelloEventDef[] = [];
        for (const prop of propNames) {
            if (prop.toUpperCase() !== prop) continue;

            const value = TrelloEvents[prop];
            if (!value || Array.isArray(value) || typeof(value) !== "object") continue;

            defs.push(value);
        }

        return defs;
    }

    private constructor() {
    }

    private static createDef(name: string, description: string): TrelloEventDef {
        return {name, description};
    }
}