FROM node:10-alpine
COPY . /tmp/src
WORKDIR /tmp/src
RUN apk add --no-cache make gcc g++ python ca-certificates libc-dev wget git sqlite \
    && npm install \
    && npm run build \
    && mv lib/ /matrix-trello-bot/ \
    && mv node_modules / \
    && cd / \
    && rm -rf /tmp/*

WORKDIR /

ENV NODE_ENV=production
ENV NODE_CONFIG_DIR=/data/config

# We want to make sure that the user can't configure these wrong
ENV BOT_PORT=4501
ENV BOT_BIND=0.0.0.0
ENV BOT_DATABASE=/data/trello.db
ENV BOT_DATA_PATH=/data/storage
ENV BOT_DOCKER_LOGS=true

CMD node /matrix-trello-bot/index.js
VOLUME ["/data"]

EXPOSE 4501
