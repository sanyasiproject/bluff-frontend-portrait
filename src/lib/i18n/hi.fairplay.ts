import type { Dict, Pattern } from './types';

// error screen, reconnecting, server restarts, held seats and forfeits
export const D: Dict = {
  'Something went wrong': 'कुछ गड़बड़ हो गई',
  'This screen hit a problem. Reload to try again.': 'इस स्क्रीन में दिक्कत आई। फिर से लोड करके देखें।',
  Reload: 'फिर से लोड करें',
  'Back to Home': 'होम पर वापस',
  'Game not recovered': 'गेम वापस नहीं आया',
  "The game server restarted and that game couldn't be recovered. No coins moved.": 'गेम सर्वर फिर से शुरू हुआ और वह गेम वापस नहीं आ सका। कोई सिक्के नहीं कटे।',
  'Your seat is held': 'आपकी सीट रुकी हुई है',
  'Server is restarting, your game will continue in a moment': 'सर्वर फिर से शुरू हो रहा है, आपका गेम थोड़ी देर में चालू होगा',
  'Something went wrong with this game, so it was stopped. No coins moved': 'इस गेम में कुछ गड़बड़ हुई, इसलिए गेम रोका गया। कोई सिक्के नहीं कटे',
  'On staked and ranked tables the game plays to the end': 'दांव और रैंक वाली टेबल पर गेम आख़िर तक चलता है',
  'Stop and forfeit?': 'रोकें और हार मानें?',
  'On staked and ranked tables, stopping counts as your forfeit: you lose this game and the others play on.':
    'दांव और रैंक वाली टेबल पर रोकना आपकी हार गिना जाता है: आप यह गेम हारेंगे और बाकी खेलते रहेंगे।',
  'Stop and forfeit': 'रोकें और हारें',
  'engine stopped': 'इंजन रुक गया',
};

export const P: Pattern[] = [
  [/^(.+) left the game and forfeits it$/, (m) => `${m[1]} गेम छोड़ गए, उनकी हार`],
  [/^(.+) was offline too long and forfeits the game$/, (m) => `${m[1]} बहुत देर ऑफ़लाइन रहे, उनकी हार`],
  [/^(.+) stopped a staked game, which counts as a forfeit$/, (m) => `${m[1]} ने दांव वाला गेम रोका, इसलिए उनकी हार`],
  [/^⏳ (.+) offline · seat held (\d+:\d\d)$/, (m) => `⏳ ${m[1]} ऑफ़लाइन · सीट रुकी है ${m[2]}`],
];
