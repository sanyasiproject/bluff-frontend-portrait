import react from '@vitejs/plugin-react';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, loadEnv, type Plugin } from 'vite';

// production builds: connect to the backend and request /health from <head>, so a sleeping server wakes while the JS loads
function wakeServer(url: string | undefined): Plugin {
  const server = url?.trim().replace(/\/$/, '');
  return {
    name: 'wake-server',
    apply: 'build',
    transformIndexHtml: () =>
      server
        ? [
            { tag: 'link', attrs: { rel: 'preconnect', href: server, crossorigin: '' }, injectTo: 'head' },
            { tag: 'link', attrs: { rel: 'preload', as: 'fetch', href: `${server}/health`, crossorigin: 'anonymous' }, injectTo: 'head' },
          ]
        : [],
  };
}

// the app stylesheet ahead of the JS chunks in <head>, so it downloads first and the first paint isn't held up
function cssFirst(): Plugin {
  return {
    name: 'css-first',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml: {
      order: 'post',
      handler: (html) => {
        const links = html.match(/<link rel="stylesheet"[^>]*>\s*/g) ?? [];
        if (!links.length) return html;
        const rest = links.reduce((h, l) => h.replace(l, ''), html);
        // after the inline first-paint <style> (the app styles must win over it), before the JS
        return rest.replace(/(\s*)(<script type="module")/, `$1${links.join('')}$1$2`);
      },
    },
  };
}

// gives the built service worker this build's id, so phones replace the old worker and its cache on every deploy
function stampServiceWorker(): Plugin {
  let outDir = 'dist';
  return {
    name: 'stamp-sw',
    apply: 'build',
    configResolved: (c) => void (outDir = resolve(c.root, c.build.outDir)),
    closeBundle: () => {
      const file = resolve(outDir, 'sw.js');
      const id = (process.env.VERCEL_GIT_COMMIT_SHA ?? '').slice(0, 12) || Date.now().toString(36);
      writeFileSync(file, readFileSync(file, 'utf8').replace("const VERSION = 'dev';", `const VERSION = '${id}';`));
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), cssFirst(), stampServiceWorker(), wakeServer(loadEnv(mode, process.cwd(), 'VITE_').VITE_SERVER_URL)],
  server: { port: 5173 },
}));
