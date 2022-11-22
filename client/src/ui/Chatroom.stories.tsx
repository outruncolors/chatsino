import { ComponentStory, ComponentMeta } from "@storybook/react";
import { Chatroom } from "./Chatroom";

export default {
  title: "Chatroom",
  component: Chatroom,
} as ComponentMeta<typeof Chatroom>;

const Template: ComponentStory<typeof Chatroom> = (args: any) => (
  <Chatroom {...args} />
);

export const Default = Template.bind({});

Default.args = {
  primary: true,
  label: "Chatroom",
};
