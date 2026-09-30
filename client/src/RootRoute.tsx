import { Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Spinner from './components/Spinner';

/** Rota "/": vai para /mural se estiver logado, senão para a tela de login/cadastro. */
export default function RootRoute() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  return <Navigate to={user ? '/mural' : '/login'} replace />;
}
