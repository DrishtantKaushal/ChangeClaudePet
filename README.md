# claude-petpet

https://github.com/user-attachments/assets/e89187dc-2ee2-4da0-a58b-26918ee77d93

Find UUIDs that produce specific [Claude Code](https://docs.anthropic.com/en/docs/claude-code) buddy companions.

Claude Code assigns each user a procedurally generated buddy based on their
account UUID. This tool brute-force searches random UUIDs to find ones that
produce a buddy matching your desired species, rarity, stats, and cosmetics.

## Install

```bash
bun install -g claude-petpet
```

## Usage

Interactive mode (recommended):

```bash
$ claude-petpet
```

The CLI walks you through selecting filters (species, rarity, eyes, hat, shiny,
peak/dump stats, minimum total) then searches for matching UUIDs.

### As a library

```ts
import { rollFrom, search } from "claude-petpet";

// Roll a specific UUID
const buddy = rollFrom("your-uuid-here");
console.log(buddy);

// Search with filters
const results = search({
  species: "axolotl",
  rarity: "legendary",
  limit: 3,
  max: 10_000_000,
});
```

### Applying a result

Once you find a UUID you like:

1. Open `~/.claude/.config.json`
2. Set `oauthAccount.accountUuid` to the UUID from the search results
3. Restart Claude Code

> **Note:** Re-authenticating will overwrite the UUID back to your real one.

## How it works

Claude Code's buddy system seeds a Mulberry32 PRNG with a hash of
`userId + salt`, then rolls rarity, species, eyes, hat, shiny status, and stat
distribution from that deterministic sequence. This tool replicates that
algorithm to predict the buddy for any given UUID without running Claude Code.

## Legal notice

The companion generation algorithm in this project was derived from source maps
that were inadvertently published alongside Claude Code's publicly distributed
client-side JavaScript. No access controls, obfuscation, or technological
protection measures were circumvented — the source maps were openly served to
end users via NPM. No proprietary source code was copied verbatim; the algorithm
was reimplemented from the observed logic.

Reading publicly served files does not constitute unauthorized access, and
reimplementing a functional algorithm from publicly available materials is
well-established as lawful under:

- **No DMCA §1201 issue** — no technological protection measure was bypassed;
  the source maps were publicly accessible without authentication
- **Fair use doctrine** — functional algorithms are not copyrightable expression
  (see _Oracle v. Google_, 593 U.S. 1 (2021))
- **DMCA §1201(f)** — reverse engineering for interoperability is independently
  permitted even when protection measures are present (not applicable here)
- **EU Software Directive (2009/24/EC) Art. 6** — permits analysis for
  interoperability

This project is not affiliated with or endorsed by Anthropic, PBC. "Claude" and
"Claude Code" are trademarks of Anthropic.

## License

[MIT](LICENSE) — Copyright (c) 2026 Rayhan Noufal Arayilakath
