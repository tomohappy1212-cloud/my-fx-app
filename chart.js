/* =========================================================
   FX Vision AI
   USD/JPY 自動分析 - TradingView + Twelve Data
========================================================= */

const API_URL =
  "https://script.google.com/macros/s/AKfycbwuLrVsTdT_dn4OESp89wn_ic-G00C9mDwlvtDImuARKibkJtGigxfsRZWH6eeSX3-TCg/exec";

const UPDATE_INTERVAL = 120000; // 2分
const FORWARD_BARS = 3;

let marketData = [];
let updateTimer = null;
let isLoading = false;


/* =========================================================
   初期化
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

  setStatus("分析データ接続中", false);

  setText("alertMessage", "分析データ取得中");

  loadData();

  const loadButton =
    document.getElementById("loadButton");

  if (loadButton) {
    loadButton.addEventListener(
      "click",
      () => {
        loadData(true);
      }
    );
  }

  const clearButton =
    document.getElementById("clearLineButton");

  if (clearButton) {
    clearButton.addEventListener(
      "click",
      () => {
        setText(
          "alertMessage",
          "トレンドラインはTradingView側で操作してください"
        );
      }
    );
  }

});


/* =========================================================
   自動更新
========================================================= */

function startAutoUpdate() {

  if (updateTimer) {
    clearInterval(updateTimer);
  }

  updateTimer = setInterval(
    () => {
      loadData();
    },
    UPDATE_INTERVAL
  );
}


/* =========================================================
   データ取得
========================================================= */

async function loadData(manual = false) {

  if (isLoading) {
    return;
  }

  isLoading = true;

  if (manual) {
    setText(
      "alertMessage",
      "分析データを更新中..."
    );
  }

  try {

    const cacheBust =
      Date.now();

    const response =
      await fetch(
        API_URL +
        "?pair=USDJPY&_=" +
        cacheBust,
        {
          method: "GET",
          cache: "no-store"
        }
      );

    if (!response.ok) {
      throw new Error(
        "HTTP " + response.status
      );
    }

    const json =
      await response.json();

    const values =
      extractValues(json);

    if (!values || values.length < 20) {
      throw new Error(
        "分析に必要なデータが不足しています"
      );
    }

    marketData =
      normalizeData(values);

    if (marketData.length < 20) {
      throw new Error(
        "有効なUSD/JPYデータが不足しています"
      );
    }

    analyzeMarket(
      marketData
    );

    setStatus(
      "分析データ接続中",
      true
    );

    setText(
      "alertMessage",
      "最終更新: " +
      formatTime(new Date())
    );

    startAutoUpdate();

  } catch (error) {

    console.error(
      "FX data error:",
      error
    );

    setStatus(
      "分析データ取得エラー",
      false
    );

    setText(
      "alertMessage",
      "分析データ取得エラー"
    );

    setText(
      "analysisReason",
      "分析データを取得できませんでした。しばらくして再試行してください。"
    );

  } finally {

    isLoading = false;

  }

}


/* =========================================================
   APIレスポンス解析
========================================================= */

function extractValues(json) {

  if (!json) {
    return [];
  }

  if (Array.isArray(json)) {
    return json;
  }

  if (Array.isArray(json.values)) {
    return json.values;
  }

  if (Array.isArray(json.data)) {
    return json.data;
  }

  if (
    json.data &&
    Array.isArray(json.data.values)
  ) {
    return json.data.values;
  }

  return [];
}


/* =========================================================
   データ正規化
========================================================= */

function normalizeData(values) {

  const result = [];

  for (const item of values) {

    if (!item) {
      continue;
    }

    const datetime =
      item.datetime ??
      item.date ??
      item.time ??
      item.timestamp;

    const open =
      toNumber(
        item.open ??
        item.o
      );

    const high =
      toNumber(
        item.high ??
        item.h
      );

    const low =
      toNumber(
        item.low ??
        item.l
      );

    const close =
      toNumber(
        item.close ??
        item.c
      );

    if (
      !Number.isFinite(open) ||
      !Number.isFinite(high) ||
      !Number.isFinite(low) ||
      !Number.isFinite(close)
    ) {
      continue;
    }

    result.push({
      datetime,
      open,
      high,
      low,
      close
    });

  }

  result.sort(
    (a, b) => {

      const ta =
        new Date(a.datetime).getTime();

      const tb =
        new Date(b.datetime).getTime();

      return ta - tb;

    }
  );

  return result;
}


/* =========================================================
   自動分析
========================================================= */

function analyzeMarket(data) {

  const closes =
    data.map(
      item => item.close
    );

  const current =
    closes[closes.length - 1];

  const emaFast =
    calculateEMA(
      closes,
      9
    );

  const emaSlow =
    calculateEMA(
      closes,
      21
    );

  const rsi =
    calculateRSI(
      closes,
      14
    );

  const fastNow =
    emaFast[emaFast.length - 1];

  const slowNow =
    emaSlow[emaSlow.length - 1];

  const rsiNow =
    rsi[rsi.length - 1];

  const previousFast =
    emaFast[emaFast.length - 2];

  const previousSlow =
    emaSlow[emaSlow.length - 2];


  let trend =
    "レンジ";

  if (
    fastNow > slowNow &&
    current > fastNow
  ) {

    trend = "上昇";

  } else if (
    fastNow < slowNow &&
    current < fastNow
  ) {

    trend = "下降";

  }


  let decision =
    "様子見";

  let score =
    50;

  if (trend === "上昇") {

    score += 18;

  }

  if (trend === "下降") {

    score += 18;

  }


  if (
    rsiNow >= 50 &&
    rsiNow <= 68 &&
    trend === "上昇"
  ) {

    score += 12;

  }


  if (
    rsiNow <= 50 &&
    rsiNow >= 32 &&
    trend === "下降"
  ) {

    score += 12;

  }


  if (
    rsiNow > 72 &&
    trend === "上昇"
  ) {

    score -= 12;

  }


  if (
    rsiNow < 28 &&
    trend === "下降"
  ) {

    score -= 12;

  }


  const bullishCross =
    previousFast <= previousSlow &&
    fastNow > slowNow;

  const bearishCross =
    previousFast >= previousSlow &&
    fastNow < slowNow;


  if (bullishCross) {

    score += 10;

  }

  if (bearishCross) {

    score += 10;

  }


  if (
    trend === "上昇" &&
    score >= 65
  ) {

    decision = "買い";

  } else if (
    trend === "下降" &&
    score >= 65
  ) {

    decision = "売り";

  }


  score =
    Math.max(
      50,
      Math.min(
        90,
        Math.round(score)
      )
    );


  const historical =
    calculateHistoricalAccuracy(
      data
    );


  const winRate =
    historical.confidence;


  const support =
    calculateSupport(
      data
    );

  const resistance =
    calculateResistance(
      data
    );


  updateDashboard({
    current,
    trend,
    rsi: rsiNow,
    decision,
    winRate,
    support,
    resistance,
    reason:
      buildReason(
        trend,
        rsiNow,
        decision,
        bullishCross,
        bearishCross,
        score
      )
  });

}


/* =========================================================
   ダッシュボード更新
========================================================= */

function updateDashboard(result) {

  setText(
    "currentPrice",
    result.current.toFixed(3)
  );

  setText(
    "trend",
    result.trend
  );

  setText(
    "rsi",
    result.rsi.toFixed(1)
  );

  setText(
    "decision",
    result.decision
  );

  setText(
    "analysisWinRate",
    result.winRate + "%"
  );

  setText(
    "analysisDecision",
    result.decision
  );

  setText(
    "analysisReason",
    result.reason
  );

  setText(
    "support",
    result.support.toFixed(3)
  );

  setText(
    "resistance",
    result.resistance.toFixed(3)
  );

}


/* =========================================================
   根拠1文
========================================================= */

function buildReason(
  trend,
  rsi,
  decision,
  bullishCross,
  bearishCross,
  score
) {

  if (decision === "買い") {

    if (bullishCross) {

      return (
        "短期EMAが長期EMAを上抜け、上昇トレンドとRSIの状態が買い方向に一致しています。"
      );

    }

    return (
      "価格がEMA上で推移し上昇トレンドが優勢で、RSIも買い方向を支持しています。"
    );

  }


  if (decision === "売り") {

    if (bearishCross) {

      return (
        "短期EMAが長期EMAを下抜け、下降トレンドとRSIの状態が売り方向に一致しています。"
      );

    }

    return (
      "価格がEMA下で推移し下降トレンドが優勢で、RSIも売り方向を支持しています。"
    );

  }


  if (rsi > 70) {

    return (
      "上昇・下降の方向感はあるものの、RSIが高く過熱感があるため新規エントリーは慎重にします。"
    );

  }


  if (rsi < 30) {

    return (
      "方向感はあるものの、RSIが低く売られ過ぎの可能性があるため新規エントリーは慎重にします。"
    );

  }


  return (
    "トレンドとモメンタムの方向が十分に一致していないため、現時点では様子見と判断します。"
  );

}


/* =========================================================
   RSI
========================================================= */

function calculateRSI(
  closes,
  period
) {

  const result =
    new Array(
      closes.length
    ).fill(null);

  if (
    closes.length <= period
  ) {
    return result;
  }

  let gain = 0;
  let loss = 0;


  for (
    let i = 1;
    i <= period;
    i++
  ) {

    const diff =
      closes[i] -
      closes[i - 1];

    if (diff >= 0) {

      gain += diff;

    } else {

      loss -= diff;

    }

  }


  gain /= period;
  loss /= period;


  result[period] =
    rsiValue(
      gain,
      loss
    );


  for (
    let i = period + 1;
    i < closes.length;
    i++
  ) {

    const diff =
      closes[i] -
      closes[i - 1];

    const currentGain =
      diff > 0
        ? diff
        : 0;

    const currentLoss =
      diff < 0
        ? -diff
        : 0;

    gain =
      (
        gain *
        (period - 1) +
        currentGain
      ) / period;

    loss =
      (
        loss *
        (period - 1) +
        currentLoss
      ) / period;

    result[i] =
      rsiValue(
        gain,
        loss
      );

  }


  return result;
}


function rsiValue(
  gain,
  loss
) {

  if (loss === 0) {
    return 100;
  }

  const rs =
    gain / loss;

  return (
    100 -
    100 / (1 + rs)
  );

}


/* =========================================================
   EMA
========================================================= */

function calculateEMA(
  values,
  period
) {

  const result =
    new Array(
      values.length
    ).fill(null);

  if (
    values.length === 0
  ) {
    return result;
  }


  const multiplier =
    2 / (period + 1);


  let ema =
    values[0];

  result[0] =
    ema;


  for (
    let i = 1;
    i < values.length;
    i++
  ) {

    ema =
      (
        values[i] -
        ema
      ) *
      multiplier +
      ema;

    result[i] =
      ema;

  }


  return result;
}


/* =========================================================
   過去条件一致率
========================================================= */

function calculateHistoricalAccuracy(
  data
) {

  if (
    data.length <
    60
  ) {

    return {
      confidence: 50
    };

  }


  const closes =
    data.map(
      item => item.close
    );

  let total =
    0;

  let wins =
    0;


  for (
    let i = 30;
    i < data.length - FORWARD_BARS;
    i++
  ) {

    const slice =
      closes.slice(
        0,
        i + 1
      );

    const fast =
      calculateEMA(
        slice,
        9
      );

    const slow =
      calculateEMA(
        slice,
        21
      );

    const rsi =
      calculateRSI(
        slice,
        14
      );


    const fastNow =
      fast[fast.length - 1];

    const slowNow =
      slow[slow.length - 1];

    const rsiNow =
      rsi[rsi.length - 1];

    let direction =
      null;


    if (
      fastNow > slowNow &&
      rsiNow >= 52 &&
      rsiNow <= 68
    ) {

      direction =
        "BUY";

    } else if (
      fastNow < slowNow &&
      rsiNow <= 48 &&
      rsiNow >= 32
    ) {

      direction =
        "SELL";

    }


    if (!direction) {
      continue;
    }


    total++;


    const entry =
      closes[i];

    const future =
      closes[
        i + FORWARD_BARS
      ];


    if (
      direction === "BUY" &&
      future > entry
    ) {

      wins++;

    }


    if (
      direction === "SELL" &&
      future < entry
    ) {

      wins++;

    }

  }


  if (total < 5) {

    return {
      confidence: 50
    };

  }


  return {
    confidence:
      Math.round(
        (
          wins /
          total
        ) * 100
      )
  };

}


/* =========================================================
   サポート
========================================================= */

function calculateSupport(
  data
) {

  const recent =
    data.slice(
      -30
    );

  return Math.min(
    ...recent.map(
      item => item.low
    )
  );

}


/* =========================================================
   レジスタンス
========================================================= */

function calculateResistance(
  data
) {

  const recent =
    data.slice(
      -30
    );

  return Math.max(
    ...recent.map(
      item => item.high
    )
  );

}


/* =========================================================
   数値変換
========================================================= */

function toNumber(
  value
) {

  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : NaN;

}


/* =========================================================
   UIヘルパー
========================================================= */

function setText(
  id,
  value
) {

  const element =
    document.getElementById(
      id
    );

  if (!element) {
    return;
  }

  element.textContent =
    value;

}


function setStatus(
  text,
  online
) {

  const element =
    document.getElementById(
      "marketStatus"
    );

  if (!element) {
    return;
  }

  element.textContent =
    text;

  if (online) {

    element.classList.add(
      "online"
    );

  } else {

    element.classList.remove(
      "online"
    );

  }

}


function formatTime(
  date
) {

  return date.toLocaleTimeString(
    "ja-JP",
    {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }
  );

}
