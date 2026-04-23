import { Menu } from "antd";
import {
  DashboardOutlined,
  FormOutlined,
  FileTextOutlined,
} from "@ant-design/icons";

import { useNavigate } from "react-router-dom";

function Sidebar() {
  const navigate = useNavigate();

  return (
    <Menu
      theme="dark"
      mode="inline"
      onClick={({ key }) => {
        if (key === "1") navigate("/");
        if (key === "2") navigate("/forms");
        if (key === "3") navigate("/responses");
      }}
      items={[
        {
          key: "1",
          icon: <DashboardOutlined />,
          label: "Dashboard",
        },
        {
          key: "2",
          icon: <FormOutlined />,
          label: "Forms",
        },
        {
          key: "3",
          icon: <FileTextOutlined />,
          label: "Responses",
        },
      ]}
    />
  );
}

export default Sidebar;