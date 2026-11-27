import type { Dict, Pattern } from './types';

// Dots and Boxes table, podium, rules and catalog lines
const you = (n: string) => (n === 'You' ? 'आप' : n);

export const D: Dict = {
  'Draw one line a turn': 'हर बारी एक लाइन',
  'Close a box: it is yours': 'बॉक्स बंद करो: वो आपका',
  'A box gives another turn': 'बॉक्स पर एक और बारी',
  "Don't draw a box's third side": 'बॉक्स की तीसरी लाइन मत खींचो',
  boxes: 'बॉक्स',
  'Dots and Boxes': 'डॉट्स और बॉक्स',
  'Draw lines, close boxes, steal the board': 'लाइन खींचो, बॉक्स बंद करो, बोर्ड जीतो',
  Board: 'बोर्ड',
  'Drawing…': 'खींच रहे हैं…',
  '✏️ Go again! Draw one more line': '✏️ फिर से! एक और लाइन खींचो',
  '✏️ Your turn: tap a line or drag dot to dot': '✏️ आपकी बारी: लाइन पर टैप करें या एक बिंदु से दूसरे तक खींचें',
  '⬛ Box! Go again!': '⬛ बॉक्स! फिर से खेलो!',
  'Close a box: score it and go again · most boxes wins': 'बॉक्स बंद करो: अंक लो और फिर खेलो · सबसे ज़्यादा बॉक्स जीतता है',
  '⬛ Game recap': '⬛ खेल का सार',
  "2–4 players on a grid of dots (4×4, 5×5 or 6×6 boxes, host's choice). Turns go round the table.": '2–4 खिलाड़ी, बिंदुओं का जाल (4×4, 5×5 या 6×6 बॉक्स, होस्ट की पसंद)। बारी गोल घूमती है।',
  '✏️ On your turn draw one line between two dots next to each other: tap near the line, or drag from dot to dot.': '✏️ अपनी बारी में पास के दो बिंदुओं के बीच एक लाइन खींचें: लाइन के पास टैप करें या बिंदु से बिंदु तक खींचें।',
  "⬛ Draw the fourth side of a box and it's yours: it fills with your colour and you go again.": '⬛ बॉक्स की चौथी लाइन खींची तो बॉक्स आपका: आपके रंग से भरेगा और आपकी एक और बारी।',
  'Careful: drawing the third side of a box hands it to the next player.': 'सावधान: बॉक्स की तीसरी लाइन खींची तो अगला खिलाड़ी उसे ले जाएगा।',
  'When every box is closed, the most boxes wins (a tie shares the win).': 'सारे बॉक्स बंद होने पर सबसे ज़्यादा बॉक्स वाला जीतता है (बराबरी में जीत बँटती है)।',
  '⏰ With the turn timer on, time up draws a line for you. Leaving mid-game counts as a loss.': '⏰ टर्न टाइमर चालू हो तो समय ख़त्म होने पर लाइन अपने आप खिंचती है। बीच में छोड़ना हार है।',
};

export const P: Pattern[] = [
  [/^Dots (\d)×(\d)$/, 'डॉट्स $1×$2'],
  [/^(\d+) boxes left$/, '$1 बॉक्स बाक़ी'],
  [/^(.+) (?:is|are) drawing…$/, (m) => `${you(m[1])} खींच रहे हैं…`],
  [/^⬛ (.+) goes again$/, (m) => `⬛ ${you(m[1])} की फिर बारी`],
  [/^⬛⬛ Double box! Go again!$/, '⬛⬛ डबल बॉक्स! फिर से खेलो!'],
  [/^⬛⬛ Double box! (.+) goes again$/, (m) => `⬛⬛ डबल बॉक्स! ${you(m[1])} की फिर बारी`],
  [/^⬛ (\d+) boxes$/, '⬛ $1 बॉक्स'],
  [/^(\d+) boxes on a (\d)×(\d) board\.$/, '$2×$3 बोर्ड पर $1 बॉक्स।'],
];
