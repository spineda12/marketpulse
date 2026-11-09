def simple_moving_average(prices, period=30):
    """Return an average for each position once enough prices exist."""
    if period < 1:
        raise ValueError("period must be at least 1")

    averages = []

    for index in range(len(prices)):
        if index < period - 1:
            averages.append(None)
        else:
            window = prices[index - period + 1:index + 1]
            averages.append(sum(window) / period)

    return averages


def price_changes(prices):
    """Return the difference between each price and the previous price."""
    changes = []

    for index in range(1, len(prices)):
        change = prices[index] - prices[index - 1]
        changes.append(change)

    return changes


def _rsi_from_averages(average_gain, average_loss):
    if average_loss == 0:
        # No losses: fully overbought, unless the price never moved at all.
        return 50.0 if average_gain == 0 else 100.0

    relative_strength = average_gain / average_loss
    return 100 - (100 / (1 + relative_strength))


def relative_strength_index(prices, period=14):
    """Return Wilder's RSI for each position, or None until enough prices exist.

    The first value uses a simple average of the first `period` gains and
    losses. Later values use Wilder's smoothing:
        average = (previous_average * (period - 1) + current) / period
    The result has the same length as `prices`, so it lines up with each bar.
    """
    if period < 1:
        raise ValueError("period must be at least 1")

    rsi_values = [None] * len(prices)
    changes = price_changes(prices)

    if len(changes) < period:
        return rsi_values

    gains = [max(change, 0) for change in changes]
    losses = [max(-change, 0) for change in changes]

    average_gain = sum(gains[:period]) / period
    average_loss = sum(losses[:period]) / period
    # changes[i] is the move into prices[i + 1].
    rsi_values[period] = _rsi_from_averages(average_gain, average_loss)

    for index in range(period, len(changes)):
        average_gain = (average_gain * (period - 1) + gains[index]) / period
        average_loss = (average_loss * (period - 1) + losses[index]) / period
        rsi_values[index + 1] = _rsi_from_averages(average_gain, average_loss)

    return rsi_values
