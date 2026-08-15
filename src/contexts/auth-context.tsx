'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Profile } from '@/lib/database.types';
import { dbService } from '@/services/db';

type AuthContextType = {
  user: Profile | null;
  loading: boolean;
  login: (email: string, password: string, role: 'admin' | 'customer') => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isAdmin: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        if (isSupabaseConfigured && supabase) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const profile = await dbService.getProfile(session.user.id);
            setUser(profile);
          }
        } else {
          // Mock Auth Session check from localStorage
          const savedUser = localStorage.getItem('chaveiro_auto_current_user');
          if (savedUser) {
            setUser(JSON.parse(savedUser));
          }
        }
      } catch (err) {
        console.error('Erro ao carregar usuário autenticado:', err);
      } finally {
        setLoading(false);
      }
    }

    loadUser();

    // Supabase auth listener
    if (isSupabaseConfigured && supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (session?.user) {
            const profile = await dbService.getProfile(session.user.id);
            setUser(profile);
          } else {
            setUser(null);
          }
          setLoading(false);
        }
      );
      return () => subscription.unsubscribe();
    }
  }, []);

  // Simple login handler for demonstration purposes (bypasses password in mock)
  const login = async (email: string, password: string, role: 'admin' | 'customer'): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) {
          setLoading(false);
          return { success: false, error: error.message };
        }
        let profile = await dbService.getProfile(data.user.id);
        if (!profile) {
          const lowerEmail = email.toLowerCase();
          const autoAdmin = lowerEmail === 'admin@chaveiroauto.com.br' || lowerEmail === 'denyscoborges@gmail.com';
          profile = {
            id: data.user.id,
            email: data.user.email || email,
            name: data.user.user_metadata?.name || 'Administrador',
            role: autoAdmin ? 'admin' : 'customer',
            created_at: new Date().toISOString()
          };
        }
        const lowerEmail = email.toLowerCase();
        if (lowerEmail === 'admin@chaveiroauto.com.br' || lowerEmail === 'denyscoborges@gmail.com') {
          profile.role = 'admin';
        }
        setUser(profile);
        setLoading(false);
        return { success: true };
      } else {
        // Mock Login: check profile or create a default one
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Mock password rule
        const isMockAdmin = email.toLowerCase() === 'admin@chaveiroauto.com.br' && password === 'admin123';
        const isMockCustomer = role === 'customer' && password === '123456';

        if (role === 'admin' && !isMockAdmin) {
          setLoading(false);
          return { success: false, error: 'Senha incorreta para o administrador de testes.' };
        }
        if (role === 'customer' && !isMockCustomer) {
          setLoading(false);
          return { success: false, error: 'Senha de demonstração de cliente incorreta.' };
        }

        let profile = await dbService.getProfileByEmail(email);

        if (!profile) {
          const newProfile: Profile = {
            id: role === 'admin' ? 'user-admin-id' : 'user-customer-id',
            email: email,
            name: role === 'admin' ? 'Denys (Administrador)' : 'Carlos Silva',
            role: role,
            created_at: new Date().toISOString()
          };
          profile = newProfile;
        }

        profile.role = role;

        setUser(profile);
        localStorage.setItem('chaveiro_auto_current_user', JSON.stringify(profile));
        setLoading(false);
        return { success: true };
      }
    } catch (err: any) {
      console.error('Erro ao realizar login:', err);
      setLoading(false);
      return { success: false, error: err.message || 'Erro inesperado ao realizar login.' };
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.auth.signOut();
      } else {
        localStorage.removeItem('chaveiro_auto_current_user');
      }
      setUser(null);
    } catch (err) {
      console.error('Erro ao fazer logout:', err);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = user?.role === 'admin' || 
                  user?.email?.toLowerCase() === 'admin@chaveiroauto.com.br' || 
                  user?.email?.toLowerCase() === 'denyscoborges@gmail.com';

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
