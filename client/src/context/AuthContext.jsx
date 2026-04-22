import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);        // { id, name, email }
  const [loading, setLoading] = useState(true);  // true while verifying token on mount

  // On mount: try to restore session from localStorage token
  useEffect(() => {
    const token = localStorage.getItem('ht_token');
    if (!token) {
      setLoading(false);
      return;
    }
    // Verify token is still valid by calling /me
    api.get('/auth/me')
      .then(({ data }) => setUser(data.user))
      .catch(() => {
        // Token invalid/expired — clear it
        localStorage.removeItem('ht_token');
        localStorage.removeItem('ht_user');
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('ht_token', data.token);
    localStorage.setItem('ht_user', JSON.stringify(data.user));
    setUser(data.user);
    return data;
  }, []);

  const signup = useCallback(async (name, email, password) => {
    const { data } = await api.post('/auth/signup', { name, email, password });
    localStorage.setItem('ht_token', data.token);
    localStorage.setItem('ht_user', JSON.stringify(data.user));
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('ht_token');
    localStorage.removeItem('ht_user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
