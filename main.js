// ===== MAIN TELEMETRY LOGIC =====

// ---- Shared chart defaults ----
const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  plugins: { legend: { display: false }, tooltip: { enabled: false } },
  scales: {
    x: {
      grid: { color: 'rgba(0,245,196,0.05)', lineWidth: 1 },
      ticks: { color: '#3a8070', font: { size: 8, family: 'DM Mono' }, maxTicksLimit: 6 }
    },
    y: {
      grid: { color: 'rgba(0,245,196,0.08)', lineWidth: 1 },
      ticks: { color: '#3a8070', font: { size: 8, family: 'DM Mono' }, maxTicksLimit: 5 }
    }
  }
};

const labels = Array.from({length: 40}, (_, i) => i.toString());

// --- Kalman Altitude ---
const altKCtx = document.getElementById('altKalmanChart').getContext('2d');
const altKData = Array.from({length: 40}, (_, i) => Math.max(0, 120 + i * 3.5 + Math.sin(i * 0.4) * 4));
const altKChart = new Chart(altKCtx, {
  type: 'line',
  data: {
    labels,
    datasets: [{
      data: altKData,
      borderColor: '#98FB98',
      borderWidth: 2,
      pointRadius: 0,
      fill: true,
      backgroundColor: (ctx) => {
        const g = ctx.chart.ctx.createLinearGradient(0,0,0,130);
        g.addColorStop(0,'rgba(152,251,152,0.22)');
        g.addColorStop(1,'rgba(152,251,152,0.01)');
        return g;
      },
      tension: 0.4
    }]
  },
  options: { ...chartDefaults, scales: { ...chartDefaults.scales, y: { ...chartDefaults.scales.y, min: 0 } }}
});

// --- Raw Altitude ---
const altRCtx = document.getElementById('altRawChart').getContext('2d');
const altRData = altKData.map(v => v + (Math.random() - 0.5) * 18);
const altRChart = new Chart(altRCtx, {
  type: 'line',
  data: {
    labels,
    datasets: [{
      data: altRData,
      borderColor: '#92E1FF',
      borderWidth: 1.5,
      pointRadius: 0,
      fill: true,
      backgroundColor: (ctx) => {
        const g = ctx.chart.ctx.createLinearGradient(0,0,0,130);
        g.addColorStop(0,'rgba(146,225,255,0.18)');
        g.addColorStop(1,'rgba(146,225,255,0.01)');
        return g;
      },
      tension: 0.2
    }]
  },
  options: chartDefaults
});

// --- Tilt ---
const tiltCtx = document.getElementById('tiltChart').getContext('2d');
const tiltData = Array.from({length: 40}, (_, i) => 5 + Math.sin(i * 0.3) * 8 + Math.random() * 3);
const tiltChart = new Chart(tiltCtx, {
  type: 'line',
  data: {
    labels,
    datasets: [{
      data: tiltData,
      borderColor: '#56d8f5',
      borderWidth: 2,
      pointRadius: 0,
      fill: true,
      backgroundColor: (ctx) => {
        const g = ctx.chart.ctx.createLinearGradient(0,0,0,130);
        g.addColorStop(0,'rgba(86,216,245,0.2)');
        g.addColorStop(1,'rgba(86,216,245,0.01)');
        return g;
      },
      tension: 0.35
    }]
  },
  options: chartDefaults
});

// --- Net Accel ---
const accelCtx = document.getElementById('accelChart').getContext('2d');
const accelData = Array.from({length: 40}, (_, i) => 9.8 + Math.sin(i * 0.5) * 2.5 + Math.random() * 1.2);
const accelChart = new Chart(accelCtx, {
  type: 'bar',
  data: {
    labels,
    datasets: [{
      data: accelData,
      backgroundColor: accelData.map(v => v > 11 ? 'rgba(255,78,106,0.7)' : 'rgba(0,245,196,0.45)'),
      borderColor: accelData.map(v => v > 11 ? '#ff4e6a' : '#00f5c4'),
      borderWidth: 1,
      borderRadius: 2
    }]
  },
  options: { ...chartDefaults, scales: { ...chartDefaults.scales, y: { ...chartDefaults.scales.y, min: 5 } }}
});

// ---- Signal bars ----
const signalBarsEl = document.getElementById('signalBars');
function buildBars(rssi) {
  const level = Math.max(0, Math.min(10, Math.round((rssi + 120) / 7)));
  signalBarsEl.innerHTML = '';
  for (let i = 0; i < 10; i++) {
    const bar = document.createElement('div');
    bar.className = 'sig-bar' + (i < level ? ' active' : '');
    bar.style.height = (14 + i * 2.5) + 'px';
    signalBarsEl.appendChild(bar);
  }
}
buildBars(-107);

// ---- LoRa terminal ----
const loraEl = document.getElementById('loraTerminal');
const loraPrefix = ['ALT', 'ACC', 'TLT', 'GPS', 'PKT', 'SIG', 'TMP'];
function loraLine() {
  const ts = new Date().toISOString().substr(11, 8);
  const tag = loraPrefix[Math.floor(Math.random() * loraPrefix.length)];
  const hex = Array.from({length: 12}, () => Math.floor(Math.random()*256).toString(16).padStart(2,'0').toUpperCase()).join(':');
  const div = document.createElement('div');
  div.className = 'lora-line lora-new';
  div.innerHTML = `<span class="lora-ts">${ts}</span>[${tag}] <span class="lora-data">${hex}</span>`;
  loraEl.appendChild(div);
  if (loraEl.children.length > 60) loraEl.removeChild(loraEl.firstChild);
  loraEl.scrollTop = loraEl.scrollHeight;
}
for (let i = 0; i < 10; i++) loraLine();

// ---- Clock & elapsed ----
let elapsedSec = 0;
function updateClock() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2,'0');
  const mm = String(now.getMinutes()).padStart(2,'0');
  const ss = String(now.getSeconds()).padStart(2,'0');
  document.getElementById('clockDisplay').textContent = `${hh}:${mm}:${ss}`;
  elapsedSec++;
  document.getElementById('elapsedVal').textContent = elapsedSec + 's';
}

// ---- Canvas mini-map (no API key needed) ----
const GMAP_LAT = 13.5751993;
const GMAP_LNG = 100.5714753;

(function initCanvasMap() {
  const canvas = document.getElementById('mapCanvas');
  const ctx = canvas.getContext('2d');
  const container = document.getElementById('gmap');

  function resizeCanvas() {
    canvas.width = container.offsetWidth;
    canvas.height = container.offsetHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  let dotX, dotY, pingR = 0, pingGrow = true;
  let pathPoints = [];
  let t = 0;

  function drawMap() {
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Dark satellite-style background
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#040f1a');
    bg.addColorStop(1, '#071b28');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Grid lines (map-like)
    ctx.strokeStyle = 'rgba(146,225,255,0.06)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < W; x += 30) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += 30) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Diagonal accent lines
    ctx.strokeStyle = 'rgba(152,251,152,0.04)';
    for (let d = -H; d < W + H; d += 60) {
      ctx.beginPath(); ctx.moveTo(d, 0); ctx.lineTo(d + H, H); ctx.stroke();
    }

    // Terrain-like blobs
    const terrainBlobs = [
      { x: 0.22, y: 0.35, rx: 0.18, ry: 0.12, color: 'rgba(0,80,40,0.18)' },
      { x: 0.68, y: 0.60, rx: 0.22, ry: 0.15, color: 'rgba(0,100,50,0.14)' },
      { x: 0.45, y: 0.80, rx: 0.30, ry: 0.10, color: 'rgba(0,70,35,0.16)' },
      { x: 0.15, y: 0.70, rx: 0.12, ry: 0.18, color: 'rgba(0,90,45,0.12)' },
      { x: 0.80, y: 0.20, rx: 0.14, ry: 0.10, color: 'rgba(0,60,30,0.15)' },
    ];
    terrainBlobs.forEach(b => {
      ctx.beginPath();
      ctx.ellipse(b.x * W, b.y * H, b.rx * W, b.ry * H, 0, 0, Math.PI * 2);
      ctx.fillStyle = b.color;
      ctx.fill();
    });

    // Road-like lines
    ctx.strokeStyle = 'rgba(146,225,255,0.12)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, H * 0.42); ctx.lineTo(W, H * 0.55);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(W * 0.35, 0); ctx.lineTo(W * 0.40, H);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, H * 0.72); ctx.bezierCurveTo(W*0.3, H*0.68, W*0.7, H*0.78, W, H*0.74);
    ctx.stroke();

    // Centre dot position
    dotX = W / 2 + Math.sin(t * 0.008) * 6;
    dotY = H / 2 + Math.cos(t * 0.006) * 4;

    // Path trail
    if (t % 4 === 0) pathPoints.push({ x: dotX, y: dotY });
    if (pathPoints.length > 30) pathPoints.shift();
    if (pathPoints.length > 1) {
      ctx.beginPath();
      ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
      for (let i = 1; i < pathPoints.length; i++) {
        ctx.lineTo(pathPoints[i].x, pathPoints[i].y);
      }
      ctx.strokeStyle = 'rgba(152,251,152,0.35)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Ping ring
    if (pingGrow) { pingR += 0.6; if (pingR > 28) pingGrow = false; }
    else { pingR -= 0.6; if (pingR < 2) pingGrow = true; }
    const pingAlpha = Math.max(0, (28 - pingR) / 28 * 0.7);
    ctx.beginPath();
    ctx.arc(dotX, dotY, pingR, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(152,251,152,${pingAlpha})`;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Second ring offset
    const r2 = (pingR + 12) % 40;
    const a2 = Math.max(0, (40 - r2) / 40 * 0.4);
    ctx.beginPath();
    ctx.arc(dotX, dotY, r2, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(146,225,255,${a2})`;
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Crosshair
    ctx.strokeStyle = 'rgba(152,251,152,0.5)';
    ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(dotX, dotY - 14); ctx.lineTo(dotX, dotY - 5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(dotX, dotY + 5);  ctx.lineTo(dotX, dotY + 14); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(dotX - 14, dotY); ctx.lineTo(dotX - 5, dotY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(dotX + 5, dotY);  ctx.lineTo(dotX + 14, dotY); ctx.stroke();

    // Main dot
    const grad = ctx.createRadialGradient(dotX, dotY, 0, dotX, dotY, 6);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.3, '#98FB98');
    grad.addColorStop(1, 'rgba(152,251,152,0)');
    ctx.beginPath();
    ctx.arc(dotX, dotY, 5, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Corner labels
    ctx.font = '8px DM Mono, monospace';
    ctx.fillStyle = 'rgba(146,225,255,0.35)';
    ctx.fillText('N', W/2 - 3, 10);
    ctx.fillText('S', W/2 - 3, H - 4);
    ctx.fillText('E', W - 10, H/2 + 3);
    ctx.fillText('W', 3, H/2 + 3);

    // Scale bar
    ctx.strokeStyle = 'rgba(146,225,255,0.4)';
    ctx.lineWidth = 1;
    const barX = 10, barY = H - 12, barW = 40;
    ctx.beginPath(); ctx.moveTo(barX, barY); ctx.lineTo(barX + barW, barY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(barX, barY - 3); ctx.lineTo(barX, barY + 3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(barX + barW, barY - 3); ctx.lineTo(barX + barW, barY + 3); ctx.stroke();
    ctx.fillStyle = 'rgba(146,225,255,0.5)';
    ctx.font = '7px DM Mono, monospace';
    ctx.fillText('10m', barX + barW / 2 - 8, barY - 4);

    // Zoom level badge
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath(); ctx.roundRect(W - 36, 6, 30, 14, 4); ctx.fill();
    ctx.fillStyle = 'rgba(146,225,255,0.6)';
    ctx.font = '7px DM Mono, monospace';
    ctx.fillText('z:19', W - 31, 16);

    t++;
    requestAnimationFrame(drawMap);
  }

  drawMap();

  // Coord drift
  setInterval(() => {
    const lat = (GMAP_LAT + (Math.random()-0.5)*0.0002).toFixed(6);
    const lng = (GMAP_LNG + (Math.random()-0.5)*0.0002).toFixed(6);
    document.getElementById('latVal').textContent = lat;
    document.getElementById('lonVal').textContent = lng;
  }, 800);
})();

// ---- Simulate live updates ----
let tick = 40;
let pktRx = 248, pktTx = 251;

function liveUpdate() {
  tick++;
  const t = tick.toString();

  // Altitude Kalman
  const lastK = altKData[altKData.length - 1];
  const newK = Math.max(0, lastK + (Math.random() - 0.45) * 5 + (tick < 80 ? 1.5 : -1.2));
  altKData.push(newK); altKData.shift();
  altKChart.data.labels.push(t); altKChart.data.labels.shift();
  altKChart.data.datasets[0].data = [...altKData];
  altKChart.update('none');

  // Raw altitude
  const newR = newK + (Math.random() - 0.5) * 20;
  altRData.push(newR); altRData.shift();
  altRChart.data.labels.push(t); altRChart.data.labels.shift();
  altRChart.data.datasets[0].data = [...altRData];
  altRChart.update('none');

  // Tilt
  const lastT = tiltData[tiltData.length - 1];
  const newTilt = Math.max(0, Math.min(90, lastT + (Math.random() - 0.5) * 3));
  tiltData.push(newTilt); tiltData.shift();
  tiltChart.data.labels.push(t); tiltChart.data.labels.shift();
  tiltChart.data.datasets[0].data = [...tiltData];
  tiltChart.update('none');

  // Accel
  const newAcc = 9.8 + (Math.random() - 0.5) * 5;
  accelData.push(newAcc); accelData.shift();
  accelChart.data.labels.push(t); accelChart.data.labels.shift();
  accelChart.data.datasets[0].data = [...accelData];
  accelChart.data.datasets[0].backgroundColor = accelData.map(v => v > 11 ? 'rgba(255,78,106,0.7)' : 'rgba(0,245,196,0.45)');
  accelChart.data.datasets[0].borderColor = accelData.map(v => v > 11 ? '#ff4e6a' : '#00f5c4');
  accelChart.update('none');

  // RSSI
  const rssi = -107 + Math.round((Math.random() - 0.5) * 8);
  document.getElementById('rssiVal').textContent = rssi;
  const km = (4.0 + Math.random() * 0.8).toFixed(1);
  document.getElementById('rangeVal').textContent = `~${km} km`;
  buildBars(rssi);

  // Data loss
  pktTx++;
  if (Math.random() > 0.97) { /* drop */ } else { pktRx++; }
  const loss = ((pktTx - pktRx) / pktTx * 100);
  const lossStr = loss.toFixed(1);
  document.getElementById('lossVal').textContent = lossStr + '%';
  document.getElementById('lossDisplay').innerHTML = lossStr + '<span style="font-size:14px;color:var(--text-secondary);">%</span>';
  document.getElementById('pktRx').textContent = pktRx;
  document.getElementById('pktTx').textContent = pktTx;
  const lossFill = document.getElementById('lossFill');
  lossFill.style.width = Math.min(100, loss * 5) + '%';
  if (loss > 5) lossFill.classList.add('danger'); else lossFill.classList.remove('danger');

  // LoRa terminal
  if (Math.random() > 0.3) loraLine();

  // IMU status
  const temps = [37.8, 38.0, 38.2, 38.5, 38.7, 39.0];
  document.getElementById('imuTemp').textContent = temps[Math.floor(Math.random()*temps.length)] + '°C';
  document.getElementById('fusionHz').textContent = (96 + Math.floor(Math.random()*8)) + ' Hz';
}

setInterval(updateClock, 1000);
setInterval(liveUpdate, 800);
updateClock();

// Mouse hover shimmer
document.querySelectorAll('.card, .map-card, .stats-card, .attitude-card').forEach(el => {
  el.addEventListener('mousemove', e => {
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width  * 100).toFixed(1) + '%';
    const y = ((e.clientY - r.top)  / r.height * 100).toFixed(1) + '%';
    el.style.setProperty('--mx', x);
    el.style.setProperty('--my', y);
  });
});


// ===== ATTITUDE 3D VISUALIZER (Three.js) =====

(function() {
  const mount = document.getElementById('attitudeMount');

  // ---- Smooth attitude state ----
  let sRoll = 0, sPitch = 0, sYaw = 0;
  let tRoll = 12, tPitch = -8, tYaw = 45;
  let vRoll = 0.14, vPitch = 0.09, vYaw = 0.17;

  // ---- Scene setup ----
  const scene    = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x00080f, 1);
  mount.appendChild(renderer.domElement);

  function resizeRenderer() {
    const W = mount.clientWidth, H = mount.clientHeight;
    if (W === 0 || H === 0) return;
    renderer.setSize(W, H);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
  }

  // Camera
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
  camera.position.set(0, 0, 6);
  camera.lookAt(0, 0, 0);

  // ---- Lights ----
  scene.add(new THREE.AmbientLight(0x1a3a4a, 0.6));

  const keyLight = new THREE.DirectionalLight(0x98fbd0, 1.4);
  keyLight.position.set(3, 5, 4);
  keyLight.castShadow = true;
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x92e1ff, 0.5);
  fillLight.position.set(-4, 0, 2);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0x007fff, 0.35);
  rimLight.position.set(0, -3, -5);
  scene.add(rimLight);

  const engineGlow = new THREE.PointLight(0xff6010, 1.8, 3.5);
  engineGlow.position.set(0, -1.8, 0);
  scene.add(engineGlow);

  // ---- Materials ----
  const bodyMat = new THREE.MeshPhongMaterial({
    color:     0x1a7a50,
    emissive:  0x062515,
    specular:  0x66ffbb,
    shininess: 80,
  });

  const noseMat = new THREE.MeshPhongMaterial({
    color:     0x98fb98,
    emissive:  0x10401a,
    specular:  0xccffee,
    shininess: 120,
  });

  const finMat = new THREE.MeshPhongMaterial({
    color:     0x0a5535,
    emissive:  0x021508,
    specular:  0x44ffaa,
    shininess: 60,
    side: THREE.DoubleSide,
  });

  const windowMat = new THREE.MeshPhongMaterial({
    color:     0x92e1ff,
    emissive:  0x1a4060,
    specular:  0xffffff,
    shininess: 200,
    transparent: true,
    opacity: 0.85,
  });

  const nozzleMat = new THREE.MeshPhongMaterial({
    color:     0x222222,
    emissive:  0x300a00,
    specular:  0x888888,
    shininess: 40,
  });

  const bandMat = new THREE.MeshPhongMaterial({
    color:     0x007755,
    emissive:  0x001a0d,
    specular:  0x33ff99,
    shininess: 50,
  });

  // ---- Rocket group ----
  const rocket = new THREE.Group();
  scene.add(rocket);

  const bodyGeo = new THREE.CylinderGeometry(0.38, 0.38, 2.4, 32, 1);
  const body    = new THREE.Mesh(bodyGeo, bodyMat);
  body.castShadow = true;
  rocket.add(body);

  const noseGeo = new THREE.ConeGeometry(0.38, 1.1, 32);
  const nose    = new THREE.Mesh(noseGeo, noseMat);
  nose.position.y = 2.4 / 2 + 1.1 / 2;
  nose.castShadow = true;
  rocket.add(nose);

  const tipGeo = new THREE.SphereGeometry(0.06, 12, 12);
  const tip    = new THREE.Mesh(tipGeo, noseMat);
  tip.position.y = nose.position.y + 0.55;
  rocket.add(tip);

  const collarGeo = new THREE.CylinderGeometry(0.40, 0.40, 0.06, 32);
  const collar    = new THREE.Mesh(collarGeo, bandMat);
  collar.position.y = 2.4 / 2;
  rocket.add(collar);

  const midBandGeo = new THREE.CylinderGeometry(0.385, 0.385, 0.05, 32);
  const midBand    = new THREE.Mesh(midBandGeo, bandMat);
  midBand.position.y = 0.2;
  rocket.add(midBand);

  const botBandGeo = new THREE.CylinderGeometry(0.385, 0.385, 0.05, 32);
  const botBand    = new THREE.Mesh(botBandGeo, bandMat);
  botBand.position.y = -0.9;
  rocket.add(botBand);

  const nozzleGeo = new THREE.CylinderGeometry(0.28, 0.38, 0.4, 24, 1, true);
  const nozzle    = new THREE.Mesh(nozzleGeo, nozzleMat);
  nozzle.position.y = -2.4 / 2 - 0.18;
  rocket.add(nozzle);

  const nCapGeo = new THREE.CircleGeometry(0.38, 24);
  const nCap    = new THREE.Mesh(nCapGeo, nozzleMat);
  nCap.rotation.x = -Math.PI / 2;
  nCap.position.y = -2.4 / 2 - 0.38;
  rocket.add(nCap);

  for (let i = 0; i < 3; i++) {
    const a   = (i / 3) * Math.PI * 2;
    const wGeo = new THREE.CircleGeometry(0.07, 12);
    const w    = new THREE.Mesh(wGeo, windowMat);
    w.position.set(Math.cos(a) * 0.39, 0.5, Math.sin(a) * 0.39);
    w.lookAt(Math.cos(a) * 2, 0.5, Math.sin(a) * 2);
    rocket.add(w);
  }

  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2;
    const finShape = new THREE.Shape();
    finShape.moveTo(0, 0);
    finShape.lineTo(0.55, -0.6);
    finShape.lineTo(0.55, -1.1);
    finShape.lineTo(0, -0.5);
    finShape.closePath();

    const finGeo  = new THREE.ShapeGeometry(finShape);
    const fin     = new THREE.Mesh(finGeo, finMat);
    fin.castShadow = true;

    const group = new THREE.Group();
    group.rotation.y = angle;
    fin.position.set(0.38, -2.4 / 2 + 0.5, 0);
    fin.rotation.y = Math.PI / 2;
    group.add(fin);

    const fin2Geo = new THREE.ShapeGeometry(finShape);
    const fin2    = new THREE.Mesh(fin2Geo, finMat);
    fin2.position.set(0.38, -2.4 / 2 + 0.5, 0.02);
    fin2.rotation.y = Math.PI / 2;
    group.add(fin2);

    rocket.add(group);
  }

  // ---- Axis arrows ----
  const axisGroup = new THREE.Group();
  scene.add(axisGroup);

  function makeArrow(dir, color) {
    const mat = new THREE.MeshBasicMaterial({ color });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.9, 8), mat);
    const head  = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.18, 8), mat);
    const g = new THREE.Group();
    shaft.position.y = 0.45;
    head.position.y  = 0.9 + 0.09;
    g.add(shaft);
    g.add(head);
    if (dir === 'x') g.rotation.z = -Math.PI / 2;
    if (dir === 'z') g.rotation.x =  Math.PI / 2;
    axisGroup.add(g);
    return g;
  }

  makeArrow('x', 0xff4e6a);
  makeArrow('y', 0x98fb98);
  makeArrow('z', 0x92e1ff);

  axisGroup.position.set(1.4, -1.4, 0);
  axisGroup.scale.setScalar(0.55);

  // ---- Horizon ring ----
  const horizonGeo = new THREE.RingGeometry(1.1, 1.12, 64);
  const horizonMat = new THREE.MeshBasicMaterial({
    color: 0xf5d800, transparent: true, opacity: 0.18, side: THREE.DoubleSide
  });
  const horizon = new THREE.Mesh(horizonGeo, horizonMat);
  horizon.rotation.x = Math.PI / 2;
  scene.add(horizon);

  // ---- Engine flame particles ----
  const particleCount = 60;
  const pPositions = new Float32Array(particleCount * 3);
  const pVelocities = [];
  const pLife = [];
  for (let i = 0; i < particleCount; i++) {
    pVelocities.push({
      x: (Math.random() - 0.5) * 0.04,
      y: -(0.02 + Math.random() * 0.06),
      z: (Math.random() - 0.5) * 0.04,
    });
    pLife.push(Math.random());
    pPositions[i * 3]     = 0;
    pPositions[i * 3 + 1] = -2.8;
    pPositions[i * 3 + 2] = 0;
  }

  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
  const pMat = new THREE.PointsMaterial({
    color: 0xff7020,
    size: 0.08,
    transparent: true,
    opacity: 0.85,
    sizeAttenuation: true,
  });
  const particles = new THREE.Points(pGeo, pMat);
  rocket.add(particles);

  // ---- Stars background ----
  const starCount = 300;
  const starPos   = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    starPos[i*3]   = (Math.random() - 0.5) * 40;
    starPos[i*3+1] = (Math.random() - 0.5) * 40;
    starPos[i*3+2] = (Math.random() - 0.5) * 40 - 5;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xaaddff, size: 0.04, transparent: true, opacity: 0.6 });
  scene.add(new THREE.Points(starGeo, starMat));

  // ---- Grid plane ----
  const gridHelper = new THREE.GridHelper(6, 12, 0x1a4a3a, 0x0a2a1a);
  gridHelper.position.y = -2.5;
  scene.add(gridHelper);

  // ---- Arc indicators ----
  function updateArc(pathId, valueNorm) {
    const el = document.getElementById(pathId);
    if (!el) return;
    const cx = 18, cy = 16, R = 16;
    const pct  = Math.max(0, Math.min(1, (valueNorm + 1) / 2));
    if (pct < 0.01) { el.setAttribute('d', `M${cx-R},${cy} A0,0 0 0,1 ${cx-R},${cy}`); return; }
    const a    = Math.PI + pct * Math.PI;
    const x    = cx + R * Math.cos(a);
    const y    = cy + R * Math.sin(a);
    const large = pct > 0.5 ? 1 : 0;
    el.setAttribute('d', `M${cx-R},${cy} A${R},${R} 0 ${large},1 ${x.toFixed(2)},${y.toFixed(2)}`);
  }

  let prevTime = performance.now();

  // ---- Render loop ----
  function animate() {
    requestAnimationFrame(animate);
    const now  = performance.now();
    const dt   = Math.min((now - prevTime) / 1000, 0.05);
    prevTime   = now;

    tRoll  += vRoll  * dt * 60; if (Math.abs(tRoll)  > 38) vRoll  *= -1;
    tPitch += vPitch * dt * 60; if (Math.abs(tPitch) > 28) vPitch *= -1;
    tYaw   += vYaw   * dt * 60;
    if (tYaw >  180) tYaw -= 360;
    if (tYaw < -180) tYaw += 360;

    const a = 1 - Math.pow(0.04, dt);
    sRoll  += (tRoll  - sRoll)  * a;
    sPitch += (tPitch - sPitch) * a;
    sYaw   += (tYaw   - sYaw)   * a;

    rocket.rotation.set(
      sPitch * Math.PI / 180,
      sYaw   * Math.PI / 180,
      sRoll  * Math.PI / 180,
      'ZXY'
    );

    engineGlow.intensity = 1.5 + Math.sin(now * 0.008) * 0.5 + Math.random() * 0.3;

    const pos = pGeo.attributes.position.array;
    for (let i = 0; i < particleCount; i++) {
      pLife[i] -= dt * 1.5;
      if (pLife[i] <= 0) {
        pLife[i] = 1.0;
        pos[i*3]   = (Math.random()-0.5)*0.12;
        pos[i*3+1] = -1.25;
        pos[i*3+2] = (Math.random()-0.5)*0.12;
        pVelocities[i] = {
          x: (Math.random()-0.5)*0.04,
          y: -(0.02 + Math.random()*0.06),
          z: (Math.random()-0.5)*0.04,
        };
      }
      pos[i*3]   += pVelocities[i].x;
      pos[i*3+1] += pVelocities[i].y;
      pos[i*3+2] += pVelocities[i].z;
    }
    pGeo.attributes.position.needsUpdate = true;
    pMat.opacity = 0.7 + Math.sin(now * 0.01) * 0.2;
    pMat.color.setHSL(0.07 + Math.sin(now*0.003)*0.02, 1.0, 0.55);

    document.getElementById('rollVal').textContent  = sRoll.toFixed(1);
    document.getElementById('pitchVal').textContent = sPitch.toFixed(1);
    document.getElementById('yawVal').textContent   = sYaw.toFixed(1);
    updateArc('rollArcFill',  sRoll  / 180);
    updateArc('pitchArcFill', sPitch / 90);
    updateArc('yawArcFill',   sYaw   / 180);

    resizeRenderer();
    renderer.render(scene, camera);
  }

  setTimeout(() => {
    resizeRenderer();
    animate();
  }, 120);

  if (window.ResizeObserver) {
    new ResizeObserver(resizeRenderer).observe(mount);
  }
})();


// ===== SNAKE SCALE HOLOGRAM =====

(function() {
  const canvas = document.getElementById('holoCanvas');
  const ctx = canvas.getContext('2d');
  let W, H, t = 0;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    buildGroups();
  }
  window.addEventListener('resize', resize);

  function drawScale(cx, cy, sw, sh, brightness, alpha) {
    const hw = sw * 0.50;
    const hh = sh * 0.54;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.PI / 2);
    const r = Math.round(0   + 152 * brightness);
    const g = Math.round(127 + 124 * brightness);
    const b = Math.round(255 - 103 * brightness);
    const fillA   = alpha * (0.06 + 0.10 * brightness);
    const strokeA = alpha * (0.18 + 0.24 * brightness);
    const glowA   = alpha * Math.max(0, brightness * 0.65);
    ctx.beginPath();
    ctx.moveTo(0, -hh);
    ctx.bezierCurveTo( hw*0.6, -hh*0.6,   hw,  -hh*0.1,   hw,  hh*0.4);
    ctx.bezierCurveTo( hw*0.5,  hh,       -hw*0.5, hh,     -hw,  hh*0.4);
    ctx.bezierCurveTo(-hw,     -hh*0.1,  -hw*0.6, -hh*0.6,   0, -hh);
    ctx.closePath();
    ctx.fillStyle   = `rgba(${r},${g},${b},${fillA})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(${r},${g},${b},${strokeA})`;
    ctx.lineWidth   = 0.7;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-hw*0.48, -hh*0.26);
    ctx.quadraticCurveTo(0, -hh*0.80, hw*0.48, -hh*0.26);
    ctx.strokeStyle = `rgba(${r},${g},${b},${glowA})`;
    ctx.lineWidth   = 1.0;
    ctx.stroke();
    ctx.restore();
  }

  let groups = [];

  function buildGroups() {
    groups = [];
    const COLS = 5, ROWS = 4;
    const zoneW = W / COLS, zoneH = H / ROWS;
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const jx = (Math.random() * 0.6 + 0.2) * zoneW;
        const jy = (Math.random() * 0.6 + 0.2) * zoneH;
        const cx = col * zoneW + jx;
        const cy = row * zoneH + jy;
        const gW = 3 + Math.floor(Math.random() * 3);
        const gH = 3 + Math.floor(Math.random() * 3);
        const sw = 13 + Math.random() * 7;
        const sh = sw * 0.62;
        const spd = 0.010 + Math.random() * 0.012;
        const ph = Math.random() * Math.PI * 2;
        const breathSpd = 0.007 + Math.random() * 0.008;
        const breathPh = Math.random() * Math.PI * 2;
        groups.push({ cx, cy, gW, gH, sw, sh, spd, ph, breathSpd, breathPh });
      }
    }
  }

  function renderGroup(g) {
    const { cx, cy, gW, gH, sw, sh, spd, ph, breathSpd, breathPh } = g;
    const pitchX = sh * 1.05;
    const pitchY = sw * 0.72;
    const totalW = gW * pitchX;
    const totalH = gH * pitchY;
    const breath = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * breathSpd + breathPh));
    for (let r = 0; r < gH; r++) {
      const stagger = (r % 2 === 0) ? 0 : pitchX * 0.5;
      for (let c = 0; c < gW; c++) {
        const sx = cx + c * pitchX + stagger - totalW * 0.5;
        const sy = cy + r * pitchY           - totalH * 0.5;
        const w1 = Math.sin(t * spd * 3.5 + c * 0.60 + r * 0.45 + ph);
        const w2 = Math.sin(t * spd * 2.2 - c * 0.44 - r * 0.38 + ph + 1.8);
        const brightness = (w1 + w2) * 0.5 * 0.5 + 0.5;
        drawScale(sx, sy, sw, sh, brightness, breath);
      }
    }
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    groups.forEach(renderGroup);
    t += 1;
    requestAnimationFrame(render);
  }

  resize();
  render();
})();
// ===== PAGE SWITCHER WITH TRANSITION =====
function showPage(name) {
  const current = document.querySelector('.page.page-active') || document.querySelector('.page[style*="block"]');
  const next = document.getElementById('page-' + name);
  if (current === next) return;

  const icons = { ground: '🚀', cansat: '🛰️' };
  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.toggle('active', n.textContent.trim() === icons[name]);
  });

  if (name === 'cansat') initGauges();

  // Create hologram overlay canvas
  const holoOverlay = document.createElement('canvas');
  holoOverlay.id = 'holoTransition';
  holoOverlay.style.cssText = `
    position:fixed;inset:0;width:100vw;height:100vh;
    z-index:9999;pointer-events:none;
  `;
  document.body.appendChild(holoOverlay);

  const ctx = holoOverlay.getContext('2d');
  const W = holoOverlay.width  = window.innerWidth;
  const H = holoOverlay.height = window.innerHeight;

  let frame = 0;
  const totalFrames = 55;
  let scanY = 0;

  function easeInOut(t) { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t; }

  function renderFrame() {
    ctx.clearRect(0, 0, W, H);
    const t = frame / totalFrames;
    const tE = easeInOut(t);

    // ── PHASE 1: glitch-dissolve out ──
    if (frame < 30) {
      const p = frame / 30;
      const vig = ctx.createRadialGradient(W/2, H/2, H*0.2, W/2, H/2, H*0.9);
      vig.addColorStop(0, `rgba(0,0,0,0)`);
      vig.addColorStop(1, `rgba(0,0,0,${p * 0.85})`);
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, W, H);

      const scanLines = Math.floor(p * 60);
      for (let i = 0; i < scanLines; i++) {
        const ly = (i / 60) * H + (frame * 4) % 8;
        ctx.fillStyle = `rgba(0,245,196,${0.04 + Math.random() * 0.04})`;
        ctx.fillRect(0, ly % H, W, 1.5);
      }

      if (frame > 10 && Math.random() > 0.6) {
        const gy = Math.random() * H;
        const gh = 2 + Math.random() * 18;
        const gx = (Math.random() - 0.5) * 40;
        ctx.fillStyle = `rgba(0,245,196,${0.08 + Math.random() * 0.12})`;
        ctx.fillRect(gx, gy, W, gh);
      }
    }

    // ── PHASE 2: hologram grid materialise ──
    if (frame >= 15 && frame <= 45) {
      const p2 = Math.max(0, Math.min(1, (frame - 15) / 30));

      const gridAlpha = Math.sin(p2 * Math.PI) * 0.18;
      ctx.strokeStyle = `rgba(0,245,196,${gridAlpha})`;
      ctx.lineWidth = 0.5;
      const cols = 32, rows = 20;
      for (let c = 0; c <= cols; c++) {
        const x = (c / cols) * W;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let r = 0; r <= rows; r++) {
        const y = (r / rows) * H;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }

      scanY = ((frame - 15) / 30) * H * 1.4 - H * 0.2;
      const sg = ctx.createLinearGradient(0, scanY - 80, 0, scanY + 80);
      sg.addColorStop(0,   'rgba(0,245,196,0)');
      sg.addColorStop(0.4, `rgba(0,245,196,${0.25 * Math.sin(p2 * Math.PI)})`);
      sg.addColorStop(0.5, `rgba(152,251,152,${0.55 * Math.sin(p2 * Math.PI)})`);
      sg.addColorStop(0.6, `rgba(0,245,196,${0.25 * Math.sin(p2 * Math.PI)})`);
      sg.addColorStop(1,   'rgba(0,245,196,0)');
      ctx.fillStyle = sg;
      ctx.fillRect(0, scanY - 80, W, 160);

      const dots = Math.floor(50 * Math.sin(p2 * Math.PI));
      for (let d = 0; d < dots; d++) {
        const dx = Math.random() * W;
        const dy = Math.random() * H;
        ctx.beginPath();
        ctx.arc(dx, dy, 1 + Math.random() * 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,245,196,${0.3 + Math.random() * 0.5})`;
        ctx.fill();
      }
    }

    // ── PHASE 3: hologram-in for next page ──
    if (frame >= 30) {
      const p3 = Math.max(0, Math.min(1, (frame - 30) / 25));
      ctx.fillStyle = `rgba(0,4,12,${(1 - p3) * 0.90})`;
      ctx.fillRect(0, 0, W, H);

      const fl = Math.floor((1 - p3) * 30);
      for (let i = 0; i < fl; i++) {
        const ly = Math.random() * H;
        ctx.fillStyle = `rgba(0,245,196,${(1 - p3) * 0.06})`;
        ctx.fillRect(0, ly, W, 1);
      }

      if (p3 < 0.8) {
        const ringR = Math.min(W, H) * 0.5 * p3;
        const rg = ctx.createRadialGradient(W/2, H/2, ringR * 0.7, W/2, H/2, ringR);
        rg.addColorStop(0, 'rgba(0,245,196,0)');
        rg.addColorStop(0.85, `rgba(0,245,196,${(1-p3)*0.12})`);
        rg.addColorStop(1, 'rgba(0,245,196,0)');
        ctx.fillStyle = rg;
        ctx.fillRect(0, 0, W, H);
      }
    }

    frame++;
    if (frame <= totalFrames) {
      requestAnimationFrame(renderFrame);
    } else {
      holoOverlay.remove();
    }
  }

  // Switch page at midpoint
  setTimeout(() => {
    if (current) {
      current.classList.remove('page-active');
      current.style.display = 'none';
    }
    next.style.display = 'block';
    requestAnimationFrame(() => next.classList.add('page-active'));
  }, (15 / 60) * 1000 + 100);

  requestAnimationFrame(renderFrame);
}

// Init first page as active
document.addEventListener('DOMContentLoaded', () => {
  const first = document.getElementById('page-ground');
  if (first) { first.style.display = 'block'; first.classList.add('page-active'); }
});


// ===== SENSOR WHEEL =====
let wheelInited = false;

const SENSORS = [
  { name: 'Seeed Studio\nXIAO ESP32-S3 Plus', short: 'ESP32-S3', color: '#98FB98', glow: 'rgba(152,251,152,0.35)', icon: '🖥️' },
  { name: 'GY-BNO055',   short: 'IMU',    color: '#92E1FF', glow: 'rgba(146,225,255,0.35)', icon: '🧭' },
  { name: 'GY-63',       short: 'BARO',   color: '#a78bfa', glow: 'rgba(167,139,250,0.35)', icon: '🌡️' },
  { name: 'GPS\nNEO-N8M',short: 'GPS',    color: '#f5d800', glow: 'rgba(245,216,0,0.35)',   icon: '📍' },
  { name: 'LoRa\nSX1278',short: 'LORA',   color: '#ff8c42', glow: 'rgba(255,140,66,0.35)',  icon: '📡' },
];

function initGauges() {
  if (wheelInited) return;
  wheelInited = true;
  drawSensorWheel();

  // Sync clock 2
  setInterval(() => {
    const now = new Date();
    const el = document.getElementById('clockDisplay2');
    if (el) el.textContent = [now.getHours(), now.getMinutes(), now.getSeconds()]
      .map(v => String(v).padStart(2,'0')).join(':');
  }, 1000);

  // Animate pulse
  let pulse = 0;
  setInterval(() => {
    pulse += 0.04;
    drawSensorWheel(pulse);
  }, 40);
}

function drawSensorWheel(pulse = 0) {
  const canvas = document.getElementById('sensorWheel');
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const size = canvas.offsetWidth || 600;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const cx = size / 2, cy = size / 2;
  const N = SENSORS.length;
  const sliceAngle = (Math.PI * 2) / N;
  const outerR = size * 0.44;
  const innerR = size * 0.18;
  const midR = (outerR + innerR) / 2;

  ctx.clearRect(0, 0, size, size);

  // Outer glow ring
  const glowR = ctx.createRadialGradient(cx, cy, outerR - 20, cx, cy, outerR + 30);
  glowR.addColorStop(0, 'rgba(146,225,255,0.06)');
  glowR.addColorStop(1, 'transparent');
  ctx.beginPath();
  ctx.arc(cx, cy, outerR + 10, 0, Math.PI * 2);
  ctx.fillStyle = glowR;
  ctx.fill();

  // Draw each slice
  SENSORS.forEach((sensor, i) => {
    const startA = i * sliceAngle - Math.PI / 2 - sliceAngle / 2;
    const endA   = startA + sliceAngle;
    const midA   = (startA + endA) / 2;

    // Slice fill (gradient)
    const grad = ctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
    grad.addColorStop(0,   'rgba(0,8,16,0.0)');
    grad.addColorStop(0.4, sensor.color + '18');
    grad.addColorStop(1,   sensor.color + '35');

    ctx.beginPath();
    ctx.moveTo(cx + innerR * Math.cos(startA), cy + innerR * Math.sin(startA));
    ctx.arc(cx, cy, outerR, startA, endA);
    ctx.arc(cx, cy, innerR, endA, startA, true);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Slice border lines
    ctx.beginPath();
    ctx.moveTo(cx + innerR * Math.cos(startA), cy + innerR * Math.sin(startA));
    ctx.lineTo(cx + outerR * Math.cos(startA), cy + outerR * Math.sin(startA));
    ctx.strokeStyle = 'rgba(146,225,255,0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Outer arc highlight
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, startA + 0.05, endA - 0.05);
    ctx.strokeStyle = sensor.color + 'AA';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Inner arc
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, startA + 0.05, endA - 0.05);
    ctx.strokeStyle = sensor.color + '55';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Pulse dot on outer arc
    const pOff = (pulse * 0.3 + i * 0.4) % 1;
    const pAngle = startA + 0.1 + pOff * (sliceAngle - 0.2);
    const pdx = cx + outerR * Math.cos(pAngle);
    const pdy = cy + outerR * Math.sin(pAngle);
    ctx.beginPath();
    ctx.arc(pdx, pdy, 4, 0, Math.PI * 2);
    ctx.fillStyle = sensor.color;
    ctx.shadowColor = sensor.color;
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;

    // ── HORIZONTAL text at the midpoint of each slice ──
    // Calculate the position along the mid-radius for this slice
    const textX = cx + midR * Math.cos(midA);
    const textY = cy + midR * Math.sin(midA);

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Icon
    ctx.font = `${size * 0.038}px serif`;
    ctx.fillStyle = sensor.color;
    ctx.shadowBlur = 0;
    ctx.fillText(sensor.icon, textX, textY - size * 0.065);

    // Short label (bold, sensor color)
    ctx.font = `700 ${size * 0.028}px 'Orbitron', monospace`;
    ctx.fillStyle = sensor.color;
    ctx.shadowColor = sensor.color;
    ctx.shadowBlur = 8;
    ctx.fillText(sensor.short, textX, textY - size * 0.018);
    ctx.shadowBlur = 0;

    // Full name lines (horizontal, smaller)
    const lines = sensor.name.split('\n');
    ctx.font = `${size * 0.018}px 'DM Mono', monospace`;
    ctx.fillStyle = 'rgba(200,230,255,0.70)';
    lines.forEach((line, li) => {
      ctx.fillText(line, textX, textY + size * 0.022 + li * size * 0.022);
    });

    ctx.restore();
  });

  // Last divider line (close the circle)
  const lastA = N * sliceAngle - Math.PI / 2 - sliceAngle / 2;
  ctx.beginPath();
  ctx.moveTo(cx + innerR * Math.cos(lastA), cy + innerR * Math.sin(lastA));
  ctx.lineTo(cx + outerR * Math.cos(lastA), cy + outerR * Math.sin(lastA));
  ctx.strokeStyle = 'rgba(146,225,255,0.15)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Center circle
  const cGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, innerR);
  cGrad.addColorStop(0,   'rgba(0,20,40,0.95)');
  cGrad.addColorStop(0.6, 'rgba(0,12,28,0.90)');
  cGrad.addColorStop(1,   'rgba(0,245,196,0.08)');
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.fillStyle = cGrad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,245,196,0.40)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Center text
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${size * 0.06}px 'Orbitron', monospace`;
  const tGrad = ctx.createLinearGradient(cx, cy - 30, cx, cy + 30);
  tGrad.addColorStop(0, '#00f5c4');
  tGrad.addColorStop(1, '#92E1FF');
  ctx.fillStyle = tGrad;
  ctx.shadowColor = '#00f5c4';
  ctx.shadowBlur = 18;
  ctx.fillText('NAGA', cx, cy - size * 0.04);
  ctx.shadowBlur = 0;
  ctx.font = `${size * 0.022}px 'DM Mono', monospace`;
  ctx.fillStyle = 'rgba(146,225,255,0.55)';
  ctx.fillText('CANSAT', cx, cy + size * 0.04);

  // Outer decorative ring
  ctx.beginPath();
  ctx.arc(cx, cy, outerR + 8, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(146,225,255,0.08)';
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 10]);
  ctx.stroke();
  ctx.setLineDash([]);
}