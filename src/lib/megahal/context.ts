import { Dictionary } from './dictionary';
import { randomIntFromInterval } from '../utils';
import { MarkovTree } from './tree';
import { DEFAULT_AUXWORDS } from './words';
import * as R from 'ramda';

export class Context {
  private usedKey = false;
  public trees: (MarkovTree | null)[];

  get root() {
    // The first one is always there
    return this.trees[0] as MarkovTree;
  }

  constructor(tree: MarkovTree, private dictionary: Dictionary, private order: number) {
    this.trees = new Array(order + 1).fill(null);
    this.trees[0] = tree;
  }

  public seed(keywords?: Dictionary): number {
    if (keywords) {
      const index = randomIntFromInterval(0, keywords.length - 1);
      const words = keywords.words();
      for (const word of words.slice(index).concat(words.slice(0, index))) {
        const dictWord = this.dictionary.getSymbol(word);
        if (dictWord && !DEFAULT_AUXWORDS.includes(word)) {
          return dictWord;
        }
      }
    }
    const childLength = this.root.children.length;
    if (childLength && childLength > 0) {
      const childIndex = randomIntFromInterval(0, childLength - 1);
      return this.root.children[childIndex].symbol;
    }
    return 0;
  }

  /**
   * Updates the context by updating every position in the trees depending on
   * whether the symbol was found in that tree. This operation always preserves
   * the tree at the front.
   *
   * @param symbol Symbol to locate in children
   */
  public update(symbol: number, add = false) {
    for (const i of R.reverse(R.range(1, this.order + 1))) {
      const node = this.trees[i - 1];
      if (node) {
        if (add) {
          this.trees[i] = node.addSymbol(symbol);
        } else {
          this.trees[i] = node.getChild(symbol);
        }
      }
    }
  }

  public babble(keywords: Dictionary, replies: string[]): number {
    let node: MarkovTree | null | undefined;
    for (node of R.reverse(R.take(this.order, this.trees))) {
      if (node) {
        break;
      }
    }
    if (!node || node.children.length === 0) {
      return 0;
    }
    let index = randomIntFromInterval(0, node.children.length - 1);
    let count = randomIntFromInterval(0, node.usage);
    let symbol = 0;
    while (count >= 0) {
      symbol = node.children[index].symbol;
      const word = this.dictionary.getWord(symbol);
      if (!word) {
        throw Error('Node is stored with a symbol that isnt in the dictionary');
      }
      if (
        keywords.hasWord(word) &&
        (this.usedKey || !DEFAULT_AUXWORDS.includes(word)) &&
        !replies.includes(word)
      ) {
        this.usedKey = true;
        break;
      }
      count -= node.children[index].count;
      index += 1;
      if (index >= node.children.length) index = 0;
    }
    return symbol;
  }
}
