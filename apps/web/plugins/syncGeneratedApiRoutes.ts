import { execFileSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import micromatch from 'micromatch';
import type { Plugin, ViteDevServer } from 'vite';

const API_ROUTE_GLOBS = ['src/app/api/**/route.js', 'src/app/api/**/route.ts'];

function runApiRouteGeneration(root: string) {
  execFileSync(process.execPath, ['scripts/generate-api-routes.mjs'], {
    cwd: root,
    stdio: 'inherit',
  });
}

export function syncGeneratedApiRoutes(): Plugin {
  let root = process.cwd();
  let routeGlobs: string[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;

  function schedule(server: ViteDevServer, file: string, event: 'change' | 'add' | 'unlink') {
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        if (event !== 'change') {
          console.log(`[vite] ${event} detected for API route, regenerating route registry: ${file}`);
          runApiRouteGeneration(root);
        } else {
          console.log(`[vite] ${event} detected for API route, restarting server: ${file}`);
        }
        server.restart();
      } catch (error) {
        console.error('[vite] Failed to sync generated API routes', error);
      }
    }, 150);
  }

  return {
    name: 'sync-generated-api-routes',
    apply: 'serve',
    configResolved(config) {
      root = config.root;
      routeGlobs = API_ROUTE_GLOBS.map((pattern) => path.posix.join(root, pattern));
    },
    configureServer(server) {
      server.watcher.add(routeGlobs);

      const handle = (event: 'change' | 'add' | 'unlink') => (file: string) => {
        if (!micromatch.isMatch(file, routeGlobs)) {
          return;
        }
        schedule(server, file, event);
      };

      server.watcher.on('change', handle('change'));
      server.watcher.on('add', handle('add'));
      server.watcher.on('unlink', handle('unlink'));
    },
  };
}
