import { lazy, Suspense, useEffect, useState } from 'react';
import { Flyers } from './components/Flyers';
import { FriendOnline } from './components/FriendOnline';
import { Home } from './components/Home';
import { BonusPopup, InvitePopup } from './components/Popups';
import { Reactions } from './components/Reactions';
import { ShopFx } from './components/ShopFx';
import { LiveVoiceSync } from './components/LiveVoice';
import { JoinAsks } from './components/JoinAsks';
import { Splash } from './components/Splash';
import { Toasts } from './components/Toasts';
import { clearInvite } from './lib/invite';
import { useLook } from './lib/look';
import { autoPush } from './lib/push';
import { loadName } from './lib/storage';
import { noteLastPlayed } from './lib/gamePick';
import { GAME_UI } from './games/registry';
import { prefetchGame, useIdlePrefetch } from './games/prefetch';
import { isPlugged } from './types';
import { useAuth } from './useAuth';
import { useBluff } from './useBluff';
import { useSendLudoLook } from './games/ludo/looks';
import { LazyAdminPanel, LazyCrazy7Table, LazyLobby, LazyRangTable, LazyTable, prefetchScreens } from './lazyScreens';
import { syncStatusBar } from './lib/statusBar';

// dev only: ?ludoPreview=1 shows a local Ludo game with bots, no server needed
const LudoPreview = import.meta.env.DEV ? lazy(() => import('./games/ludo/Preview').then((m) => ({ default: m.LudoPreview }))) : null;
const ludoPreview = import.meta.env.DEV && new URLSearchParams(location.search).has('ludoPreview');
// dev only: ?snakesPreview=1 / ?rmcsPreview=1 (or =over) show those tables locally with bots
const SnakesPreview = import.meta.env.DEV ? lazy(() => import('./games/snakes/Preview').then((m) => ({ default: m.SnakesPreview }))) : null;
const RmcsPreview = import.meta.env.DEV ? lazy(() => import('./games/rmcs/Preview').then((m) => ({ default: m.RmcsPreview }))) : null;
const snakesPreview = import.meta.env.DEV && new URLSearchParams(location.search).has('snakesPreview');
const rmcsPreview = import.meta.env.DEV && new URLSearchParams(location.search).has('rmcsPreview');
// dev only: ?fruitPreview=1 / ?spikesPreview=1 (or =over) play the arcade games locally with bots
const FruitPreview = import.meta.env.DEV ? lazy(() => import('./games/fruit/Preview').then((m) => ({ default: m.FruitPreview }))) : null;
const SpikesPreview = import.meta.env.DEV ? lazy(() => import('./games/spikes/Preview').then((m) => ({ default: m.SpikesPreview }))) : null;
const fruitPreview = import.meta.env.DEV && new URLSearchParams(location.search).has('fruitPreview');
const spikesPreview = import.meta.env.DEV && new URLSearchParams(location.search).has('spikesPreview');
// dev only: ?dartsPreview=1 / ?dotsPreview=1 / ?colorwarPreview=1 (or =over) play those tables locally with bots
const DartsPreview = import.meta.env.DEV ? lazy(() => import('./games/darts/Preview').then((m) => ({ default: m.DartsPreview }))) : null;
const DotsPreview = import.meta.env.DEV ? lazy(() => import('./games/dots/Preview').then((m) => ({ default: m.DotsPreview }))) : null;
const ColorWarPreview = import.meta.env.DEV ? lazy(() => import('./games/colorwar/Preview').then((m) => ({ default: m.ColorWarPreview }))) : null;
const partyPreview = import.meta.env.DEV ? (['darts', 'dots', 'colorwar'] as const).find((k) => new URLSearchParams(location.search).has(`${k}Preview`)) : undefined;
// dev only: ?art=1 shows the night-theme art gallery
const ArtGallery = import.meta.env.DEV ? lazy(() => import('./art/ArtGallery').then((m) => ({ default: m.ArtGallery }))) : null;
const artGallery = import.meta.env.DEV && new URLSearchParams(location.search).has('art');
// dev only: ?chessPreview=1 (or =over, =watch, =lobby, =analysis, =profile) shows chess locally against a bot
const ChessPreview = import.meta.env.DEV ? lazy(() => import('./games/chess/Preview').then((m) => ({ default: m.ChessPreview }))) : null;
const chessPreview = import.meta.env.DEV && new URLSearchParams(location.search).has('chessPreview');
// the preview's settings, read now: the app may tidy the address bar before the preview chunk loads
const chessPreviewQuery = import.meta.env.DEV ? location.search : '';
// dev only: ?carromPreview=1 / ?bombPreview=1 / ?seabattlePreview=1 (or =over) play those tables locally with bots
const N3_PREVIEWS = import.meta.env.DEV
  ? {
      carrom: lazy(() => import('./games/carrom/Preview').then((m) => ({ default: m.CarromPreview }))),
      bomb: lazy(() => import('./games/bomb/Preview').then((m) => ({ default: m.BombPreview }))),
      seabattle: lazy(() => import('./games/seabattle/Preview').then((m) => ({ default: m.SeaPreview }))),
    }
  : null;
const n3Preview = import.meta.env.DEV ? (['carrom', 'bomb', 'seabattle'] as const).find((k) => new URLSearchParams(location.search).has(`${k}Preview`)) : undefined;
// read now: the app may tidy the address bar before the preview chunk loads
const n3Query = import.meta.env.DEV ? location.search : '';
// dev only: ?gomokuPreview=1 / ?ultimatePreview=1 / ?wordhuntPreview=1 (or =over) play those tables locally with bots
const G7_PREVIEWS = import.meta.env.DEV
  ? {
      gomoku: lazy(() => import('./games/gomoku/Preview').then((m) => ({ default: m.GomokuPreview }))),
      ultimate: lazy(() => import('./games/uttt/Preview').then((m) => ({ default: m.UtttPreview }))),
      wordhunt: lazy(() => import('./games/wordhunt/Preview').then((m) => ({ default: m.WordHuntPreview }))),
    }
  : null;
const g7Preview = import.meta.env.DEV ? (['gomoku', 'ultimate', 'wordhunt'] as const).find((k) => new URLSearchParams(location.search).has(`${k}Preview`)) : undefined;
// dev only: ?homePreview=1 skips the intro, to see Home without a server
const homePreview = import.meta.env.DEV && new URLSearchParams(location.search).has('homePreview');

export default function App() {
  const { status, connectionId, view, notes, reactions, bubbles, flyers, invites, replaced, pendingWatch, nudged, actions } = useBluff();
  const auth = useAuth();
  // the table theme and card back this player picked
  useLook(auth);
  // my Ludo gotis, dice and board go to the room so everyone sees them
  useSendLudoLook(view, connectionId, actions.ludoLook);
  const [adminOpen, setAdminOpen] = useState(false);
  // the intro stays until the server first answers and a saved login is checked, and at least a moment
  const [booted, setBooted] = useState(false);
  const [introShown, setIntroShown] = useState(false);
  const inRoom = view !== null;
  const { refresh } = auth;
  const settled = view?.coinResults != null;

  useEffect(() => {
    const t = setTimeout(() => setIntroShown(true), 900);
    return () => clearTimeout(t);
  }, []);

  // Home shows right after the intro; a sleeping server only holds it while it is already answering a saved login
  useEffect(() => {
    if (introShown && (status !== 'online' || !auth.checking)) setBooted(true);
  }, [status, auth.checking, introShown]);

  // once inside a room the invite link has done its job
  useEffect(() => {
    if (inRoom) clearInvite();
  }, [inRoom]);

  // invite notifications are on by default: a phone that already allows them is signed up without asking
  const userId = auth.user?.id ?? null;
  useEffect(() => {
    if (userId && auth.pushInvites === true) void autoPush(auth.token, userId);
  }, [userId, auth.pushInvites, auth.token]);

  // coins and stats change when a game is settled; show the new numbers
  useEffect(() => {
    if (settled) void refresh();
  }, [settled, refresh]);

  // the home grid remembers the games played on this phone
  const playingGame = view?.phase === 'playing' ? view.config.game : null;
  useEffect(() => {
    if (playingGame) noteLastPlayed(playingGame);
  }, [playingGame]);

  // the room's game (and each host change) starts downloading its table at once; home fetches likely ones when idle
  const roomGame = view?.config.game ?? null;
  useEffect(() => prefetchGame(roomGame), [roomGame]);
  useIdlePrefetch(booted && !view, auth.user?.stats);
  // the lobby, tables and profile download in the background once Home is up
  useEffect(() => {
    if (!booted) return;
    const t = window.setTimeout(prefetchScreens, 2500);
    return () => window.clearTimeout(t);
  }, [booted]);

  // night lobby look on the hub screens; the lobby keeps the player's felt with night chrome; tables keep theirs
  const ui = (ludoPreview || snakesPreview || rmcsPreview || fruitPreview || spikesPreview || partyPreview || chessPreview || n3Preview || g7Preview) && !artGallery ? null : !view || replaced ? 'night' : view.phase === 'lobby' ? 'lobby' : null;
  useEffect(() => {
    const root = document.documentElement;
    if (ui) root.dataset.ui = ui;
    else delete root.dataset.ui;
    syncStatusBar();
  }, [ui]);

  let screen;
  if (artGallery && ArtGallery) {
    screen = (
      <Suspense fallback={null}>
        <ArtGallery />
      </Suspense>
    );
  } else if (g7Preview && G7_PREVIEWS) {
    const Preview = G7_PREVIEWS[g7Preview];
    screen = (
      <Suspense fallback={null}>
        <Preview auth={auth} query={n3Query} />
      </Suspense>
    );
  } else if (n3Preview && N3_PREVIEWS) {
    const Preview = N3_PREVIEWS[n3Preview];
    screen = (
      <Suspense fallback={null}>
        <Preview auth={auth} query={n3Query} />
      </Suspense>
    );
  } else if (chessPreview && ChessPreview) {
    screen = (
      <Suspense fallback={null}>
        <ChessPreview auth={auth} query={chessPreviewQuery} />
      </Suspense>
    );
  } else if (snakesPreview && SnakesPreview) {
    screen = (
      <Suspense fallback={null}>
        <SnakesPreview auth={auth} />
      </Suspense>
    );
  } else if (rmcsPreview && RmcsPreview) {
    screen = (
      <Suspense fallback={null}>
        <RmcsPreview auth={auth} />
      </Suspense>
    );
  } else if (fruitPreview && FruitPreview) {
    screen = (
      <Suspense fallback={null}>
        <FruitPreview auth={auth} />
      </Suspense>
    );
  } else if (spikesPreview && SpikesPreview) {
    screen = (
      <Suspense fallback={null}>
        <SpikesPreview auth={auth} />
      </Suspense>
    );
  } else if (partyPreview && DartsPreview && DotsPreview && ColorWarPreview) {
    const Preview = partyPreview === 'darts' ? DartsPreview : partyPreview === 'dots' ? DotsPreview : ColorWarPreview;
    screen = (
      <Suspense fallback={null}>
        <Preview auth={auth} />
      </Suspense>
    );
  } else if (ludoPreview && LudoPreview) {
    screen = (
      <Suspense fallback={null}>
        <LudoPreview auth={auth} />
      </Suspense>
    );
  } else if (!booted && !replaced && !homePreview) {
    screen = <Splash status={status} />;
  } else if (replaced) {
    screen = (
      <main className="screen center-screen">
        <h2>Opened somewhere else</h2>
        <p className="muted">This game is now open in another tab or phone.</p>
        <button className="btn primary" onClick={actions.reclaim}>
          Play here instead
        </button>
      </main>
    );
  } else if (!view && adminOpen && auth.user?.role === 'admin') {
    screen = <LazyAdminPanel auth={auth} onBack={() => setAdminOpen(false)} />;
  } else if (!view) {
    screen = (
      <Home
        status={status}
        connectionId={connectionId}
        actions={actions}
        auth={auth}
        onOpenAdmin={() => setAdminOpen(true)}
        pendingWatch={pendingWatch}
      />
    );
  } else if (view.phase === 'lobby') {
    screen = <LazyLobby view={view} actions={actions} auth={auth} nudged={nudged} />;
  } else if (isPlugged(view.config.game)) {
    // registry games (Ludo and every game after it) draw their own table
    const { Table: GameTable } = GAME_UI[view.config.game];
    screen = (
      <Suspense fallback={<main className="screen center-screen">Setting up the board…</main>}>
        <GameTable view={view} actions={actions} bubbles={bubbles} auth={auth} />
      </Suspense>
    );
  } else if (view.config.game === 'rang') {
    screen = <LazyRangTable view={view} actions={actions} bubbles={bubbles} auth={auth} />;
  } else if (view.config.game === 'crazy7') {
    screen = <LazyCrazy7Table view={view} actions={actions} bubbles={bubbles} auth={auth} />;
  } else {
    screen = <LazyTable view={view} actions={actions} bubbles={bubbles} auth={auth} />;
  }

  const invite = invites[invites.length - 1];
  const seatedInGame = view?.phase === 'playing' && view.players.some((p) => p.id === view.meId);

  return (
    <>
      {/* lazy screens show the night background with a short line while their chunk arrives */}
      <Suspense fallback={<main className="screen center-screen screen-loading">Loading…</main>}>{screen}</Suspense>
      {/* shop win bursts and entry flashes, for both games and the lobby */}
      <ShopFx view={replaced ? null : view} />
      {view && !replaced && status !== 'online' && <div className="conn-pill">Reconnecting…</div>}
      <Toasts notes={notes} />
      <Reactions items={reactions} />
      <LiveVoiceSync view={replaced ? null : view} />
      {/* people asking me to let them in, top right on any screen */}
      <JoinAsks view={replaced ? null : view} onAnswer={actions.admit} />
      <Flyers items={flyers} onDone={actions.dropFlyer} />
      <FriendOnline auth={auth} inLobby={view?.phase === 'lobby'} onInvite={actions.invite} />
      {invite && (
        <InvitePopup
          invite={invite}
          inGame={seatedInGame}
          onJoin={() => void actions.acceptInvite(invite, auth.user?.displayName ?? loadName())}
          onIgnore={() => actions.dismissInvite(invite.key)}
        />
      )}
      {auth.bonus > 0 && !invite && <BonusPopup amount={auth.bonus} streak={auth.user?.loginStreak} onClose={auth.clearBonus} />}
    </>
  );
}
