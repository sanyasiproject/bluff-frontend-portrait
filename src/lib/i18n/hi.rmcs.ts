import type { Dict, Pattern } from './types';

// Raja Mantri Chor Sipahi table, podium and rules
const you = (n: string) => (n === 'You' ? 'आप' : n);
const ROLE: Record<string, string> = { Raja: 'राजा', Mantri: 'मंत्री', Chor: 'चोर', Sipahi: 'सिपाही' };

export const D: Dict = {
  'Raja Mantri Chor Sipahi': 'राजा मंत्री चोर सिपाही',
  'Setting up the table…': 'टेबल लग रही है…',
  Raja: 'राजा',
  Mantri: 'मंत्री',
  Chor: 'चोर',
  Sipahi: 'सिपाही',
  'Tap!': 'टैप!',
  'Folded chit': 'मुड़ी हुई पर्ची',
  'Open my chit': 'मेरी पर्ची खोलें',
  'Tap your chit to open it': 'अपनी पर्ची खोलने के लिए टैप करें',
  'Waiting for the others to open': 'बाकी सबके खोलने का इंतज़ार',
  'Everyone is opening their chit': 'सब अपनी पर्ची खोल रहे हैं',
  'You are the Mantri: find the Chor!': 'आप मंत्री हैं: चोर को ढूँढो!',
  'Who is the Chor? Tap a chit': 'चोर कौन है? एक पर्ची पर टैप करें',
  'Chor bach gaya! 😈': 'चोर बच गया! 😈',
  ': act innocent 🤫': ': भोले बने रहो 🤫',
  'You are the': 'आप हैं',
  '📜 Every round': '📜 हर राउंड',
  "Mantri's guess": 'मंत्री का अंदाज़ा',
  'Exactly 4 players: add 🤖 bots to fill the seats. The host picks 5 or 10 rounds.': 'ठीक 4 खिलाड़ी: सीटें भरने के लिए 🤖 बॉट जोड़ें। होस्ट 5 या 10 राउंड चुनता है।',
  '📜 Each round 4 secret chits are dealt: 👑 Raja, 🧐 Mantri, 🦹 Chor and 👮 Sipahi.': '📜 हर राउंड 4 गुप्त पर्चियाँ बँटती हैं: 👑 राजा, 🧐 मंत्री, 🦹 चोर और 👮 सिपाही।',
  '👑 The Raja shows himself to everyone. Then the Mantri is shown too.': '👑 राजा सबको अपनी पर्ची दिखाता है। फिर मंत्री भी दिखता है।',
  '🧐 The Mantri has 20 seconds to point at the Chor among the other two. Time up counts as wrong.': '🧐 मंत्री के पास बाकी दो में से चोर पकड़ने के लिए 20 सेकंड हैं। समय ख़त्म = ग़लत।',
  "❌ A wrong guess swaps the Mantri's and the Chor's points for that round.": '❌ ग़लत अंदाज़े पर उस राउंड मंत्री और चोर के पॉइंट्स आपस में बदल जाते हैं।',
  '🏆 After the last round the highest total wins; equal totals share the place.': '🏆 आख़िरी राउंड के बाद सबसे ज़्यादा कुल पॉइंट्स वाला जीतता है; बराबर वाले एक ही जगह बाँटते हैं।',
};

export const P: Pattern[] = [
  [/^Round (\d+) of (\d+)$/, 'राउंड $1 / $2'],
  [/^Round (\d+)\/(\d+)$/, 'राउंड $1/$2'],
  [/^Raja is (.+) 👑$/, (m) => (m[1] === 'You' ? 'राजा आप हैं 👑' : `राजा है ${m[1]} 👑`)],
  [/^Mantri (.+), find the Chor!$/, 'मंत्री $1, चोर को ढूँढो!'],
  [/^Pakda gaya! 🦹 (.+) (?:was|were) the Chor$/, (m) => `पकड़ा गया! 🦹 ${you(m[1])} चोर ${m[1] === 'You' ? 'थे' : 'था'}`],
  [/^(.+) (?:is|are) thinking…$/, (m) => `${you(m[1])} सोच रहे हैं…`],
  [/^(.+) caught the Chor$/, (m) => `${you(m[1])} ने चोर पकड़ लिया`],
  [/^(.+) guessed wrong: points swap$/, (m) => `${you(m[1])} का अंदाज़ा ग़लत: पॉइंट्स बदल गए`],
  [/^You are the (\S+)$/, 'आप हैं $1'],
  [/^(Raja|Mantri|Chor|Sipahi) chit$/, (m) => `${ROLE[m[1]]} की पर्ची`],
  [/^(.+) is the Chor$/, '$1 चोर है'],
  [/^(\d+) seconds left$/, '$1 सेकंड बाकी'],
  [/^Tap your chit to open it\. It opens by itself after (\d+) seconds\. Only you see yours\.$/, 'अपनी पर्ची खोलने के लिए टैप करें। $1 सेकंड बाद यह अपने आप खुल जाती है। अपनी पर्ची सिर्फ़ आप देखते हैं।'],
  [/^Points: Raja (\d+), Mantri (\d+), Sipahi (\d+), Chor (\d+)\.$/, 'पॉइंट्स: राजा $1, मंत्री $2, सिपाही $3, चोर $4।'],
];
