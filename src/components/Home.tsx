import { Suspense, useEffect, useRef, useState } from 'react';
import { clearInvite, inviteCode } from '../lib/invite';
import { loadName, loadSavedSession, loadTabSession } from '../lib/storage';
import type { Auth } from '../useAuth';
import type { Actions, ConnStatus, PendingWatch } from '../useBluff';
import { AccountCorner } from './AccountCorner';
import { AccountSheet } from './AccountSheet';
import { InstallCard } from './InstallCard';
import { LeagueButton } from './LeaguePage';
import { MissionsButton } from './MissionsPage';
import { ShopButton } from './ShopPage';
import { NotifyCard } from './NotifyCard';
import { HomeNameCard } from './NameCard';
import { OnlineFriends } from './OnlineFriends';
import { LangToggle } from './LangToggle';
import { SpinButton } from './DailyCard';
import { LessonChooser } from './tutorial/LessonOffer';
import { LazyTutorialPage } from '../lazyScreens';
import { markTutorialSeen } from '../lib/tutorial';
import { cx } from '../lib/cards';
import { gameInfo, type GameKind } from '../types';
import { FeaturedGame, GameHub, featuredKind } from './GameHub';
import { BaithakLogo, BaithakWordmark } from '../art/BaithakLogo';
import { APP_FULL_NAME } from '../art/appVariant';
import { Icon } from '../art/icons';
import { setPendingGame } from '../lib/gamePick';
import { reducedMotion } from '../lib/motion';

interface HomeProps {
  status: ConnStatus;
  connectionId: string | null;
  actions: Actions;
  auth: Auth;
  onOpenAdmin: () => void;
  /** asked to watch a game in progress; waiting for the host */
  pendingWatch: PendingWatch | null;
}

export function Home({ status, connectionId, actions, auth, onOpenAdmin, pendingWatch }: HomeProps) {
  const [name, setName] = useState(loadName);
  const [code, setCode] = useState('');
  const [invite, setInvite] = useState(inviteCode);
  const [busy, setBusy] = useState(false);
  const [slow, setSlow] = useState(false);
  const [accountSheet, setAccountSheet] = useState<'login' | 'register' | null>(null);
  /** How to play: choosing a lesson, then the lesson itself */
  const [chooser, setChooser] = useState(false);
  const [lesson, setLesson] = useState<GameKind | null>(null);
  /** the game tile picked: the next room I create starts in it */
  const [picked, setPicked] = useState<GameKind | null>(null);
  const createRef = useRef<HTMLElement>(null);
  const autoJoin = useRef<{ connectionId: string | null; tries: number }>({ connectionId: null, tries: 0 });
  const saved = loadSavedSession();
  // the banner's game: the newest, else the last played on this phone
  const [featured] = useState(featuredKind);
  const online = status === 'online';
  // logged-in players always play under their account name
  const playName = auth.user?.displayName ?? name.trim();

  // a sleeping free server needs up to a minute to wake up
  useEffect(() => {
    if (online) return;
    const t = setTimeout(() => setSlow(true), 3000);
    return () => clearTimeout(t);
  }, [online]);

  const pickGame = (kind: GameKind) => {
    setPicked(kind);
    setPendingGame(kind);
    createRef.current?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'center' });
  };

  const go = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    await fn();
    setBusy(false);
  };

  // invite link: take back this phone's seat if it has one, otherwise join with the saved name.
  // One try per fresh connection (max 2), so a drop right after connecting gets a second go.
  useEffect(() => {
    const auto = autoJoin.current;
    if (!invite || !online || !connectionId || auth.checking || auto.connectionId === connectionId || auto.tries >= 2) return;
    auto.connectionId = connectionId;
    auto.tries++;
    if (loadTabSession()?.code === invite) return; // useBluff already rejoins this tab's seat
    void go(async () => {
      if (saved?.code === invite && (await actions.rejoinSaved()) !== null) return;
      // guests can't join while guest play is off; the home screen asks them to log in
      if (playName && !locked) await actions.join(invite, playName);
    });
  }, [invite, online, connectionId, auth.checking]);

  const nameField = auth.user ? (
    <p className="playing-as">
      Playing as <b data-no-translate>{auth.user.displayName}</b>
    </p>
  ) : (
    <>
      <label className="label" htmlFor="name">
        Your name
      </label>
      <input
        id="name"
        className="input"
        maxLength={16}
        value={name}
        placeholder="e.g. Ravi"
        autoComplete="nickname"
        enterKeyHint="done"
        onChange={(e) => setName(e.target.value)}
      />
    </>
  );

  // an admin turned guest play off: guests must log in before they can create or join a room
  const locked = !auth.user && auth.accountsOn === true && !auth.guestsAllowed && !auth.checking;

  const guestHint =
    !auth.user && auth.accountsOn && !auth.checking && !locked ? (
      <p className="guest-hint">
        Playing as a <b>guest</b> · log in to earn coins and save wins
      </p>
    ) : null;

  return (
    <main className="screen home nt-home">
      {/* top bar: our mark on the left; coins, level and avatar (or Log in) on the right */}
      <header className="home-top nt-topbar">
        <div className="nt-brand" aria-label={APP_FULL_NAME}>
          <BaithakLogo size={38} className="nt-brand-mark" />
          {/* the name, and which of the two apps this is under it */}
          <span className="nt-brand-text">
            <BaithakWordmark size={22} className="nt-brand-word" title={APP_FULL_NAME} />
            <span className="nt-edition" aria-hidden data-no-translate>
              Upright
            </span>
          </span>
        </div>
        <div className="nt-top-right">
          <AccountCorner auth={auth} onOpenAdmin={onOpenAdmin} onJoin={(userId, watch) => actions.joinFriend(userId, watch, auth.user?.displayName ?? name)} />
        </div>
      </header>

      {!online && (
        <p className="server-status">
          <span className="dot" />
          {slow ? 'Waking up the server… this can take up to a minute after a break.' : 'Connecting…'}
        </p>
      )}

      {guestHint}

      {pendingWatch ? (
        <section className="panel stack invite-card">
          <p className="label">{pendingWatch.askedOf ? 'Asked to join' : 'Game in progress'}</p>
          <p className="invite-room">
            Room <b>{pendingWatch.code}</b>
          </p>
          <p className="waiting-host">
            <span className="dot" />
            {pendingWatch.askedOf ? `Waiting for ${pendingWatch.askedOf} to let you in…` : 'Waiting for the host to let you watch…'}
          </p>
          <p className="muted small">You'll go straight in when they say yes.</p>
          <button className="btn ghost block" onClick={actions.cancelWatch}>
            Cancel
          </button>
        </section>
      ) : locked ? (
        <>
          {saved && (
            <button className="panel rejoin" disabled={!online || busy} onClick={() => go(actions.rejoinSaved)}>
              <span>
                Rejoin room <b>{saved.code}</b> as {saved.name}
              </span>
              <span aria-hidden>→</span>
            </button>
          )}
          <section className="panel stack guest-locked">
            <p className="lock-title">🔒 Log in to play</p>
            <p className="muted small">
              Guest play is off right now. Log in or make a free account to {invite ? `join room ${invite}` : 'create or join a room'}.
            </p>
            <button className="btn primary block shine" onClick={() => setAccountSheet('login')}>
              Log in
            </button>
            <button className="btn ghost block" onClick={() => setAccountSheet('register')}>
              Sign up
            </button>
          </section>
        </>
      ) : invite ? (
        <section className="panel stack invite-card">
          <p className="label">You're invited</p>
          <p className="invite-room">
            Room <b>{invite}</b>
          </p>
          {nameField}
          <button
            className="btn primary block shine"
            disabled={!playName || !online || busy}
            onClick={() => {
              setPendingGame(null);
              void go(() => actions.join(invite, playName));
            }}
          >
            {busy ? `Joining room ${invite}…` : `Join room ${invite}`}
          </button>
          <button
            className="link-btn"
            onClick={() => {
              clearInvite();
              setInvite(null);
            }}
          >
            Create my own room instead
          </button>
        </section>
      ) : (
        <>
          {saved && (
            <button className="panel rejoin" disabled={!online || busy} onClick={() => go(actions.rejoinSaved)}>
              <span>
                Rejoin room <b>{saved.code}</b> as {saved.name}
              </span>
              <span aria-hidden>→</span>
            </button>
          )}

          {/* the featured game's big Play picks it and opens the create card */}
          <FeaturedGame kind={featured} onPlay={() => pickGame(featured)} />

          <GameHub picked={picked} onPick={pickGame} />

          <section ref={createRef} key={picked ?? 'none'} className={cx('panel stack play-card', picked && 'create-picked')}>
            <h2 className="section-title play-card-title">Play with friends</h2>
            {picked && (
              <p className="picked-game">
                <span aria-hidden>{gameInfo(picked).emoji}</span>
                <span className="grow">{`Picked: ${gameInfo(picked).name}`}</span>
                <button
                  className="link-btn"
                  onClick={() => {
                    setPicked(null);
                    setPendingGame(null);
                  }}
                >
                  Clear
                </button>
              </p>
            )}
            {nameField}
            <button
              className="btn primary block shine"
              disabled={!playName || !online || busy}
              onClick={() => go(() => actions.create(playName))}
            >
              {picked ? `Create a ${gameInfo(picked).name} room` : 'Create a room'}
            </button>

            <div className="divider">
              <span>or join friends</span>
            </div>

            <div className="join-row">
              <input
                className="input code-input"
                value={code}
                placeholder="CODE"
                aria-label="Room code"
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4))}
              />
              <button
                className="btn"
                disabled={!playName || code.length !== 4 || !online || busy}
                onClick={() => {
                  setPendingGame(null);
                  void go(() => actions.join(code, playName));
                }}
              >
                Join
              </button>
            </div>
          </section>
        </>
      )}

      <OnlineFriends auth={auth} onJoin={(userId, watch) => actions.joinFriend(userId, watch, auth.user?.displayName ?? name)} />
      {/* the dock: daily spin, missions, league, shop and lessons as glass tiles */}
      <nav className="home-dock" aria-label="More to do">
        <SpinButton auth={auth} />
        <MissionsButton auth={auth} online={online} />
        <LeagueButton auth={auth} online={online} />
        <ShopButton auth={auth} online={online} />
        <button className="panel missions-entry how-to-btn" onClick={() => setChooser(true)}>
          <span className="missions-entry-emoji" aria-hidden>
            <Icon name="howto" size={26} />
          </span>
          <span className="grow">How to play</span>
          <span className="missions-pill">Rules · practice</span>
          <span className="missions-chevron" aria-hidden>
            ›
          </span>
        </button>
      </nav>
      <HomeNameCard auth={auth} />
      <NotifyCard auth={auth} />
      <InstallCard />
      <footer className="home-foot">
        <LangToggle />
      </footer>
      {accountSheet && <AccountSheet initial={accountSheet} auth={auth} onClose={() => setAccountSheet(null)} />}
      {chooser && (
        <LessonChooser
          onPick={(game) => {
            setChooser(false);
            setLesson(game);
          }}
          onClose={() => setChooser(false)}
        />
      )}
      {lesson && (
        // a lesson done from Home counts too, so the lobby won't offer it again
        <Suspense fallback={null}>
        <LazyTutorialPage
          game={lesson}
          onDone={() => {
            markTutorialSeen(auth, lesson);
            setLesson(null);
          }}
          onClose={() => {
            markTutorialSeen(auth, lesson);
            setLesson(null);
          }}
        />
        </Suspense>
      )}

    </main>
  );
}
