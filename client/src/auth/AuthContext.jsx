import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setToken, getToken } from '../api.js';
import { setDemo } from '../demo.js';
import { canManageWorks } from '../roles.js';

const AuthContext = createContext(null);

// Decodifica o payload de um JWT (sem verificar — só para ler role/email no client).
function decodeJwt(token) {
  try {
    const [, payload] = token.split('.');
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  // Restaura sessão a partir do token guardado.
  useEffect(() => {
    const token = getToken();
    if (token) {
      const payload = decodeJwt(token);
      // exp em segundos; verifica validade.
      if (payload && (!payload.exp || payload.exp * 1000 > Date.now())) {
        setUser({
          id: payload.uid, email: payload.email, role: payload.role, team_id: payload.team_id,
          countries: payload.countries || [], departmentIds: payload.departmentIds || [],
        });
      } else {
        setToken(null);
      }
    }
    setReady(true);
  }, []);

  // Logout forçado quando a API devolve 401.
  useEffect(() => {
    const onLogout = () => { setUser(null); };
    window.addEventListener('fc-logout', onLogout);
    return () => window.removeEventListener('fc-logout', onLogout);
  }, []);

  const login = useCallback(async (email, password) => {
    const { token, user: u } = await api.login(email, password);
    setToken(token);
    setUser(u);
    return u;
  }, []);

  // Entrar em modo demonstração (sem backend) com um role à escolha.
  const loginDemo = useCallback((role = 'GERENTE') => {
    setDemo(true);
    const presets = {
      ADMIN:      { id: 1, email: 'admin@empresa.pt', role: 'ADMIN', team_id: null, countries: ['PT', 'FR'], departmentIds: [] },
      GERENTE:    { id: 2, email: 'gerente@empresa.pt', role: 'GERENTE', team_id: null, countries: ['PT', 'FR'], departmentIds: [] },
      BACKOFFICE: { id: 3, email: 'backoffice.fr@empresa.pt', role: 'BACKOFFICE', team_id: null, countries: ['FR'], departmentIds: [] },
      CDT:        { id: 4, email: 'cdt.ert45@empresa.pt', role: 'CDT', team_id: null, countries: [], departmentIds: [1] },
      TERRENO:    { id: 5, email: 'valter@empresa.pt', role: 'TERRENO', team_id: 3, countries: [], departmentIds: [] },
    };
    const u = presets[role] || presets.GERENTE;
    localStorage.setItem('fc_demo_user', JSON.stringify(u)); // p/ a API simulada aplicar âmbito
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    setDemo(false);
    localStorage.removeItem('fc_demo_user');
    setToken(null);
    setUser(null);
  }, []);

  const canManage = !!user && canManageWorks(user.role);
  const isAdmin = !!user && user.role === 'ADMIN';
  const isTerreno = !!user && user.role === 'TERRENO';

  return (
    <AuthContext.Provider value={{ user, ready, login, loginDemo, logout, canManage, isAdmin, isTerreno }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
