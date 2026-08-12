/* =========================
   FX Vision AI
   TradingView版
========================= */

let trendlinePoints = [];


/* =========================
   初期化
========================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    setStatus(
      "TradingView接続中",
      true
    );

    setMessage(
      "USD/JPYチャート表示中"
    );


    const loadButton =
      document.getElementById(
        "loadButton"
      );

    const clearLineButton =
      document.getElementById(
        "clearLineButton"
      );


    if (loadButton) {

      loadButton.addEventListener(
        "click",
        () => {

          setMessage(
            "TradingViewチャートは自動更新されています"
          );

        }
      );

    }


    if (clearLineButton) {

      clearLineButton.addEventListener(
        "click",
        () => {

          /*
           * TradingViewのチャート内部に
           * 描画されたラインは、外側の
           * JavaScriptから操作できません。
           *
           * TradingView側の描画ツールから
           * 削除してください。
           */

          setMessage(
            "トレンドラインはTradingViewの描画ツールから削除してください"
          );

        }
      );

    }


    /*
     * 旧チャート用のデータ表示は
     * TradingView移行中なので停止。
     */

    setText(
      "currentPrice",
      "---"
    );

    setText(
      "trend",
      "---"
    );

    setText(
      "rsi",
      "---"
    );

    setText(
      "decision",
      "分析待機"
    );

    setText(
      "support",
      "---"
    );

    setText(
      "resistance",
      "---"
    );

    setText(
      "analysisWinRate",
      "---"
    );

    setText(
      "analysisDecision",
      "分析待機"
    );

    setText(
      "analysisReason",
      "リアルタイム価格データの接続準備中"
    );

  }
);


/* =========================
   表示ヘルパー
========================= */

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


function setMessage(
  message
) {

  const element =
    document.getElementById(
      "alertMessage"
    );

  if (element) {

    element.textContent =
      message;

  }

}


function setStatus(
  message,
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
    message;


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


/* =========================
   旧コード互換
========================= */

function loadData() {

  setMessage(
    "TradingViewチャートは自動更新されています"
  );

}


function drawChart() {
  return;
}


function updateDashboard() {
  return;
}


/* =========================
   トレンドライン
========================= */

function clearTrendline() {

  trendlinePoints = [];

}


/*
 * 注意：
 * TradingViewの埋め込みチャートは
 * 外側のJavaScriptから直接描画ラインを
 * 操作できないため、ここでは管理しない。
 */


/* =========================
   初期状態
========================= */

setStatus(
  "TradingView接続中",
  true
);

setMessage(
  "USD/JPYチャート表示中"
);
