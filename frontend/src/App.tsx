import { Routes, Route, Navigate } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import HistoryPage from "./pages/HistoryPage";
import ReportFormPage from "./pages/ReportFormPage";
import ExecutiveDashboardPage from "./pages/ExecutiveDashboardPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import SharePointConfigPage from "./pages/SharePointConfigPage";
import { PrivateRoute } from "./components/PrivateRoute";
import AppLayout from "./components/AppLayout";
import Footer from './components/Footer';

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={<PrivateRoute><AppLayout><ReportFormPage /></AppLayout></PrivateRoute>} />
        <Route path="/dashboard" element={<PrivateRoute><AppLayout><DashboardPage /></AppLayout></PrivateRoute>} />
        <Route path="/history" element={<PrivateRoute><AppLayout><HistoryPage /></AppLayout></PrivateRoute>} />
        <Route path="/executive" element={<PrivateRoute><AppLayout><ExecutiveDashboardPage /></AppLayout></PrivateRoute>} />
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
      <Footer />
    </div>
  );
}

export default App;
