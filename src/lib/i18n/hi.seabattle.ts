import type { Dict, Pattern } from './types';

// Sea Battle table, placement, powers, podium, rules and catalog lines
const you = (n: string) => (n === 'You' ? 'आप' : n);
const POWER: Record<string, string> = { Radar: 'रडार', Salvo: 'सैल्वो', Torpedo: 'टॉरपीडो' };

export const D: Dict = {
  'Sea Battle': 'समुद्री जंग',
  'Hide your fleet, hunt everyone else’s': 'अपना बेड़ा छुपाओ, बाक़ी सबका ढूँढो',
  Powers: 'पावर',
  On: 'चालू',
  Off: 'बंद',
  'Sink a ship to earn Radar, Salvo or Torpedo': 'जहाज़ डुबाओ, रडार, सैल्वो या टॉरपीडो पाओ',
  'Plain shots only': 'सिर्फ़ सादे शॉट',
  'Launching the fleets…': 'बेड़े निकल रहे हैं…',
  'Waiting for the other fleets…': 'बाक़ी बेड़ों का इंतज़ार…',
  '✅ Ready! Waiting for the others…': '✅ तैयार! बाक़ियों का इंतज़ार…',
  'Drag a ship to move it · tap it to turn': 'जहाज़ खींचकर हटाओ · टैप करके घुमाओ',
  '🔀 Shuffle': '🔀 फेंटो',
  'Place the whole fleet: 5, 4, 3, 3 and 2': 'पूरा बेड़ा रखो: 5, 4, 3, 3 और 2',
  'Ships must stay on the sea': 'जहाज़ समुद्र में ही रहें',
  'Ships may not overlap': 'जहाज़ एक-दूसरे पर नहीं आ सकते',
  'Ships may not touch, not even at the corners': 'जहाज़ छू नहीं सकते, कोनों से भी नहीं',
  '🛟 Your sea': '🛟 आपका समुद्र',
  'Sink a ship to earn a power': 'पावर पाने के लिए जहाज़ डुबाओ',
  Radar: 'रडार',
  Salvo: 'सैल्वो',
  Torpedo: 'टॉरपीडो',
  'Tap a cell: count the ship cells in the 3 × 3 round it': 'एक खाना टैप करो: उसके आसपास 3 × 3 में जहाज़ के खाने गिनो',
  'Tap 3 cells to fire at once': '3 खाने टैप करो, एक साथ फ़ायर',
  'Tap any cell: the torpedo runs along that row from the left': 'कोई खाना टैप करो: टॉरपीडो उस पंक्ति में बाएँ से चलेगा',
  '🎯 Hit! Fire again': '🎯 निशाना लगा! फिर फ़ायर करो',
  '⚓ Game recap': '⚓ खेल का सार',
  '🏆 Last fleet afloat:': '🏆 आख़िरी तैरता बेड़ा:',
  '🌊 sunk': '🌊 डूब गया',
  You: 'आप',
  '2–4 players. Each has a 10 × 10 sea and 5 ships (5, 4, 3, 3 and 2 cells long).': '2–4 खिलाड़ी। हर किसी के पास 10 × 10 समुद्र और 5 जहाज़ (5, 4, 3, 3 और 2 खाने लंबे)।',
  "⚓ Place your ships in 60 seconds: drag them, tap to turn, or Shuffle. Ships can't touch, not even corner to corner. Tap Ready when done; anything left is placed for you.":
    '⚓ 60 सेकंड में जहाज़ रखो: खींचो, टैप करके घुमाओ, या फेंटो। जहाज़ छू नहीं सकते, कोनों से भी नहीं। हो जाए तो तैयार दबाओ; बचे हुए अपने आप रखे जाएँगे।',
  '🎯 On your turn pick any rival still afloat and fire at a cell. A hit or a sink fires again; a miss ends your turn.': '🎯 अपनी बारी पर कोई भी तैरता विरोधी चुनो और एक खाने पर फ़ायर करो। निशाना लगे या डूबे तो फिर फ़ायर; चूके तो बारी ख़त्म।',
  "Everyone sees every shot on every sea, but nobody sees ships that haven't been hit.": 'हर समुद्र का हर शॉट सबको दिखता है, पर बिना लगे जहाज़ किसी को नहीं दिखते।',
  '⚡ With powers on, sinking a ship earns one (hold 2): 📡 Radar counts ship cells in a 3 × 3 area, 🎆 Salvo fires 3 shots at once, 🚀 Torpedo runs along a row from the left until it hits.':
    '⚡ पावर चालू हो तो जहाज़ डुबाने पर एक मिलती है (2 तक): 📡 रडार 3 × 3 में जहाज़ के खाने गिनता है, 🎆 सैल्वो एक साथ 3 शॉट, 🚀 टॉरपीडो पंक्ति में बाएँ से चलकर पहले जहाज़ से टकराता है।',
  'All your ships sunk and you\'re out. The last fleet afloat wins. ⏰ About 20 seconds a shot; time up fires for you.': 'सारे जहाज़ डूबे तो आप बाहर। आख़िरी तैरता बेड़ा जीतता है। ⏰ हर शॉट के लिए लगभग 20 सेकंड; समय ख़त्म तो अपने आप फ़ायर।',
  'Place 5 ships, not touching': '5 जहाज़ रखो, छूते हुए नहीं',
  'Fire at any rival sea': 'किसी भी विरोधी के समुद्र पर फ़ायर',
  'A hit fires again': 'निशाना लगे तो फिर फ़ायर',
  hits: 'निशाने',
  sunk: 'डुबाए',
  shots: 'शॉट',
};

export const P: Pattern[] = [
  [/^Sea Battle( · ⚡)?$/, (m) => `समुद्री जंग${m[1] ?? ''}`],
  [/^⚓ Place your fleet · (\d+)s$/, '⚓ अपना बेड़ा रखो · $1 सेकंड'],
  [/^⚓ Ready · (\d+)s$/, '⚓ तैयार · $1 सेकंड'],
  [/^Your shot! Fire at (.+)$/, 'आपका शॉट! $1 पर फ़ायर करो'],
  [/^(.+) (?:is|are) aiming…$/, (m) => `${you(m[1])} निशाना लगा रहे हैं…`],
  [/^🎯 (.+)'s sea$/, '🎯 $1 का समुद्र'],
  [/^📡 Radar: (\d+) ship cells?$/, '📡 रडार: जहाज़ के $1 खाने'],
  [/^💀 (.+) (?:is|are) sunk!$/, (m) => `💀 ${you(m[1])} डूब गए!`],
  [/^💥 (.+) sank a ship!(?: (\S+) (Radar|Salvo|Torpedo) earned)?$/, (m) => `💥 ${you(m[1])} ने जहाज़ डुबाया!${m[2] ? ` ${m[2]} ${POWER[m[3]]} मिला` : ''}`],
  [/^🚢 (\d) afloat$/, '🚢 $1 तैर रहे'],
  [/^(\d) fleets · powers (on|off)$/, (m) => `${m[1]} बेड़े · पावर ${m[2] === 'on' ? 'चालू' : 'बंद'}`],
  [/^Ships 5 · 4 · 3 · 3 · 2 · hit = fire again( · sink = power)? · A–J$/, (m) => `जहाज़ 5 · 4 · 3 · 3 · 2 · निशाना = फिर फ़ायर${m[1] ? ' · डुबाओ = पावर' : ''} · A–J`],
];
