import { Client, Intents, Message } from 'discord.js'
import prism from 'prism-media'

type Handler = (message: Message) => Promise<Message | undefined>

class PADBot {
  discordToken: string
  discordClientID: string
  discordBotOwnerTag: string

  ffmpegInput: string
  registerExit: boolean

  client: Client

  handlers: Map<string, Handler>

  constructor(discordToken: string, discordClientID: string, discordBotOwnerTag: string, ffmpegInput: string, registerExit: boolean = true) {
    this.discordToken = discordToken
    this.discordClientID = discordClientID
    this.discordBotOwnerTag = discordBotOwnerTag

    this.ffmpegInput = ffmpegInput
    this.registerExit = registerExit

    this.client = new Client({
      ws: {
        intents: [
          Intents.FLAGS.GUILDS,
          Intents.FLAGS.GUILD_MESSAGES,
          Intents.FLAGS.GUILD_VOICE_STATES
        ]
      }
    })

    this.client.login(this.discordToken).catch(console.error)

    this.client.on('message', (message) => {
      this.handleCommand(message).catch(console.error)
    })

    this.handlers = new Map([
      ['!join', this.handleJoin.bind(this)],
      ['!leave', this.handleLeave.bind(this)],
      ['!volume', this.handleVolume.bind(this)],
      ['!joinurl', this.handleJoinURL.bind(this)],
      ['!help', this.handleHelp.bind(this)]
    ])

    if (this.registerExit) {
      this.registerExitHandler()
    }
  }

  addCommand(command: string, handler: Handler): void {
    this.handlers.set(command, handler.bind(this))
  }

  removeCommand(command: string): void {
    this.handlers.delete(command)
  }

  async handleHelp(message: Message): Promise<Message> {
    const helpMessageLines = ['Available commands to use:']

    for (const command in this.handlers) {
      helpMessageLines.push(command)
    }

    return await message.channel.send(helpMessageLines.join('\n'))
  }

  async handleCommand(message: Message): Promise<Message | undefined> {
    const commandRoot = message.content.split(' ')[0]

    const handler = this.handlers.get(commandRoot)
    if (handler !== undefined) {
      return await handler(message)
    }
  }

  async handleJoin(message: Message): Promise<Message | undefined> {
    if (message.guild == null) {
      return
    }

    if (message.member == null || (message.member.voice.channel == null)) {
      return await message.channel.send('You need to join a voice channel first!')
    }

    if (this.discordBotOwnerTag !== 'ANYONE' && message.member?.user.tag !== this.discordBotOwnerTag) {
      return await message.channel.send('The bot owner is only allowed to join the bot.')
    }

    const connection = await message.member.voice.channel.join()

    await connection.voice?.setSelfDeaf(true)

    const ffmpegRecord = new prism.FFmpeg({
      args: this.ffmpegInput.split(' ').concat(['-analyzeduration', '0', '-loglevel', '0', '-f', 's16le', '-ar', '48000', '-ac', '2'])
    })
    // @ts-expect-error;
    const dispatcher = connection.player.playPCMStream(ffmpegRecord, { type: 'converted' }, { ffmpeg: ffmpegRecord })

    dispatcher.on('debug', console.log)

    return await message.channel.send('Joined channel.')
  }

  async handleLeave(message: Message): Promise<Message | undefined> {
    if (message.guild == null) {
      return
    }

    message.guild?.voice?.channel?.leave()
    return await message.channel.send('Left channel.')
  }

  async handleVolume(message: Message): Promise<Message | undefined> {
    if (message.guild == null) {
      return
    }

    if (message.member == null || (message.member.voice.channel == null) || message.guild?.voice?.connection == null) {
      return await message.channel.send('You need to join a voice channel first!')
    }

    let volume = message.guild.voice.connection.dispatcher.volumeLogarithmic

    const cmdAndArgs = message.content.split(' ')
    if (cmdAndArgs.length === 1) {
      return await message.channel.send(`Current volume is ${volume * 100}.`)
    }

    if (cmdAndArgs.length !== 2) {
      return await message.channel.send('!volume <-10|10|10%|+10%|0.1|>')
    }

    const change = cmdAndArgs[1]

    try {
      if (change.startsWith('-') || change.startsWith('+')) {
        if (change.endsWith('%')) {
          const magnitude = parseFloat(change.substring(1, change.length - 1))
          const effect = 100 + (change.startsWith('-') ? -magnitude : magnitude)
          volume = volume * (effect / 100)
        } else {
          const magnitude = parseFloat(change.substring(1))

          if (magnitude < 1) {
            const effect = 1 + (change.startsWith('-') ? -magnitude : magnitude)
            volume = volume * effect
          } else {
            volume = volume + (change.startsWith('-') ? -magnitude : magnitude)
          }
        }
      } else {
        change.replace('%', '')

        const newVol = parseFloat(change)

        if (newVol < 1) {
          volume = 100 * newVol
        } else {
          volume = newVol
        }
      }

      if (volume > 100) {
        volume = 100
      }

      if (volume < 0) {
        volume = 0
      }

      message.guild?.voice?.connection?.dispatcher?.setVolumeLogarithmic(volume / 100)
      return await message.channel.send(`Volume set to ${volume}.`)
    } catch (e) {
      console.error(e)
      return await message.channel.send('An error occurred while changing the volume.')
    }
  }

  async handleJoinURL(message: Message): Promise<Message | undefined> {
    if (message.guild == null) {
      return
    }

    return await message.channel.send(`https://discord.com/api/oauth2/authorize?client_id=${this.discordClientID}&permissions=103827520&scope=bot`)
  }

  registerExitHandler(): void {
    process.on('SIGINT', this.destroy.bind(this))
    process.on('SIGTERM', this.destroy.bind(this))
  }

  destroy(): void {
    this.client.voice?.connections.each((conn) => {
      conn.channel.leave()
    })

    this.client.destroy()
    process.exit()
  }
}

export { PADBot, Handler }
