let lastAlertMessage = "";

function checkAlerts(
  currentPrice,
  levels,
  trend
) {
  const messages = [];

  if (
    !Number.isFinite(
      currentPrice
    )
  ) {
    return;
  }

  if (
    levels &&
    Number.isFinite(
      levels.support
    )
  ) {
    const supportDistance =
      Math.abs(
        currentPrice -
        levels.support
      );

    if (
      supportDistance <= 0.05
    ) {
      messages.push(
        "⚠ サポート付近"
      );
    }
  }

  if (
    levels &&
    Number.isFinite(
      levels.resistance
    )
  ) {
    const resistanceDistance =
      Math.abs(
        currentPrice -
        levels.resistance
      );

    if (
      resistanceDistance <= 0.05
    ) {
      messages.push(
        "⚠ レジスタンス付近"
      );
    }
  }

  if (
    trend === "上昇"
  ) {
    messages.push(
      "📈 上昇トレンド"
    );
  }

  if (
    trend === "下降"
  ) {
    messages.push(
      "📉 下降トレンド"
    );
  }

  const message =
    messages.length
      ? messages.join(" / ")
      : "監視中";

  lastAlertMessage =
    message;

  const el =
    document.getElementById(
      "alertMessage"
    );

  if (el) {
    el.textContent =
      message;
  }
}


function getLastAlert() {
  return lastAlertMessage;
}
