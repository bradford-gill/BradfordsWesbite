/* metadata: { "title": "The Red Sox are bad, it is going to be a long season", "date": "2026-04-24", "slug": "may-doom", "excerpt": "Red Sox are 9-16. History says that's bad. 25 years of MLB May 1 data to show exactly how bad." } */

import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const NAVY = "#0C2340";
const RED = "#BD3039";
const GREEN = "#10B981";
const BLUE = "#3B82F6";
const ORANGE = "#F97316";
const MUTED = "#64748b";
const BORDER = "#e2e8f0";

interface BucketRow {
  label: string;
  lower: number;
  mid: number;
  count: number;
  pct_90plus: number;
  pct_81plus: number;
  pct_sub81: number;
  pct_sub70: number;
}

interface RedSoxCurrent {
  wins: number;
  losses: number;
  games_played: number;
  win_pct: number;
  runs_scored: number;
  runs_allowed: number;
  pythagorean_pct: number;
}

interface MayData {
  buckets_by_win_pct: BucketRow[];
  buckets_by_pyth_pct: BucketRow[];
  redsox_2026: RedSoxCurrent;
  meta: { total_team_seasons: number };
}

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      fontSize: "0.65rem",
      fontWeight: 700,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color: RED,
      marginBottom: "0.6rem",
    }}
  >
    {children}
  </div>
);

const InfoTip = ({ tip }: { tip: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <span
      style={{
        position: "relative",
        display: "inline-block",
        verticalAlign: "baseline",
      }}
    >
      <button
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        aria-label="More info"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "15px",
          height: "15px",
          borderRadius: "50%",
          border: "1.5px solid #64748b",
          background: "transparent",
          color: "#64748b",
          fontSize: "9px",
          fontWeight: 800,
          cursor: "pointer",
          padding: 0,
          marginLeft: "3px",
          lineHeight: 1,
          fontStyle: "italic",
          fontFamily: "Georgia, serif",
          position: "relative",
          top: "-6px",
        }}
      >
        i
      </button>
      {open && (
        <span
          style={{
            position: "absolute",
            bottom: "calc(100% + 8px)",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#1e293b",
            color: "#f1f5f9",
            fontSize: "0.78rem",
            lineHeight: 1.55,
            padding: "0.65rem 0.9rem",
            borderRadius: "6px",
            width: "240px",
            zIndex: 100,
            pointerEvents: "none",
            boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
            fontStyle: "normal",
            fontWeight: 400,
          }}
        >
          {tip}
        </span>
      )}
    </span>
  );
};

const StatCard = ({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: string;
}) => (
  <div
    style={{
      background: "#fff",
      border: `1px solid ${BORDER}`,
      borderTop: `3px solid ${accent ?? NAVY}`,
      padding: "1.2rem 1rem",
      textAlign: "center",
    }}
  >
    <div
      style={{
        fontSize: "0.6rem",
        fontWeight: 700,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: MUTED,
        marginBottom: "0.4rem",
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontSize: "1.6rem",
        fontWeight: 800,
        color: NAVY,
        lineHeight: 1,
      }}
    >
      {value}
    </div>
    <div style={{ fontSize: "0.72rem", color: MUTED, marginTop: "0.35rem" }}>
      {sub}
    </div>
  </div>
);

function pctLabel(v: number) {
  return `${(v * 100).toFixed(0)}%`;
}

const CustomTooltip = ({
  active,
  payload,
  label,
  yKey,
  yLabel,
}: {
  active?: boolean;
  payload?: { value: number; payload: BucketRow }[];
  label?: string;
  yKey: keyof BucketRow;
  yLabel: string;
}) => {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div
      style={{
        background: "#1e293b",
        color: "#f1f5f9",
        fontSize: "0.78rem",
        padding: "0.6rem 0.85rem",
        borderRadius: "6px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
        lineHeight: 1.6,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: "0.2rem" }}>
        {label} win% on May 1
      </div>
      <div>
        {yLabel}: <strong>{pctLabel(row[yKey] as number)}</strong>
      </div>
      <div style={{ color: "#94a3b8", fontSize: "0.72rem" }}>
        {row.count} team-seasons
      </div>
    </div>
  );
};

function BucketChart({
  data,
  yKey,
  title,
  highlightLower,
  minCount = 5,
}: {
  data: BucketRow[];
  yKey: keyof BucketRow;
  title: string;
  highlightLower: number;
  minCount?: number;
}) {
  const filtered = data.filter((b) => b.count >= minCount);
  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${BORDER}`,
        padding: "1rem",
      }}
    >
      <div
        style={{
          fontWeight: 700,
          fontSize: "0.82rem",
          color: NAVY,
          marginBottom: "0.75rem",
        }}
      >
        {title}
      </div>
      <ResponsiveContainer width="100%" height={210}>
        <BarChart
          data={filtered}
          margin={{ top: 4, right: 8, left: -20, bottom: 40 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={BORDER}
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 9, fill: MUTED }}
            angle={-45}
            textAnchor="end"
            interval={0}
          />
          <YAxis
            tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
            tick={{ fontSize: 10, fill: MUTED }}
            domain={[0, 1]}
          />
          <Tooltip
            content={(props) => (
              <CustomTooltip {...props} yKey={yKey} yLabel={title} />
            )}
          />
          <Bar dataKey={yKey} radius={[2, 2, 0, 0]}>
            {filtered.map((b) => {
              const isRedSox = Math.abs(b.lower - highlightLower) < 0.001;
              return (
                <Cell
                  key={b.label}
                  fill={isRedSox ? RED : GREEN}
                  fillOpacity={isRedSox ? 1 : 0.75}
                />
              );
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div
        style={{
          fontSize: "0.68rem",
          color: MUTED,
          textAlign: "center",
          marginTop: "-4px",
        }}
      >
        <span style={{ color: RED, fontWeight: 700 }}>Red</span> = Red Sox 2026
        bucket
      </div>
    </div>
  );
}

export default function MayDoom() {
  const [data, setData] = useState<MayData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/blog/may-start/may_start_data.json")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError(true));
  }, []);

  if (error)
    return (
      <div style={{ color: RED, padding: "2rem", textAlign: "center" }}>
        Failed to load data.
      </div>
    );
  if (!data)
    return (
      <div style={{ color: MUTED, padding: "2rem", textAlign: "center" }}>
        Loading...
      </div>
    );

  const sox = data.redsox_2026;
  const winPctBucket =
    Math.round(Math.floor(sox.win_pct / 0.02) * 0.02 * 1000) / 1000;
  const pythBucket =
    Math.round(Math.floor(sox.pythagorean_pct / 0.02) * 0.02 * 1000) / 1000;

  const soxWinBucket = data.buckets_by_win_pct.find(
    (b) => Math.abs(b.lower - winPctBucket) < 0.001,
  );
  const soxPythBucket = data.buckets_by_pyth_pct.find(
    (b) => Math.abs(b.lower - pythBucket) < 0.001,
  );

  return (
    <div style={{ fontFamily: "inherit", maxWidth: "100%" }}>
      {/* ── INTRO ── */}
      <p
        style={{
          fontSize: "1rem",
          lineHeight: 1.75,
          color: "#334155",
          marginBottom: "1rem",
          marginTop: 0,
        }}
      >
        Ok, the Red Sox really suck. I laid out the underlying numbers{" "}
        <a
          href="/blog/season-prediction"
          style={{ color: NAVY, textDecoration: "underline" }}
        >
          yesterday
        </a>{" "}
        (run differential, Pythagorean win%
        <InfoTip tip="An estimate of a team's 'true' win percentage based on runs scored and allowed. Formula: RS^1.81 / (RS^1.81 + RA^1.81). It smooths out luck and gives a better read on underlying quality than the win-loss record alone." />
        , the whole deal). But I wanted to put this in actual historical
        context. I went to the game last night and it was a gorgeous April
        evening at Fenway. The game itself was painful. The Yankees fans were
        louder than the Sox fans. I wanted numbers to match the feeling.
      </p>

      <p
        style={{
          fontSize: "1rem",
          lineHeight: 1.75,
          color: "#334155",
          marginBottom: "1rem",
        }}
      >
        So I pulled 25 years of MLB data (2000{"–"}2025, excluding the 2020
        shortened season) and looked at where every team stood on May 1. Then I
        tracked how those teams finished. The question: given where the Red Sox
        are right now, what does history say?
      </p>

      {/* ── RED SOX STAT CARDS ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "0.75rem",
          marginTop: 0,
          marginBottom: "2rem",
        }}
      >
        <StatCard
          label="2026 Record"
          value={`${sox.wins}-${sox.losses}`}
          sub={`through April 24 (${sox.games_played} games)`}
          accent={RED}
        />
        <StatCard
          label="Win %"
          value={`.${String(Math.round(sox.win_pct * 1000)).padStart(3, "0")}`}
          sub="36-38% bucket on May 1"
          accent={RED}
        />
        <StatCard
          label="Run Differential"
          value={`${sox.runs_scored - sox.runs_allowed}`}
          sub={`${sox.runs_scored} RS / ${sox.runs_allowed} RA`}
          accent={RED}
        />
        <StatCard
          label="Pythagorean"
          value={`${(sox.pythagorean_pct * 100).toFixed(1)}%`}
          sub="40-42% bucket on May 1"
          accent={ORANGE}
        />
      </div>

      {/* ── SECTION 1: WIN% AS PREDICTOR ── */}
      <SectionLabel>By actual win% on May 1</SectionLabel>
      <p
        style={{
          fontSize: "1rem",
          lineHeight: 1.75,
          color: "#334155",
          marginBottom: "1.25rem",
        }}
      >
        Each bucket is a 5-percentage-point range of win% on May 1. The bars
        show what fraction of teams in that bucket hit each threshold by
        season's end. The Red Sox sit in the 36{"–"}38% bucket (highlighted in
        red). Of the {soxWinBucket?.count ?? "28"} teams that started May 1 in
        that range over the past 25 years:
      </p>

      {soxWinBucket && (
        <div
          style={{
            background: "#fef2f2",
            border: `1px solid #fecaca`,
            borderLeft: `4px solid ${RED}`,
            padding: "0.9rem 1.1rem",
            marginBottom: "1.5rem",
            fontSize: "0.9rem",
            color: "#7f1d1d",
            lineHeight: 1.7,
          }}
        >
          <strong>{pctLabel(soxWinBucket.pct_90plus)}</strong> won 90+ games
          (contender territory) &nbsp;·&nbsp;{" "}
          <strong>{pctLabel(soxWinBucket.pct_81plus)}</strong> finished above
          .500 &nbsp;·&nbsp; <strong>{pctLabel(soxWinBucket.pct_sub81)}</strong>{" "}
          finished under .500 &nbsp;·&nbsp;{" "}
          <strong>{pctLabel(soxWinBucket.pct_sub70)}</strong> won fewer than 70
          games
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        <BucketChart
          data={data.buckets_by_win_pct}
          yKey="pct_90plus"
          title="% that won 90+ games (contenders)"
          highlightLower={winPctBucket}
        />
        <BucketChart
          data={data.buckets_by_win_pct}
          yKey="pct_81plus"
          title="% that finished above .500 (81+ wins)"
          highlightLower={winPctBucket}
        />
        <BucketChart
          data={data.buckets_by_win_pct}
          yKey="pct_sub81"
          title="% that finished below .500 (under 81 wins)"
          highlightLower={winPctBucket}
        />
        <BucketChart
          data={data.buckets_by_win_pct}
          yKey="pct_sub70"
          title="% that lost 90+ games (under 70 wins)"
          highlightLower={winPctBucket}
        />
      </div>

      <p
        style={{
          fontSize: "1rem",
          lineHeight: 1.75,
          color: "#334155",
          marginBottom: "2rem",
        }}
      >
        That 44% chance of finishing with fewer than 70 wins is the one that
        stings. Nearly half of teams that looked like the 2026 Sox on May 1
        ended up in basement territory. The flip side: 18.5% did rally to finish
        above .500, so we're not literally cooked. Just mostly cooked.
      </p>

      {/* ── SECTION 2: PYTHAGOREAN AS PREDICTOR ── */}
      <SectionLabel>Does Pythagorean win% tell a different story?</SectionLabel>
      <p
        style={{
          fontSize: "1rem",
          lineHeight: 1.75,
          color: "#334155",
          marginBottom: "1.25rem",
        }}
      >
        Here's a small sliver of comfort. The Red Sox have a run differential
        <InfoTip tip="Total runs scored minus runs allowed. For Boston: 92 - 114 = -22 through 25 games. Negative means they're being outscored overall." />{" "}
        of {sox.runs_scored - sox.runs_allowed}, which works out to a
        Pythagorean win%
        <InfoTip tip="RS^1.81 / (RS^1.81 + RA^1.81), a formula from Bill James that estimates what a team's record 'should' be based on run scoring rather than actual wins. Teams with better underlying run differentials often outperform their record over a full season." />{" "}
        of {(sox.pythagorean_pct * 100).toFixed(1)}%, landing them in the 40
        {"–"}42% bucket rather than the 36{"–"}38% bucket their record puts them
        in. Not great, but a step up. Of the {soxPythBucket?.count ?? "35"}{" "}
        teams in that bucket:
      </p>

      {soxPythBucket && (
        <div
          style={{
            background: "#fff7ed",
            border: `1px solid #fed7aa`,
            borderLeft: `4px solid ${ORANGE}`,
            padding: "0.9rem 1.1rem",
            marginBottom: "1.5rem",
            fontSize: "0.9rem",
            color: "#7c2d12",
            lineHeight: 1.7,
          }}
        >
          <strong>{pctLabel(soxPythBucket.pct_90plus)}</strong> won 90+ games{" "}
          &nbsp;·&nbsp; <strong>{pctLabel(soxPythBucket.pct_81plus)}</strong>{" "}
          finished above .500 &nbsp;·&nbsp;{" "}
          <strong>{pctLabel(soxPythBucket.pct_sub81)}</strong> finished below
          .500 &nbsp;·&nbsp;{" "}
          <strong>{pctLabel(soxPythBucket.pct_sub70)}</strong> won fewer than 70
          games
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        <BucketChart
          data={data.buckets_by_pyth_pct}
          yKey="pct_90plus"
          title="% that won 90+ games (contenders)"
          highlightLower={pythBucket}
        />
        <BucketChart
          data={data.buckets_by_pyth_pct}
          yKey="pct_81plus"
          title="% that finished above .500 (81+ wins)"
          highlightLower={pythBucket}
        />
        <BucketChart
          data={data.buckets_by_pyth_pct}
          yKey="pct_sub81"
          title="% that finished below .500 (under 81 wins)"
          highlightLower={pythBucket}
        />
        <BucketChart
          data={data.buckets_by_pyth_pct}
          yKey="pct_sub70"
          title="% that lost 90+ games (under 70 wins)"
          highlightLower={pythBucket}
        />
      </div>

      <p
        style={{
          fontSize: "1rem",
          lineHeight: 1.75,
          color: "#334155",
          marginBottom: "1rem",
        }}
      >
        The Pythagorean view cuts the "under 70 wins" risk roughly in half
        compared to the raw record (24% vs 44%) and doubles the odds of a .500
        finish (37.5% vs 18.5%). Their run differential is bad but not historic
        dumpster fire bad. The losses are piling up partly because the runs
        aren't falling right.
      </p>

      <p
        style={{
          fontSize: "1rem",
          lineHeight: 1.75,
          color: "#334155",
          marginBottom: "2.5rem",
        }}
      >
        None of this is good news. But if I'm going to convince myself to buy
        tickets to another game, I'll tell myself the Red Sox are a 40% team
        who've been slightly unlucky rather than a 36% team who are exactly as
        bad as they look. It's probably both.
      </p>

      {/* ── METHODOLOGY ── */}
      <div
        style={{
          borderTop: `2px solid ${BORDER}`,
          paddingTop: "2rem",
          marginTop: "1rem",
        }}
      >
        <SectionLabel>Methodology</SectionLabel>

        <div
          style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1.5rem" }}
        >
          <div>
            <div
              style={{
                fontWeight: 700,
                fontSize: "0.85rem",
                color: NAVY,
                marginBottom: "0.5rem",
              }}
            >
              Data Source
            </div>
            <p
              style={{
                fontSize: "0.88rem",
                color: "#475569",
                lineHeight: 1.65,
              }}
            >
              MLB Stats API (
              <code
                style={{
                  background: "#f1f5f9",
                  padding: "0 4px",
                  fontSize: "0.8rem",
                }}
              >
                statsapi.mlb.com/api/v1/standings
              </code>
              ), queried for all 30 MLB franchises at two points: May 1 and
              end-of-season (no date filter). Years 2000{"–"}2025, excluding
              2020 (COVID-shortened season). Total:{" "}
              {data.meta.total_team_seasons} team-seasons. Current 2026 Red Sox
              data fetched live from the same API (as of April 24, 2026) and is
              not included in the historical bucket calculations.
            </p>
          </div>

          <div>
            <div
              style={{
                fontWeight: 700,
                fontSize: "0.85rem",
                color: NAVY,
                marginBottom: "0.5rem",
              }}
            >
              Metrics
            </div>
            <p
              style={{
                fontSize: "0.88rem",
                color: "#475569",
                lineHeight: 1.65,
              }}
            >
              <strong>Win %</strong> = W / (W + L) at May 1.{" "}
              <strong>Pythagorean Win %</strong> = RS^1.81 / (RS^1.81 +
              RA^1.81), using the refined Bill James exponent from{" "}
              <a
                href="https://www.baseball-reference.com/bullpen/Pythagorean_Theorem_of_Baseball#The_Formula"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: NAVY, textDecoration: "underline" }}
              >
                Baseball Reference
              </a>
              . Teams are bucketed into 5-percentage-point ranges (e.g., 35{"–"}
              40%) based on their May 1 metric. Buckets with fewer than 5
              historical team-seasons are excluded from charts.
            </p>
          </div>

          <div>
            <div
              style={{
                fontWeight: 700,
                fontSize: "0.85rem",
                color: NAVY,
                marginBottom: "0.5rem",
              }}
            >
              Outcome Thresholds
            </div>
            <p
              style={{
                fontSize: "0.88rem",
                color: "#475569",
                lineHeight: 1.65,
              }}
            >
              90+ wins: typical playoff contender threshold. 81+ wins: above
              .500 in a 162-game season. Under 81 wins: losing record. Under 70
              wins: deep cellar territory (93+ losses). All thresholds use the
              team's official end-of-season win total from the final standings
              record.
            </p>
          </div>

          <div>
            <div
              style={{
                fontWeight: 700,
                fontSize: "0.85rem",
                color: NAVY,
                marginBottom: "0.5rem",
              }}
            >
              Assumptions and Limitations
            </div>
            <p
              style={{
                fontSize: "0.88rem",
                color: "#475569",
                lineHeight: 1.65,
              }}
            >
              Bucket membership uses May 1 stats only, with no in-season
              adjustments for trades, injuries, or roster changes. The 2026 Red
              Sox record is assessed against historical May 1 patterns even
              though we are currently April 24, roughly one week early; the
              distribution should be broadly representative. Small bucket sample
              sizes (particularly at the extremes) make those percentages noisy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
