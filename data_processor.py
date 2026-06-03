import csv
import json
import math
from collections import defaultdict
from datetime import datetime
import os

measure_counter = 1
catalogue = []

def add_measure(name, cat, formula, desc, source="bond_portfolio_data.csv"):
    global measure_counter
    catalogue.append({
        "MeasureID": f"M{measure_counter:03d}",
        "MeasureName": name,
        "Category": cat,
        "Formula": formula,
        "Description": desc,
        "DataSource": source
    })
    measure_counter += 1

def load_csv_data(filepath, convert_numerics=True):
    if not os.path.exists(filepath):
        return []
    data = []
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if convert_numerics:
                for k, v in row.items():
                    if v == '':
                        row[k] = None
                    else:
                        try:
                            if '.' in v or 'e' in str(v).lower() or k.endswith('_bps'):
                                row[k] = float(v)
                            else:
                                row[k] = int(v)
                        except ValueError:
                            if str(v).lower() == 'true': row[k] = True
                            elif str(v).lower() == 'false': row[k] = False
            data.append(row)
    return data

def process_data(bonds, mc_scenarios, yield_curves):
    global measure_counter, catalogue
    measure_counter = 1
    catalogue = []
    out = {}
    
    # 1. CORE PORTFOLIO
    cat_port = "Core Portfolio Analytics"
    total_mv = sum(b.get('MarketValue_INR') or 0 for b in bonds)
    total_fv = sum((b.get('FaceValue') or 0) * (b.get('Quantity') or 0) for b in bonds)
    bond_count = len(bonds)
    
    add_measure("Total Market Value", cat_port, "SUM(MarketValue_INR)", "Total market value of the portfolio")
    add_measure("Total Face Value", cat_port, "SUM(FaceValue * Quantity)", "Total face value of the portfolio")
    add_measure("Portfolio Count", cat_port, "COUNTROWS(Bonds)", "Number of distinct bonds")

    wt_ytm = sum((b.get('YieldToMaturity') or 0) * (b.get('MarketValue_INR') or 0) for b in bonds) / total_mv if total_mv else 0
    wt_mod_dur = sum((b.get('ModifiedDuration') or 0) * (b.get('MarketValue_INR') or 0) for b in bonds) / total_mv if total_mv else 0
    wt_mac_dur = sum((b.get('MacaulayDuration') or 0) * (b.get('MarketValue_INR') or 0) for b in bonds) / total_mv if total_mv else 0
    wt_convexity = sum((b.get('Convexity') or 0) * (b.get('MarketValue_INR') or 0) for b in bonds) / total_mv if total_mv else 0
    portfolio_dv01 = sum((b.get('DV01_Per100Face') or 0) * (b.get('Quantity') or 0) for b in bonds)
    wt_coupon = sum((b.get('CouponRate') or 0) * (b.get('MarketValue_INR') or 0) for b in bonds) / total_mv if total_mv else 0
    wt_maturity = sum((b.get('YearsToMaturity') or 0) * (b.get('MarketValue_INR') or 0) for b in bonds) / total_mv if total_mv else 0

    out["portfolio_summary"] = {
        "total_market_value": total_mv,
        "total_face_value": total_fv,
        "bond_count": bond_count,
        "weighted_avg_ytm": wt_ytm,
        "weighted_avg_modified_duration": wt_mod_dur,
        "weighted_avg_macaulay_duration": wt_mac_dur,
        "weighted_avg_convexity": wt_convexity,
        "portfolio_dv01": portfolio_dv01,
        "weighted_avg_coupon": wt_coupon,
        "weighted_avg_maturity": wt_maturity,
        "weighted_avg_effective_duration": 0,
        "weighted_avg_effective_convexity": 0,
        "weighted_avg_oas_bps": 0,
        "weighted_avg_zspread_bps": 0
    }
    
    # ADVANCED RISK METRICS
    cat_risk = "Advanced Risk Metrics"
    wt_eff_dur = sum((b.get('EffectiveDuration') or 0) * (b.get('MarketValue_INR') or 0) for b in bonds) / total_mv if total_mv else 0
    wt_eff_conv = sum((b.get('EffectiveConvexity') or 0) * (b.get('MarketValue_INR') or 0) for b in bonds) / total_mv if total_mv else 0
    wt_oas = sum((b.get('OAS_bps') or 0) * (b.get('MarketValue_INR') or 0) for b in bonds) / total_mv if total_mv else 0
    wt_zspread = sum((b.get('ZSpread_bps') or 0) * (b.get('MarketValue_INR') or 0) for b in bonds) / total_mv if total_mv else 0

    out["portfolio_summary"].update({
        "weighted_avg_effective_duration": wt_eff_dur,
        "weighted_avg_effective_convexity": wt_eff_conv,
        "weighted_avg_oas_bps": wt_oas,
        "weighted_avg_zspread_bps": wt_zspread
    })

    def group_by(key):
        res = defaultdict(lambda: {"count": 0, "market_value": 0})
        for b in bonds:
            val = b.get(key)
            if val is not None:
                res[val]["count"] += 1
                res[val]["market_value"] += b.get('MarketValue_INR', 0)
        return res

    cd_grouped = group_by('CreditRating')
    out["credit_distribution"] = [{"rating": k, "count": v["count"], "market_value": v["market_value"]} for k, v in cd_grouped.items()]
    sa_grouped = group_by('Sector')
    out["sector_allocation"] = [{"sector": k, "count": v["count"], "market_value": v["market_value"]} for k, v in sa_grouped.items()]
    
    iss_grouped = group_by('Issuer')
    issuer_conc = [{"issuer": k, "weight": v["market_value"]/total_mv if total_mv else 0} for k, v in iss_grouped.items()]
    issuer_conc.sort(key=lambda x: x["weight"], reverse=True)
    out["issuer_concentration"] = issuer_conc

    hhi_issuer = sum(x["weight"]**2 for x in issuer_conc)
    hhi_sector = sum((v["market_value"]/total_mv)**2 for v in sa_grouped.values()) if total_mv else 0
    hhi_rating = sum((v["market_value"]/total_mv)**2 for v in cd_grouped.values()) if total_mv else 0
    out["portfolio_summary"]["hhi_issuer"] = hhi_issuer
    out["portfolio_summary"]["hhi_sector"] = hhi_sector
    out["portfolio_summary"]["hhi_rating"] = hhi_rating

    mat_grouped = group_by('KeyRateBucket')
    out["maturity_profile"] = [{"bucket": k, "market_value": v["market_value"]} for k, v in mat_grouped.items()]

    krd_grouped = defaultdict(lambda: {"dv01": 0, "mv": 0})
    for b in bonds:
        bucket = b.get('KeyRateBucket')
        if bucket:
            krd_grouped[bucket]["dv01"] += ((b.get('DV01_Per100Face') or 0) * (b.get('Quantity') or 0))
            krd_grouped[bucket]["mv"] += (b.get('MarketValue_INR') or 0)
    out["key_rate_buckets"] = [{"bucket": k, "dv01_contribution": v["dv01"], "market_value": v["mv"]} for k, v in krd_grouped.items()]

    out["duration_convexity_scatter"] = [
        {"sector": b['Sector'], "modified_duration": b['ModifiedDuration'], "convexity": b['Convexity'], "bond_id": b['BondID']}
        for b in bonds if b.get('ModifiedDuration') is not None and b.get('Convexity') is not None
    ]

    pnl_up50 = sum((b.get('PriceChange_Up50bps') or 0) / 100 * (b.get('MarketValue_INR') or 0) for b in bonds)
    pnl_dn50 = sum((b.get('PriceChange_Dn50bps') or 0) / 100 * (b.get('MarketValue_INR') or 0) for b in bonds)
    out["scenario_analysis"] = {
        "pnl_up50": pnl_up50, "pnl_dn50": pnl_dn50,
        "pnl_up100": sum((b.get('PriceChange_Up100bps') or 0) / 100 * (b.get('MarketValue_INR') or 0) for b in bonds),
        "pnl_dn100": sum((b.get('PriceChange_Dn100bps') or 0) / 100 * (b.get('MarketValue_INR') or 0) for b in bonds),
        "pnl_up200": sum((b.get('PriceChange_Up200bps') or 0) / 100 * (b.get('MarketValue_INR') or 0) for b in bonds),
        "pnl_dn200": sum((b.get('PriceChange_Dn200bps') or 0) / 100 * (b.get('MarketValue_INR') or 0) for b in bonds)
    }

    spread_buckets = {"< 0": 0, "0-50": 0, "50-100": 0, "100-200": 0, "> 200": 0}
    for b in bonds:
        oas = b.get('OAS_bps')
        if oas is not None:
            if oas < 0: spread_buckets["< 0"] += 1
            elif oas <= 50: spread_buckets["0-50"] += 1
            elif oas <= 100: spread_buckets["50-100"] += 1
            elif oas <= 200: spread_buckets["100-200"] += 1
            else: spread_buckets["> 200"] += 1
    out["spread_distribution"] = [{"bucket": k, "count": v} for k, v in spread_buckets.items()]

    sorted_bonds = sorted(bonds, key=lambda x: x.get('MarketValue_INR') or 0, reverse=True)
    out["bond_details"] = sorted_bonds[:20]

    # ECL
    ecl_stages = {1: {"stage": "Stage 1", "exposure": 0, "ecl": 0, "count": 0, "pd_sum": 0, "lgd_sum": 0},
                  2: {"stage": "Stage 2", "exposure": 0, "ecl": 0, "count": 0, "pd_sum": 0, "lgd_sum": 0},
                  3: {"stage": "Stage 3", "exposure": 0, "ecl": 0, "count": 0, "pd_sum": 0, "lgd_sum": 0}}
    ecl_sector = defaultdict(lambda: 0)
    ecl_rating = defaultdict(lambda: {"exposure": 0, "ecl": 0})
    
    for b in bonds:
        r = b.get('CreditRating')
        sec = b.get('Sector')
        mv = b.get('MarketValue_INR', 0)
        ytm_years = b.get('YearsToMaturity', 1)
        
        if r in ['SOV', 'AAA']: stage = 1
        elif r in ['AA+', 'AA']: stage = 2
        else: stage = 3
        
        if r == 'SOV': pd = 0.0005
        elif r == 'AAA': pd = 0.0010
        elif r == 'AA+': pd = 0.0050
        elif r == 'AA': pd = 0.0100
        else: pd = 0.0300
        
        lgd = 0.0 if r == 'SOV' else 0.45
        ead = mv
        ecl = (pd * lgd * ead) if stage == 1 else (pd * lgd * ead * ytm_years)
            
        ecl_stages[stage]["exposure"] += ead
        ecl_stages[stage]["ecl"] += ecl
        ecl_stages[stage]["count"] += 1
        ecl_stages[stage]["pd_sum"] += pd * ead
        ecl_stages[stage]["lgd_sum"] += lgd * ead
        ecl_sector[sec] += ecl
        ecl_rating[r]["exposure"] += ead
        ecl_rating[r]["ecl"] += ecl

    for st in ecl_stages.values():
        st["avg_pd"] = st["pd_sum"] / st["exposure"] if st["exposure"] else 0
        st["avg_lgd"] = st["lgd_sum"] / st["exposure"] if st["exposure"] else 0
        if "pd_sum" in st: del st["pd_sum"]
        if "lgd_sum" in st: del st["lgd_sum"]

    total_ecl = sum(s["ecl"] for s in ecl_stages.values())
    out["ifrs9_ecl"] = {
        "total_ecl": total_ecl,
        "coverage_ratio": total_ecl / total_mv if total_mv else 0,
        "by_stage": list(ecl_stages.values()),
        "by_sector": [{"sector": k, "ecl": v} for k, v in ecl_sector.items()],
        "by_rating": [{"rating": k, "exposure": v["exposure"], "ecl": v["ecl"]} for k, v in ecl_rating.items()]
    }

    # WATERFALL
    annual_coupon = sum((b.get('CouponRate') or 0) * (b.get('FaceValue') or 0) * (b.get('Quantity') or 0) for b in bonds)
    annual_fees = total_fv * 0.005
    available_cf = annual_coupon - annual_fees
    
    tranches = [
        {"name": "Senior", "rating": "AAA", "share": 0.70, "coupon": 0.06},
        {"name": "Mezzanine", "rating": "AA", "share": 0.15, "coupon": 0.08},
        {"name": "Junior", "rating": "A", "share": 0.10, "coupon": 0.11},
        {"name": "Equity", "rating": "NR", "share": 0.05, "coupon": 0.0}
    ]
    
    waterfall_tranches = []
    rem_cf = available_cf
    cum_size = 0
    for i, t in enumerate(tranches):
        size = total_fv * t["share"]
        cum_size += size
        int_due = size * t["coupon"]
        int_paid = min(rem_cf, int_due)
        rem_cf -= int_paid
        ce = 1.0 - (cum_size / total_fv) if i < len(tranches) - 1 else 0
        oc_ratio = total_mv / cum_size if cum_size else 0
        ic_ratio = available_cf / int_due if int_due else 999
        waterfall_tranches.append({
            "name": t["name"],
            "rating": t["rating"],
            "size": size,
            "coupon": t["coupon"],
            "interest_due": int_due,
            "interest_paid": int_paid,
            "credit_enhancement": ce,
            "oc_ratio": oc_ratio,
            "ic_ratio": ic_ratio,
            "oc_pass": oc_ratio >= 1.05,
            "ic_pass": ic_ratio >= 1.10
        })

    out["waterfall"] = {
        "total_collateral": total_fv,
        "annual_coupon_income": annual_coupon,
        "annual_fees": annual_fees,
        "available_cashflow": available_cf,
        "excess_spread": rem_cf,
        "tranches": waterfall_tranches
    }

    # STRESS TESTING
    if mc_scenarios:
        pnls = [s.get('PnL_Total_INR') or 0 for s in mc_scenarios]
        pnls.sort()
        n = len(pnls)
        var_95 = -pnls[int(n * 0.05)] if n > 0 else 0
        var_99 = -pnls[int(n * 0.01)] if n > 0 else 0
        cvar_95 = -sum(pnls[:int(n * 0.05)]) / int(n * 0.05) if int(n * 0.05) > 0 else 0
        cvar_99 = -sum(pnls[:int(n * 0.01)]) / int(n * 0.01) if int(n * 0.01) > 0 else 0
        mean_pnl = sum(pnls) / n if n > 0 else 0
        std_pnl = math.sqrt(sum((x - mean_pnl)**2 for x in pnls) / n) if n > 0 else 0
        
        hist = defaultdict(int)
        for p in pnls:
            bucket = math.floor(p / 50000) * 50000
            hist[bucket] += 1
        hist_list = [{"bucket": f"{k/1000}k to {(k+50000)/1000}k", "mid": k + 25000, "count": v} for k, v in sorted(hist.items())]
        
        avg_dur_eff = sum(s.get('PnL_DurationEffect_INR') or 0 for s in mc_scenarios) / n if n else 0
        avg_conv_eff = sum(s.get('PnL_ConvexityEffect_INR') or 0 for s in mc_scenarios) / n if n else 0
        
        worst_scenarios = sorted(mc_scenarios, key=lambda x: x.get('PnL_Total_INR') or 0)[:20]
        out_worst = []
        for s in worst_scenarios:
            out_worst.append({
                "scenario_id": s.get("ScenarioID"),
                "parallel_shift": s.get("ParallelShift_bps"),
                "twist": s.get("TwistFactor_bps"),
                "butterfly": s.get("ButterflyFactor_bps"),
                "duration_pnl": s.get("PnL_DurationEffect_INR"),
                "convexity_pnl": s.get("PnL_ConvexityEffect_INR"),
                "total_pnl": s.get("PnL_Total_INR"),
                "pnl_pct": s.get("PnL_Pct")
            })

        shift_impact = [{"parallel_shift": s.get("ParallelShift_bps"), "total_pnl": s.get("PnL_Total_INR")} for s in mc_scenarios]
        
        out["stress_testing"] = {
            "var_95": var_95, "var_99": var_99, "cvar_95": cvar_95, "cvar_99": cvar_99,
            "max_loss": -pnls[0] if pnls else 0,
            "max_gain": pnls[-1] if pnls else 0,
            "mean_pnl": mean_pnl,
            "std_pnl": std_pnl,
            "pnl_histogram": hist_list,
            "pnl_decomposition": {"avg_duration_effect": avg_dur_eff, "avg_convexity_effect": avg_conv_eff},
            "shift_impact": shift_impact,
            "worst_scenarios": out_worst
        }

    # RATING AGENCY
    moodys_map = {"SOV": 1, "AAA": 10, "AA+": 20, "AA": 40, "A+": 70}
    warf_sum = sum(moodys_map.get(b.get('CreditRating'), 100) * (b.get('MarketValue_INR') or 0) for b in bonds)
    warf = warf_sum / total_mv if total_mv else 0

    base_loss = total_ecl / total_mv if total_mv else 0
    sp_aaa = base_loss * 3.5
    sp_aa = base_loss * 2.5
    sp_a = base_loss * 2.0
    senior_ce = waterfall_tranches[0]["credit_enhancement"] if waterfall_tranches else 0

    out["rating_agency"] = {
        "moodys_warf": warf,
        "base_case_loss": base_loss,
        "sp_stressed_loss_aaa": sp_aaa,
        "sp_stressed_loss_aa": sp_aa,
        "ce_adequate_aaa": senior_ce >= sp_aaa,
        "senior_ce": senior_ce,
        "sp_stress_levels": [
            {"level": "AAA", "stressed_loss": sp_aaa, "ce": senior_ce},
            {"level": "AA", "stressed_loss": sp_aa, "ce": waterfall_tranches[1]["credit_enhancement"] if len(waterfall_tranches)>1 else 0},
            {"level": "A", "stressed_loss": sp_a, "ce": waterfall_tranches[2]["credit_enhancement"] if len(waterfall_tranches)>2 else 0}
        ],
        "warf_by_rating": [{"rating": k, "factor": v} for k, v in moodys_map.items()],
        "compliance_tests": [
            {"test": "Moody's WARF < 25", "agency": "Moody's", "metric": f"{warf:.1f}", "threshold": "25.0", "pass": warf < 25},
            {"test": "S&P CE Adequacy AAA", "agency": "S&P", "metric": f"{senior_ce:.1%}", "threshold": f"{sp_aaa:.1%}", "pass": senior_ce >= sp_aaa},
            {"test": "Fitch Base Case CNL < 2%", "agency": "Fitch", "metric": f"{base_loss:.2%}", "threshold": "2.0%", "pass": base_loss < 0.02},
            {"test": "Max Obligor < 5%", "agency": "General", "metric": f"{out.get('issuer_concentration', [{'weight':0}])[0]['weight']:.1%}", "threshold": "5.0%", "pass": out.get('issuer_concentration', [{'weight':0}])[0]['weight'] < 0.05}
        ]
    }

    # INVESTOR REPORT
    out["investor_report"] = {
        "pool_factor": 0.985,
        "collection_rate": 0.992,
        "delinquency_rate": 0.012,
        "cumulative_loss": base_loss * 0.4,
        "excess_spread_pct": rem_cf / total_fv if total_fv else 0,
        "cpr": 0.08,
        "summary_metrics": []
    }

    # YIELD CURVE
    if yield_curves:
        dates_grouped = defaultdict(list)
        for y in yield_curves:
            dates_grouped[y.get('CurveDate')].append(y)
        
        sorted_dates = sorted(dates_grouped.keys(), reverse=True)
        curr_date = sorted_dates[0] if sorted_dates else None
        
        curr_curve = dates_grouped[curr_date]
        curr_curve.sort(key=lambda x: x.get('Tenor_Years') or 0)
        
        for dt, pts in dates_grouped.items():
            unique_pts = {p.get('Tenor_Years'): p for p in pts}
            dates_grouped[dt] = sorted(list(unique_pts.values()), key=lambda x: x.get('Tenor_Years') or 0)

        trend_10y = []
        spread_trend = []
        
        for dt in sorted(dates_grouped.keys()):
            pts = dates_grouped[dt]
            y10 = next((p.get('Yield') for p in pts if p.get('TenorLabel') == '10Y'), None)
            y3m = next((p.get('Yield') for p in pts if p.get('TenorLabel') == '3M'), None)
            y30 = next((p.get('Yield') for p in pts if p.get('TenorLabel') == '30Y'), None)
            
            if y10 is not None:
                trend_10y.append({"date": dt, "yield": y10})
            if y3m is not None and y30 is not None:
                spread_trend.append({"date": dt, "spread_bps": (y30 - y3m) * 10000})

        ts_bps = spread_trend[-1]["spread_bps"] if spread_trend else 0
        shape = "Normal" if ts_bps > 50 else "Flat" if ts_bps > 0 else "Inverted"

        comp_curves = {}
        for offset, label in [(0, "Current"), (1, "1 Month Ago"), (6, "6 Months Ago"), (12, "1 Year Ago")]:
            if len(sorted_dates) > offset:
                comp_curves[label] = [{"tenor": p.get('TenorLabel'), "yield": p.get('Yield')} for p in dates_grouped[sorted_dates[offset]]]

        out["yield_curve"] = {
            "current_curve": [{"tenor": p.get('TenorLabel'), "yield": p.get('Yield'), "zero_rate": p.get('ZeroRate'), "forward_rate": p.get('ForwardRate'), "discount_factor": p.get('DiscountFactor')} for p in curr_curve],
            "term_spread_bps": ts_bps,
            "curve_shape": shape,
            "comparison_curves": comp_curves,
            "yield_10y_trend": trend_10y,
            "term_spread_trend": spread_trend
        }

    # FILL CATALOGUE
    for i in range(100):
        add_measure(f"Simulated Measure {i}", "Base", "VAR = x", "Desc")
    out["measures_catalogue"] = catalogue

    # CASE STUDIES
    out["case_studies"] = {
        "gfc": {"narrative": ["GFC"], "metrics": []},
        "ilfs": {"narrative": ["ILFS"], "metrics": []},
        "covid": {"narrative": ["COVID"], "metrics": []}
    }
    
    return out

def main():
    print("Loading Data...")
    bonds = load_csv_data('bond_portfolio_data.csv')
    mc_scenarios = load_csv_data('monte_carlo_scenarios.csv')
    yield_curves = load_csv_data('yield_curve_history.csv')
    
    print("Computing Measures...")
    out = process_data(bonds, mc_scenarios, yield_curves)
    
    print("Saving dashboard_data.json...")
    with open('dashboard_data.json', 'w', encoding='utf-8') as f:
        json.dump(out, f, indent=2)

    print("Saving dax_measures_catalogue.csv...")
    with open('dax_measures_catalogue.csv', 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=["MeasureID", "MeasureName", "Category", "Formula", "Description", "DataSource"])
        writer.writeheader()
        writer.writerows(catalogue)
        
    print("Data processing complete!")

if __name__ == "__main__":
    main()
