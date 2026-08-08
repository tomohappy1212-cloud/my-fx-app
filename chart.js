const API_URL =
  "https://script.google.com/macros/s/AKfycbwh5D_62VC0fGY4PdgUyYNbp1lRPqbw2AcNgr8GQCNXeLLLYKcTnBLhxkK_XLgzROfjvw/exec";

const canvas = document.getElementById("chartCanvas");
const ctx = canvas.getContext("2d");

const chartScroll =
  document.getElementById("chartScroll");

const priceAxis =
  document.getElementById("priceAxis");

const loadButton =
  document.getElementById("loadButton");

const clearLineButton =
  document.getElementById("clearLineButton");

let candles = [];
let trendlinePoints = [];
let timer = null;

const PRICE_STEP = 0.5;
const CANDLE_WIDTH = 13;
const VISIBLE_CANDLES = 90;

const CHART_HEIGHT = 520;
const TOP = 20;
const BOTTOM = 35;

if (loadButton) {
  loadButton.addEventListener(
    "click",
    loadData
  );
}

if (clearLineButton) {
  clearLineButton.addEventListener(
    "click",
    () => {
      trendlinePoints = [];
      setMessage("待機中");
      drawChart();
    }
  );
}

async function loadData() {
  setStatus("取得中", false);
  setMessage("データ取得中...");

  try {
    const response = await fetch(
      API_URL +
      "?pair=USDJPY&t=" +
      Date.now(),
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

    const raw =
      extractData(json);

    const normalized =
      normalizeCandles(raw);

    if (normalized.length < 5) {
      throw new Error(
        "価格データが取得できませんでした"
      );
    }

    candles = normalized;

    setStatus(
      "接続中",
      true
    );

    setMessage("更新完了");

    updateDashboard();
    drawChart();

    if (timer === null) {
      timer = setInterval(
        loadData,
        60000
      );
    }

  } catch (error) {
    console.error(error);

    setStatus(
      "エラー",
      false
    );

    setMessage(
      "データ更新エラー"
    );
  }
}

function extractData(json) {
  if (Array.isArray(json)) {
    return json;
  }

  if (
    json &&
    Array.isArray(json.data)
  ) {
    return json.data;
  }

  if (
    json &&
    Array.isArray(json.values)
  ) {
    return json.values;
  }

  if (
    json &&
    Array.isArray(json.candles)
  ) {
    return json.candles;
  }

  if (
    json &&
    json.data &&
    Array.isArray(json.data.values)
  ) {
    return json.data.values;
  }

  return [];
}

function normalizeCandles(data) {
  const result = [];

  for (const item of data) {
    let time;
    let open;
    let high;
    let low;
    let close;

    if (Array.isArray(item)) {
      time = item[0];
      open = Number(item[1]);
      high = Number(item[2]);
      low = Number(item[3]);
      close = Number(item[4]);
    } else if (
      item &&
      typeof item === "object"
    ) {
      time =
        item.datetime ??
        item.date ??
        item.time ??
        item.timestamp ??
        "";

      open = Number(
        item.open ??
        item.Open
      );

      high = Number(
        item.high ??
        item.High
      );

      low = Number(
        item.low ??
        item.Low
      );

      close = Number(
        item.close ??
        item.Close ??
        item.price ??
        item.Price
      );
    }

    if (
      Number.isFinite(open) &&
      Number.isFinite(high) &&
      Number.isFinite(low) &&
      Number.isFinite(close)
    ) {
      result.push({
        time: String(time),
        open,
        high,
        low,
        close
      });
    }
  }

  return result;
}

function updateDashboard() {
  if (!candles.length) {
    return;
  }

  const latest =
    candles[candles.length - 1];

  setText(
    "currentPrice",
    latest.close.toFixed(3)
  );

  const trend =
    calculateTrend();

  setText(
    "trend",
    trend
  );

  const rsi =
    calculateRSI();

  setText(
    "rsi",
    rsi === null
      ? "---"
      : rsi.toFixed(1)
  );

  const levels =
    calculateLevels();

  setText(
    "support",
    levels.support.toFixed(3)
  );

  setText(
    "resistance",
    levels.resistance.toFixed(3)
  );

  setText(
    "decision",
    calculateDecision(
      trend,
      rsi
    )
  );

  if (
    typeof getSignals ===
    "function"
  ) {
    const signals =
      getSignals(
        candles,
        rsi
      );

    renderSignals(signals);
  }

  if (
    typeof runBacktest ===
    "function"
  ) {
    const result =
      runBacktest(candles);

    setText(
      "signalCount",
      result.candidates
    );

    setText(
      "winCount",
      result.wins
    );

    setText(
      "lossCount",
      result.losses
    );

    setText(
      "winRate",
      result.rate.toFixed(1) +
      "%"
    );
  }

  if (
    typeof checkAlerts ===
    "function"
  ) {
    checkAlerts(
      latest.close,
      levels,
      trend
    );
  }
}

function calculateTrend() {
  if (candles.length < 10) {
    return "---";
  }

  const now =
    candles[candles.length - 1]
      .close;

  const old =
    candles[candles.length - 10]
      .close;

  const diff =
    now - old;

  if (diff > 0.03) {
    return "上昇";
  }

  if (diff < -0.03) {
    return "下降";
  }

  return "横ばい";
}

function calculateRSI() {
  return calculateRSIAt(
    candles.length - 1
  );
}

function calculateRSIAt(index) {
  const period = 14;

  if (index < period) {
    return null;
  }

  let gains = 0;
  let losses = 0;

  for (
    let i = index - period + 1;
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

  if (losses === 0) {
    return 100;
  }

  const rs =
    gains / losses;

  return 100 -
    100 / (1 + rs);
}

function calculateLevels() {
  const recent =
    candles.slice(-30);

  let support =
    Infinity;

  let resistance =
    -Infinity;

  for (const candle of recent) {
    support =
      Math.min(
        support,
        candle.low
      );

    resistance =
      Math.max(
        resistance,
        candle.high
      );
  }

  return {
    support,
    resistance
  };
}

function calculateDecision(
  trend,
  rsi
) {
  if (
    rsi !== null &&
    rsi <= 30
  ) {
    return "買い候補";
  }

  if (
    rsi !== null &&
    rsi >= 70
  ) {
    return "売り候補";
  }

  if (trend === "上昇") {
    return "上昇";
  }

  if (trend === "下降") {
    return "下降";
  }

  return "様子見";
}

function renderSignals(signals) {
  const box =
    document.getElementById(
      "signals"
    );

  if (!box) {
    return;
  }

  if (
    !signals ||
    signals.length === 0
  ) {
    box.textContent =
      "現在、強い反転候補なし";

    return;
  }

  box.innerHTML =
    signals
      .map(
        signal =>
          "<div>" +
          escapeHTML(signal) +
          "</div>"
      )
      .join("");
}

function drawChart() {
  if (!candles.length) {
    return;
  }

  const visible =
    candles.slice(
      -VISIBLE_CANDLES
    );

  const width =
    Math.max(
      700,
      visible.length *
      CANDLE_WIDTH
    );

  canvas.width = width;
  canvas.height = CHART_HEIGHT;

  ctx.clearRect(
    0,
    0,
    width,
    CHART_HEIGHT
  );

  const rawMin =
    Math.min(
      ...visible.map(
        c => c.low
      )
    );

  const rawMax =
    Math.max(
      ...visible.map(
        c => c.high
      )
    );

  let min =
    Math.floor(
      rawMin / PRICE_STEP
    ) * PRICE_STEP;

  let max =
    Math.ceil(
      rawMax / PRICE_STEP
    ) * PRICE_STEP;

  min -= PRICE_STEP;
  max += PRICE_STEP;

  const range =
    max - min || 1;

  const innerHeight =
    CHART_HEIGHT -
    TOP -
    BOTTOM;

  const priceToY =
    price =>
      TOP +
      (
        (max - price) /
        range
      ) *
      innerHeight;

  ctx.fillStyle =
    "#0a0d12";

  ctx.fillRect(
    0,
    0,
    width,
    CHART_HEIGHT
  );

  drawGrid(
    width,
    min,
    max,
    priceToY
  );

  visible.forEach(
    (candle, index) => {
      drawCandle(
        candle,
        index,
        priceToY
      );
    }
  );

  const current =
    candles[
      candles.length - 1
    ].close;

  drawCurrentPrice(
    width,
    current,
    priceToY
  );

  drawTrendline(
    visible,
    priceToY
  );

  drawTimeLabels(
    visible,
    width
  );

  drawPriceAxis(
    min,
    max,
    current,
    priceToY
  );
}

function drawGrid(
  width,
  min,
  max,
  priceToY
) {
  ctx.strokeStyle =
    "#202631";

  ctx.lineWidth = 1;

  for (
    let price = min;
    price <= max + 0.001;
    price += PRICE_STEP
  ) {
    const y =
      priceToY(price);

    ctx.beginPath();

    ctx.moveTo(
      0,
      y
    );

    ctx.lineTo(
      width,
      y
    );

    ctx.stroke();
  }
}

function drawCandle(
  candle,
  index,
  priceToY
) {
  const x =
    index *
    CANDLE_WIDTH +
    CANDLE_WIDTH / 2;

  const highY =
    priceToY(
      candle.high
    );

  const lowY =
    priceToY(
      candle.low
    );

  const openY =
    priceToY(
      candle.open
    );

  const closeY =
    priceToY(
      candle.close
    );

  const bullish =
    candle.close >=
    candle.open;

  const color =
    bullish
      ? "#38df8b"
      : "#ff6d6d";

  ctx.strokeStyle =
    color;

  ctx.fillStyle =
    color;

  ctx.lineWidth = 1;

  ctx.beginPath();

  ctx.moveTo(
    x,
    highY
  );

  ctx.lineTo(
    x,
    lowY
  );

  ctx.stroke();

  ctx.fillRect(
    x - 4,
    Math.min(
      openY,
      closeY
    ),
    8,
    Math.max(
      2,
      Math.abs(
        closeY -
        openY
      )
    )
  );
}

function drawCurrentPrice(
  width,
  current,
  priceToY
) {
  const y =
    priceToY(current);

  ctx.strokeStyle =
    "#e7c75a";

  ctx.setLineDash([
    6,
    5
  ]);

  ctx.beginPath();

  ctx.moveTo(
    0,
    y
  );

  ctx.lineTo(
    width,
    y
  );

  ctx.stroke();

  ctx.setLineDash([]);
}

function drawTrendline(
  visible,
  priceToY
) {
  if (
    trendlinePoints.length !== 2
  ) {
    return;
  }

  const start =
    trendlinePoints[0];

  const end =
    trendlinePoints[1];

  const firstIndex =
    candles.length -
    visible.length;

  const x1 =
    (
      start.index -
      firstIndex
    ) *
    CANDLE_WIDTH +
    CANDLE_WIDTH / 2;

  const x2 =
    (
      end.index -
      firstIndex
    ) *
    CANDLE_WIDTH +
    CANDLE_WIDTH / 2;

  const y1 =
    priceToY(
      start.price
    );

  const y2 =
    priceToY(
      end.price
    );

  ctx.strokeStyle =
    "#ffffff";

  ctx.lineWidth = 2;

  ctx.beginPath();

  ctx.moveTo(
    x1,
    y1
  );

  ctx.lineTo(
    x2,
    y2
  );

  ctx.stroke();
}

function drawTimeLabels(
  visible,
  width
) {
  ctx.fillStyle =
    "#707986";

  ctx.font =
    "11px Arial";

  const step =
    Math.max(
      1,
      Math.floor(
        visible.length / 6
      )
    );

  for (
    let i = 0;
    i < visible.length;
    i += step
  ) {
    const x =
      i *
      CANDLE_WIDTH;

    const value =
      visible[i].time;

    ctx.fillText(
      String(value).slice(-5),
      x,
      CHART_HEIGHT - 10
    );
  }
}

function drawPriceAxis(
  min,
  max,
  current,
  priceToY
) {
  if (!priceAxis) {
    return;
  }

  priceAxis.innerHTML = "";

  for (
    let price = min;
    price <= max + 0.001;
    price += PRICE_STEP
  ) {
    const y =
      priceToY(price);

    const grid =
      document.createElement(
        "div"
      );

    grid.className =
      "priceGrid";

    grid.style.top =
      y + "px";

    priceAxis.appendChild(
      grid
    );

    const label =
      document.createElement(
        "div"
      );

    label.className =
      "priceLabel";

    label.style.top =
      y + "px";

    label.textContent =
      price.toFixed(3);

    priceAxis.appendChild(
      label
    );
  }

  const currentY =
    priceToY(current);

  const currentLabel =
    document.createElement(
      "div"
    );

  currentLabel.className =
    "priceLabel current";

  currentLabel.style.top =
    currentY + "px";

  currentLabel.textContent =
    current.toFixed(3);

  priceAxis.appendChild(
    currentLabel
  );
}

canvas.addEventListener(
  "click",
  event => {
    if (!candles.length) {
      return;
    }

    const rect =
      canvas.getBoundingClientRect();

    const x =
      event.clientX -
      rect.left;

    const visibleCount =
      Math.min(
        candles.length,
        VISIBLE_CANDLES
      );

    const firstIndex =
      candles.length -
      visibleCount;

    const index =
      Math.floor(
        x / CANDLE_WIDTH
      );

    const actualIndex =
      firstIndex + index;

    if (
      actualIndex < 0 ||
      actualIndex >=
        candles.length
    ) {
      return;
    }

    trendlinePoints.push({
      index: actualIndex,
      price:
        candles[
          actualIndex
        ].close
    });

    if (
      trendlinePoints.length > 2
    ) {
      trendlinePoints.shift();
    }

    setMessage(
      trendlinePoints.length === 1
        ? "1点目を設定"
        : "トレンドライン設定済み"
    );

    drawChart();
  }
);

window.addEventListener(
  "resize",
  () => {
    if (candles.length) {
      drawChart();
    }
  }
);

function setText(
  id,
  value
) {
  const el =
    document.getElementById(id);

  if (el) {
    el.textContent =
      value;
  }
}

function setStatus(
  text,
  online
) {
  const el =
    document.getElementById(
      "marketStatus"
    );

  if (!el) {
    return;
  }

  el.textContent =
    text;

  el.className =
    online
      ? "status online"
      : "status";
}

function setMessage(
  text
) {
  const el =
    document.getElementById(
      "alertMessage"
    );

  if (el) {
    el.textContent =
      text;
  }
}

function escapeHTML(
  value
) {
  return String(value)
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    );
}
