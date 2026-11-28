import type { PointerEvent as RPointerEvent } from 'react';
import { cx } from '../../lib/cards';
import type { PublicPlayer } from '../../types';
import type { ChatBubble } from '../../useBluff';
import { Avatar } from '../../components/Avatar';
import type { Color, Role } from './lib';
import { PieceSvg } from './pieces';
import { useChessLooks } from './looks';
import { clockText } from './viewState';

// One side's strip by the board: avatar, name, rating, material lead, check counter, pocket and clock

const POCKET_ORDER: Role[] = ['p', 'n', 'b', 'r', 'q'];

export interface PlayerCardProps {
  player?: PublicPlayer;
  name: string;
  color: Color;
  rating?: string;
  ratingDiff?: number;
  lead: { roles: Role[]; points: number };
  clock: number | null;
  active: boolean;
  checks?: number;
  pocket?: Partial<Record<string, number>>;
  /** my own pocket: tap or drag a piece to drop it */
  onPocketDown?: (role: Role, e: RPointerEvent) => void;
  pocketPick?: Role | null;
  bubble?: ChatBubble | null;
  onTap?: () => void;
  seatRef?: (el: HTMLElement | null) => void;
  offer?: string | null;
}

export function PlayerCard(p: PlayerCardProps) {
  const looks = useChessLooks();
  const low = p.clock !== null && p.clock < 10000;
  return (
    <div ref={p.seatRef} className={cx('ch-player', p.active && 'turn', `side-${p.color}`)} data-member={p.player?.id}>
      <button className="ch-who" onClick={p.onTap} disabled={!p.onTap} aria-label={p.onTap ? `Throw an emoji at ${p.name}` : p.name}>
        <Avatar name={p.name} avatar={p.player?.avatar} bot={p.player?.bot} size="sm" member={p.player?.id}>
          <i className={cx('ch-dot', p.color)} aria-hidden />
        </Avatar>
        <span className="ch-names">
          <b data-no-translate>{p.name}</b>
          <span className="ch-meta">
            {p.rating && <span className="ch-rating">{p.rating}</span>}
            {p.ratingDiff !== undefined && <span className={cx('ch-rdiff', p.ratingDiff >= 0 ? 'up' : 'down')}>{`${p.ratingDiff >= 0 ? '+' : ''}${p.ratingDiff}`}</span>}
            <span className="ch-lead" aria-label={p.lead.points ? `Up ${p.lead.points}` : undefined}>
              {p.lead.roles.map((r, i) => (
                <PieceSvg key={i} role={r} color={p.color === 'w' ? 'b' : 'w'} set={looks.pieces} className="ch-lead-piece" />
              ))}
              {p.lead.points > 0 && <small>+{p.lead.points}</small>}
            </span>
          </span>
        </span>
      </button>
      {p.checks !== undefined && (
        <span className="ch-checks" aria-label={`${p.checks} of 3 checks given`}>
          {[0, 1, 2].map((i) => (
            <i key={i} className={cx(i < p.checks! && 'on')} />
          ))}
        </span>
      )}
      {p.clock !== null && (
        <span className={cx('ch-clock', p.active && 'running', low && 'low')} role="timer" aria-label={`${p.name}'s clock`}>
          {clockText(p.clock)}
        </span>
      )}
      {p.pocket && (
        <div className="ch-pocket" aria-label={`${p.name}'s pocket`}>
          {POCKET_ORDER.map((r) => {
            const n = p.pocket?.[r] ?? 0;
            return (
              <button
                key={r}
                className={cx('ch-pocket-slot', !n && 'empty', p.pocketPick === r && 'on')}
                disabled={!n || !p.onPocketDown}
                onPointerDown={(e) => n && p.onPocketDown?.(r, e)}
                aria-label={`${n} ${r}`}
              >
                <PieceSvg role={r} color={p.color} set={looks.pieces} />
                {n > 1 && <b>{n}</b>}
              </button>
            );
          })}
        </div>
      )}
      {p.offer && <span className="ch-offer-tag">{p.offer}</span>}
      {p.bubble && (
        <span key={p.bubble.key} className="ch-bubble" data-no-translate>
          {p.bubble.text}
        </span>
      )}
    </div>
  );
}
