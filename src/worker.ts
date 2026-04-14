// Worker script for parallel buddy search.

import { rollFromFiltered } from "./helpers.ts";
import type { SearchFilters, SearchResult } from "./types.ts";

declare var self: Worker;

const PROGRESS_EVERY = 100_000;

self.onmessage = (event: MessageEvent<{ filters: SearchFilters; count: number }>) => {
  const { filters, count } = event.data;
  let searched = 0;

  for (let i = 0; i < count; i++) {
    if (i % PROGRESS_EVERY === 0 && i > 0) {
      self.postMessage({ type: "progress", searched: i });
    }

    const uuid = crypto.randomUUID();
    const roll = rollFromFiltered(uuid, filters);
    if (!roll) continue;

    self.postMessage({ type: "match", result: { ...roll, uuid } });
    searched = i + 1;
  }

  self.postMessage({ type: "done", searched: searched || count });
};
