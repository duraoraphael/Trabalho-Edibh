import { ReactNode } from "react";
import { Navigate } from "react-router-dom";

const getToken = () => localStorage.getItem("access_token");
const getRole = () => localStorage.getItem("role");

const SKIP_AUTH = process.env.NODE_ENV === "development" && process.env.REACT_APP_SKIP_AUTH === "true";

export function PrivateRoute({ children, requiredRole }: { children: ReactNode; requiredRole?: string }) {
  if (SKIP_AUTH) {
    return <>{children}</>;
  }
  if (!getToken()) {
    return <Navigate to="/login" replace />;
  }
  if (requiredRole) {
    const currentRole = getRole();
    const acceptedRoles = requiredRole.split("|").map((role) => role.trim());
    if (!currentRole || !acceptedRoles.includes(currentRole)) {
      return <Navigate to="/" replace />;
    }
  }
  return <>{children}</>;
}
