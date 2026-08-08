function calculateRSI(candles, period = 14) {
  if (candles.length <= period) return null;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = candles[i].close - candles[i - 1].close;

    if (change >= 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }

  let averageGain = gains / period;
  let averageLoss = losses / period;

  for (let i = period + 1; i < candles.length; i++) {
    const change = candles[i].close - candles[i - 1].close;

    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    averageGain =
      ((averageGain * (period - 1)) + gain) / period;

    averageLoss =
      ((averageLoss * (period - 1)) + loss) / period;
  }

  if (averageLoss === 0) return 100;

  const rs = averageGain / averageLoss;

  return 100 - (100 / (1 + rs));
}


function detectTrend(candles) {
  if (candles.length < 20) {
    return "判定不能";
  }

  const recent = candles.slice(-20);

  const first = recent[0].close;
  const last = recent[recent.length - 1].close;

  const change = last - first;

  if (change > 0.08) return "上昇";
  if (change < -0.08) return "下降";

  return "横ばい";
}


function calculateLevels(candles) {
  const recent = candles.slice(-30);

  const highs = recent.map(x => x.high);
  const lows = recent.map(x => x.low);

  return {
    support: Math.min(...lows),
    resistance: Math.max(...highs)
  };
}


function findReversalSignals(candles) {
  const signals = [];

  for (let i = 2; i < candles.length - 2; i++) {

    const a = candles[i - 2];
    const b = candles[i - 1];
    const c = candles[i];
    const d = candles[i + 1];
    const e = candles[i + 2];

    if (
      c.low < a.low &&
      c.low < b.low &&
      d.close > c.close &&
      e.close > d.close
    ) {
      signals.push({
        type: "buy",
        datetime: c.datetime,
        price: c.close,
        move: e.close - c.close
      });
    }

    if (
      c.high > a.high &&
      c.high > b.high &&
      d.close < c.close &&
      e.close < d.close
    ) {
      signals.push({
        type: "sell",
        datetime: c.datetime,
        price: c.close,
        move: c.close - e.close
      });
    }
  }

  return signals;
}


function calculateDecision(
  trend,
  rsi,
  price,
  support,
  resistance
) {
  if (rsi === null) {
    return "見送り";
  }

  let buyScore = 0;
  let sellScore = 0;

  if (trend === "上昇") {
    buyScore++;
  }

  if (trend === "下降") {
    sellScore++;
  }

  if (rsi < 30) {
    buyScore += 2;
  }

  if (rsi > 70) {
    sellScore += 2;
  }

  const supportDistance =
    Math.abs(price - support);

  const resistanceDistance =
    Math.abs(resistance - price);

  if (supportDistance < 0.05) {
    buyScore += 2;
  }

  if (resistanceDistance < 0.05) {
    sellScore += 2;
  }

  if (
    buyScore >= 3 &&
    buyScore > sellScore
  ) {
    return "買い候補";
  }

  if (
    sellScore >= 3 &&
    sellScore > buyScore
  ) {
    return "売り候補";
  }

  return "見送り";
}


function runBacktest(signals) {
  let wins = 0;
  let losses = 0;

  signals.forEach(signal => {
    if (signal.move >= 0.10) {
      wins++;
    } else {
      losses++;
    }
  });

  const total = wins + losses;

  const rate =
    total > 0
      ? (wins / total) * 100
      : 0;

  return {
    total,
    wins,
    losses,
    rate
  };
}
