import type { Dict, Pattern } from './types';

// Ultimate Tic-Tac-Toe table, podium, rules and catalog lines
const you = (n: string) => (n === 'You' ? 'आप' : n);

export const D: Dict = {
  'Ultimate Tic-Tac-Toe': 'सुपर टिक-टैक-टो',
  'Nine boards in one. Every move sends your rival': 'एक में नौ बोर्ड। हर चाल विरोधी को भेजती है',
  'Drawing the board…': 'बोर्ड बन रहा है…',
  'Marking…': 'निशान लग रहा है…',
  'Your move! Play anywhere': 'आपकी चाल! कहीं भी खेलो',
  'Free move! Play in any glowing board': 'खुली चाल! किसी भी चमकते बोर्ड में खेलो',
  'Your move! Play in the glowing board': 'आपकी चाल! चमकते बोर्ड में खेलो',
  'Hold a cell to see where it sends them · lift to play': 'खाना दबाए रखो, देखो वो कहाँ भेजेगा · उंगली उठाओ तो चाल',
  'Each cell sends the next player to the matching board': 'हर खाना अगले खिलाड़ी को उसी जगह के बोर्ड में भेजता है',
  'Win 3 small boards in a line · sent to a closed board = free move': 'एक लाइन में 3 छोटे बोर्ड जीतो · बंद बोर्ड पर भेजा = खुली चाल',
  '#️⃣ Game recap': '#️⃣ खेल का सार',
  '🤝 No big line: a draw': '🤝 बड़ी लाइन नहीं बनी: ड्रॉ',
  'Ultimate tic-tac-toe board': 'सुपर टिक-टैक-टो बोर्ड',
  '2 players, ✕ and ◯. The big board is 3 × 3 small tic-tac-toe boards. ✕ moves first, anywhere.': '2 खिलाड़ी, ✕ और ◯। बड़ा बोर्ड 3 × 3 छोटे टिक-टैक-टो बोर्डों से बना है। ✕ पहले चलता है, कहीं भी।',
  '➡️ The cell you play sends your opponent to the matching small board: play the top-right cell and they must play in the top-right board.': '➡️ आप जिस खाने में खेलते हो, वो विरोधी को उसी जगह के छोटे बोर्ड में भेजता है: ऊपर-दाएँ खाना खेलो तो उन्हें ऊपर-दाएँ बोर्ड में खेलना होगा।',
  '🆓 If that board is already won or full, they get a free move in any open board.': '🆓 अगर वो बोर्ड जीता जा चुका या भरा है, तो उन्हें किसी भी खुले बोर्ड में खुली चाल मिलती है।',
  '✕ Three in a row in a small board wins it and stamps it with your mark. A full small board with no line counts for nobody.': '✕ छोटे बोर्ड में तीन एक लाइन में तो वो बोर्ड आपका, उस पर आपका निशान। भरा बोर्ड बिना लाइन के किसी का नहीं।',
  "🏆 Win three small boards in a line on the big board. If every board is decided with no big line, it's a draw.": '🏆 बड़े बोर्ड पर एक लाइन में तीन छोटे बोर्ड जीतो। सारे बोर्ड तय हों और बड़ी लाइन न बने तो ड्रॉ।',
  '👆 Hold a cell to see where it sends them, lift to play, slide off to cancel. ⏰ About 25 seconds a move.': '👆 खाना दबाए रखो तो दिखेगा कहाँ भेजेगा, उंगली उठाओ तो चाल, हटाकर खिसकाओ तो रद्द। ⏰ हर चाल लगभग 25 सेकंड।',
  'Nine small boards in one big one': 'एक बड़े में नौ छोटे बोर्ड',
  'Your cell sends them to that board': 'आपका खाना उन्हें उसी बोर्ड में भेजता है',
  'Closed board? Free move': 'बोर्ड बंद? खुली चाल',
  'Three boards in a line wins': 'एक लाइन में तीन बोर्ड जीतते हैं',
  '🏆 Three boards in a line:': '🏆 एक लाइन में तीन बोर्ड:',
  'No big line anywhere. It’s a draw 🤝': 'कहीं बड़ी लाइन नहीं बनी। ड्रॉ 🤝',
  'Ultimate Tic-Tac-Toe needs 2 players': 'सुपर टिक-टैक-टो के लिए 2 खिलाड़ी चाहिए',
  'Pick a cell on the board': 'बोर्ड पर कोई खाना चुनो',
  'That small board is already decided': 'वो छोटा बोर्ड पहले ही तय हो चुका',
  'You must play in the glowing board': 'आपको चमकते बोर्ड में खेलना है',
  'That cell is taken': 'वो खाना भरा है',
  boards: 'बोर्ड',
};

export const P: Pattern[] = [
  [/^(✕|◯) (.+) took a board!$/, (m) => `${m[1]} ${you(m[2])} ने एक बोर्ड जीता!`],
  [/^(✕|◯) (\d+) boards?$/, '$1 $2 बोर्ड'],
  [/^(\d+) marks · (\d+) tied boards$/, '$1 निशान · $2 ड्रॉ बोर्ड'],
  [/^(.+) wins three boards in a row 🎉$/, (m) => `${you(m[1])} ने एक लाइन में तीन बोर्ड जीते 🎉`],
];
