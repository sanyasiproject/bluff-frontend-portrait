import type { Dict, Pattern } from './types';

// Carrom table, tray, podium, rules and catalog lines
const you = (n: string) => (n === 'You' ? 'आप' : n);

export const D: Dict = {
  Carrom: 'कैरम',
  'Flick the striker, pocket your coins, cover the queen': 'स्ट्राइकर चलाओ, अपनी गोटियाँ डालो, रानी कवर करो',
  Mode: 'मोड',
  Classic: 'क्लासिक',
  Freestyle: 'फ़्रीस्टाइल',
  Length: 'लंबाई',
  Quick: 'छोटा',
  Full: 'पूरा',
  'One board': 'एक बोर्ड',
  'Your colour only, cover the queen. 4 play as 2v2': 'सिर्फ़ अपना रंग, रानी कवर करो। 4 हों तो 2 बनाम 2',
  'Any coin scores: white 20, black 10, queen 50': 'हर गोटी के अंक: सफ़ेद 20, काली 10, रानी 50',
  'Classic: first to 25. Freestyle: 3 boards': 'क्लासिक: पहले 25। फ़्रीस्टाइल: 3 बोर्ड',
  'Setting up the board…': 'बोर्ड सज रहा है…',
  'Your shot! Slide ↔ then pull back ↓': 'आपका शॉट! ↔ खिसकाओ, फिर ↓ पीछे खींचो',
  'The striker is on a coin: slide it off': 'स्ट्राइकर गोटी पर है: हटाओ',
  '👑 Cover the queen! Pocket your own coin': '👑 रानी कवर करो! अपनी गोटी डालो',
  '👑 Cover the queen!': '👑 रानी कवर करो!',
  '👑 Queen covered!': '👑 रानी कवर हो गई!',
  '👑 The queen goes back to the centre': '👑 रानी बीच में वापस',
  'Foul: the striker went in': 'फ़ाउल: स्ट्राइकर पॉकेट में गया',
  'Foul: the striker touched nothing': 'फ़ाउल: स्ट्राइकर किसी को नहीं छुआ',
  'Foul: last coin before the queen was covered': 'फ़ाउल: रानी कवर होने से पहले आख़िरी गोटी',
  'You pocketed': 'आपकी गोटियाँ',
  'Your team pocketed': 'आपकी टीम की गोटियाँ',
  White: 'सफ़ेद',
  Black: 'काली',
  'You: White': 'आप: सफ़ेद',
  'You: Black': 'आप: काली',
  '🎯 Game recap': '🎯 खेल का सार',
  '🏆 Winner:': '🏆 विजेता:',
  'Pocket your colour · cover the queen · striker in = foul': 'अपना रंग डालो · रानी कवर करो · स्ट्राइकर अंदर = फ़ाउल',
  'White 20 · Black 10 · Queen 50 · foul −10': 'सफ़ेद 20 · काली 10 · रानी 50 · फ़ाउल −10',
  '2–4 players. 19 coins in the centre: 9 white, 9 black and the red queen. Each player shoots from their own side.': '2–4 खिलाड़ी। बीच में 19 गोटियाँ: 9 सफ़ेद, 9 काली और लाल रानी। हर कोई अपनी तरफ़ से खेलता है।',
  "🎯 Slide the striker along your baseline (it can't sit on a coin), then pull back from it like a slingshot and let go. Pull further for more power.":
    '🎯 स्ट्राइकर को अपनी बेसलाइन पर खिसकाओ (गोटी पर नहीं रख सकते), फिर गुलेल की तरह पीछे खींचकर छोड़ो। ज़्यादा खींचो, ज़्यादा ज़ोर।',
  'Classic: you own a colour (white breaks first). Pocket your own coin or the queen and you shoot again. 4 players play 2 v 2; partners sit opposite.':
    'क्लासिक: आपका एक रंग है (सफ़ेद पहले तोड़ता है)। अपनी गोटी या रानी डालो तो फिर खेलो। 4 खिलाड़ी 2 बनाम 2; साथी आमने-सामने।',
  '👑 Queen: pocket one of your own coins first. After the queen, cover her by pocketing your own coin on the same or the next shot, or she goes back to the centre.':
    '👑 रानी: पहले अपनी एक गोटी डालो। रानी के बाद उसी या अगले शॉट में अपनी गोटी डालकर उसे कवर करो, वरना वो बीच में लौट जाती है।',
  '❌ Fouls: the striker falls in a pocket, or touches nothing. One of your pocketed coins goes back and your turn ends. Pocketing your last coin before the queen is covered is a foul too.':
    '❌ फ़ाउल: स्ट्राइकर पॉकेट में गिरे या किसी को न छुए। आपकी एक गोटी वापस जाती है और बारी ख़त्म। रानी कवर होने से पहले आख़िरी गोटी डालना भी फ़ाउल है।',
  "Pocket all your coins to win the board: 1 point for each of your rival's coins left, +3 if you covered the queen. Quick = 1 board; Full = first to 25 (or the leader after 8 boards).":
    'सारी गोटियाँ डालकर बोर्ड जीतो: विरोधी की हर बची गोटी का 1 अंक, रानी कवर की तो +3। छोटा = 1 बोर्ड; पूरा = पहले 25 (या 8 बोर्ड के बाद आगे वाला)।',
  'Freestyle: any coin counts. White 20, black 10, queen 50 (cover her). Pocket anything to shoot again; a foul is −10. Quick = 1 board, Full = 3 boards. Highest score wins.':
    'फ़्रीस्टाइल: हर गोटी गिनती है। सफ़ेद 20, काली 10, रानी 50 (कवर करो)। कुछ भी डालो तो फिर खेलो; फ़ाउल −10। छोटा = 1 बोर्ड, पूरा = 3 बोर्ड। सबसे ज़्यादा अंक जीतते हैं।',
  '⏰ About 20 seconds a shot; time up plays a soft straight shot for you.': '⏰ हर शॉट के लिए लगभग 20 सेकंड; समय ख़त्म तो एक हल्का सीधा शॉट अपने आप।',
  'Slide the striker on your baseline': 'स्ट्राइकर को बेसलाइन पर खिसकाओ',
  'Pull back and let go to shoot': 'पीछे खींचो और छोड़ो',
  'Pocket your coins to shoot again': 'अपनी गोटी डालो, फिर खेलो',
  'Cover the queen with your next coin': 'अगली गोटी से रानी कवर करो',
  pocketed: 'गोटियाँ',
  queens: 'रानी',
  fouls: 'फ़ाउल',
};

export const P: Pattern[] = [
  [/^Carrom · (Classic|Freestyle)$/, (m) => `कैरम · ${m[1] === 'Classic' ? 'क्लासिक' : 'फ़्रीस्टाइल'}`],
  [/^Power (\d+)% · let go to shoot$/, 'ज़ोर $1% · छोड़ो और शॉट'],
  [/^(.+) (?:is|are) aiming…$/, (m) => `${you(m[1])} निशाना लगा रहे हैं…`],
  [/^(.+) shoots? again!$/, (m) => `${you(m[1])} फिर खेलेंगे!`],
  [/^❌ Foul: (.+)$/, (m, tr) => `❌ ${tr(`Foul: ${m[1]}`)}`],
  [/^👑 Queen! (Now cover her|Cover pending)$/, (m) => (m[1] === 'Now cover her' ? '👑 रानी! अब कवर करो' : '👑 रानी! कवर बाक़ी')],
  [/^🏆 Board (\d+): (.+) \+(\d+)$/, (m) => `🏆 बोर्ड ${m[1]}: ${you(m[2])} +${m[3]}`],
  [/^· Board (\d+)(?: of (\d+))?$/, (m) => `· बोर्ड ${m[1]}${m[2] ? ` / ${m[2]}` : ''}`],
  [/^Board (\d+): (.+) \+(\d+)$/, (m) => `बोर्ड ${m[1]}: ${you(m[2])} +${m[3]}`],
  [/^(Classic|Freestyle) · (\d+) boards? played$/, (m) => `${m[1] === 'Classic' ? 'क्लासिक' : 'फ़्रीस्टाइल'} · ${m[2]} बोर्ड खेले`],
  [/^(-?\d+) pts · (\d+) 🪙$/, '$1 अंक · $2 🪙'],
];
