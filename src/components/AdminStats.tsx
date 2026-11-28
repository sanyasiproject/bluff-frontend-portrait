import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api, errorText } from "../lib/api";
import { gameInfo, type AdminStats as Stats } from "../types";
import type { Auth } from "../useAuth";
import { AdminChart, TopGames } from "./AdminChart";

/** auto refresh while the tab is open and the screen is shown */
const REFRESH_MS = 30_000;

const num = (n: number) => n.toLocaleString("en-IN");
const clock = (d: Date) =>
  d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

/** 93784 s → "1d 2h 3m" */
function uptime(sec: number): string {
  const d = Math.floor(sec / 86_400);
  const h = Math.floor((sec % 86_400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function Card({
  label,
  value,
  sub,
  hot,
}: {
  label: string;
  value: number;
  sub?: ReactNode;
  hot?: boolean;
}) {
  return (
    <div className={hot ? "as-card hot" : "as-card"}>
      <b className="as-big">{num(value)}</b>
      <span className="as-label">{label}</span>
      {sub && <span className="as-sub muted">{sub}</span>}
    </div>
  );
}

/** admin Stats tab: live and daily counts, no personal data */
export function AdminStats({ auth }: { auth: Auth }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [updated, setUpdated] = useState<Date | null>(null);
  const alive = useRef(true);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const s = await api<Stats>("/admin/stats", { token: auth.token });
      if (!alive.current) return;
      setStats(s);
      setUpdated(new Date());
      setError("");
    } catch (err) {
      if (alive.current) setError(errorText(err));
    } finally {
      if (alive.current) setBusy(false);
    }
  }, [auth.token]);

  // first load, then every 30 s; paused while the screen is hidden, fresh on return
  useEffect(() => {
    alive.current = true;
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (timer || document.hidden) return;
      timer = setInterval(() => void load(), REFRESH_MS);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    const onVis = () => {
      if (document.hidden) stop();
      else {
        void load();
        start();
      }
    };
    void load();
    start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      alive.current = false;
      stop();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [load]);

  const s = stats;
  return (
    <div className="as-wrap">
      <div className="as-bar-row">
        <span className="muted small grow">
          {updated ? (
            <>
              <span>Updated</span> <time>{clock(updated)}</time>
            </>
          ) : (
            <span>Loading…</span>
          )}
        </span>
        <button
          className="btn small ghost"
          disabled={busy}
          onClick={() => void load()}
        >
          ↻ Refresh
        </button>
      </div>
      {error && <p className="form-error">{error}</p>}
      {s && (
        <>
          <section className="as-cards" aria-label="Now and today">
            <Card
              label="Online now"
              value={s.now.users + s.now.guests}
              sub={
                <>
                  {num(s.now.users)} <span>logged in</span> ·{" "}
                  {num(s.now.guests)} <span>guests</span> · {num(s.now.sockets)}{" "}
                  <span>sockets</span>
                </>
              }
              hot
            />
            <Card
              label="Rooms playing"
              value={s.now.rooms.playing}
              sub={
                <>
                  {num(s.now.rooms.lobby)} <span>in lobby</span>
                </>
              }
            />
            <Card label="Games today" value={s.today.finished} />
            <Card label="New accounts today" value={s.today.newAccounts} />
            <Card label="Active today" value={s.today.active} />
          </section>

          <section className="panel as-panel">
            <h3>Rooms now</h3>
            {s.now.rooms.byGame.length === 0 ? (
              <p className="muted small">No rooms open</p>
            ) : (
              <table className="as-table">
                <thead>
                  <tr>
                    <th scope="col">Game</th>
                    <th scope="col">Playing</th>
                    <th scope="col">Lobby</th>
                  </tr>
                </thead>
                <tbody>
                  {s.now.rooms.byGame.map((r) => {
                    const g = gameInfo(r.kind);
                    return (
                      <tr key={r.kind}>
                        <th scope="row">
                          <span aria-hidden>{g.emoji}</span>{" "}
                          <span>{g.name}</span>
                        </th>
                        <td>{r.playing}</td>
                        <td>{r.lobby}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            <dl className="as-facts">
              <Fact label="Players at tables" value={num(s.now.players)} />
              <Fact label="Watching" value={num(s.now.watchers)} />
              <Fact label="Bots seated" value={num(s.now.bots)} />
              <Fact
                label="Saved rooms waiting"
                value={num(s.now.savedRoomsWaiting)}
              />
            </dl>
          </section>

          <section className="panel as-panel">
            <h3>Last 14 days</h3>
            <AdminChart days={s.days} />
            <dl className="as-facts">
              <Fact label="Stopped early today" value={num(s.today.stopped)} />
              <Fact label="Coins won today" value={num(s.today.coinsWon)} />
              <Fact label="Coins lost today" value={num(s.today.coinsLost)} />
            </dl>
          </section>

          <section className="panel as-panel">
            <h3>Top games, 7 days</h3>
            {s.totals.topGames7d.length === 0 ? (
              <p className="muted small">No games yet</p>
            ) : (
              <TopGames rows={s.totals.topGames7d} />
            )}
            <dl className="as-facts">
              <Fact
                label="Rated chess games, 7 days"
                value={num(s.totals.chessRated7d)}
              />
              <Fact label="Accounts" value={num(s.totals.accounts)} />
              <Fact label="Saved games" value={num(s.totals.games)} />
            </dl>
          </section>

          <section className="panel as-panel">
            <h3>Server</h3>
            <dl className="as-facts">
              <Fact label="Uptime" value={uptime(s.server.uptimeSec)} />
              <Fact label="Memory" value={`${s.server.rssMb} MB`} />
              <Fact
                label="Heap"
                value={`${s.server.heapUsedMb} / ${s.server.heapTotalMb} MB`}
              />
              <Fact label="Commit" value={s.server.commit ?? "–"} />
              <Fact
                label="Caught errors"
                value={num(s.server.caughtErrors)}
                warn={s.server.caughtErrors > 0}
              />
              <Fact
                label="Rooms restored"
                value={num(s.server.roomsRestored)}
              />
              <Fact
                label="Most connections from one network"
                value={num(s.server.maxSocketsPerIp)}
              />
              <Fact label="Node" value={s.server.node} />
            </dl>
          </section>
        </>
      )}
    </div>
  );
}

function Fact({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div className={warn ? "as-fact warn" : "as-fact"}>
      <dt>{label}</dt>
      <dd data-no-translate>{value}</dd>
    </div>
  );
}
