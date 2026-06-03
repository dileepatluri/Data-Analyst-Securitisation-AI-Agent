import pytest
from data_processor import load_csv_data, process_data, add_measure
import os

def test_add_measure():
    import data_processor
    data_processor.catalogue = []
    data_processor.measure_counter = 1
    add_measure("Test", "Cat", "Form", "Desc")
    assert len(data_processor.catalogue) == 1
    assert data_processor.catalogue[0]["MeasureName"] == "Test"

def test_load_csv_data(tmp_path):
    csv_file = tmp_path / "test.csv"
    csv_file.write_text("A,B,C\n1,2.5,True\n,text,False")
    
    data = load_csv_data(str(csv_file))
    assert len(data) == 2
    assert data[0]["A"] == 1
    assert data[0]["B"] == 2.5
    assert data[0]["C"] is True
    assert data[1]["A"] is None
    assert data[1]["C"] is False
    
    # Missing file
    assert load_csv_data(str(tmp_path / "missing.csv")) == []

def test_process_data():
    bonds = [
        {
            "BondID": "B001", "Issuer": "Gov", "Sector": "Sovereign", "CreditRating": "SOV",
            "FaceValue": 1000, "Quantity": 100, "MarketValue_INR": 105000,
            "YieldToMaturity": 0.05, "ModifiedDuration": 5.0, "MacaulayDuration": 5.2,
            "Convexity": 30.0, "DV01_Per100Face": 0.05, "CouponRate": 0.06,
            "YearsToMaturity": 5.5, "EffectiveDuration": 4.9, "EffectiveConvexity": 29.0,
            "OAS_bps": 10, "ZSpread_bps": 12, "KeyRateBucket": "5Y",
            "PriceChange_Up50bps": -2.5, "PriceChange_Dn50bps": 2.6,
            "PriceChange_Up100bps": -4.9, "PriceChange_Dn100bps": 5.2,
            "PriceChange_Up200bps": -9.5, "PriceChange_Dn200bps": 10.5
        },
        {
            "BondID": "B002", "Issuer": "Corp", "Sector": "Financial", "CreditRating": "AA",
            "FaceValue": 1000, "Quantity": 50, "MarketValue_INR": 48000,
            "YieldToMaturity": 0.08, "ModifiedDuration": 3.0, "MacaulayDuration": 3.2,
            "Convexity": 10.0, "DV01_Per100Face": 0.03, "CouponRate": 0.07,
            "YearsToMaturity": 3.0, "EffectiveDuration": 2.9, "EffectiveConvexity": 9.0,
            "OAS_bps": 150, "ZSpread_bps": 160, "KeyRateBucket": "3Y",
            "PriceChange_Up50bps": -1.5, "PriceChange_Dn50bps": 1.6,
            "PriceChange_Up100bps": -2.9, "PriceChange_Dn100bps": 3.2,
            "PriceChange_Up200bps": -5.5, "PriceChange_Dn200bps": 6.0
        }
    ]
    
    mc_scenarios = [
        {"ScenarioID": "S1", "PnL_Total_INR": -10000, "PnL_DurationEffect_INR": -9500, "PnL_ConvexityEffect_INR": -500, "ParallelShift_bps": 100},
        {"ScenarioID": "S2", "PnL_Total_INR": 5000, "PnL_DurationEffect_INR": 4800, "PnL_ConvexityEffect_INR": 200, "ParallelShift_bps": -50}
    ] * 50  # Create 100 scenarios for quantiles
    
    yield_curves = [
        {"CurveDate": "2024-10-31", "Tenor_Years": 0.25, "TenorLabel": "3M", "Yield": 0.05, "ZeroRate": 0.05, "ForwardRate": 0.05, "DiscountFactor": 0.99},
        {"CurveDate": "2024-10-31", "Tenor_Years": 10.0, "TenorLabel": "10Y", "Yield": 0.07, "ZeroRate": 0.07, "ForwardRate": 0.07, "DiscountFactor": 0.50},
        {"CurveDate": "2024-10-31", "Tenor_Years": 30.0, "TenorLabel": "30Y", "Yield": 0.08, "ZeroRate": 0.08, "ForwardRate": 0.08, "DiscountFactor": 0.10}
    ]
    
    out = process_data(bonds, mc_scenarios, yield_curves)
    
    # Assertions
    assert "portfolio_summary" in out
    assert out["portfolio_summary"]["total_market_value"] == 153000
    assert out["portfolio_summary"]["bond_count"] == 2
    
    assert "ifrs9_ecl" in out
    assert out["ifrs9_ecl"]["total_ecl"] > 0
    
    assert "waterfall" in out
    assert len(out["waterfall"]["tranches"]) == 4
    
    assert "stress_testing" in out
    assert "var_99" in out["stress_testing"]
    
    assert "rating_agency" in out
    
    assert "yield_curve" in out
    assert out["yield_curve"]["term_spread_bps"] == 300.0  # 8% - 5% = 3% = 300bps
