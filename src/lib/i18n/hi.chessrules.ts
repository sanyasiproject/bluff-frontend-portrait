import type { Dict } from './types';

// Chess rules sheet: the general lines and each variant's rules
export const D: Dict = {
  "2 players, White moves first. Anyone else in the room watches, and watchers see the engine's best move.":
    '2 खिलाड़ी, पहली चाल सफ़ेद की। कमरे में बाक़ी सब देखते हैं, और देखने वालों को इंजन की सबसे अच्छी चाल दिखती है।',
  '♟️ Tap a piece, then a square, or drag it. Dots show where it can go, rings show captures.': '♟️ मोहरे पर टैप करें, फिर खाने पर, या उसे खींचें। बिंदु बताते हैं कहाँ जा सकता है, घेरे बताते हैं किसे काट सकता है।',
  "⏱️ The clock adds its increment after each move (3 + 2: 3 minutes, plus 2 seconds a move). Run out and you lose, unless the other side cannot mate: then it's a draw.":
    '⏱️ हर चाल के बाद घड़ी में बढ़त जुड़ती है (3 + 2: 3 मिनट, हर चाल पर 2 सेकंड)। समय ख़त्म तो हार, जब तक सामने वाला मात न दे सके: तब ड्रॉ।',
  '🤝 Offer a draw, resign, or abort before both sides have moved. Takebacks only in casual games.': '🤝 ड्रॉ माँगें, हार मानें, या दोनों की पहली चाल से पहले गेम रद्द करें। चाल वापसी सिर्फ़ दोस्ताना गेम में।',
  '📈 Rated games (both logged in, a clock, no bots) move your rating, separately for each speed and variant. Everyone starts at 800; a "?" means the rating is still settling.':
    '📈 रेटेड गेम (दोनों लॉग-इन, घड़ी के साथ, बॉट नहीं) आपकी रेटिंग बदलते हैं, हर स्पीड और वेरिएंट की अलग। सब 800 से शुरू करते हैं; "?" मतलब रेटिंग अभी पक्की नहीं।',
  '🔍 After the game, tap Analyse: the engine marks each move and shows a better one.': '🔍 गेम के बाद विश्लेषण दबाएँ: इंजन हर चाल को परखता है और बेहतर चाल दिखाता है।',
  'Checkmate the king to win. Stalemate, threefold repetition, the 50-move rule and too few pieces to mate are draws.':
    'राजा को मात दो और जीतो। स्टेलमेट, तीन बार वही स्थिति, 50 चालों का नियम और मात लायक मोहरे न होना ड्रॉ है।',
  'The back rank is shuffled into one of 960 starts (bishops on opposite colours, king between the rooks). Black mirrors White.':
    'पीछे की पंक्ति 960 में से किसी एक तरह से सजती है (ऊँट अलग रंग के खानों पर, राजा दोनों हाथियों के बीच)। काला, सफ़ेद जैसा ही सजता है।',
  'Castling still puts the king and rook on the usual squares (g and f, or c and d). Tap the king, then its rook or its castling square.':
    'कैसलिंग में राजा और हाथी वहीं पहुँचते हैं जहाँ आम तौर पर (g और f, या c और d)। राजा पर टैप करें, फिर उसके हाथी या कैसलिंग वाले खाने पर।',
  'A piece you capture joins your pocket in your colour. On your turn, drop a pocket piece on any empty square instead of moving.':
    'जो मोहरा आप काटते हैं वो आपके रंग में आपकी जेब में आता है। अपनी बारी में चाल की जगह जेब का मोहरा किसी ख़ाली खाने पर रख सकते हैं।',
  'Pawns cannot be dropped on the first or last rank. A promoted piece goes back to the pocket as a pawn.': 'प्यादा पहली या आख़िरी पंक्ति पर नहीं रखा जा सकता। तरक़्क़ी पाया मोहरा कटने पर प्यादा बनकर जेब में जाता है।',
  'Normal chess, plus: bring your king to one of the 4 centre squares (d4, e4, d5, e5) to win at once.': 'आम शतरंज, और: अपने राजा को बीच के 4 खानों (d4, e4, d5, e5) में से किसी पर ले जाओ और तुरंत जीतो।',
  'Normal chess, plus: give check 3 times to win. The counters by each player show checks given.': 'आम शतरंज, और: 3 बार शह दो और जीतो। हर खिलाड़ी के पास के निशान बताते हैं कितने शह दिए।',
  'If you can capture, you must. The king is an ordinary piece: no check, no castling, and pawns may promote to a king.':
    'काट सकते हो तो काटना ज़रूरी है। राजा आम मोहरा है: कोई शह नहीं, कैसलिंग नहीं, और प्यादा राजा भी बन सकता है।',
  'Lose all your pieces, or be stalemated, and you win.': 'सारे मोहरे गँवा दो, या पात हो जाओ, तो आप जीते।',
  'Every capture explodes: the capturing piece, the captured one and every piece except pawns on the 8 squares around are gone.':
    'हर काट पर धमाका: काटने वाला, कटने वाला और आसपास के 8 खानों के सारे मोहरे (प्यादों को छोड़) उड़ जाते हैं।',
  'Blow up the enemy king to win. Kings cannot capture, and kings standing side by side cannot check each other.': 'सामने वाले राजा को उड़ाओ और जीतो। राजा काट नहीं सकता, और पास-पास खड़े राजा एक-दूसरे को शह नहीं दे सकते।',
  'White has 36 pawns and no king; Black has a normal army. White wins by checkmate; Black wins by capturing every white piece.':
    'सफ़ेद के पास 36 प्यादे हैं और राजा नहीं; काले के पास पूरी फ़ौज। सफ़ेद मात देकर जीतता है; काला सफ़ेद के सारे मोहरे काटकर।',
  "White's pawns on the first rank may move two squares.": 'सफ़ेद के पहली पंक्ति वाले प्यादे दो खाने चल सकते हैं।',
  'Both sides start on the first two ranks. Giving check is not allowed at all.': 'दोनों पहली दो पंक्तियों से शुरू करते हैं। शह देना बिल्कुल मना है।',
  'The first king to reach the 8th rank wins. If White gets there first and Black can too on the very next move, it is a draw.':
    'जो राजा पहले 8वीं पंक्ति पर पहुँचे वो जीते। अगर सफ़ेद पहले पहुँचे और काला अगली ही चाल में पहुँच सके, तो ड्रॉ।',
};
