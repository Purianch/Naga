// ===== MAIN TELEMETRY LOGIC =====

// ---- Custom crosshair + tooltip ----
const tooltipEl = document.createElement('div');
tooltipEl.id = 'chartTooltip';
tooltipEl.style.cssText = `
  position: fixed;
  pointer-events: none;
  z-index: 9990;
  display: none;
  background: rgba(3, 14, 26, 0.82);
  border: 1px solid rgba(146,225,255,0.30);
  border-radius: 8px;
  padding: 7px 11px;
  backdrop-filter: blur(12px);
  box-shadow: 0 0 18px rgba(0,245,196,0.12), inset 0 0 0 1px rgba(152,251,152,0.06);
  min-width: 110px;
  transition: opacity 0.12s;
`;
document.body.appendChild(tooltipEl);

['tl','tr','bl','br'].forEach(pos => {
  const d = document.createElement('div');
  const isTop = pos.includes('t'), isLeft = pos.includes('l');
  d.style.cssText = `
    position:absolute;width:8px;height:8px;
    ${isTop ? 'top:4px' : 'bottom:4px'};
    ${isLeft ? 'left:4px' : 'right:4px'};
    border-color:rgba(0,245,196,0.45);border-style:solid;
    border-width:${isTop?'1px 0 0':'0 0 1px'} ${isLeft?'0 0 0 1px':'0 1px 0 0'};
  `;
  tooltipEl.appendChild(d);
});

const tooltipLabel  = document.createElement('div');
tooltipLabel.style.cssText = 'font-size:9px;color:rgba(146,225,255,0.55);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px;font-family:"DM Mono",monospace;';
const tooltipValue  = document.createElement('div');
tooltipValue.style.cssText = 'font-family:"Orbitron",monospace;font-size:16px;font-weight:700;line-height:1;';
const tooltipSub    = document.createElement('div');
tooltipSub.style.cssText = 'font-size:8px;color:rgba(146,225,255,0.40);margin-top:3px;font-family:"DM Mono",monospace;letter-spacing:1px;';
tooltipEl.appendChild(tooltipLabel);
tooltipEl.appendChild(tooltipValue);
tooltipEl.appendChild(tooltipSub);

let tooltipHideTimer = null;

function showChartTooltip(e, chart, label, unit, color) {
  const points = chart.getElementsAtEventForMode(e, 'index', { intersect: false }, true);
  if (!points.length) { hideTooltip(); return; }
  const idx = points[0].index;
  const raw = chart.data.datasets[0].data[idx];
  if (raw === undefined || raw === null) { hideTooltip(); return; }

  const val = typeof raw === 'number' ? raw.toFixed(2) : raw;
  const tick = chart.data.labels[idx];

  tooltipLabel.textContent  = label;
  tooltipValue.textContent  = val + ' ' + unit;
  tooltipValue.style.color  = color;
  tooltipValue.style.textShadow = `0 0 12px ${color}88`;
  tooltipSub.textContent    = 'T+' + tick + 's';

  const margin = 14;
  let x = e.clientX + margin;
  let y = e.clientY - 48;
  const tw = 140, th = 72;
  if (x + tw > window.innerWidth  - 8) x = e.clientX - tw - margin;
  if (y < 8)                           y = e.clientY + margin;
  if (y + th > window.innerHeight - 8) y = window.innerHeight - th - 8;

  tooltipEl.style.left    = x + 'px';
  tooltipEl.style.top     = y + 'px';
  tooltipEl.style.display = 'block';
  tooltipEl.style.opacity = '1';

  clearTimeout(tooltipHideTimer);
}

function hideTooltip() {
  tooltipHideTimer = setTimeout(() => {
    tooltipEl.style.display = 'none';
  }, 80);
}

const crosshairPlugin = {
  id: 'crosshair',
  afterDraw(chart) {
    if (!chart._hoverX) return;
    const { ctx, chartArea: { top, bottom } } = chart;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(chart._hoverX, top);
    ctx.lineTo(chart._hoverX, bottom);
    ctx.strokeStyle = 'rgba(146,225,255,0.25)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
};
Chart.register(crosshairPlugin);

function attachTooltip(canvas, chart, label, unit, color) {
  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    chart._hoverX = x;
    chart.draw();
    showChartTooltip(e, chart, label, unit, color);
  });
  canvas.addEventListener('mouseleave', () => {
    chart._hoverX = null;
    chart.draw();
    hideTooltip();
  });
}

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

attachTooltip(document.getElementById('altKalmanChart'), altKChart, 'ALTITUDE (KALMAN)', 'm', '#98FB98');
attachTooltip(document.getElementById('altRawChart'),    altRChart, 'ALTITUDE (RAW)',    'm', '#92E1FF');

// ============================================================
// DATA LOSS RATE — Scatter Plot + Linear Regression (FIXED)
// ============================================================

let lossPoints = [];

function calcRegression(pts) {
  const n = pts.length;
  if (n < 2) return { m: 0, b: 0 };
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  pts.forEach(p => { sumX += p.x; sumY += p.y; sumXY += p.x * p.y; sumX2 += p.x * p.x; });
  const denom = (n * sumX2 - sumX * sumX);
  if (denom === 0) return { m: 0, b: sumY / n };
  const m = (n * sumXY - sumX * sumY) / denom;
  const b = (sumY - m * sumX) / n;
  return { m, b };
}

function getRegressionLine(pts) {
  if (pts.length < 2) return [];
  const { m, b } = calcRegression(pts);
  const xs = pts.map(p => p.x);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  return [{ x: xMin, y: m * xMin + b }, { x: xMax, y: m * xMax + b }];
}

const lossCanvas = document.getElementById('dataLossLinearChart');
const lossInner  = document.getElementById('lossScrollInner');
const lossOuter  = document.getElementById('lossScrollOuter');

const LOSS_PX_PER_UNIT   = 6;
const LOSS_MIN_WIDTH     = 600;
const LOSS_CANVAS_HEIGHT = 130;

let dataLossLinearChart = null;

function initLossChart() {
  // Use fixed height constant — never read clientHeight before layout is stable
  lossCanvas.width        = LOSS_MIN_WIDTH;
  lossCanvas.height       = LOSS_CANVAS_HEIGHT;
  lossCanvas.style.width  = LOSS_MIN_WIDTH + 'px';
  lossCanvas.style.height = LOSS_CANVAS_HEIGHT + 'px';
  lossInner.style.width   = LOSS_MIN_WIDTH + 'px';
  lossInner.style.height  = LOSS_CANVAS_HEIGHT + 'px';

  if (dataLossLinearChart) {
    dataLossLinearChart.destroy();
    dataLossLinearChart = null;
  }

  const ctx = lossCanvas.getContext('2d');

  dataLossLinearChart = new Chart(ctx, {
    type: 'scatter',
    data: {
      datasets: [
        {
          label: 'Loss %',
          data: [],
          backgroundColor: 'rgba(255,78,106,0.85)',
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBorderWidth: 0,
          order: 2
        },
        {
          label: 'Trend',
          data: [],
          type: 'line',
          borderColor: 'rgba(146,225,255,0.60)',
          borderWidth: 2,
          backgroundColor: 'rgba(146,225,255,0.07)',
          fill: false,
          pointRadius: 0,
          tension: 0,
          order: 1
        }
      ]
    },
    options: {
      responsive: false,
      maintainAspectRatio: false,
      animation: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: {
        x: {
          type: 'linear',
          min: 0,
          max: 100,
          grid:  { color: 'rgba(0,245,196,0.05)', lineWidth: 1 },
          ticks: { color: '#3a8070', font: { size: 8, family: 'DM Mono' }, stepSize: 50 }
        },
        y: {
          min: 0,
          max: 5,
          grid:  { color: 'rgba(0,245,196,0.08)', lineWidth: 1 },
          ticks: { color: '#3a8070', font: { size: 8, family: 'DM Mono' }, stepSize: 1 }
        }
      }
    }
  });

  attachScatterTooltip();
}

// Resize canvas width only when data grows — never touch height
function resizeLossChart() {
  if (!dataLossLinearChart || lossPoints.length === 0) return;
  const maxX = Math.max(...lossPoints.map(p => p.x));
  const newWidth = Math.max(LOSS_MIN_WIDTH, maxX * LOSS_PX_PER_UNIT + 80);
  const curWidth = parseInt(lossCanvas.style.width) || LOSS_MIN_WIDTH;
  if (newWidth === curWidth) return; // no change needed

  dataLossLinearChart.options.scales.x.max = Math.max(100, maxX + 30);
  dataLossLinearChart.resize(newWidth, LOSS_CANVAS_HEIGHT);
  lossCanvas.style.width = newWidth + 'px';
  lossInner.style.width  = newWidth + 'px';

  if (!lossOuter._userScrolling) {
    lossOuter.scrollLeft = lossOuter.scrollWidth;
  }
}

// Detect user manually scrolling away from right edge
let userScrollTimer = null;
lossOuter.addEventListener('scroll', () => {
  lossOuter._userScrolling = true;
  clearTimeout(userScrollTimer);
  userScrollTimer = setTimeout(() => {
    const distFromRight = lossOuter.scrollWidth - lossOuter.scrollLeft - lossOuter.clientWidth;
    if (distFromRight < 60) lossOuter._userScrolling = false;
  }, 2000);
});

// Drag-to-scroll
(function attachDragScroll(el) {
  let isDragging = false, startX = 0, startScroll = 0;
  el.addEventListener('mousedown', e => {
    isDragging = true; startX = e.clientX; startScroll = el.scrollLeft;
    el.style.cursor = 'grabbing';
  });
  window.addEventListener('mousemove', e => {
    if (!isDragging) return;
    el.scrollLeft = startScroll - (e.clientX - startX);
    lossOuter._userScrolling = true;
    clearTimeout(userScrollTimer);
  });
  window.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    el.style.cursor = 'grab';
    const dist = el.scrollWidth - el.scrollLeft - el.clientWidth;
    if (dist < 60) lossOuter._userScrolling = false;
  });
})(lossOuter);

// Scatter tooltip — attach once, guard against double-attach
let _scatterTooltipAttached = false;
function attachScatterTooltip() {
  if (_scatterTooltipAttached) return;
  _scatterTooltipAttached = true;

  lossCanvas.addEventListener('mousemove', e => {
    if (!dataLossLinearChart) return;
    const rect = lossCanvas.getBoundingClientRect();
    dataLossLinearChart._hoverX = e.clientX - rect.left;
    dataLossLinearChart.draw();

    // intersect:true so we only hit actual scatter dots, not the trend line
    const pts = dataLossLinearChart.getElementsAtEventForMode(e, 'nearest', { intersect: true }, true);
    const hit = pts.find(p => p.datasetIndex === 0);
    if (!hit) { hideTooltip(); return; }

    const raw = dataLossLinearChart.data.datasets[0].data[hit.index];
    if (!raw) { hideTooltip(); return; }

    tooltipLabel.textContent = 'DATA LOSS RATE';
    tooltipValue.textContent = raw.y.toFixed(2) + ' %';
    tooltipValue.style.color = '#ff4e6a';
    tooltipValue.style.textShadow = '0 0 12px #ff4e6a88';
    tooltipSub.textContent = 'T+' + raw.x + 's';

    const margin = 14;
    let x = e.clientX + margin, y = e.clientY - 48;
    if (x + 140 > window.innerWidth - 8)  x = e.clientX - 140 - margin;
    if (y < 8)                             y = e.clientY + margin;
    if (y + 72 > window.innerHeight - 8)   y = window.innerHeight - 80;

    tooltipEl.style.left    = x + 'px';
    tooltipEl.style.top     = y + 'px';
    tooltipEl.style.display = 'block';
    tooltipEl.style.opacity = '1';
    clearTimeout(tooltipHideTimer);
  });

  lossCanvas.addEventListener('mouseleave', () => {
    if (!dataLossLinearChart) return;
    dataLossLinearChart._hoverX = null;
    dataLossLinearChart.draw();
    hideTooltip();
  });
}

// Init after layout settles (double rAF = after first paint)
requestAnimationFrame(() => requestAnimationFrame(initLossChart));

// On window resize — just resize the existing chart, don't rebuild
let lossResizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(lossResizeTimer);
  lossResizeTimer = setTimeout(() => {
    if (dataLossLinearChart) {
      const curWidth = parseInt(lossCanvas.style.width) || LOSS_MIN_WIDTH;
      dataLossLinearChart.resize(curWidth, LOSS_CANVAS_HEIGHT);
    }
  }, 200);
});

// ============================================================

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

// ===== GROUND STATION — GOOGLE MAPS =====
(function initGroundMap() {
  const BASE_LAT = 13.5751993;
  const BASE_LNG = 100.5714753;

  let groundMapKey = '';
  let lastGroundMapUpdate = 0;
  let currentLat = BASE_LAT;
  let currentLng = BASE_LNG;

  function buildSrc(lat, lng) {
    return 'https://www.google.com/maps/embed/v1/view'
         + '?key=' + groundMapKey
         + '&center=' + lat + ',' + lng
         + '&zoom=19&maptype=satellite';
  }

  function refreshMap(lat, lng) {
    currentLat = lat;
    currentLng = lng;

    const latEl = document.getElementById('latVal');
    const lonEl = document.getElementById('lonVal');
    const titleEl = document.getElementById('mapCoordTitle');
    if (latEl) latEl.textContent = lat.toFixed(6);
    if (lonEl) lonEl.textContent = lng.toFixed(6);
    if (titleEl) titleEl.textContent = lat.toFixed(4) + ', ' + lng.toFixed(4);

    if (!groundMapKey) return;

    const now = Date.now();
    if (now - lastGroundMapUpdate >= 5000) {
      const iframe = document.getElementById('groundGoogleMap');
      if (iframe) {
        iframe.src = buildSrc(lat, lng);
        lastGroundMapUpdate = now;
      }
    }
  }

  window.applyGroundMapKey = function () {
    const input = document.getElementById('groundMapKeyInput');
    const key = input ? input.value.trim() : '';
    if (!key) {
      if (input) {
        input.style.borderColor = '#ff4e6a';
        setTimeout(() => { input.style.borderColor = ''; }, 1200);
      }
      return;
    }
    groundMapKey = key;
    window._groundMapKey = key;

    const overlay = document.getElementById('groundMapKeyOverlay');
    if (overlay) {
      overlay.style.transition = 'opacity 0.4s';
      overlay.style.opacity = '0';
      setTimeout(() => { overlay.style.display = 'none'; }, 400);
    }

    const iframe = document.getElementById('groundGoogleMap');
    if (iframe) {
      iframe.src = buildSrc(currentLat, currentLng);
      lastGroundMapUpdate = Date.now();
    }
  };

  window._groundMapRefresh = refreshMap;
  refreshMap(BASE_LAT, BASE_LNG);
})();

// ============================================================
// ROCKET SPEED Digital Display
// ============================================================
(function initRocketSpeed() {
  let speedHistory = [];
  let maxSpeed = 0;
  let prevAlt = null;
  const UPDATE_INTERVAL = 0.8;

  window.updateRocketSpeed = function(currentAlt) {
    if (prevAlt === null) { prevAlt = currentAlt; return; }
    const rawSpeed = (currentAlt - prevAlt) / UPDATE_INTERVAL;
    prevAlt = currentAlt;

    speedHistory.push(rawSpeed);
    if (speedHistory.length > 30) speedHistory.shift();

    const displaySpeed = Math.abs(rawSpeed);
    if (displaySpeed > maxSpeed) maxSpeed = displaySpeed;

    const el    = document.getElementById('rocketSpeedVal');
    const elKmh = document.getElementById('rocketSpeedKmh');
    const elMax = document.getElementById('rocketMaxVal');
    const elBar = document.getElementById('rocketSpeedBar');
    const elLbl = document.getElementById('rocketStatusLabel');

    if (el) {
      el.textContent = displaySpeed.toFixed(1).padStart(5, '0');
      if (displaySpeed < 2) {
        el.style.color = '#98FB98';
        el.style.textShadow = '0 0 24px rgba(152,251,152,0.6),0 0 48px rgba(152,251,152,0.25)';
      } else if (displaySpeed < 8) {
        el.style.color = '#f5d800';
        el.style.textShadow = '0 0 24px rgba(245,216,0,0.6),0 0 48px rgba(245,216,0,0.25)';
      } else {
        el.style.color = '#ff4e6a';
        el.style.textShadow = '0 0 24px rgba(255,78,106,0.6),0 0 48px rgba(255,78,106,0.25)';
      }
    }
    if (elKmh) elKmh.textContent = (displaySpeed * 3.6).toFixed(1) + ' km/h';
    if (elMax) elMax.textContent = maxSpeed.toFixed(1);
    if (elBar) elBar.style.width = Math.min(100, (displaySpeed / 500) * 100) + '%';
    if (elLbl) {
      elLbl.textContent = displaySpeed < 0.5 ? 'STANDBY' : displaySpeed < 5 ? 'ASCENDING' : displaySpeed < 15 ? 'BOOST' : 'MAX THRUST';
    }
  };
})();
// ============================================================

// ===== TEAM NUMBER SIGNAL HELPER =====
function updateTeamSignal(received) {
  const teamNum  = document.querySelector('.cs-team-number');
  const teamRing = document.querySelector('.cs-team-ring');
  const badge    = document.querySelector('.cs-signal-badge');

  if (teamNum) {
    teamNum.classList.toggle('signal-on',  received);
    teamNum.classList.toggle('signal-off', !received);
  }
  if (teamRing) {
    teamRing.classList.toggle('signal-on',  received);
    teamRing.classList.toggle('signal-off', !received);
  }
  if (badge) {
    badge.textContent = received ? 'RX ●' : 'NO SIGNAL';
    badge.classList.toggle('signal-on',  received);
    badge.classList.toggle('signal-off', !received);
  }
}

// ---- Simulate live updates ----
let tick = 40;
let pktRx = 248, pktTx = 251;

function liveUpdate() {
  tick++;
  const t = tick.toString();

  // --- Altitude Kalman ---
  const lastK = altKData[altKData.length - 1];
  const newK = Math.max(0, lastK + (Math.random() - 0.45) * 5 + (tick < 80 ? 1.5 : -1.2));
  altKData.push(newK); altKData.shift();
  altKChart.data.labels.push(t); altKChart.data.labels.shift();
  altKChart.data.datasets[0].data = [...altKData];
  altKChart.update('none');

  // --- Altitude Raw ---
  const newR = newK + (Math.random() - 0.5) * 20;
  altRData.push(newR); altRData.shift();
  altRChart.data.labels.push(t); altRChart.data.labels.shift();
  altRChart.data.datasets[0].data = [...altRData];
  altRChart.update('none');

  // --- Data Loss Rate — add scatter point every 5 ticks ---
  pktTx++;
  const packetReceived = Math.random() > 0.03;
  if (packetReceived) pktRx++;
  const loss = (pktTx - pktRx) / pktTx * 100;
  const newLoss = parseFloat(loss.toFixed(2));

  if (tick % 5 === 0 && dataLossLinearChart) {
    lossPoints.push({ x: tick, y: newLoss });
    dataLossLinearChart.data.datasets[0].data = [...lossPoints];
    dataLossLinearChart.data.datasets[1].data = getRegressionLine(lossPoints);
    dataLossLinearChart.update('none');
    resizeLossChart();
  }

  // --- LoRa signal ---
  const rssi = -107 + Math.round((Math.random() - 0.5) * 8);
  document.getElementById('rssiVal').textContent = rssi;
  const km = (4.0 + Math.random() * 0.8).toFixed(1);
  document.getElementById('rangeVal').textContent = `~${km} km`;
  buildBars(rssi);

  // --- Stats ---
  const lossStr = loss.toFixed(1);
  document.getElementById('lossVal').textContent = lossStr + '%';

  const pktRxEl = document.getElementById('pktRx');
  const pktTxEl = document.getElementById('pktTx');
  if (pktRxEl) pktRxEl.textContent = pktRx;
  if (pktTxEl) pktTxEl.textContent = pktTx;

  // --- Rocket speed ---
  if (window.updateRocketSpeed) window.updateRocketSpeed(newK);

  // --- Team signal ---
  updateTeamSignal(packetReceived);

  // --- LoRa terminal ---
  if (Math.random() > 0.3) loraLine();

  // --- IMU ---
  const temps = [37.8, 38.0, 38.2, 38.5, 38.7, 39.0];
  document.getElementById('imuTemp').textContent = temps[Math.floor(Math.random()*temps.length)] + '°C';
  document.getElementById('fusionHz').textContent = (96 + Math.floor(Math.random()*8)) + ' Hz';

  // --- GPS ---
  const gLat = parseFloat((13.5751993 + (Math.random()-0.5)*0.0002).toFixed(6));
  const gLng = parseFloat((100.5714753 + (Math.random()-0.5)*0.0002).toFixed(6));
  if (window._groundMapRefresh) window._groundMapRefresh(gLat, gLng);
}

setInterval(updateClock, 1000);
setInterval(liveUpdate, 800);
updateClock();

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

  let sRoll = 0, sPitch = 0, sYaw = 0;
  let tRoll = 12, tPitch = -8, tYaw = 45;
  let vRoll = 0.14, vPitch = 0.09, vYaw = 0.17;

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

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
  camera.position.set(0, 0, 6);
  camera.lookAt(0, 0, 0);

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

  const bodyMat  = new THREE.MeshPhongMaterial({ color:0x1a7a50, emissive:0x062515, specular:0x66ffbb, shininess:80 });
  const noseMat  = new THREE.MeshPhongMaterial({ color:0x98fb98, emissive:0x10401a, specular:0xccffee, shininess:120 });
  const finMat   = new THREE.MeshPhongMaterial({ color:0x0a5535, emissive:0x021508, specular:0x44ffaa, shininess:60, side:THREE.DoubleSide });
  const windowMat= new THREE.MeshPhongMaterial({ color:0x92e1ff, emissive:0x1a4060, specular:0xffffff, shininess:200, transparent:true, opacity:0.85 });
  const nozzleMat= new THREE.MeshPhongMaterial({ color:0x222222, emissive:0x300a00, specular:0x888888, shininess:40 });
  const bandMat  = new THREE.MeshPhongMaterial({ color:0x007755, emissive:0x001a0d, specular:0x33ff99, shininess:50 });

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

  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.40, 0.40, 0.06, 32), bandMat);
  collar.position.y = 2.4 / 2;
  rocket.add(collar);

  const midBand = new THREE.Mesh(new THREE.CylinderGeometry(0.385, 0.385, 0.05, 32), bandMat);
  midBand.position.y = 0.2;
  rocket.add(midBand);

  const botBand = new THREE.Mesh(new THREE.CylinderGeometry(0.385, 0.385, 0.05, 32), bandMat);
  botBand.position.y = -0.9;
  rocket.add(botBand);

  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.38, 0.4, 24, 1, true), nozzleMat);
  nozzle.position.y = -2.4 / 2 - 0.18;
  rocket.add(nozzle);

  const nCap = new THREE.Mesh(new THREE.CircleGeometry(0.38, 24), nozzleMat);
  nCap.rotation.x = -Math.PI / 2;
  nCap.position.y = -2.4 / 2 - 0.38;
  rocket.add(nCap);

  for (let i = 0; i < 3; i++) {
    const a   = (i / 3) * Math.PI * 2;
    const w   = new THREE.Mesh(new THREE.CircleGeometry(0.07, 12), windowMat);
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

    const group = new THREE.Group();
    group.rotation.y = angle;

    const fin  = new THREE.Mesh(new THREE.ShapeGeometry(finShape), finMat);
    fin.castShadow = true;
    fin.position.set(0.38, -2.4 / 2 + 0.5, 0);
    fin.rotation.y = Math.PI / 2;
    group.add(fin);

    const fin2 = new THREE.Mesh(new THREE.ShapeGeometry(finShape), finMat);
    fin2.position.set(0.38, -2.4 / 2 + 0.5, 0.02);
    fin2.rotation.y = Math.PI / 2;
    group.add(fin2);

    rocket.add(group);
  }

  const axisGroup = new THREE.Group();
  scene.add(axisGroup);

  function makeArrow(dir, color) {
    const mat = new THREE.MeshBasicMaterial({ color });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.9, 8), mat);
    const head  = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.18, 8), mat);
    const g = new THREE.Group();
    shaft.position.y = 0.45;
    head.position.y  = 0.9 + 0.09;
    g.add(shaft); g.add(head);
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

  const horizonGeo = new THREE.RingGeometry(1.1, 1.12, 64);
  const horizonMat = new THREE.MeshBasicMaterial({ color:0xf5d800, transparent:true, opacity:0.18, side:THREE.DoubleSide });
  const horizon = new THREE.Mesh(horizonGeo, horizonMat);
  horizon.rotation.x = Math.PI / 2;
  scene.add(horizon);

  const particleCount = 60;
  const pPositions = new Float32Array(particleCount * 3);
  const pVelocities = [];
  const pLife = [];
  for (let i = 0; i < particleCount; i++) {
    pVelocities.push({ x:(Math.random()-0.5)*0.04, y:-(0.02+Math.random()*0.06), z:(Math.random()-0.5)*0.04 });
    pLife.push(Math.random());
    pPositions[i*3]=0; pPositions[i*3+1]=-2.8; pPositions[i*3+2]=0;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
  const pMat = new THREE.PointsMaterial({ color:0xff7020, size:0.08, transparent:true, opacity:0.85, sizeAttenuation:true });
  const particles = new THREE.Points(pGeo, pMat);
  rocket.add(particles);

  const starCount = 300;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    starPos[i*3]=(Math.random()-0.5)*40; starPos[i*3+1]=(Math.random()-0.5)*40; starPos[i*3+2]=(Math.random()-0.5)*40-5;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color:0xaaddff, size:0.04, transparent:true, opacity:0.6 })));

  const gridHelper = new THREE.GridHelper(6, 12, 0x1a4a3a, 0x0a2a1a);
  gridHelper.position.y = -2.5;
  scene.add(gridHelper);

  function updateArc(pathId, valueNorm) {
    const el = document.getElementById(pathId);
    if (!el) return;
    const cx=18, cy=16, R=16;
    const pct=Math.max(0,Math.min(1,(valueNorm+1)/2));
    if (pct<0.01){el.setAttribute('d',`M${cx-R},${cy} A0,0 0 0,1 ${cx-R},${cy}`);return;}
    const a=Math.PI+pct*Math.PI;
    const x=cx+R*Math.cos(a), y=cy+R*Math.sin(a);
    const large=pct>0.5?1:0;
    el.setAttribute('d',`M${cx-R},${cy} A${R},${R} 0 ${large},1 ${x.toFixed(2)},${y.toFixed(2)}`);
  }

  let prevTime = performance.now();

  function animate() {
    requestAnimationFrame(animate);
    const now=performance.now(), dt=Math.min((now-prevTime)/1000,0.05);
    prevTime=now;

    tRoll+=vRoll*dt*60; if(Math.abs(tRoll)>38) vRoll*=-1;
    tPitch+=vPitch*dt*60; if(Math.abs(tPitch)>28) vPitch*=-1;
    tYaw+=vYaw*dt*60;
    if(tYaw>180) tYaw-=360;
    if(tYaw<-180) tYaw+=360;

    const a=1-Math.pow(0.04,dt);
    sRoll+=(tRoll-sRoll)*a; sPitch+=(tPitch-sPitch)*a; sYaw+=(tYaw-sYaw)*a;

    rocket.rotation.set(sPitch*Math.PI/180, sYaw*Math.PI/180, sRoll*Math.PI/180, 'ZXY');
    engineGlow.intensity=1.5+Math.sin(now*0.008)*0.5+Math.random()*0.3;

    const pos=pGeo.attributes.position.array;
    for(let i=0;i<particleCount;i++){
      pLife[i]-=dt*1.5;
      if(pLife[i]<=0){
        pLife[i]=1.0;
        pos[i*3]=(Math.random()-0.5)*0.12;
        pos[i*3+1]=-1.25;
        pos[i*3+2]=(Math.random()-0.5)*0.12;
        pVelocities[i]={x:(Math.random()-0.5)*0.04,y:-(0.02+Math.random()*0.06),z:(Math.random()-0.5)*0.04};
      }
      pos[i*3]+=pVelocities[i].x; pos[i*3+1]+=pVelocities[i].y; pos[i*3+2]+=pVelocities[i].z;
    }
    pGeo.attributes.position.needsUpdate=true;
    pMat.opacity=0.7+Math.sin(now*0.01)*0.2;
    pMat.color.setHSL(0.07+Math.sin(now*0.003)*0.02,1.0,0.55);

    document.getElementById('rollVal').textContent  = sRoll.toFixed(1);
    document.getElementById('pitchVal').textContent = sPitch.toFixed(1);
    document.getElementById('yawVal').textContent   = sYaw.toFixed(1);
    updateArc('rollArcFill',  sRoll/180);
    updateArc('pitchArcFill', sPitch/90);
    updateArc('yawArcFill',   sYaw/180);

    resizeRenderer();
    renderer.render(scene, camera);
  }

  setTimeout(() => { resizeRenderer(); animate(); }, 120);
  if(window.ResizeObserver) new ResizeObserver(resizeRenderer).observe(mount);
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
    const hw=sw*0.50, hh=sh*0.54;
    ctx.save();
    ctx.translate(cx,cy);
    ctx.rotate(Math.PI/2);
    const r=Math.round(0+152*brightness), g=Math.round(127+124*brightness), b=Math.round(255-103*brightness);
    const fillA=alpha*(0.06+0.10*brightness), strokeA=alpha*(0.18+0.24*brightness), glowA=alpha*Math.max(0,brightness*0.65);
    ctx.beginPath();
    ctx.moveTo(0,-hh);
    ctx.bezierCurveTo(hw*0.6,-hh*0.6,hw,-hh*0.1,hw,hh*0.4);
    ctx.bezierCurveTo(hw*0.5,hh,-hw*0.5,hh,-hw,hh*0.4);
    ctx.bezierCurveTo(-hw,-hh*0.1,-hw*0.6,-hh*0.6,0,-hh);
    ctx.closePath();
    ctx.fillStyle=`rgba(${r},${g},${b},${fillA})`;
    ctx.fill();
    ctx.strokeStyle=`rgba(${r},${g},${b},${strokeA})`;
    ctx.lineWidth=0.7;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-hw*0.48,-hh*0.26);
    ctx.quadraticCurveTo(0,-hh*0.80,hw*0.48,-hh*0.26);
    ctx.strokeStyle=`rgba(${r},${g},${b},${glowA})`;
    ctx.lineWidth=1.0;
    ctx.stroke();
    ctx.restore();
  }

  let groups=[];

  function buildGroups(){
    groups=[];
    const COLS=5,ROWS=4;
    const zoneW=W/COLS,zoneH=H/ROWS;
    for(let row=0;row<ROWS;row++){
      for(let col=0;col<COLS;col++){
        const jx=(Math.random()*0.6+0.2)*zoneW, jy=(Math.random()*0.6+0.2)*zoneH;
        const cx=col*zoneW+jx, cy=row*zoneH+jy;
        const gW=3+Math.floor(Math.random()*3), gH=3+Math.floor(Math.random()*3);
        const sw=13+Math.random()*7, sh=sw*0.62;
        const spd=0.010+Math.random()*0.012, ph=Math.random()*Math.PI*2;
        const breathSpd=0.007+Math.random()*0.008, breathPh=Math.random()*Math.PI*2;
        groups.push({cx,cy,gW,gH,sw,sh,spd,ph,breathSpd,breathPh});
      }
    }
  }

  function renderGroup(g){
    const{cx,cy,gW,gH,sw,sh,spd,ph,breathSpd,breathPh}=g;
    const pitchX=sh*1.05,pitchY=sw*0.72;
    const totalW=gW*pitchX,totalH=gH*pitchY;
    const breath=0.4+0.6*(0.5+0.5*Math.sin(t*breathSpd+breathPh));
    for(let r=0;r<gH;r++){
      const stagger=(r%2===0)?0:pitchX*0.5;
      for(let c=0;c<gW;c++){
        const sx=cx+c*pitchX+stagger-totalW*0.5, sy=cy+r*pitchY-totalH*0.5;
        const w1=Math.sin(t*spd*3.5+c*0.60+r*0.45+ph);
        const w2=Math.sin(t*spd*2.2-c*0.44-r*0.38+ph+1.8);
        const brightness=(w1+w2)*0.5*0.5+0.5;
        drawScale(sx,sy,sw,sh,brightness,breath);
      }
    }
  }

  function render(){
    ctx.clearRect(0,0,W,H);
    groups.forEach(renderGroup);
    t+=1;
    requestAnimationFrame(render);
  }

  resize();
  render();
})();


// ===== PAGE SWITCHER =====
function showPage(name) {
  const current = document.querySelector('.page.page-active') || document.querySelector('.page[style*="block"]');
  const next = document.getElementById('page-' + name);
  if (current === next) return;

  const icons = { ground: '🚀', cansat: '🥫' };
  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.toggle('active', n.textContent.trim() === icons[name]);
  });

  if (name === 'cansat') {
    if(typeof initGauges==='function') initGauges();
    if(typeof initCansatDashboard==='function') initCansatDashboard();
  }

  const ov = document.createElement('canvas');
  ov.style.cssText = 'position:fixed;inset:0;z-index:9999;pointer-events:none;';
  document.body.appendChild(ov);
  const ctx = ov.getContext('2d');
  const W = ov.width  = window.innerWidth;
  const H = ov.height = window.innerHeight;

  const DURATION    = 900;
  const SWITCH_AT   = 0.48;
  let startTime     = null;
  let pageSwitched  = false;

  function easeIn(t)  { return t * t * t; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  function renderFrame(ts) {
    if (!startTime) startTime = ts;
    const progress = Math.min((ts - startTime) / DURATION, 1);

    ctx.clearRect(0, 0, W, H);

    if (progress <= SWITCH_AT) {
      const p = easeIn(progress / SWITCH_AT);
      ctx.fillStyle = `rgba(2,8,16,${p})`;
      ctx.fillRect(0, 0, W, H);
      const scanY = p * H;
      const sg = ctx.createLinearGradient(0, scanY - 60, 0, scanY + 20);
      sg.addColorStop(0,   'rgba(0,245,196,0)');
      sg.addColorStop(0.6, `rgba(0,245,196,${(1 - p) * 0.18})`);
      sg.addColorStop(1,   'rgba(0,245,196,0)');
      ctx.fillStyle = sg;
      ctx.fillRect(0, scanY - 60, W, 80);
    }

    if (!pageSwitched && progress >= SWITCH_AT) {
      pageSwitched = true;
      if (current) { current.classList.remove('page-active'); current.style.display = 'none'; }
      next.style.display = 'block';
      requestAnimationFrame(() => next.classList.add('page-active'));
    }

    if (progress > SWITCH_AT) {
      const p = easeOut((progress - SWITCH_AT) / (1 - SWITCH_AT));
      ctx.fillStyle = `rgba(2,8,16,${1 - p})`;
      ctx.fillRect(0, 0, W, H);

      if (p < 0.85) {
        const irisR  = easeOut(p / 0.85) * Math.hypot(W, H) * 0.6;
        const irisAlpha = (1 - p / 0.85) * 0.22;
        const ig = ctx.createRadialGradient(W/2, H/2, irisR * 0.7, W/2, H/2, irisR);
        ig.addColorStop(0,    'rgba(0,245,196,0)');
        ig.addColorStop(0.82, `rgba(0,245,196,${irisAlpha})`);
        ig.addColorStop(0.92, `rgba(146,225,255,${irisAlpha * 0.5})`);
        ig.addColorStop(1,    'rgba(0,245,196,0)');
        ctx.fillStyle = ig;
        ctx.fillRect(0, 0, W, H);
      }

      const scanY2 = H - easeOut(p) * (H + 60);
      const sg2 = ctx.createLinearGradient(0, scanY2 - 20, 0, scanY2 + 60);
      sg2.addColorStop(0,   'rgba(0,245,196,0)');
      sg2.addColorStop(0.4, `rgba(152,251,152,${(1 - p) * 0.20})`);
      sg2.addColorStop(1,   'rgba(0,245,196,0)');
      ctx.fillStyle = sg2;
      ctx.fillRect(0, scanY2 - 20, W, 80);
    }

    if (progress < 1) {
      requestAnimationFrame(renderFrame);
    } else {
      ov.remove();
    }
  }

  requestAnimationFrame(renderFrame);
}

document.addEventListener('DOMContentLoaded', () => {
  const first = document.getElementById('page-ground');
  if (first) { first.style.display='block'; first.classList.add('page-active'); }
});


// ===== CANSAT DASHBOARD INIT =====
let cansatInited = false;

function initCansatDashboard() {
  if (cansatInited) return;
  cansatInited = true;

  const teamNum  = document.querySelector('.cs-team-number');
  const teamRing = document.querySelector('.cs-team-ring');
  const teamWrap = document.querySelector('.cs-team-number-wrap');

  if (teamNum)  teamNum.classList.add('signal-on');
  if (teamRing) teamRing.classList.add('signal-on');

  if (teamWrap && !teamWrap.querySelector('.cs-signal-badge')) {
    const badge = document.createElement('div');
    badge.className = 'cs-signal-badge signal-on';
    badge.textContent = 'RX ●';
    teamWrap.appendChild(badge);
  }

  initGyroAxes();
  initGyroHorizon();
  initGyroCompass();
  initCsMap();
  initCsAccel();
  startCansatLive();
}

let wheelInited = false;
function initGauges() {
  if(wheelInited) return;
  wheelInited = true;
  setInterval(()=>{
    const now=new Date();
    const el=document.getElementById('clockDisplay2');
    if(el) el.textContent=[now.getHours(),now.getMinutes(),now.getSeconds()].map(v=>String(v).padStart(2,'0')).join(':');
  },1000);
  initCansatDashboard();
}


// ---- 1. 3D Wireframe Box ----
function initGyroAxes() {
  const canvas = document.getElementById('gyroAxesCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let roll = 0, pitch = 0, yaw = 0;
  let tRoll = 15, tPitch = 20, tYaw = 30;
  let vRoll = 0.22, vPitch = 0.18, vYaw = 0.28;

  function resize() {
    const p = canvas.parentElement;
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = p.clientWidth  * dpr;
    canvas.height = p.clientHeight * dpr;
    canvas.style.width  = p.clientWidth  + 'px';
    canvas.style.height = p.clientHeight + 'px';
  }
  resize();
  if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas.parentElement);

  function rotate3D(x, y, z) {
    const cr = Math.cos(roll), sr = Math.sin(roll);
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const cy2 = Math.cos(yaw), sy = Math.sin(yaw);
    let x1 = cy2*x + sy*z, z1 = -sy*x + cy2*z, y1 = y;
    let y2 = cp*y1 - sp*z1, z2 = sp*y1 + cp*z1, x2 = x1;
    let x3 = cr*x2 - sr*y2, y3 = sr*x2 + cr*y2;
    return [x3, y3, z2];
  }

  function project(x, y, z) {
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.width / dpr, H = canvas.height / dpr;
    const fov = 5.5;
    const scale = fov / (fov + z);
    const size = Math.min(W, H) * 0.26;
    return { sx: W/2 + x * size * scale, sy: H/2 - y * size * scale, z: z };
  }

  const verts3D = [
    [-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],
    [-1,-1, 1],[1,-1, 1],[1,1, 1],[-1,1, 1],
  ];
  const edges = [
    [0,1],[1,2],[2,3],[3,0],
    [4,5],[5,6],[6,7],[7,4],
    [0,4],[1,5],[2,6],[3,7],
  ];
  const faces = [
    { verts:[4,5,6,7], color:'rgba(167,139,250,0.12)' },
    { verts:[0,1,2,3], color:'rgba(146,225,255,0.07)' },
    { verts:[3,2,6,7], color:'rgba(152,251,152,0.07)' },
    { verts:[0,1,5,4], color:'rgba(255,140,66,0.05)'  },
    { verts:[1,2,6,5], color:'rgba(86,216,245,0.06)'  },
    { verts:[0,3,7,4], color:'rgba(167,139,250,0.05)' },
  ];

  function drawBox() {
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.width / dpr, H = canvas.height / dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#020c18'); bg.addColorStop(1, '#030e20');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(146,225,255,0.04)'; ctx.lineWidth = 0.5;
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

    const projected = verts3D.map(([x,y,z]) => {
      const [rx,ry,rz] = rotate3D(x, y, z);
      return project(rx, ry, rz);
    });

    const sortedFaces = faces.map(f => ({
      ...f,
      avgZ: f.verts.reduce((s,i) => s + projected[i].z, 0) / f.verts.length
    })).sort((a,b) => a.avgZ - b.avgZ);

    sortedFaces.forEach(f => {
      const pts = f.verts.map(i => projected[i]);
      ctx.beginPath();
      ctx.moveTo(pts[0].sx, pts[0].sy);
      pts.slice(1).forEach(p => ctx.lineTo(p.sx, p.sy));
      ctx.closePath();
      ctx.fillStyle = f.color;
      ctx.fill();
    });

    edges.forEach(([a, b]) => {
      const pa = projected[a], pb = projected[b];
      const avgZ = (pa.z + pb.z) / 2;
      const alpha = 0.35 + (avgZ + 2) / 4 * 0.5;
      ctx.beginPath();
      ctx.moveTo(pa.sx, pa.sy);
      ctx.lineTo(pb.sx, pb.sy);
      ctx.strokeStyle = `rgba(167,139,250,${Math.min(0.9, Math.max(0.15, alpha))})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    });

    const axesDef = [
      { dir:[1,0,0], color:'#ff4e6a', label:'X' },
      { dir:[0,1,0], color:'#98FB98', label:'Y' },
      { dir:[0,0,-1], color:'#92E1FF', label:'Z' },
    ];
    axesDef.forEach(ax => {
      const [rx,ry,rz] = rotate3D(...ax.dir.map(v => v*1.65));
      const tip = project(rx, ry, rz);
      const [bx,by,bz] = rotate3D(...ax.dir.map(v => -v*0.3));
      const base = project(bx, by, bz);
      const orig = project(0, 0, 0);

      ctx.save();
      ctx.shadowColor = ax.color; ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(base.sx, base.sy);
      ctx.lineTo(tip.sx, tip.sy);
      ctx.strokeStyle = ax.color;
      ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();

      const ang = Math.atan2(tip.sy - orig.sy, tip.sx - orig.sx);
      ctx.beginPath();
      ctx.moveTo(tip.sx, tip.sy);
      ctx.lineTo(tip.sx - 10*Math.cos(ang-0.4), tip.sy - 10*Math.sin(ang-0.4));
      ctx.lineTo(tip.sx - 10*Math.cos(ang+0.4), tip.sy - 10*Math.sin(ang+0.4));
      ctx.closePath();
      ctx.fillStyle = ax.color; ctx.fill();
    });

    const o = project(0,0,0);
    ctx.beginPath(); ctx.arc(o.sx, o.sy, 3, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fill();
  }

  function animateAxes() {
    requestAnimationFrame(animateAxes);
    tRoll  += vRoll * 0.3; if (Math.abs(tRoll)  > 40) vRoll  *= -1;
    tPitch += vPitch * 0.3; if (Math.abs(tPitch) > 30) vPitch *= -1;
    tYaw   += vYaw  * 0.3;
    if (tYaw > 180) tYaw -= 360; if (tYaw < -180) tYaw += 360;

    const r = parseFloat(document.getElementById('gyroRollDisp')?.textContent) || tRoll;
    const p = parseFloat(document.getElementById('gyroPitchDisp')?.textContent) || tPitch;
    const y = parseFloat(document.getElementById('gyroYawDisp')?.textContent) || tYaw;

    roll  += (r * Math.PI/180 - roll)  * 0.06;
    pitch += (p * Math.PI/180 - pitch) * 0.06;
    yaw   += (y * Math.PI/180 - yaw)   * 0.06;

    drawBox();
  }
  animateAxes();
}

// ---- 2. Artificial Horizon ----
function initGyroHorizon() {
  const canvas = document.getElementById('gyroHorizonCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const S = 160;
  canvas.width = S * (window.devicePixelRatio||1);
  canvas.height = S * (window.devicePixelRatio||1);
  canvas.style.width = S + 'px';
  canvas.style.height = S + 'px';

  let dispRoll = 0, dispPitch = 0;

  function draw() {
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cx = S/2, cy = S/2, R = S/2 - 6;
    ctx.clearRect(0, 0, S, S);
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI*2); ctx.clip();
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(dispRoll * Math.PI/180);
    const pitchOff = (dispPitch / 90) * R;
    ctx.fillStyle = '#0a3060'; ctx.fillRect(-R, -R*2 + pitchOff, R*2, R*2);
    ctx.fillStyle = '#4a2800'; ctx.fillRect(-R, pitchOff, R*2, R*2);
    ctx.beginPath(); ctx.moveTo(-R, pitchOff); ctx.lineTo(R, pitchOff);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
    for (let d = 10; d <= 40; d += 10) {
      const y0 = pitchOff - (d/90)*R, y1 = pitchOff + (d/90)*R;
      const w = d % 20 === 0 ? 28 : 18;
      [y0, y1].forEach(yy => {
        ctx.beginPath(); ctx.moveTo(-w, yy); ctx.lineTo(w, yy);
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 0.8; ctx.stroke();
      });
    }
    ctx.restore(); ctx.restore();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI*2);
    ctx.strokeStyle = '#a78bfa88'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx-22, cy); ctx.lineTo(cx-8, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx+8,  cy); ctx.lineTo(cx+22, cy); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI*2);
    ctx.fillStyle = '#fff'; ctx.fill();
    for (let a = -60; a <= 60; a += 10) {
      const rad = (a - 90) * Math.PI/180;
      const inner = R - (Math.abs(a)%30===0 ? 10 : 6);
      ctx.beginPath();
      ctx.moveTo(cx + R*Math.cos(rad), cy + R*Math.sin(rad));
      ctx.lineTo(cx + inner*Math.cos(rad), cy + inner*Math.sin(rad));
      ctx.strokeStyle = 'rgba(167,139,250,0.7)'; ctx.lineWidth = 1; ctx.stroke();
    }
  }

  function anim() {
    requestAnimationFrame(anim);
    const r = parseFloat(document.getElementById('gyroRollDisp')?.textContent) || 0;
    const p = parseFloat(document.getElementById('gyroPitchDisp')?.textContent) || 0;
    dispRoll  += (r - dispRoll) * 0.08;
    dispPitch += (p - dispPitch) * 0.08;
    draw();
  }
  anim();
}

// ---- 3. Compass ----
function initGyroCompass() {
  const canvas = document.getElementById('gyroCompassCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const S = 160;
  canvas.width = S * (window.devicePixelRatio||1);
  canvas.height = S * (window.devicePixelRatio||1);
  canvas.style.width = S + 'px';
  canvas.style.height = S + 'px';

  let dispYaw = 0;

  function draw() {
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cx = S/2, cy = S/2, R = S/2 - 8;
    ctx.clearRect(0, 0, S, S);
    const grad = ctx.createRadialGradient(cx, cy, R*0.7, cx, cy, R);
    grad.addColorStop(0, 'rgba(167,139,250,0.05)');
    grad.addColorStop(1, 'rgba(167,139,250,0.20)');
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI*2);
    ctx.fillStyle = grad; ctx.fill();
    ctx.strokeStyle = '#a78bfa55'; ctx.lineWidth = 2; ctx.stroke();
    const dirs = ['N','NE','E','SE','S','SW','W','NW'];
    for (let i = 0; i < 36; i++) {
      const ang = (i/36)*Math.PI*2 - dispYaw*Math.PI/180 - Math.PI/2;
      const major = i % 9 === 0;
      const inner = R - (major ? 14 : 7);
      ctx.beginPath();
      ctx.moveTo(cx + R*Math.cos(ang), cy + R*Math.sin(ang));
      ctx.lineTo(cx + inner*Math.cos(ang), cy + inner*Math.sin(ang));
      ctx.strokeStyle = major ? 'rgba(167,139,250,0.9)' : 'rgba(167,139,250,0.3)';
      ctx.lineWidth = major ? 1.5 : 0.6; ctx.stroke();
      if (major) {
        const li = i / 9;
        const lx = cx + (inner-10)*Math.cos(ang);
        const ly = cy + (inner-10)*Math.sin(ang);
        ctx.font = '700 9px Orbitron, monospace';
        ctx.fillStyle = li === 0 ? '#ff4e6a' : '#a78bfacc';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(dirs[li], lx, ly);
      }
    }
    const needleAng = -Math.PI/2;
    ctx.save();
    ctx.shadowColor = '#ff4e6a'; ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(cx + (R-18)*Math.cos(needleAng), cy + (R-18)*Math.sin(needleAng));
    ctx.lineTo(cx + 6*Math.cos(needleAng+Math.PI/2), cy + 6*Math.sin(needleAng+Math.PI/2));
    ctx.lineTo(cx - 6*Math.cos(needleAng+Math.PI/2), cy - 6*Math.sin(needleAng+Math.PI/2));
    ctx.closePath(); ctx.fillStyle = '#ff4e6a'; ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + (R-18)*Math.cos(needleAng+Math.PI), cy + (R-18)*Math.sin(needleAng+Math.PI));
    ctx.lineTo(cx + 6*Math.cos(needleAng+Math.PI/2), cy + 6*Math.sin(needleAng+Math.PI/2));
    ctx.lineTo(cx - 6*Math.cos(needleAng+Math.PI/2), cy - 6*Math.sin(needleAng+Math.PI/2));
    ctx.closePath(); ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fill();
    ctx.restore();
    ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI*2);
    ctx.fillStyle = '#fff'; ctx.fill();
  }

  function anim() {
    requestAnimationFrame(anim);
    const y = parseFloat(document.getElementById('gyroYawDisp')?.textContent) || 0;
    dispYaw += (y - dispYaw) * 0.08;
    draw();
  }
  anim();
}

// ---- 4. CanSat GPS Map ----
function initCsMap() {
  const baseLat = 13.5751993;
  const baseLng = 100.5714753;

  let lastMapUpdate = 0;

  function updateMapSrc(lat, lng) {
    const now = Date.now();
    if (now - lastMapUpdate < 5000) return;
    lastMapUpdate = now;

    const iframe = document.getElementById('csGoogleMap');
    if (!iframe) return;

    const key = window._groundMapKey || '';
    if (!key) return;

    iframe.src = `https://www.google.com/maps/embed/v1/view?key=${key}&center=${lat},${lng}&zoom=18&maptype=satellite`;
  }

  setInterval(() => {
    const lat = parseFloat((baseLat + (Math.random()-0.5)*0.0003).toFixed(6));
    const lng = parseFloat((baseLng + (Math.random()-0.5)*0.0003).toFixed(6));

    const e = id => document.getElementById(id);
    if(e('csLatVal'))     e('csLatVal').textContent     = lat;
    if(e('csLonVal'))     e('csLonVal').textContent     = lng;
    if(e('csLatOverlay')) e('csLatOverlay').textContent = lat;
    if(e('csLonOverlay')) e('csLonOverlay').textContent = lng;

    updateMapSrc(lat, lng);
  }, 900);
}

// ---- 5. Accel Gauge ----
function initCsAccel() {
  const canvas = document.getElementById('csAccelCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const S = 200;
  canvas.width = S * (window.devicePixelRatio||1);
  canvas.height = S * (window.devicePixelRatio||1);
  canvas.style.width = S+'px'; canvas.style.height = S+'px';

  let dispMag = 9.8;
  const MAX_ACC = 30;

  function draw(mag) {
    const dpr = window.devicePixelRatio||1;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    const cx = S/2, cy = S/2, R = S/2 - 12;
    ctx.clearRect(0,0,S,S);
    const startA = Math.PI * 1.1, endA = Math.PI * 0.1;
    const sweep = (2*Math.PI - startA + endA);
    ctx.beginPath(); ctx.arc(cx,cy,R,startA,endA,false);
    ctx.strokeStyle = 'rgba(86,216,245,0.08)'; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.stroke();
    const zones = [
      {from:0,to:0.33,color:'#00f5c4'},{from:0.33,to:0.67,color:'#f5d800'},{from:0.67,to:1,color:'#ff4e6a'}
    ];
    zones.forEach(z => {
      ctx.beginPath(); ctx.arc(cx,cy,R,startA+z.from*sweep,startA+z.to*sweep,false);
      ctx.strokeStyle = z.color+'44'; ctx.lineWidth = 12; ctx.lineCap = 'butt'; ctx.stroke();
    });
    const pct = Math.min(mag/MAX_ACC, 1);
    const fillEnd = startA + pct * sweep;
    const fc = mag < 10 ? '#00f5c4' : mag < 20 ? '#f5d800' : '#ff4e6a';
    ctx.save(); ctx.shadowColor = fc; ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.arc(cx,cy,R,startA,fillEnd,false);
    ctx.strokeStyle = fc; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.stroke();
    ctx.restore();
    for (let v = 0; v <= MAX_ACC; v += 5) {
      const t2 = v/MAX_ACC;
      const ang = startA + t2*sweep;
      const major = v % 10 === 0;
      const inner = R - (major ? 14 : 8);
      ctx.beginPath();
      ctx.moveTo(cx+(R+1)*Math.cos(ang), cy+(R+1)*Math.sin(ang));
      ctx.lineTo(cx+inner*Math.cos(ang), cy+inner*Math.sin(ang));
      ctx.strokeStyle = major ? 'rgba(86,216,245,0.7)' : 'rgba(86,216,245,0.25)';
      ctx.lineWidth = major ? 1.5 : 0.8; ctx.stroke();
      if (major) {
        const lx = cx+(inner-10)*Math.cos(ang), ly = cy+(inner-10)*Math.sin(ang);
        ctx.font = `500 ${R*0.12}px DM Mono, monospace`;
        ctx.fillStyle = 'rgba(86,216,245,0.5)';
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(v, lx, ly);
      }
    }
    const el = document.getElementById('csAccelMag');
    if (el) el.textContent = mag.toFixed(2);
    el && (el.style.color = fc);
    el && (el.style.textShadow = `0 0 16px ${fc}88`);
  }

  function anim() {
    requestAnimationFrame(anim);
    const target = parseFloat(window._csAccelMagTarget || 9.8);
    dispMag += (target - dispMag) * 0.08;
    draw(dispMag);
  }
  anim();
}

// ---- 6. Live data for cansat ----
function startCansatLive() {
  let csRoll=0, csPitch=0, csYaw=0, csSpinRate=0;
  let csAx=0, csAy=0, csAz=9.8;
  let csAmp=320, csVolt=3.7, csOhm=0;

  function update() {
    csRoll  += (Math.random()-0.5)*4;
    csPitch += (Math.random()-0.5)*3;
    csYaw   += (Math.random()-0.3)*5;
    if (csYaw > 180) csYaw -= 360; if (csYaw < -180) csYaw += 360;
    csRoll  = Math.max(-180, Math.min(180, csRoll));
    csPitch = Math.max(-90, Math.min(90, csPitch));
    csSpinRate = (Math.random()-0.5)*120;

    csAx = (Math.random()-0.5)*4;
    csAy = (Math.random()-0.5)*4;
    csAz = 9.5 + Math.random()*1.5;
    const mag = Math.sqrt(csAx**2 + csAy**2 + csAz**2);
    window._csAccelMagTarget = mag;

    csAmp  = 280 + Math.random()*120;
    csVolt = 3.5 + Math.random()*0.8;
    csOhm  = csVolt / (csAmp/1000);

    const gx = (Math.random()-0.5)*50;
    const gy = (Math.random()-0.5)*50;
    const gz = csSpinRate;

    const e = id => document.getElementById(id);

    if(e('gyroRollDisp'))  e('gyroRollDisp').textContent  = csRoll.toFixed(1);
    if(e('gyroPitchDisp')) e('gyroPitchDisp').textContent = csPitch.toFixed(1);
    if(e('gyroYawDisp'))   e('gyroYawDisp').textContent   = csYaw.toFixed(1);
    if(e('gyroGxDisp'))    e('gyroGxDisp').textContent    = gx.toFixed(2);
    if(e('gyroGyDisp'))    e('gyroGyDisp').textContent    = gy.toFixed(2);
    if(e('gyroGzDisp'))    e('gyroGzDisp').textContent    = gz.toFixed(2);

    const tilt = Math.sqrt(csRoll**2 + csPitch**2);
    if(e('gyroTiltVal'))  e('gyroTiltVal').textContent  = tilt.toFixed(1);
    if(e('gyroSpinVal'))  e('gyroSpinVal').textContent  = Math.abs(csYaw).toFixed(1);

    if(e('gyroTiltBar'))  e('gyroTiltBar').style.width  = Math.min(100,(tilt/90)*100)+'%';
    if(e('gyroSpinBar'))  e('gyroSpinBar').style.width  = Math.min(100,(Math.abs(csYaw)/180)*100)+'%';
    if(e('gyroRollBar2')) e('gyroRollBar2').style.width = Math.min(100,(Math.abs(csRoll)/180)*100)+'%';

    if(e('csAmpVal'))    e('csAmpVal').textContent  = csAmp.toFixed(0);
    if(e('csVoltVal'))   e('csVoltVal').textContent = csVolt.toFixed(2);
    if(e('csOhmVal'))    e('csOhmVal').textContent  = csOhm.toFixed(2);
  }

  setInterval(update, 700);
  update();
}


// ===== SERIAL PORT CONNECTION =====
async function connectSerial() {
  if (!('serial' in navigator)) {
    alert('Web Serial API ไม่รองรับ browser นี้\nใช้ Chrome หรือ Edge เวอร์ชันล่าสุดครับ');
    return;
  }
  try {
    const port = await navigator.serial.requestPort();
    await port.open({ baudRate: 9600 });

    const decoder = new TextDecoderStream();
    port.readable.pipeTo(decoder.writable);
    const reader = decoder.readable.getReader();

    let buffer = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;
      const lines = buffer.split('\n');
      buffer = lines.pop();
      lines.forEach(line => parseSerialLine(line.trim()));
    }
  } catch (err) {
    console.warn('Serial connect error:', err);
  }
}

function parseSerialLine(line) {
  if (!line) return;

  const div = document.createElement('div');
  div.className = 'lora-line lora-new';
  const ts = new Date().toISOString().substr(11, 8);
  div.innerHTML = `<span class="lora-ts">${ts}</span><span class="lora-data">${line}</span>`;
  loraEl.appendChild(div);
  if (loraEl.children.length > 60) loraEl.removeChild(loraEl.firstChild);
  loraEl.scrollTop = loraEl.scrollHeight;

  // parse CSV: ALT_K,ALT_R,LAT,LON,RSSI,ROLL,PITCH,YAW,SPEED,LOSS
  const parts = line.split(',');
  if (parts.length >= 2) {
    const altK = parseFloat(parts[0]);
    const altR = parseFloat(parts[1]);

    if (!isNaN(altK)) {
      altKData.push(altK); altKData.shift();
      altKChart.data.datasets[0].data = [...altKData];
      altKChart.update('none');
    }
    if (!isNaN(altR)) {
      altRData.push(altR); altRData.shift();
      altRChart.data.datasets[0].data = [...altRData];
      altRChart.update('none');
    }
    if (parts[2] && parts[3]) {
      const lat = parseFloat(parts[2]), lng = parseFloat(parts[3]);
      if (!isNaN(lat) && !isNaN(lng) && window._groundMapRefresh) {
        window._groundMapRefresh(lat, lng);
      }
    }
    if (parts[4]) {
      const rssi = parseInt(parts[4]);
      if (!isNaN(rssi)) {
        document.getElementById('rssiVal').textContent = rssi;
        buildBars(rssi);
      }
    }
    if (parts[5] && parts[6] && parts[7]) {
      const roll  = parseFloat(parts[5]);
      const pitch = parseFloat(parts[6]);
      const yaw   = parseFloat(parts[7]);
      if (!isNaN(roll))  document.getElementById('rollVal').textContent  = roll.toFixed(1);
      if (!isNaN(pitch)) document.getElementById('pitchVal').textContent = pitch.toFixed(1);
      if (!isNaN(yaw))   document.getElementById('yawVal').textContent   = yaw.toFixed(1);
    }
    if (parts[8]) {
      const speed = parseFloat(parts[8]);
      if (!isNaN(speed) && window.updateRocketSpeed) window.updateRocketSpeed(speed);
    }
    if (parts[9]) {
      const loss = parseFloat(parts[9]);
      if (!isNaN(loss) && dataLossLinearChart) {
        lossPoints.push({ x: tick, y: loss });
        dataLossLinearChart.data.datasets[0].data = [...lossPoints];
        dataLossLinearChart.data.datasets[1].data = getRegressionLine(lossPoints);
        dataLossLinearChart.update('none');
        resizeLossChart();
        document.getElementById('lossVal').textContent = loss.toFixed(1) + '%';
      }
    }
  }
}
