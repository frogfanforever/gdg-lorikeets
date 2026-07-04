import type { Meta, StoryObj } from '@storybook/angular';
import { StepperComponent } from './stepper.component';

const STEPS = [
  { label: 'Problem' }, { label: 'Metody' }, { label: 'Analiza' },
  { label: 'Shortlist' }, { label: 'Wynik' },
];

const meta: Meta<StepperComponent> = {
  title: 'UI/Stepper',
  component: StepperComponent,
  args: { steps: STEPS, current: 1, reached: 1 },
};
export default meta;
type Story = StoryObj<StepperComponent>;

export const FirstStep: Story = { args: { current: 0, reached: 0 } };
export const MidFlow: Story = { args: { current: 2, reached: 2 } };
export const LastStep: Story = { args: { current: 4, reached: 4 } };
export const RevisitEarlierStep: Story = { args: { current: 1, reached: 4 } };
export const AnalyzingNextStep: Story = { args: { current: 0, reached: 0, analyzing: 1 } };
