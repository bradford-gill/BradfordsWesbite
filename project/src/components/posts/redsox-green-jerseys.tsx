/* metadata: { "title": "The Red Sox Green Jersey Effect", "date": "2026-04-21", "slug": "redsox-green-jerseys", "excerpt": "Red Sox Friday home games at Fenway in green jerseys: the record, the walk-offs, and how unlikely it all is." } */

import { useState, useEffect, useCallback } from "react";

interface Game {
  date: string;
  opponent: string;
  result: "W" | "L";
  sox_score: number;
  opp_score: number;
  innings: number;
  walkoff: boolean;
}

interface BaselineStats {
  seasons: string;
  total_home_wins: number;
  total_walkoff_wins: number;
  baseline_walkoff_rate: number;
  sox_wins: number;
  sox_walkoffs: number;
  sox_walkoff_rate: number;
  expected_walkoffs: number;
  prob_at_least_sox_walkoffs: number;
}

const GREEN = "#1a5c2e";
const GREEN_DARK = "#0d3318";
const GREEN_LIGHT = "#e8f5ed";
const RED = "#c8102e";
const CREAM = "#f5f0e8";

const SectionHeader = ({ children }: { children: React.ReactNode }) => (
  <h3
    style={{
      fontSize: "0.75rem",
      fontWeight: 700,
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      color: GREEN,
      borderBottom: `3px solid ${GREEN}`,
      paddingBottom: "0.5rem",
      marginBottom: "1rem",
    }}
  >
    {children}
  </h3>
);

export default function RedsoxGreenJerseys() {
  const [games, setGames] = useState<Game[]>([]);
  const [stats, setStats] = useState<BaselineStats | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/blog/redsox-green-jerseys/games.csv").then((r) => r.text()),
      fetch("/blog/redsox-green-jerseys/baseline_stats.json").then((r) =>
        r.json(),
      ),
      fetch("/blog/redsox-green-jerseys/metadata.json").then((r) => r.json()),
    ]).then(([csv, baseline, meta]) => {
      const lines = csv.trim().split("\n").slice(1);
      setGames(
        lines.map((line) => {
          const [
            date,
            opponent,
            result,
            sox_score,
            opp_score,
            innings,
            walkoff,
          ] = line.split(",");
          return {
            date,
            opponent,
            result: result as "W" | "L",
            sox_score: Number(sox_score),
            opp_score: Number(opp_score),
            innings: Number(innings),
            walkoff: walkoff.trim() === "True",
          };
        }),
      );
      setStats(baseline);
      setLastRefreshed(meta.last_refreshed);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div style={{ color: GREEN, fontWeight: 700 }}>Loading...</div>;
  }

  const total = games.length;
  const wins = games.filter((g) => g.result === "W").length;
  const losses = total - wins;
  const walkoffs = games.filter((g) => g.walkoff).length;
  const winPct = wins / total;
  const walkoffOfWins = walkoffs / wins;

  return (
    <div style={{ fontFamily: "inherit" }}>
      {/* Last refreshed */}
      {lastRefreshed && (
        <div
          style={{
            marginBottom: "1.75rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: GREEN,
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: "0.72rem", color: "#888" }}>
            Data last refreshed{" "}
            <strong style={{ color: "#555" }}>
              {new Date(lastRefreshed + "T12:00:00").toLocaleDateString(
                "en-US",
                { year: "numeric", month: "long", day: "numeric" },
              )}
            </strong>
          </span>
        </div>
      )}

      {/* Stat Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "1rem",
          marginBottom: "2.5rem",
        }}
      >
        {[
          {
            label: "Record",
            value: `${wins}–${losses}`,
            sub: `${(winPct * 100).toFixed(1)}% win rate`,
          },
          {
            label: "Walk-offs",
            value: `${walkoffs}`,
            sub: `of ${total} games`,
          },
          {
            label: "Walk-offs / Win",
            value: `${(walkoffOfWins * 100).toFixed(1)}%`,
            sub: `${walkoffs} of ${wins} wins`,
          },
          { label: "Games", value: `${total}`, sub: `Fri home 2025–26` },
        ].map(({ label, value, sub }) => (
          <div
            key={label}
            style={{
              background: GREEN_DARK,
              border: `3px solid ${GREEN}`,
              padding: "1.25rem 1rem",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: "0.68rem",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#7fba9a",
                marginBottom: "0.4rem",
              }}
            >
              {label}
            </div>
            <div
              style={{
                fontSize: "2rem",
                fontWeight: 900,
                color: "#fff",
                lineHeight: 1,
              }}
            >
              {value}
            </div>
            <div
              style={{
                fontSize: "0.72rem",
                color: "#9fcfaf",
                marginTop: "0.3rem",
              }}
            >
              {sub}
            </div>
          </div>
        ))}
      </div>

      {/* How unlikely is this */}
      {stats && (
        <div style={{ marginBottom: "2.5rem" }}>
          <SectionHeader>How Unusual Is This?</SectionHeader>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "0.75rem",
              marginBottom: "1rem",
            }}
          >
            {[
              {
                label: "MLB baseline (2000–2024)",
                value: `${(stats.baseline_walkoff_rate * 100).toFixed(1)}%`,
                sub: `of home wins end in walk-off (${stats.total_home_wins.toLocaleString()} games)`,
              },
              {
                label: "Red Sox green jerseys",
                value: `${(stats.sox_walkoff_rate * 100).toFixed(1)}%`,
                sub: `${stats.sox_walkoffs} walk-off wins out of ${stats.sox_wins}`,
              },
              {
                label: "Expected at baseline",
                value: `${stats.expected_walkoffs}`,
                sub: `walk-offs expected in ${stats.sox_wins} wins at the MLB rate`,
              },
              {
                label: "Probability by chance",
                value: `${(stats.prob_at_least_sox_walkoffs * 100).toFixed(2)}%`,
                sub: `P(≥${stats.sox_walkoffs} walk-offs in ${stats.sox_wins} wins) under MLB baseline`,
              },
            ].map(({ label, value, sub }) => (
              <div
                key={label}
                style={{
                  background: GREEN_LIGHT,
                  border: `2px solid ${GREEN}`,
                  padding: "1rem",
                }}
              >
                <div
                  style={{
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: GREEN_DARK,
                    marginBottom: "0.35rem",
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    fontSize: "1.75rem",
                    fontWeight: 900,
                    color: GREEN_DARK,
                  }}
                >
                  {value}
                </div>
                <div
                  style={{
                    fontSize: "0.72rem",
                    color: "#4a7a5c",
                    marginTop: "0.25rem",
                    lineHeight: 1.4,
                  }}
                >
                  {sub}
                </div>
              </div>
            ))}
          </div>
          <p
            style={{
              fontSize: "0.78rem",
              color: "#555",
              lineHeight: 1.6,
              background: GREEN_LIGHT,
              border: `1px solid ${GREEN}`,
              padding: "0.75rem 1rem",
            }}
          >
            Binomial test: if each green jersey win had the same{" "}
            {(stats.baseline_walkoff_rate * 100).toFixed(1)}% walk-off
            probability as any MLB home win from 2000–2024, the probability of
            seeing {stats.sox_walkoffs} or more walk-offs in {stats.sox_wins}{" "}
            wins is{" "}
            <strong>
              {(stats.prob_at_least_sox_walkoffs * 100).toFixed(2)}%
            </strong>
            . The observed rate is{" "}
            <strong>
              {(stats.sox_walkoff_rate / stats.baseline_walkoff_rate).toFixed(
                1,
              )}
              ×
            </strong>{" "}
            the historical average.
          </p>

          <Narrative stats={stats} />
        </div>
      )}

      {/* Game Log */}
      <div>
        <SectionHeader>Game Log</SectionHeader>
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.875rem",
            }}
          >
            <thead>
              <tr style={{ background: GREEN_DARK, color: "#fff" }}>
                {["Date", "Opponent", "Score", "Result", ""].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "0.6rem 1rem",
                      textAlign: "left",
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {games.map((game, i) => (
                <tr
                  key={game.date}
                  style={{
                    background: game.walkoff
                      ? "#d4edda"
                      : i % 2 === 0
                        ? "#fff"
                        : CREAM,
                    borderBottom: "1px solid #ddd",
                  }}
                >
                  <td
                    style={{
                      padding: "0.6rem 1rem",
                      color: "#555",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {game.date}
                  </td>
                  <td style={{ padding: "0.6rem 1rem", fontWeight: 500 }}>
                    {game.opponent}
                  </td>
                  <td style={{ padding: "0.6rem 1rem", fontWeight: 700 }}>
                    {game.sox_score}–{game.opp_score}
                    {game.innings > 9 ? (
                      <span
                        style={{
                          fontWeight: 400,
                          fontSize: "0.75rem",
                          color: "#888",
                          marginLeft: "0.3rem",
                        }}
                      >
                        ({game.innings})
                      </span>
                    ) : null}
                  </td>
                  <td style={{ padding: "0.6rem 1rem" }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "0.15rem 0.6rem",
                        fontWeight: 700,
                        fontSize: "0.75rem",
                        letterSpacing: "0.05em",
                        background: game.result === "W" ? GREEN : RED,
                        color: "#fff",
                      }}
                    >
                      {game.result}
                    </span>
                  </td>
                  <td style={{ padding: "0.6rem 1rem" }}>
                    {game.walkoff && (
                      <span
                        style={{
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: GREEN_DARK,
                          background: "#7fba9a",
                          padding: "0.15rem 0.5rem",
                        }}
                      >
                        Walk-off
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: "0.72rem", color: "#888", marginTop: "0.5rem" }}>
          Data via MLB Stats API. Green jersey Fridays = all Red Sox
          regular-season home games on Fridays, 2025–2026.
        </p>
      </div>

      <Assumptions />
    </div>
  );
}

function Narrative({ stats }: { stats: BaselineStats }) {
  const prose: React.CSSProperties = {
    fontSize: "1rem",
    lineHeight: 1.75,
    color: "#2a2a2a",
    marginBottom: "1.25rem",
  };

  return (
    <div
      style={{
        marginTop: "2rem",
        paddingTop: "2rem",
        borderTop: `3px solid ${GREEN}`,
      }}
    >
      <p style={prose}>
        On April 17th, 2026, the Red Sox put on their Friday greens at Fenway
        and, once again, walked it off. It's become almost expected at this
        point. The green jerseys come out, the crowd stays late, and somehow the
        Sox find a way to win it in their last at-bat. There's something about
        those jerseys.
      </p>
      <p style={prose}>
        But how improbable is it, really? That question sent me to the MLB Stats
        API. I pulled every Red Sox regular-season home game played on a Friday
        since 2025 (the green jersey era) and checked each one for a walk-off
        using the game's linescore: if the home team was still batting when the
        final out was recorded, it counts. Sixteen games in, the Sox are{" "}
        {stats.sox_walkoffs} for {stats.sox_wins} on walk-off wins in games they
        won. Over half their victories in green have ended in walk-offs.
      </p>
      <p style={prose}>
        To put that in context, I ran the same walk-off detection across every
        MLB home win from 2000 through 2024,{" "}
        {stats.total_home_wins.toLocaleString()} games. League-wide, about{" "}
        {(stats.baseline_walkoff_rate * 100).toFixed(1)}% of home wins end in a
        walk-off. At that rate, you'd expect roughly {stats.expected_walkoffs}{" "}
        walk-off wins in {stats.sox_wins} chances. The Sox have{" "}
        {stats.sox_walkoffs}. The gap between expected and observed isn't close.
      </p>
      <p style={{ ...prose, marginBottom: 0 }}>
        A simple binomial test asks: if each green jersey win had only that{" "}
        {(stats.baseline_walkoff_rate * 100).toFixed(1)}% baseline chance of
        ending in a walk-off, what's the probability of seeing{" "}
        {stats.sox_walkoffs} or more in {stats.sox_wins} tries? The answer is{" "}
        <strong>{(stats.prob_at_least_sox_walkoffs * 100).toFixed(2)}%</strong>.
        The observed walk-off rate is{" "}
        {(stats.sox_walkoff_rate / stats.baseline_walkoff_rate).toFixed(1)}x the
        historical average. Small sample, only {stats.sox_wins} wins, but
        improbable by any reasonable measure. The jerseys might just be magic.
      </p>
    </div>
  );
}

function Assumptions() {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((v) => !v), []);

  const items = [
    {
      label: 'What counts as a "green jersey Friday"?',
      body: "Every Red Sox regular-season home game played on a Friday, 2025 to 2026. The team is assumed to wear green jerseys for all Friday home dates at Fenway. Individual game promotions are not verified against MLB marketing data.",
    },
    {
      label: "How is a walk-off detected?",
      body: "Via the MLB Stats API linescore. A win is flagged as a walk-off if the last inning in the innings array includes a home-team entry, meaning the Red Sox were still batting when the game ended. If the Sox were already winning before the bottom of the final inning, no home entry appears and the game is not counted.",
    },
    {
      label: "What is the baseline and how is it calculated?",
      body: "All MLB regular-season games 2000–2024 (31,828 home wins across 25 seasons). For each home win, the same linescore walk-off detection is applied. The resulting 16.5% baseline is the fraction of home wins that ended in walk-offs league-wide over that period.",
    },
    {
      label: "How is the probability calculated?",
      body: `Binomial test: P(X ≥ 6 | n=11, p=0.1647) using the exact binomial formula. This answers: if every green jersey win had only the league-average 16.5% chance of being a walk-off, how often would we see 6 or more walk-offs in 11 wins? Answer: 0.43% of the time.`,
    },
    {
      label: "What is excluded?",
      body: "Postponed or suspended games (null score in the API), spring training, and postseason games. A split-doubleheader makeup game on 5/23/2025 with a null score was excluded.",
    },
    {
      label: "Sample size caveat",
      body: "16 games is a small sample. The 0.43% probability is suggestive but not conclusive. It will shift as more green jersey Fridays are played in 2026.",
    },
  ];

  return (
    <div
      style={{
        marginTop: "2.5rem",
        borderTop: `2px solid ${GREEN_LIGHT}`,
        paddingTop: "1.5rem",
      }}
    >
      <button
        onClick={toggle}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
          color: GREEN,
          fontWeight: 700,
          fontSize: "0.75rem",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}
      >
        <span
          style={{
            display: "inline-block",
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 0.15s",
            fontSize: "0.9rem",
          }}
        >
          ▶
        </span>
        Methodology &amp; Assumptions
      </button>

      {open && (
        <div
          style={{
            marginTop: "1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          {items.map(({ label, body }) => (
            <AssumptionRow key={label} label={label} body={body} />
          ))}
        </div>
      )}
    </div>
  );
}

function AssumptionRow({ label, body }: { label: string; body: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border: `1px solid ${GREEN_LIGHT}`, background: "#fff" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0.75rem 1rem",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          gap: "1rem",
        }}
      >
        <span
          style={{ fontWeight: 600, fontSize: "0.85rem", color: GREEN_DARK }}
        >
          {label}
        </span>
        <span style={{ color: GREEN, fontWeight: 700, flexShrink: 0 }}>
          {open ? "−" : "+"}
        </span>
      </button>
      {open && (
        <div
          style={{
            padding: "0.75rem 1rem",
            fontSize: "0.82rem",
            color: "#444",
            lineHeight: 1.6,
            borderTop: `1px solid ${GREEN_LIGHT}`,
          }}
        >
          {body}
        </div>
      )}
    </div>
  );
}
