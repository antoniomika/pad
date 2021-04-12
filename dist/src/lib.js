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
    constructor(discordToken, discordClientID, discordBotOwnerTag, ffmpegInput, registerExit = true) {
        this.discordToken = discordToken;
        this.discordClientID = discordClientID;
        this.discordBotOwnerTag = discordBotOwnerTag;
        this.ffmpegInput = ffmpegInput;
        this.registerExit = registerExit;
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
            ['!join', { executor: this.handleJoin.bind(this), help: 'Joins the channel of the calling user', permittedGroups: ['admin'] }],
            ['!leave', { executor: this.handleLeave.bind(this), help: 'Leaves the voice channel', permittedGroups: ['any'] }],
            ['!volume', { executor: this.handleVolume.bind(this), help: '!volume <-10|10|10%|+10%|0.1|> - Changes the volume of the bot', permittedGroups: ['any'] }],
            ['!joinurl', { executor: this.handleJoinURL.bind(this), help: 'Returns the discord bot join url', permittedGroups: ['admin'] }],
            ['!listgroups', { executor: this.handleListGroups.bind(this), help: 'Prints the groups in the state', permittedGroups: ['admin'] }],
            ['!adduser', { executor: this.handleAddUser.bind(this), help: 'Adds a user to the group', permittedGroups: ['admin'] }],
            ['!removeuser', { executor: this.handleRemoveUser.bind(this), help: 'Removes a user from the group', permittedGroups: ['admin'] }],
            ['!help', { executor: this.handleHelp.bind(this), help: 'Prints help information', permittedGroups: ['any'] }]
        ]);
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
        handler.executor.bind(this);
        this.handlers.set(command, handler);
    }
    removeCommand(command) {
        this.handlers.delete(command);
    }
    async handleListGroups(message) {
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
    async handleAddUser(message) {
        const cmdAndArgs = message.content.split(' ');
        if (cmdAndArgs.length === 3) {
            const user = cmdAndArgs[1];
            const group = cmdAndArgs[2];
            this.addUser(user, group);
            return await message.channel.send(`Added ${user} to ${group}`);
        }
        return await message.channel.send('!adduser <user> <group>');
    }
    async handleRemoveUser(message) {
        const cmdAndArgs = message.content.split(' ');
        if (cmdAndArgs.length === 3) {
            const user = cmdAndArgs[1];
            const group = cmdAndArgs[2];
            this.removeUser(user, group);
            return await message.channel.send(`Removed ${user} from ${group}`);
        }
        return await message.channel.send('!removeuser <user> <group>');
    }
    async handleHelp(message) {
        return await message.channel.send({
            embed: {
                color: 3447003,
                title: 'Available commands:',
                fields: [
                    { name: 'Command', value: Array.from(this.handlers.keys()).join('\n'), inline: true },
                    { name: 'Help', value: Array.from(this.handlers.values()).map((h) => h.help).join('\n'), inline: true },
                    { name: 'Permitted Groups', value: Array.from(this.handlers.values()).map((h) => h.permittedGroups.join(', ')).join('\n'), inline: true }
                ]
            }
        });
    }
    async handleCommand(message) {
        const commandRoot = message.content.split(' ')[0];
        const handler = this.handlers.get(commandRoot);
        if (handler !== undefined) {
            if (handler.permittedGroups.includes('any')) {
                return await handler.executor(message);
            }
            if (message.member !== null) {
                const groups = this.getState().groups;
                for (const group in groups) {
                    for (const member of groups[group]) {
                        if (member === message.member.user.tag && handler.permittedGroups.includes(group)) {
                            return await handler.executor(message);
                        }
                    }
                }
            }
        }
    }
    startPCMStream(connection) {
        const ffmpegRecord = new prism_media_1.default.FFmpeg({
            args: this.ffmpegInput.split(' ').concat(['-analyzeduration', '0', '-loglevel', '0', '-f', 's16le', '-ar', '48000', '-ac', '2'])
        });
        // @ts-expect-error;
        const dispatcher = connection.player.playPCMStream(ffmpegRecord, { type: 'converted' }, { ffmpeg: ffmpegRecord });
        return dispatcher;
    }
    async handleJoin(message) {
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
    async handleLeave(message) {
        if (message.guild == null) {
            return;
        }
        message.guild?.voice?.channel?.leave();
        return await message.channel.send('Left channel.');
    }
    async handleVolume(message) {
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
            return await message.channel.send('!volume <-10|10|10%|+10%|0.1|>');
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
    async handleJoinURL(message) {
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
