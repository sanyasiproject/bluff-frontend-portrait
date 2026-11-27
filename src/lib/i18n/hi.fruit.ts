import type { Dict, Pattern } from './types';

// Fruit Slice Duel (reaction duel) table, podium, rules, profile counters and catalog lines

export const D: Dict = {
  'Fruit Slice Duel': 'फ्रूट स्लाइस मुक़ाबला',
  'Fastest sword takes the fruit. Never cut the magnet!': 'सबसे तेज़ तलवार फल ले जाती है। चुंबक कभी मत काटो!',
  Arcade: 'आर्केड',
  Rounds: 'राउंड',
  '15 items': '15 चीज़ें',
  '25 items': '25 चीज़ें',
  'Strike the fruit first · never the 🧲': 'फल पर सबसे पहले वार करो · 🧲 पर कभी नहीं',
  "🧲 Magnet! Don't strike": '🧲 चुंबक! वार मत करो',
  '⚔️ STRIKE!': '⚔️ वार करो!',
  'Wait for it…': 'रुको…',
  'Get ready…': 'तैयार…',
  "DON'T CUT!": 'मत काटो!',
  STRIKE: 'वार',
  Strike: 'वार',
  'Too early!': 'बहुत जल्दी!',
  'Reaction times': 'प्रतिक्रिया समय',
  '👀 Watching: fastest sword takes the fruit': '👀 देख रहे हैं: सबसे तेज़ तलवार फल ले जाती है',
  '🍉 Fruit Slice Duel': '🍉 फ्रूट स्लाइस मुक़ाबला',
  '⚡ Fastest sword:': '⚡ सबसे तेज़ तलवार:',
  '🍉 Most fruit:': '🍉 सबसे ज़्यादा फल:',
  '🧲 Magnet grabs:': '🧲 चुंबक पकड़े:',
  'See results': 'नतीजे देखें',
  'GO!': 'चलो!',
  won: 'जीते',
  magnets: 'चुंबक',
  best: 'बेस्ट',
  '2 to 4 players, all at once. The host picks 15 or 25 items.': '2 से 4 खिलाड़ी, सब एक साथ। होस्ट 15 या 25 चीज़ें चुनता है।',
  '⚔️ Everyone has a sword and one big Strike button. One item at a time pops up on the plate in the middle, at a moment nobody can guess.':
    '⚔️ सबके पास एक तलवार और एक बड़ा वार बटन है। बीच की थाली पर एक बार में एक चीज़ आती है, ऐसे पल पर जिसका किसी को अंदाज़ा नहीं।',
  "🍉 A fruit: the fastest strike wins it. Your time counts from when the fruit showed on your own screen, so a slow internet doesn't hurt.":
    '🍉 फल: सबसे तेज़ वार उसे जीतता है। आपका समय आपकी अपनी स्क्रीन पर फल दिखने से गिना जाता है, इसलिए धीमा इंटरनेट नुकसान नहीं करता।',
  'Points: 🍎 🍊 🍌 1 · 🍇 🥭 2 · 🍉 3.': 'पॉइंट: 🍎 🍊 🍌 1 · 🍇 🥭 2 · 🍉 3।',
  "🧲 A magnet: don't strike it! Strike it and your sword is slow for the next 2 items (+0.35s on your time). No points are lost.":
    '🧲 चुंबक: उस पर वार मत करो! वार किया तो अगली 2 चीज़ों तक आपकी तलवार धीमी रहेगी (आपके समय में +0.35s)। पॉइंट नहीं कटते।',
  '✋ Tapping before anything shows does nothing; one strike per item.': '✋ कुछ दिखने से पहले टैप करने से कुछ नहीं होता; हर चीज़ पर एक ही वार।',
  '🏆 After the last item the highest score wins; equal scores share.': '🏆 आख़िरी चीज़ के बाद सबसे ज़्यादा स्कोर जीतता है; बराबर स्कोर वाले बाँटते हैं।',
};

export const P: Pattern[] = [
  [/^🧲 Slowed (\d+) items$/, '🧲 $1 चीज़ों तक धीमे'],
  [/^🧲 slow ×(\d+)$/, '🧲 धीमा ×$1'],
  [/^Item (\d+) of (\d+)$/, 'चीज़ $1 / $2'],
  [/^(\d+) points$/, '$1 पॉइंट'],
];
