import { PADBot } from '../src/lib'

const DISCORD_TOKEN = process.env.DISCORD_TOKEN

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID ?? ''

const DISCORD_BOT_OWNER_TAG = process.env.DISCORD_BOT_OWNER_TAG ?? ''

const FFMPEG_INPUT = process.env.FFMPEG_INPUT ?? '-f avfoundation -i :0'

if (DISCORD_TOKEN === undefined) {
  throw new Error('Unable to find DISCORD_TOKEN in the environment.')
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const bot = new PADBot(DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_BOT_OWNER_TAG, FFMPEG_INPUT, true)
