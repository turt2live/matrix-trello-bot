# matrix-trello-bot

[![TravisCI badge](https://travis-ci.org/turt2live/matrix-trello-bot.svg?branch=master)](https://travis-ci.org/turt2live/matrix-trello-bot)

A matrix bot to interact with Trello.

Questions? Ask away in [#trellobot:t2bot.io](https://matrix.to/#/#trellobot:t2bot.io)

# Usage

1. Invite `@trello:t2bot.io` to a room
2. TODO

# Building your own

*Note*: You'll need to have access to an account that the bot can use to get the access token.

1. Clone this repository
2. `npm install`
3. `npm run build`
4. Copy `config/default.yaml` to `config/production.yaml`
5. Run the bot with `NODE_ENV=production node lib/index.js`
