import fs from 'fs';
import path from 'path';

import * as R from 'ramda';

import { Command } from './base';
import { Message } from 'discord.js';
import { randomIntFromInterval } from '../utils';

export class AOLSay implements Command {
  commandName = 'aolsay';
  private sayings: string[];

  constructor() {
    this.sayings = fs
      .readFileSync(path.join(__dirname, 'aolsay.txt'))
      .toString()
      .split('\n')
      .map(R.trim);
  }

  public async runCommand(message: Message, _: string) {
    const saying = this.sayings[randomIntFromInterval(0, this.sayings.length - 1)];
    message.channel.send({ content: saying });
  }
}
