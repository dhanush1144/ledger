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

  const fetchOrCreateProfile = async (user: User): Promise<Profile | null> => {
    try {
      console.log('Fetching profile for user:', user.id);
      
      // First, try to fetch existing profile
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle(); // Use maybeSingle() instead of single() to avoid error when no rows

      if (fetchError) {
        console.error('Error fetching profile:', fetchError);
        return null;
      }

      if (existingProfile) {
        console.log('Found existing profile:', existingProfile);
        // Ensure proper type casting for the role field
        const profile: Profile = {
          id: existingProfile.id,
          email: existingProfile.email,
          full_name: existingProfile.full_name,
          role: (existingProfile.role === 'admin' ? 'admin' : 'user') as 'admin' | 'user',
          user_type: existingProfile.user_type,
          company_id: existingProfile.company_id,
          company_name: existingProfile.company_name,
          gst_number: existingProfile.gst_number,
          created_at: existingProfile.created_at,
          updated_at: existingProfile.updated_at
        };
        return profile;
      }

      // No profile exists, create one
      console.log('No profile found, creating new profile for user:', user.id);
      
      // Extract data from user metadata or use defaults
      const userMetadata = user.user_metadata || {};
      const fullName = userMetadata.full_name || userMetadata.name || user.email?.split('@')[0] || 'User';
      const userType = userMetadata.user_type || 'individual';
      const companyName = userMetadata.company_name || null;
      const gstNumber = userMetadata.gst_number || null;

      let companyId = null;
      
      // Create company if user is organization type and has company name
      if (userType === 'organization' && companyName) {
        console.log('Creating company for organization user:', companyName);
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
          console.log('Created company with ID:', companyId);
        }
      }

      // Create the profile
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email || '',
          full_name: fullName,
          user_type: userType as 'individual' | 'organization' | 'accountant',
          company_id: companyId,
          company_name: companyName,
          gst_number: gstNumber,
          role: 'user' // Default role
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating profile:', createError);
        return null;
      }

      console.log('Created new profile:', newProfile);

      // Return the properly typed profile
      const profile: Profile = {
        id: newProfile.id,
        email: newProfile.email,
        full_name: newProfile.full_name,
        role: (newProfile.role === 'admin' ? 'admin' : 'user') as 'admin' | 'user',
        user_type: newProfile.user_type,
        company_id: newProfile.company_id,
        company_name: newProfile.company_name,
        gst_number: newProfile.gst_number,
        created_at: newProfile.created_at,
        updated_at: newProfile.updated_at
      };
      return profile;

    } catch (error) {
      console.error('Error in fetchOrCreateProfile:', error);
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
          // Fetch or create profile for the authenticated user
          const profileData = await fetchOrCreateProfile(session.user);
          if (mounted && profileData) {
            setProfile(profileData);
          }
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
          const profileData = await fetchOrCreateProfile(session.user);
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
      // Profile will be fetched/created automatically by the auth state change listener
      
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
      
      console.log('Registration successful:', data.user?.email);
      // Profile will be created automatically by the auth state change listener
      
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