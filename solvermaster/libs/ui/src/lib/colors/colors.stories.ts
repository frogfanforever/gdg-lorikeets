import type { Meta, StoryObj } from '@storybook/angular';
import { ColorPaletteComponent } from './color-palette.component';

const meta: Meta<ColorPaletteComponent> = {
  title: 'Foundations/Colors',
  component: ColorPaletteComponent,
};
export default meta;
type Story = StoryObj<ColorPaletteComponent>;

export const Palette: Story = {};
