# Securitisation Dashboard


## Description

This project is a web-based dashboard developed for analysing securitisation portfolio data. It processes financial datasets, performs risk assessment, stress testing, and portfolio analysis using Python, while providing interactive visualizations through a responsive web interface.

## Technologies Used
- Python
- JavaScript
- HTML
- CSS
- Docker

## Project Structure
- **data_processor.py**: The core analytical engine. Processes bond portfolios, yield curves, and Monte Carlo scenarios to compute 100+ securitisation metrics.
- **index.html / app.js / index.css**: The 10-tab front-end web application providing interactive visualizations via Chart.js.
- **dashboard_data.json**: The generated output from the Python engine powering the web app.
- **dax_measures_catalogue.csv**: The catalogue of over 100 DAX-equivalent measures modeled in Python.
- **Technical_Report.md**: Detailed methodology and architecture overview.

## Setup & Execution

### 1. Running with Docker (Recommended)
This repository contains a full Docker configuration ensuring the dashboard starts without errors.
To serve the application via Docker:
```bash
docker-compose up -d
```
The application will be available at: **http://localhost:8080**

### 2. Generating Data Locally (Python)
If you wish to recalculate the analytical model or run tests:
```bash
# Install testing dependencies
pip install pytest pytest-cov

# Run the test suite (Guarantees >60% coverage)
pytest --cov=data_processor test_data_processor.py

# Execute the processor to generate JSON and CSV outputs
python data_processor.py
```

## Features Delivered
- **IFRS 9 ECL**: Credit impairment tracking by stage.
- **Stress Testing**: 1000-scenario Monte Carlo VaR/CVaR.
- **Waterfall Cash Flows**: 4-Tranche sequential modeling with OC/IC tests.
- **Risk Arena**: Interactive gamified learning tiers.
- **Case Studies**: In-depth post-mortem analyses of the GFC, IL&FS, and COVID-19.

**Author**:dileep
**Date**: may 2026
