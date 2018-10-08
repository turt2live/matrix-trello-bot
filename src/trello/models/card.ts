export interface TrelloCard {
    shortUrl: string;
    shortLink: string;
    id: string;
    name: string;
    idShort: number;
    closed?: boolean;
}

export function getCardUrl(card: TrelloCard): string {
    if (card.shortUrl) return card.shortUrl;
    return `https://trello.com/c/${card.shortLink}`;
}