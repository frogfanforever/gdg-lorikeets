const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');

module.exports = {
  output: {
    path: join(__dirname, '../../dist/apps/solver-api'),
  },
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      // solver-agent prompts are loaded at runtime by the in-process agent;
      // copy them next to the bundle so loadPrompt() (reads __dirname/prompts) works.
      assets: [
        { input: '../solver-agent/src/prompts', glob: '*.md', output: './prompts' },
      ],
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: true,
    }),
  ],
};
