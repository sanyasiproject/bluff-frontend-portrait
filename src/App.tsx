import { lazy, Suspense, useEffect, useState } from 'react';
import { AdminPanel } from './components/AdminPanel';
import { Crazy7Table } from './components/Crazy7Table';
import { RangTable } from './components/RangTable';
import { Flyers } from './components/Flyers';
import { FriendOnline } from './components/FriendOnline';
import { Home } from './components/Home';
import { Lobby } from './components/Lobby';
import { BonusPopup, InvitePopup } from './components/Popups';
import { Reactions } from './components/Reactions';
import { ShopFx } from './components/ShopFx';
import { LiveVoiceSync } from './components/LiveVoice';
import { JoinAsks } from './components/JoinAsks';
import { Splash } from './components/Splash';
import { Table } from './components/Table';
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

  useEffect(() => {
    if (status === 'online' && !auth.checking && introShown) setBooted(true);
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

  // night lobby look on the hub screens; the lobby keeps the player's felt with night chrome; tables keep theirs
  const ui = (ludoPreview || snakesPreview || rmcsPreview || fruitPreview || spikesPreview || partyPreview) && !artGallery ? null : !view || replaced ? 'night' : view.phase === 'lobby' ? 'lobby' : null;
  useEffect(() => {
    const root = document.documentElement;
    if (ui) root.dataset.ui = ui;
    else delete root.dataset.ui;
  }, [ui]);

  let screen;
  if (artGallery && ArtGallery) {
    screen = (
      <Suspense fallback={null}>
        <ArtGallery />
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
    screen = <AdminPanel auth={auth} onBack={() => setAdminOpen(false)} />;
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
    screen = <Lobby view={view} actions={actions} auth={auth} nudged={nudged} />;
  } else if (isPlugged(view.config.game)) {
    // registry games (Ludo and every game after it) draw their own table
    const { Table: GameTable } = GAME_UI[view.config.game];
    screen = (
      <Suspense fallback={<main className="screen center-screen">Setting up the board…</main>}>
        <GameTable view={view} actions={actions} bubbles={bubbles} auth={auth} />
      </Suspense>
    );
  } else if (view.config.game === 'rang') {
    screen = <RangTable view={view} actions={actions} bubbles={bubbles} auth={auth} />;
  } else if (view.config.game === 'crazy7') {
    screen = <Crazy7Table view={view} actions={actions} bubbles={bubbles} auth={auth} />;
  } else {
    screen = <Table view={view} actions={actions} bubbles={bubbles} auth={auth} />;
  }

  const invite = invites[invites.length - 1];
  const seatedInGame = view?.phase === 'playing' && view.players.some((p) => p.id === view.meId);

  return (
    <>
      {screen}
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
