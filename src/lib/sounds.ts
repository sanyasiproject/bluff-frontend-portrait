import { isSoundOn } from './speech';

// Short game sounds made with Web Audio, so there are no sound files to download
type AudioCtor = typeof AudioContext;
const Ctor: AudioCtor | undefined =
  window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;

let ctx: AudioContext | null = null;

/** phones only allow sound after a tap, so the audio starts (or resumes) on a tap */
export function unlockAudio(): void {
  if (!Ctor) return;
  ctx ??= new Ctor();
  if (ctx.state !== 'running') void ctx.resume().catch(() => undefined);
}

/** the unlocked audio, whether or not game sounds are on (voice notes check their own switches) */
export const liveAudio = (): AudioContext | null => (ctx?.state === 'running' ? ctx : null);

function audio(): AudioContext | null {
  return isSoundOn() && ctx?.state === 'running' ? ctx : null;
}

interface ToneOptions {
  type?: OscillatorType;
  gain?: number;
  /** slide to this pitch by the end */
  to?: number;
}

function tone(c: AudioContext, freq: number, at: number, dur: number, { type = 'sine', gain = 0.16, to }: ToneOptions = {}) {
  const t = c.currentTime + at;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

/** a short burst of filtered noise, like a card hitting the table */
function slap(c: AudioContext, at: number, gain = 0.55) {
  const t = c.currentTime + at;
  const length = Math.floor(c.sampleRate * 0.07);
  const buffer = c.createBuffer(1, length, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1600;
  filter.Q.value = 0.7;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(filter).connect(g).connect(c.destination);
  src.start(t);
}

const notes = (c: AudioContext, freqs: number[], step: number, dur: number, opts?: ToneOptions) =>
  freqs.forEach((f, i) => tone(c, f, i * step, dur, opts));

/** a wooden knock: a short low thump plus a click, like a piece set down on a board */
function knock(c: AudioContext, at: number, freq = 190, gain = 0.5) {
  const t = c.currentTime + at;
  const length = Math.floor(c.sampleRate * 0.05);
  const buffer = c.createBuffer(1, length, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 4;
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 2400;
  const g = c.createGain();
  g.gain.value = gain * 0.6;
  src.connect(filter).connect(g).connect(c.destination);
  src.start(t);
  tone(c, freq, at, 0.09, { type: 'sine', gain: gain * 0.5, to: freq * 0.6 });
}

export const sfx = {
  /** a friend came online, a soft two-note chime */
  friendOnline() {
    const c = audio();
    if (c) notes(c, [784, 1047], 0.12, 0.28, { gain: 0.07 });
  },
  /** cards put down; one slap per card, up to four */
  play(count: number) {
    const c = audio();
    if (c) for (let i = 0; i < Math.min(count, 4); i++) slap(c, i * 0.07);
  },
  pass() {
    const c = audio();
    if (c) tone(c, 420, 0, 0.12, { type: 'triangle', gain: 0.08, to: 300 });
  },
  turn() {
    const c = audio();
    if (c) notes(c, [880, 1320], 0.09, 0.16, { gain: 0.12 });
  },
  deal() {
    const c = audio();
    if (c) for (let i = 0; i < 8; i++) slap(c, i * 0.06, 0.35);
  },
  caught() {
    const c = audio();
    if (c) {
      tone(c, 200, 0, 0.22, { type: 'sawtooth', gain: 0.1 });
      tone(c, 150, 0.24, 0.4, { type: 'sawtooth', gain: 0.1, to: 110 });
    }
  },
  truth() {
    const c = audio();
    if (c) notes(c, [660, 990], 0.1, 0.3, { gain: 0.12 });
  },
  win() {
    const c = audio();
    if (c) notes(c, [523, 659, 784, 1047], 0.11, 0.32, { type: 'triangle', gain: 0.14 });
  },
  lose() {
    const c = audio();
    if (c) notes(c, [392, 330, 262], 0.18, 0.4, { type: 'triangle', gain: 0.12 });
  },
  /** Crazy 7: a 7 hits the pile, a short sting */
  seven() {
    const c = audio();
    if (c) {
      slap(c, 0, 0.6);
      notes(c, [784, 1175, 1568], 0.07, 0.22, { type: 'square', gain: 0.07 });
      tone(c, 220, 0.18, 0.3, { type: 'sawtooth', gain: 0.08, to: 140 });
    }
  },
  /** Crazy 7: a card slides off the deck */
  draw() {
    const c = audio();
    if (c) {
      slap(c, 0, 0.3);
      tone(c, 520, 0.02, 0.1, { type: 'triangle', gain: 0.05, to: 700 });
    }
  },
  /** Crazy 7: the pile is shuffled back into the deck, a quick riffle */
  shuffle() {
    const c = audio();
    if (c) for (let i = 0; i < 10; i++) slap(c, i * 0.035, 0.22);
  },
  /** Crazy 7: someone said "last card", a bright bell */
  lastCard() {
    const c = audio();
    if (c) notes(c, [1319, 1760, 2093], 0.09, 0.5, { type: 'sine', gain: 0.11 });
  },
  /** someone is down to one card: two soft heartbeats */
  heartbeat() {
    const c = audio();
    if (!c) return;
    for (const at of [0, 0.62]) {
      tone(c, 74, at, 0.13, { type: 'sine', gain: 0.32, to: 52 });
      tone(c, 62, at + 0.17, 0.15, { type: 'sine', gain: 0.24, to: 44 });
    }
  },
  /** level up: a quick rising fanfare */
  levelUp() {
    const c = audio();
    if (c) {
      notes(c, [523, 659, 784, 1047, 1319], 0.08, 0.28, { type: 'triangle', gain: 0.12 });
      tone(c, 1568, 0.42, 0.5, { type: 'sine', gain: 0.09 });
    }
  },
  /** host only: someone is at the door asking to watch */
  knock() {
    const c = audio();
    if (c) notes(c, [988, 1319, 988], 0.12, 0.18, { type: 'sine', gain: 0.1 });
  },
  /** Ludo: the dice rattles and lands */
  ludoRoll() {
    const c = audio();
    if (!c) return;
    for (let i = 0; i < 6; i++) slap(c, i * 0.075 + Math.random() * 0.02, 0.28 - i * 0.03);
    slap(c, 0.56, 0.5);
  },
  /** Ludo: a goti hops one square */
  ludoHop(step = 0) {
    const c = audio();
    if (c) tone(c, 620 + step * 40, 0, 0.07, { type: 'triangle', gain: 0.07, to: 820 + step * 40 });
  },
  /** Ludo: a goti knocked off, a thump and a falling sting */
  ludoKill() {
    const c = audio();
    if (!c) return;
    slap(c, 0, 0.8);
    tone(c, 330, 0.02, 0.35, { type: 'sawtooth', gain: 0.09, to: 90 });
    notes(c, [988, 1319], 0.08, 0.16, { type: 'square', gain: 0.05 });
  },
  /** Ludo: a goti reached home, a bright chord */
  ludoHome() {
    const c = audio();
    if (c) notes(c, [784, 988, 1175, 1568], 0.07, 0.4, { type: 'triangle', gain: 0.11 });
  },
  /** Ludo: a bonus roll */
  ludoBonus() {
    const c = audio();
    if (c) notes(c, [1047, 1397], 0.08, 0.2, { gain: 0.1 });
  },
  /** the host's "get ready" buzz: a quick double ring that rises */
  nudge() {
    const c = audio();
    if (!c) return;
    notes(c, [988, 1319, 988, 1319], 0.08, 0.12, { type: 'square', gain: 0.06 });
    tone(c, 1568, 0.36, 0.2, { gain: 0.1 });
    tone(c, 2093, 0.46, 0.28, { gain: 0.1 });
  },
  /** Ludo: three sixes, the turn is lost */
  ludoOops() {
    const c = audio();
    if (c) notes(c, [523, 415, 311], 0.13, 0.26, { type: 'sawtooth', gain: 0.07 });
  },
  /** Saanp Seedhi: climbing a ladder, rising steps */
  ladderClimb() {
    const c = audio();
    if (c) notes(c, [523, 587, 659, 784, 880, 1047], 0.09, 0.14, { type: 'triangle', gain: 0.09 });
  },
  /** Saanp Seedhi: sliding down a snake, a long falling whistle */
  snakeSlide() {
    const c = audio();
    if (!c) return;
    tone(c, 1200, 0, 0.9, { type: 'sine', gain: 0.1, to: 180 });
    tone(c, 900, 0.05, 0.85, { type: 'triangle', gain: 0.05, to: 140 });
  },
  /** Saanp Seedhi: a player bitten back, a snap and a hiss */
  snakeBite() {
    const c = audio();
    if (!c) return;
    slap(c, 0, 0.7);
    slap(c, 0.05, 0.4);
    tone(c, 440, 0.02, 0.3, { type: 'sawtooth', gain: 0.07, to: 160 });
  },
  /** Raja Mantri: chits land in front of each player */
  chitDeal() {
    const c = audio();
    if (c) for (let i = 0; i < 4; i++) slap(c, i * 0.12, 0.22);
  },
  /** Raja Mantri: a chit unfolds */
  chitOpen() {
    const c = audio();
    if (!c) return;
    slap(c, 0, 0.18);
    tone(c, 700, 0.04, 0.12, { type: 'triangle', gain: 0.06, to: 1100 });
  },
  /** Raja Mantri: the Raja shows himself, a fanfare */
  rajaShown() {
    const c = audio();
    if (c) notes(c, [523, 659, 784, 1047], 0.1, 0.3, { type: 'square', gain: 0.05 });
  },
  /** Raja Mantri: the Chor is caught, a siren */
  chorCaught() {
    const c = audio();
    if (!c) return;
    for (let i = 0; i < 3; i++) {
      tone(c, 700, i * 0.36, 0.18, { type: 'square', gain: 0.05, to: 1100 });
      tone(c, 1100, i * 0.36 + 0.18, 0.18, { type: 'square', gain: 0.05, to: 700 });
    }
  },
  /** Raja Mantri: the Chor gets away, a cheeky run of notes */
  chorEscaped() {
    const c = audio();
    if (c) notes(c, [784, 659, 784, 988, 1319], 0.07, 0.12, { type: 'triangle', gain: 0.08 });
  },
  /** Arcade: a countdown beep, higher on GO */
  arcadeBeep(go = false) {
    const c = audio();
    if (c) tone(c, go ? 1175 : 660, 0, go ? 0.35 : 0.14, { type: 'square', gain: 0.06 });
  },
  /** Arcade: a clock tick in the last seconds */
  arcadeTick(high = false) {
    const c = audio();
    if (c) tone(c, high ? 1500 : 1100, 0, 0.05, { type: 'square', gain: 0.04 });
  },
  /** Fruit: the blade cuts a fruit, a swish and a wet splat */
  fruitSlice() {
    const c = audio();
    if (!c) return;
    tone(c, 1800, 0, 0.09, { type: 'sawtooth', gain: 0.03, to: 500 });
    slap(c, 0.02, 0.3);
  },
  /** Fruit: a bomb goes off */
  fruitBomb() {
    const c = audio();
    if (!c) return;
    slap(c, 0, 0.9);
    slap(c, 0.04, 0.7);
    tone(c, 160, 0, 0.6, { type: 'sawtooth', gain: 0.14, to: 40 });
  },
  /** Fruit: three or more in one swipe, rising notes */
  fruitCombo(n = 3) {
    const c = audio();
    if (c) notes(c, [784, 988, 1175, 1568].slice(0, Math.min(4, n - 1)), 0.06, 0.16, { type: 'triangle', gain: 0.09 });
  },
  /** Fruit duel: my sword swings, a sharp swish (a dull slow one while a magnet holds it) */
  swordSwing(slow = false) {
    const c = audio();
    if (c) tone(c, slow ? 700 : 2600, 0, slow ? 0.32 : 0.12, { type: 'sawtooth', gain: 0.035, to: slow ? 180 : 600 });
  },
  /** Fruit duel: the blade bites through, a bright metal "shing" */
  swordShing() {
    const c = audio();
    if (!c) return;
    tone(c, 3200, 0, 0.28, { type: 'triangle', gain: 0.05, to: 2600 });
    tone(c, 4700, 0.005, 0.22, { type: 'sine', gain: 0.03, to: 4100 });
    tone(c, 1900, 0, 0.08, { type: 'sawtooth', gain: 0.025, to: 700 });
  },
  /** Fruit duel: a magnet was struck, a buzzing zap */
  magnetZap() {
    const c = audio();
    if (!c) return;
    tone(c, 140, 0, 0.4, { type: 'square', gain: 0.07, to: 70 });
    tone(c, 1200, 0.02, 0.18, { type: 'sawtooth', gain: 0.03, to: 300 });
  },
  /** Fruit duel: a tap before anything showed, a little "nope" */
  tooEarly() {
    const c = audio();
    if (c) notes(c, [330, 262], 0.07, 0.1, { type: 'triangle', gain: 0.06 });
  },
  /** Spikes: a little hop */
  spikeStep() {
    const c = audio();
    if (c) tone(c, 520, 0, 0.07, { type: 'triangle', gain: 0.06, to: 780 });
  },
  /** Spikes: a warning shows, a low alarm */
  spikeWarn() {
    const c = audio();
    if (c) tone(c, 330, 0, 0.22, { type: 'square', gain: 0.045, to: 220 });
  },
  /** Spikes: the tick as a strike nears; urgency 0..1 raises the pitch */
  spikeTick(urgency = 0) {
    const c = audio();
    if (c) tone(c, 700 + urgency * 900, 0, 0.045, { type: 'square', gain: 0.03 + urgency * 0.03 });
  },
  /** Spikes: the spikes shoot across */
  spikeStrike() {
    const c = audio();
    if (!c) return;
    tone(c, 2400, 0, 0.18, { type: 'sawtooth', gain: 0.05, to: 300 });
    slap(c, 0.03, 0.5);
  },
  /** Spikes: the spike wall slams into the crates, a heavy wooden thud */
  spikeThud() {
    const c = audio();
    if (!c) return;
    slap(c, 0, 0.6);
    tone(c, 110, 0, 0.2, { type: 'sine', gain: 0.22, to: 55 });
  },
  /** Spikes: I'm hit and lose a heart */
  spikeHit() {
    const c = audio();
    if (!c) return;
    slap(c, 0, 0.8);
    tone(c, 300, 0.02, 0.35, { type: 'sawtooth', gain: 0.1, to: 90 });
  },
  /** Darts: the throw, a quick whoosh */
  dartWhoosh() {
    const c = audio();
    if (c) tone(c, 900, 0, 0.18, { type: 'sawtooth', gain: 0.025, to: 300 });
  },
  /** Darts: the dart sticks in the board, a dull thud */
  dartThud() {
    const c = audio();
    if (!c) return;
    slap(c, 0, 0.75);
    tone(c, 140, 0, 0.16, { type: 'sine', gain: 0.2, to: 70 });
  },
  /** Darts: off the board, a clatter on the wall */
  dartMiss() {
    const c = audio();
    if (!c) return;
    slap(c, 0, 0.4);
    slap(c, 0.08, 0.25);
    tone(c, 1800, 0.02, 0.08, { type: 'triangle', gain: 0.04, to: 1200 });
  },
  /** Darts: a bull, a bright double ding */
  dartBull() {
    const c = audio();
    if (c) notes(c, [1319, 1760], 0.1, 0.25, { type: 'triangle', gain: 0.08 });
  },
  /** Darts: bust, a sad trombone */
  dartBust() {
    const c = audio();
    if (c) notes(c, [392, 370, 349, 262], 0.18, 0.3, { type: 'sawtooth', gain: 0.05 });
  },
  /** Darts: checked out to 0, a little fanfare */
  dartCheckout() {
    const c = audio();
    if (c) notes(c, [523, 659, 784, 1047, 1319], 0.08, 0.3, { type: 'square', gain: 0.045 });
  },
  /** Darts: 180! the crowd goes up */
  dart180() {
    const c = audio();
    if (!c) return;
    notes(c, [392, 523, 659, 784, 1047, 1319, 1568], 0.07, 0.4, { type: 'square', gain: 0.045 });
    for (let i = 0; i < 6; i++) slap(c, 0.5 + i * 0.09, 0.3);
  },
  /** Dots and Boxes: a pen stroke */
  dotsLine() {
    const c = audio();
    if (!c) return;
    slap(c, 0, 0.18);
    tone(c, 2600, 0, 0.09, { type: 'sawtooth', gain: 0.012, to: 1800 });
  },
  /** Dots and Boxes: a box closed (two make a higher pop) */
  dotsBox(n = 1) {
    const c = audio();
    if (c) notes(c, n > 1 ? [660, 880, 1175, 1568] : [660, 990], 0.07, 0.18, { type: 'triangle', gain: 0.09 });
  },
  /** Colour Wars: a dot dropped on a cell */
  cwTap() {
    const c = audio();
    if (c) tone(c, 420, 0, 0.12, { type: 'sine', gain: 0.14, to: 720 });
  },
  /** Colour Wars: a wave of bursts; later waves pop higher */
  cwBurst(wave = 0) {
    const c = audio();
    if (!c) return;
    const f = Math.min(1600, 300 + wave * 90);
    slap(c, 0, 0.35);
    tone(c, f, 0, 0.16, { type: 'triangle', gain: 0.09, to: f * 1.8 });
  },
  /** Colour Wars: a player is out */
  cwOut() {
    const c = audio();
    if (c) notes(c, [523, 415, 330, 262], 0.12, 0.25, { type: 'triangle', gain: 0.08 });
  },
  /** Chess: a piece set down */
  chessMove() {
    const c = audio();
    if (c) knock(c, 0);
  },
  /** Chess: a capture, a harder double knock */
  chessCapture() {
    const c = audio();
    if (!c) return;
    knock(c, 0, 150, 0.7);
    knock(c, 0.06, 240, 0.35);
  },
  /** Chess: check, a knock and a bright ping */
  chessCheck() {
    const c = audio();
    if (!c) return;
    knock(c, 0, 190, 0.55);
    tone(c, 1175, 0.03, 0.22, { type: 'triangle', gain: 0.07 });
  },
  /** Chess: castling, king then rook */
  chessCastle() {
    const c = audio();
    if (!c) return;
    knock(c, 0, 200, 0.5);
    knock(c, 0.11, 170, 0.45);
  },
  /** Chess: a clock tick under 10 seconds */
  chessTick() {
    const c = audio();
    if (c) tone(c, 1500, 0, 0.04, { type: 'square', gain: 0.03 });
  },
  /** Chess: a crazyhouse drop */
  chessDrop() {
    const c = audio();
    if (!c) return;
    tone(c, 520, 0, 0.08, { type: 'sine', gain: 0.08, to: 300 });
    knock(c, 0.05, 210, 0.5);
  },
  /** Chess: an atomic capture explodes */
  chessBoom() {
    const c = audio();
    if (!c) return;
    knock(c, 0, 90, 0.9);
    tone(c, 160, 0, 0.5, { type: 'sawtooth', gain: 0.06, to: 40 });
  },
  /** Chess: a draw or takeback offer arrived */
  chessOffer() {
    const c = audio();
    if (c) notes(c, [660, 880], 0.1, 0.2, { type: 'triangle', gain: 0.07 });
  },
  /** Chess: the game ended */
  chessEnd() {
    const c = audio();
    if (c) notes(c, [523, 659, 784], 0.12, 0.35, { type: 'triangle', gain: 0.08 });
  },
  /** Carrom: a clack between pieces, louder and brighter for harder hits (v in board units a second) */
  carromClack(v = 1) {
    const c = audio();
    if (!c) return;
    const k = Math.max(0.15, Math.min(1, v / 2.5));
    knock(c, 0, 900 + k * 900, 0.18 + k * 0.5);
    tone(c, 2400 + k * 1200, 0, 0.03, { type: 'triangle', gain: 0.03 + k * 0.06 });
  },
  /** Carrom: a piece knocks the frame */
  carromWall(v = 1) {
    const c = audio();
    if (c) knock(c, 0, 140, Math.max(0.12, Math.min(0.6, v / 3)));
  },
  /** Carrom: a coin drops into a pocket net */
  carromPocket() {
    const c = audio();
    if (!c) return;
    knock(c, 0, 110, 0.7);
    tone(c, 180, 0.02, 0.18, { type: 'sine', gain: 0.1, to: 90 });
  },
  /** Carrom: a foul */
  carromFoul() {
    const c = audio();
    if (c) notes(c, [330, 247], 0.13, 0.22, { type: 'square', gain: 0.05 });
  },
  /** Bomb Pass: one tick of the fuse (faster ticks are called more often) */
  bombTick(heat = 0) {
    const c = audio();
    if (c) tone(c, 1300 + heat * 220, 0, 0.035, { type: 'square', gain: 0.025 + heat * 0.01 });
  },
  /** Bomb Pass: the bomb flies to the next player */
  bombPass() {
    const c = audio();
    if (c) tone(c, 380, 0, 0.3, { type: 'sine', gain: 0.1, to: 900 });
  },
  /** Bomb Pass: a wrong answer */
  bombWrong() {
    const c = audio();
    if (c) tone(c, 160, 0, 0.25, { type: 'sawtooth', gain: 0.07, to: 110 });
  },
  /** Bomb Pass: BOOM */
  bombBoom() {
    const c = audio();
    if (!c) return;
    knock(c, 0, 70, 1);
    slap(c, 0.01, 0.9);
    tone(c, 120, 0, 0.9, { type: 'sawtooth', gain: 0.09, to: 30 });
  },
  /** Sea Battle: a gun fires */
  seaFire() {
    const c = audio();
    if (!c) return;
    knock(c, 0, 90, 0.6);
    tone(c, 300, 0, 0.18, { type: 'sine', gain: 0.06, to: 120 });
  },
  /** Sea Battle: a splash in the water */
  seaSplash() {
    const c = audio();
    if (!c) return;
    slap(c, 0, 0.35);
    tone(c, 700, 0, 0.25, { type: 'sine', gain: 0.04, to: 300 });
  },
  /** Sea Battle: a hit */
  seaHit() {
    const c = audio();
    if (!c) return;
    knock(c, 0, 80, 0.9);
    tone(c, 140, 0, 0.5, { type: 'sawtooth', gain: 0.07, to: 50 });
  },
  /** Sea Battle: a ship sinks */
  seaSink() {
    const c = audio();
    if (!c) return;
    knock(c, 0, 70, 1);
    notes(c, [220, 185, 147, 110], 0.14, 0.3, { type: 'triangle', gain: 0.07 });
  },
  /** Sea Battle: a radar ping */
  seaRadar() {
    const c = audio();
    if (c) notes(c, [1320, 1320], 0.25, 0.2, { type: 'sine', gain: 0.06 });
  },
  /** Sea Battle: a torpedo runs */
  seaTorpedo() {
    const c = audio();
    if (c) tone(c, 200, 0, 0.6, { type: 'sawtooth', gain: 0.04, to: 520 });
  },
  /** Five in a Row: a stone set down on wood */
  gomokuStone() {
    const c = audio();
    if (c) knock(c, 0, 240, 0.55);
  },
  /** Five in a Row: the ghost stone shows */
  gomokuGhost() {
    const c = audio();
    if (c) tone(c, 880, 0, 0.06, { type: 'sine', gain: 0.03 });
  },
  /** Five in a Row: five in a line */
  gomokuFive() {
    const c = audio();
    if (c) notes(c, [523, 659, 784, 1047, 1319], 0.07, 0.25, { type: 'triangle', gain: 0.08 });
  },
  /** Ultimate Tic-Tac-Toe: a chalk mark */
  utttMark() {
    const c = audio();
    if (!c) return;
    slap(c, 0, 0.25);
    tone(c, 620, 0, 0.07, { type: 'triangle', gain: 0.04, to: 520 });
  },
  /** Ultimate Tic-Tac-Toe: a small board is won */
  utttBoard() {
    const c = audio();
    if (!c) return;
    knock(c, 0, 160, 0.7);
    notes(c, [659, 880], 0.09, 0.22, { type: 'triangle', gain: 0.07 });
  },
  /** Word Grid Hunt: a tile joins the word */
  wordTile(n: number) {
    const c = audio();
    if (c) tone(c, 440 * 2 ** (Math.min(n, 12) / 12), 0, 0.07, { type: 'sine', gain: 0.05 });
  },
  /** Word Grid Hunt: a good word */
  wordGood() {
    const c = audio();
    if (c) notes(c, [784, 1175], 0.07, 0.18, { type: 'triangle', gain: 0.08 });
  },
  /** Word Grid Hunt: not a word */
  wordBad() {
    const c = audio();
    if (c) tone(c, 180, 0, 0.22, { type: 'square', gain: 0.04, to: 120 });
  },
  /** Word Grid Hunt: the last 10 seconds tick */
  wordTick() {
    const c = audio();
    if (c) knock(c, 0, 1200, 0.25);
  },
  /** Word Grid Hunt: the round ends and the words show */
  wordReveal() {
    const c = audio();
    if (c) notes(c, [392, 523, 659, 784], 0.09, 0.3, { type: 'triangle', gain: 0.07 });
  },
};
