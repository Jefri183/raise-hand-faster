// Konfigurasi Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAeIqgtSFTN6_Tt3TFcap2M_Fubmp7sJWM",
  authDomain: "raise-hand-faster-a4a1d.firebaseapp.com",
  databaseURL: "https://raise-hand-faster-a4a1d-default-rtdb.firebaseio.com",
  projectId: "raise-hand-faster-a4a1d",
  storageBucket: "raise-hand-faster-a4a1d.firebasestorage.app",
  messagingSenderId: "463624548519",
  appId: "1:463624548519:web:89ffda88760e0c95286b82"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let username = "", roomId = "", signalTime = 0, tapped = false;

function joinRoom() {
  username = document.getElementById("username").value.trim() || "Anonymous";
  roomId = document.getElementById("roomId").value.trim();
  if (!roomId) return alert("Isi kode room!");

  const userRef = db.ref(`rooms/${roomId}/players/${username}`);
  userRef.set(true);
  userRef.onDisconnect().remove();

  document.getElementById("setup").style.display = "none";
  document.getElementById("game").style.display = "block";

  const playersRef = db.ref(`rooms/${roomId}/players`);
  playersRef.on("value", (snapshot) => {
    const players = snapshot.val();
    const status = document.getElementById("status");
  
    if (players) {
      const names = Object.keys(players).join(", ");
      status.innerText = `Peserta: ${names}`;
    }
  
    if (players && Object.keys(players).length >= 2) {
      document.getElementById("startBtn").style.display = "inline";
    }
});


  const signalRef = db.ref(`rooms/${roomId}/signal`);
  signalRef.on("value", (snap) => {
    if (snap.exists()) {
      signalTime = snap.val();
      document.getElementById("tapBtn").disabled = false;
      document.getElementById("status").innerText = "AYO TEKAN SEKARANG!";
    }
  });

  const resultRef = db.ref(`rooms/${roomId}/result`);
  resultRef.on("value", (snap) => {
    if (snap.exists()) {
      const result = snap.val();
      document.getElementById("result").innerText = `🏆 ${result.name} menang! (${result.time} ms)`;
      document.getElementById("tapBtn").disabled = true;
    }
  });
}

function startGame() {
  tapped = false;
  document.getElementById("result").innerText = "";
  document.getElementById("tapBtn").disabled = true;
  document.getElementById("status").innerText = "Bersiap...";

  setTimeout(() => {
    const now = Date.now();
    db.ref(`rooms/${roomId}/signal`).set(now);
  }, Math.floor(Math.random() * 3000) + 2000); // 2–5 detik
}

function tap() {
  if (tapped) return;
  tapped = true;

  const now = Date.now();
  const reactionTime = now - signalTime;

  db.ref(`rooms/${roomId}/responses/${username}`).set(reactionTime);

  // Tunggu sebentar, lalu ambil semua reaksi dan urutkan
  setTimeout(() => {
    db.ref(`rooms/${roomId}/responses`).once("value", (snap) => {
      const data = snap.val();
      if (!data) return;

      // Ubah objek menjadi array, lalu urutkan
      const sorted = Object.entries(data)
        .map(([name, time]) => ({ name, time }))
        .sort((a, b) => a.time - b.time);

      // Tampilkan semua hasil
      let resultText = "📊 Urutan Kecepatan:\n";
      sorted.forEach((item, i) => {
        resultText += `${i + 1}. ${item.name} - ${item.time} ms\n`;
      });

      document.getElementById("result").innerText = resultText;
    });
  }, 1000); // beri delay untuk tunggu semua pemain submit
}

function resetGame() {
  if (!roomId) return alert("Belum masuk room.");

  const roomRef = db.ref(`rooms/${roomId}`);

  // Hapus signal, responses, dan result
  roomRef.child("signal").remove();
  roomRef.child("responses").remove();
  roomRef.child("result").remove();

  // Reset tampilan
  tapped = false;
  document.getElementById("result").innerText = "";
  document.getElementById("status").innerText = "Game telah di-reset.";
  document.getElementById("tapBtn").disabled = true;
  document.getElementById("startBtn").style.display = "none";
}
