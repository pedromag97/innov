import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth/AuthContext.jsx';
import { MANAGE_ROLES } from './roles.js';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import WorkForm from './pages/WorkForm.jsx';
import FieldList from './pages/FieldList.jsx';
import FieldReturn from './pages/FieldReturn.jsx';
import Admin from './pages/Admin.jsx';

function Protected({ children, allow }) {
  const { user, ready } = useAuth();
  if (!ready) return <div className="p-8 text-center text-slate-500">A carregar…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (allow && !allow.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

// Encaminha para a home certa conforme o role.
function Home() {
  const { user, ready } = useAuth();
  if (!ready) return null;
  if (!user) return <Navigate to="/login" replace />;
  return user.role === 'TERRENO' ? <Navigate to="/terreno" replace /> : <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />

        {/* Gestão de trabalhos (Gerente/Backoffice/CDT/Admin) */}
        <Route path="/dashboard" element={<Protected allow={MANAGE_ROLES}><Dashboard /></Protected>} />
        <Route path="/trabalhos/novo" element={<Protected allow={MANAGE_ROLES}><WorkForm /></Protected>} />
        <Route path="/trabalhos/:id/editar" element={<Protected allow={MANAGE_ROLES}><WorkForm /></Protected>} />
        <Route path="/admin" element={<Protected allow={['ADMIN']}><Admin /></Protected>} />

        {/* Equipa de terreno (qualquer papel autenticado) */}
        <Route path="/terreno" element={<Protected><FieldList /></Protected>} />
        <Route path="/terreno/:id" element={<Protected><FieldReturn /></Protected>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
