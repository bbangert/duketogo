import fs from 'fs';

import { MarkovTree } from './tree';
import { Brain } from './brain';
import { Dictionary } from './dictionary';

/**
 * Brain file handler
 *
 * Provides capability to read and write C style binary brain files.
 *
 */
export class BrainFileHandler {
  private buffer: Buffer;
  private cookie: string;
  private order: number;
  private loaded = false;

  constructor() {
    this.buffer = Buffer.alloc(0);
    this.cookie = '';
    this.order = 5;
  }

  private deserializeFile(filename: string) {
    this.buffer = fs.readFileSync(filename);
    this.cookie = this.readWord(9);
    this.order = this.read8();
    const forward = this.readTree();
    const backward = this.readTree();
    const wordCount = this.read32();
    const dictionary = new Dictionary();
    for (let i = 0; i < wordCount; i++) {
      const wordLen = this.read8();
      dictionary.loadWord(i, this.readWord(wordLen));
    }
    this.loaded = true;
    return {
      order: this.order,
      forward,
      backward,
      dictionary,
    };
  }

  /**
   * Deserialize a brain file into a `Brain`.
   *
   * @param filename Brain file to read.
   */
  public deserialize(filename: string) {
    try {
      return this.deserializeFile(filename);
    } catch (err) {
      console.error('Error reading file, checking for backup.');
    }
    if (!fs.existsSync(`${filename}.bak`)) {
      console.log('No backup file found, exiting.');
      process.exit(1);
    }
    try {
      const result = this.deserializeFile(`${filename}.bak`);
      fs.copyFileSync(`${filename}.bak`, filename);
      console.log('Backup file read safely, copied over original');
      return result;
    } catch (err) {
      console.error('Unable to read backup brain file');
      process.exit(1);
    }
  }

  /**
   * Serialize a `Brain` to the provided `filename`.
   *
   * @param filename Brain fiel to write.
   * @param brain Brain to dump.
   */
  public serialize(filename: string, brain: Brain) {
    const fd = fs.openSync(filename, 'w');
    const tempBuffer = Buffer.alloc(4);

    const write = (buf: Buffer) => {
      fs.writeSync(fd, buf);
    };

    function write8(num: number) {
      tempBuffer.writeUInt8(num);
      write(tempBuffer.slice(0, 1));
    }

    function write16(num: number) {
      tempBuffer.writeUInt16LE(num);
      write(tempBuffer.slice(0, 2));
    }

    function write32(num: number) {
      tempBuffer.writeUInt32LE(num);
      write(tempBuffer);
    }

    function writeWord(word: string) {
      const wordBuf = Buffer.from(word, 'utf-8');
      write8(wordBuf.length);
      write(wordBuf);
    }

    function writeTree(tree: MarkovTree) {
      write16(tree.symbol);
      write32(tree.usage);
      write16(tree.count);
      const childCount = tree.children.length;
      write16(childCount);
      for (const node of tree.children) {
        writeTree(node);
      }
    }

    write(Buffer.from(this.cookie, 'ascii'));
    write8(this.order);
    writeTree(brain.forward);
    writeTree(brain.backward);
    write32(brain.dictionary.length);
    for (let i = 0; i < brain.dictionary.length; i++) {
      writeWord(brain.dictionary.getWord(i) as string);
    }
    fs.closeSync(fd);
    fs.copyFileSync(filename, `${filename}.bak`);
  }

  private readTree(): MarkovTree {
    const [symbol, usage, count, childrenCount] = [
      this.read16(),
      this.read32(),
      this.read16(),
      this.read16(),
    ];
    const root = new MarkovTree(symbol, usage, count);
    for (let i = 0; i < childrenCount; i++) {
      root.children.push(this.readTree());
    }
    return root;
  }

  private readWord(length: number): string {
    const raw = this.buffer.toString('utf-8', 0, length);
    this.buffer = this.buffer.slice(length);
    return raw;
  }

  private read8(): number {
    const num = this.buffer.readUInt8();
    this.buffer = this.buffer.slice(1);
    return num;
  }

  private read16(): number {
    const num = this.buffer.readUInt16LE();
    this.buffer = this.buffer.slice(2);
    return num;
  }

  private read32(): number {
    const num = this.buffer.readUInt32LE();
    this.buffer = this.buffer.slice(4);
    return num;
  }
}
