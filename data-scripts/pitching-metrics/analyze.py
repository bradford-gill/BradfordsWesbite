# Build outings → SP/RP experiments → correlations.
# Reads:  data/pitches.parquet, data/gamelogs.parquet
# Writes: data/outings.parquet, data/experiment_sp.parquet, data/experiment_rp.parquet
#         output/correlations_sp.json, output/correlations_rp.json

import json
from pathlib import Path

import numpy as np
import pandas as pd

DATA_DIR = Path(__file__).parent / "data"
OUT_DIR = Path(__file__).parent / "output"

WINDOWS = list(range(10, 401, 10))  # 40 windows, 10–400 TBF
MIN_HISTORY_SP = 400  # TBF of history required before an SP outing is scored
MIN_HISTORY_RP = 200  # TBF of history required before an RP outing is scored

SP_STARTS = [1, 3, 5, 10]  # next N starts
RP_INNINGS = [5, 10, 20]  # next N innings (accumulated across appearances)

COUNT_COLS = [
    "TBF",
    "SO",
    "BB",
    "HBP",
    "HR",
    "IP",
    "ER",
    "GB",
    "FB",
    "PU",
    "H",
    "woba_num",
    "woba_den",
    "xwoba_num",
]
METRICS = ["k_bb_pct", "fip", "era", "woba", "xwoba", "siera", "k9", "bb9", "whip"]

TARGETS_SP = [
    (f"{t}_s{n}", f"target_{t}_s{n}") for n in SP_STARTS for t in ["era", "woba"]
]
TARGETS_RP = [
    (f"{t}_{ip}ip", f"target_{t}_{ip}ip") for ip in RP_INNINGS for t in ["era", "woba"]
]


# ── Outings ───────────────────────────────────────────────────────────────────


def build_outings(pitches: pd.DataFrame, gamelogs: pd.DataFrame) -> pd.DataFrame:
    pas = pitches[pitches["woba_denom"] == 1].copy()

    is_walk = pas["events"] == "walk"
    is_hbp = pas["events"] == "hit_by_pitch"
    is_k = pas["events"].isin(["strikeout", "strikeout_double_play"])
    contact_xwoba = pas["estimated_woba_using_speedangle"].fillna(0)

    pas["xwoba_val"] = np.select(
        [is_walk, is_hbp, is_k],
        [0.700, 0.700, 0.0],  # matches Savant's stored woba_value for these events
        default=contact_xwoba,
    )

    hit_events = {"single", "double", "triple", "home_run"}

    savant_agg = (
        pas.groupby(["pitcher", "game_pk"])
        .agg(
            TBF=("woba_denom", "sum"),
            woba_num=("woba_value", "sum"),
            woba_den=("woba_denom", "sum"),
            xwoba_num=("xwoba_val", "sum"),
            H=("events", lambda x: x.isin(hit_events).sum()),
        )
        .reset_index()
        .rename(columns={"pitcher": "pitcher_id"})
    )

    bb = pitches[pitches["bb_type"].notna()].copy()
    bb_agg = (
        bb.groupby(["pitcher", "game_pk"])
        .agg(
            GB=("bb_type", lambda x: (x == "ground_ball").sum()),
            FB=("bb_type", lambda x: (x == "fly_ball").sum()),
            PU=("bb_type", lambda x: (x == "popup").sum()),
        )
        .reset_index()
        .rename(columns={"pitcher": "pitcher_id"})
    )

    savant = savant_agg.merge(bb_agg, on=["pitcher_id", "game_pk"], how="left")
    savant["pitcher_id"] = savant["pitcher_id"].astype(int)
    savant["game_pk"] = savant["game_pk"].astype(int)

    gl = gamelogs[gamelogs["IP"] > 0].copy()
    gl["pitcher_id"] = gl["pitcher_id"].astype(int)
    gl["game_pk"] = gl["game_pk"].astype(int)

    outings = gl.merge(savant, on=["pitcher_id", "game_pk"], how="inner")
    for col in ["GB", "FB", "PU"]:
        outings[col] = outings[col].fillna(0)

    outings = outings.sort_values(["pitcher_id", "game_date"]).reset_index(drop=True)
    return outings


def classify_roles(outings: pd.DataFrame) -> pd.DataFrame:
    median_tbf = outings.groupby("pitcher_id")["TBF"].median()
    outings = outings.copy()
    outings["role"] = outings["pitcher_id"].map(
        lambda p: "SP" if median_tbf.get(p, 0) >= 15 else "RP"
    )
    return outings


# ── Rolling windows ───────────────────────────────────────────────────────────


def window_slow(group: pd.DataFrame, w: int) -> list[dict]:
    """Reference O(n²) implementation. Used only for correctness assertion."""
    n = len(group)
    results = []
    for i in range(n):
        tbf_acc, idxs = 0, []
        for j in range(i - 1, -1, -1):
            tbf_acc += group.iloc[j]["TBF"]
            idxs.append(j)
            if tbf_acc >= w:
                break
        if not idxs or tbf_acc < w:
            results.append(None)
        else:
            results.append({c: group.iloc[idxs][c].sum() for c in COUNT_COLS})
    return results


def window_fast(group: pd.DataFrame, w: int) -> list[dict]:
    """cumsum + searchsorted. Must produce identical output to window_slow."""
    tbf = group["TBF"].values
    cum_tbf = np.concatenate([[0], np.cumsum(tbf)])
    n = len(group)
    vals = {c: group[c].values for c in COUNT_COLS}

    results = []
    for i in range(n):
        total_before = cum_tbf[i]
        if total_before < w:
            results.append(None)
            continue
        threshold = cum_tbf[i] - w
        start = int(np.searchsorted(cum_tbf[: i + 1], threshold, side="right")) - 1
        start = max(0, start)
        results.append({c: vals[c][start:i].sum() for c in COUNT_COLS})
    return results


def assert_windows_match(outings: pd.DataFrame, n_pitchers: int = 8) -> None:
    rng = np.random.default_rng(42)
    pids = rng.choice(outings["pitcher_id"].unique(), size=n_pitchers, replace=False)
    for pid in pids:
        g = outings[outings["pitcher_id"] == pid].reset_index(drop=True)
        for w in WINDOWS:
            slow, fast = window_slow(g, w), window_fast(g, w)
            assert len(slow) == len(fast)
            for i, (s, f) in enumerate(zip(slow, fast)):
                assert type(s) == type(f), f"pid={pid} w={w} i={i}: None mismatch"
                if s is None:
                    continue
                for c in COUNT_COLS:
                    diff = abs(float(s[c]) - float(f[c]))
                    assert (
                        diff < 1e-6
                    ), f"pid={pid} w={w} i={i} col={c}: {s[c]} != {f[c]}"
    print(f"Window assertion passed ({n_pitchers} pitchers × {len(WINDOWS)} windows).")


# ── Metrics ───────────────────────────────────────────────────────────────────


def compute_metrics(s: dict) -> dict:
    SO, BB, HBP, HR = s["SO"], s["BB"], s["HBP"], s["HR"]
    IP, ER, TBF = s["IP"], s["ER"], s["TBF"]
    GB, FB, PU = s["GB"], s["FB"], s["PU"]
    H = s["H"]
    wn, wd = s["woba_num"], s["woba_den"]
    xn = s["xwoba_num"]

    m = {}
    m["k_bb_pct"] = (SO - BB) / TBF if TBF > 0 else np.nan
    m["k9"] = SO * 9 / IP if IP > 0 else np.nan
    m["bb9"] = BB * 9 / IP if IP > 0 else np.nan
    m["era"] = ER * 9 / IP if IP > 0 else np.nan
    m["whip"] = (BB + H) / IP if IP > 0 else np.nan
    m["fip"] = (13 * HR + 3 * (BB + HBP) - 2 * SO) / IP + 3.15 if IP > 0 else np.nan
    m["woba"] = wn / wd if wd > 0 else np.nan
    m["xwoba"] = xn / wd if wd > 0 else np.nan

    if TBF > 0:
        kp = SO / TBF
        bbp = BB / TBF
        net_gb = GB - FB - PU
        ngbp = net_gb / TBF
        sign = -1 if net_gb > 0 else 1
        m["siera"] = (
            6.145
            - 16.986 * kp
            + 11.434 * bbp
            - 1.858 * ngbp
            + 7.653 * kp**2
            + sign * 6.664 * ngbp**2
            + 10.130 * kp * ngbp
            - 5.195 * bbp * ngbp
        )
    else:
        m["siera"] = np.nan

    return m


def _metric_row(win_data: dict, i: int) -> dict:
    row = {}
    for w in WINDOWS:
        sums = win_data[w][i]
        metrics = (
            compute_metrics(sums) if sums is not None else {m: np.nan for m in METRICS}
        )
        for metric, val in metrics.items():
            row[f"{metric}_w{w}"] = val
    return row


# ── SP experiment: next 1 / 3 / 5 / 10 starts ────────────────────────────────


def build_sp_experiment(outings: pd.DataFrame) -> pd.DataFrame:
    sp = outings[outings["role"] == "SP"].copy()
    rows = []
    for pid, group in sp.groupby("pitcher_id"):
        group = group.sort_values(["game_date", "game_pk"]).reset_index(drop=True)
        n = len(group)
        win_data = {w: window_fast(group, w) for w in WINDOWS}
        has_hist = [win_data[MIN_HISTORY_SP][i] is not None for i in range(n)]

        for i in range(n):
            if not has_hist[i]:
                continue

            row = {
                "pitcher_id": pid,
                "game_pk": group.loc[i, "game_pk"],
                "game_date": group.loc[i, "game_date"],
            }

            for ns in SP_STARTS:
                end = i + ns
                if end <= n:
                    wn = group.iloc[i:end]["woba_num"].sum()
                    wd = group.iloc[i:end]["woba_den"].sum()
                    er = group.iloc[i:end]["ER"].sum()
                    ip = group.iloc[i:end]["IP"].sum()
                    row[f"target_woba_s{ns}"] = wn / wd if wd > 0 else np.nan
                    row[f"target_era_s{ns}"] = er * 9 / ip if ip > 0 else np.nan
                else:
                    row[f"target_woba_s{ns}"] = np.nan
                    row[f"target_era_s{ns}"] = np.nan

            row.update(_metric_row(win_data, i))
            rows.append(row)

    return pd.DataFrame(rows)


# ── RP experiment: next 5 / 10 / 20 innings (accumulated) ────────────────────


def build_rp_experiment(outings: pd.DataFrame) -> pd.DataFrame:
    rp = outings[outings["role"] == "RP"].copy()
    rows = []
    for pid, group in rp.groupby("pitcher_id"):
        group = group.sort_values(["game_date", "game_pk"]).reset_index(drop=True)
        n = len(group)
        win_data = {w: window_fast(group, w) for w in WINDOWS}
        has_hist = [win_data[MIN_HISTORY_RP][i] is not None for i in range(n)]

        for i in range(n):
            if not has_hist[i]:
                continue

            row = {
                "pitcher_id": pid,
                "game_pk": group.loc[i, "game_pk"],
                "game_date": group.loc[i, "game_date"],
            }

            for target_ip in RP_INNINGS:
                acc_ip, acc_wn, acc_wd, acc_er = 0.0, 0.0, 0.0, 0.0
                found = False
                for j in range(i, n):
                    acc_ip += group.iloc[j]["IP"]
                    acc_wn += group.iloc[j]["woba_num"]
                    acc_wd += group.iloc[j]["woba_den"]
                    acc_er += group.iloc[j]["ER"]
                    if acc_ip >= target_ip:
                        row[f"target_woba_{target_ip}ip"] = (
                            acc_wn / acc_wd if acc_wd > 0 else np.nan
                        )
                        row[f"target_era_{target_ip}ip"] = acc_er * 9 / acc_ip
                        found = True
                        break
                if not found:
                    row[f"target_woba_{target_ip}ip"] = np.nan
                    row[f"target_era_{target_ip}ip"] = np.nan

            row.update(_metric_row(win_data, i))
            rows.append(row)

    return pd.DataFrame(rows)


# ── Correlations (returns R²) ─────────────────────────────────────────────────


def fisher_ci(r: float, n: int, z_crit: float = 1.282) -> tuple[float, float]:
    """80% CI on r via Fisher z-transform."""
    z = np.arctanh(np.clip(r, -0.9999, 0.9999))
    se = 1.0 / np.sqrt(n - 3)
    return float(np.tanh(z - z_crit * se)), float(np.tanh(z + z_crit * se))


def compute_correlations(exp: pd.DataFrame, targets: list) -> dict:
    """Returns R² (and r for sign) per target × metric × window."""
    results: dict = {key: {} for key, _ in targets}
    for key, target_col in targets:
        for metric in METRICS:
            results[key][metric] = {}
            for w in WINDOWS:
                col = f"{metric}_w{w}"
                if col not in exp.columns or target_col not in exp.columns:
                    continue
                v = exp[[col, target_col]].dropna()
                n = len(v)
                if n < 30:
                    results[key][metric][w] = None
                    continue
                r = float(np.corrcoef(v[col], v[target_col])[0, 1])
                r_sq = r**2
                ci_lo, ci_hi = fisher_ci(r, n)
                results[key][metric][w] = {
                    "r": round(r, 4),
                    "r_sq": round(r_sq, 4),
                    "ci_lo_r": round(ci_lo, 4),
                    "ci_hi_r": round(ci_hi, 4),
                    "n": n,
                }
    return results


# ── Print summary grid ────────────────────────────────────────────────────────


def print_grid(
    results: dict, target_key: str, display_windows: list[int] | None = None
) -> None:
    if display_windows is None:
        display_windows = [w for w in WINDOWS if w % 100 == 0]
    print(f"\n{'─'*60}\nTarget: {target_key}")
    print(f"{'metric':12s}" + "".join(f"{w:>8}" for w in display_windows))
    for metric in METRICS:
        vals = results[target_key].get(metric, {})
        cells = []
        for w in display_windows:
            entry = vals.get(w)
            cells.append(f"{entry['r_sq']:>8.4f}" if entry else f"{'N/A':>8}")
        print(f"{metric:12s}" + "".join(cells))


# ── Main ──────────────────────────────────────────────────────────────────────


def main():
    OUT_DIR.mkdir(exist_ok=True)

    print("Loading pitches and game logs...")
    pitches = pd.read_parquet(DATA_DIR / "pitches.parquet")
    gamelogs = pd.read_parquet(DATA_DIR / "gamelogs.parquet")

    # Outings — rebuild if H or role column missing
    outings_path = DATA_DIR / "outings.parquet"
    REQUIRED_OUTING_COLS = {"H", "role"}
    if outings_path.exists():
        outings = pd.read_parquet(outings_path)
        if not REQUIRED_OUTING_COLS.issubset(outings.columns):
            print("Outings stale — rebuilding...")
            outings = classify_roles(build_outings(pitches, gamelogs))
            outings.to_parquet(outings_path, index=False)
            print(f"{len(outings):,} outings → {outings_path}")
        else:
            print(f"Outings cached — {len(outings):,} rows")
    else:
        print("Building outings...")
        outings = classify_roles(build_outings(pitches, gamelogs))
        outings.to_parquet(outings_path, index=False)
        print(f"{len(outings):,} outings → {outings_path}")

    print("Asserting rolling window correctness...")
    assert_windows_match(outings)

    # SP experiment
    sp_path = DATA_DIR / "experiment_sp.parquet"
    REQUIRED_SP = {f"whip_w{WINDOWS[-1]}", "target_era_s10"}
    if sp_path.exists():
        sp_exp = pd.read_parquet(sp_path)
        if not REQUIRED_SP.issubset(sp_exp.columns):
            print("SP experiment stale — rebuilding...")
            sp_exp = build_sp_experiment(outings)
            sp_exp.to_parquet(sp_path, index=False)
            print(f"{len(sp_exp):,} SP rows → {sp_path}")
        else:
            print(f"SP experiment cached — {len(sp_exp):,} rows")
    else:
        print("Building SP experiment...")
        sp_exp = build_sp_experiment(outings)
        sp_exp.to_parquet(sp_path, index=False)
        print(f"{len(sp_exp):,} SP rows → {sp_path}")

    # RP experiment
    rp_path = DATA_DIR / "experiment_rp.parquet"
    REQUIRED_RP = {f"whip_w{WINDOWS[-1]}", "target_era_20ip"}
    if rp_path.exists():
        rp_exp = pd.read_parquet(rp_path)
        if not REQUIRED_RP.issubset(rp_exp.columns):
            print("RP experiment stale — rebuilding...")
            rp_exp = build_rp_experiment(outings)
            rp_exp.to_parquet(rp_path, index=False)
            print(f"{len(rp_exp):,} RP rows → {rp_path}")
        else:
            print(f"RP experiment cached — {len(rp_exp):,} rows")
    else:
        print("Building RP experiment...")
        rp_exp = build_rp_experiment(outings)
        rp_exp.to_parquet(rp_path, index=False)
        print(f"{len(rp_exp):,} RP rows → {rp_path}")

    # Correlations
    print("Computing correlations...")
    corr_sp = compute_correlations(sp_exp, TARGETS_SP)
    corr_rp = compute_correlations(rp_exp, TARGETS_RP)

    (OUT_DIR / "correlations_sp.json").write_text(json.dumps(corr_sp, indent=2))
    (OUT_DIR / "correlations_rp.json").write_text(json.dumps(corr_rp, indent=2))
    print("Saved correlations_sp.json and correlations_rp.json")

    for key, _ in TARGETS_SP:
        print_grid(corr_sp, key)
    for key, _ in TARGETS_RP:
        print_grid(corr_rp, key)


if __name__ == "__main__":
    main()
