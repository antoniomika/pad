# syntax = docker/dockerfile:experimental
FROM --platform=$TARGETPLATFORM node:alpine as builder
LABEL maintainer="Antonio Mika <me@antoniomika.me>"

ENV DISCORD_TOKEN=""
ENV DISCORD_CLIENT_ID=""
ENV DISCORD_BOT_OWNER_TAG=""
ENV FFMPEG_INPUT=""

WORKDIR /usr/src/app

RUN apk add --no-cache build-base libtool autoconf automake python3 ffmpeg alsa-plugins-pulse

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

CMD ["npm", "start"]