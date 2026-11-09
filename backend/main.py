from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import logging
import math

import yfinance as yf

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {"message": "MarketPulse API is running"}


@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/stocks/{symbol}/history")
def stock_history(symbol: str):
    symbol = symbol.strip().upper()

    companies = {
        "AAPL": "Apple Inc.",
        "MSFT": "Microsoft Corporation",
    }

    if symbol not in companies:
        raise HTTPException(
            status_code=404,
            detail="Supported symbols are AAPL and MSFT.",
        )

    try:
        history = yf.Ticker(symbol).history(
            period="6mo",
            interval="1d",
            auto_adjust=False,
            timeout=15,
        )
    except Exception:
        logging.exception("Price download failed for %s", symbol)
        raise HTTPException(
            status_code=502,
            detail="The market data provider is unavailable. Try again later.",
        )

    if history.empty:
        raise HTTPException(
            status_code=502,
            detail="The market data provider returned no prices.",
        )

    bars = []

    for timestamp, row in history.sort_index().iterrows():
        values = [
            float(row[column])
            for column in ["Open", "High", "Low", "Close", "Volume"]
        ]

        # Missing or infinite numbers cannot be sent as valid JSON.
        if not all(math.isfinite(value) for value in values):
            continue

        open_price, high, low, close, volume = values

        bars.append({
            "date": timestamp.strftime("%Y-%m-%d"),
            "open": open_price,
            "high": high,
            "low": low,
            "close": close,
            "volume": int(volume),
        })

    if not bars:
        raise HTTPException(
            status_code=502,
            detail="No usable price records were returned.",
        )
    for index, bar in enumerate(bars):
        if index < 29:
            bar["sma30"] = None
        else:
            window = bars[index -29:index +1]
            total = sum(item["close"] for item in window)
            bar["sma30"] = total / 30

    return {
        "symbol": symbol,
        "company_name": companies[symbol],
        "currency": "USD",
        "source": "yahoo_finance",
        "bars": bars,
    }