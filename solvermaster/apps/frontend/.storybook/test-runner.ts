import type { TestRunnerConfig } from '@storybook/test-runner';
import { getStoryContext } from '@storybook/test-runner';
import { injectAxe, checkA11y, configureAxe } from 'axe-playwright';

/**
 * Storybook test-runner hooks — run axe-core against every story and fail on
 * WCAG 2.1 A/AA violations. Per-story a11y `parameters` (see preview.ts and any
 * story overrides) drive the rule set; a story can opt out with
 * `parameters.a11y.disable = true`.
 */
const config: TestRunnerConfig = {
  async preVisit(page) {
    await injectAxe(page);
  },
  async postVisit(page, context) {
    const storyContext = await getStoryContext(page, context);
    const a11y = storyContext.parameters?.['a11y'];
    if (a11y?.disable) return;

    await configureAxe(page, { rules: a11y?.config?.rules });
    await checkA11y(page, '#storybook-root', {
      detailedReport: true,
      detailedReportOptions: { html: true },
      axeOptions: a11y?.options,
    });
  },
};

export default config;
