/**
 * SECURITISATION AI AGENT — Main Application
 * Dashboard with 10 tabs: Executive, Risk, IFRS9, Waterfall, Stress, Rating, Investor, YieldCurve, Arena, CaseStudy
 */

// ===================== GLOBAL STATE =====================
let DATA = null;
let CHARTS = {};
let ARENA = { xp: 0, currentTier: null, currentQ: 0, questions: [], score: 0, total: 0, timer: null, timeLeft: 120 };

// ===================== CHART.JS DEFAULTS =====================
Chart.defaults.color = '#94a3b8';
Chart.defaults.borderColor = 'rgba(148,163,184,0.1)';
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.font.size = 11;
Chart.defaults.plugins.legend.labels.usePointStyle = true;
Chart.defaults.plugins.legend.labels.pointStyleWidth = 8;
Chart.defaults.plugins.legend.labels.padding = 16;
Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(17,24,39,0.95)';
Chart.defaults.plugins.tooltip.borderColor = 'rgba(148,163,184,0.15)';
Chart.defaults.plugins.tooltip.borderWidth = 1;
Chart.defaults.plugins.tooltip.padding = 12;
Chart.defaults.plugins.tooltip.cornerRadius = 8;
Chart.defaults.plugins.tooltip.titleFont = { weight: '600' };
Chart.defaults.elements.arc.borderWidth = 0;

const COLORS = {
  primary: '#6366f1', secondary: '#8b5cf6', tertiary: '#a78bfa',
  success: '#10b981', warning: '#f59e0b', danger: '#ef4444', info: '#3b82f6',
  palette: ['#6366f1','#8b5cf6','#3b82f6','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899','#f97316','#14b8a6'],
  paletteAlpha: (a) => ['rgba(99,102,241,'+a+')','rgba(139,92,246,'+a+')','rgba(59,130,246,'+a+')','rgba(6,182,212,'+a+')','rgba(16,185,129,'+a+')','rgba(245,158,11,'+a+')','rgba(239,68,68,'+a+')','rgba(236,72,153,'+a+')','rgba(249,115,22,'+a+')','rgba(20,184,166,'+a+')']
};

// ===================== UTILITY FUNCTIONS =====================
const fmt = {
  currency: (v) => { if (v == null) return '—'; const abs = Math.abs(v); if (abs >= 1e9) return '₹' + (v/1e9).toFixed(2) + ' Bn'; if (abs >= 1e7) return '₹' + (v/1e7).toFixed(2) + ' Cr'; if (abs >= 1e5) return '₹' + (v/1e5).toFixed(2) + ' L'; return '₹' + v.toLocaleString('en-IN', {maximumFractionDigits:0}); },
  pct: (v, d=2) => v == null ? '—' : (v * 100).toFixed(d) + '%',
  pctRaw: (v, d=2) => v == null ? '—' : v.toFixed(d) + '%',
  num: (v, d=2) => v == null ? '—' : Number(v).toFixed(d),
  num0: (v) => v == null ? '—' : Math.round(v).toLocaleString('en-IN'),
  bps: (v) => v == null ? '—' : Math.round(v) + ' bps',
  sign: (v) => v >= 0 ? '+' + v.toFixed(2) : v.toFixed(2)
};

function ratingBadge(r) {
  const cls = {'SOV':'sov','AAA':'aaa','AA+':'aa-plus','AA':'aa','A+':'a-plus'}[r] || '';
  return `<span class="rating-badge ${cls}">${r}</span>`;
}

function statusDot(pass) {
  return `<span class="status-dot ${pass ? 'pass' : 'fail'}"></span>${pass ? 'PASS' : 'FAIL'}`;
}

// ===================== TAB NAVIGATION =====================
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('panel-' + btn.dataset.tab).classList.add('active');
  });
});

// ===================== DATA LOADING =====================
async function loadData() {
  try {
    const resp = await fetch('dashboard_data.json');
    if (!resp.ok) throw new Error('Failed to load data');
    DATA = await resp.json();
    renderAll();
  } catch (e) {
    console.error('Data load error:', e);
    document.getElementById('main-content').innerHTML = `
      <div class="loading-container" style="min-height:60vh;">
        <div style="font-size:3rem; margin-bottom:16px;">⚠️</div>
        <h3 style="color:var(--text-primary); margin-bottom:8px;">Data Not Ready</h3>
        <p style="color:var(--text-secondary); max-width:500px; text-align:center;">
          Please run <code style="background:var(--bg-tertiary); padding:2px 8px; border-radius:4px; font-family:var(--font-mono);">python data_processor.py</code> first to generate dashboard_data.json, then refresh this page.
        </p>
      </div>`;
  }
}

// ===================== RENDER ALL TABS =====================
function renderAll() {
  renderExecutive();
  renderRisk();
  renderIFRS9();
  renderWaterfall();
  renderStress();
  renderRating();
  renderInvestor();
  renderYieldCurve();
  renderArena();
  renderCaseStudies();
}

// ===================== TAB 1: EXECUTIVE SUMMARY =====================
function renderExecutive() {
  const s = DATA.portfolio_summary;
  const kpis = [
    { label: 'Total Market Value', value: fmt.currency(s.total_market_value), accent: '' },
    { label: 'Total Face Value', value: fmt.currency(s.total_face_value), accent: '' },
    { label: 'Portfolio Count', value: s.bond_count + ' Bonds', accent: 'accent-info' },
    { label: 'Wtd Avg YTM', value: fmt.pct(s.weighted_avg_ytm), accent: 'accent-success' },
    { label: 'Wtd Avg Duration (Mod)', value: fmt.num(s.weighted_avg_modified_duration) + ' yrs', accent: 'accent-warning' },
    { label: 'Wtd Avg Convexity', value: fmt.num(s.weighted_avg_convexity, 1), accent: '' },
    { label: 'Portfolio DV01', value: fmt.currency(s.portfolio_dv01), accent: 'accent-danger' },
    { label: 'Wtd Avg Coupon', value: fmt.pct(s.weighted_avg_coupon), accent: 'accent-info' }
  ];
  document.getElementById('kpi-executive').innerHTML = kpis.map(k =>
    `<div class="kpi-card ${k.accent}"><div class="kpi-label">${k.label}</div><div class="kpi-value">${k.value}</div></div>`
  ).join('');

  // Rating Distribution Chart
  const rd = DATA.credit_distribution;
  createChart('chart-rating-dist', 'doughnut', {
    labels: rd.map(r => r.rating),
    datasets: [{ data: rd.map(r => r.market_value), backgroundColor: COLORS.palette.slice(0, rd.length), hoverOffset: 8 }]
  }, { plugins: { legend: { position: 'right' }, tooltip: { callbacks: { label: (c) => c.label + ': ' + fmt.currency(c.raw) + ' (' + fmt.pct(c.raw / DATA.portfolio_summary.total_market_value) + ')' } } } });

  // Sector Allocation Chart
  const sa = DATA.sector_allocation;
  createChart('chart-sector-alloc', 'doughnut', {
    labels: sa.map(s => s.sector),
    datasets: [{ data: sa.map(s => s.market_value), backgroundColor: COLORS.palette.slice(0, sa.length), hoverOffset: 8 }]
  }, { plugins: { legend: { position: 'right' }, tooltip: { callbacks: { label: (c) => c.label + ': ' + fmt.currency(c.raw) + ' (' + fmt.pct(c.raw / DATA.portfolio_summary.total_market_value) + ')' } } } });

  // Maturity Profile
  const mp = DATA.maturity_profile;
  createChart('chart-maturity-profile', 'bar', {
    labels: mp.map(m => m.bucket),
    datasets: [{ label: 'Market Value', data: mp.map(m => m.market_value), backgroundColor: COLORS.paletteAlpha(0.7), borderColor: COLORS.palette, borderWidth: 1, borderRadius: 6 }]
  }, { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { ticks: { callback: (v) => fmt.currency(v) } } } });

  // Top 10 Issuers
  const ic = DATA.issuer_concentration.slice(0, 10);
  createChart('chart-issuer-conc', 'bar', {
    labels: ic.map(i => i.issuer),
    datasets: [{ label: 'Weight %', data: ic.map(i => i.weight * 100), backgroundColor: COLORS.paletteAlpha(0.7), borderColor: COLORS.palette, borderWidth: 1, borderRadius: 6 }]
  }, { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { ticks: { callback: (v) => v.toFixed(1) + '%' } } } });

  // Bond Table
  const bonds = DATA.bond_details.slice(0, 20);
  document.getElementById('tbody-bonds').innerHTML = bonds.map(b =>
    `<tr>
      <td>${b.BondID}</td>
      <td>${b.Issuer}</td>
      <td>${b.Sector}</td>
      <td>${ratingBadge(b.CreditRating)}</td>
      <td class="text-right">${fmt.pct(b.CouponRate)}</td>
      <td class="text-right">${fmt.pct(b.YieldToMaturity)}</td>
      <td class="text-right">${fmt.num(b.ModifiedDuration)}</td>
      <td class="text-right">${fmt.currency(b.MarketValue_INR)}</td>
      <td class="text-right">${fmt.pct(b.PortfolioWeight)}</td>
    </tr>`
  ).join('');
}

// ===================== TAB 2: RISK ANALYTICS =====================
function renderRisk() {
  const s = DATA.portfolio_summary;
  const risk = DATA.scenario_analysis;
  const kpis = [
    { label: 'Effective Duration', value: fmt.num(s.weighted_avg_effective_duration) + ' yrs', accent: '' },
    { label: 'Effective Convexity', value: fmt.num(s.weighted_avg_effective_convexity, 1), accent: '' },
    { label: 'Wtd Avg OAS', value: fmt.bps(s.weighted_avg_oas_bps), accent: 'accent-info' },
    { label: 'Wtd Avg Z-Spread', value: fmt.bps(s.weighted_avg_zspread_bps), accent: '' },
    { label: 'HHI (Issuer)', value: fmt.num(s.hhi_issuer, 4), accent: s.hhi_issuer > 0.15 ? 'accent-danger' : 'accent-success' },
    { label: 'HHI (Sector)', value: fmt.num(s.hhi_sector, 4), accent: '' },
    { label: 'P&L +100bps', value: fmt.currency(risk.pnl_up100), accent: risk.pnl_up100 >= 0 ? 'accent-success' : 'accent-danger' },
    { label: 'P&L -100bps', value: fmt.currency(risk.pnl_dn100), accent: risk.pnl_dn100 >= 0 ? 'accent-success' : 'accent-danger' }
  ];
  document.getElementById('kpi-risk').innerHTML = kpis.map(k =>
    `<div class="kpi-card ${k.accent}"><div class="kpi-label">${k.label}</div><div class="kpi-value">${k.value}</div></div>`
  ).join('');

  // KRD Chart
  const krd = DATA.key_rate_buckets;
  createChart('chart-krd', 'bar', {
    labels: krd.map(k => k.bucket),
    datasets: [
      { label: 'DV01 Contribution', data: krd.map(k => k.dv01_contribution), backgroundColor: COLORS.paletteAlpha(0.7), borderColor: COLORS.palette, borderWidth: 1, borderRadius: 6 },
      { label: 'Market Value (₹ Cr)', data: krd.map(k => k.market_value / 1e7), backgroundColor: COLORS.paletteAlpha(0.3), borderColor: COLORS.palette, borderWidth: 1, borderRadius: 6, yAxisID: 'y1' }
    ]
  }, { scales: { y: { title: { display: true, text: 'DV01 (₹)' } }, y1: { position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'Mkt Value (₹ Cr)' } } } });

  // Duration-Convexity Scatter
  const scatter = DATA.duration_convexity_scatter || [];
  const scatterDs = {};
  scatter.forEach(b => {
    if (!scatterDs[b.sector]) scatterDs[b.sector] = [];
    scatterDs[b.sector].push({ x: b.modified_duration, y: b.convexity, label: b.bond_id });
  });
  createChart('chart-dur-conv', 'scatter', {
    datasets: Object.keys(scatterDs).map((sec, i) => ({
      label: sec, data: scatterDs[sec], backgroundColor: COLORS.paletteAlpha(0.6)[i], borderColor: COLORS.palette[i], pointRadius: 4, pointHoverRadius: 7
    }))
  }, { scales: { x: { title: { display: true, text: 'Modified Duration (yrs)' } }, y: { title: { display: true, text: 'Convexity' } } }, plugins: { tooltip: { callbacks: { label: (c) => c.raw.label + ': Dur=' + c.raw.x.toFixed(2) + ', Conv=' + c.raw.y.toFixed(1) } } } });

  // Scenario P&L
  const scenarios = ['Up 50bps', 'Down 50bps', 'Up 100bps', 'Down 100bps', 'Up 200bps', 'Down 200bps'];
  const pnls = [risk.pnl_up50, risk.pnl_dn50, risk.pnl_up100, risk.pnl_dn100, risk.pnl_up200, risk.pnl_dn200];
  createChart('chart-scenario-pnl', 'bar', {
    labels: scenarios,
    datasets: [{ label: 'Portfolio P&L', data: pnls, backgroundColor: pnls.map(p => p >= 0 ? 'rgba(16,185,129,0.7)' : 'rgba(239,68,68,0.7)'), borderColor: pnls.map(p => p >= 0 ? '#10b981' : '#ef4444'), borderWidth: 1, borderRadius: 6 }]
  }, { plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: v => fmt.currency(v) } } } });

  // Spread Distribution
  const sd = DATA.spread_distribution || [];
  createChart('chart-spread-dist', 'bar', {
    labels: sd.map(s => s.bucket),
    datasets: [{ label: 'Bond Count', data: sd.map(s => s.count), backgroundColor: COLORS.paletteAlpha(0.6), borderColor: COLORS.palette, borderWidth: 1, borderRadius: 6 }]
  }, { plugins: { legend: { display: false } }, scales: { y: { title: { display: true, text: 'Count' } } } });

  // HHI Chart
  createChart('chart-hhi', 'bar', {
    labels: ['By Issuer', 'By Sector', 'By Rating'],
    datasets: [{ label: 'HHI Index', data: [s.hhi_issuer, s.hhi_sector, s.hhi_rating], backgroundColor: [COLORS.paletteAlpha(0.7)[0], COLORS.paletteAlpha(0.7)[1], COLORS.paletteAlpha(0.7)[2]], borderColor: COLORS.palette.slice(0, 3), borderWidth: 1, borderRadius: 6 }]
  }, { plugins: { legend: { display: false } }, scales: { y: { max: 1, ticks: { callback: v => v.toFixed(2) } } } });
}

// ===================== TAB 3: IFRS 9 ECL =====================
function renderIFRS9() {
  const ecl = DATA.ifrs9_ecl;
  if (!ecl) return;

  // Stage Cards
  const stages = ecl.by_stage || [];
  document.getElementById('stage-cards').innerHTML = stages.map((st, i) =>
    `<div class="stage-card">
      <div class="stage-number">${i + 1}</div>
      <div class="stage-title">${st.stage}</div>
      <div class="stage-value">${fmt.currency(st.ecl)}</div>
      <div class="stage-count">${st.count} bonds | ${fmt.currency(st.exposure)} exposure</div>
    </div>`
  ).join('');

  // KPIs
  const kpis = [
    { label: 'Total ECL', value: fmt.currency(ecl.total_ecl), accent: 'accent-danger' },
    { label: 'ECL Coverage Ratio', value: fmt.pct(ecl.coverage_ratio, 4), accent: '' },
    { label: 'Stage 1 Bonds', value: (ecl.by_stage[0]?.count || 0) + '', accent: 'accent-success' },
    { label: 'Stage 3 Bonds', value: (ecl.by_stage[2]?.count || 0) + '', accent: 'accent-danger' }
  ];
  document.getElementById('kpi-ifrs9').innerHTML = kpis.map(k =>
    `<div class="kpi-card ${k.accent}"><div class="kpi-label">${k.label}</div><div class="kpi-value">${k.value}</div></div>`
  ).join('');

  // ECL by Stage Chart
  createChart('chart-ecl-stage', 'bar', {
    labels: stages.map(s => s.stage),
    datasets: [
      { label: 'Exposure', data: stages.map(s => s.exposure), backgroundColor: COLORS.paletteAlpha(0.3), borderColor: COLORS.palette, borderWidth: 1, borderRadius: 6 },
      { label: 'ECL', data: stages.map(s => s.ecl), backgroundColor: COLORS.paletteAlpha(0.7).slice(5), borderColor: COLORS.palette.slice(5), borderWidth: 1, borderRadius: 6, yAxisID: 'y1' }
    ]
  }, { scales: { y: { title: { display: true, text: 'Exposure (₹)' }, ticks: { callback: v => fmt.currency(v) } }, y1: { position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'ECL (₹)' }, ticks: { callback: v => fmt.currency(v) } } } });

  // ECL by Sector
  const eclSector = ecl.by_sector || [];
  createChart('chart-ecl-sector', 'doughnut', {
    labels: eclSector.map(s => s.sector),
    datasets: [{ data: eclSector.map(s => s.ecl), backgroundColor: COLORS.palette.slice(0, eclSector.length), hoverOffset: 8 }]
  }, { plugins: { legend: { position: 'right' }, tooltip: { callbacks: { label: (c) => c.label + ': ' + fmt.currency(c.raw) } } } });

  // ECL by Rating
  const eclRating = ecl.by_rating || [];
  createChart('chart-ecl-rating', 'bar', {
    labels: eclRating.map(r => r.rating),
    datasets: [
      { label: 'Exposure', data: eclRating.map(r => r.exposure), backgroundColor: COLORS.paletteAlpha(0.4), borderColor: COLORS.palette, borderWidth: 1, borderRadius: 6 },
      { label: 'ECL', data: eclRating.map(r => r.ecl), backgroundColor: 'rgba(239,68,68,0.6)', borderColor: '#ef4444', borderWidth: 1, borderRadius: 6, yAxisID: 'y1' }
    ]
  }, { scales: { y: { ticks: { callback: v => fmt.currency(v) } }, y1: { position: 'right', grid: { drawOnChartArea: false }, ticks: { callback: v => fmt.currency(v) } } } });

  // ECL Table
  const tableData = [...stages, ...(eclSector || [])];
  document.getElementById('tbody-ecl').innerHTML = stages.map(s =>
    `<tr>
      <td>${s.stage}</td>
      <td class="text-right">${fmt.currency(s.exposure)}</td>
      <td class="text-right">${fmt.pct(s.avg_pd, 3)}</td>
      <td class="text-right">${fmt.pct(s.avg_lgd)}</td>
      <td class="text-right">${fmt.currency(s.ecl)}</td>
      <td class="text-right">${fmt.pct(s.ecl / s.exposure, 4)}</td>
    </tr>`
  ).join('');
}

// ===================== TAB 4: WATERFALL =====================
function renderWaterfall() {
  const w = DATA.waterfall;
  if (!w) return;

  const kpis = [
    { label: 'Total Collateral', value: fmt.currency(w.total_collateral), accent: '' },
    { label: 'Annual Coupon Income', value: fmt.currency(w.annual_coupon_income), accent: 'accent-success' },
    { label: 'Annual Fees', value: fmt.currency(w.annual_fees), accent: '' },
    { label: 'Available Cash Flow', value: fmt.currency(w.available_cashflow), accent: 'accent-info' },
    { label: 'Excess Spread', value: fmt.currency(w.excess_spread), accent: 'accent-success' }
  ];
  document.getElementById('kpi-waterfall').innerHTML = kpis.map(k =>
    `<div class="kpi-card ${k.accent}"><div class="kpi-label">${k.label}</div><div class="kpi-value">${k.value}</div></div>`
  ).join('');

  // Waterfall bar chart
  const tranches = w.tranches || [];
  createChart('chart-waterfall', 'bar', {
    labels: tranches.map(t => t.name),
    datasets: [
      { label: 'Interest Due', data: tranches.map(t => t.interest_due), backgroundColor: 'rgba(99,102,241,0.6)', borderColor: '#6366f1', borderWidth: 1, borderRadius: 6 },
      { label: 'Interest Paid', data: tranches.map(t => t.interest_paid), backgroundColor: 'rgba(16,185,129,0.6)', borderColor: '#10b981', borderWidth: 1, borderRadius: 6 }
    ]
  }, { scales: { y: { ticks: { callback: v => fmt.currency(v) } } } });

  // Tranche Structure
  createChart('chart-tranche-structure', 'bar', {
    labels: tranches.map(t => t.name),
    datasets: [
      { label: 'Tranche Size', data: tranches.map(t => t.size), backgroundColor: COLORS.paletteAlpha(0.6), borderColor: COLORS.palette, borderWidth: 1, borderRadius: 6 },
      { label: 'Credit Enhancement %', data: tranches.map(t => t.credit_enhancement * 100), backgroundColor: 'rgba(245,158,11,0.5)', borderColor: '#f59e0b', borderWidth: 1, borderRadius: 6, yAxisID: 'y1' }
    ]
  }, { scales: { y: { ticks: { callback: v => fmt.currency(v) } }, y1: { position: 'right', grid: { drawOnChartArea: false }, max: 100, ticks: { callback: v => v + '%' } } } });

  // OC/IC Test
  createChart('chart-oc-ic', 'bar', {
    labels: tranches.map(t => t.name),
    datasets: [
      { label: 'OC Ratio', data: tranches.map(t => t.oc_ratio), backgroundColor: 'rgba(59,130,246,0.5)', borderColor: '#3b82f6', borderWidth: 1, borderRadius: 6 },
      { label: 'IC Ratio', data: tranches.map(t => t.ic_ratio), backgroundColor: 'rgba(139,92,246,0.5)', borderColor: '#8b5cf6', borderWidth: 1, borderRadius: 6 }
    ]
  }, { scales: { y: { title: { display: true, text: 'Ratio' } } }, plugins: { annotation: {} } });

  // Tranche Table
  document.getElementById('tbody-waterfall').innerHTML = tranches.map(t =>
    `<tr>
      <td><strong>${t.name}</strong></td>
      <td>${ratingBadge(t.rating)}</td>
      <td class="text-right">${fmt.currency(t.size)}</td>
      <td class="text-right">${fmt.pct(t.coupon)}</td>
      <td class="text-right">${fmt.currency(t.interest_due)}</td>
      <td class="text-right">${fmt.currency(t.interest_paid)}</td>
      <td class="text-right">${fmt.pct(t.credit_enhancement)}</td>
      <td class="text-center">${statusDot(t.oc_pass)}</td>
      <td class="text-center">${statusDot(t.ic_pass)}</td>
    </tr>`
  ).join('');
}

// ===================== TAB 5: STRESS TESTING =====================
function renderStress() {
  const st = DATA.stress_testing;
  if (!st) return;

  const kpis = [
    { label: 'VaR (95%)', value: fmt.currency(st.var_95), accent: 'accent-warning' },
    { label: 'VaR (99%)', value: fmt.currency(st.var_99), accent: 'accent-danger' },
    { label: 'CVaR (95%)', value: fmt.currency(st.cvar_95), accent: 'accent-warning' },
    { label: 'CVaR (99%)', value: fmt.currency(st.cvar_99), accent: 'accent-danger' },
    { label: 'Max Loss', value: fmt.currency(st.max_loss), accent: 'accent-danger' },
    { label: 'Max Gain', value: fmt.currency(st.max_gain), accent: 'accent-success' },
    { label: 'Mean P&L', value: fmt.currency(st.mean_pnl), accent: '' },
    { label: 'P&L Std Dev', value: fmt.currency(st.std_pnl), accent: '' }
  ];
  document.getElementById('kpi-stress').innerHTML = kpis.map(k =>
    `<div class="kpi-card ${k.accent}"><div class="kpi-label">${k.label}</div><div class="kpi-value">${k.value}</div></div>`
  ).join('');

  // P&L Distribution Histogram
  const hist = st.pnl_histogram || [];
  createChart('chart-pnl-dist', 'bar', {
    labels: hist.map(h => h.bucket),
    datasets: [{ label: 'Scenario Count', data: hist.map(h => h.count), backgroundColor: hist.map(h => h.mid >= 0 ? 'rgba(16,185,129,0.6)' : 'rgba(239,68,68,0.6)'), borderColor: hist.map(h => h.mid >= 0 ? '#10b981' : '#ef4444'), borderWidth: 1, borderRadius: 4 }]
  }, { plugins: { legend: { display: false } }, scales: { x: { title: { display: true, text: 'P&L Bucket' } }, y: { title: { display: true, text: 'Scenario Count' } } } });

  // P&L Decomposition
  const decomp = st.pnl_decomposition || {};
  createChart('chart-pnl-decomp', 'doughnut', {
    labels: ['Duration Effect', 'Convexity Effect'],
    datasets: [{ data: [Math.abs(decomp.avg_duration_effect || 0), Math.abs(decomp.avg_convexity_effect || 0)], backgroundColor: [COLORS.paletteAlpha(0.7)[0], COLORS.paletteAlpha(0.7)[4]], hoverOffset: 8 }]
  }, { plugins: { legend: { position: 'right' } } });

  // Parallel Shift Impact
  const shifts = st.shift_impact || [];
  createChart('chart-shift-impact', 'scatter', {
    datasets: [{ label: 'Scenarios', data: shifts.map(s => ({ x: s.parallel_shift, y: s.total_pnl })), backgroundColor: 'rgba(99,102,241,0.3)', borderColor: '#6366f1', pointRadius: 2, pointHoverRadius: 5 }]
  }, { scales: { x: { title: { display: true, text: 'Parallel Shift (bps)' } }, y: { title: { display: true, text: 'Total P&L (₹)' }, ticks: { callback: v => fmt.currency(v) } } } });

  // Worst Scenarios Table
  const worst = st.worst_scenarios || [];
  document.getElementById('tbody-worst-scenarios').innerHTML = worst.slice(0, 20).map(s =>
    `<tr>
      <td>${s.scenario_id}</td>
      <td class="text-right">${fmt.num(s.parallel_shift, 1)}</td>
      <td class="text-right">${fmt.num(s.twist, 1)}</td>
      <td class="text-right">${fmt.num(s.butterfly, 1)}</td>
      <td class="text-right cell-negative">${fmt.currency(s.duration_pnl)}</td>
      <td class="text-right">${fmt.currency(s.convexity_pnl)}</td>
      <td class="text-right cell-negative">${fmt.currency(s.total_pnl)}</td>
      <td class="text-right cell-negative">${fmt.pctRaw(s.pnl_pct)}</td>
    </tr>`
  ).join('');
}

// ===================== TAB 6: RATING AGENCY =====================
function renderRating() {
  const ra = DATA.rating_agency;
  if (!ra) return;

  const kpis = [
    { label: "Moody's WARF", value: fmt.num(ra.moodys_warf, 1), accent: '' },
    { label: 'Base Case Loss', value: fmt.pct(ra.base_case_loss, 3), accent: '' },
    { label: 'AAA Stressed Loss', value: fmt.pct(ra.sp_stressed_loss_aaa, 3), accent: 'accent-danger' },
    { label: 'AA Stressed Loss', value: fmt.pct(ra.sp_stressed_loss_aa, 3), accent: 'accent-warning' },
    { label: 'CE Adequacy (AAA)', value: ra.ce_adequate_aaa ? 'ADEQUATE' : 'INSUFFICIENT', accent: ra.ce_adequate_aaa ? 'accent-success' : 'accent-danger' },
    { label: 'Senior CE Level', value: fmt.pct(ra.senior_ce, 2), accent: 'accent-info' }
  ];
  document.getElementById('kpi-rating').innerHTML = kpis.map(k =>
    `<div class="kpi-card ${k.accent}"><div class="kpi-label">${k.label}</div><div class="kpi-value">${k.value}</div></div>`
  ).join('');

  // S&P Stress
  const spData = ra.sp_stress_levels || [];
  createChart('chart-sp-stress', 'bar', {
    labels: spData.map(s => s.level),
    datasets: [
      { label: 'Stressed Loss', data: spData.map(s => s.stressed_loss * 100), backgroundColor: 'rgba(239,68,68,0.5)', borderColor: '#ef4444', borderWidth: 1, borderRadius: 6 },
      { label: 'Credit Enhancement', data: spData.map(s => s.ce * 100), backgroundColor: 'rgba(16,185,129,0.5)', borderColor: '#10b981', borderWidth: 1, borderRadius: 6 }
    ]
  }, { scales: { y: { ticks: { callback: v => v + '%' }, title: { display: true, text: 'Percentage' } } } });

  // Moody's WARF
  const warfData = ra.warf_by_rating || [];
  createChart('chart-moodys-warf', 'bar', {
    labels: warfData.map(w => w.rating),
    datasets: [{ label: 'Rating Factor', data: warfData.map(w => w.factor), backgroundColor: COLORS.paletteAlpha(0.6), borderColor: COLORS.palette, borderWidth: 1, borderRadius: 6 }]
  }, { plugins: { legend: { display: false } } });

  // CE Adequacy
  createChart('chart-ce-adequacy', 'bar', {
    labels: (ra.sp_stress_levels || []).map(s => s.level),
    datasets: [
      { label: 'Stressed Loss', data: (ra.sp_stress_levels || []).map(s => s.stressed_loss * 100), backgroundColor: 'rgba(239,68,68,0.6)', borderColor: '#ef4444', borderWidth: 1, borderRadius: 6 },
      { label: 'Available CE', data: (ra.sp_stress_levels || []).map(s => s.ce * 100), backgroundColor: 'rgba(16,185,129,0.6)', borderColor: '#10b981', borderWidth: 1, borderRadius: 6 }
    ]
  }, { scales: { y: { ticks: { callback: v => v.toFixed(2) + '%' } } } });

  // Compliance Table
  const compliance = ra.compliance_tests || [];
  document.getElementById('tbody-rating-compliance').innerHTML = compliance.map(c =>
    `<tr>
      <td>${c.test}</td>
      <td>${c.agency}</td>
      <td class="text-right">${c.metric}</td>
      <td class="text-right">${c.threshold}</td>
      <td class="text-center">${statusDot(c.pass)}</td>
    </tr>`
  ).join('');
}

// ===================== TAB 7: INVESTOR REPORT =====================
function renderInvestor() {
  const s = DATA.portfolio_summary;
  const w = DATA.waterfall;
  const inv = DATA.investor_report || {};

  const kpis = [
    { label: 'Pool Factor', value: fmt.pct(inv.pool_factor || 1.0), accent: '' },
    { label: 'Collection Rate', value: fmt.pct(inv.collection_rate || 0.99), accent: 'accent-success' },
    { label: 'Delinquency Rate', value: fmt.pct(inv.delinquency_rate || 0), accent: 'accent-warning' },
    { label: 'Cumulative Loss', value: fmt.pct(inv.cumulative_loss || 0, 3), accent: '' },
    { label: 'Excess Spread', value: fmt.pct(inv.excess_spread_pct || 0), accent: 'accent-info' },
    { label: 'Prepayment Rate (CPR)', value: fmt.pct(inv.cpr || 0), accent: '' }
  ];
  document.getElementById('kpi-investor').innerHTML = kpis.map(k =>
    `<div class="kpi-card ${k.accent}"><div class="kpi-label">${k.label}</div><div class="kpi-value">${k.value}</div></div>`
  ).join('');

  // Tranche Performance
  const tranches = (w && w.tranches) || [];
  createChart('chart-tranche-perf', 'bar', {
    labels: tranches.map(t => t.name),
    datasets: [{ label: 'Tranche Size (₹)', data: tranches.map(t => t.size), backgroundColor: COLORS.paletteAlpha(0.6), borderColor: COLORS.palette, borderWidth: 1, borderRadius: 6 }]
  }, { plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: v => fmt.currency(v) } } } });

  // Quality Distribution
  const cd = DATA.credit_distribution;
  createChart('chart-quality-dist', 'pie', {
    labels: cd.map(r => r.rating),
    datasets: [{ data: cd.map(r => r.count), backgroundColor: COLORS.palette.slice(0, cd.length) }]
  }, { plugins: { legend: { position: 'right' } } });

  // Investor Summary Table
  const metrics = inv.summary_metrics || [
    { metric: 'Total Outstanding Balance', value: fmt.currency(s.total_market_value), desc: 'Current market value of all bonds' },
    { metric: 'Number of Securities', value: s.bond_count, desc: 'Total bonds in portfolio' },
    { metric: 'Weighted Average Coupon', value: fmt.pct(s.weighted_avg_coupon), desc: 'Balance-weighted average coupon rate' },
    { metric: 'Weighted Average Maturity', value: fmt.num(s.weighted_avg_maturity) + ' yrs', desc: 'Balance-weighted average years to maturity' },
    { metric: 'Portfolio Duration', value: fmt.num(s.weighted_avg_modified_duration) + ' yrs', desc: 'Modified duration of portfolio' },
    { metric: 'Portfolio DV01', value: fmt.currency(s.portfolio_dv01), desc: 'Dollar value of 1bp rate change' }
  ];
  document.getElementById('tbody-investor').innerHTML = metrics.map(m =>
    `<tr><td><strong>${m.metric}</strong></td><td class="text-right">${m.value}</td><td class="text-muted">${m.desc}</td></tr>`
  ).join('');
}

// ===================== TAB 8: YIELD CURVE =====================
function renderYieldCurve() {
  const yc = DATA.yield_curve;
  if (!yc) return;

  const kpis = [
    { label: '10Y Yield (Current)', value: fmt.pctRaw((yc.current_curve?.find(c => c.tenor === '10Y')?.yield || 0) * 100), accent: '' },
    { label: '3M Yield (Current)', value: fmt.pctRaw((yc.current_curve?.find(c => c.tenor === '3M')?.yield || 0) * 100), accent: '' },
    { label: 'Term Spread (30Y-3M)', value: fmt.bps(yc.term_spread_bps), accent: yc.term_spread_bps >= 0 ? 'accent-success' : 'accent-danger' },
    { label: 'Curve Shape', value: yc.curve_shape || 'Normal', accent: 'accent-info' }
  ];
  document.getElementById('kpi-yieldcurve').innerHTML = kpis.map(k =>
    `<div class="kpi-card ${k.accent}"><div class="kpi-label">${k.label}</div><div class="kpi-value">${k.value}</div></div>`
  ).join('');

  // Yield Curve Comparison
  const curves = yc.comparison_curves || {};
  const tenors = ['3M','6M','1Y','2Y','3Y','5Y','7Y','10Y','15Y','20Y','30Y'];
  const datasets = [];
  const curveColors = ['#6366f1','#10b981','#f59e0b','#ef4444','#3b82f6'];
  let ci = 0;
  for (const [label, data] of Object.entries(curves)) {
    datasets.push({
      label: label, data: tenors.map(t => { const pt = data.find(d => d.tenor === t); return pt ? pt.yield * 100 : null; }),
      borderColor: curveColors[ci % curveColors.length], backgroundColor: 'transparent', borderWidth: 2, tension: 0.3, pointRadius: 4, pointHoverRadius: 6
    });
    ci++;
  }
  createChart('chart-yc-comparison', 'line', { labels: tenors, datasets }, { scales: { y: { title: { display: true, text: 'Yield (%)' }, ticks: { callback: v => v.toFixed(2) + '%' } } }, plugins: { legend: { position: 'top' } } });

  // 10Y Trend
  const trend10 = yc.yield_10y_trend || [];
  createChart('chart-10y-trend', 'line', {
    labels: trend10.map(t => t.date),
    datasets: [{ label: '10Y Yield', data: trend10.map(t => t.yield * 100), borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.1)', fill: true, borderWidth: 2, tension: 0.3, pointRadius: 1 }]
  }, { scales: { y: { ticks: { callback: v => v.toFixed(2) + '%' } } }, plugins: { legend: { display: false } } });

  // Term Spread Trend
  const termSpread = yc.term_spread_trend || [];
  createChart('chart-term-spread', 'line', {
    labels: termSpread.map(t => t.date),
    datasets: [{ label: '30Y - 3M Spread (bps)', data: termSpread.map(t => t.spread_bps), borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)', fill: true, borderWidth: 2, tension: 0.3, pointRadius: 1 }]
  }, { scales: { y: { title: { display: true, text: 'bps' } } }, plugins: { legend: { display: false } } });

  // Current Yield Curve Table
  const curCurve = yc.current_curve || [];
  document.getElementById('tbody-yieldcurve').innerHTML = curCurve.map(c =>
    `<tr>
      <td>${c.tenor}</td>
      <td class="text-right">${(c.yield * 100).toFixed(4)}%</td>
      <td class="text-right">${(c.zero_rate * 100).toFixed(4)}%</td>
      <td class="text-right">${(c.forward_rate * 100).toFixed(4)}%</td>
      <td class="text-right">${c.discount_factor.toFixed(6)}</td>
    </tr>`
  ).join('');
}

// ===================== TAB 9: RISK ARENA =====================
function renderArena() {
  // Set up tier click handlers
  document.querySelectorAll('.tier-card').forEach(card => {
    card.addEventListener('click', () => startArena(card.dataset.tier));
  });
  document.getElementById('arena-submit-btn').addEventListener('click', submitArenaAnswer);
  document.getElementById('arena-skip-btn').addEventListener('click', skipArenaQuestion);
  document.getElementById('arena-retry-btn').addEventListener('click', resetArena);
}

function getArenaQuestions(tier) {
  const s = DATA.portfolio_summary;
  const q = [];

  if (tier === 'pool') {
    q.push(
      { q: `What is the total market value of the bond portfolio?`, options: [fmt.currency(s.total_market_value), fmt.currency(s.total_market_value * 1.1), fmt.currency(s.total_market_value * 0.9), fmt.currency(s.total_face_value)], correct: 0 },
      { q: `How many bonds are in the portfolio?`, options: [String(s.bond_count), String(s.bond_count + 50), String(s.bond_count - 20), String(s.bond_count + 100)], correct: 0 },
      { q: `What is the portfolio's weighted average modified duration?`, options: [fmt.num(s.weighted_avg_modified_duration) + ' yrs', fmt.num(s.weighted_avg_modified_duration * 1.3) + ' yrs', fmt.num(s.weighted_avg_modified_duration * 0.7) + ' yrs', fmt.num(s.weighted_avg_macaulay_duration) + ' yrs'], correct: 0 },
      { q: `What is the Weighted Average Yield to Maturity (WAC)?`, options: [fmt.pct(s.weighted_avg_ytm), fmt.pct(s.weighted_avg_ytm * 1.2), fmt.pct(s.weighted_avg_coupon), fmt.pct(s.weighted_avg_ytm * 0.8)], correct: 0 },
      { q: `What does the Herfindahl-Hirschman Index (HHI) measure?`, options: ['Portfolio concentration/diversification', 'Credit risk', 'Interest rate sensitivity', 'Prepayment speed'], correct: 0 }
    );
  } else if (tier === 'tranche') {
    const w = DATA.waterfall;
    q.push(
      { q: `In a sequential waterfall, which tranche gets paid first?`, options: ['Senior (AAA)', 'Mezzanine (AA)', 'Junior (A)', 'Equity'], correct: 0 },
      { q: `What is the total annual coupon income of the portfolio?`, options: [fmt.currency(w.annual_coupon_income), fmt.currency(w.annual_coupon_income * 1.2), fmt.currency(w.annual_coupon_income * 0.8), fmt.currency(w.total_collateral)], correct: 0 },
      { q: `What does the OC (Over-Collateralisation) test measure?`, options: ['Whether collateral exceeds tranche balance', 'Interest coverage adequacy', 'Credit rating compliance', 'Prepayment risk'], correct: 0 },
      { q: `What happens when an IC test fails?`, options: ['Cash flows are redirected to senior tranches', 'All payments stop', 'Equity tranche gets priority', 'Nothing changes'], correct: 0 },
      { q: `What is Credit Enhancement?`, options: ['Protection for senior tranches against losses', 'Increase in coupon rate', 'Extension of maturity', 'Rating upgrade mechanism'], correct: 0 }
    );
  } else {
    const st = DATA.stress_testing;
    q.push(
      { q: `What is the portfolio's VaR at 99% confidence?`, options: [fmt.currency(st.var_99), fmt.currency(st.var_95), fmt.currency(st.cvar_99), fmt.currency(st.max_loss)], correct: 0 },
      { q: `What is CVaR (Expected Shortfall)?`, options: ['Average loss beyond VaR threshold', 'Maximum possible loss', 'Median portfolio return', 'Standard deviation of returns'], correct: 0 },
      { q: `In the 2008 GFC, what was the primary driver of MBS losses?`, options: ['Deteriorating borrower credit quality and rising defaults', 'Interest rate increases', 'Currency devaluation', 'Regulatory changes'], correct: 0 },
      { q: `How many Monte Carlo scenarios were simulated?`, options: ['1,000', '500', '10,000', '100'], correct: 0 },
      { q: `Under IFRS 9, which stage represents credit-impaired assets?`, options: ['Stage 3', 'Stage 1', 'Stage 2', 'Stage 4'], correct: 0 }
    );
  }
  return q;
}

function startArena(tier) {
  ARENA.currentTier = tier;
  ARENA.questions = getArenaQuestions(tier);
  ARENA.currentQ = 0;
  ARENA.score = 0;
  ARENA.total = ARENA.questions.length;

  document.getElementById('tier-cards').style.display = 'none';
  document.getElementById('arena-challenge-area').classList.remove('hidden');
  document.getElementById('arena-results').classList.add('hidden');

  const tierNames = { pool: 'Tier 1 — Pool Builder', tranche: 'Tier 2 — Tranche Engineer', crisis: 'Tier 3 — Crisis Navigator' };
  document.getElementById('arena-tier-badge').textContent = tierNames[tier];

  showArenaQuestion();
}

function showArenaQuestion() {
  if (ARENA.currentQ >= ARENA.questions.length) { showArenaResults(); return; }

  const q = ARENA.questions[ARENA.currentQ];
  document.getElementById('arena-q-counter').textContent = `Question ${ARENA.currentQ + 1} of ${ARENA.total}`;
  document.getElementById('arena-question').textContent = q.q;
  document.getElementById('arena-feedback').classList.add('hidden');

  const opts = document.getElementById('arena-options');
  opts.innerHTML = q.options.map((o, i) =>
    `<div class="answer-option" data-idx="${i}" onclick="selectArenaOption(this)">${o}</div>`
  ).join('');

  // Timer
  ARENA.timeLeft = 120;
  clearInterval(ARENA.timer);
  updateTimerDisplay();
  ARENA.timer = setInterval(() => {
    ARENA.timeLeft--;
    updateTimerDisplay();
    if (ARENA.timeLeft <= 0) { clearInterval(ARENA.timer); submitArenaAnswer(); }
  }, 1000);
}

function updateTimerDisplay() {
  const m = Math.floor(ARENA.timeLeft / 60);
  const s = ARENA.timeLeft % 60;
  const el = document.getElementById('arena-timer');
  el.textContent = `⏱️ ${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  el.classList.toggle('critical', ARENA.timeLeft <= 15);
}

function selectArenaOption(el) {
  document.querySelectorAll('#arena-options .answer-option').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
}

function submitArenaAnswer() {
  clearInterval(ARENA.timer);
  const selected = document.querySelector('#arena-options .answer-option.selected');
  const q = ARENA.questions[ARENA.currentQ];
  const fb = document.getElementById('arena-feedback');

  if (selected) {
    const idx = parseInt(selected.dataset.idx);
    if (idx === q.correct) {
      ARENA.score++;
      const xpGain = ARENA.currentTier === 'pool' ? 100 : ARENA.currentTier === 'tranche' ? 200 : 500;
      ARENA.xp += xpGain;
      selected.classList.add('correct');
      fb.innerHTML = `<span style="color:var(--success)">✅ Correct! +${xpGain} XP</span>`;
    } else {
      selected.classList.add('incorrect');
      document.querySelectorAll('#arena-options .answer-option')[q.correct].classList.add('correct');
      fb.innerHTML = `<span style="color:var(--danger)">❌ Incorrect. The correct answer is: ${q.options[q.correct]}</span>`;
    }
  } else {
    fb.innerHTML = `<span style="color:var(--warning)">⏰ Time's up! The correct answer is: ${q.options[q.correct]}</span>`;
  }

  fb.classList.remove('hidden');
  fb.style.background = 'var(--bg-tertiary)';
  fb.style.padding = '12px 16px';
  fb.style.borderRadius = '8px';

  updateArenaXP();

  setTimeout(() => {
    ARENA.currentQ++;
    showArenaQuestion();
  }, 2000);
}

function skipArenaQuestion() {
  clearInterval(ARENA.timer);
  ARENA.currentQ++;
  showArenaQuestion();
}

function showArenaResults() {
  document.getElementById('arena-challenge-area').classList.add('hidden');
  document.getElementById('arena-results').classList.remove('hidden');

  const pct = Math.round((ARENA.score / ARENA.total) * 100);
  document.getElementById('arena-score').textContent = `${ARENA.score} / ${ARENA.total} (${pct}%)`;
  document.getElementById('arena-result-msg').textContent =
    pct >= 80 ? '🌟 Outstanding! You\'re a securitisation expert!' :
    pct >= 60 ? '👍 Good job! Keep practicing to master the concepts.' :
    '📚 Keep learning! Review the training materials and try again.';

  // Award badges
  if (pct === 100) {
    const badges = document.querySelectorAll('.badge-card');
    badges[4].classList.add('earned'); // Perfect Score
  }
  if (ARENA.currentTier === 'pool') document.querySelectorAll('.badge-card')[0].classList.add('earned');
  if (ARENA.currentTier === 'tranche') document.querySelectorAll('.badge-card')[1].classList.add('earned');
  if (ARENA.currentTier === 'crisis') document.querySelectorAll('.badge-card')[2].classList.add('earned');
}

function resetArena() {
  document.getElementById('tier-cards').style.display = '';
  document.getElementById('arena-results').classList.add('hidden');
  document.getElementById('arena-challenge-area').classList.add('hidden');
}

function updateArenaXP() {
  const maxXP = 5000;
  const pct = Math.min((ARENA.xp / maxXP) * 100, 100);
  document.getElementById('arena-xp-fill').style.width = pct + '%';
  document.getElementById('arena-xp-label').textContent = `${ARENA.xp.toLocaleString()} / ${maxXP.toLocaleString()} XP`;
}

// ===================== TAB 10: CASE STUDIES =====================
function renderCaseStudies() {
  const cs = DATA.case_studies;
  if (!cs) return;

  // 2008 GFC
  if (cs.gfc) {
    document.getElementById('case-gfc-body').innerHTML = cs.gfc.narrative.map(p => `<p>${p}</p>`).join('');
    document.getElementById('case-gfc-metrics').innerHTML = (cs.gfc.metrics || []).map(m =>
      `<div class="case-metric"><div class="metric-value">${m.value}</div><div class="metric-label">${m.label}</div></div>`
    ).join('');
  }

  // IL&FS
  if (cs.ilfs) {
    document.getElementById('case-ilfs-body').innerHTML = cs.ilfs.narrative.map(p => `<p>${p}</p>`).join('');
    document.getElementById('case-ilfs-metrics').innerHTML = (cs.ilfs.metrics || []).map(m =>
      `<div class="case-metric"><div class="metric-value">${m.value}</div><div class="metric-label">${m.label}</div></div>`
    ).join('');
  }

  // COVID-19
  if (cs.covid) {
    document.getElementById('case-covid-body').innerHTML = cs.covid.narrative.map(p => `<p>${p}</p>`).join('');
    document.getElementById('case-covid-metrics').innerHTML = (cs.covid.metrics || []).map(m =>
      `<div class="case-metric"><div class="metric-value">${m.value}</div><div class="metric-label">${m.label}</div></div>`
    ).join('');
  }
}

// ===================== CHART HELPER =====================
function createChart(canvasId, type, data, options = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  if (CHARTS[canvasId]) CHARTS[canvasId].destroy();
  const ctx = canvas.getContext('2d');
  const defaultOpts = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 800, easing: 'easeOutQuart' }
  };
  CHARTS[canvasId] = new Chart(ctx, { type, data, options: { ...defaultOpts, ...options } });
}

// ===================== INIT =====================
document.addEventListener('DOMContentLoaded', loadData);
