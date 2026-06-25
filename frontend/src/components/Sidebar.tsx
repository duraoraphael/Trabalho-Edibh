import { NavLink, useNavigate } from "react-router-dom";

function Sidebar({ className = "" }: { className?: string }) {
  const navigate = useNavigate();
  const role = localStorage.getItem("role");
  const name = localStorage.getItem("name");

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("role");
    localStorage.removeItem("name");
    navigate("/login");
  };

  return (
    <nav className={`sidebar ${className}`.trim()}>
      {name && <div className="sidebar-user">{name}</div>}
      <NavLink to="/" end className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}>Nova Ordem</NavLink>
      <NavLink to="/dashboard" className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}>Dashboard</NavLink>
      <NavLink to="/history" className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}>Histórico</NavLink>
      <NavLink to="/executive" className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}>Executivo</NavLink>
      {role === "Administrador" && (
        <NavLink to="/settings/sharepoint" className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}>
          Configuração SharePoint
        </NavLink>
      )}
      <button type="button" className="secondary-button sidebar-logout" onClick={handleLogout}>Sair</button>
    </nav>
  );
}

export default Sidebar;
