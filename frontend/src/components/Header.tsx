import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FiBell, FiChevronDown, FiLogOut, FiSearch, FiUser } from "react-icons/fi";
import normatelLogo from "../assets/normatel.png";
import petrobrasLogo from "../assets/petrobras.svg";

function Header() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [search, setSearch] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);

  const isAuthPage = ["/login", "/register", "/forgot-password", "/reset-password"].includes(pathname);
  const userName = localStorage.getItem("name") || "Usuário";
  const userRole = localStorage.getItem("role") || "Operador";
  const initials = useMemo(
    () =>
      userName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join(""),
    [userName]
  );

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("role");
    localStorage.removeItem("name");
    navigate("/login");
  };

  return (
    <header className="site-header" aria-label="Cabecalho institucional">
      <div className="site-header-inner">
        <div className="brand-cluster">
          <div className="logos-group">
            <div className="site-logo-wrap normatel">
              <img src={normatelLogo} alt="Normatel Engenharia" />
            </div>
            <div className="site-logo-wrap petrobras">
              <img src={petrobrasLogo} alt="Petrobras" />
            </div>
          </div>
          <div className="header-divider" aria-hidden="true" />
          <div className="site-title-wrap">
            <div className="site-title">Fluxo de Equipamentos</div>
            <div className="site-subtitle">Painel corporativo de operações técnicas</div>
          </div>
        </div>
{!isAuthPage && (
          <div className="header-search" role="search">
            <FiSearch className="header-search-icon" aria-hidden="true" />
            <input
              aria-label="Busca rápida"
              placeholder="Buscar instalação, sistema ou equipamento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}

        <div className="header-right">
          <div className="header-actions">
            {!isAuthPage && (
              <button type="button" className="icon-button" aria-label="Notificações">
                <FiBell />
              </button>
            )}

            {!isAuthPage ? (
              <div className="profile-menu-wrap">
                <button type="button" className="profile-trigger" onClick={() => setProfileOpen((v) => !v)}>
                  <div className="avatar-circle" aria-hidden="true">{initials || "US"}</div>
                  <div className="profile-meta">
                    <strong>{userName}</strong>
                    <span>{userRole}</span>
                  </div>
                  <FiChevronDown className={`profile-chevron ${profileOpen ? "open" : ""}`} aria-hidden="true" />
                </button>

                {profileOpen && (
                  <div className="profile-dropdown" role="menu">
                    <button type="button" className="profile-item" onClick={() => setProfileOpen(false)}>
                      <FiUser /> Perfil
                    </button>
                    <button type="button" className="profile-item danger" onClick={handleLogout}>
                      <FiLogOut /> Sair
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
