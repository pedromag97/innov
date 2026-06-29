import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setToken, getToken } from '../api.js';
import { setDemo } from '../demo.js';

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
        setUser({ id: payload.uid, email: payload.email, role: payload.role, team_id: payload.team_id });
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

  const loginWithGoogle = useCallback(async (idToken) => {
    const { token, user: u } = await api.loginGoogle(idToken);
    setToken(token);
    setUser(u);
    return u;
  }, []);

  // Entrar em modo demonstração (sem backend) com um role à escolha.
  const loginDemo = useCallback((role = 'ADMIN') => {
    setDemo(true);
    const u = role === 'FIELD'
      ? { id: 3, email: 'valter@empresa.pt', role: 'FIELD', team_id: 3 }
      : { id: 1, email: 'demo@empresa.pt', role, team_id: null };
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    setDemo(false);
    setToken(null);
    setUser(null);
  }, []);

  const isBackoffice = user && (user.role === 'ADMIN' || user.role === 'BACKOFFICE');
  const isField = user && user.role === 'FIELD';

  return (
    <AuthContext.Provider value={{ user, ready, loginWithGoogle, loginDemo, logout, isBackoffice, isField }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
