# Bradford's Website — Claude Guide

## Project Structure

```
BradfordsWesbite/
├── project/                        # React frontend (Vite + Tailwind)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Homepage.tsx
│   │   │   ├── BlogList.tsx
│   │   │   ├── BlogPost.tsx
│   │   │   └── posts/              # One .tsx file per React blog post
│   │   └── App.tsx
│   └── public/
│       └── blog/
│           ├── posts.json          # Blog post registry — must be updated for every new post
│           ├── <slug>.md           # Markdown post content (for markdown-type posts)
│           └── <slug>/             # Data folder for React posts (JSON, images, etc.)
└── data-scripts/                   # Python analysis scripts, one folder per stats-based post
    └── <post-slug>/
        ├── fetch_*.py              # Data fetching scripts
        ├── analyze.py              # Analysis / correlation scripts
        ├── run.sh                  # Convenience runner
        ├── pyproject.toml
        └── output/                 # Generated JSON that gets copied to public/blog/<slug>/
```

---

## Creating a New Blog Post

### Step 1 — Data Analysis (stats-based posts only)

All data analysis lives in `data-scripts/<post-slug>/`. Use Python with `uv`.

- Create a new folder: `data-scripts/<post-slug>/`
- Add `pyproject.toml`, `fetch_*.py`, `analyze.py`, and `run.sh` following the pattern in `data-scripts/season-prediction/`
- Output analysis results as JSON files to `data-scripts/<post-slug>/output/`
- Copy the output JSON files to `project/public/blog/<post-slug>/` so the frontend can fetch them

### Step 2 — Create the post component or markdown file

**React post** (for interactive/data-driven posts):

- Create `project/src/components/posts/<slug>.tsx`
- The file must start with a metadata comment:
  ```tsx
  /* metadata: { "title": "...", "date": "YYYY-MM-DD", "slug": "...", "excerpt": "..." } */
  ```
- Export a default React component
- Fetch data from `/blog/<slug>/<file>.json` inside the component
- The root `<div>` of the component **must** use `style={{ fontFamily: "inherit", maxWidth: "100%" }}` — never set a fixed `maxWidth` or `margin: "0 auto"` on it; the `BlogPost` wrapper handles layout

**Markdown post** (for simple text posts):

- Create `project/public/blog/<slug>.md` with frontmatter:
  ```md
  ---
  title: "..."
  date: "YYYY-MM-DD"
  slug: "..."
  excerpt: "..."
  ---
  ```

### Step 3 — Register the post in posts.json

Add an entry to `project/public/blog/posts.json`. Posts are sorted newest-first — add at the top:

```json
{
  "title": "Post Title",
  "date": "YYYY-MM-DD",
  "slug": "post-slug",
  "excerpt": "One or two sentence summary shown in the blog list.",
  "type": "react"
}
```

`type` is either `"react"` or `"markdown"`. The homepage automatically picks up the first entry as the latest post.

---

## InfoTip — Required for Technical Terms

Any technical stat, metric, or domain-specific term that a college-educated non-expert would not immediately understand must have an `<InfoTip>` tooltip attached inline. The standard is: if someone who reads the news but does not follow baseball/statistics/ML would pause at the term, add an InfoTip.

**Examples from season-prediction:** run differential, Pythagorean win%, R², variance, remaining win%.

### InfoTip component pattern

Copy this component into any new React post:

```tsx
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
```

Usage inline in prose:

```tsx
<p>
  We looked at run differential
  <InfoTip tip="Runs scored minus runs allowed. A negative number means the team is being outscored." />
  across the full season.
</p>
```

---

## Narrative Style

Blog posts should be short. Readers have short attention spans — every sentence needs to earn its place.

**Rules:**

- **One idea per paragraph.** If a paragraph is doing two things, split it or cut one.
- **Lead with the interesting thing.** Don't warm up with context. Start with the finding, the tension, or the question. The season-prediction post opens with the record and run differention, not with background on Pythagorean win%.
- **Let the charts and data cards carry the numbers.** Prose should interpret and react, not restate what is already visible in a visualization.
- **Cut throat transitions.** "Now let's look at..." and "As you can see..." are filler. Just make the next point.
- **Target 3–5 short paragraphs of prose per major section.** If a section runs longer, look for sentences that restate something a chart already shows and delete them.
- **The methodology section does not count toward narrative length** — it is a reference appendix, not part of the reading experience.
- **Avoid using emdashes, they read weird**

---

## Methodology Section — Required for Stats-Based Posts

Any post that involves data analysis, correlations, statistical models, or quantitative claims must include a **Methodology** section at the bottom of the post. It should be visually separated with a top border and cover:

1. **Data Source** — where the data came from, what was fetched, date ranges, any exclusions
2. **Metrics** — exact definitions of every calculated metric used in the post
3. **Statistical Techniques** — what methods were used (e.g. Pearson r, OLS regression, binomial CI)
4. **Assumptions** — what simplifications were made, what the model does not account for

See `project/src/components/posts/season-prediction.tsx` (the `/* ── METHODOLOGY ── */` section near the bottom) for the reference implementation. Match that visual style: `SectionLabel`, sub-headers in navy bold, body in `#475569` at `0.88rem`.

The methodology section should be honest about limitations — what the model cannot explain, what was excluded, and where the numbers should not be over-interpreted.
