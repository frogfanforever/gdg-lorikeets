import type { Meta, StoryObj } from '@storybook/angular';
import { AppHeaderComponent } from './app-header.component';

const meta: Meta<AppHeaderComponent> = {
  title: 'UI/AppHeader',
  component: AppHeaderComponent,
  args: { run: '#A-042' },
};
export default meta;
type Story = StoryObj<AppHeaderComponent>;

export const Default: Story = {};
