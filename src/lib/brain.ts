import { MarkovTree } from './tree';
import { Context } from './context';
import { BrainFileHandler } from './brainFile';
import { Dictionary } from './dictionary';
import {
  DEFAULT_AUXWORDS,
  DEFAULT_BANWORDS,
  DEFAULT_SWAPWORDS,
  ERROR_WORD,
  END_WORD,
} from './words';

/**
 * Determine whether this position is a boundary, depending on the characters
 * in front of it.
 *
 * See `tokenizeWords` for details on algorithm used.
 *
 * @param text A string to examine.
 * @param position The position to look at.
 */
function boundary(text: string, position: number): boolean {
  if (position === 0) {
    return false;
  }
  if (position === text.length) {
    return true;
  }
  if (
    text[position] === "'" &&
    text[position - 1].match(/[a-z]/i) &&
    text[position + 1].match(/[a-z]/i)
  ) {
    return false;
  }
  if (
    position > 1 &&
    text[position - 1] === "'" &&
    text[position - 2].match(/[a-z]/i) &&
    text[position].match(/[a-z]/i)
  ) {
    return false;
  }
  if (text[position].match(/[a-z]/i) && !text[position - 1].match(/[a-z]/i)) {
    return true;
  }
  if (!text[position].match(/[a-z]/i) && text[position - 1].match(/[a-z]/i)) {
    return true;
  }
  if (text[position].match(/[0-9]/) !== text[position - 1].match(/[0-9]/)) {
    return true;
  }
  return false;
}

/**
 * Rules for tokenization:
 * Four character classes: alpha, digit, apostrophe, and other
 *
 * If the character class changed from the previous to current character,
 * then it is a boundary. The only special case is alpha -> apostrophe ->
 * alpha, which is not considered to be a boundary (it's considered to be
 * alpha).
 *
 * If the last word is alphanumeric then add a last word of ".", otherwise
 * replace the last word with "." unless it already ends with one of
 * "!.?".
 *
 * @param text
 */
export function tokenizeWords(text: string): string[] {
  text = text.toUpperCase();
  const words: string[] = [];
  if (!text) {
    return words;
  }
  let offset = 0;
  while (true) {
    if (boundary(text, offset)) {
      const word = text.slice(0, offset);
      words.push(word);
      text = text.slice(offset);
      if (text.length === 0) {
        break;
      }
      offset = 0;
    } else {
      offset += 1;
    }
  }

  if (words[words.length - 1][0].match(/[a-z0-9]/)) {
    words.push('.');
  } else {
    const lastWord = words[words.length - 1];
    if (!lastWord[lastWord.length - 1].match(/[!.?]/)) {
      words[words.length - 1] = '.';
    }
  }
  return words;
}

export class Brain {
  constructor(
    public forward: MarkovTree,
    public backward: MarkovTree,
    public dictionary: Dictionary,
    private order: number,
    private fileHandler: BrainFileHandler
  ) {}

  public static fromFile(filename: string): Brain {
    const fileHandler = new BrainFileHandler();
    const { forward, backward, dictionary, order } = fileHandler.deserialize(filename);
    return new Brain(forward, backward, dictionary, order, fileHandler);
  }

  public learn(words: string[]) {
    if (words.length > this.order) {
      for (let i = 0; i < words.length - this.order; i++) {
        const learnWords = words.slice(i, i + this.order);
        let context = new Context(this.forward, this.dictionary, this.order);
        for (const word of learnWords) {
          context.update(this.dictionary.addWord(word));
        }
        context = new Context(this.backward, this.dictionary, this.order);
        for (const word of learnWords.slice().reverse()) {
          context.update(this.dictionary.getSymbol(word) as number);
        }
      }
    }
  }

  public getReply(keywords: Dictionary): string {
    let output = this.generateReplyWords();
    let maxSurprise = -1.0;
    const basetime = Date.now();
    let count = 0;
    while (Date.now() - basetime < 300) {
      const reply = this.generateReplyWords(keywords);
      const surprise = this.evaluateReply(keywords, reply);
      if (reply && surprise > maxSurprise) {
        maxSurprise = surprise;
        output = reply;
      }
      count++;
    }
    return output.join('').toLowerCase();
  }

  public evaluateReply(keywords: Dictionary, words: string[]): number {
    const state = { num: 0, entropy: 0.0 };

    if (words.length > 0) {
      const evaluate = (tree: MarkovTree, replywords: string[]) => {
        const usedKeywords = new Set(keywords.words());
        const context = new Context(tree, this.dictionary, this.order);
        for (const word of replywords) {
          const symbol = this.dictionary.getSymbol(word) as number;
          context.update(symbol);
          if (usedKeywords.has(word)) {
            usedKeywords.delete(word);
            let prob = 0.0;
            let count = 0;
            state.num += 1;
            for (let i = 0; i < this.order; i++) {
              const node = context.trees[i];
              if (node) {
                const child = node.getChild(symbol, false);
                if (child) {
                  prob += child.count / node.usage;
                }
                count += 1;
              }
            }
            if (count > 0) {
              state.entropy -= Math.log(prob / count);
            }
          }
        }
      };

      evaluate(this.forward, words);
      evaluate(this.backward, words.slice().reverse());

      if (state.num >= 8) {
        state.entropy /= Math.sqrt(state.num - 1);
      }
      if (state.num >= 16) {
        state.entropy /= state.num;
      }
    }
    return state.entropy;
  }

  public generateReplyWords(keyword?: Dictionary): string[] {
    const keywords = keyword ?? new Dictionary();
    const replies: string[] = [];
    let context = new Context(this.forward, this.dictionary, this.order);
    let start = true;
    while (true) {
      let symbol: number;
      if (start) {
        symbol = context.seed(keywords);
        start = false;
      } else {
        symbol = context.babble(keywords, replies);
      }
      const word = this.dictionary.getWord(symbol);
      if ([ERROR_WORD, END_WORD].includes(word || END_WORD)) {
        break;
      }
      replies.push(word as string);
      context.update(symbol);
    }

    context = new Context(this.backward, this.dictionary, this.order);
    if (replies) {
      const reversed = replies
        .slice(0, Math.min(this.order, replies.length - 1))
        .reverse()
        .slice(0, this.order);
      for (const word of reversed) {
        context.update(this.dictionary.getSymbol(word) as number);
      }
    }
    while (true) {
      const symbol = context.babble(keywords, replies);
      const word = this.dictionary.getWord(symbol);
      if ([ERROR_WORD, END_WORD].includes(word || END_WORD)) {
        break;
      }
      replies.unshift(word as string);
      context.update(symbol);
    }
    return replies;
  }

  public makeKeywords(words: string[]): Dictionary {
    const uniques = Array.from(new Set(words));
    const keywords = new Dictionary();
    for (let word of uniques) {
      if (DEFAULT_SWAPWORDS[word]) {
        word = DEFAULT_SWAPWORDS[word];
      }
      const id = this.dictionary.getSymbol(word);
      if (
        id &&
        word[0].match(/[a-z]/i) &&
        !DEFAULT_BANWORDS.includes(word) &&
        !DEFAULT_AUXWORDS.includes(word) &&
        word !== ERROR_WORD
      ) {
        keywords.loadWord(id, word);
      }
    }
    if (!keywords.empty()) {
      for (let word of uniques) {
        if (DEFAULT_SWAPWORDS[word]) {
          word = DEFAULT_SWAPWORDS[word];
        }
        const id = this.dictionary.getSymbol(word);
        if (
          id &&
          word[0].match(/[a-z]/i) &&
          word !== ERROR_WORD &&
          DEFAULT_AUXWORDS.includes(word) &&
          !keywords.hasWord(word)
        ) {
          keywords.loadWord(id, word);
        }
      }
    }
    return keywords;
  }
}
