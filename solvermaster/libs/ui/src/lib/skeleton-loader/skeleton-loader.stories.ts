import type { Meta, StoryObj } from '@storybook/angular';
import { SkeletonLoaderComponent } from './skeleton-loader.component';

const meta: Meta<SkeletonLoaderComponent> = {
  title: 'UI/SkeletonLoader',
  component: SkeletonLoaderComponent,
  args: { lines: 4, interval: 1900 },
  render: (args) => ({ props: args, template: `<div style="max-width:520px"><sm-skeleton-loader [lines]="lines" [interval]="interval" /></div>` }),
};
export default meta;
type Story = StoryObj<SkeletonLoaderComponent>;

export const Default: Story = {};
export const Compact: Story = { args: { lines: 2 } };
