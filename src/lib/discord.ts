import { Client, Message, DMChannel, Channel } from 'discord.js';
import debug from 'debug';
import * as R from 'ramda';
import { setInterval } from 'timers';

import Config from '../config';
import { Brain } from './megahal/brain';
import { Command } from './commands/base';

const logError = debug('bot:error');
const logEvent = debug('bot:event');
const logWarning = debug('bot:warning');

const config = Config.getProperties();

// 2 hour interval (2 * hour * minute * ms)
const TWO_HOURS = 2 * 60 * 60 * 1000;

const COMMAND_PREFIX = config.commandPrefix.replace(/['"]/g, '');

const ALIASES = {
  '💹': '📈 📉',
  '😱': 'aolsay',
};

export class Discord {
  private client: Client;
  private userRegex: RegExp | undefined;
  private commandPrefix = new RegExp(`^${COMMAND_PREFIX}`);
  private saveTimer: NodeJS.Timeout | undefined;

  constructor(private token: string, private brain: Brain, private commands: Command[]) {
    this.client = new Client();
  }

  /**
   * Returns trimmed and parsed content if the message was a DM or
   * prefixed with the bots id.
   *
   * @param message Discord message.
   */
  private parseContent(message: Message): string | null {
    if (!this.client.user) {
      return null;
    }
    if (message.channel instanceof DMChannel) {
      return message.content.trim();
    }
    const prefixed = this.userRegex ? message.content.match(this.userRegex) : null;
    if (!prefixed) {
      return null;
    }
    return R.trim(message.content.slice(prefixed[0].length));
  }

  private handleCommand(message: Message, rest: string) {
    const [commandName, ...remaining] = R.trim(rest).split(' ');
    const remainder = remaining.join(' ');
    for (const command of this.commands) {
      if (command.commandName === commandName) {
        command.runCommand(message, remainder);
      }
    }
  }

  /**
   * Handle a message that the bot has received. If it's directed to the bot
   * or prefixed to it, learn from it if its long enough and reply with the
   * brain response.
   *
   * @param message Discord message.
   */
  private handleMessage(message: Message) {
    logEvent(`Got message: ${message.content}`);
    if (!this.client.user || message.author.id === this.client.user.id) {
      return;
    }

    // Is this a command?
    // First check for command aliases
    for (const [alias, value] of Object.entries(ALIASES)) {
      if (message.content.startsWith(alias)) {
        message.content = message.content.replace(alias, value);
        return this.handleCommand(message, message.content);
      }
    }

    // Now for command prefix.
    const commandMatch = message.content.match(this.commandPrefix);
    if (message.channel instanceof Channel && commandMatch) {
      const rest = message.content.slice(commandMatch[0].length);
      return this.handleCommand(message, rest);
    }

    // If this is intended for the Duke response, continue.
    const content = this.parseContent(message);
    if (content === null) {
      return;
    }
    message.reply(this.brain.communicate(content, true));
    logEvent('Sent a reply');
  }

  private async saveBrain() {
    if (this.client.user) {
      await this.client.user.setPresence({
        activity: { name: '🧠👉🚽' },
        status: 'dnd',
      });
    }
    this.brain.toFile();
    if (this.client.user) {
      await this.client.user.setPresence({ status: 'online', activity: { name: '' } });
    }
  }

  /**
   * Start up the discord bot.
   *
   * Will destroy the client when the process exits.
   */
  async start() {
    this.client.on('message', (message: Message) => this.handleMessage(message));
    this.client.on('error', logError);
    this.client.on('warn', logWarning);
    this.client.on('ready', () => {
      logEvent('Connected.');
      logEvent(`Logged in as ${this.client.user?.tag}`);
      if (this.client.user) {
        this.userRegex = new RegExp(`^<@[!&]?${this.client.user.id}>`);
      }
    });
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());
    this.saveTimer = setInterval(() => this.saveBrain(), TWO_HOURS);
    return this.client.login(this.token);
  }

  private shutdown() {
    console.log('Shutting down client');
    this.client.destroy();
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
    }
    console.log('Shutting down! .... writing brainfile...');
    this.brain.toFile();
    process.exit(0);
  }
}
