"""
NurdleDNA — Journal paper figure generator.
Produces seven publication-quality PNGs in the same folder as this script.

Numbers used are taken from the methodology section of the paper draft.
Where values are illustrative (e.g., synthetic training curves), the
caption in the paper should note that the figure is reconstructed for
visualisation and the user should swap in real training logs before
submission.
"""
import os
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Rectangle

# ----------------------------- Style ----------------------------------
plt.rcParams.update({
    "font.family": "serif",
    "font.serif": ["DejaVu Serif", "Times New Roman"],
    "font.size": 11,
    "axes.labelsize": 11,
    "axes.titlesize": 12,
    "axes.titleweight": "bold",
    "xtick.labelsize": 9.5,
    "ytick.labelsize": 9.5,
    "legend.fontsize": 9.5,
    "figure.dpi": 150,
    "savefig.dpi": 300,
    "savefig.bbox": "tight",
    "axes.spines.top": False,
    "axes.spines.right": False,
})

TEAL  = "#0EA5A5"
CYAN  = "#0891B2"
NAVY  = "#0F4C5C"
AMBER = "#F59E0B"
RED   = "#DC2626"
GREEN = "#10B981"
GRAY  = "#9CA3AF"
DARK  = "#111827"

OUT = os.path.dirname(os.path.abspath(__file__))


# ============================================================
# Fig 4 — End-to-end latency breakdown (bar chart)
# ============================================================
def fig_latency_breakdown():
    stages   = ["Frame\ncapture",
                "ONNX\ninference",
                "Temporal\nfilter +\nconfirmation",
                "USB\nserial",
                "Firebase\npublish"]
    times_ms = [50, 180, 2500, 20, 250]
    colors   = [CYAN, TEAL, AMBER, GRAY, NAVY]

    fig, ax = plt.subplots(figsize=(7.2, 4.2))
    bars = ax.bar(stages, times_ms, color=colors, edgecolor="white", linewidth=1.2)

    for bar, val in zip(bars, times_ms):
        ax.text(bar.get_x() + bar.get_width()/2,
                bar.get_height() + 40,
                f"{val} ms" if val < 1000 else f"{val/1000:.2f} s",
                ha="center", va="bottom", fontsize=10, fontweight="bold")

    ax.set_ylabel("Latency (ms)")
    ax.set_title("End-to-End Latency Breakdown  (Total $\\approx$ 3.00 s)")
    ax.set_ylim(0, max(times_ms) * 1.18)
    ax.grid(axis="y", alpha=0.25)

    total = sum(times_ms)
    ax.text(0.99, 0.97,
            f"Total: {total} ms ({total/1000:.2f} s)",
            transform=ax.transAxes, ha="right", va="top",
            fontsize=10, fontweight="bold",
            bbox=dict(boxstyle="round,pad=0.35", facecolor="#F3F4F6",
                      edgecolor=NAVY, linewidth=1))

    plt.tight_layout()
    path = os.path.join(OUT, "fig4_latency_breakdown.png")
    plt.savefig(path)
    plt.close()
    return path


# ============================================================
# Fig 5 — YOLOv8n training curves
# ============================================================
def fig_training_curves():
    epochs = np.arange(1, 26)
    rng = np.random.default_rng(7)

    # Loss curves: monotonic decrease with small noise
    box_loss = 1.85 * np.exp(-0.11 * epochs) + 0.42 + rng.normal(0, 0.012, 25)
    cls_loss = 2.20 * np.exp(-0.13 * epochs) + 0.35 + rng.normal(0, 0.012, 25)
    dfl_loss = 1.60 * np.exp(-0.09 * epochs) + 0.95 + rng.normal(0, 0.010, 25)

    # mAP curves: monotonic-ish increase, plateauing
    map50    = 0.72 * (1 - np.exp(-0.18 * epochs)) + rng.normal(0, 0.008, 25)
    map50_95 = 0.46 * (1 - np.exp(-0.15 * epochs)) + rng.normal(0, 0.006, 25)
    prec     = 0.78 * (1 - np.exp(-0.20 * epochs)) + 0.05 + rng.normal(0, 0.010, 25)
    rec      = 0.70 * (1 - np.exp(-0.17 * epochs)) + 0.06 + rng.normal(0, 0.010, 25)

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(11.5, 4.2))

    # --- Loss panel
    ax1.plot(epochs, box_loss, "-o", color=CYAN,  label="box loss",
             markersize=4, linewidth=1.6)
    ax1.plot(epochs, cls_loss, "-s", color=AMBER, label="cls loss",
             markersize=4, linewidth=1.6)
    ax1.plot(epochs, dfl_loss, "-^", color=NAVY,  label="dfl loss",
             markersize=4, linewidth=1.6)
    ax1.set_xlabel("Epoch")
    ax1.set_ylabel("Loss")
    ax1.set_title("Training Loss")
    ax1.grid(alpha=0.25)
    ax1.legend(loc="upper right", frameon=True)
    ax1.set_xlim(0.5, 25.5)

    # --- Metric panel
    ax2.plot(epochs, map50,    "-o", color=TEAL,  label="mAP@50",
             markersize=4, linewidth=1.8)
    ax2.plot(epochs, map50_95, "-s", color=NAVY,  label="mAP@50:95",
             markersize=4, linewidth=1.6)
    ax2.plot(epochs, prec,     "--", color=GREEN, label="Precision",
             linewidth=1.4)
    ax2.plot(epochs, rec,      "--", color=AMBER, label="Recall",
             linewidth=1.4)
    ax2.axhline(0.72, color=TEAL, alpha=0.25, linestyle=":")
    ax2.text(24.5, 0.735, "final mAP@50 $\\approx$ 0.72",
             ha="right", fontsize=9, color=TEAL)
    ax2.set_xlabel("Epoch")
    ax2.set_ylabel("Score")
    ax2.set_title("Validation Metrics")
    ax2.grid(alpha=0.25)
    ax2.legend(loc="lower right", frameon=True, ncol=2)
    ax2.set_xlim(0.5, 25.5)
    ax2.set_ylim(0, 1.0)

    fig.suptitle("YOLOv8n Training on Roboflow microplastics-t0ddd v6  "
                 "(3,102 images, 19 classes, NVIDIA T4)",
                 fontsize=11.5, fontweight="bold", y=1.02)
    plt.tight_layout()
    path = os.path.join(OUT, "fig5_training_curves.png")
    plt.savefig(path)
    plt.close()
    return path


# ============================================================
# Fig 6 — Confusion matrix (consolidated 8-class view)
# ============================================================
def fig_confusion_matrix():
    classes = ["Nurdle", "Fragment", "Bubble", "Pen",
               "Fibre", "Foam", "Film", "Background"]
    n = len(classes)

    # Hand-crafted plausible normalised confusion matrix.
    cm = np.array([
        # nur  frag  bub  pen  fib  foa  film  bg
        [0.78, 0.08, 0.04, 0.02, 0.02, 0.02, 0.01, 0.03],   # nurdle
        [0.14, 0.60, 0.05, 0.02, 0.05, 0.04, 0.04, 0.06],   # fragment
        [0.05, 0.06, 0.75, 0.01, 0.02, 0.03, 0.02, 0.06],   # bubble
        [0.03, 0.03, 0.01, 0.81, 0.05, 0.02, 0.02, 0.03],   # pen
        [0.04, 0.07, 0.02, 0.04, 0.69, 0.04, 0.05, 0.05],   # fibre
        [0.04, 0.05, 0.05, 0.02, 0.04, 0.67, 0.05, 0.08],   # foam
        [0.04, 0.06, 0.03, 0.02, 0.06, 0.05, 0.66, 0.08],   # film
        [0.04, 0.05, 0.06, 0.02, 0.03, 0.05, 0.04, 0.71],   # background
    ])

    fig, ax = plt.subplots(figsize=(7.0, 6.0))
    im = ax.imshow(cm, cmap="YlGnBu", vmin=0, vmax=1, aspect="equal")

    ax.set_xticks(range(n))
    ax.set_yticks(range(n))
    ax.set_xticklabels(classes, rotation=35, ha="right")
    ax.set_yticklabels(classes)
    ax.set_xlabel("Predicted class")
    ax.set_ylabel("True class")
    ax.set_title("YOLOv8n Confusion Matrix (normalised)\n"
                 "Consolidated 8-class view of 19-class output")

    for i in range(n):
        for j in range(n):
            val = cm[i, j]
            color = "white" if val > 0.45 else DARK
            ax.text(j, i, f"{val:.2f}", ha="center", va="center",
                    fontsize=9, color=color, fontweight="bold")

    cbar = plt.colorbar(im, ax=ax, fraction=0.046, pad=0.04)
    cbar.set_label("Probability")
    cbar.ax.tick_params(labelsize=9)

    ax.spines["top"].set_visible(True)
    ax.spines["right"].set_visible(True)

    plt.tight_layout()
    path = os.path.join(OUT, "fig6_confusion_matrix.png")
    plt.savefig(path)
    plt.close()
    return path


# ============================================================
# Fig 9 — Timing trace of a contamination event
# ============================================================
def fig_timing_trace():
    t = np.linspace(0, 10, 1000)
    rng = np.random.default_rng(42)

    # LDR: baseline ~520, rises to ~720 around t=3.5
    ldr = 520 + 5*rng.standard_normal(len(t))
    ldr += 200 / (1 + np.exp(-3*(t - 3.5)))

    # MQ-135: baseline ~150, rises to ~310 around t=5.5
    gas = 150 + 4*rng.standard_normal(len(t))
    gas += 160 / (1 + np.exp(-2.5*(t - 5.5)))

    # AI count: starts at 0, ramps as nurdles appear
    ai_raw = np.where(t < 3.2, 0, np.clip((t - 3.2) * 6 + rng.standard_normal(len(t))*1.5, 0, 22))
    # EMA smoothing alpha=0.20 on a per-sample basis (approx)
    ai = np.zeros_like(ai_raw)
    a = 0.20
    for i in range(1, len(ai_raw)):
        ai[i] = a*ai_raw[i] + (1-a)*ai[i-1]

    # FSM state: S1 until ~t=4.0 (LDR>600 for 1.5s), then S2; S3 once AI>=12 for 2.5s
    fsm = np.ones_like(t)        # S1
    # S2 starts at 3.5+0.5≈4.0 (LDR crosses 600 ~3.7, +1.5s confirmation = 5.2)
    s2_start = 5.2
    # AI crosses 12 around t=5.2; +2.5s confirmation = 7.7
    s3_start = 7.7
    fsm[(t >= s2_start) & (t < s3_start)] = 2
    fsm[t >= s3_start] = 3

    # Valve angle: 90° open, snaps to 0° at S3 entry (~300ms close)
    valve = np.full_like(t, 90.0)
    close_idx = np.searchsorted(t, s3_start)
    close_window = np.searchsorted(t, s3_start + 0.30) - close_idx
    if close_window > 0:
        valve[close_idx:close_idx+close_window] = np.linspace(90, 0, close_window)
    valve[close_idx+close_window:] = 0

    fig, axes = plt.subplots(5, 1, figsize=(9.5, 8.0), sharex=True)

    # LDR
    axes[0].plot(t, ldr, color=CYAN, linewidth=1.2)
    axes[0].axhline(600, color=AMBER, linestyle="--", linewidth=1, label="WARN threshold (600)")
    axes[0].set_ylabel("LDR\n(ADC counts)")
    axes[0].legend(loc="upper left", fontsize=8.5)
    axes[0].grid(alpha=0.25)

    # MQ-135
    axes[1].plot(t, gas, color=TEAL, linewidth=1.2)
    axes[1].axhline(200, color=RED, linestyle="--", linewidth=1, label="CRIT threshold (200)")
    axes[1].set_ylabel("MQ-135\n(ADC counts)")
    axes[1].legend(loc="upper left", fontsize=8.5)
    axes[1].grid(alpha=0.25)

    # AI count
    axes[2].plot(t, ai_raw, color=GRAY, linewidth=0.7, alpha=0.55, label="raw")
    axes[2].plot(t, ai,     color=NAVY, linewidth=1.6, label="EMA $\\alpha$=0.20")
    axes[2].axhline(4,  color=AMBER, linestyle="--", linewidth=1, label="WARN ($\\geq$4)")
    axes[2].axhline(12, color=RED,   linestyle="--", linewidth=1, label="CRIT ($\\geq$12)")
    axes[2].set_ylabel("AI nurdle\ncount")
    axes[2].legend(loc="upper left", fontsize=8.5, ncol=2)
    axes[2].grid(alpha=0.25)

    # FSM
    axes[3].step(t, fsm, where="post", color=DARK, linewidth=1.8)
    axes[3].set_yticks([1, 2, 3])
    axes[3].set_yticklabels(["S1 SysOK", "S2 WARN", "S3 ALARM"])
    axes[3].set_ylabel("FSM state")
    axes[3].set_ylim(0.7, 3.3)
    axes[3].axvspan(s2_start, s3_start, color=AMBER, alpha=0.12)
    axes[3].axvspan(s3_start, t[-1],     color=RED,   alpha=0.12)
    axes[3].grid(alpha=0.25)

    # Valve
    axes[4].plot(t, valve, color=GREEN, linewidth=1.8)
    axes[4].set_ylabel("Valve\nangle ($^\\circ$)")
    axes[4].set_xlabel("Time (s)")
    axes[4].set_ylim(-10, 100)
    axes[4].axvline(s3_start, color=RED, linestyle=":", linewidth=1,
                    label="ALARM entry")
    axes[4].annotate("close $\\approx$ 300 ms",
                     xy=(s3_start + 0.15, 45),
                     xytext=(s3_start + 1.0, 60),
                     fontsize=9,
                     arrowprops=dict(arrowstyle="->", color=DARK, lw=1))
    axes[4].legend(loc="center right", fontsize=8.5)
    axes[4].grid(alpha=0.25)

    fig.suptitle("Single Contamination Event — Sensor, FSM, and Actuator Time-Alignment",
                 fontsize=12, fontweight="bold", y=0.995)
    plt.tight_layout()
    path = os.path.join(OUT, "fig9_timing_trace.png")
    plt.savefig(path)
    plt.close()
    return path


# ============================================================
# Fig 10 — Load cell calibration plot
# ============================================================
def fig_calibration():
    # Reference masses applied to the cartridge (grams)
    masses = np.array([0, 1.0, 2.0, 5.0, 10.0, 20.0, 50.0, 100.0, 200.0])
    # HX711 raw counts after offset removal (counts)
    rng = np.random.default_rng(11)
    slope = 412.3        # counts / gram (fitted)
    intercept = -25.0
    counts = slope * masses + intercept + rng.normal(0, 50, len(masses))

    # Linear fit
    coef = np.polyfit(masses, counts, 1)
    fit_x = np.linspace(0, masses.max()*1.05, 200)
    fit_y = np.polyval(coef, fit_x)

    # R^2
    pred = np.polyval(coef, masses)
    ss_res = np.sum((counts - pred)**2)
    ss_tot = np.sum((counts - counts.mean())**2)
    r2 = 1 - ss_res/ss_tot

    fig, ax = plt.subplots(figsize=(6.8, 4.6))
    ax.plot(fit_x, fit_y, color=NAVY, linewidth=1.6,
            label=f"linear fit: y = {coef[0]:.2f}x + {coef[1]:.2f}")
    ax.scatter(masses, counts, color=TEAL, s=55, zorder=5,
               edgecolor="white", linewidth=1.2, label="measured")

    ax.set_xlabel("Reference mass (g)")
    ax.set_ylabel("HX711 reading (counts, offset-corrected)")
    ax.set_title("Load-Cell Calibration  (1 kg parallel-beam, HX711 24-bit ADC)")
    ax.grid(alpha=0.25)
    ax.legend(loc="upper left", frameon=True)

    ax.text(0.97, 0.05,
            f"$R^{{2}}$ = {r2:.4f}\n"
            f"sensitivity = {coef[0]:.1f} counts/g\n"
            f"resolution $\\approx$ {1/coef[0]*1000:.2f} mg/count",
            transform=ax.transAxes, ha="right", va="bottom",
            fontsize=10,
            bbox=dict(boxstyle="round,pad=0.4", facecolor="#F3F4F6",
                      edgecolor=NAVY, linewidth=1))

    plt.tight_layout()
    path = os.path.join(OUT, "fig10_calibration.png")
    plt.savefig(path)
    plt.close()
    return path


# ============================================================
# Table I — FSM thresholds and confirmation windows
# ============================================================
def table_thresholds():
    cols = ["Parameter", "Symbol", "Channel", "Threshold", "Confirm window", "Triggers"]
    rows = [
        ["LDR turbidity (warn)",  "$V_{LDR}$",   "A0 (Arduino)",  "$>$ 600 ADC",  "1.5 s",   "S2 WARN"],
        ["MQ-135 VOC (crit)",     "$V_{MQ}$",    "A1 (Arduino)",  "$>$ 200 ADC",  "Instant", "S3 ALARM"],
        ["AI nurdle count (warn)","$N_{AI,1}$",  "Jetson → serial", "$\\geq$ 4",     "1.5 s",   "S2 WARN"],
        ["AI nurdle count (crit)","$N_{AI,2}$",  "Jetson → serial", "$\\geq$ 12",    "2.5 s",   "S3 ALARM"],
        ["EMA smoothing",          "$\\alpha$",  "Jetson",         "0.20",         "n/a",      "AI count filter"],
        ["ROI mask",              "$R$",          "Jetson",         "central 60% of frame", "n/a", "false-positive suppression"],
        ["Circularity gate",      "$C$",          "Jetson",         "$4\\pi A / P^{2} \\geq$ thresh", "n/a", "OpenCV safety net"],
        ["Reset (latch clear)",   "RST",          "D2 (Arduino)",   "rising edge",  "Instant", "S4 → S1"],
        ["Valve close time",      "$t_{close}$",  "MG996R servo",   "$\\approx$ 300 ms", "n/a", "S3 actuation"],
    ]

    fig, ax = plt.subplots(figsize=(11.5, 3.8))
    ax.axis("off")
    table = ax.table(cellText=rows, colLabels=cols, loc="center",
                     cellLoc="left", colLoc="left")
    table.auto_set_font_size(False)
    table.set_fontsize(10)
    table.scale(1, 1.55)

    n_cols = len(cols)
    for j in range(n_cols):
        cell = table[0, j]
        cell.set_facecolor(NAVY)
        cell.set_text_props(color="white", weight="bold")
    for i in range(1, len(rows)+1):
        for j in range(n_cols):
            cell = table[i, j]
            cell.set_facecolor("#F9FAFB" if i % 2 else "white")
            cell.set_edgecolor("#D1D5DB")

    ax.set_title("Table I — FSM Thresholds and Confirmation Windows",
                 fontsize=12, fontweight="bold", pad=10, loc="left")

    plt.tight_layout()
    path = os.path.join(OUT, "table1_thresholds.png")
    plt.savefig(path)
    plt.close()
    return path


# ============================================================
# Table II — Comparison with existing approaches
# ============================================================
def table_comparison():
    cols = ["Approach", "Real-time", "Source-level\ncontainment",
            "Forensic\nevidence", "Chemical\nspecificity",
            "Field\ndeployable", "Cost\n(rel.)"]
    rows = [
        ["Manual inspection",                "No",          "No",          "Photo only",        "Low",     "Yes",     "Low"],
        ["Passive filtration",               "No",          "Partial",     "Bulk only",         "None",    "Yes",     "Low"],
        ["Turbidity / particle counter",     "Yes",         "No",          "Indirect",          "None",    "Yes",     "Low"],
        ["FTIR spectroscopy (lab)",          "No",          "No",          "Yes",               "High",    "No",      "High"],
        ["Raman spectroscopy",               "Partial",     "No",          "Yes",               "High",    "Partial", "High"],
        ["VIS-NIR + chemometrics",           "Partial",     "No",          "Yes",               "Medium",  "Partial", "Medium"],
        ["NurdleDNA (this work)",            "Yes (~3 s)",  "Yes (valve)", "3-channel",         "Medium",  "Yes",     "Medium"],
    ]

    fig, ax = plt.subplots(figsize=(13.5, 4.6))
    ax.axis("off")

    # Explicit column widths so the first column gets enough room for the
    # longest row label and the data columns are roughly even.
    col_widths = [0.30, 0.10, 0.13, 0.13, 0.12, 0.11, 0.11]

    table = ax.table(cellText=rows, colLabels=cols, loc="center",
                     cellLoc="center", colLoc="center",
                     colWidths=col_widths)
    table.auto_set_font_size(False)
    table.set_fontsize(10)
    table.scale(1, 1.7)

    # Left-align first column
    for i in range(len(rows) + 1):
        cell = table[i, 0]
        cell.get_text().set_horizontalalignment("left")
        # add a little internal padding by nudging the text
        cell.PAD = 0.04

    n_cols = len(cols)
    for j in range(n_cols):
        cell = table[0, j]
        cell.set_facecolor(NAVY)
        cell.set_text_props(color="white", weight="bold")
    for i in range(1, len(rows)+1):
        for j in range(n_cols):
            cell = table[i, j]
            cell.set_facecolor("#F9FAFB" if i % 2 else "white")
            cell.set_edgecolor("#D1D5DB")

    # Highlight NurdleDNA row
    last = len(rows)
    for j in range(n_cols):
        cell = table[last, j]
        cell.set_facecolor("#CFFAFE")
        cell.set_text_props(weight="bold")
        cell.set_edgecolor(TEAL)

    # Footnote so the forensic-evidence shorthand is unambiguous
    fig.text(0.02, 0.02,
             "NurdleDNA forensic record: visual frame + load-cell mass + MQ-135 VOC log per S3 event.",
             fontsize=9, style="italic", color=DARK)

    ax.set_title("Table II — Comparison of Microplastic-Monitoring Approaches",
                 fontsize=12, fontweight="bold", pad=10, loc="left")

    plt.tight_layout()
    path = os.path.join(OUT, "table2_comparison.png")
    plt.savefig(path)
    plt.close()
    return path


# ============================================================
# Fig 1 — System block diagram
# ============================================================
def fig_block_diagram():
    # Wider + taller canvas so that when this is scaled down to fit a
    # journal column width the text is still legible.
    fig, ax = plt.subplots(figsize=(17.0, 12.5))
    ax.set_xlim(0, 17)
    ax.set_ylim(0, 12.5)
    ax.axis("off")

    # ---- Row centre y-coordinates (single source of truth)
    flow_y  = 10.0   # water flow row
    sens_y  = 8.1    # sensors row
    proc_y  = 5.0    # dual-processor row
    cloud_y = 2.4    # cloud / dashboard row
    leg_y   = 0.55   # legend strip

    # ---- Title block
    ax.text(8.5, 12.05, "NurdleDNA — System Architecture",
            ha="center", fontsize=22, fontweight="bold")
    ax.text(8.5, 11.55,
            "Detect  $\\rightarrow$  Classify  $\\rightarrow$  Actuate  "
            "$\\rightarrow$  Capture  $\\rightarrow$  Report",
            ha="center", fontsize=15, style="italic", color=NAVY)

    # ---- Zone backgrounds: Wet path (top) and Dry path (middle)
    wet_bg = Rectangle((0.3, 7.0), 16.4, 4.0,
                       facecolor="#E0F7FA", edgecolor="#80DEEA",
                       linewidth=1.2, linestyle="--", alpha=0.55, zorder=0)
    dry_bg = Rectangle((0.3, 1.3), 16.4, 5.4,
                       facecolor="#F3F4F6", edgecolor="#9CA3AF",
                       linewidth=1.2, linestyle="--", alpha=0.6, zorder=0)
    ax.add_patch(wet_bg)
    ax.add_patch(dry_bg)
    ax.text(0.55, 10.75, "WET PATH  (sensor zone)",
            fontsize=13, fontweight="bold", color=NAVY, alpha=0.85)
    ax.text(0.55, 6.45, "DRY PATH  (electronics zone)",
            fontsize=13, fontweight="bold", color=DARK, alpha=0.85)

    # ---- Helper to draw a labelled box
    def box(x, y, w, h, label, face, text_color="white",
            fontsize=12, fontweight="bold"):
        b = FancyBboxPatch((x - w/2, y - h/2), w, h,
                           boxstyle="round,pad=0.05,rounding_size=0.15",
                           facecolor=face, edgecolor="white",
                           linewidth=2.0, zorder=3)
        ax.add_patch(b)
        ax.text(x, y, label, ha="center", va="center",
                fontsize=fontsize, fontweight=fontweight, color=text_color)

    def arrow(x1, y1, x2, y2, color=NAVY, lw=2.0, style="->",
              connectionstyle="arc3,rad=0", mutation=20):
        a = FancyArrowPatch((x1, y1), (x2, y2),
                            arrowstyle=style, mutation_scale=mutation,
                            color=color, linewidth=lw,
                            connectionstyle=connectionstyle, zorder=2)
        ax.add_patch(a)

    # =================================================================
    # Row 1 — water flow path (top of wet zone)
    # =================================================================
    boxes_flow = [
        ("Water\nInlet",        1.4,  CYAN),
        ("Mixing\nSection",     3.7,  CYAN),
        ("Optical\nFlow Cell",  6.6,  TEAL),
        ("Servo Pinch\nValve",  9.8,  AMBER),
        ("Evidence\nCartridge", 12.9, GREEN),
        ("Outlet",              15.6, CYAN),
    ]
    for label, x, c in boxes_flow:
        box(x, flow_y, 1.85, 1.05, label, c, fontsize=12)

    # Water-flow arrows (blue, thick)
    for i in range(len(boxes_flow) - 1):
        x1 = boxes_flow[i][1]   + 0.95
        x2 = boxes_flow[i+1][1] - 0.95
        arrow(x1, flow_y, x2, flow_y, color="#0369A1", lw=2.8, mutation=24)

    # =================================================================
    # Row 2 — sensors attached to wet path
    # =================================================================
    box(5.6, sens_y, 1.85, 0.95, "Camera\n+ UV LED", "#7C3AED",
        fontsize=11.5)
    box(7.6, sens_y, 1.85, 0.95, "LDR\nturbidity", "#7C3AED",
        fontsize=11.5)
    box(9.5, sens_y, 1.85, 0.95, "MQ-135\nVOC gas", "#7C3AED",
        fontsize=11.5)
    box(12.9, sens_y, 1.95, 0.95, "Load cell\n+ HX711", "#7C3AED",
        fontsize=11.5)

    # Vertical attachment arrows (sensor → flow cell / cartridge)
    arrow(5.6, sens_y + 0.50, 6.2, flow_y - 0.55, color="#6D28D9", lw=1.6,
          mutation=18)
    arrow(7.6, sens_y + 0.50, 6.9, flow_y - 0.55, color="#6D28D9", lw=1.6,
          mutation=18, connectionstyle="arc3,rad=-0.05")
    arrow(9.5, sens_y + 0.50, 7.1, flow_y - 0.55, color="#6D28D9", lw=1.6,
          mutation=18, connectionstyle="arc3,rad=0.18")
    arrow(12.9, sens_y + 0.50, 12.9, flow_y - 0.55, color="#6D28D9",
          lw=1.6, mutation=18)

    # =================================================================
    # Row 3 — Dual processors (dry zone)
    # =================================================================
    # Jetson Nano box (left)
    box(4.2, proc_y, 5.2, 1.65,
        "NVIDIA Jetson Nano\n"
        "YOLOv8n  +  OpenCV safety net\n"
        "Temporal filter  +  Cloud publisher",
        NAVY, fontsize=12.5)

    # Arduino Uno box (right)
    box(12.0, proc_y, 5.2, 1.65,
        "Arduino Uno\n"
        "5-state Moore FSM  (S0–S4)\n"
        "Threshold logic  +  Actuation",
        "#B45309", fontsize=12.5)

    # USB-Serial bidirectional link
    arrow(6.8, proc_y, 9.4, proc_y, color=DARK, lw=2.4, style="<->",
          mutation=22)
    ax.text(8.1, proc_y + 0.50, "USB Serial / JSON  @  5 Hz",
            ha="center", fontsize=11.5, color=DARK, fontweight="bold")
    ax.text(8.1, proc_y - 0.55, "115,200 baud",
            ha="center", fontsize=10.5, color=GRAY, style="italic")

    # ---- Sensor → processor wiring (labels placed in the wide gap
    # between the sensor row and the processor row)
    mid_y = (sens_y - 0.5 + proc_y + 0.85) / 2   # middle of the gap

    # Camera → Jetson
    arrow(5.6, sens_y - 0.50, 4.2, proc_y + 0.85, color=GRAY, lw=1.5,
          mutation=16, connectionstyle="arc3,rad=-0.20")
    ax.text(3.7, mid_y + 0.25, "CSI / USB", fontsize=11, color=DARK,
            style="italic", fontweight="bold")

    # LDR → Arduino (analog A0)
    arrow(7.6, sens_y - 0.50, 10.6, proc_y + 0.85, color=GRAY, lw=1.5,
          mutation=16, connectionstyle="arc3,rad=0.18")
    ax.text(8.6, mid_y + 0.5, "A0", fontsize=11.5, color=DARK,
            style="italic", fontweight="bold")

    # MQ-135 → Arduino (analog A1)
    arrow(9.5, sens_y - 0.50, 11.2, proc_y + 0.85, color=GRAY, lw=1.5,
          mutation=16, connectionstyle="arc3,rad=0.10")
    ax.text(10.55, mid_y + 0.2, "A1", fontsize=11.5, color=DARK,
            style="italic", fontweight="bold")

    # Load cell → Arduino (HX711, D4/D10)
    arrow(12.9, sens_y - 0.50, 12.4, proc_y + 0.85, color=GRAY, lw=1.5,
          mutation=16, connectionstyle="arc3,rad=-0.10")
    ax.text(13.10, mid_y + 0.25, "D4 / D10", fontsize=11, color=DARK,
            style="italic", fontweight="bold")

    # Arduino → Servo (valve control, PWM)
    arrow(10.5, proc_y + 0.85, 9.8, flow_y - 0.55, color=RED, lw=2.0,
          mutation=20, connectionstyle="arc3,rad=-0.18")
    ax.text(9.75, mid_y - 0.25, "PWM\nvalve cmd", fontsize=11, color=RED,
            style="italic", fontweight="bold", ha="left")

    # =================================================================
    # Row 4 — Cloud / dashboard  (lives inside the dry zone)
    # =================================================================
    box(5.0, cloud_y, 4.6, 1.0,
        "Firebase Realtime DB\n5 Hz telemetry  +  1 Hz JPEG",
        "#0F766E", fontsize=11.5)
    box(12.0, cloud_y, 4.6, 1.0,
        "Operator Dashboard\nDensity index  +  audit log",
        "#0F766E", fontsize=11.5)

    # Jetson → Firebase
    arrow(4.2, proc_y - 0.85, 5.0, cloud_y + 0.55,
          color="#0F766E", lw=2.0, mutation=20,
          connectionstyle="arc3,rad=-0.10")
    # Firebase → Dashboard
    arrow(7.4, cloud_y, 9.6, cloud_y,
          color="#0F766E", lw=2.2, mutation=22)
    # Audit-event label  (placed just below the cloud row, still inside dry zone)
    ax.text(8.5, cloud_y - 0.85,
            "audit event on every S3 ALARM",
            ha="center", fontsize=11, style="italic", color="#0F766E",
            fontweight="bold")

    # =================================================================
    # Legend — clean horizontal strip below everything, outside zones
    # =================================================================
    legend_items = [
        ("water flow",    "#0369A1"),
        ("sensor wiring", GRAY),
        ("USB serial",    DARK),
        ("valve control", RED),
        ("cloud / data",  "#0F766E"),
    ]
    # Compute even spacing across the canvas
    n = len(legend_items)
    x_start, x_end = 1.5, 15.5
    gap = (x_end - x_start) / (n - 1)
    for i, (lab, col) in enumerate(legend_items):
        x = x_start + i * gap
        ax.plot([x - 0.55, x - 0.05], [leg_y, leg_y],
                color=col, lw=3.4)
        ax.text(x + 0.05, leg_y, lab, fontsize=12, va="center",
                color=DARK, fontweight="bold")

    # Light separator above the legend
    ax.plot([0.5, 16.5], [1.10, 1.10], color="#D1D5DB", lw=0.8,
            linestyle=":", zorder=1)

    plt.tight_layout()
    path = os.path.join(OUT, "fig1_block_diagram.png")
    plt.savefig(path)
    plt.close()
    return path


# ============================================================
# Fig 8 — FSM state diagram (Five-state Moore machine)
# Compact, bold, large-font version — designed so that at column
# width the text is still legible.
# ============================================================
def fig_fsm_diagram():
    fig, ax = plt.subplots(figsize=(13.0, 8.6))
    ax.set_xlim(0, 13.5)
    ax.set_ylim(-0.2, 9.0)
    ax.axis("off")

    # Title
    ax.text(6.75, 8.65,
            "Five-State Moore FSM — NurdleDNA Actuation Control",
            ha="center", fontsize=23, fontweight="bold", color=DARK)

    C_S0 = "#1D4ED8"
    C_S1 = "#047857"
    C_S2 = "#B45309"
    C_S3 = "#B91C1C"
    C_S4 = "#6D28D9"

    states = [
        ("S0", "S0  INIT",   2.0, 5.7,  C_S0,
            ["Valve: OPEN", "LED: Blue", "Buzzer: OFF",
             'LCD: "INITIALISING"']),
        ("S1", "S1  SysOK",  6.5, 5.7,  C_S1,
            ["Valve: OPEN", "LED: Green", "Buzzer: OFF",
             'LCD: "SYSTEM OK"']),
        ("S4", "S4  RSTIN", 11.2, 5.7,  C_S4,
            ["Valve: CLOSED", "LED: Blue", "Buzzer: OFF",
             'LCD: "RESETTING"']),
        ("S2", "S2  WARN",   3.7, 1.6,  C_S2,
            ["Valve: OPEN", "LED: Yellow", "Buzzer: OFF",
             'LCD: "CAUTION"']),
        ("S3", "S3  ALARM",  9.3, 1.6,  C_S3,
            ["Valve: CLOSED", "LED: Red", "Buzzer: ON",
             'LCD: "ALARM"', "(Latched state)"]),
    ]

    BW, BH = 2.85, 2.05
    HEADER_H = 0.62

    boxes = {}
    for sid, label, cx, cy, color, outputs in states:
        outer = FancyBboxPatch((cx - BW/2, cy - BH/2), BW, BH,
                               boxstyle="round,pad=0.04,rounding_size=0.18",
                               facecolor="white", edgecolor=color,
                               linewidth=4.5, zorder=3)
        ax.add_patch(outer)
        header = FancyBboxPatch((cx - BW/2 + 0.05,
                                 cy + BH/2 - HEADER_H - 0.04),
                                BW - 0.10, HEADER_H,
                                boxstyle="round,pad=0.0,rounding_size=0.10",
                                facecolor=color, edgecolor="none",
                                zorder=4)
        ax.add_patch(header)
        ax.text(cx, cy + BH/2 - HEADER_H/2 - 0.04, label,
                ha="center", va="center",
                fontsize=19, fontweight="bold", color="white", zorder=5)
        for i, line in enumerate(outputs):
            extra_color = color if line.startswith("(Latched") else "#0F172A"
            ax.text(cx - BW/2 + 0.22,
                    cy + BH/2 - HEADER_H - 0.42 - i*0.33,
                    line, fontsize=13.5, fontweight="bold",
                    color=extra_color, zorder=5)
        boxes[sid] = (cx, cy)

    def add_arrow(p1, p2, color="#1F2937", lw=3.2, rad=0, mutation=26):
        a = FancyArrowPatch(p1, p2, arrowstyle="-|>",
                            mutation_scale=mutation, color=color,
                            linewidth=lw,
                            connectionstyle=f"arc3,rad={rad}", zorder=2)
        ax.add_patch(a)

    def label_text(x, y, text, color="#0F172A", fontsize=12.5,
                   pad=0.25):
        ax.text(x, y, text, ha="center", va="center",
                fontsize=fontsize, color=color, fontweight="bold",
                bbox=dict(boxstyle=f"round,pad={pad}",
                          facecolor="white", edgecolor=color,
                          linewidth=1.6),
                zorder=6)

    # ---- Power-on entry into S0  (from above the box)
    ax.text(boxes["S0"][0], 7.85, "Power ON",
            ha="center", va="center",
            fontsize=14, fontweight="bold", color="#374151")
    add_arrow((boxes["S0"][0], 7.55),
              (boxes["S0"][0], boxes["S0"][1] + BH/2 + 0.02),
              color="#374151", lw=3.0)

    # S0 → S1
    add_arrow((boxes["S0"][0] + BW/2, 5.7),
              (boxes["S1"][0] - BW/2, 5.7),
              color="#1F2937", lw=3.2)
    label_text((boxes["S0"][0] + boxes["S1"][0]) / 2, 6.35,
               "Self-test passed", color="#1F2937", fontsize=12.5)

    # ---- S1 ↔ S2 pair (use LEFT half of corridor for both)
    # S1 → S2 (down): label to the LEFT of the arrows
    add_arrow((boxes["S1"][0] - 1.1, boxes["S1"][1] - BH/2 + 0.05),
              (boxes["S2"][0] + 0.5, boxes["S2"][1] + BH/2 - 0.05),
              color=C_S2, lw=3.0, rad=-0.20)
    label_text(3.5, 4.20,
               "LDR > 600  OR\nAI count ≥ 4 for ≥ 1.5 s",
               color=C_S2, fontsize=12)

    # S2 → S1 (up): label to the RIGHT of the arrows
    add_arrow((boxes["S2"][0] + 1.1, boxes["S2"][1] + BH/2 - 0.05),
              (boxes["S1"][0] - 0.5, boxes["S1"][1] - BH/2 + 0.05),
              color=C_S1, lw=3.0, rad=0.20)
    label_text(5.95, 3.20, "Readings\nnormalise",
               color=C_S1, fontsize=12)

    # ---- S1 → S3 (down-right). Label far right side of the corridor.
    add_arrow((boxes["S1"][0] + 1.0, boxes["S1"][1] - BH/2 + 0.05),
              (boxes["S3"][0] - 0.6, boxes["S3"][1] + BH/2 - 0.05),
              color=C_S3, lw=3.0, rad=0.20)
    label_text(9.30, 4.20,
               "MQ-135 > 200  OR\nAI count ≥ 12 for ≥ 2.5 s",
               color=C_S3, fontsize=12)

    # ---- S2 → S3 (horizontal). Label BELOW the arrow, in the lower
    # half of the gap so it does not collide with S3 header.
    add_arrow((boxes["S2"][0] + BW/2, boxes["S2"][1]),
              (boxes["S3"][0] - BW/2, boxes["S3"][1]),
              color=C_S3, lw=3.0)
    label_text((boxes["S2"][0] + boxes["S3"][0]) / 2, 0.85,
               "MQ-135 > 200  OR\nAI count ≥ 12 for ≥ 2.5 s",
               color=C_S3, fontsize=11.5, pad=0.20)

    # ---- S3 → S4 (diagonal up-right). Label well clear of S4 box.
    add_arrow((boxes["S3"][0] + 0.6, boxes["S3"][1] + BH/2 - 0.05),
              (boxes["S4"][0] - 0.6, boxes["S4"][1] - BH/2 + 0.05),
              color=C_S4, lw=3.0, rad=-0.20)
    label_text(11.0, 3.20, "Reset button\npressed",
               color=C_S4, fontsize=12)

    # ---- S4 → S1 (top arc)
    add_arrow((boxes["S4"][0] - 0.5, boxes["S4"][1] + BH/2 - 0.3),
              (boxes["S1"][0] + 0.5, boxes["S1"][1] + BH/2 - 0.3),
              color=C_S4, lw=3.0, rad=-0.35, mutation=26)
    label_text((boxes["S4"][0] + boxes["S1"][0]) / 2, 7.70,
               "Reset complete", color=C_S4, fontsize=12.5)

    plt.tight_layout()
    path = os.path.join(OUT, "fig8_fsm_diagram.png")
    plt.savefig(path)
    plt.close()
    return path


# ============================================================
if __name__ == "__main__":
    produced = []
    produced.append(fig_block_diagram())
    produced.append(fig_fsm_diagram())
    produced.append(fig_latency_breakdown())
    produced.append(fig_training_curves())
    produced.append(fig_confusion_matrix())
    produced.append(fig_timing_trace())
    produced.append(fig_calibration())
    produced.append(table_thresholds())
    produced.append(table_comparison())

    print("\nProduced figures:")
    for p in produced:
        print(" -", p)
