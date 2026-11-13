// Protection anti-clickjacking (complément : l'en-tête X-Frame-Options / frame-ancestors
// ne peut pas être envoyé par GitHub Pages)
if (window.top !== window.self) {
  window.top.location = window.self.location.href;
}

// ===================================================
// LANGUE
// ===================================================
const toggleBtn = document.getElementById('lang-toggle');
const isEnglish = () => document.body.classList.contains('lang-en');

toggleBtn.addEventListener('click', () => {
  const en = document.body.classList.toggle('lang-en');
  document.getElementById('lang-label').textContent = en ? 'Français' : 'English';
  document.documentElement.lang = en ? 'en' : 'fr';
  renderCalendars();
  if (lightbox.classList.contains('active')) updateCaption();
});

// ===================================================
// VISIONNEUSE PHOTOS (lightbox)
// ===================================================
const links    = Array.from(document.querySelectorAll('.lightbox-link'));
const lightbox = document.getElementById('lightbox');
const img      = document.getElementById('lightbox-img');
const nextBtn  = document.getElementById('next');
const prevBtn  = document.getElementById('prev');
const closeBtn = document.getElementById('lightbox-close');
const titleEl  = document.getElementById('lightbox-title');
const countEl  = document.getElementById('lightbox-count');
let currentIndex = 0;

// Nom de la pièce = titre du bloc de galerie qui contient la photo (dans la langue affichée)
function roomName(link) {
  const block = link.closest('.gallery-block');
  if (!block) return '';
  const span = block.querySelector('h3 ' + (isEnglish() ? '.en' : '.fr'));
  return span ? span.textContent.trim() : '';
}

function updateCaption() {
  titleEl.textContent = roomName(links[currentIndex]);
  countEl.textContent = `${currentIndex + 1} / ${links.length}`;
}

function preload(index) {
  const link = links[(index + links.length) % links.length];
  if (link) new Image().src = link.href;
}

function showImage(index) {
  currentIndex = (index + links.length) % links.length;
  const link = links[currentIndex];
  const thumb = link.querySelector('img');
  img.src = link.href;
  img.alt = thumb ? thumb.alt : '';
  updateCaption();
  if (!lightbox.classList.contains('active')) {
    lightbox.classList.add('active');
    document.body.classList.add('lightbox-open');
    closeBtn.focus({ preventScroll: true });
  }
  preload(currentIndex + 1);
  preload(currentIndex - 1);
}

function closeLightbox() {
  lightbox.classList.remove('active');
  document.body.classList.remove('lightbox-open');
  img.src = '';
  const link = links[currentIndex];
  if (link) link.focus({ preventScroll: true });
}

links.forEach((link, index) => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    showImage(index);
  });
});

nextBtn.addEventListener('click', (e) => { e.stopPropagation(); showImage(currentIndex + 1); });
prevBtn.addEventListener('click', (e) => { e.stopPropagation(); showImage(currentIndex - 1); });
closeBtn.addEventListener('click', (e) => { e.stopPropagation(); closeLightbox(); });

// Clic sur le fond sombre = fermer
lightbox.addEventListener('click', (e) => {
  if (e.target === lightbox || e.target.classList.contains('lightbox-figure')) closeLightbox();
});

document.addEventListener('keydown', (e) => {
  if (!lightbox.classList.contains('active')) return;
  if (e.key === 'ArrowRight') showImage(currentIndex + 1);
  if (e.key === 'ArrowLeft')  showImage(currentIndex - 1);
  if (e.key === 'Escape')     closeLightbox();
});

// Balayage sur mobile
let touchStartX = 0;
lightbox.addEventListener('touchstart', (e) => {
  touchStartX = e.changedTouches[0].clientX;
}, { passive: true });

lightbox.addEventListener('touchend', (e) => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(dx) < 50) return;
  showImage(currentIndex + (dx < 0 ? 1 : -1));
});

// ===================================================
// DÉFILEMENT : retour en haut, menu collant, section active
// ===================================================
const toTop    = document.getElementById('toTop');
const nav      = document.querySelector('.quick-nav');
const navLinks = Array.from(nav.querySelectorAll('a'));
const navTargets = navLinks.map(a => document.querySelector(a.getAttribute('href')));
let scrollTicking = false;

function onScroll() {
  scrollTicking = false;
  toTop.classList.toggle('show', window.scrollY > 600);
  nav.classList.toggle('scrolled', nav.getBoundingClientRect().top <= 0 && window.scrollY > 0);

  // Section active = la dernière dont le haut est passé sous le menu
  let active = -1;
  navTargets.forEach((target, i) => {
    if (target && target.getBoundingClientRect().top < 160) active = i;
  });
  const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
  if (atBottom) active = navLinks.length - 1;
  navLinks.forEach((a, i) => a.classList.toggle('active', i === active));
}

window.addEventListener('scroll', () => {
  if (!scrollTicking) { scrollTicking = true; requestAnimationFrame(onScroll); }
}, { passive: true });
onScroll();

toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

// ===================================================
// CALENDRIER DISPONIBILITÉS
// ===================================================
// Les réservations sont dans reservations.json — éditez ce fichier pour les mettre à jour.
// Format : { "start": "AAAA-MM-JJ", "end": "AAAA-MM-JJ" } — les deux bornes sont INCLUSES.
// Les dates ci-dessous servent de secours si le fichier JSON ne charge pas (ex : ouverture locale).
let bookedRanges = [
  { start: "2026-04-04", end: "2026-04-06" },
  { start: "2026-04-16", end: "2026-04-19" },
  { start: "2026-04-29", end: "2026-05-02" },
  { start: "2026-05-07", end: "2026-05-09" },
  { start: "2026-05-14", end: "2026-05-17" },
  { start: "2026-05-22", end: "2026-05-25" },
  { start: "2026-06-12", end: "2026-06-13" },
  { start: "2026-07-02", end: "2026-07-06" },
  { start: "2026-07-04", end: "2026-07-08" },
  { start: "2026-08-01", end: "2026-08-15" },
];

// Ne garde que les plages au format attendu (AAAA-MM-JJ) : un fichier mal
// formé ou modifié ne peut ni casser le calendrier ni y injecter du contenu.
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function sanitizeRanges(data) {
  if (!Array.isArray(data)) return null;
  return data.filter(r =>
    r && typeof r.start === 'string' && typeof r.end === 'string' &&
    DATE_RE.test(r.start) && DATE_RE.test(r.end)
  );
}

fetch('reservations.json', { cache: 'no-cache' })
  .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
  .then(data => {
    const clean = sanitizeRanges(data);
    if (clean) { bookedRanges = clean; renderCalendars(); }
  })
  .catch(() => {});

// Date locale au format AAAA-MM-JJ (et non UTC, qui décale d'un jour autour de minuit)
function toYMD(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const isBooked = (dateStr) => bookedRanges.some(r => dateStr >= r.start && dateStr <= r.end);

const MONTHS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const MONTHS_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS_FR   = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];
const DAYS_EN   = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

// 3 mois sur grand écran, 2 sinon
const wideScreen = window.matchMedia('(min-width: 1120px)');
let calOffset = 0; // nombre de mois depuis aujourd'hui (0 = mois courant)

// Crée un élément avec une classe et un texte (textContent : jamais interprété comme du HTML)
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderCalendars() {
  const grid = document.getElementById("calendars-grid");
  const en = isEnglish();
  const today = toYMD(new Date());
  const monthsToShow = wideScreen.matches ? 3 : 2;
  const fragment = document.createDocumentFragment();

  for (let m = 0; m < monthsToShow; m++) {
    const now = new Date();
    const target = new Date(now.getFullYear(), now.getMonth() + calOffset + m, 1);
    const year  = target.getFullYear();
    const month = target.getMonth(); // 0-based

    const monthName = (en ? MONTHS_EN : MONTHS_FR)[month];
    const dayLabels = en ? DAYS_EN : DAYS_FR;

    // Premier jour de la semaine (lundi = 0)
    let firstDow = target.getDay(); // 0=Sun..6=Sat
    firstDow = (firstDow === 0) ? 6 : firstDow - 1;

    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const monthEl = el('div', 'cal-month');
    monthEl.appendChild(el('div', 'cal-month-title', `${monthName} ${year}`));

    const calGrid = el('div', 'cal-grid');
    dayLabels.forEach(d => calGrid.appendChild(el('div', 'cal-cell cal-day-label', d)));

    for (let i = 0; i < firstDow; i++) {
      calGrid.appendChild(el('div', 'cal-cell cal-empty'));
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      let cls = "cal-cell cal-day";
      if (dateStr === today)     cls += " cal-today";
      if (dateStr < today)       cls += " cal-past";
      else if (isBooked(dateStr)) cls += " cal-booked";
      else                       cls += " cal-available";
      calGrid.appendChild(el('div', cls, String(day)));
    }

    monthEl.appendChild(calGrid);
    fragment.appendChild(monthEl);
  }

  grid.replaceChildren(fragment);

  // Désactive "mois précédent" sur le mois courant
  document.getElementById("cal-prev").disabled = (calOffset <= 0);
}

document.getElementById("cal-prev").addEventListener("click", () => {
  if (calOffset > 0) { calOffset--; renderCalendars(); }
});
document.getElementById("cal-next").addEventListener("click", () => {
  calOffset++;
  renderCalendars();
});
wideScreen.addEventListener('change', renderCalendars);

renderCalendars();

// ===================================================
// ANIMATION D'APPARITION AU DÉFILEMENT
// ===================================================
// Les éléments apparaissent en douceur (en cascade dans les grilles) quand ils arrivent à l'écran.
// Rien n'est masqué si l'utilisateur a demandé à réduire les animations.
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Seuls les éléments encore sous l'écran sont concernés : ce qui est déjà visible au chargement ne clignote pas.
const belowFold = (node) => node.getBoundingClientRect().top > window.innerHeight;

if (!reduceMotion && 'IntersectionObserver' in window) {
  const staggered = ['.fact', '.price-card'];
  staggered.forEach(sel => {
    document.querySelectorAll(sel).forEach((node, i) => {
      if (!belowFold(node)) return;
      node.classList.add('reveal');
      node.style.setProperty('--delay', `${(i % 3) * 90}ms`);
    });
  });
  document.querySelectorAll(
    '.badges, .price-contact, .lead, .lead-sub, .description > h3, .description > ul, .more, ' +
    '.gallery-title, .room, .map-container'
  ).forEach(node => { if (belowFold(node)) node.classList.add('reveal'); });
}

const revealObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.reveal').forEach(r => revealObserver.observe(r));

// ===================================================
// CARTE GOOGLE MAPS — chargée seulement après un clic (RGPD)
// ===================================================
const MAP_URL = "https://maps.google.com/maps?q=Asni%C3%A8res-sous-Bois%2C+89660%2C+France&t=m&z=14&ie=UTF8&iwloc=&output=embed";
const mapLoadBtn = document.getElementById('map-load');

if (mapLoadBtn) {
  mapLoadBtn.addEventListener('click', () => {
    const iframe = document.createElement('iframe');
    iframe.src = MAP_URL;
    iframe.title = 'Carte Asnières-sous-Bois';
    iframe.width = '100%';
    iframe.height = '380';
    iframe.allowFullscreen = true;
    // Isolation : la carte peut fonctionner et ouvrir Google Maps dans un nouvel onglet,
    // mais ne peut ni rediriger votre page, ni ouvrir de formulaire, ni télécharger.
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox');
    document.getElementById('map-container').replaceChildren(iframe);
  });
}
