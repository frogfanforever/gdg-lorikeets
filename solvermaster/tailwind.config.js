const { join } = require('path');

/** Design tokens from the Agent TRIZ design system (Inter + JetBrains Mono,
 *  monochrome base + electric accent). */
module.exports = {
  content: [
    join(__dirname, 'apps/frontend/src/**/!(*.stories|*.spec).{ts,html}'),
    join(__dirname, 'libs/**/src/**/!(*.stories|*.spec).{ts,html}'),
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        ink: '#0c0e14',
        paper: '#eceff4',
        surface: '#ffffff',
        line: '#d7dce4',
        accent: { DEFAULT: '#2f5cff', ink: '#2247d6', soft: '#e9edff' },
      },
    },
  },
  plugins: [],
};
