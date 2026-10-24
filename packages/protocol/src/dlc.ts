/** Wire types and endpoints of the dlc feature. */

/** One expansion as a member sees it in the catalog; names and rules are translated by id. */
export type ExpansionInfo = {
  id: string;
  /** The item that unlocks it, sold by the shop. */
  item: string;
  /** Coins in the shop; null when it cannot be bought outright. */
  price: number | null;
  rulesVersion: number;
  /** Whether the viewer may pick it for a table; always false for a guest. */
  owned: boolean;
};

export type ExpansionCatalog = { expansions: ExpansionInfo[] };

export const dlcApi = {
  /** Every expansion, with the signed-in member's ownership. Open to guests. */
  expansions: '/api/expansions',
} as const;
