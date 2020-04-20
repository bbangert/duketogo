export class MarkovTree {
  public children: MarkovTree[];

  constructor(public symbol: number, public usage: number, public count: number) {
    this.children = [];
  }

  /**
   * Retrieve the child node from this `MarkovTree`, adding it if needed.
   *
   * @param symbol Symbol to add/get from this node
   */
  public addSymbol(symbol: number) {
    const child = this.getChild(symbol, true);
    child.count += 1;
    this.usage += 1;
    return child;
  }

  /**
   * Get's the child from the children, adding it if requested or
   * returning null.
   *
   * @param symbol Symbol to search for.
   * @param add Whether to add the child if it doesn't exist.
   */
  public getChild(symbol: number, add?: false): MarkovTree | null;
  public getChild(symbol: number, add?: true): MarkovTree;
  public getChild(symbol: number, add = true): MarkovTree | null {
    const childIndex = MarkovTree.binsearch(this.children, symbol, 0, this.children.length - 1);
    if (childIndex !== null) {
      return this.children[childIndex];
    }
    if (!add) {
      return null;
    }
    const child = new MarkovTree(symbol, 0, 0);
    this.children.push(child);
    this.children.sort((a, b) => a.symbol - b.symbol);
    return child;
  }

  /**
   * Binary search a list of nodes for the given symbol.
   *
   * Note: This list must be sorted by symbol.
   *
   * @param nodes List of nodes to search
   * @param symbol Symbol to look for
   * @param low Bottom end of index
   * @param high Upper end of index
   */
  public static binsearch(
    nodes: MarkovTree[],
    symbol: number,
    low: number,
    high: number
  ): number | null {
    // Base condition, it's not here
    if (low > high) return null;

    // Find the middle index
    const mid = Math.floor((low + high) / 2);

    // Compare mid with given symbol
    if (nodes[mid].symbol === symbol) {
      return mid;
    }

    // If element at mid is greater than symbol,
    // search in the left half of mid
    if (nodes[mid].symbol > symbol) {
      return this.binsearch(nodes, symbol, low, mid - 1);
    } else {
      // If element at mid is smaller than symbol,
      // search in the right half of mid
      return this.binsearch(nodes, symbol, mid + 1, high);
    }
  }
}
