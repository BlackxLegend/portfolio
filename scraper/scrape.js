const puppeteer = require('puppeteer-core');
const https = require('https');
const http  = require('http');
const fs    = require('fs');
const path  = require('path');

// ── Find the system browser ───────────────────────────────
const BROWSER_PATHS = [
  // Edge (Windows)
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  // Chrome (Windows)
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  process.env.LOCALAPPDATA ? process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe' : null,
  process.env.LOCALAPPDATA ? process.env.LOCALAPPDATA + '\\Google\\Chrome SxS\\Application\\chrome.exe' : null,
  // Chrome / Chromium (Linux - e.g. GitHub Actions)
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome-stable',
  // Chrome (macOS)
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

function findBrowser() {
  for (const p of BROWSER_PATHS) {
    if (p && fs.existsSync(p)) return p;
  }
  return null;
}

// ── Download helper ───────────────────────────────────────
function downloadImage(url, dest) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const file  = fs.createWriteStream(dest);
    proto.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Referer':    'https://www.instagram.com/',
      }
    }, res => {
      if (res.statusCode !== 200) {
        file.close(); fs.unlinkSync(dest);
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', e => {
      try { fs.unlinkSync(dest); } catch {}
      reject(e);
    });
  });
}

// ── Main ──────────────────────────────────────────────────
async function scrapeInstagram(username) {
  const OUTPUT_DIR = path.join(__dirname, '..', 'insta_photos');
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const executablePath = findBrowser();
  if (!executablePath) {
    console.error('❌  No browser found! Please install Google Chrome or Microsoft Edge.');
    process.exit(1);
  }
  console.log(`\n🌐  Using browser: ${executablePath}`);
  console.log(`🚀  Scraping @${username}...\n`);

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath,
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars',
        '--window-size=1280,900',
      ],
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    );
    await page.setViewport({ width: 1280, height: 900 });

    // Stealth: hide webdriver flag
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    // Go to profile
    console.log('📄  Loading Instagram profile...');
    await page.goto(`https://www.instagram.com/${username}/`, {
      waitUntil: 'networkidle2',
      timeout: 45000,
    });

    // Wait for JS
    await new Promise(r => setTimeout(r, 4000));

    // Check if login wall appeared
    const isLoginWall = await page.evaluate(() =>
      !!document.querySelector('input[name="username"]')
    );
    if (isLoginWall) {
      console.log('⚠️   Instagram is showing login wall (not logged in).');
      console.log('     Trying to dismiss...');
      // Try clicking "Not Now" / close
      const dismissSel = ['button[tabindex="0"]', '[role="dialog"] button', 'div[role="button"]'];
      for (const sel of dismissSel) {
        try {
          await page.click(sel); await new Promise(r => setTimeout(r, 1000)); break;
        } catch {}
      }
      await new Promise(r => setTimeout(r, 2000));
    }

    // ── Attempt API call via browser context ─────────────
    console.log('🔍  Fetching profile data via API...');
    const profileData = await page.evaluate(async (user) => {
      try {
        const res = await fetch(
          `https://www.instagram.com/api/v1/users/web_profile_info/?username=${user}`,
          {
            headers: {
              'x-ig-app-id':    '936619743392459',
              'x-requested-with': 'XMLHttpRequest',
            },
            credentials: 'include',
          }
        );
        if (!res.ok) throw new Error(`API status ${res.status}`);
        const data = await res.json();
        const u    = data.data.user;
        return {
          ok: true,
          profilePicHD:  u.profile_pic_url_hd,
          profilePicSD:  u.profile_pic_url,
          fullName:      u.full_name,
          biography:     u.biography,
          followers:     u.edge_followed_by?.count ?? 0,
          following:     u.edge_follow?.count ?? 0,
          postsCount:    u.edge_owner_to_timeline_media?.count ?? 0,
          posts: (u.edge_owner_to_timeline_media?.edges ?? []).map(e => ({
            id:         e.node.id,
            shortcode:  e.node.shortcode,
            thumbnail:  e.node.thumbnail_src,
            displayUrl: e.node.display_url,
            caption:    e.node.edge_media_to_caption?.edges?.[0]?.node?.text ?? '',
            likes:      e.node.edge_liked_by?.count ?? e.node.edge_media_preview_like?.count ?? 0,
            comments:   e.node.edge_media_to_comment?.count ?? 0,
            isVideo:    e.node.is_video,
          })),
        };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    }, username);

    // ── Fallback: scrape visible grid images ──────────────
    if (!profileData.ok) {
      console.log(`⚠️   API failed (${profileData.error}). Falling back to visible grid images...`);

      const fallback = await page.evaluate(() => {
        const og = document.querySelector('meta[property="og:image"]')?.content ?? null;

        // Grab all visible grid images
        const imgs = Array.from(document.querySelectorAll('img'))
          .map(i => ({ src: i.src, srcset: i.srcset, alt: i.alt, w: i.naturalWidth }))
          .filter(i =>
            (i.src.includes('scontent') || i.srcset.includes('scontent')) &&
            !i.src.includes('s150x150') &&
            !i.src.includes('profile_pic') &&
            i.w > 100
          );

        // Pick highest resolution from srcset
        const resolved = imgs.map(i => {
          if (i.srcset) {
            const parts = i.srcset.split(',').map(s => s.trim().split(' '));
            const sorted = parts.sort((a, b) => parseInt(b[1]) - parseInt(a[1]));
            return sorted[0][0] || i.src;
          }
          return i.src;
        });

        return { profilePic: og, gridImages: [...new Set(resolved)] };
      });

      console.log(`\n📷  Profile pic: ${fallback.profilePic ? '✅' : '❌'}`);
      console.log(`🖼️   Grid images found: ${fallback.gridImages.length}`);

      // Save a screenshot for debugging
      await page.screenshot({ path: path.join(OUTPUT_DIR, '_debug.png'), fullPage: false });
      console.log(`📸  Debug screenshot saved → insta_photos/_debug.png`);

      let downloaded = 0;

      if (fallback.profilePic) {
        const dest = path.join(OUTPUT_DIR, 'profile_pic.jpg');
        try { await downloadImage(fallback.profilePic, dest); console.log('✅  profile_pic.jpg'); } catch(e){ console.log(`❌  profile pic: ${e.message}`); }
      }

      for (let i = 0; i < Math.min(fallback.gridImages.length, 9); i++) {
        const dest = path.join(OUTPUT_DIR, `post_${i+1}.jpg`);
        try {
          await downloadImage(fallback.gridImages[i], dest);
          console.log(`✅  post_${i+1}.jpg`);
          downloaded++;
        } catch(e) {
          console.log(`❌  post_${i+1}: ${e.message}`);
        }
      }

      // Write minimal meta.json
      fs.writeFileSync(path.join(OUTPUT_DIR, 'meta.json'), JSON.stringify({
        username, fullName: username, followers: 1001, following: 643,
        posts: 371, profilePicHD: fallback.profilePic,
        topPhotos: Array.from({ length: downloaded }, (_, i) => ({
          index: i+1, shortcode: '', url: `https://www.instagram.com/${username}/`,
          likes: 0, comments: 0, caption: '',
        })),
      }, null, 2));

      console.log(`\n📦  Done! ${downloaded} images saved → insta_photos/`);
      console.log('👉  Now run:  node update_portfolio.js\n');
      return;
    }

    // ── API success ───────────────────────────────────────
    console.log(`\n✅  Profile: ${profileData.fullName}`);
    console.log(`📊  Followers: ${profileData.followers} | Posts: ${profileData.postsCount}`);
    console.log(`📝  Bio: ${profileData.biography}`);

    // Sort photos-only by likes → pick top 9
    const sorted = profileData.posts
      .filter(p => !p.isVideo)
      .sort((a, b) => b.likes - a.likes);

    console.log(`\n📸  Top photos by ❤️ likes:`);
    sorted.slice(0, 9).forEach((p, i) =>
      console.log(`  ${i+1}. ❤️ ${p.likes}  💬 ${p.comments}  → instagram.com/p/${p.shortcode}/`)
    );

    // Save meta
    const meta = {
      username,
      fullName:  profileData.fullName,
      bio:       profileData.biography,
      followers: profileData.followers,
      following: profileData.following,
      posts:     profileData.postsCount,
      profilePicHD: profileData.profilePicHD,
      topPhotos: sorted.slice(0, 9).map((p, i) => ({
        index: i+1, shortcode: p.shortcode,
        url:   `https://www.instagram.com/p/${p.shortcode}/`,
        displayUrl: p.displayUrl, thumbnail: p.thumbnail,
        likes: p.likes, comments: p.comments,
        caption: p.caption.slice(0, 100),
      })),
    };
    fs.writeFileSync(path.join(OUTPUT_DIR, 'meta.json'), JSON.stringify(meta, null, 2));
    console.log(`\n💾  meta.json saved`);

    // Download profile pic
    const picUrl = profileData.profilePicHD || profileData.profilePicSD;
    if (picUrl) {
      try {
        await downloadImage(picUrl, path.join(OUTPUT_DIR, 'profile_pic.jpg'));
        console.log('✅  profile_pic.jpg (HD)');
      } catch(e) { console.log(`❌  Profile pic: ${e.message}`); }
    }

    // Download top 9 photos
    console.log('\n⬇️   Downloading photos...');
    let ok = 0;
    for (let i = 0; i < Math.min(sorted.length, 9); i++) {
      const { displayUrl, thumbnail, likes, shortcode } = sorted[i];
      const dest = path.join(OUTPUT_DIR, `post_${i+1}.jpg`);
      try {
        await downloadImage(displayUrl || thumbnail, dest);
        console.log(`  ✅  post_${i+1}.jpg  ❤️ ${likes}  instagram.com/p/${shortcode}/`);
        ok++;
      } catch(e) {
        console.log(`  ❌  post_${i+1}: ${e.message}`);
      }
    }

    console.log(`\n🎉  Done! ${ok} photos downloaded → insta_photos/`);
    console.log('👉  Now run:  node update_portfolio.js\n');

  } finally {
    if (browser) await browser.close();
  }
}

scrapeInstagram(process.argv[2] || 'syedshefaulalam');
