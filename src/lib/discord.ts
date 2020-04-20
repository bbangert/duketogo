import { Client, Message, DMChannel } from 'discord.js';
import debug from 'debug';

import Config from '../config';
import { Brain, tokenizeWords } from './brain';
import { Dictionary } from './dictionary';

const config = Config.getProperties();
const logError = debug('bot:error');
const logEvent = debug('bot:event');

export class Discord {
  private client: Client;

  constructor(private brain: Brain) {
    this.client = new Client();
  }

  private handleMessage(message: Message) {
    logEvent(`Got message: ${message.content}`);
    if (!this.client.user) {
      return;
    }

    if (message.author.id === this.client.user.id) {
      return;
    }
    const prefixMention = new RegExp(`^<@[!&]?${this.client.user.id}>`);
    const prefixLen = `<@!${this.client.user.id}>`.length;
    const directMessage = message.channel instanceof DMChannel;
    const prefixed = message.content.match(prefixMention);
    const content = prefixed ? message.content.slice(prefixLen) : message.content;
    if (directMessage || prefixed) {
      const tokenWords = content.length > 0 ? tokenizeWords(content) : null;
      const keywords = tokenWords ? this.brain.makeKeywords(tokenWords) : new Dictionary();
      if (tokenWords) {
        this.brain.learn(tokenWords);
      }
      let reply = this.brain.getReply(keywords);
      if (reply.length > 1500) {
        reply = reply.slice(0, 1447) + '...';
      }
      message.reply(reply);
      logEvent('Sent a reply');
    }
  }

  start() {
    this.client.on('message', (message: Message) => this.handleMessage(message));
    this.client.on('error', logError);
    this.client.on('ready', () => {
      logEvent('Connected.');
      logEvent(`Logged in as ${this.client.user?.tag}`);
    });
    process.on('exit', () => {
      this.client.destroy();
    });
    this.client.login(config.discord.token);
  }
}
