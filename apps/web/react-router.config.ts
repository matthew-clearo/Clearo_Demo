import { vercelPreset } from '@vercel/react-router/vite';
import type { Config } from '@react-router/dev/config';

export default {
  appDirectory: './src/app',
  ssr: true, // Should be true for most modern templates
  presets: [vercelPreset()],
} satisfies Config;