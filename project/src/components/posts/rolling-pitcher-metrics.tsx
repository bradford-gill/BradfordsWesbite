/* metadata: { "title": "Rolling Pitcher Metrics", "date": "2026-08-20", "slug": "rolling-pitcher-metrics", "excerpt": "Search any MLB pitcher and plot rolling ERA, K%, WHIP, xFIP, SIERA and more — computed live from Baseball Savant and MLB Stats API data." } */

import { useState, useEffect, useRef, useCallback } from "react";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Window {
    Plotly: any;
  }
}

// ── Constants ─────────────────────────────────────────────────────────────────

const NAVY = "#0C2340";
const MUTED = "#64748b";
const BORDER = "#e2e8f0";
const RED = "#BD3039";
const CURRENT_YEAR = new Date().getFullYear();
const LG_HR_FB = 0.104;
const FIP_CONSTANT = 3.15;

const PITCHER_COLORS = [
  "#3B82F6",
  "#EF4444",
  "#10B981",
  "#F59E0B",
  "#8B5CF6",
  "#06B6D4",
  "#F97316",
  "#84CC16",
  "#EC4899",
  "#6366F1",
];

const SEASONS = Array.from(
  { length: CURRENT_YEAR - 2015 + 1 },
  (_, i) => CURRENT_YEAR - i,
);

// ── Types ─────────────────────────────────────────────────────────────────────

type MetricKey =
  | "era"
  | "kPct"
  | "bbPct"
  | "kMinusBbPct"
  | "whip"
  | "xfip"
  | "siera";

interface MetricConfig {
  key: MetricKey;
  label: string;
  tip: string;
  format: (v: number) => string;
  refLine: number;
  tickFmt: string;
  hoverFmt: string;
}

const METRICS: MetricConfig[] = [
  {
    key: "era",
    label: "ERA",
    tip: "Earned Run Average: earned runs allowed per 9 innings. Fetched from MLB Stats API game logs.",
    format: (v) => v.toFixed(2),
    refLine: 4.2,
    tickFmt: ".2f",
    hoverFmt: ".2f",
  },
  {
    key: "kPct",
    label: "K%",
    tip: "Strikeout rate: share of plate appearances ending in a strikeout. League avg is around 22%.",
    format: (v) => `${(v * 100).toFixed(1)}%`,
    refLine: 0.22,
    tickFmt: ".0%",
    hoverFmt: ".1%",
  },
  {
    key: "bbPct",
    label: "BB%",
    tip: "Walk rate: share of plate appearances ending in a walk. League avg is around 8.5%.",
    format: (v) => `${(v * 100).toFixed(1)}%`,
    refLine: 0.085,
    tickFmt: ".0%",
    hoverFmt: ".1%",
  },
  {
    key: "kMinusBbPct",
    label: "K-BB%",
    tip: "Strikeout rate minus walk rate. Combines swing-and-miss with command. League avg starter is around 13%.",
    format: (v) => `${(v * 100).toFixed(1)}%`,
    refLine: 0.13,
    tickFmt: ".0%",
    hoverFmt: ".1%",
  },
  {
    key: "whip",
    label: "WHIP",
    tip: "Walks plus hits per inning pitched. League avg starter is around 1.25.",
    format: (v) => v.toFixed(2),
    refLine: 1.25,
    tickFmt: ".2f",
    hoverFmt: ".2f",
  },
  {
    key: "xfip",
    label: "xFIP",
    tip: "Expected Fielding Independent Pitching — replaces actual HRs with expected HRs using league-average HR/fly ball rate. League avg is ~4.00.",
    format: (v) => v.toFixed(2),
    refLine: 4.0,
    tickFmt: ".2f",
    hoverFmt: ".2f",
  },
  {
    key: "siera",
    label: "SIERA",
    tip: "Skill-Interactive ERA — uses K%, BB%, and batted ball mix to estimate true run prevention. League avg is ~4.00.",
    format: (v) => v.toFixed(2),
    refLine: 4.0,
    tickFmt: ".2f",
    hoverFmt: ".2f",
  },
];

interface PA {
  date: string;
  k: boolean;
  bb: boolean;
  hbp: boolean;
  hit: boolean;
  gb: boolean;
  fb: boolean;
  ld: boolean;
  outs: number;
}

type GameLog = Record<string, number>; // date → earned runs

type PitcherStatus = "fetching" | "processing" | "ready" | "error";

interface PitcherState {
  id: number;
  name: string;
  team: string;
  color: string;
  status: PitcherStatus;
  errorMsg?: string;
  pas: PA[];
  gameLog: GameLog;
  cachedAt?: number;
  season: number;
}

interface SearchResult {
  id: number;
  name: string;
  team: string;
  position: string;
}

type RollingPoint = { date: string } & Record<MetricKey, number | null>;

// ── Utilities ─────────────────────────────────────────────────────────────────

function outsFromEvent(ev: string): number {
  if (
    [
      "field_out",
      "force_out",
      "sac_fly",
      "sac_bunt",
      "fielders_choice_out",
      "other_out",
      "strikeout",
    ].includes(ev)
  )
    return 1;
  if (
    [
      "double_play",
      "grounded_into_double_play",
      "strikeout_double_play",
      "sac_fly_double_play",
      "sac_bunt_double_play",
    ].includes(ev)
  )
    return 2;
  if (ev === "triple_play") return 3;
  return 0;
}

function parseCSVRow(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQ = false;
  for (const ch of line) {
    if (ch === '"') inQ = !inQ;
    else if (ch === "," && !inQ) {
      result.push(cur);
      cur = "";
    } else cur += ch;
  }
  result.push(cur);
  return result;
}

function parseCSV(csv: string): PA[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0]
    .split(",")
    .map((h) => h.trim().replace(/^"|"$/g, ""));
  const idx = (n: string) => headers.indexOf(n);
  const evI = idx("events"),
    dateI = idx("game_date"),
    bbI = idx("bb_type");
  if (evI < 0 || dateI < 0) return [];
  const pas: PA[] = [];
  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVRow(lines[i]);
    const ev = row[evI]?.trim() ?? "";
    if (!ev) continue;
    const date = row[dateI]?.trim() ?? "";
    const bb = bbI >= 0 ? (row[bbI]?.trim() ?? "") : "";
    pas.push({
      date,
      k: ev === "strikeout" || ev === "strikeout_double_play",
      bb: ev === "walk" || ev === "intent_walk",
      hbp: ev === "hit_by_pitch",
      hit: ["single", "double", "triple", "home_run"].includes(ev),
      gb: bb === "ground_ball",
      fb: bb === "fly_ball" || bb === "popup",
      ld: bb === "line_drive",
      outs: outsFromEvent(ev),
    });
  }
  return pas.sort((a, b) => a.date.localeCompare(b.date));
}

async function fetchGameLog(id: number, season: number): Promise<GameLog> {
  const res = await fetch(
    `https://statsapi.mlb.com/api/v1/people/${id}/stats?stats=gameLog&group=pitching&season=${season}&sportId=1`,
  );
  const json = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const splits: any[] = json.stats?.[0]?.splits ?? [];
  const log: GameLog = {};
  for (const s of splits) {
    const date: string = s.date;
    log[date] = (log[date] ?? 0) + (s.stat?.earnedRuns ?? 0);
  }
  return log;
}

function computeRolling(
  pas: PA[],
  gameLog: GameLog,
  w: number,
): RollingPoint[] {
  const hasGameLog = Object.keys(gameLog).length > 0;
  const result: RollingPoint[] = [];
  for (let i = 0; i < pas.length; i++) {
    const isLastInGame =
      i === pas.length - 1 || pas[i + 1].date !== pas[i].date;
    if (!isLastInGame) continue;
    const win = pas.slice(Math.max(0, i - w + 1), i + 1);
    const pa = win.length;
    const k = win.filter((p) => p.k).length;
    const bb = win.filter((p) => p.bb).length;
    const hbp = win.filter((p) => p.hbp).length;
    const hit = win.filter((p) => p.hit).length;
    const fb = win.filter((p) => p.fb).length;
    const gb = win.filter((p) => p.gb).length;
    const ld = win.filter((p) => p.ld).length;
    const ip = win.reduce((s, p) => s + p.outs, 0) / 3;
    const gameDates = [...new Set(win.map((p) => p.date))];
    const earnedRuns = hasGameLog
      ? gameDates.reduce((s, d) => s + (gameLog[d] ?? 0), 0)
      : null;
    const era = ip > 0 && earnedRuns !== null ? (earnedRuns * 9) / ip : null;
    const kPct = pa > 0 ? k / pa : null;
    const bbPct = pa > 0 ? bb / pa : null;
    const kMinusBbPct = kPct != null && bbPct != null ? kPct - bbPct : null;
    const whip = ip > 0 ? (bb + hit) / ip : null;
    const xfip =
      ip > 0
        ? (13 * fb * LG_HR_FB + 3 * (bb + hbp) - 2 * k) / ip + FIP_CONSTANT
        : null;
    let siera: number | null = null;
    if (pa > 0 && kPct != null && bbPct != null) {
      const net = (gb - fb - ld) / pa;
      siera =
        6.145 -
        16.986 * kPct +
        11.434 * bbPct -
        1.858 * net +
        7.653 * kPct * kPct +
        (net > 0 ? -1 : 1) * 6.664 * net * net +
        10.13 * kPct * net -
        5.195 * bbPct * net;
    }
    result.push({
      date: pas[i].date,
      era,
      kPct,
      bbPct,
      kMinusBbPct,
      whip,
      xfip,
      siera,
    });
  }
  return result;
}

// ── Cache ──────────────────────────────────────────────────────────────────────

const ck = (id: number, s: number) => `sv_pitcher_v5_${id}_${s}`;
const ttl = (s: number) =>
  s < CURRENT_YEAR ? 7 * 24 * 60 * 60 * 1000 : 60 * 60 * 1000;

function cacheRead(
  id: number,
  s: number,
): { pas: PA[]; gameLog: GameLog; ts: number } | null {
  try {
    const raw = localStorage.getItem(ck(id, s));
    if (!raw) return null;
    const { pas, gameLog, ts } = JSON.parse(raw);
    if (Date.now() - ts > ttl(s)) {
      localStorage.removeItem(ck(id, s));
      return null;
    }
    return { pas, gameLog: gameLog ?? {}, ts };
  } catch {
    return null;
  }
}

function cacheWrite(id: number, s: number, pas: PA[], gameLog: GameLog): void {
  try {
    localStorage.setItem(
      ck(id, s),
      JSON.stringify({ pas, gameLog, ts: Date.now() }),
    );
  } catch {
    /* quota */
  }
}

// ── UI Atoms ──────────────────────────────────────────────────────────────────

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
          width: 15,
          height: 15,
          borderRadius: "50%",
          border: "1.5px solid #64748b",
          background: "transparent",
          color: "#64748b",
          fontSize: 9,
          fontWeight: 800,
          cursor: "pointer",
          padding: 0,
          marginLeft: 3,
          lineHeight: 1,
          fontStyle: "italic",
          fontFamily: "Georgia, serif",
          position: "relative",
          top: -6,
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
            borderRadius: 6,
            width: 240,
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

const Spinner = ({ color }: { color: string }) => (
  <span
    style={{
      display: "inline-block",
      width: 8,
      height: 8,
      borderRadius: "50%",
      border: `2px solid ${color}44`,
      borderTopColor: color,
      animation: "rpmSpin 0.7s linear infinite",
      flexShrink: 0,
    }}
  />
);

// ── Main Component ────────────────────────────────────────────────────────────

export default function RollingPitcherMetrics() {
  const [pitchers, setPitchers] = useState<PitcherState[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const [metric, setMetric] = useState<MetricKey>("era");
  const [windowSize, setWindowSize] = useState(75);
  const [season, setSeason] = useState(CURRENT_YEAR);
  const [plotlyReady, setPlotlyReady] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const defaultLoaded = useRef(false);

  useEffect(() => {
    if (window.Plotly) {
      setPlotlyReady(true);
      return;
    }
    const s = document.createElement("script");
    s.src = "https://cdn.plot.ly/plotly-2.35.2.min.js";
    s.onload = () => setPlotlyReady(true);
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setDropOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  useEffect(() => {
    clearTimeout(timer.current);
    if (query.trim().length < 2) {
      setResults([]);
      setDropOpen(false);
      return;
    }
    setSearchLoading(true);
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://statsapi.mlb.com/api/v1/people/search?names=${encodeURIComponent(query)}&sportIds=1&hydrate=currentTeam`,
        );
        const json = await res.json();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const people = (json.people ?? []).slice(0, 10).map((p: any) => ({
          id: p.id,
          name: p.fullName,
          team: p.currentTeam?.abbreviation ?? "",
          position: p.primaryPosition?.abbreviation ?? "",
        }));
        setResults(people);
        setDropOpen(people.length > 0);
      } catch {
        setResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  }, [query]);

  const addPitcher = useCallback(
    async (id: number, name: string, team: string) => {
      if (
        pitchers.length >= 10 ||
        pitchers.some((p) => p.id === id && p.season === season)
      )
        return;
      setQuery("");
      setDropOpen(false);
      setResults([]);
      const color = PITCHER_COLORS[pitchers.length % PITCHER_COLORS.length];
      setPitchers((prev) => [
        ...prev,
        {
          id,
          name,
          team,
          color,
          status: "fetching",
          pas: [],
          gameLog: {},
          season,
        },
      ]);
      const cached = cacheRead(id, season);
      if (cached) {
        setPitchers((prev) =>
          prev.map((p) =>
            p.id === id && p.season === season
              ? {
                  ...p,
                  status: "ready",
                  pas: cached.pas,
                  gameLog: cached.gameLog,
                  cachedAt: cached.ts,
                }
              : p,
          ),
        );
        return;
      }
      try {
        const statcastUrl = `https://baseballsavant.mlb.com/statcast_search/csv?all=true&player_type=pitcher&pitchers_lookup%5B%5D=${id}&type=details&hfSea=${season}%7C&hfGT=R%7C`;
        const [statcastRes, gameLog] = await Promise.all([
          fetch(statcastUrl),
          fetchGameLog(id, season).catch(() => ({}) as GameLog),
        ]);
        if (!statcastRes.ok) throw new Error(`HTTP ${statcastRes.status}`);
        setPitchers((prev) =>
          prev.map((p) =>
            p.id === id && p.season === season
              ? { ...p, status: "processing" }
              : p,
          ),
        );
        const csv = await statcastRes.text();
        const pas = parseCSV(csv);
        if (pas.length === 0)
          throw new Error(`No Statcast data found for ${name} in ${season}`);
        cacheWrite(id, season, pas, gameLog);
        setPitchers((prev) =>
          prev.map((p) =>
            p.id === id && p.season === season
              ? { ...p, status: "ready", pas, gameLog, cachedAt: Date.now() }
              : p,
          ),
        );
      } catch (e) {
        setPitchers((prev) =>
          prev.map((p) =>
            p.id === id && p.season === season
              ? {
                  ...p,
                  status: "error",
                  errorMsg: e instanceof Error ? e.message : "Failed to fetch",
                }
              : p,
          ),
        );
      }
    },
    [pitchers, season],
  );

  useEffect(() => {
    if (defaultLoaded.current) return;
    defaultLoaded.current = true;
    fetch(
      "https://statsapi.mlb.com/api/v1/people/search?names=Payton%20Tolle&sportIds=1&hydrate=currentTeam",
    )
      .then((r) => r.json())
      .then((json) => {
        const p = json.people?.[0];
        if (p) addPitcher(p.id, p.fullName, p.currentTeam?.abbreviation ?? "");
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const removePitcher = useCallback((id: number, s: number) => {
    setPitchers((prev) => prev.filter((p) => !(p.id === id && p.season === s)));
  }, []);

  const activePitchers = pitchers.filter((p) => p.season === season);
  const readyPitchers = activePitchers.filter((p) => p.status === "ready");
  const metricCfg = METRICS.find((m) => m.key === metric)!;
  const rolling = readyPitchers.map((p) => ({
    ...p,
    pts: computeRolling(p.pas, p.gameLog, windowSize),
  }));

  // Plotly chart
  useEffect(() => {
    if (!plotlyReady || !chartRef.current) return;
    if (rolling.length === 0) {
      window.Plotly?.purge(chartRef.current);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const traces: any[] = rolling.map((r) => ({
      name: r.name,
      x: r.pts.map((pt) => pt.date),
      y: r.pts.map((pt) => pt[metric]),
      type: "scatter",
      mode: "lines",
      line: { color: r.color, width: 2.5 },
      connectgaps: true,
      hovertemplate: `<b>${r.name}</b>: %{y:${metricCfg.hoverFmt}}<extra></extra>`,
    }));

    const layout = {
      autosize: true,
      height: 380,
      margin: { t: 16, r: 24, b: 100, l: 56 },
      font: { family: "inherit", size: 11, color: MUTED },
      paper_bgcolor: "white",
      plot_bgcolor: "white",
      xaxis: {
        type: "date",
        tickformat: "%b %d",
        gridcolor: "#f1f5f9",
        showgrid: true,
        zeroline: false,
      },
      yaxis: {
        gridcolor: "#f1f5f9",
        showgrid: true,
        zeroline: false,
        tickformat: metricCfg.tickFmt,
      },
      legend: {
        orientation: "h",
        y: -0.22,
        x: 0,
        xanchor: "left",
        font: { size: 11 },
        bgcolor: "rgba(0,0,0,0)",
      },
      hovermode: "x unified",
      shapes: [
        {
          type: "line",
          xref: "paper",
          yref: "y",
          x0: 0,
          x1: 1,
          y0: metricCfg.refLine,
          y1: metricCfg.refLine,
          line: { color: "#cbd5e1", width: 1, dash: "dot" },
        },
      ],
      annotations: [
        {
          xref: "paper",
          yref: "y",
          x: -0.02,
          y: metricCfg.refLine,
          text: "Lg Avg",
          showarrow: false,
          font: { size: 9, color: "#94a3b8" },
          xanchor: "right",
          yanchor: "middle",
        },
      ],
    };

    window.Plotly.react(chartRef.current, traces, layout, {
      responsive: true,
      displayModeBar: false,
    });
    const el = chartRef.current;
    return () => {
      window.Plotly?.purge(el);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plotlyReady, rolling, metric]);

  const cacheAge = (ts: number) => {
    const mins = Math.round((Date.now() - ts) / 60000);
    if (mins < 2) return "just now";
    if (mins < 60) return `${mins}m ago`;
    return `${Math.round(mins / 60)}h ago`;
  };

  return (
    <div style={{ fontFamily: "inherit", maxWidth: "100%" }}>
      <style>{`
        @keyframes rpmSpin { to { transform: rotate(360deg); } }
        @keyframes rpmShimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(400%); } }
      `}</style>

      <h1
        style={{
          fontSize: "1.6rem",
          fontWeight: 800,
          color: NAVY,
          marginBottom: "0.4rem",
        }}
      >
        Rolling Pitcher Metrics
      </h1>
      <p
        style={{
          color: MUTED,
          fontSize: "0.95rem",
          marginBottom: "1.75rem",
          lineHeight: 1.7,
        }}
      >
        Search any MLB pitcher and compare rolling ERA, K%, BB%, WHIP
        <InfoTip tip="Walks plus hits per inning pitched" />, xFIP
        <InfoTip tip="Expected FIP — normalizes home run rate to league average, removing HR variance and defense from the equation" />
        , and SIERA
        <InfoTip tip="Skill-Interactive ERA — the most complete single-number estimate of a pitcher's true skill, using strikeout rate, walk rate, and batted ball types" />
        . Data fetched live from Baseball Savant and MLB Stats API, cached in
        your browser.
      </p>

      {/* ── Search + Season ── */}
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          alignItems: "flex-start",
          marginBottom: "0.85rem",
          flexWrap: "wrap",
        }}
      >
        <div
          ref={searchRef}
          style={{ position: "relative", flex: "1 1 240px" }}
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setDropOpen(true)}
            placeholder={
              activePitchers.length >= 10
                ? "10 pitchers max"
                : "Search pitcher name..."
            }
            disabled={activePitchers.length >= 10}
            style={{
              width: "100%",
              padding: "0.55rem 2.25rem 0.55rem 0.85rem",
              border: `1.5px solid ${BORDER}`,
              borderRadius: 8,
              fontSize: "0.9rem",
              outline: "none",
              boxSizing: "border-box",
              color: NAVY,
              background: activePitchers.length >= 10 ? "#f8fafc" : "white",
            }}
          />
          {searchLoading && (
            <span
              style={{
                position: "absolute",
                right: "0.7rem",
                top: "50%",
                transform: "translateY(-50%)",
                width: 13,
                height: 13,
                border: "2px solid #e2e8f0",
                borderTopColor: "#3B82F6",
                borderRadius: "50%",
                animation: "rpmSpin 0.7s linear infinite",
                display: "inline-block",
              }}
            />
          )}
          {dropOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                left: 0,
                right: 0,
                background: "white",
                border: `1px solid ${BORDER}`,
                borderRadius: 8,
                boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                zIndex: 50,
                overflow: "hidden",
              }}
            >
              {results.map((r) => (
                <button
                  key={r.id}
                  onClick={() => addPitcher(r.id, r.name, r.team)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    width: "100%",
                    padding: "0.6rem 0.85rem",
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    fontSize: "0.875rem",
                    textAlign: "left",
                    color: NAVY,
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#f1f5f9")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "none")
                  }
                >
                  <span style={{ fontWeight: 600, flex: 1 }}>{r.name}</span>
                  <span style={{ color: MUTED, fontSize: "0.78rem" }}>
                    {[r.team, r.position].filter(Boolean).join(" · ")}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <select
          value={season}
          onChange={(e) => setSeason(Number(e.target.value))}
          style={{
            padding: "0.55rem 0.75rem",
            border: `1.5px solid ${BORDER}`,
            borderRadius: 8,
            fontSize: "0.9rem",
            background: "white",
            color: NAVY,
            cursor: "pointer",
            outline: "none",
          }}
        >
          {SEASONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* ── Pitcher chips ── */}
      {activePitchers.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.45rem",
            marginBottom: "1rem",
          }}
        >
          {activePitchers.map((p) => (
            <div
              key={`${p.id}_${p.season}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                padding: "0.28rem 0.55rem",
                borderRadius: 999,
                border: `1.5px solid ${p.color}33`,
                background: `${p.color}0f`,
                fontSize: "0.82rem",
                fontWeight: 600,
                color: NAVY,
              }}
            >
              {p.status === "fetching" || p.status === "processing" ? (
                <Spinner color={p.color} />
              ) : p.status === "error" ? (
                <span style={{ color: RED, fontSize: "0.7rem" }}>⚠</span>
              ) : (
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: p.color,
                    display: "inline-block",
                    flexShrink: 0,
                  }}
                />
              )}
              <span>{p.name}</span>
              {p.status === "ready" && (
                <span
                  style={{ color: MUTED, fontWeight: 400, fontSize: "0.77rem" }}
                >
                  {p.pas.length.toLocaleString()} PA
                </span>
              )}
              {p.status === "ready" && p.cachedAt && (
                <span
                  style={{
                    color: "#94a3b8",
                    fontWeight: 400,
                    fontSize: "0.7rem",
                    background: "#f1f5f9",
                    padding: "0 5px",
                    borderRadius: 4,
                  }}
                >
                  cached {cacheAge(p.cachedAt)}
                </span>
              )}
              <button
                onClick={() => removePitcher(p.id, p.season)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: MUTED,
                  fontSize: "0.9rem",
                  padding: "0 2px",
                  lineHeight: 1,
                  marginLeft: "0.1rem",
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Fetch status bars ── */}
      {activePitchers
        .filter((p) => p.status !== "ready")
        .map((p) => (
          <div
            key={`status_${p.id}_${p.season}`}
            style={{ marginBottom: "0.5rem" }}
          >
            {(p.status === "fetching" || p.status === "processing") && (
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}
              >
                <div
                  style={{
                    flex: 1,
                    height: 3,
                    borderRadius: 3,
                    background: "#e2e8f0",
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      height: "100%",
                      width: "30%",
                      background: p.color,
                      borderRadius: 3,
                      animation: "rpmShimmer 1.6s ease-in-out infinite",
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: "0.76rem",
                    color: MUTED,
                    whiteSpace: "nowrap",
                  }}
                >
                  {p.status === "fetching"
                    ? `Fetching ${p.name}'s ${p.season} data...`
                    : `Parsing ${p.name}'s pitch data...`}
                </span>
              </div>
            )}
            {p.status === "error" && (
              <span style={{ fontSize: "0.76rem", color: RED }}>
                {p.name}: {p.errorMsg}
              </span>
            )}
          </div>
        ))}

      {/* ── Controls ── */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "1.5rem",
          alignItems: "flex-start",
          padding: "0.85rem 1rem",
          background: "#f8fafc",
          borderRadius: 8,
          border: `1px solid ${BORDER}`,
          marginBottom: "1rem",
        }}
      >
        <div>
          <SectionLabel>Metric</SectionLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
            {METRICS.map((m) => (
              <button
                key={m.key}
                onClick={() => setMetric(m.key)}
                title={m.tip}
                style={{
                  padding: "0.28rem 0.65rem",
                  borderRadius: 999,
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  border: "1.5px solid",
                  borderColor: metric === m.key ? NAVY : BORDER,
                  background: metric === m.key ? NAVY : "white",
                  color: metric === m.key ? "white" : MUTED,
                  transition: "all 0.12s",
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ minWidth: 200 }}>
          <SectionLabel>Rolling Window</SectionLabel>
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
          >
            <input
              type="range"
              min={10}
              max={300}
              step={5}
              value={windowSize}
              onChange={(e) => setWindowSize(Number(e.target.value))}
              style={{ flex: 1, accentColor: NAVY, cursor: "pointer" }}
            />
            <span
              style={{
                fontSize: "0.85rem",
                fontWeight: 700,
                color: NAVY,
                minWidth: 60,
                whiteSpace: "nowrap",
              }}
            >
              {windowSize} PA
              <InfoTip tip="Number of plate appearances in the rolling window. Larger = smoother but slower to react to real changes." />
            </span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "0.7rem",
              color: "#94a3b8",
              marginTop: "0.1rem",
            }}
          >
            <span>10 (noisy)</span>
            <span>300 (smooth)</span>
          </div>
        </div>
      </div>

      {/* ── Chart ── */}
      {readyPitchers.length === 0 ? (
        <div
          style={{
            height: 320,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#f8fafc",
            border: `1px solid ${BORDER}`,
            borderRadius: 8,
            color: MUTED,
            fontSize: "0.9rem",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          <span style={{ fontSize: "1.6rem" }}>⚾</span>
          <span>Search for a pitcher above to get started</span>
        </div>
      ) : !plotlyReady ? (
        <div
          style={{
            height: 380,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#f8fafc",
            border: `1px solid ${BORDER}`,
            borderRadius: 8,
            color: MUTED,
          }}
        >
          Loading chart...
        </div>
      ) : (
        <div
          style={{
            border: `1px solid ${BORDER}`,
            borderRadius: 8,
            overflow: "hidden",
            background: "white",
          }}
        >
          <div ref={chartRef} style={{ width: "100%" }} />
        </div>
      )}

      {/* ── METHODOLOGY ── */}
      <div
        style={{
          marginTop: "3rem",
          paddingTop: "1.5rem",
          borderTop: `1px solid ${BORDER}`,
        }}
      >
        <SectionLabel>Methodology</SectionLabel>
        <div
          style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
        >
          {[
            {
              title: "Data Sources",
              bullets: [
                "Pitch-level Statcast data from Baseball Savant's statcast_search endpoint, filtered to regular season MLB games only",
                "Per-game earned run totals from the MLB Stats API gameLog endpoint — used for actual ERA calculation",
                "Both are fetched in parallel and cached together in localStorage (1 hour for current season, 7 days for past seasons)",
              ],
            },
            {
              title: "Metric Definitions",
              bullets: [
                "ERA = (earned runs × 9) / IP — earned runs from MLB Stats API game logs, IP from Statcast out-recording events",
                "K% = strikeouts / PA",
                "BB% = walks / PA",
                "K-BB% = K% minus BB%",
                "WHIP = (BB + H) / IP",
                "xFIP = ((13 × FB × lgHR/FB) + (3 × (BB + HBP)) − (2 × K)) / IP + 3.15; uses league-average HR/FB rate of 10.4%",
                "SIERA = Swartz (2010) formula incorporating K%, BB%, GB%, FB%, and LD% rates",
              ],
            },
            {
              title: "Rolling Window",
              bullets: [
                "Each data point represents the metric computed over the trailing N plate appearances as of the end of that game",
                "For ERA, earned runs are summed across all game dates within the PA window",
                "Early-season games use however many PAs are available",
                "Popups are counted as fly balls for xFIP and SIERA",
              ],
            },
            {
              title: "Assumptions & Limitations",
              bullets: [
                "FIP constant fixed at 3.15 and HR/FB rate at 10.4% regardless of season",
                "ERA reflects real earned run decisions (scorer judgment on errors), unlike xFIP or SIERA",
                "SIERA and xFIP can be noisy with windows under 30 PA",
                "Relievers accumulate PA much faster than starters — a 75-PA window covers a reliever's whole season",
              ],
            },
          ].map(({ title, bullets }) => (
            <div key={title}>
              <div
                style={{
                  fontWeight: 700,
                  color: NAVY,
                  fontSize: "0.82rem",
                  marginBottom: "0.4rem",
                }}
              >
                {title}
              </div>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: "1.1rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.2rem",
                }}
              >
                {bullets.map((b) => (
                  <li
                    key={b}
                    style={{
                      color: "#475569",
                      fontSize: "0.88rem",
                      lineHeight: 1.6,
                    }}
                  >
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
