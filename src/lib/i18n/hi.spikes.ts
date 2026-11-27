import type { Dict, Pattern } from './types';

// Spike Attack table, arrow pad, podium, rules, profile counters and catalog lines

export const D: Dict = {
  'Spike Attack': 'स्पाइक अटैक',
  'Dodge the spikes, keep your 3 lives': 'काँटों से बचो, अपनी 3 जानें बचाओ',
  Arena: 'मैदान',
  Speed: 'रफ़्तार',
  Fast: 'तेज़',
  '3 second warnings to start': 'शुरू में 3 सेकंड की चेतावनी',
  '2 second warnings to start': 'शुरू में 2 सेकंड की चेतावनी',
  'Get ready: red lines get spiked!': 'तैयार हो जाओ: लाल लाइनों पर काँटे चलेंगे!',
  '🕹️ Drag anywhere to run · get off the red lines!': '🕹️ दौड़ने के लिए कहीं भी उँगली खींचो · लाल लाइनों से हटो!',
  "👻 You're out: cheer the others on": '👻 आप बाहर हैं: बाकियों का हौसला बढ़ाओ',
  '👀 Watching: dodge along with them': '👀 देख रहे हैं: उनके साथ बचते चलो',
  '🔺 Last one standing': '🔺 आख़िर तक टिका',
  dodges: 'बचाव',
  hits: 'चोटें',
  '2 to 4 players, all at once. The host picks a 5 × 5 or 6 × 6 arena and Normal or Fast.': '2 से 4 खिलाड़ी, सब एक साथ। होस्ट 5 × 5 या 6 × 6 मैदान और नॉर्मल या तेज़ चुनता है।',
  '🕹️ Run anywhere: touch the screen and drag, a joystick shows under your thumb. Drag further to run faster. Arrow keys or WASD on a computer.':
    '🕹️ कहीं भी दौड़ो: स्क्रीन छूकर उँगली खींचो, अँगूठे के नीचे जॉयस्टिक दिखेगा। ज़्यादा खींचो तो तेज़ दौड़ोगे। कंप्यूटर पर तीर वाले बटन या WASD।',
  "🔺 A row or column of boxes glows red with a 3-2-1 countdown: that's where a spike will shoot right across.":
    '🔺 बक्सों की कोई पंक्ति या कॉलम 3-2-1 गिनती के साथ लाल चमकता है: वहीं से काँटा आर-पार निकलेगा।',
  "💔 Any part of you still on that line when it strikes? You lose a heart. Everyone has 3; after a hit you're safe for a second.":
    '💔 वार के वक़्त आपका कोई भी हिस्सा उस लाइन पर? एक दिल गया। सबके पास 3 हैं; चोट के बाद एक सेकंड आप सुरक्षित हैं।',
  '⏩ Warnings get shorter and come more often as the game goes on.': '⏩ खेल आगे बढ़ने पर चेतावनी छोटी और जल्दी-जल्दी आती है।',
  "👻 No hearts left and you're out. The last one standing wins; if the last players fall together they share. After 3 minutes the most hearts wins.":
    '👻 दिल ख़त्म तो आप बाहर। आख़िर तक टिका जीतता है; आख़िरी खिलाड़ी साथ गिरें तो बाँटते हैं। 3 मिनट बाद सबसे ज़्यादा दिल वाला जीतता है।',
};

export const P: Pattern[] = [
  [/^🔺 (\d+) left$/, '🔺 $1 बचे'],
  [/^(\d+) players left$/, '$1 खिलाड़ी बचे'],
  [/^(\d+) lives$/, '$1 जानें'],
  [/^💔 (\d+) hits?$/, '💔 $1 चोट'],
];
