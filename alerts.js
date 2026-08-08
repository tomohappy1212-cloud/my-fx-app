let soundEnabled = false;
let audioContext = null;
let lastAlertPrice = null;

const soundButton =
  document.getElementById("soundButton");

const alertMessage =
  document.getElementById("alertMessage");


soundButton.addEventListener(
  "click",
  function () {

    soundEnabled = !soundEnabled;

    if (soundEnabled) {

      audioContext =
        new (
          window.AudioContext ||
          window.webkitAudioContext
        )();

      soundButton.textContent =
        "🔔 通知音 ON";

      playAlertSound();

    } else {

      soundButton.textContent =
        "🔕 通知音 OFF";
    }
  }
);


function playAlertSound() {

  if (!soundEnabled || !audioContext) {
    return;
  }

  const oscillator =
    audioContext.createOscillator();

  const gain =
    audioContext.createGain();

  oscillator.frequency.value = 880;
  gain.gain.value = 0.08;

  oscillator.connect(gain);
  gain.connect(audioContext.destination);

  oscillator.start();

  oscillator.stop(
    audioContext.currentTime + 0.2
  );
}


function checkTrendlineAlert(
  price,
  linePrice
) {

  if (linePrice === null) {
    return;
  }

  const distance =
    Math.abs(price - linePrice);

  if (distance <= 0.03) {

    if (
      lastAlertPrice === null ||
      Math.abs(
        lastAlertPrice - price
      ) > 0.01
    ) {

      alertMessage.textContent =
        "⚠️ トレンドライン付近";

      playAlertSound();

      lastAlertPrice = price;
    }

  } else {

    alertMessage.textContent =
      "待機中";
  }
}
