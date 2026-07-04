import type { Meta, StoryObj } from '@storybook/angular';
import { StepperComponent } from './stepper.component';

const STEPS = [
  { label: 'Sprzeczność' }, { label: 'Mapowanie' }, { label: 'Generowanie' },
  { label: 'Ocena' }, { label: 'Wybór' },
];

const meta: Meta<StepperComponent> = {
  title: 'UI/Stepper',
  component: StepperComponent,
  args: { steps: STEPS, current: 1 },
};
export default meta;
type Story = StoryObj<StepperComponent>;

export const FirstStep: Story = { args: { current: 0 } };
export const MidFlow: Story = { args: { current: 2 } };
export const LastStep: Story = { args: { current: 4 } };
