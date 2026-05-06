import { type Plugin, loadEnv } from 'vite';

/**
 * Rewrites `process.env.NEXT_PUBLIC_*` access in browser code to string literals.
 * This preserves lightweight Next-style compatibility without exposing a global
 * `process.env` object in the browser console.
 */
export function nextPublicProcessEnv(): Plugin {
  const publicEnv = loadEnv(
    process.env.NODE_ENV ?? 'development',
    process.cwd(),
    'NEXT_PUBLIC_',
  );

  return {
    name: 'vite:next-public-process-env',
    enforce: 'post',

    /** Inline static public env reads in browser builds. */
    transform(code, id, opts) {
      if (opts?.ssr) return null;
      if (!/\.[cm]?[jt]sx?$/.test(id)) return null;
      if (!code.includes('process.env.NEXT_PUBLIC_')) return null;

      const rewritten = code.replace(
        /\bprocess\.env\.(NEXT_PUBLIC_[A-Z0-9_]+)\b/g,
        (_, key: string) => JSON.stringify(publicEnv[key] ?? ''),
      );

      if (rewritten === code) return null;

      return { code: rewritten, map: null };
    },
  };
}
