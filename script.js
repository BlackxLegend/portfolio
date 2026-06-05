/* ── Custom cursor ────────────────────────────────────────── */
const cursor   = document.getElementById('cursor');
const follower = document.getElementById('cursorFollower');
let mx = 0, my = 0, fx = 0, fy = 0;

document.addEventListener('mousemove', e => {
  mx = e.clientX; my = e.clientY;
  cursor.style.left = mx + 'px';
  cursor.style.top  = my + 'px';
});

(function loop() {
  fx += (mx - fx) * 0.11;
  fy += (my - fy) * 0.11;
  follower.style.left = fx + 'px';
  follower.style.top  = fy + 'px';
  requestAnimationFrame(loop);
})();

/* ── Film grain canvas ────────────────────────────────────── */
const grain = document.getElementById('grain');
const gc = grain.getContext('2d');
function resizeGrain() { grain.width = window.innerWidth; grain.height = window.innerHeight; }
resizeGrain();
window.addEventListener('resize', resizeGrain);
function drawGrain() {
  const id = gc.createImageData(grain.width, grain.height);
  const d  = id.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = Math.random() * 255;
    d[i] = d[i+1] = d[i+2] = v; d[i+3] = 255;
  }
  gc.putImageData(id, 0, 0);
  setTimeout(drawGrain, 80);
}
drawGrain();

/* ── Nav scroll ───────────────────────────────────────────── */
const header = document.getElementById('header');
window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > 60);
}, { passive: true });

/* ── Hamburger ────────────────────────────────────────────── */
const ham   = document.getElementById('hamburger');
const mmenu = document.getElementById('mobileMenu');
ham.addEventListener('click', () => {
  const open = mmenu.classList.toggle('open');
  ham.classList.toggle('open', open);
  ham.setAttribute('aria-expanded', open);
});
mmenu.querySelectorAll('.mobile-item').forEach(l =>
  l.addEventListener('click', () => {
    mmenu.classList.remove('open');
    ham.classList.remove('open');
    ham.setAttribute('aria-expanded', 'false');
  })
);

/* ── Active nav link on scroll ────────────────────────────── */
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-item');
const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      navLinks.forEach(l => l.classList.remove('active-link'));
      const a = document.querySelector(`.nav-item[href="#${e.target.id}"]`);
      if (a) a.classList.add('active-link');
    }
  });
}, { threshold: 0, rootMargin: '-25% 0px -70% 0px' });
sections.forEach(s => io.observe(s));

/* ── Scroll reveal ────────────────────────────────────────── */
const revIO = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('visible'); revIO.unobserve(e.target); }
  });
}, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('.reveal').forEach(el => revIO.observe(el));

/* ── Typewriter roles ─────────────────────────────────────── */
const roles = ['Photographer', 'Music Artist', 'Visual Storyteller', 'Creative Director', 'Sound Designer'];
let ri = 0, ci = 0, del = false;
const ticker = document.getElementById('roleTicker');
function typeRoles() {
  const word = roles[ri];
  if (del) {
    ticker.textContent = word.slice(0, --ci);
    if (ci === 0) { del = false; ri = (ri + 1) % roles.length; setTimeout(typeRoles, 400); return; }
    setTimeout(typeRoles, 55);
  } else {
    ticker.textContent = word.slice(0, ++ci);
    if (ci === word.length) { del = true; setTimeout(typeRoles, 2200); return; }
    setTimeout(typeRoles, 95);
  }
}
setTimeout(typeRoles, 1000);

/* ── Spotify preview ──────────────────────────────────────── */
let currentTrack = null;
function previewTrack(id, type) {
  const embed = document.getElementById('spotifyEmbed');
  const src   = `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`;
  if (embed.src !== src) {
    embed.src = src;
    embed.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  // Highlight active row
  document.querySelectorAll('.track-row').forEach(r => r.classList.remove('playing'));
  const clicked = event.currentTarget;
  clicked.classList.add('playing');
  currentTrack = clicked;
}

/* ── Lightbox ─────────────────────────────────────────────── */
let lbIndex = 0;
const lb      = document.getElementById('lightbox');
const lbOver  = document.getElementById('lbOverlay');
const lbImg   = document.getElementById('lbImg');
const lbCap   = document.getElementById('lbCaption');
const lbClose = document.getElementById('lbClose');
const lbPrev  = document.getElementById('lbPrev');
const lbNext  = document.getElementById('lbNext');

function openLb(idx) {
  const posts = document.querySelectorAll('.ig-post');
  if (posts.length === 0) return;
  lbIndex = ((idx % posts.length) + posts.length) % posts.length;
  
  const post = posts[lbIndex];
  const img  = post.querySelector('.ig-post-img');
  const tag  = post.querySelector('.ig-post-tag')?.textContent || 'Photography';
  
  if (img) {
    lbImg.src = img.getAttribute('src');
    lbImg.alt = img.getAttribute('alt') || 'Instagram Photo';
    lbCap.textContent = `${tag} · @syedshefaulalam`;
  }
  
  lb.classList.add('open');
  lbOver.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeLb() {
  lb.classList.remove('open');
  lbOver.classList.remove('open');
  document.body.style.overflow = '';
}
function navLb(dir) { openLb(lbIndex + dir); }

lbClose.addEventListener('click', closeLb);
lbOver.addEventListener('click', closeLb);
lbPrev.addEventListener('click', () => navLb(-1));
lbNext.addEventListener('click', () => navLb(1));

document.querySelectorAll('.ig-post').forEach((post, i) => {
  post.addEventListener('click', () => openLb(i));
});

document.addEventListener('keydown', e => {
  if (!lb.classList.contains('open')) return;
  if (e.key === 'Escape') closeLb();
  if (e.key === 'ArrowLeft') navLb(-1);
  if (e.key === 'ArrowRight') navLb(1);
});

/* ── Hero parallax (subtle) ───────────────────────────────── */
window.addEventListener('scroll', () => {
  if (window.innerWidth <= 900) return;
  const y = window.scrollY;
  const hero = document.querySelector('.hero');
  if (hero && y < window.innerHeight) {
    hero.style.transform = `translateY(${y * 0.1}px)`;
  }
}, { passive: true });
