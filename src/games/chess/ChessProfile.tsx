import { useEffect, useState } from 'react';
import { cx } from '../../lib/cards';
import { errorText } from '../../lib/api';
import { FullPage } from '../../components/FullPage';
import type { ChessGameRecord, ChessGameSummary, ChessLeaderboard, ChessPerf, ChessRating, ChessRatingsResponse } from './contract';
import { CHESS_START_RATING, chessProvisional } from './contract';
import { PERFS } from './catalog';
import { RatingGraph } from './RatingGraph';
import { ChessGameList, ChessLeaders } from './ProfileLists';
import { ChessAnalysis } from './Analysis';
import '../../styles/chess-board.css';
import '../../styles/chess-lobby.css';
import '../../styles/chess-profile.css';

// Profile → Chess: a rating card per perf, its graph and record, recent games (tap to analyse) and the leaderboards

export interface ChessSource {
  ratings: () => Promise<ChessRatingsResponse>;
  leaderboard: (perf: ChessPerf) => Promise<ChessLeaderboard>;
  games: () => Promise<{ games: ChessGameSummary[] }>;
  game: (id: string) => Promise<{ game: ChessGameRecord }>;
}

type Tab = 'ratings' | 'games' | 'leaders';
const TABS: [Tab, string][] = [
  ['ratings', '📈 Ratings'],
  ['games', '♟️ Games'],
  ['leaders', '🏆 Leaders'],
];

export const ratingLabel = (r: Pick<ChessRating, 'r' | 'rd'>) => `${Math.round(r.r)}${chessProvisional(r.rd) ? '?' : ''}`;

export function ChessProfile({ source, myId, onClose }: { source: ChessSource; myId: string | null; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('ratings');
  const [perfs, setPerfs] = useState<ChessRatingsResponse['perfs'] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [perf, setPerf] = useState<ChessPerf>('blitz');
  const [open, setOpen] = useState<ChessGameRecord | null>(null);
  useEffect(() => {
    source.ratings().then(
      (r) => {
        setPerfs(r.perfs);
        // start on the perf played most
        const most = (Object.entries(r.perfs) as [ChessPerf, ChessRating][]).sort((a, b) => b[1].games - a[1].games)[0];
        if (most) setPerf(most[0]);
      },
      (e) => setErr(errorText(e)),
    );
  }, []);
  const openGame = (id: string) => source.game(id).then((r) => setOpen(r.game), (e) => setErr(errorText(e)));

  if (open) {
    const side = open.players.b.userId === myId ? 'b' : 'w';
    return (
      <ChessAnalysis
        game={{ variant: open.variant, initialFen: open.initialFen, moves: open.moves }}
        id={open.id}
        names={{ w: open.players.w.name, b: open.players.b.name }}
        orient={side}
        result={open.result.winner === 'w' ? '1-0' : open.result.winner === 'b' ? '0-1' : '1/2-1/2'}
        onClose={() => setOpen(null)}
      />
    );
  }
  return (
    <FullPage title="Chess" onBack={onClose}>
      <div className="ch-profile">
        <div className="ch-tabs" role="tablist">
          {TABS.map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} className={cx(tab === id && 'on')} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </div>
        {err && <p className="error-text">{err}</p>}
        {tab === 'ratings' && <Ratings perfs={perfs} perf={perf} onPerf={setPerf} />}
        {tab === 'games' && <ChessGameList source={source} myId={myId} onOpen={(id) => void openGame(id)} />}
        {tab === 'leaders' && <ChessLeaders source={source} perf={perf} onPerf={setPerf} myId={myId} />}
      </div>
    </FullPage>
  );
}

function Ratings({ perfs, perf, onPerf }: { perfs: ChessRatingsResponse['perfs'] | null; perf: ChessPerf; onPerf: (p: ChessPerf) => void }) {
  if (!perfs) return <p className="muted center">Loading…</p>;
  const fresh: ChessRating = { r: CHESS_START_RATING, rd: 500, vol: 0.09, games: 0, w: 0, l: 0, d: 0, peak: CHESS_START_RATING, streak: 0, bestStreak: 0, history: [], updatedAt: 0 };
  const sel = perfs[perf] ?? fresh;
  const info = PERFS.find((p) => p.id === perf)!;
  return (
    <>
      <div className="ch-perf-grid">
        {PERFS.map((p) => {
          const r = perfs[p.id];
          return (
            <button key={p.id} className={cx('ch-perf', p.id === perf && 'on', !r?.games && 'unplayed')} onClick={() => onPerf(p.id)} aria-pressed={p.id === perf}>
              <span className="ch-perf-icon" aria-hidden>
                {p.icon}
              </span>
              <small>{p.name}</small>
              <b>{r ? ratingLabel(r) : `${CHESS_START_RATING}?`}</b>
              <small className="muted">{`${r?.games ?? 0} games`}</small>
            </button>
          );
        })}
      </div>
      <section className="panel ch-perf-detail">
        <p className="ch-perf-head">
          <span>
            {info.icon} {info.name}
          </span>
          <b>{ratingLabel(sel)}</b>
        </p>
        {chessProvisional(sel.rd) && <p className="muted small">The "?" goes once your rating settles, after a few more rated games.</p>}
        <RatingGraph history={sel.history} />
        <div className="ch-record">
          <span>
            <b>{Math.round(sel.peak)}</b>
            <small>peak</small>
          </span>
          <span className="w">
            <b>{sel.w}</b>
            <small>won</small>
          </span>
          <span className="l">
            <b>{sel.l}</b>
            <small>lost</small>
          </span>
          <span>
            <b>{sel.d}</b>
            <small>drawn</small>
          </span>
          <span>
            <b>{`🔥${sel.streak}`}</b>
            <small>streak</small>
          </span>
          <span>
            <b>{sel.bestStreak}</b>
            <small>best streak</small>
          </span>
        </div>
      </section>
    </>
  );
}
