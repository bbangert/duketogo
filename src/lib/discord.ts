import { Client, Message, DMChannel } from 'discord.js';
import debug from 'debug';
import * as R from 'ramda';

import { Brain, tokenizeWords } from './brain';
import { Dictionary } from './dictionary';

const logError = debug('bot:error');
const logEvent = debug('bot:event');
const logWarning = debug('bot:warning');

export class Discord {
  private client: Client;
  private userRegex: RegExp | undefined;

  constructor(private token: string, private brain: Brain) {
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
    const content = this.parseContent(message);
    if (content === null) {
      return;
    }
    let keywords: Dictionary;
    let tokenWords: string[] = [];
    if (content.length > 0) {
      tokenWords = tokenizeWords(content);
      this.brain.learn(tokenWords);
      keywords = this.brain.makeKeywords(tokenWords);
    } else {
      keywords = new Dictionary();
    }
    let reply = this.brain.getReply(keywords, tokenWords);
    if (reply.length > 1500) {
      reply = reply.slice(0, 1447) + '...';
    }
    message.reply(reply);
    logEvent('Sent a reply');
  }

  /**
   * Start up the discord bot.
   *
   * Will destroy the client when the process exits.
   */
  start() {
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
    process.on('SIGINT', () => this.shutdown());
    this.client.login(this.token);
  }

  private shutdown() {
    console.log('Shutting down client');
    this.client.destroy();
    console.log('Shutting down! .... writing brainfile...');
    this.brain.toFile();
  }
}
