import { Client, Message, VoiceConnection } from 'discord.js';
declare type Result = Message | undefined | boolean | null;
declare type PromiseResult = Promise<Result>;
declare type Executor = (message: Message, handler: Handler) => PromiseResult;
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
    preHooks: Executor[];
    postHooks: Executor[];
    state: any;
    constructor(discordToken: string, discordClientID: string, discordBotOwnerTag: string, ffmpegInput: string, registerExit?: boolean, commandFlag?: string);
    addUser(user: string, group: string): void;
    removeUser(user: string, group: string): void;
    loadState(): void;
    saveState(): void;
    getState(): any;
    setState(newState: {}): void;
    addCommand(command: string, handler: Handler): void;
    addPreHook(executor: Executor, position?: number): void;
    addPostHook(executor: Executor, position?: number): void;
    removePreHook(position?: number, executor?: Executor): void;
    removePostHook(position?: number, executor?: Executor): void;
    removeCommand(command: string): void;
    handleHelp(message: Message, handler: Handler): PromiseResult;
    handleCommand(message: Message): PromiseResult;
    startPCMStream(connection: VoiceConnection): any;
    handleAddUser(message: Message, handler: Handler): PromiseResult;
    handleRemoveUser(message: Message, handler: Handler): PromiseResult;
    handleListGroups(message: Message, handler: Handler): PromiseResult;
    handleJoin(message: Message, handler: Handler): PromiseResult;
    handleLeave(message: Message, handler: Handler): PromiseResult;
    handleVolume(message: Message, handler: Handler): PromiseResult;
    handleJoinURL(message: Message, handler: Handler): PromiseResult;
    registerExitHandler(): void;
    destroy(): void;
}
export { PADBot, Handler, Executor, Result, PromiseResult };
//# sourceMappingURL=lib.d.ts.map