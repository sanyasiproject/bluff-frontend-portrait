# bluff-frontend-portrait — guide for Claude

**This is the portrait (upright) twin of `bluff-frontend`.** It started as a copy of `bluff-frontend` at `da3e670`, the last
version before the landscape and 3D-table redesign, and keeps that original upright design. Both apps talk to the same
`bluff-backend`, so `src/types.ts` must stay identical in all three repos. A feature or fix wanted in both apps has to be
made in both repos; the landscape one lives in `../bluff-frontend`.


Phone-first React app for **Game Baithak** (`APP_NAME`), a free home for real-time 2–4 player games with friends: 🃏 Bluff, 7️⃣ Crazy 7, 🌈 Rang (hand-wired) and the registry games 🎲 Ludo, 🐍 Saanp Seedhi, 👑 Raja Mantri Chor Sipahi. Repo names, storage keys and socket paths still say bluff.
Deployed on Vercel (https://bluff-frontend.vercel.app, auto-deploys `main`). The server is the sibling repo
`bluff-backend` (Render). If both repos sit side by side, the parent folder's `CLAUDE.md` has the whole-project
guide, the feature list and the owner's working preferences. Read it first.

## Stack

React 18 + Vite 8 + TypeScript, socket.io-client, no UI library. All styles are in `src/styles.css` (colour tokens in
`:root`, green felt theme). Voice: Web Speech API (`lib/speech.ts`); sounds: Web Audio (`lib/sounds.ts`); PWA via
`public/manifest.webmanifest` and `public/sw.js`.

## Map

| File | Role |
|---|---|
| `src/types.ts` | Copy of `bluff-backend/src/types.ts`. **Never edit here first**: change the backend file and copy it over |
| `src/App.tsx` | Picks the screen: intro (`Splash`) → admin → Home → Lobby → Table; popups |
| `src/useBluff.ts` | Socket connection, room state, every game/room action |
| `src/useAuth.ts` | Login state, coins, friend-request count, profile data |
| `components/Lobby.tsx` | Game picker (🃏 Bluff / 7️⃣ Crazy 7, host), players (bots get a 🤖 row and 🤖 Add a bot), settings per game (Bluff extras: Peek, Bet, Teams, and 🤖 Bot level once a bot is seated; Crazy 7: cards each, picks per turn, Stack 7s; stake capped with bots), 2v2 slots and swap popup, host tools via `PlayerSheet` |
| `components/FriendsSheet.tsx` | Search, requests, friends, invites; Ask to join / 👀 Watch a friend's room (they say yes in `JoinAsks`, top right) (`actions.joinFriend`) |
| `components/OnlineFriends.tsx`, `lib/onlineFriends.ts` | 🟢 Home "Online now" strip and the online count (corner pill, lobby Friends button); one shared friends poll (`useOnlineFriends`) |
| `components/FriendOnline.tsx`, `FriendAlertsRow.tsx`, `lib/friendAlerts.ts` | "👋 came online" card (top right, every screen, mounted in `App`; groups arrivals; Invite in a lobby; chime) and its per-phone Profile switch |
| `components/Table.tsx` | The Bluff game: seats, pile, Bluff / Peek / Bet, partner cards, hand, menus, end game. Exports `Seat`, `SeatSheet`, `GameMenu`, `useOnChange` for Crazy 7 |
| `components/Crazy7Table.tsx` | The Crazy 7 game (`App` picks it when `view.config.game === 'crazy7'`): deck, pile, 7 penalty banner, playable cards glow (`Hand` `playable`/`dimRest`), Pick / Pass / 📢 Last card, move animations from view diffs |
| `components/Overlays.tsx` | `Backdrop` (every sheet/modal), rank/pick/peek/bet sheets, reveal, game over, people list |
| `components/ProfilePage.tsx`, `ProfileParts.tsx`, `ProfileTabs.tsx`, `XpGuide.tsx` | Your profile: header, then Stats · Social · Looks · Settings tabs (last tab remembered per phone); levels, achievements, games |
| `components/MissionsPage.tsx`, `SecretMissions.tsx` | 🎯 Missions page and its Home/Profile button (daily and weekly sets, the daily swap, the games ladder); 🤫 secret mission card pill by the hand and its game-over reveal |
| `components/LeaguePage.tsx`, `Rivals.tsx`, `Ranked.tsx` | 🏆 Friends league page and button; ❤️ games together on friends' cards and the profile (💖 for the most played); 🏅 rank card (season day / countdown, past seasons), chip and game-over line |
| `components/LieRecap.tsx`, `Saza.tsx` | Game-over Lie reveal (tap a name for every play and leftover cards) and Saza badges (sticker, picker) |
| `components/LiveVoice.tsx`, `lib/liveVoice.ts` | 🎧 Live voice: hear/talk buttons, seat marks, the one quiet line; WebRTC peers kept in step with `RoomView` by `LiveVoiceSync` in `App` |
| `components/PlayerSheet.tsx` | Public card for any player (no private data) |
| `components/AdminPanel.tsx`, `AdminUserPage.tsx` | Admin user list and user page |
| `components/RulesPage.tsx` | Admin-only "📖 Rules & features": **update it whenever a rule or feature changes** |
| `components/GameHub.tsx`, `lib/gamePick.ts` | Home game grid from `GAME_CATALOG` (tiles, category chips, last played per phone); a tapped tile sets the game the next created room starts in |
| `games/registry.tsx` | `GAME_UI`: registry game kind → lazy `Table` and `Rules`; `App` routes `isPlugged(view.config.game)` there |
| `games/ludo/` | Ludo: `LudoTable` (seats at the board corners, banners, game over), board, goti, dice, `looks.ts` + `LookPicker.tsx` (board themes, goti styles, per phone, by level), `Rules.tsx`; sounds are the `ludo*` entries in `lib/sounds.ts`, styles `styles/ludo.css`. Dev only: `?ludoPreview=1` (`Preview.tsx`, local game vs 3 bots, `window.ludoRoll = 6` forces a roll), `?ludoPreview=over` (podium), `?homePreview=1` (Home without a server) |
| `games/snakes/` | Saanp Seedhi: `SnakesTable` (Ludo's rows, seats and floating dice; flash lines and bursts), `Board` (SVG board, our own snakes and ladders from `SNAKES`/`LADDERS`), `Tokens` (hop, bounce, slide along the snake curve, climb, bite jump-back, all after `DICE_MS`), `geometry.ts`, `Podium`, `Rules`; gotis and dice reuse Ludo's `Goti`, `Dice` and looks; styles `styles/snakes.css` on top of `styles/ludo.css`; sounds `ladderClimb`/`snakeSlide`/`snakeBite`. Dev only: `?snakesPreview=1` (`window.snakesRoll`, `window.snakesAt`), `?snakesPreview=over` |
| `games/rmcs/` | Raja Mantri Chor Sipahi: `RmcsTable` (4 seats round a table, chits, Mantri guess, result effects), `Chit`, `Podium` (ranking + round history), `Rules`; styles `styles/rmcs.css`; sounds `chit*`/`rajaShown`/`chor*`. Dev only: `?rmcsPreview=1` (`window.rmcsRole`), `?rmcsPreview=over` |
| `components/GameStats.tsx` | Profile Stats → 🎮 Games: a card per catalog game from `stats.perGame` (older totals as fallback) |
| `lib/back.ts` | `useBack(handler)`: the phone back button closes one step at a time |
| `lib/progress.ts` | Titles, level info, achievements, daily-ladder helpers |
| `lib/motion.ts` | `confetti` / `confettiAt`, `useCountUp`, `reducedMotion` |
| `components/Flyers.tsx`, `components/fx/`, `lib/throwSounds.ts`, `styles/throws.css`, `public/fx/` | Emoji throws and coin gifts: lazy-loaded effects engine, Noto animated emoji (Lottie, CC BY 4.0: keep the credit under the throw buttons) played by `lottie-web` light |
| `components/Ambient.tsx`, `Rolling.tsx`, `FlyingCards.tsx` | Home card fan (tap to peek), shining title, floating suits; counting numbers; cards flying to the pile, seats and hand |

## How to add a new game (frontend side)

1. Backend first: add the `GAME_CATALOG` entry (options, colours, players), the `PluggedView` / `PluggedMove` variants and the kind in `PLUGGED_GAMES` in `bluff-backend/src/types.ts`, then copy the file here (keep line 1).
2. Make `src/games/<kind>/` with a `Table` (props `PluggedTableProps`; send moves with `actions.gameMove({ kind, move })`, read `view.plugged`) and a `Rules` component.
3. Add one line to `GAME_UI` in `src/games/registry.tsx`. `App`, the socket handshake (`games`) and the lobby follow by themselves: the game picker and the option rows come from the catalog.
4. Home tile, profile 🎮 Games card and per-game played / wins come from the catalog and `stats.perGame` automatically; add special counters to `GameStats.tsx` and achievements to `lib/progress.ts` if the game has its own.
5. Hindi: a `lib/i18n/hi.<kind>.ts` registered in `hi.ts`. Rules page: a section in `RulesPage.tsx`. Sounds: new entries in `sfx` (`lib/sounds.ts`).
6. Same steps in `../bluff-frontend`.

## Patterns to reuse

- Sheets and popups: `Backdrop` (bottom sheet, or `center` for a modal). Full-screen pages: `FullPage`. Both handle the phone back button.
- Risky actions get an in-app confirm popup (see `confirm-box` in Table / AdminUserPage), not `window.confirm`.
- Keep screens simple: few words, one button that opens a sheet rather than many inline controls, mobile width first (375px).
- `vercel.json` sets security headers. Its CSP `connect-src` lists the Render backend (https + wss): update it if the backend URL changes. No inline scripts (CSP `script-src 'self'`).
- Motion: animate only `transform` / `opacity` (the "motion pass" section at the end of `styles.css`). Containers that may hold fixed sheets use `backwards` fill so no transform is left behind. Everything stops under the phone's reduced-motion setting; JS motion checks `reducedMotion()`.
- `cx(...)` joins class names; coins are shown with `formatCoins` / `compactCoins` (Indian grouping).

## Commands

```bash
npm run dev
```
(Vite on :5173; it talks to `http://<same host>:3001` unless `VITE_SERVER_URL` is set)

```bash
npm run build
```
(type-checks, then builds; must pass before committing)

To try several players in one browser, use different addresses for separate storage: `http://localhost:5173`,
`http://127.0.0.1:5173`, `http://[::1]:5173`.

## Rules of thumb

- Commit or push only when the owner asks. Commit with the repo's configured identity and end messages with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Push after the backend:
  ```bash
  GIT_TERMINAL_PROMPT=0 git -c credential.helper= -c credential.helper='!gh auth git-credential' push origin main
  ```
- Match the existing style; short one-line comments; no secrets in code.
