import { PropsWithChildren, useState } from "react";
import { ConfigProvider, FloatButton, Layout, theme } from "antd";
import { SendOutlined } from "@ant-design/icons";
import "antd/dist/reset.css";
import "./Chatroom.css";

export function Chatroom() {
  return (
    <AntdConfig>
      <Layout className="Chatroom">
        <Layout.Content className="Chatroom_Content">Content</Layout.Content>
      </Layout>

      <FloatButton
        className="Chatroom_FloatButton"
        icon={<SendOutlined />}
        type="primary"
        shape="square"
      />
    </AntdConfig>
  );
}

export function useChatroom() {
  const [draft, setDraft] = useState("");
  const clear = () => setDraft("");

  return {
    draft,
    setDraft,
    clear,
  };
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
