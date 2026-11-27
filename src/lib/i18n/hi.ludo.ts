import type { Dict, Pattern } from './types';

// Ludo table, podium and looks
const MODES: Record<string, string> = { Classic: 'क्लासिक', Quick: 'क्विक', Timed: 'टाइम्ड', Master: 'मास्टर' };
const you = (n: string) => (n === 'You' ? 'आप' : n);

export const D: Dict = {
  Ludo: 'लूडो',
  'Setting up the board…': 'बोर्ड लग रहा है…',
  'Tap the dice to roll': 'पासा फेंकने के लिए टैप करें',
  'Tap to roll': 'टैप करके फेंकें',
  'Tap a glowing goti': 'चमकती गोटी पर टैप करें',
  'Moving…': 'चल रही है…',
  '👀 Watching': '👀 देख रहे हैं',
  '🎲 Six! Bonus roll': '🎲 छक्का! एक और बारी',
  '🏠 Home! Bonus roll': '🏠 घर पहुँची! एक और बारी',
  'three 6s lose the turn': 'तीन छक्के पर बारी गई',
  '🏁 Game over': '🏁 गेम ख़त्म',
  '💥 Kill recap': '💥 किसने किसे काटा',
  'No goti was knocked off. A peaceful game!': 'कोई गोटी नहीं कटी। शांत गेम!',
  'knocked off': 'ने काटा',
  'See results': 'नतीजे देखें',
  '🎲 Ludo looks': '🎲 लूडो लुक',
  'Only on this phone. Higher levels unlock more.': 'सिर्फ़ इस फ़ोन पर। ऊँचे लेवल पर और खुलते हैं।',
  Board: 'बोर्ड',
  Gotis: 'गोटियाँ',
  Dice: 'पासा',
  Using: 'लगा है',
  Use: 'लगाएँ',
  Done: 'हो गया',
  'Your gotis leave the board and it counts as a loss': 'आपकी गोटियाँ बोर्ड से हट जाएँगी और यह हार गिनी जाएगी',
  "Their gotis leave the board and they won't pay or win coins. With only one player left the game stops.":
    'उनकी गोटियाँ बोर्ड से हट जाएँगी और वे न सिक्के देंगे न जीतेंगे। एक ही खिलाड़ी बचे तो गेम रुक जाएगा।',
};

export const P: Pattern[] = [
  [/^Ludo · (Classic|Quick|Timed|Master)$/, (m) => `लूडो · ${MODES[m[1]]}`],
  [/^(.+) is rolling…$/, '$1 पासा फेंक रहे हैं…'],
  [/^(.+) is moving…$/, '$1 गोटी चल रहे हैं…'],
  [/^💥 Kill! (.+) knocked off (.+)$/, (m) => `💥 कट गई! ${you(m[1])} ने ${you(m[2])} की गोटी काटी`],
  [/^Three 6s! (.+) loses? the turn$/, (m) => `तीन छक्के! ${you(m[1])} की बारी गई`],
  [/^🤝 (.+) moves? for (.+)$/, (m) => `🤝 ${you(m[1])} ${m[2]} की गोटियाँ चला रहे हैं`],
  [/^(\d+) pts$/, '$1 अंक'],
  [/^🔒 Level (\d+)$/, '🔒 लेवल $1'],
];
