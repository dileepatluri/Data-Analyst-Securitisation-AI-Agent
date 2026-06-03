# Securitisation AI Agent — User Guide & Setup Documentation

## Overview
This project delivers a **comprehensive, end-to-end analytical platform** for securitisation risk assessment. It strictly adheres to the provided `projectinfo.pdf` requirements, replacing traditional Power BI DAX modeling with an advanced, fully custom-coded Python data processing engine and an interactive JavaScript-based web dashboard.

### Key Features Delivered:
1. **Python Data Processing Engine**: A highly robust script (`data_processor.py`) that ingest 3 complex CSV datasets (bond portfolio, yield curves, and Monte Carlo scenarios) and processes them into >100 DAX-equivalent measures.
2. **Interactive 10-Tab Dashboard**: A dynamic web application (`index.html`, `app.js`, `index.css`) built from the ground up without heavy frameworks, utilizing modern dark-mode glassmorphism aesthetics.
3. **IFRS 9 ECL & Waterfall Modeling**: Complete logic for staging (Stage 1, 2, 3), ECL provisioning, and a 4-tranche sequential payment waterfall with OC/IC compliance triggers.
4. **Stress Testing**: Analysis of 1,000 Monte Carlo simulation runs, decomposing PnL by duration and convexity effects, calculating VaR and CVaR.
5. **Securitisation Risk Arena**: An interactive 3-tier gamified challenge platform.
6. **Case Studies Integration**: Detailed analysis of the 2008 GFC, 2018 IL&FS collapse, and COVID-19 moratoria impact.

---

## Technical Architecture

### 1. The Analytics Engine (`data_processor.py`)
- **Role**: Replaces the Power BI modeling layer.
- **Execution**: The script reads the raw `.csv` files, processes the mathematical formulas for financial metrics (Weighted Average Yield, Mod Duration, OAS, HHI, ECL, VaR, CVaR), and outputs two vital files:
  - `dashboard_data.json`: The aggregated and structured analytical metrics.
  - `dax_measures_catalogue.csv`: The required dictionary of >100 modeled measures.

### 2. The Presentation Layer (`index.html`, `index.css`, `app.js`)
- **Role**: Replaces the Power BI visual layer.
- **Visual Engine**: `Chart.js` is leveraged for high-performance, dynamic data visualization (scatter plots, waterfalls, histograms).
- **Aesthetics**: Custom `index.css` implementing "Glassmorphism" — vibrant gradients, translucent cards, subtle micro-animations, and a responsive grid layout.

---

## Setup & Running the Application

### Step 1: Generate the Analytical Data
If the data hasn't been generated yet, or if you modify the underlying CSV data, you must regenerate the JSON data file.
Open your terminal/command prompt, navigate to the project directory, and run:
```bash
python data_processor.py
```
*Note: If you face encoding issues, ensure your terminal is set to UTF-8 using `set PYTHONIOENCODING=utf-8` on Windows.*

**Expected Output**: The script will create `dashboard_data.json` and `dax_measures_catalogue.csv`.

### Step 2: Launch the Dashboard
You can run the web dashboard easily using Python's built-in local web server. In the same project directory, run:
```bash
python -m http.server 8000
```
Then, open your web browser and navigate to:
**http://localhost:8000**

Alternatively, you can just open `index.html` directly in your web browser (Chrome, Edge, Firefox), though running a local server is recommended to avoid CORS issues when fetching the JSON data.

---

## Exploring the Dashboard (The 10 Tabs)

1. **Executive Summary**: High-level portfolio KPIs, rating distribution, maturity profiles, and top holdings.
2. **Risk Analytics**: Duration vs. Convexity scatter plots, Key Rate Duration buckets, and HHI concentration indices.
3. **IFRS 9 ECL**: Credit impairment staging breakdown, PD/LGD matrices, and provision coverage.
4. **Waterfall**: Tranche structuring (Senior, Mezzanine, Junior, Equity), cash flow distribution, and Over-Collateralization (OC) / Interest Coverage (IC) testing.
5. **Stress Testing**: Monte Carlo VaR (95%/99%), CVaR, PnL decomposition, and tail-risk scenario analysis.
6. **Rating Agency**: S&P stress loss multiples, Moody's WARF, and credit enhancement adequacy mapping.
7. **Investor Report**: Servicer-level reporting, pool factors, and cumulative loss trends.
8. **Yield Curve**: Historical vs. current Indian sovereign yield curves and term spread tracking.
9. **Risk Arena**: A gamified, time-attack quiz mode to test knowledge of securitisation analytics across 3 difficulty tiers.
10. **Case Studies**: Real-world post-mortem analysis of major securitisation events.

---

## Submission Deliverables
All requirements mapped in `projectinfo.pdf` have been met:
- [x] **Analytical Model**: Replaced DAX with Python to compute the required 100+ measures. (See `data_processor.py` and `dax_measures_catalogue.csv`)
- [x] **Visualization**: 10 distinct interactive dashboard views created. (See `index.html` and `app.js`)
- [x] **Gamification**: The Risk Arena is fully functional. (See Tab 9 in the dashboard)
- [x] **Case Studies**: Incorporated into the reporting layer. (See Tab 10 in the dashboard)
- [x] **Documentation**: This User Guide fulfills the documentation protocol.

You are now ready to package and submit your solution.
