import { useState } from 'react';
import { cx } from '../../lib/cards';
import { ConfirmBox } from '../../components/ConfirmBox';
import type { Color } from './lib';
import type { ChessView } from './contract';
import type { ChessTableState } from './useChessTable';
import { ChessLooksSheet } from './LooksSheet';
import { other } from './viewState';

// Under the board: resign, draw, takeback, abort, flip and sound; offer banners; the confirm-move bar

export function OfferBanner({ cv, me, nameOf, s }: { cv: ChessView; me: Color | null; nameOf: (c: Color) => string; s: ChessTableState }) {
  if (!me || cv.status !== 'playing') return null;
  const them = other(me);
  if (cv.drawOffer === them)
    return (
      <div className="ch-offer" role="alert">
        <span>{`🤝 ${nameOf(them)} offers a draw`}</span>
        <button className="btn small ghost" onClick={() => void s.send({ type: 'draw', offer: false })}>
          Decline
        </button>
        <button className="btn small primary" onClick={() => void s.send({ type: 'draw', offer: true })}>
          Accept
        </button>
      </div>
    );
  if (cv.takebackOffer === them)
    return (
      <div className="ch-offer" role="alert">
        <span>{`↩️ ${nameOf(them)} asks for a takeback`}</span>
        <button className="btn small ghost" onClick={() => void s.send({ type: 'takeback', accept: false })}>
          No
        </button>
        <button className="btn small primary" onClick={() => void s.send({ type: 'takeback', accept: true })}>
          Allow
        </button>
      </div>
    );
  if (cv.drawOffer === me || cv.takebackOffer === me)
    return (
      <div className="ch-offer mine" role="status">
        <span>{cv.drawOffer === me ? '🤝 Draw offered…' : '↩️ Takeback asked…'}</span>
        {cv.drawOffer === me && (
          <button className="btn small ghost" onClick={() => void s.send({ type: 'draw', offer: false })}>
            Cancel
          </button>
        )}
      </div>
    );
  return null;
}

export function ConfirmMoveBar({ s }: { s: ChessTableState }) {
  if (!s.pending || !s.pos) return null;
  return (
    <div className="ch-offer confirm" role="alert">
      <span data-no-translate>{`Play ${s.pos.san(s.pending)}?`}</span>
      <button className="btn small ghost" onClick={s.cancelPending} aria-label="Cancel move">
        ✕
      </button>
      <button className="btn small primary" onClick={s.confirmPending} aria-label="Confirm move">
        ✓ Play
      </button>
    </div>
  );
}

export function ChessControls({ cv, s, sound, onSound, onAnalyse }: { cv: ChessView; s: ChessTableState; sound: boolean; onSound: () => void; onAnalyse?: () => void }) {
  const [ask, setAsk] = useState<'resign' | 'looks' | null>(null);
  const me = s.me;
  const playing = s.playing && !!me;
  const canAbort = playing && cv.moves.length < 2;
  const drawn = cv.drawOffer === me;
  return (
    <div className="ch-controls">
      {playing &&
        (canAbort ? (
          <button className="ch-ctl" onClick={() => void s.send({ type: 'abort' })}>
            <span aria-hidden>✖️</span>
            <small>Abort</small>
          </button>
        ) : (
          <button className="ch-ctl danger" onClick={() => setAsk('resign')}>
            <span aria-hidden>🏳️</span>
            <small>Resign</small>
          </button>
        ))}
      {playing && !canAbort && (
        <button className={cx('ch-ctl', drawn && 'on')} disabled={drawn} onClick={() => void s.send({ type: 'draw', offer: true })}>
          <span aria-hidden>🤝</span>
          <small>{drawn ? 'Offered' : 'Draw'}</small>
        </button>
      )}
      {playing && !cv.rated && cv.moves.length > 0 && (
        <button className="ch-ctl" disabled={!!cv.takebackOffer} onClick={() => void s.send({ type: 'takeback' })}>
          <span aria-hidden>↩️</span>
          <small>Takeback</small>
        </button>
      )}
      {onAnalyse && (
        <button className="ch-ctl" onClick={onAnalyse}>
          <span aria-hidden>🔍</span>
          <small>Analyse</small>
        </button>
      )}
      <button className="ch-ctl" onClick={s.flip} aria-label="Flip the board">
        <span aria-hidden>🔄</span>
        <small>Flip</small>
      </button>
      <button className="ch-ctl" onClick={() => setAsk('looks')} aria-label="Board and pieces">
        <span aria-hidden>🎨</span>
        <small>Board</small>
      </button>
      <button className="ch-ctl" onClick={onSound} aria-pressed={sound} aria-label={sound ? 'Sound on' : 'Sound off'}>
        <span aria-hidden>{sound ? '🔊' : '🔇'}</span>
        <small>Sound</small>
      </button>
      {ask === 'looks' && <ChessLooksSheet onClose={() => setAsk(null)} />}
      {ask === 'resign' && (
        <ConfirmBox
          title="Resign this game?"
          body={cv.rated ? 'It counts as a loss and your rating moves.' : 'It counts as a loss.'}
          action="Resign"
          onConfirm={() => (setAsk(null), void s.send({ type: 'resign' }))}
          onCancel={() => setAsk(null)}
        />
      )}
    </div>
  );
}
