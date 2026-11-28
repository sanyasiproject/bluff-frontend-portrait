import * as cards from './hi.cards';
import * as common from './hi.common';
import * as crazy7 from './hi.crazy7';
import * as rang from './hi.rang';
import * as errors from './hi.errors';
import * as extra from './hi.extra';
import * as home from './hi.home';
import * as league from './hi.league';
import * as lobby1 from './hi.lobby1';
import * as lobby2 from './hi.lobby2';
import * as missions from './hi.missions';
import * as over from './hi.over';
import * as profile from './hi.profile';
import * as server from './hi.server';
import * as shop from './hi.shop';
import * as social from './hi.social';
import * as table from './hi.table';
import * as titles from './hi.titles';
import * as hub from './hi.hub';
import * as gamesinfo from './hi.gamesinfo';
import * as ludo from './hi.ludo';
import * as snakes from './hi.snakes';
import * as rmcs from './hi.rmcs';
import * as darts from './hi.darts';
import * as dots from './hi.dots';
import * as colorwar from './hi.colorwar';
import * as fruit from './hi.fruit';
import * as spikes from './hi.spikes';
import * as chess from './hi.chess';
import * as chessrules from './hi.chessrules';
import * as carrom from './hi.carrom';
import * as bomb from './hi.bomb';
import * as seabattle from './hi.seabattle';
import * as gomoku from './hi.gomoku';
import * as uttt from './hi.uttt';
import * as wordhunt from './hi.wordhunt';
import * as fairplay from './hi.fairplay';
import type { Dict, Pattern } from './types';

// later files win on the same exact line
const dicts: Dict[] = [common.D, cards.D, titles.D, home.D, lobby1.D, lobby2.D, table.D, over.D, crazy7.D, rang.D, profile.D, social.D, missions.D, shop.D, league.D, hub.D, gamesinfo.D, ludo.D, snakes.D, rmcs.D, darts.D, dots.D, colorwar.D, fruit.D, spikes.D, chess.D, chessrules.D, carrom.D, bomb.D, seabattle.D, gomoku.D, uttt.D, wordhunt.D, extra.D, errors.D, fairplay.D];

export const HI_DICT = new Map<string, string>(dicts.flatMap((d) => Object.entries(d)));

// specific screens first, the server's broad lines last
export const HI_PATTERNS: Pattern[] = [
  // whole forfeit lines, before any broader "left the game" pattern
  ...fairplay.P,
  ...cards.P,
  ...table.P,
  // before Crazy 7's, whose card patterns would match Rang's lines first
  ...rang.P,
  ...ludo.P,
  ...snakes.P,
  ...rmcs.P,
  ...darts.P,
  ...dots.P,
  ...colorwar.P,
  ...fruit.P,
  ...spikes.P,
  ...chess.P,
  ...carrom.P,
  ...bomb.P,
  ...seabattle.P,
  ...gomoku.P,
  ...uttt.P,
  ...wordhunt.P,
  ...crazy7.P,
  ...over.P,
  ...lobby2.P,
  ...profile.P,
  ...social.P,
  ...missions.P,
  ...shop.P,
  ...league.P,
  ...home.P,
  ...hub.P,
  ...gamesinfo.P,
  ...titles.P,
  ...extra.P,
  ...errors.P,
  ...server.P,
];
