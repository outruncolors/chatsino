import { ComponentStory, ComponentMeta } from "@storybook/react";
import { Button } from "./Button";

export default {
  title: "Button",
  component: Button,
} as ComponentMeta<typeof Button>;

const Template: ComponentStory<typeof Button> = (args: any) => (
  <Button {...args} />
);

export const Primary = Template.bind({});

Primary.args = {
  primary: true,
  label: "Button",
};

export const Secondary = Template.bind({});

Secondary.args = {
  default: true,
  label: "Button",
};
