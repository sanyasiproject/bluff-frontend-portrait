import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useBack } from '../../lib/back';
import { cx } from '../../lib/cards';
import { compactCoins } from '../../lib/coins';
import { confettiAt } from '../../lib/motion';
import { sfx, unlockAudio } from '../../lib/sounds';
import { isSoundOn, setSoundOn, unlockSpeech } from '../../lib/speech';
import { PARTY_COLORS, type RoomView } from '../../types';
import type { Actions, ChatBubble } from '../../useBluff';
import type { Auth } from '../../useAuth';
import { GameOver } from '../../components/Overlays';
import { LevelUp } from '../../components/LevelUp';
import { QuickChat } from '../../components/QuickChat';
import { LiveVoiceButtons, LiveVoiceNotice } from '../../components/LiveVoice';
import { Seat, SeatSheet, useOnChange } from '../../components/Table';
import { LudoMenus, type Panel } from '../ludo/Menus';
import { ColorDot, ColorTag, colorName, YouAreBanner } from '../../components/PlayerColor';

// Shared by the Darts, Dots and Boxes and Colour Wars tables: seat order and colours, corner chips, top bar, game-over flow

const BUBBLE_MS = 4000;
/** seat corners clockwise from mine at the bottom left (0 TL, 1 TR, 2 BR, 3 BL) */
const CORNERS: Record<number, number[]> = {
  1: [3],
  2: [3, 1],
  3: [3, 0, 1],
  4: [3, 0, 1, 2],
};

/** players in seat order: the game's own order when it has one (its score keys), else the room's */
export function partyOrder(view: RoomView, keys?: string[]): string[] {
  const room = [...view.players, ...view.leftPlayers].map((p) => p.id);
  return keys && keys.length > 0 ? keys : room;
}
/** a player's colour from their seat */
export const partyColor = (order: string[], id: string | null | undefined): string => PARTY_COLORS[Math.max(0, order.indexOf(id ?? '')) % PARTY_COLORS.length];
/** the first letter of a name, for boxes and blobs */
export const initialOf = (name: string): string => (Array.from(name.trim())[0] ?? '?').toUpperCase();

/** the table's common state: menus, sound, seat taps, podium, level up and the end-of-game effects */
export function usePartyTable(view: RoomView) {
  const [busy, setBusy] = useState(false);
  const [sound, setSound] = useState(isSoundOn);
  const [panel, setPanel] = useState<Panel>(null);
  useBack(() => setPanel('menu'));
  const [target, setTarget] = useState<string | null>(null);
  const [podiumDone, setPodiumDone] = useState(false);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const seatEls = useRef(new Map<string, HTMLElement>());
  const startLevel = useRef<number | null>(null);

  const me = view.players.find((p) => p.id === view.meId);
  const playing = view.phase === 'playing';
  const over = view.phase === 'over';
  const all = [...view.players, ...view.leftPlayers];
  const name = (id: string | null | undefined) => (id === view.meId ? 'You' : (all.find((p) => p.id === id)?.name ?? 'Someone'));
  const plainName = (id: string | null | undefined) => all.find((p) => p.id === id)?.name ?? '?';
  const fresh = (bubbles: ChatBubble[]) => bubbles.filter((b) => Date.now() - b.at < BUBBLE_MS);

  useEffect(() => {
    if (!playing) return;
    startLevel.current = me?.level ?? null;
    setPodiumDone(false);
  }, [view.phase]);
  useOnChange(view.phase, (phase) => {
    if (phase !== 'over' || view.stopped) return;
    (view.loserIds.includes(view.meId) ? sfx.lose : sfx.win)();
    view.winnerIds.forEach((w) => confettiAt(seatEls.current.get(w), w === view.meId ? { count: 60, spread: 1.3 } : { count: 30, spread: 0.8 }));
  });
  const myLevel = view.coinResults?.find((r) => r.playerId === view.meId)?.level ?? null;
  useEffect(() => {
    if (!over || !podiumDone || myLevel === null || startLevel.current === null || myLevel <= startLevel.current) return;
    setLevelUp(myLevel);
    startLevel.current = myLevel;
  }, [view.phase, podiumDone, myLevel]);

  const act = async (fn: () => Promise<unknown>) => {
    if (busy) return;
    unlockAudio();
    unlockSpeech();
    setBusy(true);
    await fn();
    setBusy(false);
  };
  const toggleSound = () => {
    setSoundOn(!sound);
    setSound(!sound);
  };
  return {
    busy,
    sound,
    toggleSound,
    panel,
    setPanel,
    target,
    setTarget,
    podiumDone,
    setPodiumDone,
    levelUp,
    setLevelUp,
    seatEls,
    startLevel,
    me,
    watching: !me,
    playing,
    over,
    isHost: view.hostId === view.meId,
    name,
    plainName,
    fresh,
    act,
  };
}
export type PartyTable = ReturnType<typeof usePartyTable>;

/** the four corners' players, mine at the bottom left and the rest clockwise */
export function cornerIds(order: string[], meId: string): (string | undefined)[] {
  const n = Math.min(4, order.length);
  const ids = order.slice(0, 4);
  const meIdx = Math.max(0, ids.indexOf(meId));
  const corners: (string | undefined)[] = [undefined, undefined, undefined, undefined];
  ids.forEach((id, j) => (corners[(CORNERS[n] ?? CORNERS[4])[(j - meIdx + n) % n]] = id));
  return corners;
}

/** a corner chip: the player's seat with a border in their colour and the game's numbers under it */
export function PartySeat({
  t,
  view,
  bubbles,
  id,
  color,
  turn,
  tag,
  turnEndsAt,
  extra,
  icon,
  name,
}: {
  t: PartyTable;
  view: RoomView;
  bubbles: ChatBubble[];
  id: string | undefined;
  color: string;
  turn: boolean;
  tag: ReactNode;
  turnEndsAt?: number | null;
  extra?: string;
  /** the player's piece icon (default: a colour dot) */
  icon?: ReactNode;
  /** the name on my colour tag (default: the colour's name) */
  name?: string;
}) {
  const p = id ? view.players.find((x) => x.id === id) : undefined;
  if (!p) return <div className="ld-seat-empty" />;
  const bubble = [...t.fresh(bubbles)].reverse().find((b) => b.from === p.id) ?? null;
  return (
    <Seat
      player={p}
      turn={turn}
      passed={false}
      bubble={bubble}
      onClick={p.id === view.meId ? undefined : () => t.setTarget(p.id)}
      label={`Throw an emoji at ${p.name}`}
      extra={cx('ld-seat', 'pg-seat', 'pc-seat', extra)}
      style={{ '--pc': color } as CSSProperties}
      turnEndsAt={turn ? (turnEndsAt ?? null) : null}
      turnSec={view.config.turnSec}
      tag={
        <>
          <span className="ld-chip-stats pg-chip-stats" style={{ '--pc': color } as CSSProperties}>
            {tag}
          </span>
          {p.id === view.meId ? <ColorTag color={color} name={name ?? colorName(color)} icon={icon ?? <ColorDot color={color} />} mine /> : <i className="pc-band" aria-hidden />}
        </>
      }
      seatRef={(el) => {
        if (el) t.seatEls.current.set(p.id, el);
        else t.seatEls.current.delete(p.id);
      }}
    />
  );
}

/** the top bar: room code, the game's chip, pot, watch requests, voice, quick chat, menu */
export function PartyTopbar({ t, view, actions, chip }: { t: PartyTable; view: RoomView; actions: Actions; chip: ReactNode }) {
  const pot = view.config.stake * (view.players.length + view.leftPlayers.length);
  return (
    <>
      <header className="topbar">
        <span className="code-chip">{view.code}</span>
        <span className="c7-chip ld-game-chip">{chip}</span>
        {view.config.stake > 0 && <span className="pot-chip">🪙 {compactCoins(pot)}</span>}
        <span className="grow" />
        <div className="topbar-actions">
          {t.isHost && view.watchRequests.length > 0 && (
            <button className="icon-btn req-btn" aria-label={`${view.watchRequests.length} people want to watch`} onClick={() => t.setPanel('requests')}>
              👀<span className="req-dot">{view.watchRequests.length}</span>
            </button>
          )}
          <LiveVoiceButtons view={view} onToast={actions.toast} />
          <QuickChat onSend={actions.chat} view={view} />
          <button className="icon-btn" aria-label="Game menu" onClick={() => t.setPanel('menu')}>
            ⋯
          </button>
        </div>
      </header>
      <LiveVoiceNotice />
    </>
  );
}

/** the end of the table: podium, then game over, level up, the emoji sheet and the menus */
export function PartyEnd({ t, view, actions, auth, podium }: { t: PartyTable; view: RoomView; actions: Actions; auth: Auth; podium: ReactNode }) {
  const target = t.target ? view.players.find((p) => p.id === t.target) : undefined;
  return (
    <>
      {t.over && !t.podiumDone && !view.stopped && podium}
      {t.over && (t.podiumDone || view.stopped) && <GameOver view={view} onLobby={actions.toLobby} onRematch={t.isHost ? actions.rematch : undefined} startLevel={t.startLevel.current} />}
      {t.levelUp !== null && <LevelUp level={t.levelUp} from={t.startLevel.current} onClose={() => t.setLevelUp(null)} />}
      {target && <SeatSheet player={target} auth={auth} onThrow={(i) => void actions.throwAt(target.id, i)} onClose={() => t.setTarget(null)} />}
      <LudoMenus view={view} actions={actions} panel={t.panel} setPanel={t.setPanel} sound={t.sound} onToggleSound={t.toggleSound} />
    </>
  );
}

/** every player's chip in one row above the board, in seat order */
export function PartyChips({
  t,
  view,
  bubbles,
  order,
  colorOf,
  turnId,
  turnEndsAt,
  tag,
  extra,
  iconOf,
  nameOf,
}: {
  t: PartyTable;
  view: RoomView;
  bubbles: ChatBubble[];
  order: string[];
  colorOf: (id: string) => string;
  turnId: string | null | undefined;
  turnEndsAt?: number | null;
  tag: (id: string) => ReactNode;
  extra?: (id: string) => string | false | undefined;
  /** each player's piece icon (default: a colour dot) */
  iconOf?: (id: string) => ReactNode;
  /** each player's colour name for the "you are" tags (default: the seat colour's name) */
  nameOf?: (id: string) => string | undefined;
}) {
  const ids = order.filter((id) => view.players.some((p) => p.id === id)).slice(0, 4);
  const mine = view.players.some((p) => p.id === view.meId) ? colorOf(view.meId) : null;
  const myIcon = iconOf?.(view.meId) ?? (mine ? <ColorDot color={mine} /> : null);
  return (
    <div className="pg-chips" data-n={ids.length}>
      {mine && <YouAreBanner color={mine} name={nameOf?.(view.meId) ?? colorName(mine)} icon={myIcon} playing={t.playing} />}
      {ids.map((id) => (
        <PartySeat
          key={id}
          t={t}
          view={view}
          bubbles={bubbles}
          id={id}
          color={colorOf(id)}
          turn={id === turnId && t.playing}
          turnEndsAt={turnEndsAt}
          extra={cx('pg-chip', id === view.meId && 'pg-me', extra?.(id))}
          tag={tag(id)}
          icon={iconOf?.(id)}
          name={nameOf?.(id)}
        />
      ))}
    </div>
  );
}

export interface PartyToast {
  key: number;
  text: string;
  tone: 'good' | 'bad' | 'gold' | '';
}

/** the strip between the chips and the board: a short toast, else whose turn it is; never over the board */
export function PartyStrip({ toast, status, mine, live }: { toast: PartyToast | null; status: string; mine: boolean; live: boolean }) {
  return (
    <div className="pg-strip" role="status">
      {toast ? (
        <p key={toast.key} className={cx('pg-toast', toast.tone)}>
          {toast.text}
        </p>
      ) : status ? (
        <p key={status} className={cx('pg-hint', mine && 'mine', live && 'live')}>
          {status}
        </p>
      ) : null}
    </div>
  );
}
