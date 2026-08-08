const API_URL =
  "https://script.google.com/macros/s/AKfycbwh5D_62VC0fGY4PdgUyYNbp1lRPqbw2AcNgr8GQCNXeLLLYKcTnBLhxkK_XLgzROfjvw/exec";

const canvas = document.getElementById("chartCanvas");
const ctx = canvas.getContext("2d");

const chartScroll = document.getElementById("chartScroll");
const priceAxis = document.getElementById("priceAxis");

let candles = [];
let trendlinePoints = [];
let updateTimer = null;

const VISIBLE_CANDLES = 80;
const CANDLE_WIDTH = 13;

const TOP = 18;
const BOTTOM = 34;

const PRICE_STEP = 0.5;


/* ========================================
   データ更新
======================================== */

document
  .getElementById("loadButton")
  .addEventListener("click", loadData);


async function loadData() {

  setStatus("取得中", false);

  try {

    const response = await fetch(
      API_URL + "?t=" + Date.now()
    );

    if (!response.ok) {
      throw new Error(
        "HTTP " + response.status
      );
    }

    const data = await response.json();

    if (
      !data ||
      !Array.isArray(data.values)
    ) {
      throw new Error(
        "価格データを取得できませんでした"
      );
    }

    candles = normalizeData(data.values);

    if (candles.length === 0) {
      throw new Error(
        "有効な価格データがありません"
      );
    }

    setStatus("接続中", true);

    updateDashboard();
    drawChart();

    startAutoUpdate();

  } catch (error) {

    console.error(error);

    setStatus("エラー", false);

    const message =
      document.getElementById("alertMessage");

    if (message) {
      message.textContent =
        "データ取得エラー";
    }

  }
}


/* ========================================
   データ整形
======================================== */

function normalizeData(values) {

  const result = [];

  for (const item of values) {

    if (!item) {
      continue;
    }

    const open = Number(item.open);
    const high = Number(item.high);
    const low = Number(item.low);
    const close = Number(item.close);

    if (
      Number.isFinite(open) &&
      Number.isFinite(high) &&
      Number.isFinite(low) &&
      Number.isFinite(close)
    ) {

      result.push({
        datetime: item.datetime || "",
        open: open,
        high: high,
        low: low,
        close: close
      });

    }

  }

  return result.reverse();
}


/* ========================================
   ステータス
======================================== */

function setStatus(text, online) {

  const status =
    document.getElementById("marketStatus");

  if (!status) {
    return;
  }

  status.textContent = text;

  status.className =
    online
      ? "status online"
      : "status";
}


/* ========================================
   自動更新
======================================== */

function startAutoUpdate() {

  if (updateTimer !== null) {
    return;
  }

  updateTimer = setInterval(
    loadData,
    60000
  );
}


/* ========================================
   ダッシュボード
======================================== */

function updateDashboard() {

  if (candles.length === 0) {
    return;
  }

  const latest =
    candles[candles.length - 1];

  const current =
    latest.close;


  const currentPrice =
    document.getElementById(
      "currentPrice"
    );

  if (currentPrice) {
    currentPrice.textContent =
      current.toFixed(3);
  }


  /* トレンド */

  let trend = "---";

  if (candles.length >= 10) {

    const old =
      candles[
        candles.length - 10
      ].close;

    if (current > old) {
      trend = "上昇";
    }
    else if (current < old) {
      trend = "下降";
    }
    else {
      trend = "横ばい";
    }
  }


  const trendElement =
    document.getElementById(
      "trend"
    );

  if (trendElement) {
    trendElement.textContent =
      trend;
  }


  /* RSI */

  const rsi =
    calculateRSI();


  const rsiElement =
    document.getElementById(
      "rsi"
    );

  if (rsiElement) {

    rsiElement.textContent =
      rsi === null
        ? "---"
        : rsi.toFixed(1);

  }


  /* サポート・レジスタンス */

  const levels =
    calculateSupportResistance();


  const support =
    document.getElementById(
      "support"
    );

  if (support) {
    support.textContent =
      levels.support.toFixed(3);
  }


  const resistance =
    document.getElementById(
      "resistance"
    );

  if (resistance) {
    resistance.textContent =
      levels.resistance.toFixed(3);
  }


  /* 判定 */

  let decision = "様子見";

  if (
    rsi !== null &&
    rsi <= 30
  ) {
    decision = "買い候補";
  }
  else if (
    rsi !== null &&
    rsi >= 70
  ) {
    decision = "売り候補";
  }
  else if (trend === "上昇") {
    decision = "上昇";
  }
  else if (trend === "下降") {
    decision = "下降";
  }


  const decisionElement =
    document.getElementById(
      "decision"
    );

  if (decisionElement) {
    decisionElement.textContent =
      decision;
  }


  /* 反転候補 */

  const signals =
    findReversalSignals();


  showSignals(signals);


  const signalCount =
    document.getElementById(
      "signalCount"
    );

  if (signalCount) {
    signalCount.textContent =
      signals.length;
  }


  const winCount =
    document.getElementById(
      "winCount"
    );

  if (winCount) {
    winCount.textContent =
      "---";
  }


  const lossCount =
    document.getElementById(
      "lossCount"
    );

  if (lossCount) {
    lossCount.textContent =
      "---";
  }


  const winRate =
    document.getElementById(
      "winRate"
    );

  if (winRate) {
    winRate.textContent =
      "---";
  }


  checkTrendlineAlert(
    current
  );
}


/* ========================================
   反転候補表示
   ※今回追加した部分
======================================== */

function showSignals(signals) {

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
      .map(function(signal) {

        return (
          "<div>" +
          signal +
          "</div>"
        );

      })
      .join("");
}


/* ========================================
   RSI
======================================== */

function calculateRSI() {

  if (candles.length < 15) {
    return null;
  }

  const period = 14;

  let gain = 0;
  let loss = 0;


  for (
    let i =
      candles.length - period;
    i < candles.length;
    i++
  ) {

    const previous =
      candles[i - 1];

    const current =
      candles[i];

    const change =
      current.close -
      previous.close;


    if (change > 0) {
      gain += change;
    }
    else {
      loss -= change;
    }
  }


  gain /= period;
  loss /= period;


  if (loss === 0) {
    return 100;
  }


  const rs =
    gain / loss;


  return 100 -
    (
      100 /
      (1 + rs)
    );
}


/* ========================================
   サポート・レジスタンス
======================================== */

function calculateSupportResistance() {

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
    support: support,
    resistance: resistance
  };
}


/* ========================================
   反転候補判定
======================================== */

function findReversalSignals() {

  if (candles.length < 5) {
    return [];
  }


  const result = [];


  const latest =
    candles[
      candles.length - 1
    ];


  const previous =
    candles[
      candles.length - 2
    ];


  const rsi =
    calculateRSI();


  if (
    rsi !== null &&
    rsi <= 30 &&
    latest.close >
    previous.close
  ) {

    result.push(
      "🟢 RSI売られすぎからの反発候補"
    );
  }


  if (
    rsi !== null &&
    rsi >= 70 &&
    latest.close <
    previous.close
  ) {

    result.push(
      "🔴 RSI買われすぎからの反落候補"
    );
  }


  return result;
}


/* ========================================
   チャート描画
======================================== */

function drawChart() {

  if (candles.length === 0) {
    return;
  }


  const visible =
    candles.slice(
      -VISIBLE_CANDLES
    );


  const chartWidth =
    Math.max(
      500,
      visible.length *
      CANDLE_WIDTH
    );


  const chartHeight =
    chartScroll.clientHeight ||
    520;


  canvas.width =
    chartWidth;

  canvas.height =
    chartHeight;


  ctx.clearRect(
    0,
    0,
    chartWidth,
    chartHeight
  );


  ctx.fillStyle =
    "#0a0d12";


  ctx.fillRect(
    0,
    0,
    chartWidth,
    chartHeight
  );


  /* 価格範囲 */

  let rawMin =
    Math.min(
      ...visible.map(
        function(c) {
          return c.low;
        }
      )
    );


  let rawMax =
    Math.max(
      ...visible.map(
        function(c) {
          return c.high;
        }
      )
    );


  let min =
    Math.floor(
      rawMin /
      PRICE_STEP
    ) *
    PRICE_STEP;


  let max =
    Math.ceil(
      rawMax /
      PRICE_STEP
    ) *
    PRICE_STEP;


  min -= PRICE_STEP;
  max += PRICE_STEP;


  const range =
    max - min;


  const innerHeight =
    chartHeight -
    TOP -
    BOTTOM;


  function priceToY(price) {

    return (
      TOP +
      (
        max - price
      ) /
      range *
      innerHeight
    );
  }


  function candleX(index) {

    return (
      index *
      CANDLE_WIDTH +
      CANDLE_WIDTH / 2
    );
  }


  /* 横グリッド */

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
      chartWidth,
      y
    );

    ctx.stroke();
  }


  /* ローソク足 */

  visible.forEach(
    function(candle, index) {

      const x =
        candleX(index);


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


      ctx.strokeStyle =
        bullish
          ? "#35d98b"
          : "#ff5f67";


      ctx.lineWidth =
        1.5;


      /* ヒゲ */

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


      /* 本体 */

      ctx.fillStyle =
        bullish
          ? "#35d98b"
          : "#ff5f67";


      const top =
        Math.min(
          openY,
          closeY
        );


      const height =
        Math.max(
          3,
          Math.abs(
            openY -
            closeY
          )
        );


      ctx.fillRect(
        x - 4,
        top,
        8,
        height
      );

    }
  );


  /* 現在値ライン */

  const current =
    candles[
      candles.length - 1
    ].close;


  const currentY =
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
    currentY
  );

  ctx.lineTo(
    chartWidth,
    currentY
  );

  ctx.stroke();


  ctx.setLineDash([]);


  /* トレンドライン */

  if (
    trendlinePoints.length === 2
  ) {

    const start =
      trendlinePoints[0];

    const end =
      trendlinePoints[1];


    const visibleStart =
      candles.length -
      visible.length;


    const x1 =
      candleX(
        start.index -
        visibleStart
      );


    const x2 =
      candleX(
        end.index -
        visibleStart
      );


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


    /* 右端まで延長 */

    if (
      end.index !==
      start.index
    ) {

      const latestIndex =
        candles.length - 1;


      const slope =
        (
          end.price -
          start.price
        ) /
        (
          end.index -
          start.index
        );


      const futurePrice =
        start.price +
        slope *
        (
          latestIndex -
          start.index
        );


      const futureY =
        priceToY(
          futurePrice
        );


      ctx.beginPath();

      ctx.moveTo(
        x2,
        y2
      );

      ctx.lineTo(
        candleX(
          visible.length - 1
        ),
        futureY
      );

      ctx.stroke();
    }
  }


  /* 固定価格軸 */

  drawPriceAxis(
    min,
    max,
    current,
    priceToY,
    chartHeight
  );


  /* 時間表示 */

  ctx.fillStyle =
    "#707986";


  ctx.font =
    "11px Arial";


  const labelStep =
    Math.max(
      1,
      Math.floor(
        visible.length / 6
      )
    );


  for (
    let i = 0;
    i < visible.length;
    i += labelStep
  ) {

    const candle =
      visible[i];


    const label =
      String(
        candle.datetime || ""
      ).slice(-5);


    ctx.fillText(
      label,
      candleX(i) - 15,
      chartHeight - 10
    );
  }
}


/* ========================================
   固定価格軸
   0.5円刻み
======================================== */

function drawPriceAxis(
  min,
  max,
  current,
  priceToY,
  chartHeight
) {

  priceAxis.innerHTML = "";


  for (
    let price = min;
    price <= max + 0.001;
    price += PRICE_STEP
  ) {

    const y =
      priceToY(price);


    /* グリッド */

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


    /* 価格 */

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


  /* 現在値 */

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


/* ========================================
   トレンドライン設定
======================================== */

canvas.addEventListener(
  "click",
  function(event) {

    if (candles.length === 0) {
      return;
    }


    const rect =
      canvas.getBoundingClientRect();


    const x =
      event.clientX -
      rect.left;


    const index =
      Math.floor(
        x /
        CANDLE_WIDTH
      );


    const visibleStart =
      candles.length -
      Math.min(
        candles.length,
        VISIBLE_CANDLES
      );


    const actualIndex =
      visibleStart +
      index;


    if (
      actualIndex < 0 ||
      actualIndex >= candles.length
    ) {
      return;
    }


    const candle =
      candles[
        actualIndex
      ];


    trendlinePoints.push({

      index:
        actualIndex,

      price:
        candle.close

    });


    if (
      trendlinePoints.length > 2
    ) {

      trendlinePoints.shift();

    }


    const message =
      document.getElementById(
        "alertMessage"
      );


    if (
      trendlinePoints.length === 2
    ) {

      if (message) {
        message.textContent =
          "トレンドライン設定済み";
      }

    }
    else {

      if (message) {
        message.textContent =
          "1点目を設定しました";
      }

    }


    drawChart();

    updateDashboard();

  }
);


/* ========================================
   ライン削除
======================================== */

document
  .getElementById(
    "clearLineButton"
  )
  .addEventListener(
    "click",
    function() {

      trendlinePoints = [];


      const message =
        document.getElementById(
          "alertMessage"
        );


      if (message) {
        message.textContent =
          "待機中";
      }


      drawChart();

    }
  );


/* ========================================
   トレンドライン接近通知
======================================== */

function checkTrendlineAlert(
  current
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


  if (
    end.index ===
    start.index
  ) {
    return;
  }


  const latestIndex =
    candles.length - 1;


  const slope =
    (
      end.price -
      start.price
    ) /
    (
      end.index -
      start.index
    );


  const linePrice =
    start.price +
    slope *
    (
      latestIndex -
      start.index
    );


  const distance =
    Math.abs(
      current -
      linePrice
    );


  const message =
    document.getElementById(
      "alertMessage"
    );


  if (
    distance <= 0.05
  ) {

    if (message) {
      message.textContent =
        "⚠ トレンドライン接近";
    }

  }

}
