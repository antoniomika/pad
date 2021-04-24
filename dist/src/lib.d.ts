import { Client, Message, VoiceConnection } from 'discord.js';
declare type Executor = (message: Message, handler: Handler) => Promise<Message | undefined>;
interface Handler {
    executor: Executor;
    help: string;
    example: string;
    permittedGroups: string[];
}
declare class PADBot {
    discordToken: string;
    discordClientID: string;
    discordBotOwnerTag: string;
    ffmpegInput: string;
    registerExit: boolean;
    commandFlag: string;
    client: Client;
    handlers: Map<string, Handler>;
    state: any;
    constructor(discordToken: string, discordClientID: string, discordBotOwnerTag: string, ffmpegInput: string, registerExit?: boolean, commandFlag?: string);
    addUser(user: string, group: string): void;
    removeUser(user: string, group: string): void;
    loadState(): void;
    saveState(): void;
    getState(): any;
    setState(newState: {}): void;
    addCommand(command: string, handler: Handler): void;
    removeCommand(command: string): void;
    handleHelp(message: Message, handler: Handler): Promise<Message>;
    handleCommand(message: Message): Promise<Message | undefined>;
    startPCMStream(connection: VoiceConnection): any;
    handleAddUser(message: Message, handler: Handler): Promise<Message>;
    handleRemoveUser(message: Message, handler: Handler): Promise<Message>;
    handleListGroups(message: Message, handler: Handler): Promise<Message>;
    handleJoin(message: Message, handler: Handler): Promise<Message | undefined>;
    handleLeave(message: Message, handler: Handler): Promise<Message | undefined>;
    handleVolume(message: Message, handler: Handler): Promise<Message | undefined>;
    handleJoinURL(message: Message, handler: Handler): Promise<Message | undefined>;
    registerExitHandler(): void;
    destroy(): void;
}
export { PADBot, Handler, Executor };
//# sourceMappingURL=lib.d.ts.map