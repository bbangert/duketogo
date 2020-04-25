import { Message } from 'discord.js';

export abstract class Command {
  abstract commandName: string;

  abstract runCommand(message: Message, text: string): void;
}
