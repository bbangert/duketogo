import * as R from 'ramda';
import * as IEX from 'iexcloud_api_wrapper';

import { Command } from './base';
import { Message, MessageEmbed } from 'discord.js';

const THUMBNAIL = 'https://iexcloud.io/images/share-card.png';

export class Stocks implements Command {
  commandName = '📈';

  private noResult(message: Message, symbol: string) {
    message.channel.send({ content: 'No results found for: ' + symbol });
  }

  private async news(message: Message, rest: string[]) {
    const symbol = rest[0];
    const results = await IEX.news(symbol, 1);
    if (results.length === 0) {
      return this.noResult(message, symbol);
    }
    const news = results[0];
    const embed = new MessageEmbed()
      .setTitle(news.headline)
      .setColor('ef0073')
      .setDescription(news.summary)
      .setThumbnail(news.image)
      .setTimestamp(news.datetime)
      .setURL(news.url)
      .setFooter(news.source);
    message.channel.send(embed);
  }

  private async crypto(message: Message, rest: string[]) {
    const symbol = rest[0];
    const result = await IEX.cryptoQuote(symbol);
    if (!result) {
      return this.noResult(message, symbol);
    }
    const embed = new MessageEmbed()
      .setTitle(result.symbol)
      .setColor('ef0073')
      .setThumbnail(THUMBNAIL)
      .addFields({ name: 'Latest', value: result.latestPrice });
    message.channel.send(embed);
  }

  private async quote(message: Message, rest: string[]) {
    const symbol = rest[0];
    const result = await IEX.quote(symbol);
    if (!result) {
      return this.noResult(message, symbol);
    }
    const embed = new MessageEmbed()
      .setTitle(`${result.companyName} (${result.symbol})`)
      .setTimestamp(result.latestUpdate)
      .setFooter(result.latestSource)
      .setColor('ef0073')
      .setThumbnail(THUMBNAIL)
      .addFields(
        { name: 'Latest', value: result.latestPrice, inline: true },
        { name: 'Change', value: result.change, inline: true },
        { name: 'Volume', value: result.avgTotalVolume, inline: true },
        { name: 'Change %', value: result.changePercent, inline: true },
        { name: '52 Week Low', value: result.week52Low, inline: true },
        { name: '52 Week High', value: result.week52High, inline: true }
      );
    message.channel.send(embed);
  }

  public async runCommand(message: Message, remainder: string) {
    const [subcommand, ...rest] = remainder.split(' ').map(R.trim);
    if (subcommand === '📰') {
      return this.news(message, rest);
    } else if (subcommand === '🔐') {
      return this.crypto(message, rest);
    } else if (subcommand === '📉') {
      return this.quote(message, rest);
    }
  }
}
