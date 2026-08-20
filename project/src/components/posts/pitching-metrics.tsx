/* metadata: { "title": "Which Pitching Metrics Actually Predict Future Performance?", "date": "2026-08-20", "slug": "pitching-metrics", "excerpt": "Starter and reliever metrics compared across rolling PA windows — which stats hold up, and how much data do you need?" } */

import { useState, useEffect, useRef } from "react";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Plotly: any;
  }
}

// ── Constants ─────────────────────────────────────────────────────────────────

const NAVY = "#0C2340";
const MUTED = "#64748b";
const BORDER = "#e2e8f0";
const BASE = "/blog/pitching-metrics/charts";

// ── InfoTip ───────────────────────────────────────────────────────────────────

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

// ── Shared UI ─────────────────────────────────────────────────────────────────

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      fontSize: "0.65rem",
      fontWeight: 700,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color: "#BD3039",
      marginBottom: "0.6rem",
    }}
  >
    {children}
  </div>
);

const ChartNote = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      fontSize: "0.75rem",
      color: MUTED,
      marginTop: "0.4rem",
      lineHeight: 1.5,
    }}
  >
    {children}
  </div>
);

const P = ({ children }: { children: React.ReactNode }) => (
  <p
    style={{
      fontSize: "1rem",
      color: "#1e293b",
      lineHeight: 1.75,
      margin: "0 0 1.1rem 0",
    }}
  >
    {children}
  </p>
);

// ── Plotly chart ──────────────────────────────────────────────────────────────

const PlotlyChart = ({
  src,
  height = 480,
  plotlyReady,
  note,
}: {
  src: string;
  height?: number;
  plotlyReady: boolean;
  note?: string;
}) => {
  const divRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [figData, setFigData] = useState<any>(null);

  useEffect(() => {
    fetch(src)
      .then((r) => r.json())
      .then(setFigData);
  }, [src]);

  useEffect(() => {
    if (!plotlyReady || !figData || !divRef.current) return;
    window.Plotly.react(
      divRef.current,
      figData.data,
      {
        ...figData.layout,
        autosize: true,
        height,
        font: { family: "inherit" },
      },
      { responsive: true, displayModeBar: false },
    );
    const el = divRef.current;
    return () => {
      window.Plotly?.purge(el);
    };
  }, [plotlyReady, figData, height]);

  return (
    <div style={{ marginBottom: note ? "0.5rem" : "2rem" }}>
      {!figData && (
        <div
          style={{
            width: "100%",
            height,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: MUTED,
            fontSize: "0.9rem",
          }}
        >
          Loading chart...
        </div>
      )}
      <div ref={divRef} style={{ width: "100%" }} />
      {note && <ChartNote>{note}</ChartNote>}
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────────

export default function PitchingMetrics() {
  const [plotlyReady, setPlotlyReady] = useState(false);

  useEffect(() => {
    if (window.Plotly) {
      setPlotlyReady(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdn.plot.ly/plotly-2.35.2.min.js";
    script.onload = () => setPlotlyReady(true);
    document.head.appendChild(script);
  }, []);

  return (
    <div style={{ fontFamily: "inherit", maxWidth: "100%" }}>
      {/* ── AI disclaimer ───────────────────────────────────────────────── */}
      <p
        style={{
          fontSize: "0.72rem",
          color: "#94a3b8",
          margin: "0 0 2rem 0",
          lineHeight: 1.5,
        }}
      >
        Claude was used in data pipeline and chart code; the research questions,
        methodology decisions, and interpretation are mine.
      </p>

      {/* ── Table of contents ───────────────────────────────────────────── */}
      <nav
        style={{
          border: `1px solid ${BORDER}`,
          borderLeft: `4px solid ${NAVY}`,
          background: "#f8fafc",
          padding: "1rem 1.25rem",
          marginBottom: "2.5rem",
          borderRadius: "0 6px 6px 0",
        }}
      >
        <div
          style={{
            fontSize: "0.7rem",
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: MUTED,
            marginBottom: "0.6rem",
          }}
        >
          Contents
        </div>
        <ol
          style={{
            margin: 0,
            paddingLeft: "1.2rem",
            lineHeight: 2,
            fontSize: "0.93rem",
          }}
        >
          <li>
            <a
              href="#section-1"
              style={{ color: NAVY, textDecoration: "none" }}
            >
              Starters
            </a>
          </li>
          <li>
            <a
              href="#section-2"
              style={{ color: NAVY, textDecoration: "none" }}
            >
              Relievers
            </a>
          </li>
          <li>
            <a
              href="#section-3"
              style={{ color: NAVY, textDecoration: "none" }}
            >
              Postseason
            </a>
          </li>
          <li>
            <a
              href="#methodology"
              style={{ color: MUTED, textDecoration: "none" }}
            >
              Methodology
            </a>
          </li>
        </ol>
      </nav>

      {/* ── Intro ───────────────────────────────────────────────────────── */}
      <P>
        There are seemingly a million different pitching metrics used to
        evaluate pitchers. There are legacy metrics like ERA and WHIP that have
        been used for decades, and newer supposedly better metrics like FIP and
        SIERA. I was also reading that K-BB%, a simple two-parameter metric, is
        actually one of the best. I wanted to see how these different metrics
        correlate with forward-looking success, and I wanted to gain some
        familiarity with the free MLB APIs ahead of some other projects I have
        planned.
      </P>

      <P>
        One thing to note: I probably should have looked at RA9 as both a
        predictor and an outcome. ERA is a weird conditional metric that only
        counts earned runs, which get scored in strange ways sometimes. I'll
        leave that debate for another time. xFIP would have been easy to add
        too. That was an oversight.
      </P>

      <P>
        The metrics I evaluated: K-BB%
        <InfoTip tip="Strikeout rate minus walk rate. Measures the two outcomes a pitcher controls most directly." />
        , FIP
        <InfoTip tip="Fielding Independent Pitching: estimates ERA using only strikeouts, walks, hit batsmen, and home runs — outcomes a pitcher controls regardless of defense." />
        , ERA, wOBA
        <InfoTip tip="Weighted On-Base Average: a single number capturing total offensive value per plate appearance. Higher = worse for the pitcher." />
        , xwOBA
        <InfoTip tip="Expected wOBA: replaces actual hit outcomes with expected values based on exit velocity and launch angle. Removes luck on balls in play." />
        , SIERA
        <InfoTip tip="Skill-Interactive ERA: extends FIP by adding batted-ball profile (ground balls, fly balls, popups). Designed specifically to predict future ERA." />
        , K/9, BB/9, and WHIP. A solid mix of rate stats, run estimators, and
        contact-quality metrics.
      </P>

      <P>
        For outcomes I used ERA and wOBA allowed. ERA is the classic benchmark.
        wOBA captures what a pitcher is actually allowing on contact and should
        give a cleaner read than ERA alone.
      </P>

      <P>
        Data comes from Baseball Savant (Statcast) and the MLB StatsAPI,
        covering the 2021-2026 regular season. For each outing, trailing metrics
        are computed over rolling PA
        <InfoTip tip="Plate appearances: all times a batter completes an at-bat against this pitcher." />{" "}
        windows from 100 to 400 PA. R²
        <InfoTip tip="Coefficient of determination: fraction of variance in the outcome explained by the predictor. 0 = no predictive power, 1 = perfect prediction." />{" "}
        measures how much of the variance in future outcomes each trailing
        metric explains.
      </P>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 1. STARTERS
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="section-1" style={{ marginTop: "3rem" }}>
        <SectionLabel>Section 1</SectionLabel>
        <h2
          style={{
            fontSize: "1.5rem",
            fontWeight: 800,
            color: NAVY,
            marginBottom: "0.75rem",
            marginTop: 0,
          }}
        >
          Starters
        </h2>

        <P>
          Starters needed at least 400 PA of prior history to be included. The
          target is ERA and wOBA over the pitcher's next N starts (1, 3, 5, or
          10). The charts below show the focused next-3-starts view with all
          metrics overlaid. A higher line means better predictive power at that
          sample size.
        </P>

        <h3
          style={{
            fontSize: "1.05rem",
            fontWeight: 700,
            color: NAVY,
            marginTop: "2rem",
            marginBottom: "0.75rem",
          }}
        >
          Predicting future ERA
          <InfoTip tip="Earned Run Average: earned runs allowed per 9 innings. Lower is better for pitchers." />
        </h3>
        <PlotlyChart
          src={`${BASE}/sp_era_s3.json`}
          height={460}
          plotlyReady={plotlyReady}
          note="R² vs PA window. Target: ERA over the next 3 starts. Minimum 400 PA of prior history required. 80% CI shaded."
        />

        <h3
          style={{
            fontSize: "1.05rem",
            fontWeight: 700,
            color: NAVY,
            marginTop: "2rem",
            marginBottom: "0.75rem",
          }}
        >
          Predicting future wOBA
          <InfoTip tip="Weighted On-Base Average: a single number capturing total offensive value per plate appearance. Higher = worse for the pitcher." />{" "}
          allowed
        </h3>
        <PlotlyChart
          src={`${BASE}/sp_woba_s3.json`}
          height={460}
          plotlyReady={plotlyReady}
          note="R² values are lower for wOBA than ERA — future contact outcomes are harder to predict from past metrics."
        />

        <P>
          I was a little surprised how well SIERA did. My impression from
          reading articles and podcasts was that a simpler metric like K-BB%
          would be best, especially at smaller samples. It makes me wonder why
          SIERA is such a niche stat. Maybe the public is not ready for a metric
          derived from such a horrific looking equation. I was also surprised
          that K/9 and FIP basically tracked each other. I figured the added
          information of walks and home runs would be more useful. WHIP tracking
          so closely with ERA was interesting as well. My impression was that it
          was not that good of a stat. Maybe both ERA and WHIP are just
          lackluster metrics overall.
        </P>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 2. RELIEVERS
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="section-2" style={{ marginTop: "3.5rem" }}>
        <SectionLabel>Section 2</SectionLabel>
        <h2
          style={{
            fontSize: "1.5rem",
            fontWeight: 800,
            color: NAVY,
            marginBottom: "0.75rem",
            marginTop: 0,
          }}
        >
          Relievers
        </h2>

        <P>
          Relievers needed at least 200 PA of prior history. Instead of counting
          starts, the target is innings-accumulated: ERA and wOBA through the
          next 5, 10, or 20 innings pitched. Each panel in the charts below
          shows a different innings horizon.
        </P>

        <h3
          style={{
            fontSize: "1.05rem",
            fontWeight: 700,
            color: NAVY,
            marginTop: "2rem",
            marginBottom: "0.75rem",
          }}
        >
          Predicting future ERA
          <InfoTip tip="Earned Run Average: earned runs allowed per 9 innings." />
        </h3>
        <PlotlyChart
          src={`${BASE}/rp_era.json`}
          height={750}
          plotlyReady={plotlyReady}
          note="R² vs PA window. Target: ERA accumulated until the innings threshold is reached. Minimum 200 PA of prior history. 80% CI shaded."
        />

        <h3
          style={{
            fontSize: "1.05rem",
            fontWeight: 700,
            color: NAVY,
            marginTop: "2rem",
            marginBottom: "0.75rem",
          }}
        >
          Predicting future wOBA
          <InfoTip tip="Weighted On-Base Average allowed. Higher = worse for the pitcher." />{" "}
          allowed
        </h3>
        <PlotlyChart
          src={`${BASE}/rp_woba.json`}
          height={750}
          plotlyReady={plotlyReady}
        />

        <P>
          The story is mostly the same with relief pitchers. ERA for relievers
          really is not the best thing to look at since they often come into
          leverage situations with runners already on base. I'll leave relief
          pitching as a more open-ended question for future work. It certainly
          is a fun thought experiment.
        </P>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 3. POSTSEASON
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="section-3" style={{ marginTop: "3.5rem" }}>
        <SectionLabel>Section 3</SectionLabel>
        <h2
          style={{
            fontSize: "1.5rem",
            fontWeight: 800,
            color: NAVY,
            marginBottom: "0.75rem",
            marginTop: 0,
          }}
        >
          Postseason
        </h2>

        <P>
          For each pitcher who appeared in the postseason (2021-2025), trailing
          regular-season metrics are computed as of October 1 of that year.
          Minimum postseason sample: 25 PA for starters, 15 PA for relievers.
          The line charts show R² across different trailing window sizes. The
          bar charts show each metric at a fixed 200 PA window for a clean
          head-to-head comparison.
        </P>

        <h3
          style={{
            fontSize: "1.05rem",
            fontWeight: 700,
            color: NAVY,
            marginTop: "2rem",
            marginBottom: "0.75rem",
          }}
        >
          Predicting postseason ERA
          <InfoTip tip="Earned Run Average in the postseason (Wild Card through World Series)." />
        </h3>
        <PlotlyChart
          src={`${BASE}/post_era.json`}
          height={420}
          plotlyReady={plotlyReady}
          note="R² vs trailing PA window. Left = starters, right = relievers. 2021-2025 postseason."
        />
        <PlotlyChart
          src={`${BASE}/post_bar_era.json`}
          height={360}
          plotlyReady={plotlyReady}
          note="R² at 200 trailing PA. n ≈ 50-150 pitcher-years per role across 5 postseasons."
        />

        <h3
          style={{
            fontSize: "1.05rem",
            fontWeight: 700,
            color: NAVY,
            marginTop: "2rem",
            marginBottom: "0.75rem",
          }}
        >
          Predicting postseason wOBA
          <InfoTip tip="Weighted On-Base Average allowed in the postseason." />{" "}
          allowed
        </h3>
        <PlotlyChart
          src={`${BASE}/post_woba.json`}
          height={420}
          plotlyReady={plotlyReady}
          note="Same methodology as ERA charts above."
        />
        <PlotlyChart
          src={`${BASE}/post_bar_woba.json`}
          height={360}
          plotlyReady={plotlyReady}
        />

        <P>
          Really, the data here is so random and the samples so small. Many
          great analysts before me have tried to tackle the problem of
          predicting postseason success to no avail. The signal to noise ratio
          is simply too low to say anything concrete. But I do think it is
          interesting how xwOBA outperforms the other metrics for starting
          pitchers. There might be something there. Perhaps it is just grabbing
          noise, but maybe not. Something to think about.
        </P>
      </section>

      {/* ── Methodology ─────────────────────────────────────────────────── */}
      <section
        id="methodology"
        style={{
          marginTop: "3.5rem",
          paddingTop: "2rem",
          borderTop: `1px solid ${BORDER}`,
        }}
      >
        <SectionLabel>Methodology</SectionLabel>

        <div
          style={{ fontSize: "0.88rem", color: "#475569", lineHeight: 1.75 }}
        >
          <p
            style={{
              fontWeight: 700,
              color: NAVY,
              marginTop: "1.2rem",
              marginBottom: "0.3rem",
            }}
          >
            Data source
          </p>
          <p style={{ margin: 0 }}>
            Pitch-level data from Baseball Savant (Statcast) and per-game
            pitcher logs from the MLB StatsAPI. Regular season: 2021–2026.
            Postseason: 2021–2025, all rounds (Wild Card, Division Series, LCS,
            World Series).
          </p>

          <p
            style={{
              fontWeight: 700,
              color: NAVY,
              marginTop: "1.2rem",
              marginBottom: "0.3rem",
            }}
          >
            Role classification
          </p>
          <p style={{ margin: 0 }}>
            A pitcher is classified as a starter (SP) if their median plate
            appearances
            <InfoTip tip="Plate appearances (PA) = all times a batter completes an at-bat against this pitcher." />{" "}
            per outing is ≥ 15 across their entire sample; otherwise reliever
            (RP). The threshold of 15 PA corresponds to roughly 4–5 innings.
          </p>

          <p
            style={{
              fontWeight: 700,
              color: NAVY,
              marginTop: "1.2rem",
              marginBottom: "0.3rem",
            }}
          >
            Rolling window
          </p>
          <p style={{ margin: 0 }}>
            For each outing, we walk back through prior appearances accumulating
            PA until the window W is reached. The window is always strictly
            prior to the current outing — no look-ahead. Minimum prior history:
            400 PA for starters, 200 PA for relievers.
          </p>

          <p
            style={{
              fontWeight: 700,
              color: NAVY,
              marginTop: "1.2rem",
              marginBottom: "0.3rem",
            }}
          >
            Metrics
          </p>
          <p style={{ margin: 0 }}>
            K-BB%
            <InfoTip tip="Strikeout rate minus walk rate. Measures the two outcomes a pitcher controls most directly." />{" "}
            = (SO − BB) / PA. FIP
            <InfoTip tip="Fielding Independent Pitching: estimates ERA using only strikeouts, walks, hit batsmen, and home runs — the outcomes a pitcher controls regardless of defense behind them." />{" "}
            = (13·HR + 3·(BB+HBP) − 2·SO) / IP + 3.15. SIERA
            <InfoTip tip="Skill-Interactive ERA: extends FIP by adding batted-ball profile (ground balls, fly balls, popups). Designed specifically to predict future ERA." />{" "}
            per the Swartz formula. wOBA from Savant linear weights. xwOBA
            <InfoTip tip="Expected wOBA: replaces actual hit outcomes with the expected value based on exit velocity and launch angle. Removes luck on balls in play." />{" "}
            uses Savant's estimated_woba_using_speedangle for contact, and 0.700
            for walks and HBP. WHIP = (BB + H) / IP.
          </p>

          <p
            style={{
              fontWeight: 700,
              color: NAVY,
              marginTop: "1.2rem",
              marginBottom: "0.3rem",
            }}
          >
            Targets
          </p>
          <p style={{ margin: 0 }}>
            Starter targets: ERA and wOBA summed over the next 1, 3, 5, or 10
            outings after the current one. Observations where fewer than N
            outings remain are excluded from that specific target. Reliever
            targets: innings-accumulated — we step forward through subsequent
            appearances until the cumulative IP threshold (5, 10, or 20) is
            reached.
          </p>

          <p
            style={{
              fontWeight: 700,
              color: NAVY,
              marginTop: "1.2rem",
              marginBottom: "0.3rem",
            }}
          >
            Postseason study
          </p>
          <p style={{ margin: 0 }}>
            For each pitcher-year in the postseason, trailing regular-season
            metrics are computed from the last W PA before October 1 of that
            year. Postseason outcomes require a minimum of 25 PA for starters
            and 15 PA for relievers. Sample sizes are small (~50–150 per role
            across 5 years); results should be treated as exploratory.
          </p>

          <p
            style={{
              fontWeight: 700,
              color: NAVY,
              marginTop: "1.2rem",
              marginBottom: "0.3rem",
            }}
          >
            Statistics
          </p>
          <p style={{ margin: 0 }}>
            R²
            <InfoTip tip="Coefficient of determination: the fraction of variance in the outcome explained by the predictor. 0 = no predictive power, 1 = perfect prediction. R² = r² (Pearson correlation squared)." />{" "}
            = Pearson r². 80% confidence intervals via Fisher z-transform,
            squared back to R² scale. Computed only when n ≥ 30 observations are
            available.
          </p>
        </div>
      </section>
    </div>
  );
}
