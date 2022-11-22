import { PropsWithChildren } from "react";
import { ConfigProvider, Layout, theme } from "antd";
import "antd/dist/reset.css";
import "./Chatroom.css";

export function Chatroom() {
  return (
    <AntdConfig>
      <Layout className="Chatroom">
        <Layout.Content className="Chatroom_Content">Content</Layout.Content>
        <Layout.Footer className="Chatroom_Footer">Footer</Layout.Footer>
      </Layout>
    </AntdConfig>
  );
}

function AntdConfig(props: PropsWithChildren) {
  return (
    <ConfigProvider
      theme={{
        algorithm: [theme.darkAlgorithm, theme.compactAlgorithm],
      }}
    >
      {props.children}
    </ConfigProvider>
  );
}
