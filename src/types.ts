import type { RARITIES, STAT_NAMES } from "./enums.ts";

export type Rarity = (typeof RARITIES)[number];
export type StatName = (typeof STAT_NAMES)[number];

export type Roll = {
  rarity: Rarity;
  species: string;
  eye: string;
  hat: string;
  shiny: boolean;
  stats: Record<StatName, number>;
  peak: StatName;
  dump: StatName;
  total: number;
};

export type SearchFilters = {
  species?: string;
  rarity?: Rarity;
  eye?: string;
  hat?: string;
  shiny?: boolean;
  peak?: StatName;
  dump?: StatName;
  minTotal?: number;
  limit: number;
  max: number;
};

export type SearchResult = Roll & { uuid: string };
