/* metadata: { "title": "Does Your Team's Start Actually Matter?", "date": "2026-04-23", "slug": "season-prediction", "excerpt": "Using 26 years of MLB data to ask how much May win%, run differential, and Pythagorean win% can actually tell us about where a team finishes." } */

import { useState, useEffect, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ReferenceLine,
  TooltipProps,
} from "recharts";

const NAVY = "#0C2340";
const RED = "#BD3039";
const WIN_COLOR = "#3B82F6";
const DIFF_COLOR = "#F97316";
const PYTH_COLOR = "#10B981";
const MUTED = "#64748b";
const BORDER = "#e2e8f0";

interface CorrelationEntry {
  label: string;
  r: number;
  r2: number;
  rmse: number;
  n: number;
}

interface SnapshotCorr {
  label: string;
  n: number;
  final_win_pct: Record<string, CorrelationEntry>;
  remaining_win_pct: Record<string, CorrelationEntry>;
}

type CorrData = Record<string, SnapshotCorr>;

interface SnapshotRow {
  year: number;
  team_name: string;
  team_abbr: string;
  snapshot: string;
  win_pct: number | null;
  run_diff_per_game: number | null;
  pythagorean_pct: number | null;
  final_win_pct: number | null;
  remaining_win_pct: number | null;
}

const SNAP_KEYS = ["may_1", "jun_1", "jul_1", "aug_1", "sep_1"] as const;
type SnapKey = (typeof SNAP_KEYS)[number];

const PREDICTORS = [
  { key: "win_pct", label: "Win %", color: WIN_COLOR },
  { key: "run_diff_per_game", label: "Run Diff / Game", color: DIFF_COLOR },
  { key: "pythagorean_pct", label: "Pythagorean %", color: PYTH_COLOR },
] as const;
type PredKey = "win_pct" | "run_diff_per_game" | "pythagorean_pct";

const TARGETS = [
  { key: "final_win_pct", label: "Final Win %" },
  { key: "remaining_win_pct", label: "Remaining Win %" },
] as const;
type TargetKey = "final_win_pct" | "remaining_win_pct";

function pct(v: number) {
  return `${(v * 100).toFixed(1)}%`;
}

function r2Label(v: number) {
  return v.toFixed(3);
}

function buildLineData(corr: CorrData, target: TargetKey) {
  return SNAP_KEYS.map((k) => ({
    date: corr[k].label,
    "Win %": corr[k][target].win_pct?.r2 ?? null,
    "Run Diff / Game": corr[k][target].run_diff_per_game?.r2 ?? null,
    "Pythagorean %": corr[k][target].pythagorean_pct?.r2 ?? null,
  }));
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

const Callout = ({
  children,
  accent,
}: {
  children: React.ReactNode;
  accent?: string;
}) => (
  <div
    style={{
      borderLeft: `4px solid ${accent ?? NAVY}`,
      background: "#f8fafc",
      padding: "1rem 1.25rem",
      margin: "1.5rem 0",
      fontSize: "0.95rem",
      color: "#334155",
      lineHeight: 1.6,
    }}
  >
    {children}
  </div>
);

const ToggleGroup = ({
  options,
  value,
  onChange,
  colorMap,
}: {
  options: readonly { key: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  colorMap?: Record<string, string>;
}) => (
  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
    {options.map(({ key, label }) => {
      const active = value === key;
      const color = colorMap?.[key] ?? NAVY;
      return (
        <button
          key={key}
          onClick={() => onChange(key)}
          style={{
            padding: "0.35rem 0.85rem",
            fontSize: "0.78rem",
            fontWeight: 600,
            border: `2px solid ${active ? color : BORDER}`,
            background: active ? color : "#fff",
            color: active ? "#fff" : MUTED,
            borderRadius: "4px",
            cursor: "pointer",
            transition: "all 0.15s",
          }}
        >
          {label}
        </button>
      );
    })}
  </div>
);

const CustomLineTooltip = (props: TooltipProps<number, string>) => {
  const { active, payload, label } = props as {
    active?: boolean;
    label?: string;
    payload?: { name: string; value: number; color: string }[];
  };
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${BORDER}`,
        padding: "0.75rem 1rem",
        fontSize: "0.8rem",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      }}
    >
      <div style={{ fontWeight: 700, color: NAVY, marginBottom: "0.4rem" }}>
        {label}
      </div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color, marginBottom: "0.2rem" }}>
          {p.name}: R² = {r2Label(p.value as number)}
        </div>
      ))}
    </div>
  );
};

interface ScatterPoint {
  x: number;
  y: number;
  team: string;
  year: number;
}

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
          border: `1.5px solid ${MUTED}`,
          background: "transparent",
          color: MUTED,
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

const CustomScatterTooltip = (props: TooltipProps<number, string>) => {
  const { active, payload } = props as {
    active?: boolean;
    payload?: { payload: ScatterPoint }[];
  };
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${BORDER}`,
        padding: "0.6rem 0.9rem",
        fontSize: "0.78rem",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      }}
    >
      <div style={{ fontWeight: 700, color: NAVY }}>
        {d.team} ({d.year})
      </div>
      <div style={{ color: MUTED }}>
        x: {d.x.toFixed(3)} / y: {d.y.toFixed(3)}
      </div>
    </div>
  );
};

export default function SeasonPrediction() {
  const [corr, setCorr] = useState<CorrData | null>(null);
  const [snapshots, setSnapshots] = useState<SnapshotRow[] | null>(null);
  const [scatterLoading, setScatterLoading] = useState(false);
  const [scatterLoaded, setScatterLoaded] = useState(false);

  const [scatterSnap, setScatterSnap] = useState<SnapKey>("jul_1");
  const [scatterPred, setScatterPred] = useState<PredKey>("pythagorean_pct");
  const [scatterTarget, setScatterTarget] =
    useState<TargetKey>("remaining_win_pct");

  useEffect(() => {
    fetch("/blog/season-prediction/correlations.json")
      .then((r) => r.json())
      .then((d) => setCorr(d.correlations));
  }, []);

  const loadScatter = useCallback(() => {
    if (scatterLoaded || scatterLoading) return;
    setScatterLoading(true);
    fetch("/blog/season-prediction/all_data.json")
      .then((r) => r.json())
      .then((d) => {
        setSnapshots(d.snapshots);
        setScatterLoaded(true);
        setScatterLoading(false);
      });
  }, [scatterLoaded, scatterLoading]);

  if (!corr) {
    return (
      <div style={{ color: MUTED, fontStyle: "italic", padding: "2rem 0" }}>
        Loading analysis...
      </div>
    );
  }

  const finalLineData = buildLineData(corr, "final_win_pct");
  const remainLineData = buildLineData(corr, "remaining_win_pct");

  const scatterData: ScatterPoint[] =
    scatterLoaded && snapshots
      ? snapshots
          .filter((r) => r.snapshot === scatterSnap)
          .filter((r) => r[scatterPred] != null && r[scatterTarget] != null)
          .map((r) => ({
            x: r[scatterPred] as number,
            y: r[scatterTarget] as number,
            team: r.team_name,
            year: r.year,
          }))
      : [];

  const activeR2 =
    corr[scatterSnap]?.[scatterTarget]?.[scatterPred]?.r2 ?? null;

  const predColorMap = Object.fromEntries(
    PREDICTORS.map(({ key, color }) => [key, color]),
  );

  const snapOptions = SNAP_KEYS.map((k) => ({
    key: k,
    label: corr[k].label,
  }));

  return (
    <div style={{ fontFamily: "inherit", maxWidth: "100%" }}>
      {/* ── OPENING NARRATIVE ── */}
      <p
        style={{
          fontSize: "1.05rem",
          lineHeight: 1.8,
          color: "#334155",
          marginBottom: "1.25rem",
        }}
      >
        The 2026 Red Sox are painful to watch. They are 9{"–"}15. The pitching,
        which was supposed to be one of the strengths of this team, has been
        bad. The offense has been worse. They have been outscored by 20 runs
        through 24 games.
      </p>
      <p
        style={{
          fontSize: "1.05rem",
          lineHeight: 1.8,
          color: "#334155",
          marginBottom: "1.25rem",
        }}
      >
        But here is the thing that every fan tells themselves when their team
        stumbles out of the gate: it is early. There is a lot of baseball left.
        The sample size is small. And honestly? That is not just cope. It is a
        testable claim. So I decided to test it.
      </p>
      <p
        style={{
          fontSize: "1.05rem",
          lineHeight: 1.8,
          color: "#334155",
          marginBottom: "2rem",
        }}
      >
        I pulled MLB standings data for every team from 2000 through 2025 at
        five points in each season (May 1, June 1, July 1, August 1, and
        September 1) and asked: how well does a team's record, run differential
        <InfoTip tip="Runs scored minus runs allowed. A negative number means the team is being outscored. It's often more reliable than the win-loss record because a team can get unlucky in close games yet still be the better team by the run totals." />
        , and Pythagorean win percentage
        <InfoTip tip="A formula invented by analyst Bill James that estimates what a team's record should be based on runs scored vs. runs allowed — not actual wins. Teams that win more than their Pythagorean expectation tend to regress back to it over time; teams below it tend to improve." />{" "}
        at each of those dates predict where they finish and how they play the
        rest of the year?
      </p>

      {/* ── DATASET SUMMARY ── */}
      <SectionLabel>The Dataset</SectionLabel>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: "0.75rem",
          marginBottom: "2.5rem",
        }}
      >
        <StatCard label="Seasons" value="26" sub="2000 – 2025" accent={NAVY} />
        <StatCard
          label="Teams / Season"
          value="30"
          sub="MLB franchises"
          accent={NAVY}
        />
        <StatCard
          label="Snapshot Dates"
          value="5"
          sub="May – Sep 1"
          accent={RED}
        />
        <StatCard
          label="Data Points"
          value="3,810"
          sub="team-season rows"
          accent={NAVY}
        />
        <StatCard
          label="Metrics Tested"
          value="3"
          sub="Win%, RD/G, Pyth%"
          accent={PYTH_COLOR}
        />
      </div>

      {/* ── SECTION 1: PREDICTING FINAL RECORD ── */}
      <SectionLabel>How well does the start predict the finish?</SectionLabel>
      <p
        style={{
          fontSize: "1rem",
          lineHeight: 1.75,
          color: "#334155",
          marginBottom: "1rem",
        }}
      >
        The chart below shows R²
        <InfoTip tip="Short for 'R-squared' or coefficient of determination. A score from 0 to 1 measuring how well one stat predicts another. 0 means no connection at all; 1 means perfect prediction. R² = 0.37 means about 37% of why teams finish where they do is already baked in at that point — the other 63% is still genuinely undecided." />{" "}
        for each metric against final season win percentage at each snapshot
        date. R² ranges from 0 to 1: 0 means the metric tells you nothing, 1
        means perfect prediction.
      </p>

      <div
        style={{
          background: "#fff",
          border: `1px solid ${BORDER}`,
          padding: "1.5rem",
          marginBottom: "1rem",
        }}
      >
        <div
          style={{
            fontWeight: 700,
            fontSize: "0.85rem",
            color: NAVY,
            marginBottom: "1rem",
          }}
        >
          R² vs. Final Season Win % (26 seasons, 750+ team-year observations per
          date)
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={finalLineData}
            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
            <XAxis dataKey="date" tick={{ fontSize: 12, fill: MUTED }} />
            <YAxis
              domain={[0, 1]}
              tick={{ fontSize: 11, fill: MUTED }}
              tickFormatter={(v) => v.toFixed(1)}
              label={{
                value: "R²",
                angle: -90,
                position: "insideLeft",
                fill: MUTED,
                fontSize: 11,
              }}
            />
            <Tooltip content={<CustomLineTooltip />} />
            <Legend wrapperStyle={{ fontSize: "0.8rem" }} />
            <Line
              type="monotone"
              dataKey="Win %"
              stroke={WIN_COLOR}
              strokeWidth={2.5}
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="Run Diff / Game"
              stroke={DIFF_COLOR}
              strokeWidth={2.5}
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="Pythagorean %"
              stroke={PYTH_COLOR}
              strokeWidth={2.5}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p
        style={{
          fontSize: "0.88rem",
          color: MUTED,
          marginBottom: "1.5rem",
          fontStyle: "italic",
        }}
      >
        All three metrics improve dramatically as the season progresses. By
        September 1, win percentage alone explains 93% of the variance in final
        record. They are almost the same team at that point.
      </p>

      <Callout accent={NAVY}>
        <strong>May 1:</strong> All three metrics explain roughly 36{"–37"}% of
        final win% variance
        <InfoTip tip="'Variance' is a statistics term for how spread out outcomes are. When we say a stat explains 37% of final win% variance, it means 37% of the reason teams finish where they do can be traced back to their early-season numbers. The other 63% is driven by things not yet visible — injuries, trades, luck, regression." />{" "}
        (R² ≈ 0.37). That means about{" "}
        <strong>63% of the final record is still undecided</strong> in early
        May. By July 1, win% has climbed to R² = 0.72. The picture sharpens fast
        once you get past the first quarter of the season.
      </Callout>

      <p
        style={{
          fontSize: "1rem",
          lineHeight: 1.75,
          color: "#334155",
          marginBottom: "2rem",
        }}
      >
        One thing stands out in the final-record chart:{" "}
        <strong>
          win% and run-based metrics are nearly identical early on
        </strong>
        , but win% pulls ahead starting around June. By July, win% has R² = 0.72
        vs. 0.65 for run differential. The gap widens through September. Once
        enough games are played, the scoreboard is a better signal than the run
        margin.
      </p>

      {/* ── SECTION 2: PREDICTING REMAINING RECORD ── */}
      <SectionLabel>
        The harder question: what does the rest of the season look like?
      </SectionLabel>
      <p
        style={{
          fontSize: "1rem",
          lineHeight: 1.75,
          color: "#334155",
          marginBottom: "1rem",
        }}
      >
        Predicting the final record is mostly a "how much season is left"
        problem. The more interesting question is: can early stats predict{" "}
        <em>future performance</em>? The chart below shows R² against{" "}
        <strong>remaining win percentage</strong>
        <InfoTip tip="A team's winning percentage in games played after the snapshot date — not their record so far, but how they actually perform from that point forward. This is the forward-looking question: not where you've been, but where you're going. Much harder to predict." />{" "}
        after each snapshot date. This is the number that actually matters for
        playoff races.
      </p>

      <div
        style={{
          background: "#fff",
          border: `1px solid ${BORDER}`,
          padding: "1.5rem",
          marginBottom: "1rem",
        }}
      >
        <div
          style={{
            fontWeight: 700,
            fontSize: "0.85rem",
            color: NAVY,
            marginBottom: "1rem",
          }}
        >
          R² vs. Remaining Win % (games played after each snapshot date)
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={remainLineData}
            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
            <XAxis dataKey="date" tick={{ fontSize: 12, fill: MUTED }} />
            <YAxis
              domain={[0, 0.4]}
              tick={{ fontSize: 11, fill: MUTED }}
              tickFormatter={(v) => v.toFixed(2)}
              label={{
                value: "R²",
                angle: -90,
                position: "insideLeft",
                fill: MUTED,
                fontSize: 11,
              }}
            />
            <Tooltip content={<CustomLineTooltip />} />
            <Legend wrapperStyle={{ fontSize: "0.8rem" }} />
            <Line
              type="monotone"
              dataKey="Win %"
              stroke={WIN_COLOR}
              strokeWidth={2.5}
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="Run Diff / Game"
              stroke={DIFF_COLOR}
              strokeWidth={2.5}
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="Pythagorean %"
              stroke={PYTH_COLOR}
              strokeWidth={2.5}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p
        style={{
          fontSize: "0.88rem",
          color: MUTED,
          marginBottom: "1.5rem",
          fontStyle: "italic",
        }}
      >
        Note the Y-axis scale: even our best metric peaks at R² ≈ 0.32.
        Predicting what a team will do with games still left is genuinely hard.
      </p>

      <Callout accent={RED}>
        <strong>This is where it gets interesting.</strong> For predicting
        remaining win%, run differential and Pythagorean win% consistently beat
        raw win-loss record through August. The gap is largest in May: run
        diff/Pythagorean achieve R² ≈ 0.212 vs. win% at 0.167, a{" "}
        <strong>27% relative improvement</strong>. Early in the season, how you
        score and allow runs is a better signal than your record.
      </Callout>

      <p
        style={{
          fontSize: "1rem",
          lineHeight: 1.75,
          color: "#334155",
          marginBottom: "1rem",
        }}
      >
        The gap between run-based metrics and raw win% narrows as the season
        goes on, and by September, win% actually edges ahead. At that point, a
        team's record reflects a large enough sample that luck has mostly washed
        out. The scoreboard finally means what it says.
      </p>
      <p
        style={{
          fontSize: "1rem",
          lineHeight: 1.75,
          color: "#334155",
          marginBottom: "2rem",
        }}
      >
        Perhaps the most important number in this whole analysis: even the best
        predictor (August 1 run differential, R² = 0.317) leaves{" "}
        <strong>68% of remaining variance unexplained</strong>. Baseball is
        chaos. Teams that look like .400 clubs in July finish at .500. Teams
        that run away from the pack in April cool off. The data confirms what
        fans already know: it really is a long season.
      </p>

      {/* ── SECTION 3: INTERACTIVE SCATTER ── */}
      <SectionLabel>Explore the data</SectionLabel>
      <p
        style={{
          fontSize: "1rem",
          lineHeight: 1.75,
          color: "#334155",
          marginBottom: "1.25rem",
        }}
      >
        Below you can dig into the full dataset: 26 seasons, every team, every
        snapshot date. Each dot is one team in one season. Pick a date, a
        predictor, and what you want to predict.
      </p>

      {!scatterLoaded && (
        <div
          style={{
            textAlign: "center",
            padding: "2rem 0",
            marginBottom: "1.5rem",
          }}
        >
          <button
            onClick={loadScatter}
            disabled={scatterLoading}
            style={{
              background: NAVY,
              color: "#fff",
              border: "none",
              padding: "0.75rem 2rem",
              fontSize: "0.9rem",
              fontWeight: 700,
              cursor: scatterLoading ? "wait" : "pointer",
              letterSpacing: "0.04em",
            }}
          >
            {scatterLoading ? "Loading data..." : "Load scatter plot (2 MB)"}
          </button>
        </div>
      )}

      {scatterLoaded && (
        <div style={{ marginBottom: "2.5rem" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "1.25rem",
              marginBottom: "1.25rem",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  color: MUTED,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  marginBottom: "0.5rem",
                }}
              >
                Date
              </div>
              <ToggleGroup
                options={snapOptions}
                value={scatterSnap}
                onChange={(v) => setScatterSnap(v as SnapKey)}
              />
            </div>
            <div>
              <div
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  color: MUTED,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  marginBottom: "0.5rem",
                }}
              >
                Predictor (X axis)
              </div>
              <ToggleGroup
                options={PREDICTORS}
                value={scatterPred}
                onChange={(v) => setScatterPred(v as PredKey)}
                colorMap={predColorMap}
              />
            </div>
            <div>
              <div
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  color: MUTED,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  marginBottom: "0.5rem",
                }}
              >
                Predict (Y axis)
              </div>
              <ToggleGroup
                options={TARGETS}
                value={scatterTarget}
                onChange={(v) => setScatterTarget(v as TargetKey)}
              />
            </div>
          </div>

          {activeR2 !== null && (
            <div
              style={{
                fontSize: "0.82rem",
                color: MUTED,
                marginBottom: "0.75rem",
              }}
            >
              R² = <strong style={{ color: NAVY }}>{r2Label(activeR2)}</strong>{" "}
              ({pct(activeR2)} of variance explained) across{" "}
              {corr[scatterSnap].n} team-seasons
            </div>
          )}

          <div
            style={{
              background: "#fff",
              border: `1px solid ${BORDER}`,
              padding: "1rem",
            }}
          >
            <ResponsiveContainer width="100%" height={380}>
              <ScatterChart
                margin={{ top: 10, right: 20, bottom: 20, left: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                <XAxis
                  type="number"
                  dataKey="x"
                  name={PREDICTORS.find((p) => p.key === scatterPred)?.label}
                  tickFormatter={(v) => v.toFixed(2)}
                  tick={{ fontSize: 11, fill: MUTED }}
                  label={{
                    value:
                      PREDICTORS.find((p) => p.key === scatterPred)?.label ??
                      "",
                    position: "insideBottom",
                    offset: -10,
                    fill: MUTED,
                    fontSize: 11,
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name={TARGETS.find((t) => t.key === scatterTarget)?.label}
                  tickFormatter={(v) => v.toFixed(2)}
                  tick={{ fontSize: 11, fill: MUTED }}
                  label={{
                    value:
                      TARGETS.find((t) => t.key === scatterTarget)?.label ?? "",
                    angle: -90,
                    position: "insideLeft",
                    fill: MUTED,
                    fontSize: 11,
                  }}
                />
                <Tooltip content={<CustomScatterTooltip />} />
                <ReferenceLine x={0.5} stroke={BORDER} strokeDasharray="4 4" />
                <ReferenceLine y={0.5} stroke={BORDER} strokeDasharray="4 4" />
                <Scatter
                  data={scatterData}
                  fill={predColorMap[scatterPred] ?? NAVY}
                  fillOpacity={0.45}
                  r={3.5}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <p
            style={{
              fontSize: "0.8rem",
              color: MUTED,
              marginTop: "0.5rem",
              fontStyle: "italic",
            }}
          >
            Each dot = one team in one season. Hover for team and year. Dashed
            lines mark .500.
          </p>
        </div>
      )}

      {/* ── SO WHAT ABOUT THE RED SOX ── */}
      <SectionLabel>So what about the Red Sox?</SectionLabel>
      <p
        style={{
          fontSize: "1rem",
          lineHeight: 1.75,
          color: "#334155",
          marginBottom: "1rem",
        }}
      >
        Back to the team that started this whole exercise. Through April 23, the
        Sox are 9{"–15"}
        with a -20 run differential
        <InfoTip tip="Total runs scored minus runs allowed. -20 means the Red Sox have been outscored by 20 runs across 24 games — about 0.83 runs per game. That's the pitching and defense giving up more than the offense is producing." />{" "}
        and a Pythagorean win percentage
        <InfoTip tip="With 90 runs scored and 110 allowed, the Bill James formula (RS^1.83 ÷ (RS^1.83 + RA^1.83)) projects Boston as a ~41% team. That's close to their actual 37.5% record, which means they aren't just unlucky — the underlying performance mostly matches the results." />{" "}
        of roughly <strong style={{ color: RED }}>41%</strong>. That is not
        good. But how much does it actually tell us at this point in the season?
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "0.75rem",
          marginBottom: "1.5rem",
        }}
      >
        <StatCard
          label="2026 Record"
          value="9-15"
          sub="through April 23"
          accent={RED}
        />
        <StatCard
          label="Win %"
          value=".375"
          sub="29 games below pace"
          accent={RED}
        />
        <StatCard
          label="Run Diff"
          value="-20"
          sub="90 RS / 110 RA"
          accent={RED}
        />
        <StatCard
          label="Pythagorean"
          value="~41%"
          sub="RS^1.83 / (RS^1.83 + RA^1.83)"
          accent={DIFF_COLOR}
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
        Here is the encouraging part: we are still a week out from the earliest
        snapshot in our data (May 1). At May 1, win percentage explains only 36%
        of final record variance. That means{" "}
        <strong>64% of the story has not been written yet</strong>. The
        regression toward the mean is real: a team at .375 in early May does not
        project to .375 in October. The model pulls them back toward .500.
      </p>

      <Callout accent={PYTH_COLOR}>
        <strong>
          The run-differential picture matters more than the record right now.
        </strong>{" "}
        This early in the season, run diff and Pythagorean win% are better
        predictors of future performance than win-loss record. The Sox's -20 run
        diff over 24 games (about -0.83 per game) is more concerning than the 9
        {"–15"} record itself, because it suggests the underlying performance
        matches the record. If they were 9{"–15"} with a positive run
        differential, the data would give considerably more cause for optimism.
      </Callout>

      <p
        style={{
          fontSize: "1rem",
          lineHeight: 1.75,
          color: "#334155",
          marginBottom: "2.5rem",
        }}
      >
        That said, even August 1 run differential only explains 32% of remaining
        win% variance. Teams have turned it around from worse spots. The data
        does not say it is over. It says it is harder than it looks, and that
        the runs allowed number is the one worth watching.
      </p>

      {/* ── WIN TOTAL PROJECTION ── */}
      <SectionLabel>Projected 2026 win total</SectionLabel>
      <p
        style={{
          fontSize: "1rem",
          lineHeight: 1.75,
          color: "#334155",
          marginBottom: "1.25rem",
        }}
      >
        Using current Pythagorean win% (40.9%) as the point estimate for the
        remaining 138 games, here is what the numbers say about where this team
        finishes.
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "0.75rem",
          marginBottom: "1.5rem",
        }}
      >
        <StatCard
          label="Projected Wins"
          value="65"
          sub="Pythagorean extrapolation"
          accent={NAVY}
        />
        <StatCard
          label="90% CI Low"
          value="56 W"
          sub="5th percentile"
          accent={RED}
        />
        <StatCard
          label="90% CI High"
          value="75 W"
          sub="95th percentile"
          accent={PYTH_COLOR}
        />
        <StatCard
          label="Pace vs .500"
          value="–16 W"
          sub="vs. 81-win pace"
          accent={RED}
        />
      </div>
      <Callout accent={NAVY}>
        <strong>How this is calculated:</strong> Pythagorean win% (RS^1.83 /
        (RS^1.83 + RA^1.83)) of 40.9% is applied to 138 remaining games for a
        point estimate of 56 additional wins (65 total). The 90% confidence
        interval uses a normal approximation to the binomial: ±1.645 × √(138 ×
        0.409 × 0.591) ≈ ±9.5 wins. This treats each remaining game as an
        independent Bernoulli trial at the current Pythagorean rate. It does{" "}
        <em>not</em> account for regression toward .500, which at this point in
        the season (R² ≈ 0.37 at May 1) would push the projection slightly
        higher, toward 70–72 wins. The honest answer is that we are still deep
        in the noise. A 56-win season and a 75-win season are both consistent
        with what we have seen so far.
      </Callout>

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
              ), queried for all 30 MLB franchises across the 2000{"–2"}025
              regular seasons. Snapshot dates: May 1, June 1, July 1, August 1,
              September 1. End-of-season standings fetched without a date filter
              to capture the final record. 2020 (COVID-shortened season) is
              excluded from May, June, and July snapshots.
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
              <strong>Win %</strong> = W / (W + L) at snapshot.{" "}
              <strong>Run Diff / Game</strong> = (Runs Scored - Runs Allowed) /
              Games Played. <strong>Pythagorean Win %</strong> uses the refined
              Bill James exponent: RS^1.83 / (RS^1.83 + RA^1.83) (
              <a
                href="https://www.baseball-reference.com/bullpen/Pythagorean_Theorem_of_Baseball#The_Formula"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: NAVY, textDecoration: "underline" }}
              >
                Baseball Reference
              </a>
              ). <strong>Remaining Win %</strong> = wins in games played after
              the snapshot date / total games after that date.
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
              Statistical Techniques
            </div>
            <p
              style={{
                fontSize: "0.88rem",
                color: "#475569",
                lineHeight: 1.65,
              }}
            >
              Pearson correlation coefficient (r) and coefficient of
              determination (R²) computed for each predictor/target/date
              combination using all team-seasons in the sample (n = 750 per date
              for most checkpoints). RMSE is calculated from the ordinary
              least-squares linear regression of each predictor on the target.
              No corrections for team identity or year effects were applied. All
              analysis code is in{" "}
              <code
                style={{
                  background: "#f1f5f9",
                  padding: "0 4px",
                  fontSize: "0.8rem",
                }}
              >
                data-scripts/season-prediction/
              </code>
              .
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
              Assumptions
            </div>
            <p
              style={{
                fontSize: "0.88rem",
                color: "#475569",
                lineHeight: 1.65,
              }}
            >
              Team quality is treated as stable within a season (no trades or
              injuries modeled). The relationship between early and final
              performance is assumed linear for R² purposes. Seasons are treated
              as independent observations despite franchise continuity. Rule
              changes (universal DH, extra-innings runner, expanded rosters) are
              not adjusted for. 2026 Red Sox stats used in the narrative are as
              of April 23, 2026 and are not in the model.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
