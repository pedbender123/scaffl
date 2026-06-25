import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import LandingPage from './pages/LandingPage';
import Chat from './pages/Chat';
import Settings from './pages/Settings';
import PersonasPage from './pages/PersonasPage';
import DisciplinasPage from './pages/DisciplinasPage';
import LabMural from './pages/LabMural';
import LabEditor from './pages/LabEditor';
import ClassPage from './pages/ClassPage';
import ActivitiesAdminPage from './pages/ActivitiesAdminPage';
import ClassroomsAdminPage from './pages/ClassroomsAdminPage';
import IaUsageAdminPage from './pages/IaUsageAdminPage';
import { Loader2 } from 'lucide-react';

const Spinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
    <Loader2 className="animate-spin text-primary" size={32} />
  </div>
);

/** Root "/": landing page se não autenticado, redireciona para /mural se autenticado. */
function RootRoute() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (user) return <Navigate to="/mural" replace />;
  return <LandingPage />;
}

/** Protege rotas do app — redireciona para /login se não autenticado. */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            {/* Landing — pública */}
            <Route path="/" element={<RootRoute />} />

            {/* Auth */}
            <Route path="/login" element={<Login />} />

            {/* App — todas as rotas protegidas usam o Layout com Outlet */}
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/mural"            element={<PersonasPage />} />
              <Route path="/disciplinas"       element={<DisciplinasPage />} />
              <Route path="/chat"              element={<Chat />} />
              <Route path="/chat/:chatId"      element={<Chat />} />
              <Route path="/lab"               element={<LabMural />} />
              <Route path="/lab/:projectId"    element={<LabEditor />} />
              <Route path="/class"             element={<ClassPage />} />
              <Route path="/activities-admin"  element={<ActivitiesAdminPage />} />
              <Route path="/classrooms-admin"  element={<ClassroomsAdminPage />} />
              <Route path="/ia-usage-admin"    element={<IaUsageAdminPage />} />
              <Route path="/settings"          element={<Settings />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  );
}
