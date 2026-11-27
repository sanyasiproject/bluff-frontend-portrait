import type { Dict, Pattern } from './types';

// Colour Wars table, podium, rules and catalog lines
const you = (n: string) => (n === 'You' ? 'आप' : n);

export const D: Dict = {
  'Start on any empty cell': 'किसी ख़ाली घर से शुरू करो',
  'Tap your cell to add a dot': 'अपने घर पर टैप कर बिंदु जोड़ो',
  '4 dots burst into neighbours': '4 बिंदु पर बगल में फूटता है',
  'Last colour standing wins': 'आख़िर तक बचा रंग जीतता है',
  captures: 'क़ब्ज़े',
  bursts: 'फूटे',
  'Colour Wars': 'रंग युद्ध',
  'Grow dots, burst and take over the board': 'बिंदु बढ़ाओ, फोड़ो और बोर्ड पर क़ब्ज़ा करो',
  ' Colour Wars': ' रंग युद्ध',
  '🎨 Tap one of your cells to add a dot': '🎨 अपने किसी घर पर टैप करके एक बिंदु जोड़ें',
  '🎨 Tap any empty cell to start with 3 dots': '🎨 शुरू करने के लिए किसी ख़ाली घर पर टैप करें (3 बिंदु)',
  '4 dots burst into the cells around · take them all': '4 बिंदु पर घर फूटता है और आस-पास के घर ले लेता है · सब जीतो',
  '💀 out': '💀 बाहर',
  '✨ new': '✨ नया',
  '🎨 Game recap': '🎨 खेल का सार',
  "2–4 players on a 5×5 or 7×7 board (host's choice). Turns go round the table.": '2–4 खिलाड़ी, 5×5 या 7×7 बोर्ड (होस्ट की पसंद)। बारी गोल घूमती है।',
  '🎨 Your first move: tap any empty cell. It becomes yours with 3 dots.': '🎨 पहली चाल: किसी भी ख़ाली घर पर टैप करें। वह 3 बिंदुओं के साथ आपका हो जाता है।',
  'After that, tap one of your own cells to add a dot to it.': 'उसके बाद अपने किसी घर पर टैप करके उसमें एक बिंदु जोड़ें।',
  "💥 At 4 dots a cell bursts: it empties and throws one dot to each cell next to it (up, down, left, right). Those cells turn your colour, even if they were someone else's.":
    '💥 4 बिंदु पर घर फूटता है: ख़ाली होकर बगल के हर घर (ऊपर, नीचे, बाएँ, दाएँ) में एक बिंदु फेंकता है। वे घर आपके रंग के हो जाते हैं, चाहे किसी और के हों।',
  'Bursts can set off more bursts: big chains can flip half the board.': 'एक फूटना और फूटने शुरू कर सकता है: बड़ी चेन आधा बोर्ड पलट सकती है।',
  "💀 Lose all your cells (after your first move) and you're out. The last colour standing wins.": '💀 (पहली चाल के बाद) सारे घर गए तो आप बाहर। आख़िर तक बचा रंग जीतता है।',
  '⏰ With the turn timer on, time up taps for you. Leaving mid-game counts as a loss.': '⏰ टर्न टाइमर चालू हो तो समय ख़त्म होने पर टैप अपने आप होता है। बीच में छोड़ना हार है।',
};

export const P: Pattern[] = [
  [/^(.+) (?:is|are) thinking…$/, (m) => `${you(m[1])} सोच रहे हैं…`],
  [/^💥 Chain ×(\d+)!$/, '💥 चेन ×$1!'],
  [/^💀 (.+) (?:is|are) out!$/, (m) => `💀 ${m[1].split(' & ').map(you).join(' और ')} बाहर!`],
  [/^▦ (\d+) cells?$/, '▦ $1 घर'],
  [/^(\d)×(\d) · bursts at 4$/, '$1×$2 · 4 पर फूटता है'],
  [/^(\d)×(\d) board; the last colour standing wins\.$/, '$1×$2 बोर्ड; आख़िर तक बचा रंग जीतता है।'],
];
