# matrix-trello-bot

[![TravisCI badge](https://travis-ci.org/turt2live/matrix-trello-bot.svg?branch=master)](https://travis-ci.org/turt2live/matrix-trello-bot)

A matrix bot to interact with Trello.

Questions? Ask away in [#trellobot:t2bot.io](https://matrix.to/#/#trellobot:t2bot.io)

# Usage

1. Invite `@trello:t2bot.io` to a private room
2. Send the message `!trello login` to authorize the bot to access your boards
3. Invite `@trello:t2bot.io` to the room where you'd like Trello notifications/commands
4. Send the message `!trello watch <board url>` 
5. The bot will now start notifying you about various actions performed on Trello

# Building your own

*Note*: You'll need to have access to an account that the bot can use to get the access token.

1. Clone this repository
2. `npm install`
3. `npm run build`
4. Copy `config/default.yaml` to `config/production.yaml`
5. Run the bot with `NODE_ENV=production node lib/index.js`

### Docker

```
# Create the directory structure
# The bot needs it's config folder and cache location.
mkdir -p /matrix-trello-bot/config
mkdir -p /matrix-trello-bot/storage

# Create the configuration file. Use the default configration as a template.
nano /matrix-trello-bot/config/production.yaml

# Run the container
docker run -v /matrix-trello-bot:/data -p 4501:4501 turt2live/matrix-trello-bot
```
