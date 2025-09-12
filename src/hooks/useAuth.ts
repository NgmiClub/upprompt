import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Handle profile creation for new OAuth users
        if (event === 'SIGNED_IN' && session?.user) {
          await handleProfileCreation(session.user);
        }
        
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      // Handle profile creation for existing sessions
      if (session?.user) {
        await handleProfileCreation(session.user);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleProfileCreation = async (user: User) => {
    try {
      // Check if profile already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (existingProfile) {
        return; // Profile already exists
      }

      // Extract username from Twitter data or use email/id fallback
      let username = '';
      if (user.user_metadata?.preferred_username) {
        username = user.user_metadata.preferred_username;
      } else if (user.user_metadata?.user_name) {
        username = user.user_metadata.user_name;
      } else if (user.email) {
        username = user.email.split('@')[0];
      } else {
        username = `user_${user.id.slice(0, 8)}`;
      }

      // Make sure username is unique
      const { data: existingUsername } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .single();

      if (existingUsername) {
        username = `${username}_${Date.now()}`;
      }

      // Create profile
      const { error } = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          username: username,
          bio: user.user_metadata?.description || '',
          avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error creating profile:', error);
      }
    } catch (error) {
      console.error('Error in handleProfileCreation:', error);
    }
  };

  const refreshUser = async () => {
    try {
      const { data: { session: currentSession }, error } = await supabase.auth.getSession();
      if (error) throw error;
      
      if (currentSession) {
        setSession(currentSession);
        setUser(currentSession.user);
      }
      
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        setUser(currentUser);
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, username: string, bio: string = '') => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          username,
          bio
        }
      }
    });
    return { error };
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      // Clear local state immediately
      setUser(null);
      setSession(null);
      
      return { error };
    } catch (error) {
      console.error('Error in signOut:', error);
      return { error };
    }
  };

  const signInWithTwitter = async () => {
    // Use the standard Supabase callback URL format
    const redirectUrl = `${window.location.origin}/auth/v1/callback`;
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'twitter',
      options: {
        redirectTo: redirectUrl,
      }
    });
    return { data, error };
  };

  return {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    signInWithTwitter,
    refreshUser,
  };
}