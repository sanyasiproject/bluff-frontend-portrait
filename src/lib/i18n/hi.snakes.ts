import type { Dict, Pattern } from './types';

// Saanp Seedhi table, podium, rules, catalog lines and the lobby's player-count notes
const you = (n: string) => (n === 'You' ? 'आप' : n);
const PLACE: Record<string, string> = { '1st': 'पहला', '2nd': 'दूसरा', '3rd': 'तीसरा', '4th': 'चौथा' };
const RULES: Record<string, string> = { 'Exact 100': 'ठीक 100', 'Any roll wins': 'कोई भी अंक जीते', '6 to start': '6 से शुरू', 'Bite on': 'काटना चालू' };

export const D: Dict = {
  'Saanp Seedhi': 'साँप सीढ़ी',
  Party: 'पार्टी',
  'Climb the ladders, dodge the snakes': 'सीढ़ी चढ़ो, साँप से बचो',
  Finish: 'जीत',
  'Exact roll': 'ठीक अंक',
  'Land on 100 exactly or bounce back': 'ठीक 100 पर पहुँचो, वरना पीछे लौटो',
  'Any roll': 'कोई भी अंक',
  'Reach 100 or more': '100 या आगे पहुँचो',
  Start: 'शुरुआत',
  'Need a 6': '6 चाहिए',
  'Roll a 6 to step onto the board': 'बोर्ड पर आने के लिए 6 लाओ',
  'Go straight': 'सीधे चलो',
  'Start moving from the first roll': 'पहले पासे से ही चलो',
  Sixes: 'छक्के',
  'Roll again': 'फिर से फेंको',
  'A 6 gives another roll; three 6s lose the turn': '6 पर एक और बारी; तीन छक्के पर बारी गई',
  'One roll': 'एक बारी',
  'One roll a turn': 'हर बारी एक बार',
  Bite: 'काटना',
  'Land on a player and send them back 5': 'किसी खिलाड़ी पर उतरो, वो 5 घर पीछे',
  'Players can share a square': 'एक घर पर कई खिलाड़ी रह सकते हैं',
  '🎲 Six! Roll again': '🎲 छक्का! फिर से फेंको',
  '💯 Too far! Bounced back off 100': '💯 ज़्यादा हो गया! 100 से टकराकर वापस',
  '🚩 start': '🚩 शुरू',
  'Ladder!': 'सीढ़ी!',
  'Snake!': 'साँप!',
  'Bite!': 'काटा!',
  '🐍 Game recap': '🐍 गेम की झलक',
  'Top climber:': 'सबसे ज़्यादा चढ़े:',
  'Snake food:': 'साँप का खाना:',
  'Biggest biter:': 'सबसे बड़े काटने वाले:',
  'Goti and dice looks': 'गोटी और पासे के लुक',
  'A ladder takes you up': 'सीढ़ी ऊपर ले जाती है',
  'A snake head slides you down': 'साँप का मुँह नीचे गिराता है',
  'A 6 starts you and rolls again': '6 से शुरुआत और एक और बारी',
  'Land on 100 to win': '100 पर पहुँचकर जीतो',
  '2–4 players, one goti each. Turns go round the table.': '2–4 खिलाड़ी, सबकी एक गोटी। बारी गोल घूमती है।',
  '🎲 Tap the dice to roll. Your goti walks by itself, square by square, from 1 up to 100.': '🎲 पासे पर टैप करें। आपकी गोटी ख़ुद 1 से 100 तक घर-घर चलती है।',
  "🪜 Land on the foot of a ladder: climb to its top. 🐍 Land on a snake's head: slide down to its tail.": '🪜 सीढ़ी के नीचे उतरे तो ऊपर चढ़ो। 🐍 साँप के मुँह पर उतरे तो पूँछ तक नीचे फिसलो।',
  "Need a 6 (host's choice, on by default): a 6 puts your goti on square 1.": '6 चाहिए (होस्ट की पसंद, पहले से चालू): 6 आने पर गोटी घर 1 पर आती है।',
  'Exact roll (default): land on 100 exactly; roll too much and you bounce back by the extra. With Any roll, reaching 100 or more finishes.':
    'ठीक अंक (पहले से): ठीक 100 पर पहुँचना है; ज़्यादा आया तो उतने घर वापस। "कोई भी अंक" में 100 या आगे पहुँचना काफ़ी है।',
  '🔁 Roll again (default): a 6 gives another roll; three 6s in a row lose the turn.': '🔁 फिर से फेंको (पहले से): 6 पर एक और बारी; लगातार तीन छक्के पर बारी गई।',
  '😬 Bite (default): land on another player and they go back 5 squares.': '😬 काटना (पहले से): किसी और खिलाड़ी पर उतरो तो वो 5 घर पीछे।',
  'The first to 100 wins; play goes on for 2nd and 3rd place.': 'पहले 100 पर पहुँचने वाला जीतता है; दूसरे और तीसरे स्थान के लिए खेल चलता रहता है।',
  '⏰ With the turn timer on, time up rolls for you. Leaving mid-game counts as a loss.': '⏰ टर्न टाइमर चालू हो तो समय ख़त्म होने पर पासा अपने आप फेंका जाता है। बीच में छोड़ना हार है।',
};

export const P: Pattern[] = [
  [/^🪜 Ladder! (.+) climbs? (\d+) → (\d+)$/, (m) => `🪜 सीढ़ी! ${you(m[1])} ${m[2]} → ${m[3]} चढ़े`],
  [/^🐍 Snake! (.+) slides? (\d+) → (\d+)$/, (m) => `🐍 साँप! ${you(m[1])} ${m[2]} → ${m[3]} फिसले`],
  [/^🐍 Bite! (.+) sent (.+) back (\d+)$/, (m) => `🐍 काटा! ${you(m[1])} ने ${you(m[2])} को ${m[3]} घर पीछे भेजा`],
  [/^🏆 (.+) reached 100!(?: (1st|2nd|3rd|4th) place)?$/, (m) => `🏆 ${you(m[1])} 100 पर पहुँचे!${m[2] ? ` ${PLACE[m[2]]} स्थान` : ''}`],
  [/^(.+) needs? a 6 to start$/, (m) => `${you(m[1])} को शुरू करने के लिए 6 चाहिए`],
  [/^(Exact 100|Any roll wins)((?: · (?:6 to start|Bite on))*)$/, (m) => [m[1], ...m[2].split(' · ').filter(Boolean)].map((x) => RULES[x] ?? x).join(' · ')],
  [/^(.+) needs exactly (\d+) players: add 🤖 bots$/, '$1 के लिए ठीक $2 खिलाड़ी चाहिए: 🤖 बॉट जोड़ें'],
  [/^(.+) needs at least (\d+) players: add 🤖 bots$/, '$1 के लिए कम से कम $2 खिलाड़ी चाहिए: 🤖 बॉट जोड़ें'],
  [/^👥 Needs exactly (\d+) players \(add bots\)$/, '👥 ठीक $1 खिलाड़ी चाहिए (बॉट जोड़ें)'],
  [/^👥 Needs at least (\d+) players \(add bots\)$/, '👥 कम से कम $1 खिलाड़ी चाहिए (बॉट जोड़ें)'],
];
