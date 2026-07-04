import type { Meta, StoryObj } from '@storybook/angular';
import { StepTitleComponent } from './step-title.component';

const meta: Meta<StepTitleComponent> = {
  title: 'UI/StepTitle',
  component: StepTitleComponent,
  args: { eyebrow: 'Krok 01 · Sformułowanie sprzeczności', title: 'Opisz problem techniczny' },
  render: (args) => ({
    props: args,
    template: `<sm-step-title [eyebrow]="eyebrow" [title]="title">Opisz krótko, na czym polega trudność — agent wyodrębni sprzeczność techniczną.</sm-step-title>`,
  }),
};
export default meta;
type Story = StoryObj<StepTitleComponent>;

export const Default: Story = {};
