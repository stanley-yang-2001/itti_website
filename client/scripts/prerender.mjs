// Build-time pre-rendering for non-JS crawlers.
//
// This is a client-rendered SPA - without this script, a bot that
// doesn't execute JavaScript (most social-media unfurl bots, some
// search crawlers) only ever sees the one static dist/index.html
// shell, regardless of which URL it requested. <SEO> (react-helmet-
// async) only updates <head> after React has mounted and run, which
// a non-JS fetch never triggers.
//
// This script runs as package.json's "postbuild" step, after `vite
// build` has already produced dist/. For each route below, it:
//   1. Serves the built dist/ locally (a plain static file server -
//      just needs SOMETHING serving the real build for a browser to
//      load, doesn't need to be the production server).
//   2. Opens that route in a real headless browser (Playwright/
//      Chromium), waits for React to mount and render, exactly as a
//      live visitor's browser would.
//   3. Saves the resulting fully-rendered HTML to
//      dist/<route>/index.html.
//
// Deliberately pre-rendering rather than full SSR: these pages render
// identically for every visitor (no per-user data), so a persistent
// Node server re-rendering the same HTML on every request would be
// pure overhead for zero benefit. Pre-rendering once at build time and
// serving the static result is strictly cheaper and simpler.
//
// For this to actually take effect in production, whatever serves
// dist/ needs to serve dist/<route>/index.html for a request to
// /<route> in preference to falling back to the generic SPA shell -
// see docs/DEPLOYMENT.md for the specifics of how that's set up here.

import { chromium } from 'playwright';
import { createServer } from 'http';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { extname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DIST_DIR = join(__dirname, '..', 'dist');
const PORT = 4321;

// Every static, indexable route - keep this in sync with sitemap.xml
// and each page's own <SEO path="..."> prop.
const ROUTES = [
  '/',
  '/about',
  '/observatory',
  '/reports',
  '/country-profiles',
  '/fellows',
  '/certifications',
  '/contact',
  '/docs',
  '/donate',
  '/privacy',
];

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain',
  '.xml': 'application/xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function startStaticServer() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      let urlPath = req.url.split('?')[0];
      let filePath = join(DIST_DIR, urlPath);

      // Directory-style request (or no extension, i.e. a client-side
      // route) -> serve the SPA shell, same as production's SPA
      // fallback would.
      if (urlPath.endsWith('/') || !extname(urlPath)) {
        filePath = join(DIST_DIR, 'index.html');
      }

      if (!existsSync(filePath)) {
        filePath = join(DIST_DIR, 'index.html');
      }

      const ext = extname(filePath);
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(readFileSync(filePath));
    });
    server.listen(PORT, () => resolve(server));
  });
}

async function main() {
  if (!existsSync(DIST_DIR)) {
    console.error('dist/ not found - run `vite build` before prerendering.');
    process.exit(1);
  }

  const server = await startStaticServer();
  console.log(`Serving dist/ at http://localhost:${PORT} for prerendering...`);

  // PRERENDER_CHROMIUM_PATH lets this run in sandboxed/offline
  // environments that can't reach Playwright's own browser download
  // CDN, by pointing at an already-installed Chromium binary instead.
  // Not needed in normal CI/production - the "Install Playwright's
  // Chromium" step in .github/workflows/deploy-frontend.yml (which
  // actually builds and deploys the frontend now - see that workflow's
  // header comment) runs `npx playwright install --with-deps chromium`
  // before this script ever executes.
  const launchOptions = {};
  if (process.env.PRERENDER_CHROMIUM_PATH) {
    launchOptions.executablePath = process.env.PRERENDER_CHROMIUM_PATH;
  }

  const browser = await chromium.launch(launchOptions);
  const page = await browser.newPage();

  let successCount = 0;
  const failures = [];

  for (const route of ROUTES) {
    try {
      const url = `http://localhost:${PORT}${route}`;
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

      // Give React a moment past "networkidle" to settle any
      // post-mount effects (e.g. a page's own useEffect-driven data
      // fetch) before capturing the DOM.
      await page.waitForTimeout(300);

      const html = await page.content();

      const outDir = route === '/' ? DIST_DIR : join(DIST_DIR, route.slice(1));
      mkdirSync(outDir, { recursive: true });
      writeFileSync(join(outDir, 'index.html'), html);

      console.log(`prerendered ${route} -> dist${route === '/' ? '' : route}/index.html`);
      successCount += 1;
    } catch (err) {
      console.error(`Failed to prerender ${route}:`, err.message);
      failures.push(route);
    }
  }

  await browser.close();
  server.close();

  console.log(`\nPrerendered ${successCount}/${ROUTES.length} routes.`);
  if (failures.length > 0) {
    console.error(`Failed routes: ${failures.join(', ')}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Prerender failed:', err);
  process.exit(1);
});

