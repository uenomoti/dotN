// client.js (Supabase/REST 対応版)
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

let dots = {}; // key: "x,y" -> color

// --------- load from server ----------
async function loadDots() {
  try {
    const res = await fetch("/api/dots");
    if (!res.ok) throw new Error(`load failed: ${res.status}`);
    const data = await res.json();
    // convert array -> dots object
    dots = {};
    (data || []).forEach(d => {
      dots[`${d.x},${d.y}`] = d.color;
    });
    draw();
  } catch (e) {
    console.error("Could not load dots from server:", e);
  }
}

// --------- painting & server save ----------
async function paint(x, y) {
  const key = `${x},${y}`;
  // Update local state immediately for snappy UX
  dots[key] = currentColor;
  draw();

  // Send to server. Server treats "#FFFFFF" (or "white") as delete.
  try {
    await fetch("/api/dots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ x, y, color: currentColor })
    });
    // On success no-op. If server deleted, we should reflect that (optional)
    if (currentColor === "#FFFFFF") {
      delete dots[key];
      draw();
    }
  } catch (e) {
    console.error("Failed to save dot:", e);
  }
}

// --------- drawing ----------
function draw() {
  canvas.width = innerWidth;
  canvas.height = innerHeight;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;

  const startX = Math.floor(-offsetX / scale) - 1;
  const startY = Math.floor(-offsetY / scale) - 1;
  const endX = Math.ceil((canvas.width - offsetX) / scale) + 1;
  const endY = Math.ceil((canvas.height - offsetY) / scale) + 1;

  // グリッド枠
  ctx.strokeStyle = "#cccccc88";
  for (let x = startX; x <= endX; x++) {
    for (let y = startY; y <= endY; y++) {
      ctx.strokeRect(x * scale + offsetX, y * scale + offsetY, scale, scale);
    }
  }

  // ドット描画
  for (const key in dots) {
    const [x, y] = key.split(",").map(Number);
    const col = dots[key];
    if (!col) continue;
    ctx.fillStyle = col;
    ctx.fillRect(x * scale + offsetX, y * scale + offsetY, scale, scale);
    ctx.strokeStyle = "#88888844";
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
  if (e.shiftKey) {
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
// タッチ操作
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

// --------- init ----------
loadDots(); // 非同期でサーバから復元
