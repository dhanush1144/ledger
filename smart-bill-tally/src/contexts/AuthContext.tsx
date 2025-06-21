import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'user';
  user_type: 'individual' | 'organization' | 'accountant';
  company_id: string | null;
  company_name: string | null;
  gst_number: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, userType: string, companyName?: string, gstNumber?: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        return null;
      }

      if (data) {
        // Ensure proper type casting for the role field
        const profile: Profile = {
          id: data.id,
          email: data.email,
          full_name: data.full_name,
          role: (data.role === 'admin' ? 'admin' : 'user') as 'admin' | 'user',
          user_type: data.user_type,
          company_id: data.company_id,
          company_name: data.company_name,
          gst_number: data.gst_number,
          created_at: data.created_at,
          updated_at: data.updated_at
        };
        return profile;
      }

      return null;
    } catch (error) {
      console.error('Error in fetchProfile:', error);
      return null;
    }
  };

  const createProfile = async (user: User, name: string, userType: string, companyName?: string, gstNumber?: string): Promise<Profile | null> => {
    try {
      let companyId = null;
      
      // Create company if user is organization type
      if (userType === 'organization' && companyName) {
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .insert({
            name: companyName,
            gst_number: gstNumber,
            email: user.email
          })
          .select()
          .single();

        if (companyError) {
          console.error('Error creating company:', companyError);
        } else {
          companyId = company.id;
        }
      }

      const { data, error } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email || '',
          full_name: name,
          user_type: userType as 'individual' | 'organization' | 'accountant',
          company_id: companyId,
          company_name: companyName || null,
          gst_number: gstNumber || null
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating profile:', error);
        return null;
      }

      // Ensure proper type casting for the returned profile
      const profile: Profile = {
        id: data.id,
        email: data.email,
        full_name: data.full_name,
        role: (data.role === 'admin' ? 'admin' : 'user') as 'admin' | 'user',
        user_type: data.user_type,
        company_id: data.company_id,
        company_name: data.company_name,
        gst_number: data.gst_number,
        created_at: data.created_at,
        updated_at: data.updated_at
      };
      return profile;
    } catch (error) {
      console.error('Error in createProfile:', error);
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(async () => {
            const profileData = await fetchProfile(session.user.id);
            if (mounted && profileData) {
              setProfile(profileData);
            }
          }, 0);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          setLoading(false);
          return;
        }
        
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          const profileData = await fetchProfile(session.user.id);
          if (mounted && profileData) {
            setProfile(profileData);
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error in getSession:', error);
        setLoading(false);
      }
    };

    getSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('Login error:', error);
        throw error;
      }
      
      console.log('Login successful:', data.user?.email);
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error: any) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string, userType: string, companyName?: string, gstNumber?: string) => {
    setLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/dashboard`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: name,
            user_type: userType,
            company_name: companyName,
            gst_number: gstNumber
          }
        }
      });
      
      if (error) {
        console.error('Registration error:', error);
        throw error;
      }
      
      if (data.user) {
        await createProfile(data.user, name, userType, companyName, gstNumber);
      }
      
      console.log('Registration successful:', data.user?.email);
    } catch (error: any) {
      console.error('Registration failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      setProfile(null);
      setSession(null);
      console.log('User logged out');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      session, 
      login, 
      register, 
      logout, 
      loading 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
