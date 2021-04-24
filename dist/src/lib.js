"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PADBot = void 0;
const discord_js_1 = require("discord.js");
const fs_1 = require("fs");
const prism_media_1 = __importDefault(require("prism-media"));
class PADBot {
    constructor(discordToken, discordClientID, discordBotOwnerTag, ffmpegInput, registerExit = true, commandFlag = '!') {
        this.discordToken = discordToken;
        this.discordClientID = discordClientID;
        this.discordBotOwnerTag = discordBotOwnerTag;
        this.ffmpegInput = ffmpegInput;
        this.registerExit = registerExit;
        this.commandFlag = commandFlag;
        this.client = new discord_js_1.Client({
            ws: {
                intents: [
                    discord_js_1.Intents.FLAGS.GUILDS,
                    discord_js_1.Intents.FLAGS.GUILD_MESSAGES,
                    discord_js_1.Intents.FLAGS.GUILD_VOICE_STATES
                ]
            }
        });
        this.client.login(this.discordToken).catch(console.error);
        this.client.on('message', (message) => {
            this.handleCommand(message).catch(console.error);
        });
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
            [`${this.commandFlag}listgroups`, {
                    executor: this.handleListGroups.bind(this),
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
        ]);
        this.preHooks = [];
        this.postHooks = [];
        if (this.registerExit) {
            this.registerExitHandler();
        }
        this.state = {};
        this.loadState();
        if (Object.keys(this.state).length === 0) {
            this.state = {
                groups: {
                    admin: []
                }
            };
        }
        if (this.state.groups.admin.length === 0) {
            this.state.groups.admin.push(this.discordBotOwnerTag);
        }
    }
    addUser(user, group) {
        if (!(group in this.state.groups)) {
            this.state.groups[group] = [];
        }
        this.state.groups[group].push(user);
    }
    removeUser(user, group) {
        if (group in this.state.groups) {
            const loc = this.state.groups[group].indexOf(user);
            if (loc > -1) {
                this.state.groups[group].splice(loc, 1);
            }
        }
    }
    loadState() {
        try {
            this.state = JSON.parse(fs_1.readFileSync('.pad.state').toString());
        }
        catch (err) {
            console.error(err);
        }
    }
    saveState() {
        try {
            fs_1.writeFileSync('.pad.state', JSON.stringify(this.state));
        }
        catch (err) {
            console.error(err);
        }
    }
    getState() {
        return this.state;
    }
    setState(newState) {
        this.state = newState;
    }
    addCommand(command, handler) {
        this.handlers.set(`${this.commandFlag}${command}`, handler);
    }
    addPreHook(executor, position) {
        if (position !== undefined) {
            this.preHooks.splice(position, 0, executor);
        }
        this.preHooks.push(executor);
    }
    addPostHook(executor, position) {
        if (position !== undefined) {
            this.postHooks.splice(position, 0, executor);
        }
        this.postHooks.push(executor);
    }
    removePreHook(position = 0, executor) {
        let pos = position;
        if (executor !== undefined) {
            pos = this.preHooks.indexOf(executor);
        }
        this.preHooks.splice(pos, 1);
    }
    removePostHook(position = 0, executor) {
        let pos = position;
        if (executor !== undefined) {
            pos = this.postHooks.indexOf(executor);
        }
        this.postHooks.splice(pos, 1);
    }
    removeCommand(command) {
        this.handlers.delete(`${this.commandFlag}${command}`);
    }
    async handleHelp(message, handler) {
        const fields = [
            { name: 'Command', value: Array.from(this.handlers.keys()).join('\n'), inline: true },
            { name: 'Help', value: Array.from(this.handlers.values()).map((h) => h.help).join('\n'), inline: true },
            { name: 'Example', value: Array.from(this.handlers.values()).map((h) => h.example).join('\n'), inline: true }
        ];
        const cmdAndArgs = message.content.split(' ');
        if (cmdAndArgs.length > 1 && cmdAndArgs[1].includes('group')) {
            fields[2] = { name: 'Permitted Groups', value: Array.from(this.handlers.values()).map((h) => h.permittedGroups.join(', ')).join('\n'), inline: true };
        }
        return message.channel.send({
            embed: {
                color: 3447003,
                title: 'Available commands:',
                fields: fields
            }
        });
    }
    async handleCommand(message) {
        const commandRoot = message.content.split(' ')[0];
        let handlerResult;
        const handler = this.handlers.get(commandRoot);
        if (handler !== undefined) {
            for (const executor of this.preHooks) {
                const res = await executor(message, handler);
                if (res === false) {
                    return res;
                }
            }
            if (handler.permittedGroups.includes('any')) {
                handlerResult = await handler.executor(message, handler);
            }
            if (message.member !== null) {
                const groups = this.getState().groups;
                for (const group in groups) {
                    for (const member of groups[group]) {
                        if (member === message.member.user.tag && handler.permittedGroups.includes(group)) {
                            handlerResult = await handler.executor(message, handler);
                        }
                    }
                }
            }
            for (const executor of this.postHooks) {
                await executor(message, handler);
            }
            return handlerResult;
        }
    }
    startPCMStream(connection) {
        const ffmpegRecord = new prism_media_1.default.FFmpeg({
            args: this.ffmpegInput.split(' ').concat(['-analyzeduration', '0', '-loglevel', '0', '-f', 's16le', '-ar', '48000', '-ac', '2'])
        });
        // @ts-expect-error;
        return connection.player.playPCMStream(ffmpegRecord, { type: 'converted' }, { ffmpeg: ffmpegRecord });
    }
    async handleAddUser(message, handler) {
        const cmdAndArgs = message.content.split(' ');
        if (cmdAndArgs.length === 3) {
            const user = cmdAndArgs[1];
            const group = cmdAndArgs[2];
            this.addUser(user, group);
            return await message.channel.send(`Added ${user} to ${group}`);
        }
        return await message.channel.send(handler.example);
    }
    async handleRemoveUser(message, handler) {
        const cmdAndArgs = message.content.split(' ');
        if (cmdAndArgs.length === 3) {
            const user = cmdAndArgs[1];
            const group = cmdAndArgs[2];
            this.removeUser(user, group);
            return await message.channel.send(`Removed ${user} from ${group}`);
        }
        return await message.channel.send(handler.example);
    }
    async handleListGroups(message, handler) {
        const groups = this.getState().groups;
        return await message.channel.send({
            embed: {
                color: 3447003,
                title: 'Groups:',
                fields: [
                    { name: 'Group', value: Object.keys(groups).join('\n'), inline: true },
                    // @ts-expect-error;
                    { name: 'Members', value: Object.values(groups).map(g => g.join(', ')).join('\n'), inline: true }
                ]
            }
        });
    }
    async handleJoin(message, handler) {
        if (message.guild == null) {
            return;
        }
        if (message.member == null || (message.member.voice.channel == null)) {
            return await message.channel.send('You need to join a voice channel first!');
        }
        const connection = await message.member.voice.channel.join();
        await connection.voice?.setSelfDeaf(true);
        this.startPCMStream(connection);
        return await message.channel.send('Joined channel.');
    }
    async handleLeave(message, handler) {
        if (message.guild == null) {
            return;
        }
        message.guild?.voice?.channel?.leave();
        return await message.channel.send('Left channel.');
    }
    async handleVolume(message, handler) {
        if (message.guild == null) {
            return;
        }
        if (message.member == null || (message.member.voice.channel == null) || message.guild?.voice?.connection == null) {
            return await message.channel.send('You need to join a voice channel first!');
        }
        let volume = message.guild.voice.connection.dispatcher.volumeLogarithmic;
        const cmdAndArgs = message.content.split(' ');
        if (cmdAndArgs.length === 1) {
            return await message.channel.send(`Current volume is ${volume * 100}.`);
        }
        if (cmdAndArgs.length !== 2) {
            return await message.channel.send(handler.example);
        }
        const change = cmdAndArgs[1];
        try {
            if (change.startsWith('-') || change.startsWith('+')) {
                if (change.endsWith('%')) {
                    const magnitude = parseFloat(change.substring(1, change.length - 1));
                    const effect = 100 + (change.startsWith('-') ? -magnitude : magnitude);
                    volume = volume * (effect / 100);
                }
                else {
                    const magnitude = parseFloat(change.substring(1));
                    if (magnitude < 1) {
                        const effect = 1 + (change.startsWith('-') ? -magnitude : magnitude);
                        volume = volume * effect;
                    }
                    else {
                        volume = volume + (change.startsWith('-') ? -magnitude : magnitude);
                    }
                }
            }
            else {
                change.replace('%', '');
                const newVol = parseFloat(change);
                if (newVol < 1) {
                    volume = 100 * newVol;
                }
                else {
                    volume = newVol;
                }
            }
            if (volume > 100) {
                volume = 100;
            }
            if (volume < 0) {
                volume = 0;
            }
            message.guild?.voice?.connection?.dispatcher?.setVolumeLogarithmic(volume / 100);
            return await message.channel.send(`Volume set to ${volume}.`);
        }
        catch (e) {
            console.error(e);
            return await message.channel.send('An error occurred while changing the volume.');
        }
    }
    async handleJoinURL(message, handler) {
        if (message.guild == null) {
            return;
        }
        return await message.channel.send(`https://discord.com/api/oauth2/authorize?client_id=${this.discordClientID}&permissions=103827520&scope=bot`);
    }
    registerExitHandler() {
        process.on('SIGINT', this.destroy.bind(this));
        process.on('SIGTERM', this.destroy.bind(this));
    }
    destroy() {
        this.client.voice?.connections.each((conn) => {
            conn.channel.leave();
        });
        this.client.destroy();
        this.saveState();
        process.exit();
    }
}
exports.PADBot = PADBot;
