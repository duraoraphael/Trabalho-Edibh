import { ReactNode, useState } from "react";
import Sidebar from "./Sidebar";

function AppLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`app-layout ${collapsed ? "sidebar-collapsed" : ""}`}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((prev) => !prev)} />
      <div className="app-content">{children}</div>
    </div>
  );
}

export default AppLayout;
