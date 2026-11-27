import type { Dict, Pattern } from './types';

// Fruit Slice Duel table, podium, rules, profile counters and catalog lines

export const D: Dict = {
  'Fruit Slice Duel': 'फ्रूट स्लाइस मुक़ाबला',
  'Slice the same fruit faster, dodge the bombs': 'वही फल तेज़ी से काटो, बम से बचो',
  Arcade: 'आर्केड',
  Time: 'समय',
  '45 sec': '45 सेकंड',
  '60 sec': '60 सेकंड',
  'Get ready: swipe across the fruit to slice': 'तैयार हो जाओ: फल काटने के लिए उन पर उँगली फेरो',
  'Swipe to slice': 'काटने के लिए स्वाइप करो',
  'keep off the 💣': '💣 से दूर रहो',
  '👀 Watching: everyone slices the same fruit': '👀 देख रहे हैं: सब एक जैसे फल काट रहे हैं',
  'Fruit play area: swipe to slice': 'फलों का मैदान: काटने के लिए स्वाइप करो',
  "🍉 Time's up!": '🍉 समय ख़त्म!',
  '🔪 Most sliced:': '🔪 सबसे ज़्यादा काटे:',
  '⚡ Best combo:': '⚡ सबसे बड़ा कॉम्बो:',
  '💣 Bomb magnet:': '💣 बम चुंबक:',
  'See results': 'नतीजे देखें',
  'GO!': 'चलो!',
  sliced: 'काटे',
  'best combo': 'बेस्ट कॉम्बो',
  bombs: 'बम',
  '2 to 4 players, all at once. The host picks 45 or 60 seconds.': '2 से 4 खिलाड़ी, सब एक साथ। होस्ट 45 या 60 सेकंड चुनता है।',
  "🍉 After 3-2-1 the same fruit fly up on everyone's screen. Swipe across them to slice.": '🍉 3-2-1 के बाद सबकी स्क्रीन पर वही फल उछलते हैं। उन पर स्वाइप करके काटो।',
  'Points: 🍎 🍊 🍌 1': 'पॉइंट: 🍎 🍊 🍌 1',
  '⚡ Combo: 3 or more fruit in one swipe gives +1 for each fruit over 2.': '⚡ कॉम्बो: एक स्वाइप में 3 या ज़्यादा फल = 2 से ऊपर हर फल पर +1।',
  '💣 Slicing a bomb costs 10 points and shakes your screen.': '💣 बम काटने पर 10 पॉइंट कटते हैं और स्क्रीन हिलती है।',
  '🏆 When the time is up the highest score wins; equal scores share.': '🏆 समय ख़त्म होने पर सबसे ज़्यादा स्कोर जीतता है; बराबर स्कोर वाले जगह बाँटते हैं।',
};

export const P: Pattern[] = [
  [/^Combo ×(\d+)! \+(\d+)$/, 'कॉम्बो ×$1! +$2'],
];
