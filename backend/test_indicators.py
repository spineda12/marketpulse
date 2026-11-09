import pytest

from indicators import (
    price_changes,
    relative_strength_index,
    simple_moving_average,
)

# Classic RSI example data (Wilder's method, as published by StockCharts).
# The published table rounds its running averages to 4 decimals, so values
# computed at full precision differ by up to ~0.07 early on.
REFERENCE_PRICES = [
    44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.10, 45.42, 45.84, 46.08,
    45.89, 46.03, 45.61, 46.28, 46.28, 46.00, 46.03, 46.41, 46.22, 45.64,
    46.21, 46.25, 45.71, 46.45, 45.78, 45.35, 44.03, 44.18, 44.22, 44.57,
    43.42, 42.66, 43.13,
]
REFERENCE_RSI = [
    70.53, 66.32, 66.55, 69.41, 66.36, 57.97, 62.93, 63.26, 56.06, 62.38,
    54.71, 50.42, 39.99, 41.46, 41.87, 45.46, 37.30, 33.08, 37.77,
]


def test_simple_moving_average():
    assert simple_moving_average([1, 2, 3, 4, 5], period=3) == [
        None, None, 2, 3, 4,
    ]


def test_simple_moving_average_rejects_bad_period():
    with pytest.raises(ValueError):
        simple_moving_average([1, 2, 3], period=0)


def test_price_changes():
    assert price_changes([10, 12, 11, 11]) == [2, -1, 0]
    assert price_changes([10]) == []
    assert price_changes([]) == []


def test_rsi_matches_reference_values():
    result = relative_strength_index(REFERENCE_PRICES, period=14)

    assert len(result) == len(REFERENCE_PRICES)
    assert result[:14] == [None] * 14
    assert result[14:] == pytest.approx(REFERENCE_RSI, abs=0.1)


def test_rsi_not_enough_prices():
    assert relative_strength_index([1, 2, 3], period=14) == [None, None, None]
    assert relative_strength_index([], period=14) == []


def test_rsi_only_gains_is_100():
    result = relative_strength_index(list(range(1, 20)), period=14)
    assert result[14:] == [100.0] * 5


def test_rsi_only_losses_is_0():
    result = relative_strength_index(list(range(20, 1, -1)), period=14)
    assert result[14:] == pytest.approx([0.0] * 5)


def test_rsi_flat_prices_is_50():
    result = relative_strength_index([10.0] * 16, period=14)
    assert result[14:] == [50.0, 50.0]


def test_rsi_stays_between_0_and_100():
    result = relative_strength_index(REFERENCE_PRICES, period=5)
    assert all(0 <= value <= 100 for value in result if value is not None)


def test_rsi_rejects_bad_period():
    with pytest.raises(ValueError):
        relative_strength_index([1, 2, 3], period=0)
