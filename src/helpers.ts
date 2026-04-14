import { RARITIES, SPECIES, HATS, EYES, STAT_NAMES } from "./enums.ts";
import { SALT, RARITY_WEIGHTS, RARITY_FLOOR } from "./consts.ts";
import type { Rarity, StatName, Roll, SearchFilters, SearchResult } from "./types.ts";

// Mulberry32 PRNG — deterministic 32-bit PRNG matching the companion
// generation algorithm used by Claude Code's buddy system.
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s: string): number {
  if (typeof Bun !== "undefined") {
    return Number(BigInt(Bun.hash(s)) & 0xffffffffn);
  }
  // FNV-1a fallback for non-Bun runtimes
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

export function rollRarity(rng: () => number): Rarity {
  const total = Object.values(RARITY_WEIGHTS).reduce((a, b) => a + b, 0);
  let roll = rng() * total;
  for (const rarity of RARITIES) {
    roll -= RARITY_WEIGHTS[rarity];
    if (roll < 0) return rarity;
  }
  return "common";
}

export function rollStats(rng: () => number, rarity: Rarity) {
  const floor = RARITY_FLOOR[rarity];
  const peak = pick(rng, STAT_NAMES);
  let dump = pick(rng, STAT_NAMES);
  while (dump === peak) dump = pick(rng, STAT_NAMES);

  const stats = {} as Record<StatName, number>;
  for (const name of STAT_NAMES) {
    if (name === peak) {
      stats[name] = Math.min(100, floor + 50 + Math.floor(rng() * 30));
    } else if (name === dump) {
      stats[name] = Math.max(1, floor - 10 + Math.floor(rng() * 15));
    } else {
      stats[name] = floor + Math.floor(rng() * 40);
    }
  }
  return { stats, peak, dump };
}

export function rollFrom(userId: string): Roll {
  const rng = mulberry32(hashString(userId + SALT));
  const rarity = rollRarity(rng);
  const species = pick(rng, SPECIES);
  const eye = pick(rng, EYES);
  const hat = rarity === "common" ? "none" : pick(rng, HATS);
  const shiny = rng() < 0.01;
  const { stats, peak, dump } = rollStats(rng, rarity);
  const total = Object.values(stats).reduce((a, b) => a + b, 0);
  return { rarity, species, eye, hat, shiny, stats, peak, dump, total };
}

// Like rollFrom, but returns null early when any filter fails.
// Avoids computing stats/hat/shiny when an earlier property already mismatches.
export function rollFromFiltered(userId: string, filters: SearchFilters): Roll | null {
  const rng = mulberry32(hashString(userId + SALT));

  const rarity = rollRarity(rng);
  if (filters.rarity && rarity !== filters.rarity) return null;

  const species = pick(rng, SPECIES);
  if (filters.species && species !== filters.species) return null;

  const eye = pick(rng, EYES);
  if (filters.eye && eye !== filters.eye) return null;

  const hat = rarity === "common" ? "none" : pick(rng, HATS);
  if (filters.hat && hat !== filters.hat) return null;

  const shiny = rng() < 0.01;
  if (filters.shiny && !shiny) return null;

  const { stats, peak, dump } = rollStats(rng, rarity);
  if (filters.peak && peak !== filters.peak) return null;
  if (filters.dump && dump !== filters.dump) return null;

  const total = Object.values(stats).reduce((a, b) => a + b, 0);
  if (filters.minTotal && total < filters.minTotal) return null;

  return { rarity, species, eye, hat, shiny, stats, peak, dump, total };
}

export function matchesFilters(roll: Roll, filters: SearchFilters): boolean {
  if (filters.species && roll.species !== filters.species) return false;
  if (filters.rarity && roll.rarity !== filters.rarity) return false;
  if (filters.eye && roll.eye !== filters.eye) return false;
  if (filters.hat && roll.hat !== filters.hat) return false;
  if (filters.shiny && !roll.shiny) return false;
  if (filters.peak && roll.peak !== filters.peak) return false;
  if (filters.dump && roll.dump !== filters.dump) return false;
  if (filters.minTotal && roll.total < filters.minTotal) return false;
  return true;
}

export function search(filters: SearchFilters): SearchResult[] {
  const results: SearchResult[] = [];

  for (let i = 0; i < filters.max; i++) {
    const uuid = crypto.randomUUID();
    const roll = rollFrom(uuid);

    if (!matchesFilters(roll, filters)) continue;

    results.push({ ...roll, uuid });
    results.sort((a, b) => b.total - a.total);
    if (results.length > filters.limit) results.length = filters.limit;
    if (results.length >= filters.limit) break;
  }

  return results;
}
