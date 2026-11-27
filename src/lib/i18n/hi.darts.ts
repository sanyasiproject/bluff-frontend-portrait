import type { Dict, Pattern } from './types';

// Darts table, chalkboard, pop-ups, podium, rules and catalog lines
const you = (n: string) => (n === 'You' ? 'आप' : n);
const PLACE: Record<string, string> = {
  '1st': 'पहला',
  '2nd': 'दूसरा',
  '3rd': 'तीसरा',
  '4th': 'चौथा',
};

export const D: Dict = {
  'Hold to aim, let go to throw': 'दबाकर निशाना लगाओ, छोड़कर फेंको',
  'Treble ring ×3, outer ring ×2': 'ट्रेबल रिंग ×3, बाहरी रिंग ×2',
  'Below 0 is a bust': '0 से नीचे = बस्ट',
  'Land exactly on 0 to win': 'ठीक 0 पर पहुँचकर जीतो',
  '180s': '180',
  bulls: 'बुल',
  checkouts: 'चेकआउट',
  Darts: 'डार्ट्स',
  Arcade: 'आर्केड',
  'Count down from 301, land exactly on zero': '301 से नीचे गिनो, ठीक शून्य पर पहुँचो',
  'Start at': 'शुरुआत',
  'Steady… let go to throw': 'हाथ स्थिर… छोड़ो और फेंको',
  'Throwing…': 'फेंक रहे हैं…',
  'Turn over': 'बारी ख़त्म',
  '💥 Bust!': '💥 बस्ट!',
  'ONE HUNDRED AND EIGHTY! 🔥': 'एक सौ अस्सी! 🔥',
  '🐂 BULL!': '🐂 बुल!',
  'Treble 20! 🔥': 'ट्रेबल 20! 🔥',
  'BULL! 50': 'बुल! 50',
  'Outer bull 25': 'आउटर बुल 25',
  Miss: 'चूक गए',
  BUST: 'बस्ट',
  'Need 50: Bull': '50 चाहिए: बुल',
  '🎯 Checked out': '🎯 ख़त्म किया',
  '🎯 Game recap': '🎯 खेल का सार',
  '🏆 First out:': '🏆 सबसे पहले ख़त्म:',
  'You drop out of the game': 'आप खेल से बाहर हो जाएँगे',
  'They drop out of the game': 'वो खेल से बाहर हो जाएँगे',
  'You drop out of the game and it counts as a loss': 'आप खेल से बाहर हो जाएँगे और यह हार गिनी जाएगी',
  "2–4 players. Everyone starts at 301 (or 501, host's choice) and counts down to exactly 0.": '2–4 खिलाड़ी। सब 301 (या 501, होस्ट की पसंद) से शुरू करके ठीक 0 तक नीचे गिनते हैं।',
  '🎯 3 darts a turn. Press and hold on the board to aim; your hand shakes more the longer you hold. Let go to throw.':
    '🎯 हर बारी 3 डार्ट। निशाना लगाने के लिए बोर्ड को दबाकर रखें; जितनी देर रखेंगे, हाथ उतना काँपेगा। छोड़ते ही डार्ट जाएगा।',
  'The board scores like a real one: the number you hit, ×2 in the outer double ring, ×3 in the thin treble ring, 25 for the outer bull, 50 for the bull.':
    'बोर्ड असली जैसा गिनता है: जिस नंबर पर लगे वही, बाहरी डबल रिंग में ×2, पतली ट्रेबल रिंग में ×3, आउटर बुल 25, बुल 50।',
  "💥 Bust: go below 0 and that turn's darts don't count; your turn ends.": '💥 बस्ट: 0 से नीचे गए तो उस बारी के डार्ट नहीं गिने जाते; बारी ख़त्म।',
  'Land exactly on 0 to finish. Play goes on for 2nd and 3rd place.': 'ठीक 0 पर पहुँचकर ख़त्म करें। दूसरे और तीसरे स्थान के लिए खेल चलता रहता है।',
  '🔥 Three darts for 180 (three treble 20s) gets the big cheer.': '🔥 तीन डार्ट में 180 (तीन ट्रेबल 20) पर ज़ोरदार तालियाँ।',
  '⏰ With the turn timer on, time up throws for you. Leaving mid-game counts as a loss.': '⏰ टर्न टाइमर चालू हो तो समय ख़त्म होने पर डार्ट अपने आप जाता है। बीच में छोड़ना हार है।',
};

export const P: Pattern[] = [
  [/^Darts (301|501)$/, 'डार्ट्स $1'],
  [/^🎯 Your throw · dart (\d) of (\d)$/, '🎯 आपकी बारी · डार्ट $1 / $2'],
  [/^(.+) (?:is|are) throwing…$/, (m) => `${you(m[1])} फेंक रहे हैं…`],
  [/^Start (\d+) · land exactly on 0 · going below 0 is a bust$/, 'शुरुआत $1 · ठीक 0 पर पहुँचो · 0 से नीचे = बस्ट'],
  [/^🎯 Checkout! (.+) finish(?:es)?$/, (m) => `🎯 चेकआउट! ${you(m[1])} ने ख़त्म किया`],
  [/^Treble (\d+)!$/, 'ट्रेबल $1!'],
  [/^Double (\d+)$/, 'डबल $1'],
  [/^Need (\d+): (.+)$/, '$1 चाहिए: $2'],
  [/^(\d+) left$/, '$1 बाक़ी'],
  [/^✅ (1st|2nd|3rd|4th)$/, (m) => `✅ ${PLACE[m[1]]}`],
  [/^Started at (\d+); land exactly on 0 to finish\.$/, '$1 से शुरुआत; ठीक 0 पर ख़त्म करना है।'],
];
