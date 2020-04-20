export class Dictionary {
  private wordId: { [key: string]: number };
  private idWord: { [key: number]: string };

  constructor(wordId = {}, idWord = {}) {
    this.wordId = wordId;
    this.idWord = idWord;
  }

  public loadWord(id: number, word: string) {
    this.wordId[word] = id;
    this.idWord[id] = word;
  }

  public addWord(word: string) {
    const id = this.getSymbol(word);
    if (id) {
      return id;
    }
    const index = Object.keys(this.wordId).length;
    this.wordId[word] = index;
    this.idWord[index] = word;
    return index;
  }

  public getSymbol(word: string): number | undefined {
    return this.wordId[word];
  }

  public getWord(id: number): string | undefined {
    return this.idWord[id];
  }

  public words(): string[] {
    return Object.values(this.idWord);
  }

  public ids(): number[] {
    return Object.values(this.wordId);
  }

  public empty(): boolean {
    return Object.keys(this.wordId).length === 0;
  }

  public hasWord(word: string): boolean {
    return this.wordId[word] !== undefined;
  }

  public hasSymbol(id: number): boolean {
    return this.idWord[id] !== undefined;
  }

  get length() {
    return Object.keys(this.idWord).length;
  }
}
