// client.js
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
let scale = 20;
let offsetX = 0, offsetY = 0;
let dragging = false;
let lastX, lastY;
let currentColor = "#000000";
let isTouch = false;

const colors = [
  "#000000", "#808080", "#FFFFFF",
  "#FF0000", "#FF8000", "#FFFF00",
  "#00FF00", "#00FFFF", "#0000FF",
  "#8000FF", "#FF00FF", "#804000",
  "#408000", "#008080"
];

let dots = {};
const socket = new WebSocket(`ws://${location.host}`);

socket.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (msg.type === "init") {
    dots = msg.data;
    draw();
  } else if (msg.type === "dot") {
    dots[`${msg.x},${msg.y}`] = msg.color;
    draw();
  }
};

function paint(x, y) {
  dots[`${x},${y}`] = currentColor;
  socket.send(JSON.stringify({ type: "dot", x, y, color: currentColor }));
  draw();
}

function draw() {
  canvas.width = innerWidth;
  canvas.height = innerHeight;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;

  // 画面に入る範囲の座標を計算
  const startX = Math.floor(-offsetX / scale) - 1;
  const startY = Math.floor(-offsetY / scale) - 1;
  const endX = Math.ceil((canvas.width - offsetX) / scale) + 1;
  const endY = Math.ceil((canvas.height - offsetY) / scale) + 1;

  // ドット枠（描いていないドットも表示）
  ctx.strokeStyle = "#cccccc88";
  for (let x = startX; x <= endX; x++) {
    for (let y = startY; y <= endY; y++) {
      ctx.strokeRect(x * scale + offsetX, y * scale + offsetY, scale, scale);
    }
  }

  // 描いたドットを上に描く
  for (const key in dots) {
    const [x, y] = key.split(",").map(Number);
    ctx.fillStyle = dots[key];
    ctx.fillRect(x * scale + offsetX, y * scale + offsetY, scale, scale);
    ctx.strokeStyle = "#88888844"; // ドット枠
    ctx.strokeRect(x * scale + offsetX, y * scale + offsetY, scale, scale);
  }

  // 座標軸
  ctx.strokeStyle = "#ff000055";
  ctx.beginPath();
  ctx.moveTo(offsetX, 0);
  ctx.lineTo(offsetX, canvas.height);
  ctx.moveTo(0, offsetY);
  ctx.lineTo(canvas.width, offsetY);
  ctx.stroke();
}

// -------------------
// マウス操作
// -------------------
canvas.addEventListener("mousedown", (e) => {
  if (e.button !== 0) return;
  if (e.shiftKey) { // Shift + 左ドラッグでパン
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
  } else {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left - offsetX) / scale);
    const y = Math.floor((e.clientY - rect.top - offsetY) / scale);
    paint(x, y);
  }
});

canvas.addEventListener("mousemove", (e) => {
  if (dragging) {
    offsetX += e.clientX - lastX;
    offsetY += e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    draw();
  } else if (e.buttons === 1 && !e.shiftKey) {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left - offsetX) / scale);
    const y = Math.floor((e.clientY - rect.top - offsetY) / scale);
    paint(x, y);
  }
});

canvas.addEventListener("mouseup", () => (dragging = false));
canvas.addEventListener("mouseleave", () => (dragging = false));
canvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  const delta = e.deltaY > 0 ? 0.9 : 1.1;
  scale *= delta;
  draw();
});

canvas.addEventListener("contextmenu", (e) => e.preventDefault());

// -------------------
// タッチ操作（スマホ/iPad対応）
// -------------------
let lastDist = 0;
canvas.addEventListener("touchstart", (e) => {
  isTouch = true;
  if (e.touches.length === 2) {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    lastDist = Math.hypot(dx, dy);
  }
});

canvas.addEventListener("touchmove", (e) => {
  e.preventDefault();
  if (e.touches.length === 1) {
    const t = e.touches[0];
    if (!dragging) {
      dragging = true;
      lastX = t.clientX;
      lastY = t.clientY;
    } else {
      offsetX += t.clientX - lastX;
      offsetY += t.clientY - lastY;
      lastX = t.clientX;
      lastY = t.clientY;
      draw();
    }
  } else if (e.touches.length === 2) {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const dist = Math.hypot(dx, dy);
    const delta = dist / lastDist;
    scale *= delta;
    lastDist = dist;
    draw();
  }
});

canvas.addEventListener("touchend", (e) => {
  if (e.touches.length === 0) dragging = false;
});

// -------------------
// 座標UI & テレポート
// -------------------
const teleportX = document.getElementById("teleportX");
const teleportY = document.getElementById("teleportY");
document.getElementById("teleportBtn").onclick = () => {
  const x = parseInt(teleportX.value) || 0;
  const y = parseInt(teleportY.value) || 0;
  offsetX = canvas.width / 2 - x * scale;
  offsetY = canvas.height / 2 - y * scale;
  draw();
};

// マウス座標表示
canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left - offsetX) / scale);
  const y = Math.floor((e.clientY - rect.top - offsetY) / scale);
  document.getElementById("coords").innerText = `x:${x} y:${y}`;
});

window.addEventListener("resize", draw);
