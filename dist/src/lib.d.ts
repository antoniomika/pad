import { Client, Message } from 'discord.js';
declare type Handler = (message: Message) => Promise<Message | undefined>;
declare class PADBot {
    discordToken: string;
    discordClientID: string;
    discordBotOwnerTag: string;
    ffmpegInput: string;
    registerExit: boolean;
    client: Client;
    handlers: Map<string, Handler>;
    constructor(discordToken: string, discordClientID: string, discordBotOwnerTag: string, ffmpegInput: string, registerExit?: boolean);
    addCommand(command: string, handler: Handler): void;
    removeCommand(command: string): void;
    handleHelp(message: Message): Promise<Message>;
    handleCommand(message: Message): Promise<Message | undefined>;
    handleJoin(message: Message): Promise<Message | undefined>;
    handleLeave(message: Message): Promise<Message | undefined>;
    handleVolume(message: Message): Promise<Message | undefined>;
    handleJoinURL(message: Message): Promise<Message | undefined>;
    registerExitHandler(): void;
    destroy(): void;
}
export { PADBot, Handler };
//# sourceMappingURL=lib.d.ts.map