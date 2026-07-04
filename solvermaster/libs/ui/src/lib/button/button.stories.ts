import type { Meta, StoryObj } from '@storybook/angular';
import { ButtonComponent } from './button.component';

const meta: Meta<ButtonComponent> = {
  title: 'UI/Button',
  component: ButtonComponent,
  argTypes: {
    variant: { control: 'inline-radio', options: ['primary', 'secondary'] },
    disabled: { control: 'boolean' },
  },
  args: { variant: 'primary', disabled: false },
  render: (args) => ({
    props: args,
    template: `<sm-button [variant]="variant" [disabled]="disabled">Uruchom wybrane metody →</sm-button>`,
  }),
};
export default meta;
type Story = StoryObj<ButtonComponent>;

export const Primary: Story = {};

export const Secondary: Story = {
  args: { variant: 'secondary' },
  render: (args) => ({
    props: args,
    template: `<sm-button [variant]="variant" [disabled]="disabled">← Opis problemu</sm-button>`,
  }),
};

export const Disabled: Story = { args: { disabled: true } };

export const SideBySide: Story = {
  render: () => ({
    template: `
      <div style="display:flex; gap:12px; align-items:center">
        <sm-button variant="secondary">← Opis problemu</sm-button>
        <sm-button variant="primary">Uruchom wybrane metody →</sm-button>
      </div>`,
  }),
};
