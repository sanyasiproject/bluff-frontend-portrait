import { useEffect, useMemo, useRef, useState } from 'react';
import { cx } from '../../lib/cards';
import { useNow } from '../../lib/useNow';
import { sfx, unlockAudio } from '../../lib/sounds';
import { useOnChange } from '../../components/Table';
import { WORDHUNT_COUNTDOWN_MS, WORDHUNT_REVEAL_MS, type WordHuntVerdict, type WordHuntView } from '../../types';
import type { PluggedTableProps } from '../registry';
import { PartyChips, PartyEnd, partyColor, partyOrder, PartyTopbar, usePartyTable } from '../dots/party';
import { LetterGrid, pathWord, type GridFlash } from './Grid';
import { WordReveal } from './Reveal';
import { WordHuntPodium } from './Podium';
import '../../styles/ludo.css';
import '../../styles/pgames.css';
import '../../styles/wordhunt.css';

export function WordHuntTable(props: PluggedTableProps) {
  const wv = props.view.plugged?.kind === 'wordhunt' ? props.view.plugged.wordhunt : null;
  if (!wv) return <main className="screen center-screen">Shaking the letters…</main>;
  return <WordHuntInner {...props} wv={wv} />;
}

/** the round's time left as a ring */
function TimerRing({ left, total }: { left: number; total: number }) {
  const r = 19;
  const len = 2 * Math.PI * r;
  const f = total > 0 ? Math.max(0, Math.min(1, left / total)) : 0;
  const secs = Math.ceil(left / 1000);
  return (
    <div className={cx('wh-timer', secs <= 10 && 'low')} role="timer" aria-label={`${secs} seconds left`}>
      <svg viewBox="0 0 46 46">
        <circle className="track" cx="23" cy="23" r={r} />
        <circle className="fill" cx="23" cy="23" r={r} strokeDasharray={len} strokeDashoffset={len * (1 - f)} />
      </svg>
      <b>{secs}</b>
    </div>
  );
}

interface Said {
  key: number;
  text: string;
  tone: 'good' | 'bad' | 'dup';
  points?: number;
}

function WordHuntInner({ view, actions, bubbles, auth, wv }: PluggedTableProps & { wv: WordHuntView }) {
  const t = usePartyTable(view);
  const order = partyOrder(view, Object.keys(wv.scores));
  const colorOf = (id: string | null | undefined) => partyColor(order, id);
  const skew = useMemo(() => Date.now() - wv.now, [wv.now]);
  const now = useNow(200);
  const [path, setPath] = useState<number[]>([]);
  const [said, setSaid] = useState<Said | null>(null);
  const [flash, setFlash] = useState<GridFlash | null>(null);
  const seq = useRef(0);
  const mineSet = useMemo(() => new Set(wv.mine.map((w) => w.word)), [wv.mine]);
  const pending = useRef(new Set<string>());
  // the last round's words show before the podium
  const [finalSeen, setFinalSeen] = useState(false);
  const finalReveal = wv.phase === 'over' && !!wv.reveal && !finalSeen && !view.stopped;
  useEffect(() => {
    if (!finalReveal) return;
    const id = window.setTimeout(() => setFinalSeen(true), 10_000);
    return () => window.clearTimeout(id);
  }, [finalReveal]);

  const playing = t.playing && wv.phase === 'play';
  const ends = (wv.phase === 'countdown' ? wv.startsAt : wv.phase === 'reveal' ? (wv.nextAt ?? wv.endsAt) : wv.endsAt) + skew;
  const left = Math.max(0, ends - now);
  const total = wv.phase === 'countdown' ? WORDHUNT_COUNTDOWN_MS : wv.phase === 'reveal' ? WORDHUNT_REVEAL_MS : wv.endsAt - wv.startsAt;
  const secs = Math.ceil(left / 1000);
  useOnChange(playing ? secs : null, (s) => {
    if (s !== null && s <= 10 && s > 0) sfx.wordTick();
  });
  useOnChange(wv.phase, (p) => {
    setPath([]);
    if (p === 'play') {
      sfx.turn();
      navigator.vibrate?.(60);
    }
  });
  useEffect(() => {
    if (!said) return;
    const id = window.setTimeout(() => setSaid(null), 1100);
    return () => window.clearTimeout(id);
  }, [said]);
  useEffect(() => {
    if (!flash) return;
    const id = window.setTimeout(() => setFlash(null), 650);
    return () => window.clearTimeout(id);
  }, [flash]);

  const show = (p: number[], text: string, tone: Said['tone'], points?: number) => {
    const key = ++seq.current;
    setSaid({ key, text, tone, points });
    setFlash({ key, path: p, tone });
  };
  const verdict = (p: number[], word: string, v: WordHuntVerdict, points: number) => {
    if (v === 'ok') {
      sfx.wordGood();
      return show(p, word, 'good', points);
    }
    if (v === 'again') return show(p, word, 'dup');
    sfx.wordBad();
    navigator.vibrate?.([30, 40, 30]);
    show(p, word, 'bad');
  };
  // the server's answer to each word I send
  useOnChange(wv.lastTry?.seq ?? null, () => {
    const l = wv.lastTry;
    if (!l) return;
    pending.current.delete(l.word);
    verdict(l.path, l.word, l.verdict, l.points);
  });
  const onWord = async (p: number[]) => {
    unlockAudio();
    const word = pathWord(wv.grid, p);
    if (p.length < 2) return;
    if (word.length < wv.minLen) return verdict(p, word, 'short', 0);
    if (mineSet.has(word) || pending.current.has(word)) return verdict(p, word, 'again', 0);
    pending.current.add(word);
    const err = await actions.gameMoveTry({ kind: 'wordhunt', move: { type: 'word', round: wv.round, path: p } });
    if (!err) return;
    pending.current.delete(word);
    verdict(p, word, 'unknown', 0);
  };

  const word = pathWord(wv.grid, path);
  // finished rounds plus this round's words so far (the unique bonus lands at the reveal)
  const myScore = (wv.scores[view.meId] ?? 0) + (wv.phase === 'play' || wv.phase === 'countdown' ? wv.mine.reduce((a, w) => a + w.points, 0) : 0);
  const lead = Math.max(0, ...Object.values(wv.scores));
  const minLine = `${wv.minLen}+ letters`;
  return (
    <main className={cx('table ld-table pg-table wh-table', `n${wv.size}`)}>
      <PartyTopbar t={t} view={view} actions={actions} chip={<>🔤<span>{` Word Grid Hunt · ${wv.round}/${wv.rounds}`}</span></>} />

      <PartyChips
        t={t}
        view={view}
        bubbles={bubbles}
        order={order}
        colorOf={colorOf}
        turnId={null}
        tag={(id) => (
          <>
            <b key={wv.scores[id] ?? 0} className={cx('pg-num bump', (wv.scores[id] ?? 0) > 0 && wv.scores[id] === lead && 'lead')}>
              {wv.scores[id] ?? 0}
            </b>
            <span className="wh-count">{`📝${id === view.meId ? wv.mine.length : (wv.counts[id] ?? 0)}`}</span>
          </>
        )}
      />

      <div className="wh-head">
        {wv.phase === 'over' ? <span /> : <TimerRing left={left} total={total} />}
        <div className="wh-word-box" aria-live="polite">
          {path.length > 0 ? (
            <p className={cx('wh-word', word.length >= wv.minLen && 'ok')} data-no-translate>
              {word.toUpperCase()}
            </p>
          ) : said ? (
            <p key={said.key} className={cx('wh-word', 'said', said.tone)} data-no-translate>
              {said.text.toUpperCase()}
              {said.tone === 'good' && <b className="wh-plus">{`+${said.points}`}</b>}
            </p>
          ) : (
            <p className="wh-word-hint">{wv.phase === 'countdown' ? `Round ${wv.round} starts…` : playing && !t.watching ? `Drag through touching letters · ${minLine}` : t.watching ? 'Watching: words show at the round end' : ''}</p>
          )}
        </div>
        <div className="wh-mine-score" aria-label="Your points">
          <small>{t.watching ? 'Round' : 'Points'}</small>
          <b>{t.watching ? `${wv.round}/${wv.rounds}` : myScore}</b>
        </div>
      </div>

      <div className="pg-stage wh-stage">
        <LetterGrid grid={wv.grid} size={wv.size} live={playing && !t.watching} hidden={wv.phase === 'countdown'} flash={flash} onPath={setPath} onWord={(p) => void onWord(p)} />
        {wv.phase === 'countdown' && (
          <div className="wh-count-in" key={secs}>
            {secs}
          </div>
        )}
        {(wv.phase === 'reveal' || finalReveal) && <WordReveal wv={wv} order={order} colorOf={colorOf} name={(id) => t.name(id)} meId={view.meId} secsLeft={secs} onNext={finalReveal ? () => setFinalSeen(true) : undefined} />}
      </div>

      <div className="pg-foot wh-foot">
        {!t.watching && (
          <div className="wh-mine" aria-label="Your words">
            {wv.mine.length === 0 ? (
              <span className="wh-empty">Your words show here</span>
            ) : (
              [...wv.mine].reverse().map((w) => (
                <span key={w.word} className={cx('wh-chip', said?.tone === 'dup' && said.text === w.word && 'dup')} data-no-translate>
                  {w.word}
                  <small>{`+${w.points}`}</small>
                </span>
              ))
            )}
          </div>
        )}
      </div>
      <p className="ld-sixes pg-rules-line">{`${minLine} · ${wv.minLen <= 3 ? '3–4' : '4'} = 1 · 5 = 2 · 6 = 3 · 7 = 5 · 8+ = 11 · only you = ×2`}</p>

      <PartyEnd t={t} view={view} actions={actions} auth={auth} podium={finalReveal ? null : <WordHuntPodium view={view} wv={wv} order={order} onDone={() => t.setPodiumDone(true)} />} />
    </main>
  );
}
