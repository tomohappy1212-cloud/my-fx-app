const API_URL =
"https://script.google.com/macros/s/AKfycbwh5D_62VC0fGY4PdgUyYNbp1lRPqbw2AcNgr8GQCNXeLLLYKcTnBLhxkK_XLgzROfjvw/exec";

const canvas =
document.getElementById("chartCanvas");

const ctx =
canvas.getContext("2d");

let candles = [];

let trendlinePoints = [];

let trendlinePrice = null;

let autoUpdateTimer = null;


/* =========================
   基本設定
========================= */

const CHART_HEIGHT = 460;
const CANDLE_WIDTH = 10;
const RIGHT_AXIS = 75;
const LEFT_MARGIN = 10;
const TOP_MARGIN = 20;
const BOTTOM_MARGIN = 35;


/* =========================
   データ更新
========================= */

document
  .getElementById("loadButton")
  .addEventListener(
    "click",
    loadMarketData
  );


async function loadMarketData() {

  const status =
    document.getElementById("marketStatus");

  status.textContent = "取得中";
  status.className = "status offline";


  try {

    const response =
      await fetch(
        API_URL + "?t=" + Date.now()
      );


    if (!response.ok) {
      throw new Error(
        "HTTP " + response.status
      );
    }


    const data =
      await response.json();


    if (
      data.status === "error"
    ) {
      throw new Error(
        data.message ||
        "APIエラー"
      );
    }


    if (
      !data.values ||
      data.values.length < 20
    ) {
      throw new Error(
        "価格データが不足しています。"
      );
    }


    candles =
      data.values
        .map(function(item) {

          return {
            datetime: item.datetime,
            open: Number(item.open),
            high: Number(item.high),
            low: Number(item.low),
            close: Number(item.close)
          };

        })
        .filter(function(item) {

          return (
            Number.isFinite(item.open) &&
            Number.isFinite(item.high) &&
            Number.isFinite(item.low) &&
            Number.isFinite(item.close)
          );

        })
        .reverse();


    status.textContent = "接続中";
    status.className = "status online";


    updateDashboard();

    drawChart();

    startAutoUpdate();

  }
  catch (error) {

    status.textContent = "エラー";
    status.className = "status offline";

    document
      .getElementById("alertMessage")
      .textContent =
      error.message;

  }
}


/* =========================
   自動更新
========================= */

function startAutoUpdate() {

  if (autoUpdateTimer !== null) {
    return;
  }


  autoUpdateTimer =
    setInterval(
      updateMarketData,
      60000
    );
}


async function updateMarketData() {

  try {

    const response =
      await fetch(
        API_URL + "?t=" + Date.now()
      );


    if (!response.ok) {
      return;
    }


    const data =
      await response.json();


    if (
      !data.values ||
      !Array.isArray(data.values)
    ) {
      return;
    }


    const newCandles =
      data.values
        .map(function(item) {

          return {
            datetime: item.datetime,
            open: Number(item.open),
            high: Number(item.high),
            low: Number(item.low),
            close: Number(item.close)
          };

        })
        .filter(function(item) {

          return (
            Number.isFinite(item.open) &&
            Number.isFinite(item.high) &&
            Number.isFinite(item.low) &&
            Number.isFinite(item.close)
          );

        })
        .reverse();


    if (newCandles.length < 20) {
      return;
    }


    candles = newCandles;

    updateDashboard();

    drawChart();

  }
  catch (error) {

    console.log(
      "自動更新エラー:",
      error
    );

  }
}


/* =========================
   ダッシュボード
========================= */

function updateDashboard() {

  if (!candles.length) {
    return;
  }


  const latest =
    candles[candles.length - 1];


  const price =
    latest.close;


  document
    .getElementById("currentPrice")
    .textContent =
    price.toFixed(3);


  const trend =
    detectTrend(candles);


  document
    .getElementById("trend")
    .textContent =
    trend;


  const rsi =
    calculateRSI(candles);


  document
    .getElementById("rsi")
    .textContent =
    rsi === null
      ? "---"
      : rsi.toFixed(1);


  const levels =
    calculateLevels(candles);


  document
    .getElementById("support")
    .textContent =
    levels.support.toFixed(3);


  document
    .getElementById("resistance")
    .textContent =
    levels.resistance.toFixed(3);


  const decision =
    calculateDecision(
      trend,
      rsi,
      price,
      levels.support,
      levels.resistance
    );


  document
    .getElementById("decision")
    .textContent =
    decision;


  const signals =
    findReversalSignals(candles);


  const result =
    runBacktest(signals);


  document
    .getElementById("signalCount")
    .textContent =
    result.total;


  document
    .getElementById("winCount")
    .textContent =
    result.wins;


  document
    .getElementById("lossCount")
    .textContent =
    result.losses;


  document
    .getElementById("winRate")
    .textContent =
    result.rate.toFixed(1) + "%";


  showSignals(signals);


  checkTrendlineAlert(
    price,
    getCurrentTrendlinePrice()
  );
}


/* =========================
   トレンドライン価格
========================= */

function getCurrentTrendlinePrice() {

  if (
    trendlinePoints.length !== 2
  ) {
    return null;
  }


  const p1 =
    trendlinePoints[0];

  const p2 =
    trendlinePoints[1];


  if (
    p1.index === p2.index
  ) {
    return p2.price;
  }


  const latestIndex =
    candles.length - 1;


  const slope =
    (
      p2.price -
      p1.price
    ) /
    (
      p2.index -
      p1.index
    );


  return (
    p1.price +
    slope *
    (
      latestIndex -
      p1.index
    )
  );
}


/* =========================
   反転候補
========================= */

function showSignals(signals) {

  const container =
    document.getElementById(
      "signals"
    );


  if (!signals.length) {

    container.innerHTML =
      "<div class='signalWait'>" +
      "反転候補なし" +
      "</div>";

    return;
  }


  let html = "";


  signals
    .slice(-15)
    .reverse()
    .forEach(function(signal) {

      const isBuy =
        signal.type === "buy";


      html +=
        "<div class='" +
        (
          isBuy
            ? "signalBuy"
            : "signalSell"
        ) +
        "'>" +

        "<strong>" +
        (
          isBuy
            ? "🟢 上昇反転"
            : "🔴 下落反転"
        ) +
        "</strong>" +

        "<br>" +

        signal.datetime +

        "<br>" +

        "価格: " +

        signal.price.toFixed(3) +

        "</div>";

    });


  container.innerHTML =
    html;
}


/* =========================
   チャート描画
========================= */

function drawChart() {

  if (!candles.length) {
    return;
  }


  const chartWidth =
    Math.max(
      1000,
      candles.length *
      CANDLE_WIDTH
    );


  const chartHeight =
    CHART_HEIGHT;


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


  /*
    表示範囲
  */

  const visibleCandles =
    candles.slice(-100);


  const startIndex =
    candles.length -
    visibleCandles.length;


  const prices =
    visibleCandles.flatMap(
      function(candle) {

        return [
          candle.high,
          candle.low
        ];

      }
    );


  let max =
    Math.max(...prices);

  let min =
    Math.min(...prices);


  const padding =
    (max - min) * 0.08;


  max += padding;
  min -= padding;


  const range =
    max - min || 1;


  const chartAreaWidth =
    chartWidth -
    RIGHT_AXIS;


  const chartAreaHeight =
    chartHeight -
    BOTTOM_MARGIN -
    TOP_MARGIN;


  function priceToY(price) {

    return (
      TOP_MARGIN +
      (
        (max - price) /
        range
      ) *
      chartAreaHeight
    );

  }


  function indexToX(index) {

    return (
      LEFT_MARGIN +
      index *
      CANDLE_WIDTH
    );

  }


  /*
    背景
  */

  ctx.fillStyle =
    "#0b0d10";

  ctx.fillRect(
    0,
    0,
    chartWidth,
    chartHeight
  );


  /*
    横グリッド
  */

  ctx.strokeStyle =
    "#242830";

  ctx.lineWidth = 1;


  for (
    let i = 0;
    i <= 6;
    i++
  ) {

    const y =
      TOP_MARGIN +
      (
        chartAreaHeight / 6
      ) *
      i;


    ctx.beginPath();

    ctx.moveTo(
      0,
      y
    );

    ctx.lineTo(
      chartAreaWidth,
      y
    );

    ctx.stroke();


    const price =
      max -
      (
        range / 6
      ) *
      i;


    ctx.fillStyle =
      "#a0a6b0";

    ctx.font =
      "12px sans-serif";

    ctx.fillText(
      price.toFixed(3),
      chartAreaWidth + 8,
      y + 4
    );

  }


  /*
    ローソク足
  */

  visibleCandles.forEach(
    function(candle, visibleIndex) {

      const actualIndex =
        startIndex +
        visibleIndex;


      const x =
        indexToX(
          visibleIndex
        );


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


      const isUp =
        candle.close >=
        candle.open;


      /*
        ヒゲ
      */

      ctx.strokeStyle =
        isUp
          ? "#26df86"
          : "#ff5d5d";

      ctx.lineWidth = 1.5;


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


      /*
        本体
      */

      ctx.fillStyle =
        isUp
          ? "#26df86"
          : "#ff5d5d";


      const bodyTop =
        Math.min(
          openY,
          closeY
        );


      const bodyHeight =
        Math.max(
          2,
          Math.abs(
            openY -
            closeY
          )
        );


      ctx.fillRect(
        x - 3,
        bodyTop,
        6,
        bodyHeight
      );

    }
  );


  /*
    現在値ライン
  */

  const latest =
    candles[
      candles.length - 1
    ];


  const currentY =
    priceToY(
      latest.close
    );


  ctx.strokeStyle =
    "#ffd45a";

  ctx.setLineDash([
    5,
    5
  ]);


  ctx.beginPath();

  ctx.moveTo(
    0,
    currentY
  );

  ctx.lineTo(
    chartAreaWidth,
    currentY
  );

  ctx.stroke();


  ctx.setLineDash([]);


  /*
    現在値ラベル
  */

  ctx.fillStyle =
    "#ffd45a";

  ctx.fillRect(
    chartAreaWidth,
    currentY - 10,
    RIGHT_AXIS,
    20
  );


  ctx.fillStyle =
    "#111318";

  ctx.font =
    "bold 12px sans-serif";


  ctx.fillText(
    latest.close.toFixed(3),
    chartAreaWidth + 7,
    currentY + 4
  );


  /*
    トレンドライン
  */

  if (
    trendlinePoints.length === 2
  ) {

    const p1 =
      trendlinePoints[0];

    const p2 =
      trendlinePoints[1];


    const p1Visible =
      p1.index -
      startIndex;


    const p2Visible =
      p2.index -
      startIndex;


    const x1 =
      indexToX(
        p1Visible
      );

    const x2 =
      indexToX(
        p2Visible
      );


    const y1 =
      priceToY(
        p1.price
      );

    const y2 =
      priceToY(
        p2.price
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


    /*
      ラインを右端まで延長
    */

    const linePrice =
      getCurrentTrendlinePrice();


    if (
      linePrice !== null
    ) {

      const rightX =
        indexToX(
          visibleCandles.length - 1
        );


      const rightY =
        priceToY(
          linePrice
        );


      ctx.beginPath();

      ctx.moveTo(
        x2,
        y2
      );

      ctx.lineTo(
        rightX,
        rightY
      );

      ctx.stroke();

    }

  }


  /*
    時間軸
  */

  ctx.fillStyle =
    "#858b96";

  ctx.font =
    "11px sans-serif";


  const labelStep =
    Math.max(
      1,
      Math.floor(
        visibleCandles.length / 6
      )
    );


  for (
    let i = 0;
    i < visibleCandles.length;
    i += labelStep
  ) {

    const candle =
      visibleCandles[i];


    const x =
      indexToX(i);


    const label =
      String(
        candle.datetime || ""
      ).slice(-5);


    ctx.fillText(
      label,
      x - 14,
      chartHeight - 10
    );

  }

}


/* =========================
   チャートをタップ
========================= */

canvas.addEventListener(
  "click",
  function(event) {

    if (!candles.length) {
      return;
    }


    const rect =
      canvas.getBoundingClientRect();


    const x =
      event.clientX -
      rect.left;


    const index =
      Math.floor(
        x / CANDLE_WIDTH
      );


    const visibleStart =
      Math.max(
        0,
        candles.length - 100
      );


    const actualIndex =
      visibleStart + index;


    if (
      actualIndex < 0 ||
      actualIndex >= candles.length
    ) {
      return;
    }


    const candle =
      candles[actualIndex];


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


    if (
      trendlinePoints.length === 2
    ) {

      document
        .getElementById(
          "alertMessage"
        )
        .textContent =
        "トレンドライン設定済み";

    }


    drawChart();

    updateDashboard();

  }
);


/* =========================
   ライン削除
========================= */

document
  .getElementById(
    "clearLineButton"
  )
  .addEventListener(
    "click",
    function() {

      trendlinePoints = [];

      trendlinePrice = null;


      document
        .getElementById(
          "alertMessage"
        )
        .textContent =
        "待機中";


      drawChart();

    }
  );
