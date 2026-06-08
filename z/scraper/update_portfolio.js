/**
 * update_portfolio.js
 * Reads insta_photos/meta.json + downloaded images
 * and patches the ig-grid in index.html automatically.
 */
const fs   = require('fs');
const path = require('path');

const PHOTOS_DIR = path.join(__dirname, '..', 'insta_photos');
const HTML_FILE  = path.join(__dirname, '..', 'index.html');
const META_FILE  = path.join(PHOTOS_DIR, 'meta.json');

if (!fs.existsSync(META_FILE)) {
  console.error('❌  meta.json not found. Run  node scrape.js  first.');
  process.exit(1);
}

const meta = JSON.parse(fs.readFileSync(META_FILE, 'utf-8'));
console.log(`✅  Loaded metadata for @${meta.username}`);
console.log(`📸  Found ${meta.topPhotos.length} top photos\n`);

// Copy images to portfolio root so they're served correctly
meta.topPhotos.forEach((p, i) => {
  const src  = path.join(PHOTOS_DIR, `post_${i + 1}.jpg`);
  const dest = path.join(__dirname, '..', `ig_post_${i + 1}.jpg`);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`  Copied post_${i+1}.jpg → ig_post_${i+1}.jpg`);
  }
});

// Copy profile pic
const ppSrc  = path.join(PHOTOS_DIR, 'profile_pic.jpg');
const ppDest = path.join(__dirname, '..', 'profile_pic.jpg');
if (fs.existsSync(ppSrc)) {
  fs.copyFileSync(ppSrc, ppDest);
  console.log('  Copied profile_pic.jpg');
}

// Tags derived from caption keywords
function guessTag(caption) {
  const c = (caption || '').toLowerCase();
  if (c.includes('portrait') || c.includes('face') || c.includes('selfie')) return 'Portrait';
  if (c.includes('street') || c.includes('city') || c.includes('urban')) return 'Urban';
  if (c.includes('nature') || c.includes('sky') || c.includes('cloud') || c.includes('mountain')) return 'Landscape';
  if (c.includes('night') || c.includes('dark') || c.includes('light')) return 'Night';
  if (c.includes('music') || c.includes('song') || c.includes('studio')) return 'Music';
  if (c.includes('travel') || c.includes('road') || c.includes('journey')) return 'Travel';
  return 'Photography';
}

// Build ig-grid HTML
function buildGrid(photos, version) {
  return photos.map((p, i) => {
    const imgFile = `ig_post_${i + 1}.jpg?v=${version}`;
    const tag     = guessTag(p.caption);
    const caption = p.caption ? p.caption.slice(0, 80).replace(/</g,'&lt;').replace(/>/g,'&gt;') : 'View on Instagram';
    const isTall  = i === 2; // make 3rd photo span 2 rows
    return `
        <article class="ig-post${isTall ? ' ig-post-tall' : ''}" role="listitem" data-index="${i}" aria-label="${tag} photo ${i+1}">
          <div class="ig-post-img-wrap">
            <img src="${imgFile}" alt="${caption.slice(0,60) || `Photo by @${meta.username}`}" class="ig-post-img" loading="lazy" width="400" height="${isTall ? 600 : 400}" />
            <div class="ig-post-hover">
              <div class="ig-post-actions">
                <span class="ig-action"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>${p.likes.toLocaleString()}</span>
                <span class="ig-action"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z"/></svg>${p.comments.toLocaleString()}</span>
              </div>
            </div>
          </div>
          <div class="ig-post-meta">
            <span class="ig-post-tag">${tag}</span>
            <a href="https://www.instagram.com/p/${p.shortcode}/" target="_blank" rel="noopener" class="ig-post-view" aria-label="View on Instagram">↗ Instagram</a>
          </div>
        </article>`;
  }).join('\n');
}

// Patch HTML
let html = fs.readFileSync(HTML_FILE, 'utf-8');
const version = Date.now();

// Replace ig-grid contents
const gridStart = html.indexOf('<div class="ig-grid"');
const gridEnd   = html.indexOf('</div><!-- /ig-grid -->');
if (gridStart === -1 || gridEnd === -1) {
  console.error('❌  Could not find ig-grid markers in index.html');
  process.exit(1);
}

const before  = html.slice(0, gridStart);
const after   = html.slice(gridEnd + '</div><!-- /ig-grid -->'.length);
const newGrid = `<div class="ig-grid" id="igGrid" role="list" aria-label="Instagram photos">\n${buildGrid(meta.topPhotos, version)}\n      </div><!-- /ig-grid -->`;
const newHtml = before + newGrid + after;

// Also update profile stats and images
function formatCount(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return num.toString();
}

let updated = newHtml
  // Profile stats
  .replace(/<strong>\d[\d,]*<\/strong><span>posts<\/span>/g, `<strong>${meta.posts.toLocaleString()}<\/strong><span>posts<\/span>`)
  .replace(/<strong>\d[\d,]*<\/strong><span>followers<\/span>/g, `<strong>${meta.followers.toLocaleString()}<\/strong><span>followers<\/span>`)
  .replace(/<strong>\d[\d,]*<\/strong><span>following<\/span>/g, `<strong>${meta.following.toLocaleString()}<\/strong><span>following<\/span>`)
  // Hero stats
  .replace(/(<span class="num-val">)\d+(<\/span>\s*<span class="num-label">Posts<\/span>)/g, `$1${meta.posts.toLocaleString()}$2`)
  .replace(/(<span class="num-val">)[^<]+(<\/span>\s*<span class="num-label">Followers<\/span>)/g, `$1${formatCount(meta.followers)}$2`)
  // Footer text
  .replace(/See all \d+ posts on Instagram/g, `See all ${meta.posts.toLocaleString()} posts on Instagram`)
  // Connect tile text
  .replace(/\d[\d,]* followers · \d[\d,]* posts/g, `${meta.followers.toLocaleString()} followers · ${meta.posts.toLocaleString()} posts`)
  // Replace avatar img src tags
  .replace(/(<img[^>]*class="avatar-img"[^>]*src=")[^"]+(")/g, `$1profile_pic.jpg?v=${version}$2`)
  .replace(/(src=")[^"]+("[^>]*class="avatar-img")/g, `$1profile_pic.jpg?v=${version}$2`)
  .replace(/(<img[^>]*class="ig-pf-img"[^>]*src=")[^"]+(")/g, `$1profile_pic.jpg?v=${version}$2`)
  .replace(/(src=")[^"]+("[^>]*class="ig-pf-img")/g, `$1profile_pic.jpg?v=${version}$2`)
  // Meta tag images
  .replace(/(<meta\s+property="og:image"\s+content=")[^"]+(")/g, `$1https://ujjibito.site/profile_pic.jpg?v=${version}$2`)
  .replace(/(<meta\s+name="twitter:image"\s+content=")[^"]+(")/g, `$1https://ujjibito.site/profile_pic.jpg?v=${version}$2`);

fs.writeFileSync(HTML_FILE, updated, 'utf-8');
console.log(`\n🎉  index.html updated with ${meta.topPhotos.length} real Instagram photos!`);
console.log(`🌐  Open d:\\portfolio\\index.html to see the result.\n`);
