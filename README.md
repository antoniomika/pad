# PAD

## Pulse Audio in Discord

A simple bot to send Pulse Audio streams to Discord. Truthfully any FFMPEG sources can be used with this.

To use the bot, use the following (without docker):

1. Install deps

   > :warning: This does not install optional dependencies. If you don't have FFMPEG installed globally,
   > you may want to include option dependencies. Feel free to drop the flag.

   ```bash
   npm ci --no-optional
   ```

2. Run the service using some env vars

   ```bash
   DISCORD_TOKEN="" DISCORD_CLIENT_ID="" DISCORD_BOT_OWNER_TAG="" FFMPEG_INPUT="" npm run dev
   ```

3. Join the bot to the server

Use the bot with docker:

1. Run the container

   ```bash
   docker \
       -v /path/to/pulse/socket:/path/to/pulse/socket
       -v /path/to/pulse/client:/path/to/pulse/client
       -e DISCORD_TOKEN=${DISCORD_TOKEN:-heres_a_token}
       -e DISCORD_CLIENT_ID=${DISCORD_CLIENT_ID:-heres_a_client_id} \
       -e DISCORD_BOT_OWNER_TAG=${DISCORD_BOT_OWNER_TAG:-heres_a_user_tag} \
       -e FFMPEG_INPUT=${FFMPEG_INPUT:--f alsa -i default} \
       antoniomika/pad:main
   ```

2. Join the bot to the server

A docker-compose file is included that also includes Pulse Audio running alongside PAD
