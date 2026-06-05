# Syed Shefaul Alam — Photography & Music Portfolio

A premium, modern, and SEO-friendly personal portfolio website built for **Syed Shefaul Alam** (@syedshefaulalam), presenting his professional photography and music releases side-by-side.

This portfolio rejects template-like "AI-generated" looks in favor of a sleek, bespoke editorial style featuring warm gold accents, elegant serif typography, film-grain animation, and clean layouts.

---

## 📸 Key Features

- **Photography Journal (Primary)**: A custom-built Instagram widget displaying real posts, complete with high-resolution image rendering, real-time like/comment counts, and direct links to the original posts.
- **Dynamic Lightbox**: Seamless visual inspection of photographs with a lightweight, touch-friendly, keyboard-navigable image lightbox.
- **Music Hub (Secondary)**: Spotify integration with an interactive, custom-styled tracklist. Users can click any of the 9 featured releases to load the Spotify preview player instantly.
- **Premium Aesthetics**: Subtle film grain overlay, elegant Cormorant Garamond / Inter typography, micro-interactions, responsive hamburger navigation, and a trailing cursor effect.
- **Top-Tier SEO Optimization**:
  - Semantic HTML5 layout.
  - Full Meta tags, Open Graph (OG), and Twitter Cards.
  - Multi-entity **JSON-LD Schema Markup** (defining `Person`, `MusicGroup`, `WebSite`, `WebPage`, and `ImageGallery` for maximum search engine indexability).
  - Configured `robots.txt` and a complete `sitemap.xml`.

---

## 📁 Project Structure

```text
d:/portfolio/
├── index.html            # Main markup and SEO structures
├── style.css             # Branding styles, grid configurations, and animations
├── script.js             # Typewriter, film grain, track previews, & lightbox logic
├── profile_pic.jpg       # Scraped profile avatar from Instagram
├── ig_post_1.jpg - 9.jpg # Scraped top 9 photography posts from Instagram
├── robots.txt            # SEO crawler configuration
├── sitemap.xml           # XML sitemap for Google Search Console
└── scraper/              # Node.js Instagram scraper
    ├── scrape.js         # Puppeteer script that scrapes profile meta & top photos
    ├── update_portfolio.js # Automation script to copy assets & patch index.html
    └── package.json      # Node.js project manifest & script commands
```

---

## 🚀 How to Run Locally

### Method 1: Local Server with Auto-Sync (Highly Recommended)
We have built a custom Express server that automatically triggers the Instagram scraper in the background whenever you visit or refresh the page (with a 10-minute cooldown to prevent spamming Instagram).
1. Open your terminal in the root folder of the project.
2. Install the server dependencies (required only once):
   ```bash
   npm install
   ```
3. Start the local server:
   ```bash
   npm start
   ```
4. Open [http://localhost:8080](http://localhost:8080) in your web browser. 
5. Just refresh the page! The server will auto-collect new images in the background without you having to run terminal commands.

### Method 2: Double-Click (No Auto-Sync)
Simply double-click `index.html` to open it in your browser. Note that this method will not trigger background auto-syncs.

---

## 🔄 How to Update the Instagram Feed

The portfolio has a custom built automation tool inside the `scraper/` folder. It uses `puppeteer-core` to launch your system's Google Chrome or Microsoft Edge browser, bypasses the Instagram login wall, scrapes the latest 12 posts from Instagram, filters for photos, sorts them by like count, and downloads the top 9 images.

To update the photos and stats on the site:

1. **Open your terminal** and navigate to the scraper directory:
   ```bash
   cd scraper
   ```

2. **Install dependencies** (required only once):
   ```bash
   npm install
   ```

3. **Scrape Instagram**:
   Run the scraping tool. It defaults to `@syedshefaulalam` but accepts any username:
   ```bash
   npm run scrape
   # or
   node scrape.js syedshefaulalam
   ```
   This downloads the profile avatar, the top 9 images (to `insta_photos/` folder), and generates a `meta.json` file.

4. **Apply updates to the portfolio**:
   Run the patching script to copy the assets to the root directory and update all statistics and links inside `index.html`:
   ```bash
   node update_portfolio.js
   ```

5. **Done!** Reload your browser to see your new posts, followers, and likes updated.

---

## 🤖 Automatic Updates (GitHub Actions)

We have pre-configured a GitHub Actions workflow that automates this entire process inside GitHub's cloud. 

### How it works:
1. **Schedule**: The workflow is scheduled to run automatically every day at 12:00 AM UTC.
2. **Execution**: GitHub spins up a runner, installs Node.js, runs the scraper to fetch the newest posts and stats, and runs the updater script to rebuild the HTML.
3. **Commit**: If any new photos or stat changes are detected, GitHub commits and pushes them back to your repository automatically.
4. **Redeploy**: If you are using GitHub Pages, the new commit triggers an automatic rebuild, making your website display your new Instagram posts immediately—without you lifting a finger!

### How to use it:
- Simply push this project to a GitHub repository.
- Ensure that you allow GitHub Actions to write to your repository:
  1. In your GitHub repository, go to **Settings** -> **Actions** -> **General**.
  2. Under **Workflow permissions**, select **Read and write permissions** and click **Save**.
- You can also trigger the sync manually at any time by going to the **Actions** tab in GitHub, clicking **Sync Instagram Photos** on the left side, and clicking **Run workflow**.

---

## 🌐 Deployment Guide

This portfolio is static, meaning you can host it for free on modern static hosting platforms:

### 1. Render (Recommended for Free Hosting with Auto-Updates)
Render provides free hosting for static sites, and automatically redeploys whenever you push changes or when the GitHub Action updates your Instagram feed:
1. Push the project to your GitHub account.
2. Sign in to [Render](https://render.com/).
3. Click the **New +** button on the dashboard and select **Static Site**.
4. Connect your GitHub repository.
5. In the configuration settings:
   - **Name**: Pick a project name (e.g. `syed-shefaul-alam-portfolio`).
   - **Branch**: `main` (or whichever branch you push to).
   - **Build Command**: Leave this completely blank (since it's a pre-built static site).
   - **Publish Directory**: Type `.` (representing the root directory where `index.html` is located).
6. Click **Create Static Site**. Render will build and deploy your site to a free `*.onrender.com` subdomain!
7. (Optional) Configure a custom domain in your Render settings if you have one.
8. Set up **Automatic Updates** as described in the section above to let GitHub Actions update your Instagram feed and trigger Render redeployments automatically!

### 2. GitHub Pages (Alternative)
1. Push the contents of the repository to GitHub.
2. Go to repository **Settings** -> **Pages**.
3. Under **Build and deployment**, set the source to **Deploy from a branch** and select `main` (or `master`).

### 3. Netlify (Fastest Manual Deploy)
1. Go to [Netlify App](https://app.netlify.com/).
2. Drag and drop the `portfolio` folder directly into the deploy box.
3. Your site is live! You can link a custom domain in the settings.

---

### ⚠️ Note on Domain Name SEO
If you host this site on a custom domain or a free subdomain (e.g., `https://syed-portfolio.onrender.com`), ensure you open `index.html` and verify the canonical URL tag:
```html
<link rel="canonical" href="https://ujjibito.site/" />
```
Update the `href` to point to your live site domain (e.g., your `.onrender.com` address or custom domain) to maintain maximum search engine visibility and correct meta shares.
