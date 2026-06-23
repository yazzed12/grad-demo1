import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  // Roles: 'admin', 'doctor', 'receptionist', 'patient'
  const [user, setUser] = useState(null); 
  const [loading, setLoading] = useState(true);

  const fetchMe = async (token) => {
    try {
      const response = await fetch('http://localhost:8000/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Token invalid or expired');
      const me = await response.json();
      const userData = { 
        name: me.full_name, 
        role: me.role, 
        id: me.id, 
        email: me.email,
        phone: me.phone,
        specialization: me.specialization
      };
      setUser(userData);
      return userData;
    } catch (err) {
      console.error("Auth persistence error:", err);
      localStorage.removeItem('clinic_token');
      setUser(null);
      return null;
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('clinic_token');
    if (token) {
      fetchMe(token).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (role, username = 'doctor1', password = 'password123') => {
    try {
      const params = new URLSearchParams();
      params.append('username', username);
      params.append('password', password);

      const response = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params
      });

      if (!response.ok) throw new Error('Login failed');

      const data = await response.json();
      localStorage.setItem('clinic_token', data.access_token);
      
      return await fetchMe(data.access_token);
    } catch (err) {
      console.error("Auth error:", err);
      return null;
    }
  };
  
  const register = async (payload) => {
    try {
      const response = await fetch('http://localhost:8000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || 'Registration failed');
      }

      return await response.json();
    } catch (err) {
      console.error("Registration error:", err);
      throw err;
    }
  };

  const verify = async (payload) => {
    try {
      const response = await fetch('http://localhost:8000/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || 'Verification failed');
      }

      const data = await response.json();
      localStorage.setItem('clinic_token', data.access_token);
      
      return await fetchMe(data.access_token);
    } catch (err) {
      console.error("Verification error:", err);
      throw err;
    }
  };
  
  const logout = () => {
    localStorage.removeItem('clinic_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, register, verify, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
