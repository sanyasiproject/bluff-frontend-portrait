import { useState } from 'react';
import { cx } from '../../lib/cards';
import type { GameConfig, PublicPlayer } from '../../types';
import { Backdrop } from '../../components/Overlays';
import { CHESS_VARIANTS, type ChessVariant } from './lib';
import { CHESS_TIMES, SPEEDS, speedOf, timeLabel, VARIANT_ICON, VARIANT_LINE } from './catalog';
import { DIAGRAMS } from './diagrams';
import { CHESS_BOT_LEVELS } from './contract';
import { MiniBoard } from './MiniBoard';
import '../../styles/chess-board.css';
import '../../styles/chess-lobby.css';

// The lobby's chess settings: variant (with a diagram), time grouped by speed, rated, and the host's colour

type Val = string | number | boolean;
const opt = (config: Pick<GameConfig, 'opts'>, id: string, def: string): string => {
  const v = config.opts?.[id];
  return typeof v === 'string' ? v : def;
};

/** why a game can't be rated right now, or null when it can */
export function ratedBlock(time: string, players: Pick<PublicPlayer, 'bot' | 'registered'>[]): string | null {
  if (time === 'none') return 'Rated games need a clock';
  if (players.some((p) => p.bot)) return 'No bots in rated games';
  if (players.some((p) => !p.registered)) return 'Both players need an account';
  return null;
}

export function ChessOptions({ config, players, onPick }: { config: Pick<GameConfig, 'opts'>; players: PublicPlayer[]; onPick: (id: string, value: Val) => void }) {
  const [picking, setPicking] = useState(false);
  const variant = opt(config, 'variant', 'standard') as ChessVariant;
  const time = opt(config, 'time', '5+0');
  const rated = opt(config, 'rated', 'no') === 'yes';
  const color = opt(config, 'color', 'random');
  const level = typeof config.opts?.level === 'number' ? config.opts.level : 3;
  const v = CHESS_VARIANTS.find((x) => x.id === variant) ?? CHESS_VARIANTS[0];
  const block = ratedBlock(time, players);
  const groups = SPEEDS.map((s) => ({ ...s, times: CHESS_TIMES.filter((t) => speedOf(t) === s.id) }));

  return (
    <div className="ch-opts">
      <p className="label">Variant</p>
      <button className="ch-variant-btn" onClick={() => setPicking(true)} aria-label={`Variant: ${v.name}. Change`}>
        <MiniBoard fen={DIAGRAMS[variant].fen} marks={DIAGRAMS[variant].marks} />
        <span className="grow">
          <b>
            {VARIANT_ICON[variant]} {v.name}
          </b>
          <small>{VARIANT_LINE[variant]}</small>
        </span>
        <span className="ch-change">Change</span>
      </button>

      <p className="label">Time</p>
      <div className="ch-times">
        {groups.map((g) => (
          <div key={g.id} className="ch-time-row">
            <span className="ch-speed">
              {g.icon} {g.name}
            </span>
            <div className="mini-seg" role="group" aria-label={g.name}>
              {g.times.map((t) => (
                <button key={t} className={cx(t === time && 'on')} aria-pressed={t === time} onClick={() => t !== time && onPick('time', t)}>
                  {timeLabel(t)}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="setting-row stacked">
        <div className="grow">
          <b>📈 Rated</b>
          <span>{block ?? (rated ? 'Ratings move after the game' : 'Casual: ratings stay as they are')}</span>
        </div>
        <div className="mini-seg" role="group" aria-label="Rated">
          <button className={cx(!rated && 'on')} aria-pressed={!rated} onClick={() => rated && onPick('rated', 'no')}>
            Casual
          </button>
          <button className={cx(rated && !block && 'on')} aria-pressed={rated && !block} disabled={!!block} onClick={() => !rated && onPick('rated', 'yes')}>
            Rated
          </button>
        </div>
      </div>

      {players.some((p) => p.bot) && (
        <div className="setting-row stacked">
          <div className="grow">
            <b>🤖 Bot level</b>
            <span>{`Plays at about ${CHESS_BOT_LEVELS.find((l) => l.level === level)?.elo ?? 1400}`}</span>
          </div>
          <div className="mini-seg ch-levels" role="group" aria-label="Bot level">
            {CHESS_BOT_LEVELS.map((l) => (
              <button key={l.level} className={cx(l.level === level && 'on')} aria-pressed={l.level === level} onClick={() => l.level !== level && onPick('level', l.level)}>
                {l.level}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="setting-row stacked">
        <div className="grow">
          <b>🎨 Your colour</b>
          <span>{color === 'random' ? 'Picked at random' : `You play ${color === 'white' ? 'White' : 'Black'}`}</span>
        </div>
        <div className="mini-seg" role="group" aria-label="Your colour">
          {(
            [
              ['random', '🎲 Random'],
              ['white', '⚪ White'],
              ['black', '⚫ Black'],
            ] as const
          ).map(([id, label]) => (
            <button key={id} className={cx(id === color && 'on')} aria-pressed={id === color} onClick={() => id !== color && onPick('color', id)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {picking && <VariantSheet value={variant} onPick={(id) => (setPicking(false), id !== variant && onPick('variant', id))} onClose={() => setPicking(false)} />}
    </div>
  );
}

/** all 9 variants, each with its diagram and one line */
function VariantSheet({ value, onPick, onClose }: { value: ChessVariant; onPick: (v: ChessVariant) => void; onClose: () => void }) {
  return (
    <Backdrop onClose={onClose}>
      <div className="ch-variant-sheet">
        <h3>Pick a variant</h3>
        <div className="ch-variant-list">
          {CHESS_VARIANTS.map((x) => (
            <button key={x.id} className={cx('ch-variant-item', x.id === value && 'on')} aria-pressed={x.id === value} onClick={() => onPick(x.id)}>
              <MiniBoard fen={DIAGRAMS[x.id].fen} marks={DIAGRAMS[x.id].marks} />
              <b>
                {VARIANT_ICON[x.id]} {x.name}
              </b>
              <small>{VARIANT_LINE[x.id]}</small>
            </button>
          ))}
        </div>
      </div>
    </Backdrop>
  );
}
