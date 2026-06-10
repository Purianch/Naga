// ===== MAIN TELEMETRY LOGIC =====

// ---- Custom crosshair + tooltip ----
// =====================================================
// NAGA — Firebase Realtime Listener
// วางโค้ดนี้ใน main.js หรือ index.html ก่อน </body>
// =====================================================
// ต้องเพิ่ม script tag นี้ใน index.html ก่อน main.js:
//
//  <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"></script>
//  <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-database-compat.js"></script>
//
// =====================================================

// ---- Firebase Config (แก้ค่าตาม project ของคุณ) ----
const firebaseConfig = {
  apiKey: "AIzaSyCjgCb7eJEIbzrTaej2IrihPT2IXBNXknU",
  authDomain: "naga-cansat-26472.firebaseapp.com",
  databaseURL: "https://naga-cansat-26472-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "naga-cansat-26472",
  storageBucket: "naga-cansat-26472.firebasestorage.app",
  messagingSenderId: "460079322130",
  appId: "1:460079322130:web:a65f5e98ccf5bb77caf4cb",
  measurementId: "G-14LDHLFKWG"
};

// ---- Init Firebase ----
const firebaseApp = firebase.initializeApp(firebaseConfig);
const database    = firebase.database();

// ---- Listen to /naga/latest (realtime) ----
database.ref("/naga/latest").on("value", (snapshot) => {
  const data = snapshot.val();
  if (!data) return;

  console.log("[Firebase] New data:", data);

  const {
    lat, lon,
    alt, alt_raw,
    rssi, gps_valid, sats,
    roll, pitch, yaw,
    gx, gy, gz,
    ax, ay, az,
    voltage, ampere, ohm,
    speed, loss,
    timestamp
  } = data;

  // ---- แผนที่ + พิกัด ----
  if (gps_valid && lat && lon) {
    if (window._groundMapRefresh) window._groundMapRefresh(lat, lon);
    if (window._csMapRefresh)    window._csMapRefresh(lat, lon);

    const safe = (id, val, dec=6) => { const el = document.getElementById(id); if(el) el.textContent = typeof val==='number' ? val.toFixed(dec) : val; };
    safe("latVal",        lat);
    safe("lonVal",        lon);
    safe("csLatVal",      lat);
    safe("csLonVal",      lon);
    safe("csLatOverlay",  lat);
    safe("csLonOverlay",  lon);
    const titleEl = document.getElementById("mapCoordTitle");
    if (titleEl) titleEl.textContent = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  }

  // ---- RSSI + Signal Bars ----
  if (rssi !== undefined) {
    const rssiEl = document.getElementById("rssiVal");
    if (rssiEl) rssiEl.textContent = rssi;
    if (typeof buildBars === "function") buildBars(rssi);
  }

  // ---- Altitude charts ----
  if (alt !== undefined && !isNaN(alt)) {
    // altKChart removed (ground station page removed)

    const raw = (alt_raw !== undefined && !isNaN(alt_raw)) ? alt_raw : alt + (Math.random()-0.5)*2;
    altRData.push(raw);
    altRData.shift();
    // chart removed

    // Rocket speed (คำนวณจาก altitude)
    if (window.updateRocketSpeed) window.updateRocketSpeed(alt);
  }

  // ---- Roll / Pitch / Yaw ----
  if (roll  !== undefined) { const el = document.getElementById("rollVal");  if(el) el.textContent  = parseFloat(roll).toFixed(1); }
  if (pitch !== undefined) { const el = document.getElementById("pitchVal"); if(el) el.textContent  = parseFloat(pitch).toFixed(1); }
  if (yaw   !== undefined) { const el = document.getElementById("yawVal");   if(el) el.textContent  = parseFloat(yaw).toFixed(1); }

  // ---- Gyro bars (CanSat page) ----
  if (roll !== undefined && pitch !== undefined && yaw !== undefined) {
    const r = parseFloat(roll), p = parseFloat(pitch), y = parseFloat(yaw);
    const tilt = Math.sqrt(r**2 + p**2);

    const safe = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
    safe("gyroRollDisp",  r.toFixed(1));
    safe("gyroPitchDisp", p.toFixed(1));
    safe("gyroYawDisp",   y.toFixed(1));
    safe("gyroTiltVal",   tilt.toFixed(1));
    safe("gyroSpinVal",   Math.abs(y).toFixed(1));

    const pct = id => Math.min(100, (parseFloat(document.getElementById(id)?.textContent||0)/180)*100)+'%';
    const setW = (id, w) => { const el = document.getElementById(id); if(el) el.style.width = w; };
    setW("gyroTiltBar",  Math.min(100,(tilt/90)*100)+'%');
    setW("gyroSpinBar",  Math.min(100,(Math.abs(y)/180)*100)+'%');
    setW("gyroRollBar2", Math.min(100,(Math.abs(r)/180)*100)+'%');

    // อัปเดต 3D rocket ถ้ามี
    if (window._rocketSetAttitude) window._rocketSetAttitude(r, p, y);
  }

  // ---- Gyro raw (°/s) ----
  if (gx !== undefined) { const el = document.getElementById("gyroGxDisp"); if(el) el.textContent = parseFloat(gx).toFixed(2); }
  if (gy !== undefined) { const el = document.getElementById("gyroGyDisp"); if(el) el.textContent = parseFloat(gy).toFixed(2); }
  if (gz !== undefined) { const el = document.getElementById("gyroGzDisp"); if(el) el.textContent = parseFloat(gz).toFixed(2); }

  // ---- Accelerometer ----
  if (ax !== undefined && ay !== undefined && az !== undefined) {
    const mag = Math.sqrt(parseFloat(ax)**2 + parseFloat(ay)**2 + parseFloat(az)**2);
    window._csAccelMagTarget = mag;
    const el = document.getElementById("csAccelMag");
    if (el) el.textContent = mag.toFixed(2);
  }

  // ---- Power Monitor ----
  if (ampere !== undefined) { const el = document.getElementById("csAmpVal");  if(el) el.textContent = parseFloat(ampere).toFixed(0); }
  if (voltage !== undefined){ const el = document.getElementById("csVoltVal"); if(el) el.textContent = parseFloat(voltage).toFixed(2); }
  if (ohm !== undefined)    { const el = document.getElementById("csOhmVal");  if(el) el.textContent = parseFloat(ohm).toFixed(2); }
  // คำนวณ ohm อัตโนมัติถ้าไม่มี field ohm
  if (ohm === undefined && ampere && voltage && parseFloat(ampere) > 0) {
    const calcOhm = parseFloat(voltage) / (parseFloat(ampere)/1000);
    const el = document.getElementById("csOhmVal");
    if(el) el.textContent = calcOhm.toFixed(2);
  }

  // ---- Data Loss Rate ----
  // dataLossLinearChart removed

  // ---- LoRa Terminal ----
  const loraTerminal = document.getElementById("loraTerminal");
  if (loraTerminal) {
    const ts = timestamp ? timestamp.substr(11,8) : new Date().toISOString().substr(11,8);
    const div = document.createElement("div");
    div.className = "lora-line lora-new";
    div.innerHTML = `<span class="lora-ts">${ts}</span><span class="lora-data">`
      + `LAT:${lat?.toFixed(5)} LON:${lon?.toFixed(5)} ALT:${alt?.toFixed(1)}m `
      + `RSSI:${rssi}dBm ROLL:${roll?.toFixed(1)} PITCH:${pitch?.toFixed(1)}`
      + `</span>`;
    loraTerminal.appendChild(div);
    if (loraTerminal.children.length > 60) loraTerminal.removeChild(loraTerminal.firstChild);
    loraTerminal.scrollTop = loraTerminal.scrollHeight;
  }

  // ---- Live badge ----
  const liveDot = document.querySelector(".live-dot");
  if (liveDot) {
    liveDot.style.background = "#00f5c4";
    setTimeout(() => { liveDot.style.background = ""; }, 500);
  }
});

// ---- Connection status ----
database.ref(".info/connected").on("value", (snap) => {
  const connected = snap.val();
  const statusDot = document.querySelector(".status-dot");
  if (statusDot) {
    statusDot.style.background = connected ? "#00f5c4" : "#ff4e6a";
    statusDot.title = connected ? "Firebase Connected" : "Firebase Disconnected";
  }
  console.log("[Firebase]", connected ? "Connected" : "Disconnected");
});

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

  let _holoActive = true;
  window._holoSetActive = v => { _holoActive = v; };

  function render(){
    if (_holoActive) {
      ctx.clearRect(0,0,W,H);
      groups.forEach(renderGroup);
      t += 2.5; // compensate for lower fps
    }
    setTimeout(() => requestAnimationFrame(render), 50); // ~20fps
  }

  resize();
  render();
})();


// ===== PAGE ACTIVE FLAGS =====
window._pageActive = { ground: false, cansat: true };

// ===== PAGE SWITCHER =====
function showPage(name) {
  const current = document.querySelector('.page.page-active') || document.querySelector('.page[style*="block"]');
  const next = document.getElementById('page-' + name);
  if (current === next) return;

  // pause/resume loops
  window._pageActive.ground = (name === 'ground');
  window._pageActive.cansat = (name === 'cansat');

  const icons = { ground: '🚀', cansat: '🥫' };
  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.toggle('active', n.textContent.trim() === icons[name]);
  });

  if (name === 'cansat') {
    if(typeof initGauges==='function') initGauges();
    if(typeof initCansatDashboard==='function') initCansatDashboard();
    // map อาจ init ตอน display:none → ต้อง invalidate หลัง page โชว์
    setTimeout(() => {
      const m = window._csMapInstance;
      if (m) m.invalidateSize();
    }, 500);
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
  // init cansat immediately — it's the only page
  if(typeof initGauges==='function') initGauges();
  if(typeof initCansatDashboard==='function') initCansatDashboard();
  setTimeout(() => {
    const m = window._csMapInstance;
    if (m) m.invalidateSize();
  }, 500);
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
  //startCansatLive();
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
    if (!window._pageActive?.cansat) return; // pause when not on cansat page
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
    if (!window._pageActive?.cansat) return;
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
    if (!window._pageActive?.cansat) return;
    const y = parseFloat(document.getElementById('gyroYawDisp')?.textContent) || 0;
    dispYaw += (y - dispYaw) * 0.08;
    draw();
  }
  anim();
}

// ---- 4. CanSat GPS Map (Leaflet) ----
function initCsMap() {
  const baseLat = 13.5751993;
  const baseLng = 100.5714753;

  // Init Leaflet map
  const csMap = L.map('csLeafletMap', {
    center: [baseLat, baseLng],
    zoom: 17,
    zoomControl: true,
    attributionControl: false
  });
  window._csMapInstance = csMap;

  // OpenStreetMap tile — ดูคล้าย Google Maps
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
  }).addTo(csMap);

  // Yellow marker icon for CanSat
  const yellowIcon = L.divIcon({
    className: '',
    html: `<div style="
      width:14px;height:14px;border-radius:50%;
      background:#f5d800;
      box-shadow:0 0 12px #f5d800, 0 0 24px rgba(245,216,0,0.6);
      border:2px solid rgba(245,216,0,0.8);
      position:relative;">
      <div style="
        position:absolute;inset:-8px;border-radius:50%;
        border:1.5px solid rgba(245,216,0,0.5);
        animation:pingAnim 1.8s ease-out infinite;">
      </div>
    </div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });

  const csMarker = L.marker([baseLat, baseLng], { icon: yellowIcon }).addTo(csMap);

  // Track trail path
  const trailCoords = [[baseLat, baseLng]];
  const trailLine = L.polyline(trailCoords, {
    color: 'rgba(245,216,0,0.5)',
    weight: 2,
    dashArray: '4 4'
  }).addTo(csMap);

  // Expose refresh function for Firebase listener
  window._csMapRefresh = function(lat, lng) {
    csMarker.setLatLng([lat, lng]);
    csMap.panTo([lat, lng]);
    trailCoords.push([lat, lng]);
    if (trailCoords.length > 200) trailCoords.shift();
    trailLine.setLatLngs(trailCoords);

    const e = id => document.getElementById(id);
    if(e('csLatVal'))     e('csLatVal').textContent     = lat.toFixed(6);
    if(e('csLonVal'))     e('csLonVal').textContent     = lng.toFixed(6);
    if(e('csLatOverlay')) e('csLatOverlay').textContent = lat.toFixed(6);
    if(e('csLonOverlay')) e('csLonOverlay').textContent = lng.toFixed(6);
  };

  // บอก Leaflet ให้ recalculate ขนาดหลัง layout เสร็จ
  setTimeout(() => csMap.invalidateSize(), 400);
  if (window.ResizeObserver) {
    new ResizeObserver(() => csMap.invalidateSize()).observe(document.getElementById('csLeafletMap'));
  }
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
    if (!window._pageActive?.cansat) return;
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
      // altKChart removed
    }
    if (!isNaN(altR)) {
      altRData.push(altR); altRData.shift();
      // altRChart removed
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
      // dataLossLinearChart removed
    }
  }
// ===== MAIN TELEMETRY LOGIC =====

// ---- Custom crosshair + tooltip ----
// =====================================================
// NAGA — Firebase Realtime Listener
// วางโค้ดนี้ใน main.js หรือ index.html ก่อน </body>
// =====================================================
// ต้องเพิ่ม script tag นี้ใน index.html ก่อน main.js:
//
//  <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"></script>
//  <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-database-compat.js"></script>
//
// =====================================================

// ---- Firebase Config (แก้ค่าตาม project ของคุณ) ----
const firebaseConfig = {
  apiKey: "AIzaSyCjgCb7eJEIbzrTaej2IrihPT2IXBNXknU",
  authDomain: "naga-cansat-26472.firebaseapp.com",
  databaseURL: "https://naga-cansat-26472-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "naga-cansat-26472",
  storageBucket: "naga-cansat-26472.firebasestorage.app",
  messagingSenderId: "460079322130",
  appId: "1:460079322130:web:a65f5e98ccf5bb77caf4cb",
  measurementId: "G-14LDHLFKWG"
};

// ---- Init Firebase ----
const firebaseApp = firebase.initializeApp(firebaseConfig);
const database    = firebase.database();

// ---- Listen to /naga/latest (realtime) ----
database.ref("/naga/latest").on("value", (snapshot) => {
  const data = snapshot.val();
  if (!data) return;

  console.log("[Firebase] New data:", data);

  const {
    lat, lon,
    alt, alt_raw,
    rssi, gps_valid, sats,
    roll, pitch, yaw,
    gx, gy, gz,
    ax, ay, az,
    voltage, ampere, ohm,
    speed, loss,
    timestamp
  } = data;

  // ---- แผนที่ + พิกัด ----
  if (gps_valid && lat && lon) {
    if (window._groundMapRefresh) window._groundMapRefresh(lat, lon);
    if (window._csMapRefresh)    window._csMapRefresh(lat, lon);

    const safe = (id, val, dec=6) => { const el = document.getElementById(id); if(el) el.textContent = typeof val==='number' ? val.toFixed(dec) : val; };
    safe("latVal",        lat);
    safe("lonVal",        lon);
    safe("csLatVal",      lat);
    safe("csLonVal",      lon);
    safe("csLatOverlay",  lat);
    safe("csLonOverlay",  lon);
    const titleEl = document.getElementById("mapCoordTitle");
    if (titleEl) titleEl.textContent = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  }

  // ---- RSSI + Signal Bars ----
  if (rssi !== undefined) {
    const rssiEl = document.getElementById("rssiVal");
    if (rssiEl) rssiEl.textContent = rssi;
    if (typeof buildBars === "function") buildBars(rssi);
  }

  // ---- Altitude charts ----
  if (alt !== undefined && !isNaN(alt)) {
    // altKChart removed (ground station page removed)

    const raw = (alt_raw !== undefined && !isNaN(alt_raw)) ? alt_raw : alt + (Math.random()-0.5)*2;
    altRData.push(raw);
    altRData.shift();
    // chart removed

    // Rocket speed (คำนวณจาก altitude)
    if (window.updateRocketSpeed) window.updateRocketSpeed(alt);
  }

  // ---- Roll / Pitch / Yaw ----
  if (roll  !== undefined) { const el = document.getElementById("rollVal");  if(el) el.textContent  = parseFloat(roll).toFixed(1); }
  if (pitch !== undefined) { const el = document.getElementById("pitchVal"); if(el) el.textContent  = parseFloat(pitch).toFixed(1); }
  if (yaw   !== undefined) { const el = document.getElementById("yawVal");   if(el) el.textContent  = parseFloat(yaw).toFixed(1); }

  // ---- Gyro bars (CanSat page) ----
  if (roll !== undefined && pitch !== undefined && yaw !== undefined) {
    const r = parseFloat(roll), p = parseFloat(pitch), y = parseFloat(yaw);
    const tilt = Math.sqrt(r**2 + p**2);

    const safe = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
    safe("gyroRollDisp",  r.toFixed(1));
    safe("gyroPitchDisp", p.toFixed(1));
    safe("gyroYawDisp",   y.toFixed(1));
    safe("gyroTiltVal",   tilt.toFixed(1));
    safe("gyroSpinVal",   Math.abs(y).toFixed(1));

    const pct = id => Math.min(100, (parseFloat(document.getElementById(id)?.textContent||0)/180)*100)+'%';
    const setW = (id, w) => { const el = document.getElementById(id); if(el) el.style.width = w; };
    setW("gyroTiltBar",  Math.min(100,(tilt/90)*100)+'%');
    setW("gyroSpinBar",  Math.min(100,(Math.abs(y)/180)*100)+'%');
    setW("gyroRollBar2", Math.min(100,(Math.abs(r)/180)*100)+'%');

    // อัปเดต 3D rocket ถ้ามี
    if (window._rocketSetAttitude) window._rocketSetAttitude(r, p, y);
  }

  // ---- Gyro raw (°/s) ----
  if (gx !== undefined) { const el = document.getElementById("gyroGxDisp"); if(el) el.textContent = parseFloat(gx).toFixed(2); }
  if (gy !== undefined) { const el = document.getElementById("gyroGyDisp"); if(el) el.textContent = parseFloat(gy).toFixed(2); }
  if (gz !== undefined) { const el = document.getElementById("gyroGzDisp"); if(el) el.textContent = parseFloat(gz).toFixed(2); }

  // ---- Accelerometer ----
  if (ax !== undefined && ay !== undefined && az !== undefined) {
    const mag = Math.sqrt(parseFloat(ax)**2 + parseFloat(ay)**2 + parseFloat(az)**2);
    window._csAccelMagTarget = mag;
    const el = document.getElementById("csAccelMag");
    if (el) el.textContent = mag.toFixed(2);
  }

  // ---- Power Monitor ----
  if (ampere !== undefined) { const el = document.getElementById("csAmpVal");  if(el) el.textContent = parseFloat(ampere).toFixed(0); }
  if (voltage !== undefined){ const el = document.getElementById("csVoltVal"); if(el) el.textContent = parseFloat(voltage).toFixed(2); }
  if (ohm !== undefined)    { const el = document.getElementById("csOhmVal");  if(el) el.textContent = parseFloat(ohm).toFixed(2); }
  // คำนวณ ohm อัตโนมัติถ้าไม่มี field ohm
  if (ohm === undefined && ampere && voltage && parseFloat(ampere) > 0) {
    const calcOhm = parseFloat(voltage) / (parseFloat(ampere)/1000);
    const el = document.getElementById("csOhmVal");
    if(el) el.textContent = calcOhm.toFixed(2);
  }

  // ---- Data Loss Rate ----
  // dataLossLinearChart removed

  // ---- LoRa Terminal ----
  const loraTerminal = document.getElementById("loraTerminal");
  if (loraTerminal) {
    const ts = timestamp ? timestamp.substr(11,8) : new Date().toISOString().substr(11,8);
    const div = document.createElement("div");
    div.className = "lora-line lora-new";
    div.innerHTML = `<span class="lora-ts">${ts}</span><span class="lora-data">`
      + `LAT:${lat?.toFixed(5)} LON:${lon?.toFixed(5)} ALT:${alt?.toFixed(1)}m `
      + `RSSI:${rssi}dBm ROLL:${roll?.toFixed(1)} PITCH:${pitch?.toFixed(1)}`
      + `</span>`;
    loraTerminal.appendChild(div);
    if (loraTerminal.children.length > 60) loraTerminal.removeChild(loraTerminal.firstChild);
    loraTerminal.scrollTop = loraTerminal.scrollHeight;
  }

  // ---- Live badge ----
  const liveDot = document.querySelector(".live-dot");
  if (liveDot) {
    liveDot.style.background = "#00f5c4";
    setTimeout(() => { liveDot.style.background = ""; }, 500);
  }
});

// ---- Connection status ----
database.ref(".info/connected").on("value", (snap) => {
  const connected = snap.val();
  const statusDot = document.querySelector(".status-dot");
  if (statusDot) {
    statusDot.style.background = connected ? "#00f5c4" : "#ff4e6a";
    statusDot.title = connected ? "Firebase Connected" : "Firebase Disconnected";
  }
  console.log("[Firebase]", connected ? "Connected" : "Disconnected");
});

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

  let _holoActive = true;
  window._holoSetActive = v => { _holoActive = v; };

  function render(){
    if (_holoActive) {
      ctx.clearRect(0,0,W,H);
      groups.forEach(renderGroup);
      t += 2.5; // compensate for lower fps
    }
    setTimeout(() => requestAnimationFrame(render), 50); // ~20fps
  }

  resize();
  render();
})();


// ===== PAGE ACTIVE FLAGS =====
window._pageActive = { ground: false, cansat: true };

// ===== PAGE SWITCHER =====
function showPage(name) {
  const current = document.querySelector('.page.page-active') || document.querySelector('.page[style*="block"]');
  const next = document.getElementById('page-' + name);
  if (current === next) return;

  // pause/resume loops
  window._pageActive.ground = (name === 'ground');
  window._pageActive.cansat = (name === 'cansat');

  const icons = { ground: '🚀', cansat: '🥫' };
  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.toggle('active', n.textContent.trim() === icons[name]);
  });

  if (name === 'cansat') {
    if(typeof initGauges==='function') initGauges();
    if(typeof initCansatDashboard==='function') initCansatDashboard();
    // map อาจ init ตอน display:none → ต้อง invalidate หลัง page โชว์
    setTimeout(() => {
      const m = window._csMapInstance;
      if (m) m.invalidateSize();
    }, 500);
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
  // init cansat immediately — it's the only page
  if(typeof initGauges==='function') initGauges();
  if(typeof initCansatDashboard==='function') initCansatDashboard();
  setTimeout(() => {
    const m = window._csMapInstance;
    if (m) m.invalidateSize();
  }, 500);
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
  //startCansatLive();
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
    if (!window._pageActive?.cansat) return; // pause when not on cansat page
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
    if (!window._pageActive?.cansat) return;
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
    if (!window._pageActive?.cansat) return;
    const y = parseFloat(document.getElementById('gyroYawDisp')?.textContent) || 0;
    dispYaw += (y - dispYaw) * 0.08;
    draw();
  }
  anim();
}

// ---- 4. CanSat GPS Map (Leaflet) ----
function initCsMap() {
  const baseLat = 13.5751993;
  const baseLng = 100.5714753;

  // Init Leaflet map
  const csMap = L.map('csLeafletMap', {
    center: [baseLat, baseLng],
    zoom: 17,
    zoomControl: true,
    attributionControl: false
  });
  window._csMapInstance = csMap;

  // OpenStreetMap tile — ดูคล้าย Google Maps
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
  }).addTo(csMap);

  // Yellow marker icon for CanSat
  const yellowIcon = L.divIcon({
    className: '',
    html: `<div style="
      width:14px;height:14px;border-radius:50%;
      background:#f5d800;
      box-shadow:0 0 12px #f5d800, 0 0 24px rgba(245,216,0,0.6);
      border:2px solid rgba(245,216,0,0.8);
      position:relative;">
      <div style="
        position:absolute;inset:-8px;border-radius:50%;
        border:1.5px solid rgba(245,216,0,0.5);
        animation:pingAnim 1.8s ease-out infinite;">
      </div>
    </div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });

  const csMarker = L.marker([baseLat, baseLng], { icon: yellowIcon }).addTo(csMap);

  // Track trail path
  const trailCoords = [[baseLat, baseLng]];
  const trailLine = L.polyline(trailCoords, {
    color: 'rgba(245,216,0,0.5)',
    weight: 2,
    dashArray: '4 4'
  }).addTo(csMap);

  // Expose refresh function for Firebase listener
  window._csMapRefresh = function(lat, lng) {
    csMarker.setLatLng([lat, lng]);
    csMap.panTo([lat, lng]);
    trailCoords.push([lat, lng]);
    if (trailCoords.length > 200) trailCoords.shift();
    trailLine.setLatLngs(trailCoords);

    const e = id => document.getElementById(id);
    if(e('csLatVal'))     e('csLatVal').textContent     = lat.toFixed(6);
    if(e('csLonVal'))     e('csLonVal').textContent     = lng.toFixed(6);
    if(e('csLatOverlay')) e('csLatOverlay').textContent = lat.toFixed(6);
    if(e('csLonOverlay')) e('csLonOverlay').textContent = lng.toFixed(6);
  };

  // บอก Leaflet ให้ recalculate ขนาดหลัง layout เสร็จ
  setTimeout(() => csMap.invalidateSize(), 400);
  if (window.ResizeObserver) {
    new ResizeObserver(() => csMap.invalidateSize()).observe(document.getElementById('csLeafletMap'));
  }
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
    if (!window._pageActive?.cansat) return;
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
      // altKChart removed
    }
    if (!isNaN(altR)) {
      altRData.push(altR); altRData.shift();
      // altRChart removed
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
      // dataLossLinearChart removed
    }
  }
}}
