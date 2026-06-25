import { ReactNode } from "react";
import Sidebar from "./Sidebar";

function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-content">{children}</div>
    </div>
  );
}

export default AppLayout;
