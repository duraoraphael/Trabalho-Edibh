import { Routes, Route, Navigate } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import HistoryPage from "./pages/HistoryPage";
import ReportFormPage from "./pages/ReportFormPage";
import ExecutiveDashboardPage from "./pages/ExecutiveDashboardPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import SharePointConfigPage from "./pages/SharePointConfigPage";
import ProfilePage from "./pages/ProfilePage";
import AdminUsersPage from "./pages/AdminUsersPage";
import FormManagerPage from "./pages/FormManagerPage";
import { PrivateRoute } from "./components/PrivateRoute";
import AppLayout from "./components/AppLayout";
import Header from "./components/Header";

function App() {
  return (
    <div className="App">
      <Header />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={<PrivateRoute><AppLayout><ReportFormPage /></AppLayout></PrivateRoute>} />
        <Route path="/dashboard" element={<PrivateRoute><AppLayout><DashboardPage /></AppLayout></PrivateRoute>} />
        <Route path="/history" element={<PrivateRoute><AppLayout><HistoryPage /></AppLayout></PrivateRoute>} />
        <Route path="/executive" element={<PrivateRoute><AppLayout><ExecutiveDashboardPage /></AppLayout></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><AppLayout><ProfilePage /></AppLayout></PrivateRoute>} />
        <Route
          path="/admin/users"
          element={
            <PrivateRoute requiredRole="Administrador">
              <AppLayout><AdminUsersPage /></AppLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/forms"
          element={
            <PrivateRoute requiredRole="Administrador|Gerente">
              <AppLayout><FormManagerPage /></AppLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/settings/sharepoint"
          element={
            <PrivateRoute requiredRole="Administrador">
              <AppLayout><SharePointConfigPage /></AppLayout>
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
