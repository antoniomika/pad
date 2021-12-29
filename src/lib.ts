import { Client, Intents, Message, Snowflake } from 'discord.js'
import { joinVoiceChannel, DiscordGatewayAdapterCreator, VoiceConnection, getVoiceConnection, AudioResource, getVoiceConnections, createAudioResource, createAudioPlayer, NoSubscriberBehavior, StreamType } from '@discordjs/voice'
import { writeFileSync, readFileSync } from 'fs'
import prism from 'prism-media'

type Result = Message | undefined | boolean | null
type PromiseResult = Promise<Result>

type Executor = (message: Message, handler: Handler) => PromiseResult

interface Handler {
  executor: Executor
  help: string
  example: string
  permittedGroups: string[]
}

class PADBot {
  discordToken: string
  discordClientID: string
  discordBotOwnerTag: string

  ffmpegInput: string
  registerExit: boolean
  commandFlag: string
  autoStartPCM: boolean

  client: Client

  handlers: Map<string, Handler>
  audioResources: Map<Snowflake, AudioResource>
  preHooks: Executor[]
  postHooks: Executor[]

  state: any

  constructor(discordToken: string, discordClientID: string, discordBotOwnerTag: string, ffmpegInput: string, registerExit: boolean = true, commandFlag: string = '', autoStartPCM: boolean = true) {
    this.discordToken = discordToken
    this.discordClientID = discordClientID
    this.discordBotOwnerTag = discordBotOwnerTag

    this.ffmpegInput = ffmpegInput
    this.registerExit = registerExit
    this.commandFlag = commandFlag
    this.autoStartPCM = autoStartPCM

    this.client = new Client({
      intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_VOICE_STATES
      ]
    })

    this.client.login(this.discordToken).catch(console.error)

    this.client.on('message', (message) => {
      this.handleCommand(message).catch(console.error)
    })

    this.handlers = new Map([
      [`${this.commandFlag}join`, {
        executor: this.handleJoin.bind(this),
        help: 'Joins the user\'s channel',
        example: `${this.commandFlag}join`,
        permittedGroups: ['admin']
      }],
      [`${this.commandFlag}leave`, {
        executor: this.handleLeave.bind(this),
        help: 'Leaves the voice channel',
        example: `${this.commandFlag}leave`,
        permittedGroups: ['any']
      }],
      [`${this.commandFlag}volume`, {
        executor: this.handleVolume.bind(this),
        help: 'Changes the volume of the bot',
        example: `${this.commandFlag}volume <-10|10|10%|+10%|0.1|>`,
        permittedGroups: ['any']
      }],
      [`${this.commandFlag}joinurl`, {
        executor: this.handleJoinURL.bind(this),
        help: 'Returns the discord bot join url',
        example: `${this.commandFlag}joinurl`,
        permittedGroups: ['admin']
      }],
      [`${this.commandFlag}groups`, {
        executor: this.handleGroups.bind(this),
        help: 'Prints the groups in the state',
        example: `${this.commandFlag}listgroups`,
        permittedGroups: ['admin']
      }],
      [`${this.commandFlag}adduser`, {
        executor: this.handleAddUser.bind(this),
        help: 'Adds a user to the group',
        example: `${this.commandFlag}adduser <user> <group>`,
        permittedGroups: ['admin']
      }],
      [`${this.commandFlag}removeuser`, {
        executor: this.handleRemoveUser.bind(this),
        help: 'Removes a user from the group',
        example: `${this.commandFlag}removeuser <user> <group>`,
        permittedGroups: ['admin']
      }],
      [`${this.commandFlag}help`, {
        executor: this.handleHelp.bind(this),
        help: 'Prints help information',
        example: `${this.commandFlag}help`,
        permittedGroups: ['any']
      }]
    ])

    this.preHooks = []
    this.postHooks = []

    this.audioResources = new Map()

    if (this.registerExit) {
      this.registerExitHandler()
    }

    this.state = {}
    this.loadState()

    if (Object.keys(this.state).length === 0) {
      this.state = {
        guilds: {}
      }
    }
  }

  addUser(guildId: Snowflake | undefined, user: string, group: string): void {
    if (guildId === undefined) {
      return
    }

    if (this.state.guilds[guildId].groups[group] === undefined) {
      this.state.guilds[guildId].groups[group] = []
    }

    this.state.guilds[guildId].groups[group].push(user)
  }

  removeUser(guildId: Snowflake | undefined, user: string, group: string): void {
    if (guildId === undefined) {
      return
    }

    if (this.state.guilds[guildId].groups[group] !== undefined) {
      const loc = this.state.guilds[guildId].groups[group].indexOf(user)
      if (loc > -1) {
        this.state.guilds[guildId].groups[group].splice(loc, 1)
      }
    }
  }

  loadState(): void {
    try {
      this.state = JSON.parse(readFileSync('.pad.state').toString())
    } catch (err) {
      console.error(err)
    }
  }

  saveState(): void {
    try {
      writeFileSync('.pad.state', JSON.stringify(this.state))
    } catch (err) {
      console.error(err)
    }
  }

  addCommand(command: string, handler: Handler): void {
    this.handlers.set(`${this.commandFlag}${command}`, handler)
  }

  addPreHook(executor: Executor, position?: number): void {
    if (position !== undefined) {
      this.preHooks.splice(position, 0, executor)
    }
    this.preHooks.push(executor)
  }

  addPostHook(executor: Executor, position?: number): void {
    if (position !== undefined) {
      this.postHooks.splice(position, 0, executor)
    }
    this.postHooks.push(executor)
  }

  removePreHook(position: number = 0, executor?: Executor): void {
    let pos = position
    if (executor !== undefined) {
      pos = this.preHooks.indexOf(executor)
    }

    this.preHooks.splice(pos, 1)
  }

  removePostHook(position: number = 0, executor?: Executor): void {
    let pos = position
    if (executor !== undefined) {
      pos = this.postHooks.indexOf(executor)
    }

    this.postHooks.splice(pos, 1)
  }

  removeCommand(command: string): void {
    this.handlers.delete(`${this.commandFlag}${command}`)
  }

  async handleHelp(message: Message, handler: Handler): PromiseResult {
    const fields = [
      { name: 'Command', value: Array.from(this.handlers.keys()).join('\n'), inline: true },
      { name: 'Help', value: Array.from(this.handlers.values()).map((h) => h.help).join('\n'), inline: true },
      { name: 'Example', value: Array.from(this.handlers.values()).map((h) => h.example).join('\n'), inline: true }
    ]

    const cmdAndArgs = message.content.split(' ')
    if (cmdAndArgs.length > 1 && cmdAndArgs[1].includes('group')) {
      fields[2] = { name: 'Permitted Groups', value: Array.from(this.handlers.values()).map((h) => h.permittedGroups.join(', ')).join('\n'), inline: true }
    }

    return await message.channel.send({
      embeds: [{
        color: 3447003,
        title: 'Available commands:',
        fields: fields
      }]
    })
  }

  async handleCommand(message: Message): PromiseResult {
    const commandRoot = message.content.split(' ')[0]
    let handlerResult: Result

    if (message.guild !== null && this.state.guilds[message.guild.id] === undefined) {
      this.state.guilds[message.guild.id] = {
        groups: {
          admin: [this.discordBotOwnerTag]
        }
      }
    }

    const handler = this.handlers.get(commandRoot)
    if (handler !== undefined) {
      for (const executor of this.preHooks) {
        const res = await executor(message, handler)
        if (res === false) {
          return res
        }
      }

      if (handler.permittedGroups.includes('any')) {
        handlerResult = await handler.executor(message, handler)
      } else {
        if (message.guild !== null) {
          const groups = this.state.guilds[message.guild.id].groups

          handlerResult = await (async () => {
            for (const group in groups) {
              for (const member of groups[group]) {
                if (member === message.member?.user?.tag && handler.permittedGroups.includes(group)) {
                  return await handler.executor(message, handler)
                }
              }
            }
          })()
        }
      }

      for (const executor of this.postHooks) {
        await executor(message, handler)
      }

      return handlerResult
    }
  }

  startPCMStream(message: Message, connection: VoiceConnection, extra: object = {}): AudioResource {
    const ffmpegRecord = new prism.FFmpeg({
      args: this.ffmpegInput.split(' ').concat(['-analyzeduration', '0', '-loglevel', '0', '-f', 's16le', '-ar', '48000', '-ac', '2'])
    })

    const player = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Pause
      }
    })

    const resource = createAudioResource(ffmpegRecord, {
      inputType: StreamType.Raw,
      inlineVolume: true,
      metadata: {
        ...extra,
        guild: message.guild?.id
      }
    })

    player.play(resource)

    this.audioResources.set(message.guild?.id ?? '', resource)

    connection.subscribe(player)

    return resource
  }

  async handleAddUser(message: Message, handler: Handler): PromiseResult {
    const cmdAndArgs = message.content.split(' ')
    if (cmdAndArgs.length === 3) {
      const user = cmdAndArgs[1]
      const group = cmdAndArgs[2]

      this.addUser(message.guild?.id, user, group)

      return await message.channel.send(`Added ${user} to ${group}`)
    }

    return await message.channel.send(handler.example)
  }

  async handleRemoveUser(message: Message, handler: Handler): PromiseResult {
    const cmdAndArgs = message.content.split(' ')
    if (cmdAndArgs.length === 3) {
      const user = cmdAndArgs[1]
      const group = cmdAndArgs[2]

      this.removeUser(message.guild?.id, user, group)

      return await message.channel.send(`Removed ${user} from ${group}`)
    }

    return await message.channel.send(handler.example)
  }

  async handleGroups(message: Message, handler: Handler): PromiseResult {
    if (message.guild === null) {
      return
    }

    const groups = this.state.guilds[message.guild?.id].groups

    return await message.channel.send({
      embeds: [{
        color: 3447003,
        title: 'Groups:',
        fields: [
          { name: 'Group', value: Object.keys(groups).join('\n'), inline: true },
          // @ts-expect-error;
          { name: 'Members', value: Object.values(groups).map(g => g.join(', ')).join('\n'), inline: true }
        ]
      }]
    })
  }

  async handleJoin(message: Message, handler: Handler): PromiseResult {
    if (message.guild === null) {
      return
    }

    if (message.member === null || (message.member.voice.channel === null)) {
      return await message.channel.send('You need to join a voice channel first')
    }

    const connection = joinVoiceChannel({
      channelId: message.member.voice.channel.id,
      guildId: message.member.voice.channel.guild.id,
      adapterCreator: message.guild.voiceAdapterCreator as DiscordGatewayAdapterCreator,
      selfDeaf: true
    })

    if (this.autoStartPCM) {
      this.startPCMStream(message, connection)
    }

    return await message.channel.send('Joined channel')
  }

  async handleLeave(message: Message, handler: Handler): PromiseResult {
    if (message.guild === null) {
      return
    }

    const connection = getVoiceConnection(message.guild.id)

    if (message.member?.voice?.channel === null || connection === undefined) {
      return await message.channel.send('You need to join a voice channel first')
    }

    connection.destroy()

    return await message.channel.send('Left channel')
  }

  async handleVolume(message: Message, handler: Handler): PromiseResult {
    if (message.guild === null) {
      return
    }

    const connection = getVoiceConnection(message.guild.id)

    if (message.member?.voice?.channel === null || connection === undefined) {
      return await message.channel.send('You need to join a voice channel first')
    }

    const currentPlayback = this.audioResources.get(message.guild.id)

    if (currentPlayback === undefined) {
      return await message.channel.send('Nothing is currently playing')
    }

    let volume = currentPlayback.volume?.volume ?? 1

    const cmdAndArgs = message.content.split(' ')
    if (cmdAndArgs.length === 1) {
      return await message.channel.send(`Current volume is ${volume * 100}.`)
    }

    if (cmdAndArgs.length !== 2) {
      return await message.channel.send(handler.example)
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

      currentPlayback.volume?.setVolumeLogarithmic(volume / 100)
      return await message.channel.send(`Volume set to ${volume}.`)
    } catch (e) {
      console.error(e)
      return await message.channel.send('An error occurred while changing the volume')
    }
  }

  async handleJoinURL(message: Message, handler: Handler): PromiseResult {
    if (message.guild === null) {
      return
    }

    return await message.channel.send(`https://discord.com/api/oauth2/authorize?client_id=${this.discordClientID}&permissions=103827520&scope=bot`)
  }

  registerExitHandler(): void {
    process.on('SIGINT', this.destroy.bind(this))
    process.on('SIGTERM', this.destroy.bind(this))
  }

  destroy(): void {
    getVoiceConnections().forEach((conn) => {
      conn.destroy()
    })

    this.audioResources.forEach((resource) => {
      resource.audioPlayer?.stop()
    })

    this.client.destroy()
    this.saveState()
    process.exit()
  }
}

export { PADBot, Handler, Executor, Result, PromiseResult }
