import type { Dict, Pattern } from './types';

// Profile games cards, Ludo rules sheet, tutorial chooser, Ludo achievements
export const D: Dict = {
  Games: 'गेम',
  played: 'खेले',
  wins: 'जीत',
  'win rate': 'जीत दर',
  kills: 'मारे',
  home: 'घर पहुँचीं',
  sixes: 'छक्के',
  'How to play': 'कैसे खेलें',
  'Got it': 'समझ गया',
  'Show rules': 'नियम दिखाएँ',
  'Read the rules in 1 minute. You can open them again any time from 📘 How to play.': '1 मिनट में नियम पढ़ें। 📘 कैसे खेलें से इन्हें कभी भी फिर खोल सकते हैं।',
  'The rules in 1 minute: roll, race and knock gotis home': '1 मिनट में नियम: पासा फेंको, दौड़ो और गोटियाँ पीटो',
  'A 6 opens a goti': '6 आने पर गोटी खुलती है',
  'Stars and start squares are safe': 'सितारे और शुरू के खाने सुरक्षित हैं',
  'A kill earns another roll': 'गोटी काटने पर एक और बारी',
  'Home needs the exact number': 'घर के लिए ठीक उतना ही अंक चाहिए',
  'Loading…': 'लोड हो रहा है…',
  // rules list
  '2 players play red and yellow (opposite), 3 add green, 4 use every colour. Turns go clockwise.': '2 खिलाड़ी लाल और पीले (आमने-सामने) से खेलते हैं, 3 में हरा जुड़ता है, 4 में सारे रंग। बारी घड़ी की दिशा में चलती है।',
  'Tap the dice to roll. A 6 opens a goti from your base onto your start square.': 'पासा फेंकने के लिए उसे छुएँ। 6 आने पर घर से एक गोटी आपके शुरू वाले खाने पर आती है।',
  'Move one goti by the number rolled. Go round the board, then up your coloured lane: reaching home needs the exact number.': 'आए अंक जितनी एक गोटी चलाएँ। पूरा बोर्ड घूमकर अपने रंग की पट्टी में चढ़ें: घर पहुँचने के लिए ठीक अंक चाहिए।',
  "Land on an opponent's goti to knock it back to their base. Not on ⭐ safe squares or start squares, and never your partner's.": 'विरोधी की गोटी पर उतरें तो वह वापस उसके घर जाती है। ⭐ सुरक्षित और शुरू के खानों पर नहीं, और साथी की गोटी कभी नहीं।',
  'Roll again after a 6, a kill or a goti reaching home. Three 6s in a row lose the turn.': '6, गोटी काटने या गोटी घर पहुँचने पर फिर से पासा। लगातार तीन 6 पर बारी चली जाती है।',
  'Nothing can move: the turn passes. Only one goti can move: it moves by itself.': 'कोई गोटी नहीं चल सकती: बारी आगे। सिर्फ़ एक चल सकती है: वह अपने आप चलती है।',
  'Classic: bring all 4 gotis home; play goes on for 2nd and 3rd place.': 'क्लासिक: चारों गोटियाँ घर लाएँ; दूसरे और तीसरे स्थान के लिए खेल चलता रहता है।',
  'Master: your home lane opens only after your first kill.': 'मास्टर: आपकी घर की पट्टी पहली गोटी काटने के बाद ही खुलती है।',
  '2 vs 2: partners sit opposite. Once your gotis are home you roll and move for your partner; the team wins when both are done.': '2 बनाम 2: साथी आमने-सामने बैठते हैं। आपकी गोटियाँ घर पहुँच जाएँ तो आप साथी के लिए पासा फेंकते और चलते हैं; दोनों पूरे हों तो टीम जीतती है।',
  'With the turn timer on, time up rolls and moves for you. Leaving mid-game counts as a loss.': 'टर्न टाइमर चालू हो तो समय ख़त्म होने पर पासा और चाल अपने आप। बीच में छोड़ना हार गिना जाता है।',
  // achievements
  'First kill': 'पहली गोटी काटी',
  'Knock off a goti in Ludo': 'लूडो में एक गोटी काटें',
  'Goti hunter': 'गोटी शिकारी',
  'Knock off 50 gotis in Ludo': 'लूडो में 50 गोटियाँ काटें',
  Homecoming: 'घर वापसी',
  'Bring 25 gotis home in Ludo': 'लूडो में 25 गोटियाँ घर लाएँ',
  Sixer: 'छक्केबाज़',
  'Roll 100 sixes in Ludo': 'लूडो में 100 छक्के फेंकें',
  'Ludo champ': 'लूडो चैंपियन',
  'Win 10 games of Ludo': 'लूडो के 10 गेम जीतें',
};

export const P: Pattern[] = [
  [/^How to play (.+)$/, '$1 कैसे खेलें'],
  [/^Quick: gotis start open; the first to bring (\d+) home wins\.$/, 'क्विक: गोटियाँ खुली शुरू होती हैं; जो पहले $1 घर लाए वह जीते।'],
  [
    /^Timed: most points when time runs out\. (\d+) per square, (\d+) per kill, (\d+) per goti home; a goti knocked off loses its squares\.$/,
    'टाइम्ड: समय ख़त्म होने पर सबसे ज़्यादा अंक वाला जीते। हर खाना $1, हर कटी गोटी $2, हर घर पहुँची गोटी $3; कटी गोटी के चले खाने घट जाते हैं।',
  ],
];
