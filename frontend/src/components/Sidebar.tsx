import { NavLink, useNavigate } from "react-router-dom";
import {
  FiChevronLeft,
  FiChevronRight,
  FiFileText,
  FiGrid,
  FiClock,
  FiBarChart2,
  FiSettings,
  FiTool,
  FiUser,
  FiLogOut,
} from "react-icons/fi";

type SidebarProps = {
  className?: string;
  collapsed: boolean;
  onToggle: () => void;
};

function Sidebar({ className = "", collapsed, onToggle }: SidebarProps) {
  const navigate = useNavigate();
  const role = localStorage.getItem("role");
  const name = localStorage.getItem("name");

  const navItems = [
    { to: "/", label: "Novo Fluxo de Equipamentos Críticos", icon: FiFileText },
    { to: "/dashboard", label: "Dashboard", icon: FiGrid },
    { to: "/history", label: "Histórico", icon: FiClock },
    { to: "/executive", label: "Executivo", icon: FiBarChart2 },
    { to: "/profile", label: "Meu Perfil", icon: FiUser },
  ];

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("role");
    localStorage.removeItem("name");
    navigate("/login");
  };

  return (
    <nav className={`sidebar ${collapsed ? "collapsed" : ""} ${className}`.trim()}>
      <div className="sidebar-top">
        <button type="button" className="sidebar-toggle" onClick={onToggle} aria-label="Alternar menu lateral">
          {collapsed ? <FiChevronRight /> : <FiChevronLeft />}
        </button>
      </div>

      {name && !collapsed && <div className="sidebar-user">{name}</div>}

      {navItems.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}>
          <Icon className="sidebar-link-icon" aria-hidden="true" />
          {!collapsed && <span>{label}</span>}
        </NavLink>
      ))}

      {role === "Administrador" && (
        <>
          <NavLink to="/admin/users" className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}>
            <FiTool className="sidebar-link-icon" aria-hidden="true" />
            {!collapsed && <span>Administração</span>}
          </NavLink>
          <NavLink to="/admin/forms" className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}>
            <FiSettings className="sidebar-link-icon" aria-hidden="true" />
            {!collapsed && <span>Gerenciador de Formulários</span>}
          </NavLink>
          <NavLink to="/settings/sharepoint" className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}>
            <FiSettings className="sidebar-link-icon" aria-hidden="true" />
            {!collapsed && <span>Configuração SharePoint</span>}
          </NavLink>
        </>
      )}

      <button type="button" className="secondary-button sidebar-logout" onClick={handleLogout}>
        <FiLogOut className="sidebar-link-icon" aria-hidden="true" />
        {!collapsed && <span>Sair</span>}
      </button>
    </nav>
  );
}

export default Sidebar;
