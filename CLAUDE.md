# bluff-frontend-portrait — guide for Claude

**This is the portrait (upright) twin of `bluff-frontend`.** It started as a copy of `bluff-frontend` at `da3e670`, the last
version before the landscape and 3D-table redesign, and keeps that original upright design. Both apps talk to the same
`bluff-backend`, so `src/types.ts` must stay identical in all three repos. A feature or fix wanted in both apps has to be
made in both repos; the landscape one lives in `../bluff-frontend`.


Phone-first React app for **Game Baithak** (`APP_NAME`), a free home for real-time 2–4 player games with friends: 🃏 Bluff, 7️⃣ Crazy 7, 🌈 Rang (hand-wired) and the registry games 🎲 Ludo, 🐍 Saanp Seedhi, 👑 Raja Mantri Chor Sipahi. Repo names, storage keys and socket paths still say bluff.
Deployed on Vercel (https://bluff-frontend-portrait.vercel.app, auto-deploys `main`). The server is the sibling repo
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
| `games/chess/`, `src/chess/` | Chess: `src/chess/` is the shared rules/engine/analysis library (synced from the backend by `tools/sync-chess.sh`, never edit here); `lib.ts` and `contract.ts` are the one import door each. `ChessTable` (player strips with clocks, `Board` with tap/drag, premove, promotion, pockets, marks, atomic blasts; `Controls`, offers, `ChessEnd`), `Options` (lobby: variant sheet with diagrams, time by speed, rated, colour, bot level), `Rules` + `diagrams.ts`, `Analysis` (review in a Web Worker: `engine/worker.ts`, `engine/useEngine.ts`, cached per game in localStorage), watcher engine lines, `ChessProfile` (Profile → Stats → ♟️ Chess ratings: perf cards, `RatingGraph`, games, leaderboards via `chessApi.ts`), `looks.ts` + `LooksSheet` (4 boards, 2 piece sets from `pieceArt.tsx`, copied byte-identical from `../bluff-frontend`), sounds `chess*` in `lib/sounds.ts`, Hindi `hi.chess.ts`/`hi.chessrules.ts`, styles `styles/chess-*.css`. Dev only: `?chessPreview=1` (vs a bot), `=over`, `=watch`, `=lobby`, `=analysis`, `=profile`; `&chessVariant=atomic&chessTime=3+2&chessFen=…` |
| `games/carrom/`, `src/carrom/` | Carrom: `src/carrom/` is the shared deterministic board + physics (synced from the backend by `tools/sync-carrom.sh`, never edit here; `lib.ts` is the import door). `CarromTable` (board turned so my side is at the bottom, `useShotAnim` replays each shot with `CarromSim` at 60 fps then snaps to the server's board, sounds from its events), `Board` (wooden board in cm), `Pieces`, `Aim` (slide the striker, pull back; aim line to first contact, power ring), `geometry.ts`, `Podium`, `Rules`; styles `styles/carrom.css`; sounds `carrom*`. Dev only: `?carromPreview=1` (=4 2v2, =free, =over) |
| `games/bomb/` | Bomb Pass: `BombTable` (seats round a felt table, the bomb flies to the holder, BOOM with shake/soot/heart pop, ticks by `heat`), `BombArt`, `TaskCard` (big one-tap answers, arrow swipe), `Podium`, `Rules`; styles `styles/bomb.css` + `bomb-table.css`; sounds `bomb*`. Dev only: `?bombPreview=1` (=2, =over) |
| `games/seabattle/` | Sea Battle: `SeaTable` (big target sea, minis to switch target, powers bar, shooter → target arrow over the chips), `Sea` (grid, ships, marks, radar, fx), `ShipArt`, `Placement` (drag/turn/Shuffle/Ready), `Parts`, `Podium`, `Rules`; styles `styles/seabattle.css` + `seabattle-table.css`; sounds `sea*`. Dev only: `?seabattlePreview=1` (=2, =battle, =over) |
| `games/gomoku/`, `games/uttt/`, `games/wordhunt/` | Five in a Row (`StoneBoard`: wooden SVG board, glossy stones, ghost stone + tap twice or Place (per-phone `gomoku.confirm`), pinch/double-tap/🔍 zoom and one-finger pan in `usePanZoom`), Ultimate Tic-Tac-Toe (`UtttBoard`: chalkboard, glowing active boards, hold a cell for the send arrow or FREE, lift to play, stamps, big line), Word Grid Hunt (`LetterGrid`: drag through tiles, a tile joins inside its 70% inner circle, slide back to undo; word checked by `actions.gameMoveTry` and answered by `view.lastTry`; `WordReveal` columns, ★ unique, best word, missed; the last round's reveal shows before the podium). Each has `Podium`, `Rules`; styles `styles/gomoku.css`, `uttt.css`, `wordhunt.css`; sounds `gomoku*`, `uttt*`, `word*`; Hindi `hi.gomoku.ts`, `hi.uttt.ts`, `hi.wordhunt.ts`. Dev only: `?gomokuPreview=1` (=4 19×19, =over), `?ultimatePreview=1` (=mid, =over), `?wordhuntPreview=1` (=5, =reveal, =over; a tiny demo word list, the real dictionary is server-only) |
| `components/GameStats.tsx` | Profile Stats → 🎮 Games: a card per catalog game from `stats.perGame` (older totals as fallback) |
| `components/ErrorBoundary.tsx` | "Something went wrong" screen (Reload, Back to Home) around the app and each screen/table (`App`, `main.tsx`); `LostGameCard` after a restart that lost the game; dev only: `window.bluffCrash = true` shows it |
| `components/Reconnecting.tsx` | Offline in a room: dimmed table with "Reconnecting… your seat is held"; `SeatHeld` strip with other players' held-seat countdowns (`PublicPlayer.seatMsLeft`) |
| `lib/lazyRetry.ts`, `lib/useTimeouts.ts` | Lazy chunks retried once before the error screen; table timers cleared on unmount (no sounds or confetti after leaving) |
| `lib/serverClock.ts`, `lib/fairPlay.ts`, `lib/i18n/hi.fairplay.ts` | Server clock offset for absolute countdowns (Ludo timed, Raja Mantri); Stop wording on staked/ranked tables (Stop = your forfeit); Hindi for forfeits, restarts and the error screen |
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
