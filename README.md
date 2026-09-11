# PKMN Team Planner

A React + Vite Pokémon team planner with an arcade-inspired interface.

[Deployed site](https://pkmn-team-planner.vercel.app/) (local changes are not deployed automatically).

## Run locally

```sh
npm ci
npm run dev
```

```sh
npm run build
npm run preview
```

## Features

- Six team slots with inspection, replacement and removal.
- Name/number and type search, with advanced generation, game, rarity, evolution and stat filters.
- Random teams with optional type, evolution and rarity constraints.
- Ranked teammate suggestions with explanations of defensive support and new offensive coverage.
- Defensive counts per type: weak, resistant, immune, and the number taking 4× damage.
- Best own-type offensive coverage, individual matchups, and team stat averages.
- Automatic draft storage, named saved teams, and share links preserving all six slots and selected game.
- Keyboard-accessible dialogs and layouts for desktop and mobile.

## Data and calculation boundaries

Data comes from [PokéAPI](https://pokeapi.co/docs/v2) and its [official CSV dataset](https://github.com/PokeAPI/pokeapi/tree/master/data/v2/csv). CSV requests are deduplicated and cached in the browser for 24 hours; failed requests can be retried. No account or application backend is required.

Game rosters use `pokemon_game_indices.csv`, cross-checked against species introduction generations. Regional filters use the union of matching regional dex species IDs and intersect it with the game roster. These are supported game rosters, not encounter locations or complete legality checks: transfers, trading and events may be involved. A form absent from the source roster is marked unverified instead of being assumed available. Availability warnings do not remove existing team members.

Historical Pokémon types use `pokemon_types_past.csv`, including Fairy conversions, Magnemite and Rotom forms. Generation I and pre-VI matchup overrides match `type_efficacy_past.csv`. Every analysis view and the suggestion scorer use the same chart. Original types are retained when switching games or applying random teams.

Offensive coverage chooses the best individual own-type move against a single-type target. Defense multiplies the target Pokémon's types, then counts team members separately. Abilities, items and movesets are not simulated. Base stats and evolution stages use current data, including separate Special Attack and Special Defense in older games.

Drafts and named teams are stored only in this browser. A share link contains Pokémon IDs and the game ID, not saved-team names. Opening a valid link replaces the current draft; failed imports keep it intact. Named saved teams are separate snapshots.

## Validation

```sh
npm test
npx playwright install chromium
npm run test:e2e
```

Browser tests cover desktop and mobile with deterministic Pokémon fixtures: saving, sharing, library management, suggestions, random teams, historical types, roster warnings, stale requests, blocked storage and keyboard focus.

To use an installed Edge browser on Windows:

```powershell
$env:PLAYWRIGHT_CHANNEL = 'msedge'
npm run test:e2e
```

Tests are local. No command above publishes or pushes changes.
