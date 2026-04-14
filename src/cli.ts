#!/usr/bin/env bun
// CLI for finding UUIDs that produce specific Claude Code buddy companions.

import * as p from "@clack/prompts";

import { RARITIES, SPECIES, EYES, HATS, STAT_NAMES } from "./enums.ts";
import { STARS } from "./consts.ts";
import { rollFromFiltered } from "./helpers.ts";
import { renderSprite } from "./sprites.ts";
import { c } from "./color.ts";
import type { Rarity, StatName, SearchFilters, SearchResult } from "./types.ts";

const WORKER_THRESHOLD = 500_000;

const NONE = "__none__";

async function promptFilters() {
  return p.group(
    {
      species: () =>
        p.select({
          message: "Species?",
          options: [
            { value: NONE, label: "Any", hint: "no filter" },
            ...SPECIES.map((s) => ({ value: s, label: s })),
          ],
          initialValue: NONE,
        }),

      rarity: () =>
        p.select({
          message: "Rarity?",
          options: [
            { value: NONE, label: "Any", hint: "no filter" },
            ...RARITIES.map((r) => ({ value: r, label: `${STARS[r]}  ${r}` })),
          ],
          initialValue: NONE,
        }),

      eye: () =>
        p.select({
          message: "Eye style?",
          options: [
            { value: NONE, label: "Any", hint: "no filter" },
            ...EYES.map((e) => ({ value: e, label: e })),
          ],
          initialValue: NONE,
        }),

      hat: () =>
        p.select({
          message: "Hat?",
          options: [
            { value: NONE, label: "Any", hint: "no filter" },
            ...HATS.map((h) => ({ value: h, label: h })),
          ],
          initialValue: NONE,
        }),

      shiny: () =>
        p.confirm({
          message: "Must be shiny?",
          initialValue: false,
        }),

      peak: () =>
        p.select({
          message: "Peak stat?",
          options: [
            { value: NONE, label: "Any", hint: "no filter" },
            ...STAT_NAMES.map((s) => ({ value: s, label: s })),
          ],
          initialValue: NONE,
        }),

      dump: ({ results }) =>
        p.select({
          message: "Dump stat?",
          options: [
            { value: NONE, label: "Any", hint: "no filter" },
            ...STAT_NAMES.filter(
              (s) => s !== results.peak || (results.peak as string) === NONE,
            ).map((s) => ({
              value: s,
              label: s,
            })),
          ],
          initialValue: NONE,
        }),

      minTotal: () =>
        p.text({
          message: "Minimum total stats? (0-500)",
          placeholder: "none",
          validate: (v) => {
            if (!v) return;
            const n = parseInt(v, 10);
            if (isNaN(n) || n < 0 || n > 500) return "Must be a number between 0 and 500";
          },
        }),

      limit: () =>
        p.text({
          message: "How many results?",
          initialValue: "5",
          validate: (v) => {
            if (!v) return "Required";
            const n = parseInt(v, 10);
            if (isNaN(n) || n < 1 || n > 100) return "Must be a number between 1 and 100";
          },
        }),

      max: () =>
        p.text({
          message: "Max seeds to search?",
          initialValue: "100000000",
          validate: (v) => {
            if (!v) return "Required";
            const n = parseInt(v, 10);
            if (isNaN(n) || n < 1) return "Must be a positive number";
          },
        }),
    },
    {
      onCancel: () => {
        p.cancel("Search cancelled.");
        process.exit(0);
      },
    },
  );
}

function parseFilters(raw: Awaited<ReturnType<typeof promptFilters>>): SearchFilters {
  return {
    species: raw.species !== NONE ? raw.species : undefined,
    rarity: (raw.rarity !== NONE ? raw.rarity : undefined) as Rarity | undefined,
    eye: raw.eye !== NONE ? raw.eye : undefined,
    hat: raw.hat !== NONE ? raw.hat : undefined,
    shiny: raw.shiny || undefined,
    peak: (raw.peak !== NONE ? raw.peak : undefined) as StatName | undefined,
    dump: (raw.dump !== NONE ? raw.dump : undefined) as StatName | undefined,
    minTotal: raw.minTotal ? parseInt(raw.minTotal, 10) : undefined,
    limit: parseInt(raw.limit, 10),
    max: parseInt(raw.max, 10),
  };
}

function formatSummary(filters: SearchFilters): string {
  const parts: string[] = [];
  if (filters.species) parts.push(`species=${filters.species}`);
  if (filters.rarity) parts.push(`rarity=${filters.rarity}`);
  if (filters.eye) parts.push(`eye=${filters.eye}`);
  if (filters.hat) parts.push(`hat=${filters.hat}`);
  if (filters.shiny) parts.push("shiny=true");
  if (filters.peak) parts.push(`peak=${filters.peak}`);
  if (filters.dump) parts.push(`dump=${filters.dump}`);
  if (filters.minTotal) parts.push(`min-total=${filters.minTotal}`);
  return parts.join(", ") || "(any)";
}

async function searchSingleThread(filters: SearchFilters): Promise<{ results: SearchResult[]; searched: number }> {
  const s = p.spinner({ indicator: "timer" });
  s.start("Searching...");

  const results: SearchResult[] = [];
  let searched = 0;

  for (let i = 0; i < filters.max; i++) {
    if (i % 50_000 === 0 && i > 0) {
      s.message(`Found ${results.length} match(es), ${i.toLocaleString()} searched`);
      await Bun.sleep(0);
    }

    const uuid = crypto.randomUUID();
    const roll = rollFromFiltered(uuid, filters);
    if (!roll) continue;

    results.push({ ...roll, uuid });
    results.sort((a, b) => b.total - a.total);
    if (results.length > filters.limit) results.length = filters.limit;

    searched = i + 1;
    if (results.length >= filters.limit) break;
  }

  searched = searched || filters.max;
  s.stop(`Searched ${searched.toLocaleString()} seeds`);
  return { results, searched };
}

async function searchParallel(filters: SearchFilters): Promise<{ results: SearchResult[]; searched: number }> {
  const numWorkers = navigator.hardwareConcurrency || 4;
  const perWorker = Math.ceil(filters.max / numWorkers);

  const s = p.spinner({ indicator: "timer" });
  s.start(`Searching across ${numWorkers} workers...`);

  const results: SearchResult[] = [];
  const workerProgress = new Array<number>(numWorkers).fill(0);
  let totalSearched = 0;

  return new Promise((resolve) => {
    const workers: Worker[] = [];
    let doneCount = 0;

    function terminateAll() {
      for (const w of workers) w.terminate();
    }

    function finish() {
      results.sort((a, b) => b.total - a.total);
      results.length = Math.min(results.length, filters.limit);
      s.stop(`Searched ${totalSearched.toLocaleString()} seeds across ${numWorkers} workers`);
      resolve({ results, searched: totalSearched });
    }

    for (let i = 0; i < numWorkers; i++) {
      const worker = new Worker(new URL("./worker.ts", import.meta.url));
      workers.push(worker);

      worker.onmessage = (event) => {
        const msg = event.data;

        if (msg.type === "match") {
          results.push(msg.result);
          // Keep only top N while collecting
          if (results.length > filters.limit * 2) {
            results.sort((a, b) => b.total - a.total);
            results.length = filters.limit;
          }
          const searched = workerProgress.reduce((a, b) => a + b, 0);
          s.message(`Found ${results.length} match(es), ${searched.toLocaleString()} searched`);

          if (results.length >= filters.limit) {
            totalSearched = searched;
            terminateAll();
            finish();
          }
        } else if (msg.type === "progress") {
          workerProgress[i] = msg.searched;
          const searched = workerProgress.reduce((a, b) => a + b, 0);
          s.message(`Found ${results.length} match(es), ${searched.toLocaleString()} searched`);
        } else if (msg.type === "done") {
          workerProgress[i] = msg.searched;
          doneCount++;
          if (doneCount === numWorkers) {
            totalSearched = workerProgress.reduce((a, b) => a + b, 0);
            terminateAll();
            finish();
          }
        }
      };

      worker.postMessage({ filters, count: perWorker });
    }
  });
}

async function searchWithProgress(filters: SearchFilters): Promise<{ results: SearchResult[]; searched: number }> {
  return filters.max >= WORKER_THRESHOLD ? searchParallel(filters) : searchSingleThread(filters);
}

function padVisual(s: string, width: number): string {
  return s + " ".repeat(Math.max(0, width - Bun.stringWidth(s)));
}

function printResult(r: SearchResult) {
  const rarityColor =
    r.rarity === "legendary"
      ? c.yellow
      : r.rarity === "epic"
        ? c.magenta
        : r.rarity === "rare"
          ? c.blue
          : r.rarity === "uncommon"
            ? c.green
            : c.dim;

  const shinyColor = r.shiny ? c.yellow : (s: string) => s;

  const header = [
    rarityColor(STARS[r.rarity]),
    rarityColor(r.rarity.toUpperCase()),
    c.bold(r.species),
    r.eye,
    r.hat !== "none" ? c.cyan(`[${r.hat}]`) : "",
    r.shiny ? c.yellow("✨SHINY") : "",
  ]
    .filter(Boolean)
    .join(" ");

  const statLine = STAT_NAMES.map((s) => {
    const tag = s === r.peak ? c.green("↑") : s === r.dump ? c.red("↓") : " ";
    return `${c.dim(s)}: ${String(r.stats[s]).padStart(3)}${tag}`;
  }).join("  ");

  const infoLines = [
    header,
    statLine,
    `${c.dim("Total:")} ${r.total}/500`,
    `${c.dim("UUID:")}  ${c.cyan(r.uuid)}`,
  ];

  // Render sprite and colorize it
  const sprite = renderSprite(r).map((line) => shinyColor(line));
  const spriteWidth = 14;

  // Pad both sides to equal height
  const height = Math.max(sprite.length, infoLines.length);
  while (sprite.length < height) sprite.push(" ".repeat(12));
  while (infoLines.length < height) infoLines.push("");

  // Combine sprite + info side by side
  const combined = sprite
    .map((spriteLine, i) => {
      const paddedSprite = padVisual(spriteLine, spriteWidth);
      return `  ${paddedSprite}${infoLines[i]}`;
    })
    .join("\n");

  console.log();
  console.log(combined);
}

async function main() {
  p.intro(c.bgCyanBlack(" ChangeClaudePet "));

  const raw = await promptFilters();
  const filters = parseFilters(raw);

  p.log.info(
    `Searching for: ${c.cyan(formatSummary(filters))} ${c.dim(`(top ${filters.limit}, up to ${filters.max.toLocaleString()} seeds)`)}`,
  );

  const { results } = await searchWithProgress(filters);

  if (results.length === 0) {
    p.log.warn("No matches found. Try relaxing filters or increasing max seeds.");
    p.outro("Done.");
    return;
  }

  p.log.success(`Found ${c.green(String(results.length))} match${results.length > 1 ? "es" : ""}!`);

  for (const r of results) {
    printResult(r);
  }

  p.log.info(
    "To use: edit ~/.claude.json → set oauthAccount.accountUuid to the UUID above.",
  );
  p.log.warn("Re-authenticating will overwrite it back to your real UUID.");
  p.outro(c.green("Happy hunting!"));
}

void main();
