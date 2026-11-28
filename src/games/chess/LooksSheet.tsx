import type { CSSProperties } from 'react';
import { cx } from '../../lib/cards';
import { Backdrop } from '../../components/Overlays';
import { PieceSvg } from './pieces';
import { BOARD_THEMES, PIECE_SETS, setChessLooks, useChessLooks } from './looks';

// Chess looks and settings (per phone): board theme, piece set, confirm move, coordinates

export function ChessLooksSheet({ onClose }: { onClose: () => void }) {
  const looks = useChessLooks();
  return (
    <Backdrop onClose={onClose}>
      <div className="ch-looks">
        <h3>🎨 Board and pieces</h3>
        <p className="label">Board</p>
        <div className="ch-look-row">
          {BOARD_THEMES.map((t) => (
            <button key={t.id} className={cx('ch-look', looks.board === t.id && 'on')} aria-pressed={looks.board === t.id} onClick={() => setChessLooks({ board: t.id })}>
              <i className={cx('ch-look-board', `cb-${t.id}`)} style={{ '--cb-light': t.light, '--cb-dark': t.dark } as CSSProperties} />
              <small>{t.name}</small>
            </button>
          ))}
        </div>
        <p className="label">Pieces</p>
        <div className="ch-look-row">
          {PIECE_SETS.map((s) => (
            <button key={s.id} className={cx('ch-look', looks.pieces === s.id && 'on')} aria-pressed={looks.pieces === s.id} onClick={() => setChessLooks({ pieces: s.id })}>
              <span className="ch-look-pieces">
                <PieceSvg role="n" color="w" set={s.id} />
                <PieceSvg role="q" color="b" set={s.id} />
              </span>
              <small>{s.name}</small>
            </button>
          ))}
        </div>
        <div className="setting-row">
          <div className="grow">
            <b>✋ Confirm moves</b>
            <span>Tap ✓ before a move is sent</span>
          </div>
          <div className="mini-seg">
            <button className={cx(!looks.confirm && 'on')} onClick={() => setChessLooks({ confirm: false })}>
              Off
            </button>
            <button className={cx(looks.confirm && 'on')} onClick={() => setChessLooks({ confirm: true })}>
              On
            </button>
          </div>
        </div>
        <div className="setting-row">
          <div className="grow">
            <b>🔤 Coordinates</b>
            <span>Letters and numbers on the board edge</span>
          </div>
          <div className="mini-seg">
            <button className={cx(!looks.coords && 'on')} onClick={() => setChessLooks({ coords: false })}>
              Off
            </button>
            <button className={cx(looks.coords && 'on')} onClick={() => setChessLooks({ coords: true })}>
              On
            </button>
          </div>
        </div>
      </div>
    </Backdrop>
  );
}
