const API_URL =
"https://script.google.com/macros/s/AKfycbwh5D_62VC0fGY4PdgUyYNbp1lRPqbw2AcNgr8GQCNXeLLLYKcTnBLhxkK_XLgzROfjvw/exec";


const canvas =
document.getElementById(
  "chartCanvas"
);

const ctx =
canvas.getContext("2d");


let candles = [];

let trendlinePoints = [];

let autoUpdateTimer = null;


/* =========================
   チャート設定
========================= */

const CANDLE_WIDTH = 12;

const PRICE_AXIS_WIDTH = 72;

const TOP = 18;

const BOTTOM = 32;

const RIGHT_PADDING = 10;


/* =========================
   データ取得
========================= */

document
  .getElementById("loadButton")
  .addEventListener(
    "click",
    loadMarketData
  );


async function loadMarketData() {

  const status =
    document.getElementById(
      "marketStatus"
    );


  status.textContent =
    "取得中";


  status.className =
    "status offline";


  try {

    const response =
      await fetch(
        API_URL +
        "?t=" +
        Date.now()
      );


    if (!response.ok) {

      throw new Error(
        "HTTP " +
        response.status
      );

    }


    const data =
      await response.json();


    if (
      !data.values ||
      data.values.length < 20
    ) {

      throw new Error(
        "価格データが不足しています"
      );

    }


    candles =
      convertCandles(
        data.values
      );


    status.textContent =
      "接続中";


    status.className =
      "status online";


    updateDashboard();

    drawChart();


    startAutoUpdate();

  }
  catch (error) {

    status.textContent =
      "エラー";


    status.className =
      "status offline";


    document
      .getElementById(
        "alertMessage"
      )
      .textContent =
      error.message;

  }

}


/* =========================
   データ整形
========================= */

function convertCandles(values) {

  return values
    .map(function(item) {

      return {

        datetime:
          item.datetime,

        open:
          Number(item.open),

        high:
          Number(item.high),

        low:
          Number(item.low),

        close:
          Number(item.close)

      };

    })
    .filter(function(item) {

      return (
        Number.isFinite(
          item.open
        ) &&
        Number.isFinite(
          item.high
        ) &&
        Number.isFinite(
          item.low
        ) &&
        Number.isFinite(
          item.close
        )
      );

    })
    .reverse();

}


/* =========================
   自動更新
========================= */

function startAutoUpdate() {

  if (
    autoUpdateTimer !== null
  ) {

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
        API_URL +
        "?t=" +
        Date.now()
      );


    const data =
      await response.json();


    if (
      !data.values
    ) {

      return;

    }


    candles =
      convertCandles(
        data.values
      );


    updateDashboard();

    drawChart();

  }
  catch (error) {

    console.log(
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
    candles[
      candles.length - 1
    ];


  const price =
    latest.close;


  document
    .getElementById(
      "currentPrice"
    )
    .textContent =
    price.toFixed(3);


  const trend =
    detectTrend(
      candles
    );


  document
    .getElementById(
      "trend"
    )
    .textContent =
    trend;


  const rsi =
    calculateRSI(
      candles
    );


  document
    .getElementById(
      "rsi"
    )
    .textContent =
    rsi === null
      ? "---"
      : rsi.toFixed(1);


  const levels =
    calculateLevels(
      candles
    );


  document
    .getElementById(
      "support"
    )
    .textContent =
    levels.support.toFixed(3);


  document
    .getElementById(
      "resistance"
    )
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
    .getElementById(
      "decision"
    )
    .textContent =
    decision;


  const signals =
    findReversalSignals(
      candles
    );


  const result =
    runBacktest(
      signals
    );


  document
    .getElementById(
      "signalCount"
    )
    .textContent =
    result.total;


  document
    .getElementById(
      "winCount"
    )
    .textContent =
    result.wins;


  document
    .getElementById(
      "lossCount"
    )
    .textContent =
    result.losses;


  document
    .getElementById(
      "winRate"
    )
    .textContent =
    result.rate.toFixed(1) +
    "%";


  showSignals(
    signals
  );


  checkTrendlineAlert(
    price,
    getTrendlinePrice()
  );

}


/* =========================
   トレンドライン
========================= */

function getTrendlinePrice() {

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
    p1.index ===
    p2.index
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
   チャート
========================= */

function drawChart() {

  if (!candles.length) {
    return;
  }


  const visible =
    candles.slice(-80);


  const width =
    Math.max(
      900,
      visible.length *
      CANDLE_WIDTH +
      PRICE_AXIS_WIDTH
    );


  const height =
    520;


  canvas.width =
    width;


  canvas.height =
    height;


  ctx.clearRect(
    0,
    0,
    width,
    height
  );


  /* 背景 */

  ctx.fillStyle =
    "#0a0d12";


  ctx.fillRect(
    0,
    0,
    width,
    height
  );


  const chartWidth =
    width -
    PRICE_AXIS_WIDTH;


  const chartHeight =
    height -
    TOP -
    BOTTOM;


  const prices =
    visible.flatMap(
      function(candle) {

        return [
          candle.high,
          candle.low
        ];

      }
    );


  let max =
    Math.max(
      ...prices
    );


  let min =
    Math.min(
      ...prices
    );


  const padding =
    (
      max -
      min
    ) * 0.08;


  max += padding;

  min -= padding;


  const range =
    max -
    min;


  function priceToY(
    price
  ) {

    return (
      TOP +
      (
        max -
        price
      ) /
      range *
      chartHeight
    );

  }


  function indexToX(
    index
  ) {

    return (
      8 +
      index *
      CANDLE_WIDTH
    );

  }


  /* =====================
     グリッド
  ===================== */

  ctx.lineWidth = 1;

  ctx.strokeStyle =
    "#1d232c";


  for (
    let i = 0;
    i <= 8;
    i++
  ) {

    const y =
      TOP +
      chartHeight /
      8 *
      i;


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


    const price =
      max -
      range /
      8 *
      i;


    ctx.fillStyle =
      "#89919d";


    ctx.font =
      "12px Arial";


    ctx.fillText(
      price.toFixed(3),
      chartWidth + 8,
      y + 4
    );

  }


  /* =====================
     ローソク足
  ===================== */

  visible.forEach(
    function(
      candle,
      index
    ) {

      const x =
        indexToX(
          index
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


      const bullish =
        candle.close >=
        candle.open;


      const bodyTop =
        Math.min(
          openY,
          closeY
        );


      const bodyHeight =
        Math.max(
          3,
          Math.abs(
            openY -
            closeY
          )
        );


      /*
        ヒゲ
      */

      ctx.strokeStyle =
        bullish
          ? "#35d98b"
          : "#ff5f67";


      ctx.lineWidth =
        1.5;


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
        bullish
          ? "#35d98b"
          : "#ff5f67";


      ctx.fillRect(
        x - 4,
        bodyTop,
        8,
        bodyHeight
      );

    }
  );


  /* =====================
     現在値
  ===================== */

  const current =
    candles[
      candles.length - 1
    ].close;


  const currentY =
    priceToY(
      current
    );


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


  /* 現在値ラベル */

  ctx.fillStyle =
    "#e7c75a";


  ctx.fillRect(
    chartWidth,
    currentY - 11,
    PRICE_AXIS_WIDTH,
    22
  );


  ctx.fillStyle =
    "#111318";


  ctx.font =
    "bold 12px Arial";


  ctx.fillText(
    current.toFixed(3),
    chartWidth + 8,
    currentY + 4
  );


  /* =====================
     トレンドライン
  ===================== */

  if (
    trendlinePoints.length === 2
  ) {

    const p1 =
      trendlinePoints[0];

    const p2 =
      trendlinePoints[1];


    const startIndex =
      candles.length -
      visible.length;


    const x1 =
      indexToX(
        p1.index -
        startIndex
      );


    const x2 =
      indexToX(
        p2.index -
        startIndex
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
      右端まで延長
    */

    const currentLine =
      getTrendlinePrice();


    if (
      currentLine !== null
    ) {

      const rightX =
        indexToX(
          visible.length - 1
        );


      const rightY =
        priceToY(
          currentLine
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


  /* =====================
     時間軸
  ===================== */

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

    const candle =
      visible[i];


    const x =
      indexToX(i);


    let label =
      String(
        candle.datetime ||
        ""
      );


    if (
      label.length > 11
    ) {

      label =
        label.slice(-11);

    }


    ctx.fillText(
      label,
      x - 18,
      height - 10
    );

  }

}


/* =========================
   2点タップ
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
        candles.length - 80
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


      document
        .getElementById(
          "alertMessage"
        )
        .textContent =
        "待機中";


      drawChart();

    }
  );
