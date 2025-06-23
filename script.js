// Firebase setup
const firebaseConfig = {
  apiKey: "AIzaSyAeIqgtSFTN6_Tt3TFcap2M_Fubmp7sJWM",
  authDomain: "raise-hand-faster-a4a1d.firebaseapp.com",
  databaseURL: "https://raise-hand-faster-a4a1d-default-rtdb.firebaseio.com",
  projectId: "raise-hand-faster-a4a1d",
  storageBucket: "raise-hand-faster-a4a1d.appspot.com",
  messagingSenderId: "463624548519",
  appId: "1:463624548519:web:89ffda88760e0c95286b82"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let username = "", roomId = "", signalTime = 0, tapped = false, isHost = false;

// ======== CREATE ROOM (HOST) ========
function createRoom() {
  isHost = true;
  joinRoom();
}

// ======== JOIN ROOM (PLAYER) ========
function joinRoom() {
  username = document.getElementById("username").value.trim() || "Anonymous";

  roomId = document.getElementById("roomId").value.trim();
  if (!roomId) return alert("Masukkan kode room!");

  const playersRef = db.ref(`rooms/${roomId}/players`);

  // Ambil data pemain duluan
  playersRef.once("value", (snap) => {
    const players = snap.val() || {};

    // Cek apakah username sudah dipakai
    if (username === "Anonymous" || players[username]) {
      // Buat nama unik
      let i = 1;
      let base = "Anonymous";
      while (players[`${base}${i}`]) i++;
      username = `${base}${i}`;
    }

    // Cek host
    const hostRef = db.ref(`rooms/${roomId}/host`);
    hostRef.once("value", (snapHost) => {
      const hostName = snapHost.val();
      isHost = !hostName; // Hanya jadi host jika belum ada host di room
      if (isHost) {
        hostRef.set(username);
      }

      // Tambah pemain ke room
      const userRef = db.ref(`rooms/${roomId}/players/${username}`);
      userRef.set({ joinedAt: Date.now() });
      userRef.onDisconnect().remove();

      // Munculkan UI game
      document.getElementById("setup").style.display = "none";
      document.getElementById("game").style.display = "block";

      setupListeners();
    });
  });
}


  // Tampilkan hasil realtime
  const responsesRef = db.ref(`rooms/${roomId}/responses`);
  responsesRef.on("value", (snap) => {
    const data = snap.val();
    if (!data) return;

    const sorted = Object.entries(data)
      .map(([name, time]) => ({ name, time }))
      .sort((a, b) => a.time - b.time);

    let resultText = "📊 Urutan Kecepatan:\n";
    sorted.forEach((item, i) => {
      resultText += `${i + 1}. ${item.name} - ${item.time} ms\n`;
    });
    document.getElementById("result").innerText = resultText;
  });

  // Tangkap sinyal
  db.ref(`rooms/${roomId}/signal`).on("value", (snap) => {
    if (snap.exists()) {
      signalTime = snap.val();
      document.getElementById("tapBtn").disabled = false;
      document.getElementById("status").innerText = "AYO TEKAN SEKARANG!";
    }
  });

  // Tampilkan tombol host saja
  db.ref(`rooms/${roomId}/host`).on("value", (snap) => {
    const hostName = snap.val();
    if (hostName === username) {
      document.getElementById("startBtn").style.display = "inline";
      document.querySelector("button[onclick='resetGame()']").style.display = "inline";
    }
  });
}

// ======== START GAME (Hanya Host) ========
function startGame() {
  if (!isHost) return;
  tapped = false;
  document.getElementById("result").innerText = "";
  document.getElementById("tapBtn").disabled = true;
  document.getElementById("status").innerText = "Bersiap...";

  setTimeout(() => {
    db.ref(`rooms/${roomId}/signal`).set(Date.now());
  }, Math.floor(Math.random() * 3000) + 2000);
}

// ======== TAP ========
function tap() {
  if (tapped) return;
  tapped = true;
  const now = Date.now();
  const reactionTime = now - signalTime;
  db.ref(`rooms/${roomId}/responses/${username}`).set(reactionTime);
}

// ======== RESET GAME (Hanya Host) ========
function resetGame() {
  if (!isHost) return;
  const roomRef = db.ref(`rooms/${roomId}`);
  roomRef.child("signal").remove();
  roomRef.child("responses").remove();
  roomRef.child("result").remove();

  tapped = false;
  document.getElementById("result").innerText = "";
  document.getElementById("status").innerText = "Game telah di-reset.";
  document.getElementById("tapBtn").disabled = true;
  // Jangan hilangkan tombol start jika kamu host!
  if (isHost) {
    document.getElementById("startBtn").style.display = "inline";
  }

}

function setupListeners() {
  // Pemain
  const playersRef = db.ref(`rooms/${roomId}/players`);
  playersRef.on("value", (snap) => {
    const data = snap.val();
    const status = document.getElementById("status");
    if (data) {
      const names = Object.keys(data);
      status.innerText = `Peserta: ${names.join(", ")}`;
    }
  });

  // Sinyal mulai
  db.ref(`rooms/${roomId}/signal`).on("value", (snap) => {
    if (snap.exists()) {
      signalTime = snap.val();
      document.getElementById("tapBtn").disabled = false;
      document.getElementById("status").innerText = "AYO TEKAN SEKARANG!";
    }
  });

  // Hasil respon
  db.ref(`rooms/${roomId}/responses`).on("value", (snap) => {
    const data = snap.val();
    if (!data) return;
    const sorted = Object.entries(data)
      .map(([name, time]) => ({ name, time }))
      .sort((a, b) => a.time - b.time);

    let resultText = "📊 Urutan Kecepatan:\n";
    sorted.forEach((item, i) => {
      resultText += `${i + 1}. ${item.name} - ${item.time} ms\n`;
    });
    document.getElementById("result").innerText = resultText;
  });

  // Cek host (tampilkan tombol)
  db.ref(`rooms/${roomId}/host`).on("value", (snap) => {
    const hostName = snap.val();
    const show = hostName === username;
    document.getElementById("startBtn").style.display = show ? "inline" : "none";
    document.querySelector("button[onclick='resetGame()']").style.display = show ? "inline" : "none";
  });
}

