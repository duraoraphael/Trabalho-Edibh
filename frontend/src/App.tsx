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
import ViewRecordPage from "./pages/ViewRecordPage";
import EditRecordPage from "./pages/EditRecordPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
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
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
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
            <PrivateRoute requiredRole="Administrador">
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
        <Route path="/history/view/:id" element={<PrivateRoute><AppLayout><ViewRecordPage /></AppLayout></PrivateRoute>} />
        <Route
          path="/history/edit/:id"
          element={
            <PrivateRoute requiredRole="Administrador">
              <AppLayout><EditRecordPage /></AppLayout>
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
