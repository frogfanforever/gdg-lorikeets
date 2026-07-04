import type { Preview } from '@storybook/angular';

const preview: Preview = {
  parameters: {
    // axe-core config shared by the a11y addon (UI panel) and the test-runner.
    // WCAG 2.1 A + AA is the bar we hold components to.
    a11y: {
      config: {
        rules: [
          // Stories render a bare component with no <main>/<h1>, so the
          // page-level landmark/region rules don't apply here.
          { id: 'region', enabled: false },
          { id: 'landmark-one-main', enabled: false },
          { id: 'page-has-heading-one', enabled: false },
        ],
      },
      options: {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
      },
    },
  },
};

export default preview;
