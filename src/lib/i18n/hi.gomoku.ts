import type { Dict, Pattern } from './types';

// Five in a Row table, podium, rules and catalog lines
const you = (n: string) => (n === 'You' ? 'आप' : n);

export const D: Dict = {
  'Five in a Row': 'पाँच एक लाइन में',
  'Line up five stones before anyone else': 'सबसे पहले पाँच गोटियाँ एक लाइन में लगाओ',
  'Your turn! The first stone goes in the centre': 'आपकी बारी! पहली गोटी बीच में जाती है',
  'The first stone goes in the centre': 'पहली गोटी बीच में जाती है',
  'Your turn! Tap a point': 'आपकी बारी! कोई बिंदु टैप करो',
  'Tap again or press Place': 'फिर टैप करो या रखो दबाओ',
  'Placing…': 'रख रहे हैं…',
  Place: 'रखो',
  '✌️ Tap twice: on': '✌️ दो टैप: चालू',
  '👆 One tap: on': '👆 एक टैप: चालू',
  'Zoom in': 'ज़ूम करो',
  'Zoom out': 'ज़ूम हटाओ',
  '🤝 The board is full: a draw': '🤝 बोर्ड भर गया: ड्रॉ',
  '⚫ Five in a row': '⚫ पाँच एक लाइन में',
  '⚫ Game recap': '⚫ खेल का सार',
  '🤝 The board filled up: a draw': '🤝 बोर्ड भर गया: ड्रॉ',
  '5 in a line wins · row, column or diagonal': 'एक लाइन में 5 जीतते हैं · पंक्ति, कॉलम या तिरछा',
  '5 in a line wins · row, column or diagonal · pinch or double-tap to zoom': 'एक लाइन में 5 जीतते हैं · पंक्ति, कॉलम या तिरछा · ज़ूम के लिए पिंच या डबल-टैप',
  '2–4 players. Two play on a 15 × 15 board; three or four play on 19 × 19. Everyone has their own stone colour.': '2–4 खिलाड़ी। दो हों तो 15 × 15 बोर्ड, तीन या चार हों तो 19 × 19। हर किसी की गोटी का अपना रंग।',
  '⚫ Take turns placing one stone on any empty point. The very first stone goes on the centre point.': '⚫ बारी-बारी से किसी भी ख़ाली बिंदु पर एक गोटी रखो। सबसे पहली गोटी बीच के बिंदु पर जाती है।',
  '🏆 Make a line of 5 or more of your stones, in a row, a column or a diagonal, and you win at once.': '🏆 अपनी 5 या ज़्यादा गोटियों की लाइन बनाओ, पंक्ति, कॉलम या तिरछी, और तुरंत जीत।',
  '🛡️ Watch the others: block an open three or a four before it becomes five.': '🛡️ बाक़ियों पर नज़र रखो: खुली तीन या चार को पाँच बनने से पहले रोको।',
  'With 3 or 4 players the first five wins; everyone else is placed by their longest line. A full board is a draw.': '3 या 4 खिलाड़ियों में पहले पाँच वाला जीतता है; बाक़ी अपनी सबसे लंबी लाइन से रैंक होते हैं। बोर्ड भरा तो ड्रॉ।',
  '✌️ Tap a point to see your stone, tap again (or Place) to put it down. Pinch or double-tap to zoom. ⏰ About 30 seconds a turn; time up plays next to your best line.':
    '✌️ बिंदु टैप करो तो गोटी दिखेगी, फिर टैप करो (या रखो) तो रख दी जाएगी। ज़ूम के लिए पिंच या डबल-टैप। ⏰ हर बारी लगभग 30 सेकंड; समय ख़त्म तो आपकी सबसे अच्छी लाइन के पास अपने आप।',
  'One stone a turn, anywhere empty': 'हर बारी एक गोटी, कहीं भी ख़ाली जगह',
  'Block their threes and fours': 'उनकी तीन और चार को रोको',
  'Five in a line wins': 'एक लाइन में पाँच जीतते हैं',
  '🏆 Five in a row:': '🏆 पाँच एक लाइन में:',
  'The board is full. It’s a draw 🤝': 'बोर्ड भर गया। ड्रॉ 🤝',
  'Five in a Row needs 2 to 4 players': 'पाँच एक लाइन में के लिए 2 से 4 खिलाड़ी चाहिए',
  'Pick a point on the board': 'बोर्ड पर कोई बिंदु चुनो',
  'That point is taken': 'वो बिंदु भरा है',
  'The first stone goes on the centre point': 'पहली गोटी बीच के बिंदु पर जाती है',
  fives: 'पंचे',
  blocks: 'रोके',
};

export const P: Pattern[] = [
  [/^Five in a Row (\d+)×(\d+)$/, 'पाँच एक लाइन में $1×$2'],
  [/^🏆 (.+) made five!$/, (m) => `🏆 ${you(m[1])} ने पाँच बनाए!`],
  [/^⚫ Best line (\d+)$/, '⚫ सबसे लंबी लाइन $1'],
  [/^(\d+) stones on a (\d+)×(\d+) board$/, '$2×$3 बोर्ड पर $1 गोटियाँ'],
  [/^(\d+) by (\d+) board$/, '$1 × $2 बोर्ड'],
  [/^(.+) makes (\d+) in a row and wins 🎉$/, (m) => `${you(m[1])} ने एक लाइन में ${m[2]} बनाए और जीते 🎉`],
];
