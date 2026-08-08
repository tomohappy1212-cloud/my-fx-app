const API_URL =
"https://script.google.com/macros/s/AKfycbwh5D_62VC0fGY4PdgUyYNbp1lRPqbw2AcNgr8GQCNXeLLLYKcTnBLhxkK_XLgzROfjvw/exec";


const canvas =
document.getElementById("chartCanvas");

const ctx =
canvas.getContext("2d");


let candles = [];

let trendlinePoints = [];

let trendlinePrice = null;


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
    document.getElementById("marketStatus");

  status.textContent = "取得中";
  status.className = "status offline";


  try {

    const response =
      await fetch(API_URL);


    if (!response.ok) {

      throw new Error(
        "HTTP " + response.status
      );

    }


    const data =
      await response.json();


    if (data.status === "error") {

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
        .map(function (item) {

          return {
            datetime: item.datetime,
            open: Number(item.open),
            high: Number(item.high),
            low: Number(item.low),
            close: Number(item.close)
          };

        })
        .reverse();


    status.textContent =
      "接続中";

    status.className =
      "status online";


    updateDashboard();

    drawChart();

  }
  catch (error) {

    status.textContent =
      "エラー";

    status.className =
      "status offline";

    document
      .getElementById("alertMessage")
      .textContent =
      error.message;

  }

}


/* =========================
   ダッシュボード
========================= */

function updateDashboard() {

  const latest =
    candles[candles.length - 1];

  const price =
    latest.close;


  document
    .getElementById("currentPrice")
    .textContent =
    price.toFixed(5);


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
    levels.support.toFixed(5);


  document
    .getElementById("resistance")
    .textContent =
    levels.resistance.toFixed(5);


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
    trendlinePrice
  );

}


/* =========================
   反転候補
========================= */

function showSignals(signals) {

  const container =
    document.getElementById("signals");


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
    .forEach(function (signal) {

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
        signal.price.toFixed(5) +

        "</div>";

    });


  container.innerHTML =
    html;

}


/* =========================
   チャート
========================= */

function drawChart() {

  if (!candles.length) {
    return;
  }


  const width =
    Math.max(
      900,
      candles.length * 8
    );

  const height = 420;


  canvas.width = width;
  canvas.height = height;


  ctx.clearRect(
    0,
    0,
    width,
    height
  );


  const prices =
    candles.flatMap(
      function (candle) {

        return [
          candle.high,
          candle.low
        ];

      }
    );


  const max =
    Math.max(...prices);

  const min =
    Math.min(...prices);

  const range =
    max - min || 1;


  function priceToY(price) {

    return 20 +
      (
        (max - price) /
        range
      ) *
      (height - 40);

  }


  /*
    ローソク足
  */

  candles.forEach(
    function (candle, index) {

      const x =
        8 + index * 8;


      const highY =
        priceToY(candle.high);

      const lowY =
        priceToY(candle.low);

      const openY =
        priceToY(candle.open);

      const closeY =
        priceToY(candle.close);


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
        x - 2,
        Math.min(
          openY,
          closeY
        ),
        5,
        Math.max(
          1,
          Math.abs(
            openY - closeY
          )
        )
      );

    }
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


    const x1 =
      8 + p1.index * 8;

    const x2 =
      8 + p2.index * 8;


    const y1 =
      priceToY(p1.price);

    const y2 =
      priceToY(p2.price);


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


    trendlinePrice =
      p2.price;

  }

}


/* =========================
   チャートをタップして
   トレンドライン設定
========================= */

canvas.addEventListener(
  "click",
  function (event) {

    if (!candles.length) {
      return;
    }


    const rect =
      canvas.getBoundingClientRect();


    const x =
      event.clientX -
      rect.left;


    const index =
      Math.floor(x / 8);


    if (
      index < 0 ||
      index >= candles.length
    ) {

      return;

    }


    const candle =
      candles[index];


    trendlinePoints.push({
      index: index,
      price: candle.close
    });


    if (
      trendlinePoints.length > 2
    ) {

      trendlinePoints.shift();

    }


    if (
      trendlinePoints.length === 2
    ) {

      trendlinePrice =
        trendlinePoints[1].price;


      document
        .getElementById("alertMessage")
        .textContent =
        "トレンドライン設定済み";

    }


    drawChart();

  }
);


/* =========================
   ラインを消す
========================= */

document
  .getElementById("clearLineButton")
  .addEventListener(
    "click",
    function () {

      trendlinePoints = [];

      trendlinePrice = null;

      document
        .getElementById("alertMessage")
        .textContent =
        "待機中";

      drawChart();

    }
  );
