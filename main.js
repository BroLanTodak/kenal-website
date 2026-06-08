import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initI18n, setLanguage, t } from './i18n.js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

gsap.registerPlugin(ScrollTrigger);
window.__setLang = setLanguage;

document.addEventListener('DOMContentLoaded', () => {
  initI18n();
  initAnimations();
  initElementCanvases();
  initMobileMenu();
  initDemo();
  initNotifyForms();
  initContactForm();
  loadWaitlistCount();
});

// ═══════════════════════════════════
// GSAP Animations
// ═══════════════════════════════════
function initAnimations() {
  const heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  heroTl
    .fromTo('.hero-content', { x: -40, opacity: 0 }, { x: 0, opacity: 1, duration: 1 })
    .fromTo('.hero-image', { scale: 0.9, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.8, ease: 'back.out(1.4)' }, '-=0.5');

  gsap.utils.toArray('.gs-reveal').forEach(el => {
    gsap.fromTo(el,
      { y: 30, opacity: 0 },
      {
        y: 0, opacity: 1, duration: 0.7, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none reverse' }
      }
    );
  });
}

// ═══════════════════════════════════
// Numerology Engine (exact port from Flutter app)
// ═══════════════════════════════════

// Reduce to single digit 1-9 by summing digits recursively
function singleDigitSum(numbers) {
  let sum = numbers.reduce((a, b) => a + b, 0);
  if (sum <= 9) return sum;
  return singleDigitSum(String(sum).split('').map(Number));
}

// Calculate 4-row pyramid from birth date
// Returns { row1: [8], row2: [4], row3: [2], row4: [1], elementType, elementColor, ... }
function calcNumerology(day, month, year) {
  const dd = String(day).padStart(2, '0');
  const mm = String(month).padStart(2, '0');
  const yyyy = String(year).padStart(4, '0');
  const digits = (dd + mm + yyyy).split('').map(Number);

  // Row 2: sum pairs → single digit
  const row2 = [
    singleDigitSum([digits[0], digits[1]]),
    singleDigitSum([digits[2], digits[3]]),
    singleDigitSum([digits[4], digits[5]]),
    singleDigitSum([digits[6], digits[7]]),
  ];

  // Row 3: sum pairs from row2
  const row3 = [
    singleDigitSum([row2[0], row2[1]]),
    singleDigitSum([row2[2], row2[3]]),
  ];

  // Row 4: root number
  const root = singleDigitSum([row3[0], row3[1]]);

  // Element mapping (root → element type)
  // 1→Metal(2), 2→Water(5), 3→Fire(4), 4→Wood(1), 5→Earth(3),
  // 6→Metal(2), 7→Water(5), 8→Fire(4), 9→Wood(1)
  const ELEMENT_TYPE_MAP = { 1:2, 2:5, 3:4, 4:1, 5:3, 6:2, 7:5, 8:4, 9:1 };
  const elementType = ELEMENT_TYPE_MAP[root] || 1;

  // Element colors (from app_colors.dart)
  const ELEMENT_COLORS = {
    1: '#059669', // Wood
    2: '#4B5563', // Metal
    3: '#D97706', // Earth
    4: '#DC2626', // Fire
    5: '#2563EB', // Water
  };

  return {
    row1: digits,      // 8 digits (bottom)
    row2,              // 4 digits
    row3,              // 2 digits
    row4: [root],      // 1 digit (top)
    rootNumber: root,
    elementType,
    elementColor: ELEMENT_COLORS[elementType],
  };
}

// Element info per type (for display)
const ELEMENT_INFO = {
  ms: {
    1: { name: 'Kayu', emoji: '🌳' },
    2: { name: 'Logam', emoji: '⚙️' },
    3: { name: 'Tanah', emoji: '⛰️' },
    4: { name: 'Api', emoji: '🔥' },
    5: { name: 'Air', emoji: '🌊' },
  },
  en: {
    1: { name: 'Wood', emoji: '🌳' },
    2: { name: 'Metal', emoji: '⚙️' },
    3: { name: 'Earth', emoji: '⛰️' },
    4: { name: 'Fire', emoji: '🔥' },
    5: { name: 'Water', emoji: '🌊' },
  },
  id: {
    1: { name: 'Kayu', emoji: '🌳' },
    2: { name: 'Logam', emoji: '⚙️' },
    3: { name: 'Tanah', emoji: '⛰️' },
    4: { name: 'Api', emoji: '🔥' },
    5: { name: 'Air', emoji: '🌊' },
  },
};

// ═══════════════════════════════════
// Mini Demo Calculator
// ═══════════════════════════════════
function getCurrentLang() {
  return localStorage.getItem('kenal-lang') || 'ms';
}

// ═══════════════════════════════════
// iOS-style Wheel Picker
// ═══════════════════════════════════
const wheels = {};

function initWheelPicker(id) {
  const wrapper = document.getElementById(id);
  if (!wrapper) return;

  const min = parseInt(wrapper.dataset.min);
  const max = parseInt(wrapper.dataset.max);
  const initial = parseInt(wrapper.dataset.value);
  const ITEM_H = 36;
  const VISIBLE = Math.floor(150 / ITEM_H); // ~4 visible
  const PAD = Math.floor(VISIBLE / 2); // padding items top/bottom

  // Build items
  const track = document.createElement('div');
  track.className = 'wheel-track';

  const items = [];
  for (let v = min; v <= max; v++) {
    const el = document.createElement('div');
    el.className = 'wheel-item';
    el.textContent = v;
    el.dataset.value = v;
    track.appendChild(el);
    items.push(el);
  }
  wrapper.appendChild(track);

  const count = max - min + 1;
  let selectedIndex = initial - min;
  let offset = 0;
  let startY = 0, startOffset = 0, isDragging = false;
  let velocity = 0, lastY = 0, lastTime = 0, momentumRaf = null;

  function centerOffset() { return (150 / 2 - ITEM_H / 2); }

  function setOffset(o, animate = false) {
    offset = o;
    track.style.transition = animate ? 'transform 0.3s cubic-bezier(0.25,0.46,0.45,0.94)' : 'none';
    track.style.transform = `translateY(${o}px)`;
    // Update selected class
    const idx = Math.round((centerOffset() - o) / ITEM_H);
    const clamped = Math.max(0, Math.min(count - 1, idx));
    items.forEach((el, i) => el.classList.toggle('selected', i === clamped));
    selectedIndex = clamped;
  }

  function snapTo(idx, animate = true) {
    const clamped = Math.max(0, Math.min(count - 1, idx));
    setOffset(centerOffset() - clamped * ITEM_H, animate);
  }

  function getValue() { return min + selectedIndex; }

  // Initial position
  snapTo(selectedIndex, false);

  // Mouse/touch events
  function onStart(clientY) {
    isDragging = true;
    startY = clientY;
    startOffset = offset;
    velocity = 0;
    lastY = clientY;
    lastTime = performance.now();
    if (momentumRaf) cancelAnimationFrame(momentumRaf);
    track.style.transition = 'none';
  }

  function onMove(clientY) {
    if (!isDragging) return;
    const dy = clientY - startY;
    const newOffset = startOffset + dy;
    // Clamp with rubber band
    const minO = centerOffset() - (count - 1) * ITEM_H;
    const maxO = centerOffset();
    if (newOffset > maxO) {
      setOffset(maxO + (newOffset - maxO) * 0.3);
    } else if (newOffset < minO) {
      setOffset(minO + (newOffset - minO) * 0.3);
    } else {
      setOffset(newOffset);
    }
    // Track velocity
    const now = performance.now();
    const dt = now - lastTime;
    if (dt > 0) { velocity = (clientY - lastY) / dt; }
    lastY = clientY;
    lastTime = now;
  }

  function onEnd() {
    if (!isDragging) return;
    isDragging = false;
    // Apply momentum
    if (Math.abs(velocity) > 0.3) {
      let v = velocity * 150; // amplify
      function momentumStep() {
        v *= 0.92;
        offset += v * 0.016;
        const minO = centerOffset() - (count - 1) * ITEM_H;
        const maxO = centerOffset();
        if (offset > maxO || offset < minO || Math.abs(v) < 0.5) {
          // Snap
          const idx = Math.round((centerOffset() - offset) / ITEM_H);
          snapTo(idx);
          return;
        }
        setOffset(offset);
        momentumRaf = requestAnimationFrame(momentumStep);
      }
      momentumRaf = requestAnimationFrame(momentumStep);
    } else {
      // Snap to nearest
      const idx = Math.round((centerOffset() - offset) / ITEM_H);
      snapTo(idx);
    }
  }

  // Mouse
  wrapper.addEventListener('mousedown', e => { e.preventDefault(); onStart(e.clientY); });
  window.addEventListener('mousemove', e => onMove(e.clientY));
  window.addEventListener('mouseup', () => onEnd());

  // Touch
  wrapper.addEventListener('touchstart', e => { onStart(e.touches[0].clientY); }, { passive: true });
  wrapper.addEventListener('touchmove', e => { e.preventDefault(); onMove(e.touches[0].clientY); }, { passive: false });
  wrapper.addEventListener('touchend', () => onEnd());

  // Scroll wheel
  wrapper.addEventListener('wheel', e => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 1 : -1;
    snapTo(selectedIndex + delta);
  }, { passive: false });

  wheels[id] = { getValue, snapTo };
}

function initDemo() {
  // Init wheel pickers
  initWheelPicker('wheel-day');
  initWheelPicker('wheel-month');
  initWheelPicker('wheel-year');

  const btn = document.getElementById('demo-btn');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const day = wheels['wheel-day'].getValue();
    const month = wheels['wheel-month'].getValue();
    const year = wheels['wheel-year'].getValue();

    const result = calcNumerology(day, month, year);
    const lang = getCurrentLang();
    const elInfo = ELEMENT_INFO[lang]?.[result.elementType] || ELEMENT_INFO.ms[result.elementType];
    const color = result.elementColor;

    // Display order: row1 (8 digits, top) → row2 (4) → row3 (2) → row4 (root, bottom)
    const displayRows = [result.row1, result.row2, result.row3, result.row4];

    // Build pyramid DOM
    const pyramidEl = document.getElementById('demo-pyramid');
    pyramidEl.innerHTML = '';

    const allBoxes = [];
    // Settle order: top (8 digits) first → bottom (root) last
    // Display index 0=row1(8,top), 1=row2(4), 2=row3(2), 3=root(1,bottom)
    // Settle ticks: [0]=10, [1]=16, [2]=22, [3]=28
    const settleAt = [10, 16, 22, 28];

    displayRows.forEach((row, di) => {
      const rowDiv = document.createElement('div');
      rowDiv.className = 'flex justify-center';
      const boxes = [];
      row.forEach(() => {
        const box = document.createElement('div');
        box.className = 'demo-pyramid-cell base visible shuffling';
        box.textContent = Math.floor(Math.random() * 10);
        rowDiv.appendChild(box);
        boxes.push(box);
      });
      pyramidEl.appendChild(rowDiv);
      allBoxes.push({ boxes, finalValues: row, displayIndex: di });
    });

    // Slot machine animation (matching Flutter app timing)
    let tick = 0;
    const interval = setInterval(() => {
      tick++;
      allBoxes.forEach(({ boxes, finalValues, displayIndex }) => {
        const settle = settleAt[displayIndex];
        if (tick <= settle) {
          // Shuffle random digits
          boxes.forEach(b => {
            b.textContent = displayIndex === 3
              ? Math.floor(Math.random() * 9) + 1  // root: 1-9 only
              : Math.floor(Math.random() * 10);
            b.className = 'demo-pyramid-cell base visible shuffling';
          });
        } else if (tick === settle + 1) {
          // Settle to final values
          boxes.forEach((b, i) => {
            b.textContent = finalValues[i];
            if (displayIndex === 3) {
              // Root number (bottom) — element color, bounce, glow
              b.className = 'demo-pyramid-cell root visible';
              b.style.background = color;
              b.style.boxShadow = `0 0 12px ${color}66`;
              b.style.animation = 'root-bounce 0.4s cubic-bezier(0.175,0.885,0.32,1.275)';
            } else if (displayIndex >= 1) {
              // Row 2 & 3 — highlight with element color
              b.className = 'demo-pyramid-cell mid visible';
              b.style.background = `${color}15`;
              b.style.borderColor = `${color}50`;
            } else {
              // Row 1 (top, 8 digits) — subtle
              b.className = 'demo-pyramid-cell base visible';
            }
          });
        }
      });
      if (tick >= 32) clearInterval(interval);
    }, 60);

    // Show element result
    const badge = document.getElementById('demo-element-badge');
    const nameEl = document.getElementById('demo-element-name');
    const descEl = document.getElementById('demo-element-desc');
    const numbersEl = document.getElementById('demo-element-numbers');

    const descMap = {
      1: { ms:'Tegas, berdisiplin, berstruktur. Pemimpin semula jadi.', en:'Firm, disciplined, structured. A natural leader.', id:'Tegas, disiplin, terstruktur. Pemimpin alami.' },
      2: { ms:'Fleksibel, intuitif, bijaksana. Mengalir dalam apa jua keadaan.', en:'Flexible, intuitive, wise. Flows in any situation.', id:'Fleksibel, intuitif, bijaksana.' },
      3: { ms:'Stabil, dipercayai, membumi. Penghubung semua elemen.', en:'Stable, trusted, grounded. Connector of all elements.', id:'Stabil, dipercaya, membumi.' },
      4: { ms:'Bersemangat, dinamik, penuh tenaga. Penggerak perubahan.', en:'Passionate, dynamic, energetic. Driver of change.', id:'Bersemangat, dinamis, penuh energi.' },
      5: { ms:'Kreatif, penyayang, berkembang. Sentiasa mencari pertumbuhan.', en:'Creative, caring, growing. Always seeking growth.', id:'Kreatif, penyayang, tumbuh seperti pohon.' },
    };

    // Show pyramid result area immediately (pyramid starts animating)
    document.getElementById('demo-result').classList.remove('hidden');

    // Hide element reveal until pyramid animation finishes
    const revealCard = document.getElementById('demo-element-reveal');
    revealCard.classList.remove('visible');
    revealCard.classList.add('hidden');

    // After pyramid animation completes (~2s = 32 ticks * 60ms), reveal element
    setTimeout(() => {
      badge.textContent = elInfo.emoji;
      nameEl.textContent = elInfo.name;
      descEl.textContent = descMap[result.elementType]?.[lang] || descMap[result.elementType]?.ms || '';
      const rootLabel = { ms: 'Nombor Akar', en: 'Root Number', id: 'Angka Akar' };
      numbersEl.textContent = `${rootLabel[lang] || rootLabel.ms}: ${result.rootNumber}`;

      // Show card and start canvas animation
      revealCard.classList.remove('hidden');
      requestAnimationFrame(() => {
        revealCard.classList.add('visible');
        startDemoElementCanvas(result.elementType, color);
      });

      // Scroll to element reveal
      setTimeout(() => {
        revealCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 200);
    }, 2100); // ~32 ticks * 60ms + buffer
  });

  // No enter key needed — wheel picker is touch/scroll based
}

// ═══════════════════════════════════
// Check if email already exists in waitlist
// ═══════════════════════════════════
async function checkEmailExists(email) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/kenal_waitlist?email=eq.${encodeURIComponent(email)}&select=id`, {
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
    });
    if (res.ok) {
      const data = await res.json();
      return data.length > 0;
    }
  } catch { /* silent */ }
  return false;
}

// ═══════════════════════════════════
// Success Message after email submit
// ═══════════════════════════════════
function showSuccessMessage(btn, input, isDuplicate) {
  const formContainer = btn.closest('.email-form-hero, .email-form-final, .flex');
  if (!formContainer) return;

  const isHero = !!formContainer.closest('#hero') || formContainer.classList.contains('email-form-hero');

  // Hide the note text below the form
  const noteEl = formContainer.nextElementSibling;
  if (noteEl && noteEl.classList.contains('text-xs')) {
    noteEl.style.display = 'none';
  }

  // Replace form content with success message
  const title = isDuplicate ? t('cta_duplicate_title') : t('cta_success_title');
  const msg = isDuplicate ? t('cta_duplicate_msg') : t('cta_success_msg');

  formContainer.innerHTML = `
    <div class="notify-success ${isHero ? 'notify-success--hero' : ''}">
      <div class="notify-success-icon">
        <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      </div>
      <div>
        <p class="notify-success-title">${title}</p>
        <p class="notify-success-msg">${msg}</p>
      </div>
    </div>
  `;

  // Animate in
  const el = formContainer.querySelector('.notify-success');
  requestAnimationFrame(() => {
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
  });
}

// ═══════════════════════════════════
// Notify Forms (all forms)
// ═══════════════════════════════════
function initNotifyForms() {
  document.querySelectorAll('.notify-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const input = btn.previousElementSibling;
      if (!input || input.tagName !== 'INPUT') return;

      const email = input.value?.trim();
      if (!email || !email.includes('@') || !email.includes('.')) {
        input.style.borderColor = '#ef4444';
        setTimeout(() => { input.style.borderColor = ''; }, 2000);
        return;
      }

      btn.disabled = true;
      btn.textContent = '...';

      try {
        // Check if email already registered
        const exists = await checkEmailExists(email);
        if (exists) {
          showSuccessMessage(btn, input, true);
          return;
        }

        const res = await fetch(`${SUPABASE_URL}/rest/v1/kenal_waitlist`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({ email, source: location.hash || 'landing', lang: getCurrentLang() }),
        });

        if (res.ok || res.status === 201) {
          showSuccessMessage(btn, input, false);
          loadWaitlistCount();
        } else if (res.status === 409) {
          showSuccessMessage(btn, input, true);
        } else {
          throw new Error('Failed');
        }
      } catch {
        showSuccessMessage(btn, input, false);
      }
    });
  });
}

// ═══════════════════════════════════
// Waitlist Count
// ═══════════════════════════════════
async function loadWaitlistCount() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/kenal_waitlist?select=id`, {
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.length > 0) {
        document.getElementById('waitlist-number').textContent = data.length;
        document.getElementById('waitlist-count').classList.remove('hidden');
      }
    }
  } catch { /* silent */ }
}

async function updateWaitlistCount() {
  await loadWaitlistCount();
}

// ═══════════════════════════════════
// Element Canvas Animations (with IntersectionObserver)
// ═══════════════════════════════════
function initElementCanvases() {
  const elements = [
    { id: 'el-wood', draw: drawWood },
    { id: 'el-metal', draw: drawMetal },
    { id: 'el-earth', draw: drawEarth },
    { id: 'el-fire', draw: drawFire },
    { id: 'el-water', draw: drawWater },
  ];

  elements.forEach(({ id, draw }) => {
    const card = document.getElementById(id);
    if (!card) return;
    const canvas = card.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    let animating = false;
    let rafId = null;

    function resize() {
      const rect = card.getBoundingClientRect();
      canvas.width = rect.width * 2;
      canvas.height = rect.height * 2;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      ctx.setTransform(2, 0, 0, 2, 0, 0);
    }

    resize();
    window.addEventListener('resize', resize);

    const particles = [];
    const w = () => canvas.width / 2;
    const h = () => canvas.height / 2;

    for (let i = 0; i < 25; i++) {
      particles.push(draw.init(w(), h()));
    }

    let startTime = performance.now();
    const CYCLE = 10000; // 10s loop like Flutter

    function animate(now) {
      if (!animating) return;
      const progress = ((now - startTime) % CYCLE) / CYCLE; // 0→1 seamless
      ctx.clearRect(0, 0, w(), h());
      draw.bg(ctx, w(), h(), progress);
      particles.forEach(p => draw.update(p, w(), h(), progress));
      particles.forEach(p => draw.render(ctx, p, progress));
      rafId = requestAnimationFrame(animate);
    }

    // Only animate when visible
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animating = true;
          animate();
        } else {
          animating = false;
          if (rafId) cancelAnimationFrame(rafId);
        }
      });
    }, { threshold: 0.1 });

    observer.observe(card);
  });
}

const PI2 = Math.PI * 2;

// ═══════════════════════════════════
// Demo Element Canvas (same style as section 5)
// ═══════════════════════════════════
let demoCanvasRaf = null;

function startDemoElementCanvas(elementType, color) {
  // Stop previous animation
  if (demoCanvasRaf) cancelAnimationFrame(demoCanvasRaf);

  const card = document.getElementById('demo-element-card');
  if (!card) return;
  const canvas = card.querySelector('canvas');
  const ctx = canvas.getContext('2d');

  function resize() {
    // Use offsetWidth/Height for accurate size including after layout
    const w = card.offsetWidth;
    const h = card.offsetHeight;
    canvas.width = w * 2;
    canvas.height = h * 2;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(2, 0, 0, 2, 0, 0);
  }
  // Delay resize to ensure layout is complete
  requestAnimationFrame(() => { resize(); window.addEventListener('resize', resize); });

  // Pick the right draw object
  const drawMap = { 1: drawWood, 2: drawMetal, 3: drawEarth, 4: drawFire, 5: drawWater };
  const draw = drawMap[elementType] || drawWood;

  const w = () => canvas.width / 2;
  const h = () => canvas.height / 2;

  const particles = [];
  for (let i = 0; i < 25; i++) {
    particles.push(draw.init(w(), h()));
  }

  const startTime = performance.now();
  const CYCLE = 10000;

  function animate(now) {
    const progress = ((now - startTime) % CYCLE) / CYCLE;
    ctx.clearRect(0, 0, w(), h());
    draw.bg(ctx, w(), h(), progress);
    particles.forEach(p => draw.update(p, w(), h(), progress));
    particles.forEach(p => draw.render(ctx, p, progress));
    demoCanvasRaf = requestAnimationFrame(animate);
  }
  demoCanvasRaf = requestAnimationFrame(animate);
}

// ── KAYU: brown→green gradient + tree trunks + canopy + falling leaves ──
const drawWood = {
  init(w, h) { return { x: Math.random(), y: Math.random(), size: 2+Math.random()*3, speed: 0.2+Math.random()*0.4, opacity: 0.3+Math.random()*0.4 }; },
  bg(ctx, w, h, p) {
    const g = ctx.createLinearGradient(0, h, 0, 0);
    g.addColorStop(0, '#3E2723'); g.addColorStop(0.4, '#33691E'); g.addColorStop(1, '#1B5E20');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    // Tree trunks + canopy
    for (let i = 0; i < 5; i++) {
      const tx = w * (0.1 + i * 0.2) + Math.sin(p * PI2 + i) * 3;
      const tw = 4 + (i % 2) * 2;
      const th = h * (0.4 + (i % 3) * 0.15);
      ctx.fillStyle = 'rgba(109,76,65,0.5)';
      ctx.fillRect(tx - tw/2, h - th, tw, th);
      // Canopy circle
      const cr = 12 + (i % 3) * 5;
      const cy = h - th - cr * 0.5 + Math.sin(p * PI2 + i * 2) * 2;
      ctx.fillStyle = 'rgba(129,199,132,0.25)';
      ctx.beginPath(); ctx.arc(tx, cy, cr, 0, PI2); ctx.fill();
    }
  },
  update() {},
  render(ctx, particle, progress) {
    if (particle.size > 4) return; // only small as leaves
    const lx = particle.x * ctx.canvas.width/2 + Math.sin(progress * PI2 + particle.y * 5) * 15;
    const ly = ((particle.y + progress * particle.speed * 0.3) % 1.0) * ctx.canvas.height/2;
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(Math.sin(progress * PI2 + particle.x * 10) * 0.5);
    ctx.fillStyle = 'rgba(165,214,167,0.38)';
    ctx.beginPath(); ctx.ellipse(0, 0, particle.size * 1.5, particle.size * 0.8, 0, 0, PI2); ctx.fill();
    ctx.restore();
  }
};

// ── LOGAM: metallic banding + brushed lines + sweeping shine beam ──
const drawMetal = {
  init(w, h) { return { x: Math.random(), y: Math.random(), size: 3, speed: 0.5, opacity: 0.1 }; },
  bg(ctx, w, h, p) {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#37474F'); g.addColorStop(0.3, '#78909C'); g.addColorStop(0.5, '#455A64');
    g.addColorStop(0.7, '#90A4AE'); g.addColorStop(1, '#37474F');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    // Brushed horizontal lines
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 0.5;
    for (let y = 0; y < h; y += 2.5) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    // 45-degree sweeping shine beam
    const beamCenter = (Math.sin(p * PI2) + 1) / 2;
    const beamX = (beamCenter * 1.4 - 0.2) * w;
    const beamW = 60;
    ctx.save();
    ctx.translate(beamX, 0);
    ctx.transform(1, 0, -0.5, 1, 0, 0); // skew
    const bg = ctx.createLinearGradient(-beamW/2, 0, beamW/2, 0);
    bg.addColorStop(0, 'transparent'); bg.addColorStop(0.3, 'rgba(255,255,255,0.15)');
    bg.addColorStop(0.5, 'rgba(255,255,255,0.25)'); bg.addColorStop(0.7, 'rgba(255,255,255,0.15)');
    bg.addColorStop(1, 'transparent');
    ctx.fillStyle = bg;
    ctx.fillRect(-beamW/2, -10, beamW, h + 20);
    ctx.restore();
  },
  update() {},
  render() {}
};

// ── TANAH: amber gradient + layered terrain parallax waves ──
const drawEarth = {
  init(w, h) { return { x: Math.random(), y: Math.random(), size: 3, speed: 0.3, opacity: 0.2 }; },
  bg(ctx, w, h, p) {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, 'rgba(217,119,6,0.85)'); g.addColorStop(1, 'rgba(217,119,6,0.5)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    // Layered terrain parallax
    for (let layer = 0; layer < 4; layer++) {
      const layerAlpha = 0.06 + layer * 0.03;
      const layerH = h * (0.45 + layer * 0.13);
      ctx.fillStyle = `rgba(255,255,255,${layerAlpha})`;
      ctx.beginPath(); ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 3) {
        const y = layerH +
          Math.sin((x / w * PI2 * (1.2 + layer * 0.4)) + p * PI2 * (0.1 + layer * 0.05) + layer * 2) * (8 + layer * 4) +
          Math.sin((x / w * PI2 * 2.5) + layer * 1.3) * 4;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
    }
  },
  update() {},
  render() {}
};

// ── API: red→orange→yellow gradient + colored flame shapes ──
const drawFire = {
  init(w, h) { return { x: Math.random(), y: Math.random(), size: 3+Math.random()*6, speed: 0.5+Math.random()*1, opacity: 0.5+Math.random()*0.4 }; },
  bg(ctx, w, h, p) {
    const g = ctx.createLinearGradient(0, h, 0, 0);
    g.addColorStop(0, '#B71C1C'); g.addColorStop(0.5, '#E65100'); g.addColorStop(1, '#F57F17');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    // Flame shapes
    const flames = [
      { color: 'rgba(255,61,0,0.3)' },   // outer red
      { color: 'rgba(255,145,0,0.3)', s: 0.7 },  // mid orange
      { color: 'rgba(255,234,0,0.3)', s: 0.45 },  // inner yellow
      { color: 'rgba(255,255,255,0.25)', s: 0.25 }, // core white
    ];
    for (let i = 0; i < 10; i++) {
      const fx = w * (i / 10 + 0.05);
      const phase = p * PI2 + i * 0.9;
      const flameH = 20 + Math.sin(phase * 1.3) * 12 + (i % 3) * 5;
      const cx = fx + Math.sin(phase * 0.6) * 6;
      const baseW = 8 + Math.sin(phase) * 3 + (i % 2) * 3;
      flames.forEach(f => {
        const s = f.s || 1;
        const sway = Math.sin(phase * 0.8) * 3;
        const tipY = h + 2 - flameH * s;
        ctx.fillStyle = f.color;
        ctx.beginPath();
        ctx.moveTo(cx + sway, tipY);
        ctx.quadraticCurveTo(cx + baseW * s + sway * 0.5, h + 2 - flameH * s * 0.3, cx + baseW * s * 0.6, h + 2);
        ctx.lineTo(cx - baseW * s * 0.6, h + 2);
        ctx.quadraticCurveTo(cx - baseW * s + sway * 0.5, h + 2 - flameH * s * 0.3, cx + sway, tipY);
        ctx.closePath(); ctx.fill();
      });
    }
    // Bottom ember glow
    const eg = ctx.createLinearGradient(0, h * 0.7, 0, h);
    eg.addColorStop(0, 'transparent'); eg.addColorStop(1, 'rgba(255,171,0,0.25)');
    ctx.fillStyle = eg; ctx.fillRect(0, h * 0.7, w, h * 0.3);
  },
  update() {},
  render() {}
};

// ── AIR: deep blue gradient + rising bubbles + bottom wave ──
const drawWater = {
  init(w, h) { return { x: Math.random(), y: Math.random(), size: 2+Math.random()*5, speed: 0.2+Math.random()*0.6, opacity: 0.2+Math.random()*0.5 }; },
  bg(ctx, w, h, p) {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, 'rgba(37,99,235,0.85)'); g.addColorStop(1, 'rgba(37,99,235,0.5)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    // Wave at bottom
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath(); ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 2) {
      const y = h * 0.85 + Math.sin((x / w * PI2 * 2) + p * PI2) * 4;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
  },
  update() {},
  render(ctx, particle, progress) {
    const w = ctx.canvas.width / 2;
    const h = ctx.canvas.height / 2;
    const px = particle.x * w + Math.sin((progress * 2 + particle.y) * PI2) * 6;
    let py = ((particle.y - progress * particle.speed * 0.5) % 1.0) * h;
    if (py < 0) py += h;
    // Stroke bubble
    ctx.strokeStyle = `rgba(255,255,255,${particle.opacity * 0.5})`;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(px, py, particle.size, 0, PI2); ctx.stroke();
    // Highlight
    ctx.fillStyle = `rgba(255,255,255,${particle.opacity * 0.2})`;
    ctx.beginPath(); ctx.arc(px - particle.size * 0.3, py - particle.size * 0.3, particle.size * 0.3, 0, PI2); ctx.fill();
  }
};

// ═══════════════════════════════════
// Mobile Menu
// ═══════════════════════════════════
function initMobileMenu() {
  const toggle = document.getElementById('menu-toggle');
  const menu = document.getElementById('mobile-menu');
  if (!toggle || !menu) return;
  toggle.addEventListener('click', () => menu.classList.toggle('active'));
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => menu.classList.remove('active')));
}

// ═══════════════════════════════════
// Contact Form — mailto via Supabase Edge Function fallback
// ═══════════════════════════════════
function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('contact-name').value.trim();
    const email = document.getElementById('contact-email').value.trim();
    const message = document.getElementById('contact-message').value.trim();
    const btn = document.getElementById('contact-submit');
    const status = document.getElementById('contact-status');

    if (!name || !email || !message) return;

    btn.disabled = true;
    btn.textContent = t('contact_sending');
    status.classList.add('hidden');

    // Use mailto as reliable delivery
    const subject = encodeURIComponent(`[KENAL] Mesej dari ${name}`);
    const body = encodeURIComponent(`Nama: ${name}\nEmail: ${email}\n\n${message}`);
    window.location.href = `mailto:admin@kenal.com?subject=${subject}&body=${body}`;

    // Show success after short delay
    setTimeout(() => {
      status.textContent = t('contact_success');
      status.className = 'text-center text-sm mt-2 text-green-400';
      status.classList.remove('hidden');
      btn.disabled = false;
      btn.textContent = t('contact_send');
      form.reset();
    }, 1000);
  });
}
