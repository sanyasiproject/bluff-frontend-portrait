import { useEffect, useState } from 'react';
import { cx } from '../lib/cards';
import { getVoiceGender, isSoundOn, onVoicesChanged, setVoiceGender, speakLine, unlockSpeech, voiceNames, type VoiceGender } from '../lib/speech';
import { LUDO_QUICK_MESSAGES, LUDO_QUICK_VOICE } from '../types';

const GENDERS: [VoiceGender, string][] = [
  ['female', 'Girl'],
  ['male', 'Boy'],
  ['cute', 'Cute 🎀'],
];

/** per-phone voice: Girl / Boy / Cute, a Ludo test line said with feeling, and the phone's voices */
export function VoiceSettings({ className }: { className?: string }) {
  const [gender, setGender] = useState<VoiceGender>(getVoiceGender);
  const [muted, setMuted] = useState(false);
  const [, refresh] = useState(0);
  useEffect(() => onVoicesChanged(() => refresh((n) => n + 1)), []);
  const names = voiceNames();

  const test = () => {
    unlockSpeech();
    setMuted(!isSoundOn());
    speakLine(LUDO_QUICK_VOICE[0], LUDO_QUICK_MESSAGES[0]);
  };
  const choose = (next: VoiceGender) => {
    setVoiceGender(next);
    setGender(next);
    test();
  };

  return (
    <section className={cx('panel voice-row voice-settings', className)}>
      <span className="label">🗣️ Voice</span>
      <div className="mini-seg" role="group" aria-label="Voice">
        {GENDERS.map(([g, label]) => (
          <button key={g} className={cx(gender === g && 'on')} aria-pressed={gender === g} onClick={() => choose(g)}>
            {label}
          </button>
        ))}
      </div>
      <button className="btn ghost small" onClick={test}>
        🔊 Test
      </button>
      {muted && !isSoundOn() && <p className="voice-note warn">Sound is off. Turn it on to hear the voice.</p>}
      <p className="voice-note muted small">{names.hi ? `Hindi: ${names.hi}` : 'No Hindi voice on this phone — lines are read in English letters'}</p>
    </section>
  );
}
