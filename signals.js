function getSignals(
  candles,
  rsi
) {
  const signals = [];

  if (
    !candles ||
    candles.length < 15
  ) {
    return signals;
  }

  const last =
    candles[
      candles.length - 1
    ];

  const previous =
    candles[
      candles.length - 2
    ];

  if (
    rsi !== null &&
    rsi <= 30 &&
    last.close >
      previous.close
  ) {
    signals.push(
      "🟢 RSI売られすぎからの反発候補"
    );
  }

  if (
    rsi !== null &&
    rsi >= 70 &&
    last.close <
      previous.close
  ) {
    signals.push(
      "🔴 RSI買われすぎからの反落候補"
    );
  }

  if (
    last.close >
    last.open
  ) {
    signals.push(
      "📈 現在足は陽線"
    );
  } else if (
    last.close <
    last.open
  ) {
    signals.push(
      "📉 現在足は陰線"
    );
  }

  return signals;
}


function runBacktest(
  candles
) {
  const result = {
    candidates: 0,
    wins: 0,
    losses: 0,
    rate: 0
  };

  if (
    !candles ||
    candles.length < 20
  ) {
    return result;
  }

  const futureBars = 3;

  for (
    let i = 14;
    i <
      candles.length -
      futureBars;
    i++
  ) {
    const rsi =
      calculateRSIForBacktest(
        candles,
        i
      );

    if (rsi === null) {
      continue;
    }

    const entry =
      candles[i].close;

    const future =
      candles[
        i + futureBars
      ].close;

    if (rsi <= 30) {
      result.candidates++;

      if (
        future > entry
      ) {
        result.wins++;
      } else {
        result.losses++;
      }
    }

    if (rsi >= 70) {
      result.candidates++;

      if (
        future < entry
      ) {
        result.wins++;
      } else {
        result.losses++;
      }
    }
  }

  if (
    result.candidates > 0
  ) {
    result.rate =
      result.wins /
      result.candidates *
      100;
  }

  return result;
}


function calculateRSIForBacktest(
  candles,
  index
) {
  const period = 14;

  if (
    index < period
  ) {
    return null;
  }

  let gains = 0;
  let losses = 0;

  for (
    let i =
      index -
      period +
      1;

    i <= index;

    i++
  ) {
    const change =
      candles[i].close -
      candles[i - 1].close;

    if (change > 0) {
      gains += change;
    } else {
      losses -= change;
    }
  }

  gains /= period;
  losses /= period;

  if (
    losses === 0
  ) {
    return 100;
  }

  const rs =
    gains / losses;

  return 100 -
    100 /
      (1 + rs);
}
