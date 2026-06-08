const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 8080;
const WORKSPACE = __dirname;

let isSyncing = false;
let lastSyncTime = 0;
const SYNC_COOLDOWN = 10 * 60 * 1000; // 10 minutes cooldown to prevent spamming Instagram

function runSync() {
  if (isSyncing) return;
  const now = Date.now();
  if (now - lastSyncTime < SYNC_COOLDOWN) {
    console.log('⏳  Instagram sync is on cooldown. Skipping background update.');
    return;
  }

  isSyncing = true;
  console.log('🔄  New page request! Triggering background Instagram sync...');
  
  // Execute the sync script inside the scraper folder
  exec('npm run sync', { cwd: path.join(WORKSPACE, 'scraper') }, (error, stdout, stderr) => {
    isSyncing = false;
    if (error) {
      console.error(`❌  Background sync failed: ${error.message}`);
      return;
    }
    lastSyncTime = Date.now();
    console.log('🎉  Background Instagram sync completed successfully! Refresh your page to see the new photos.');
  });
}

// Serve static assets from the root directory
app.use(express.static(WORKSPACE));

// Intercept the root path to fire the background sync
app.get('/', (req, res) => {
  runSync();
  res.sendFile(path.join(WORKSPACE, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🚀  Local portfolio server running at: http://localhost:${PORT}`);
  console.log(`✨  Visiting the page will automatically sync Instagram in the background!`);
  console.log(`💡  Press Ctrl + C to stop the server.\n`);
});
