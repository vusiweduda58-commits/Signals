let currentSignal = null;

const pinField = document.getElementById("pinField");
const lockScreen = document.getElementById("lockScreen");
const lockTitle = document.getElementById("lockTitle");
const lockSubtitle = document.getElementById("lockSubtitle");
const pinSubmitBtn = document.getElementById("pinSubmitBtn");
const bioUnlockBtn = document.getElementById("bioUnlockBtn");

const savedPin = localStorage.getItem("mySignalAppPin");
const bioEnabled = localStorage.getItem("mySignalBioEnabled");

if (!savedPin) {
  lockTitle.textContent = "Create App Password";
  lockSubtitle.textContent = "Set a 4 to 6 digit PIN to protect your app";
  pinSubmitBtn.textContent = "Save PIN & Enter";
} else if (bioEnabled === "true") {
  bioUnlockBtn.style.display = "block";
}

function handlePinAction() {
  const entered = pinField.value.trim();

  if (!/^d{4,6}$/.test(entered)) {
    alert("Your PIN must contain 4 to 6 digits.");
    return;
  }

  const existingPin = localStorage.getItem("mySignalAppPin");

  if (!existingPin) {
    localStorage.setItem("mySignalAppPin", entered);
    unlockApp();
    return;
  }

  if (entered === existingPin) {
    unlockApp();
  } else {
    alert("Incorrect PIN.");
    pinField.value = "";
  }
}

function unlockApp() {
  lockScreen.style.display = "none";
  pinField.value = "";
}

function lockApp() {
  lockScreen.style.display = "flex";
  pinField.focus();
}

function toggleCreator() {
  const panel = document.getElementById("creatorPanel");
  panel.style.display = panel.style.display === "none" ? "block" : "none";
}

function activateSignal() {
  const exchange = document.getElementById("inExchange").value.trim();
  const currency = document.getElementById("inCurrency").value.trim();
  const buyTime = document.getElementById("inBuyTime").value;
  const sellTime = document.getElementById("inSellTime").value;

  if (!exchange || !currency || !buyTime || !sellTime) {
    alert("Please complete every field.");
    return;
  }

  const now = new Date();

  const date = `${String(now.getDate()).padStart(2, "0")}.${String(
    now.getMonth() + 1
  ).padStart(2, "0")}.${now.getFullYear()}`;

  document.getElementById("outExchange").textContent = exchange;
  document.getElementById("outCurrency").textContent = currency;
  document.getElementById("outDate").textContent = date;
  document.getElementById("outBuyTime").textContent = formatTime(buyTime);
  document.getElementById("outSellTime").textContent = formatTime(sellTime);

  currentSignal = {
    exchange,
    currency,
    buyTime,
    sellTime,
    date
  };

  localStorage.setItem("myCurrentSignal", JSON.stringify(currentSignal));

  document.getElementById("statusBanner").textContent =
    `Signal armed: Buy ${formatTime(buyTime)} | Sell ${formatTime(sellTime)}`;
}

function formatTime(time) {
  return time.replace(":", " : ");
}

async function downloadSignalImage() {
  const area = document.getElementById("captureArea");

  if (typeof html2canvas === "undefined") {
    alert("The image component has not loaded yet.");
    return;
  }

  const canvas = await html2canvas(area, {
    backgroundColor: "#030a09",
    scale: 2
  });

  const link = document.createElement("a");
  link.download = "my-private-signal.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
}

async function setupFingerprint() {
  if (!window.isSecureContext) {
    alert("Fingerprint authentication requires HTTPS or localhost.");
    return;
  }

  if (!window.PublicKeyCredential || !navigator.credentials) {
    alert("Biometric authentication is not supported on this device or browser.");
    return;
  }

  try {
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rp: {
          name: "My Private Signals"
        },
        user: {
          id: crypto.getRandomValues(new Uint8Array(16)),
          name: "private-signals-user",
          displayName: "Private Signals User"
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },
          { type: "public-key", alg: -257 }
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required"
        },
        timeout: 60000,
        attestation: "none"
      }
    });

    if (credential) {
      localStorage.setItem("mySignalBioEnabled", "true");
      localStorage.setItem(
        "mySignalCredentialId",
        bytesToBase64(credential.rawId)
      );

      bioUnlockBtn.style.display = "block";
      alert("Fingerprint or device biometric unlock enabled.");
    }
  } catch (error) {
    alert("Biometric setup was cancelled or failed.");
    console.error(error);
  }
}

async function unlockWithFingerprint() {
  const credentialId = localStorage.getItem("mySignalCredentialId");

  if (!credentialId) {
    alert("Set up fingerprint unlock first.");
    return;
  }

  try {
    const credential = await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        allowCredentials: [
          {
            type: "public-key",
            id: base64ToBytes(credentialId)
          }
        ],
        userVerification: "required",
        timeout: 60000
      }
    });

    if (credential) {
      unlockApp();
    }
  } catch (error) {
    alert("Biometric unlock failed or was cancelled.");
    console.error(error);
  }
}

function bytesToBase64(bytes) {
  let binary = "";
  new Uint8Array(bytes).forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

const storedSignal = localStorage.getItem("myCurrentSignal");

if (storedSignal) {
  const signal = JSON.parse(storedSignal);

  document.getElementById("inExchange").value = signal.exchange;
  document.getElementById("inCurrency").value = signal.currency;
  document.getElementById("inBuyTime").value = signal.buyTime;
  document.getElementById("inSellTime").value = signal.sellTime;

  document.getElementById("outExchange").textContent = signal.exchange;
  document.getElementById("outCurrency").textContent = signal.currency;
  document.getElementById("outDate").textContent = signal.date;
  document.getElementById("outBuyTime").textContent = formatTime(signal.buyTime);
  document.getElementById("outSellTime").textContent = formatTime(signal.sellTime);

  currentSignal = signal;
}

if ("serviceWorker" in navigator && window.isSecureContext) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(console.error);
  });
}
