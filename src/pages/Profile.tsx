import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Navigation } from '@/components/layout/Navigation';
import { PromptCard } from '@/components/prompts/PromptCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Github, 
  Twitter, 
  Linkedin, 
  Instagram, 
  MessageSquare as Discord,
  Edit2,
  Loader2,
  Bookmark,
  ArrowUp
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  user_id: string;
  username: string;
  bio: string | null;
  avatar_url: string | null;
  github_url: string | null;
  twitter_url: string | null;
  linkedin_url: string | null;
  instagram_url: string | null;
  discord_url: string | null;
  created_at: string;
  updated_at: string;
}

interface Prompt {
  id: string;
  title: string;
  content: string;
  tags: string[];
  upvotes: number;
  bookmarks: number;
  username: string;
  avatar_url?: string;
  created_at: string;
  user_id: string;
}

export function Profile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userPrompts, setUserPrompts] = useState<Prompt[]>([]);
  const [bookmarkedPrompts, setBookmarkedPrompts] = useState<Prompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    username: '',
    bio: '',
    github_url: '',
    twitter_url: '',
    linkedin_url: '',
    instagram_url: '',
    discord_url: '',
  });
  const [currentUserUpvotes, setCurrentUserUpvotes] = useState<Set<string>>(new Set());
  const [currentUserBookmarks, setCurrentUserBookmarks] = useState<Set<string>>(new Set());
  
  const { user, loading } = useAuth();
  const { username } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const isOwnProfile = profile && user && profile.user_id === user.id;

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      loadProfile();
      loadUserInteractions();
    }
  }, [user, username]);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      let query = supabase.from('profiles').select('*');
      
      if (username) {
        query = query.eq('username', username);
      } else {
        query = query.eq('user_id', user?.id);
      }

      const { data: profileData, error: profileError } = await query.single();
      
      if (profileError) {
        if (profileError.code === 'PGRST116') {
          if (!username) {
            // No profile exists for current user, create one
            await createDefaultProfile();
            return;
          } else {
            // Profile not found for the requested username
            setProfile(null);
            setIsLoading(false);
            return;
          }
        }
        throw profileError;
      }

      setProfile(profileData);
      setEditForm({
        username: profileData.username || '',
        bio: profileData.bio || '',
        github_url: profileData.github_url || '',
        twitter_url: profileData.twitter_url || '',
        linkedin_url: profileData.linkedin_url || '',
        instagram_url: profileData.instagram_url || '',
        discord_url: profileData.discord_url || '',
      });

      // Load prompts for this user
      const { data: promptsData, error: promptsError } = await supabase
        .from('prompts_with_stats')
        .select('*')
        .eq('user_id', profileData.user_id)
        .order('created_at', { ascending: false });

      if (promptsError) throw promptsError;
      setUserPrompts(promptsData || []);

      // Load bookmarked prompts if viewing own profile
      if (profileData.user_id === user?.id) {
        const { data: bookmarksData, error: bookmarksError } = await supabase
          .from('bookmarks')
          .select(`
            prompt_id,
            prompts_with_stats (*)
          `)
          .eq('user_id', profileData.user_id)
          .order('created_at', { ascending: false });

        if (bookmarksError) throw bookmarksError;
        setBookmarkedPrompts(bookmarksData?.map(b => b.prompts_with_stats).filter(Boolean) || []);
      }

    } catch (error) {
      console.error('Error loading profile:', error);
      toast({
        description: 'Failed to load profile',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createDefaultProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          username: user.user_metadata?.username || user.email?.split('@')[0] || 'user',
        })
        .select()
        .single();

      if (error) throw error;
      setProfile(data);
      setEditForm({
        username: data.username || '',
        bio: data.bio || '',
        github_url: data.github_url || '',
        twitter_url: data.twitter_url || '',
        linkedin_url: data.linkedin_url || '',
        instagram_url: data.instagram_url || '',
        discord_url: data.discord_url || '',
      });
    } catch (error) {
      console.error('Error creating profile:', error);
    }
  };

  const loadUserInteractions = async () => {
    if (!user) return;

    try {
      const { data: upvotes } = await supabase
        .from('up_prompts')
        .select('prompt_id')
        .eq('user_id', user.id);

      const { data: bookmarks } = await supabase
        .from('bookmarks')
        .select('prompt_id')
        .eq('user_id', user.id);

      setCurrentUserUpvotes(new Set(upvotes?.map(u => u.prompt_id) || []));
      setCurrentUserBookmarks(new Set(bookmarks?.map(b => b.prompt_id) || []));
    } catch (error) {
      console.error('Error loading user interactions:', error);
    }
  };

  const handleUpvote = async (promptId: string) => {
    if (!user) return;

    const isUpvoted = currentUserUpvotes.has(promptId);
    
    try {
      if (isUpvoted) {
        await supabase
          .from('up_prompts')
          .delete()
          .eq('user_id', user.id)
          .eq('prompt_id', promptId);
        
        setCurrentUserUpvotes(prev => {
          const newSet = new Set(prev);
          newSet.delete(promptId);
          return newSet;
        });
      } else {
        await supabase
          .from('up_prompts')
          .insert({ user_id: user.id, prompt_id: promptId });
        
        setCurrentUserUpvotes(prev => new Set([...prev, promptId]));
      }

      // Update prompt count locally in both arrays
      const updatePrompts = (prompts: Prompt[]) => 
        prompts.map(prompt => 
          prompt.id === promptId 
            ? { ...prompt, upvotes: prompt.upvotes + (isUpvoted ? -1 : 1) }
            : prompt
        );
      
      setUserPrompts(updatePrompts);
      setBookmarkedPrompts(updatePrompts);
    } catch (error) {
      console.error('Error updating upvote:', error);
    }
  };

  const handleBookmark = async (promptId: string) => {
    if (!user) return;

    const isBookmarked = currentUserBookmarks.has(promptId);
    
    try {
      if (isBookmarked) {
        await supabase
          .from('bookmarks')
          .delete()
          .eq('user_id', user.id)
          .eq('prompt_id', promptId);
        
        setCurrentUserBookmarks(prev => {
          const newSet = new Set(prev);
          newSet.delete(promptId);
          return newSet;
        });

        // Remove from bookmarked prompts list
        setBookmarkedPrompts(prev => prev.filter(p => p.id !== promptId));
      } else {
        await supabase
          .from('bookmarks')
          .insert({ user_id: user.id, prompt_id: promptId });
        
        setCurrentUserBookmarks(prev => new Set([...prev, promptId]));
      }
    } catch (error) {
      console.error('Error updating bookmark:', error);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: editForm.username,
          bio: editForm.bio,
          github_url: editForm.github_url || null,
          twitter_url: editForm.twitter_url || null,
          linkedin_url: editForm.linkedin_url || null,
          instagram_url: editForm.instagram_url || null,
          discord_url: editForm.discord_url || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, ...editForm } : null);
      setIsEditing(false);
      toast({
        description: 'Profile updated successfully',
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        description: 'Failed to update profile',
        variant: 'destructive',
      });
    }
  };

  const getSocialIcon = (platform: string) => {
    switch (platform) {
      case 'github': return <Github className="h-4 w-4" />;
      case 'twitter': return <Twitter className="h-4 w-4" />;
      case 'linkedin': return <Linkedin className="h-4 w-4" />;
      case 'instagram': return <Instagram className="h-4 w-4" />;
      case 'discord': return <Discord className="h-4 w-4" />;
      default: return null;
    }
  };

  const getSocialUrl = (platform: string, url: string) => {
    if (!url) return null;
    
    // Add protocol if missing
    if (!url.startsWith('http')) {
      return `https://${url}`;
    }
    return url;
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation 
          searchQuery=""
          onSearchChange={() => {}}
          selectedTags={[]}
          onTagsChange={() => {}}
          onPromptCreated={() => loadProfile()}
        />
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Profile not found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation 
        searchQuery=""
        onSearchChange={() => {}}
        selectedTags={[]}
        onTagsChange={() => {}}
        onPromptCreated={() => loadProfile()}
      />
      
      <main className="container mx-auto px-4 py-4 sm:py-6 lg:py-8 max-w-4xl">
        {/* Profile Header */}
        <Card className="mb-6 sm:mb-8">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
                <Avatar className="h-16 w-16 sm:h-20 sm:w-20">
                  <AvatarImage src={profile.avatar_url || user?.user_metadata?.avatar_url} alt={profile.username} />
                  <AvatarFallback className="bg-primary text-primary-foreground font-heading text-lg sm:text-xl">
                    {profile.username[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1 w-full sm:w-auto">
                  {isEditing ? (
                    <Input
                      value={editForm.username}
                      onChange={(e) => setEditForm(prev => ({ ...prev, username: e.target.value }))}
                      className="font-heading text-lg sm:text-xl h-8 w-full sm:w-auto"
                      placeholder="Username"
                    />
                  ) : (
                    <h1 className="font-heading text-xl sm:text-2xl text-foreground">@{profile.username}</h1>
                  )}
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 text-xs sm:text-sm text-muted-foreground">
                    <span className="flex items-center">
                      <ArrowUp className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                      {userPrompts.reduce((sum, p) => sum + p.upvotes, 0)} upvotes
                    </span>
                    <span>{userPrompts.length} prompts</span>
                    <span className="hidden sm:inline">Joined {new Date(profile.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              {isOwnProfile && (
                <Button
                  variant={isEditing ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    if (isEditing) {
                      handleSaveProfile();
                    } else {
                      setIsEditing(true);
                    }
                  }}
                  className="w-full sm:w-auto"
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  {isEditing ? 'Save' : 'Edit Profile'}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-6">
            {/* Bio */}
            <div>
              {isEditing ? (
                <Textarea
                  value={editForm.bio}
                  onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Tell us about yourself..."
                  className="min-h-[80px] w-full"
                />
              ) : (
                <p className="text-foreground text-sm sm:text-base">
                  {profile.bio || 'No bio yet.'}
                </p>
              )}
            </div>

            {/* Social Links */}
            <div>
              <h3 className="font-subheading text-sm text-muted-foreground mb-3">Social Links</h3>
              {isEditing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { key: 'github_url', label: 'GitHub', placeholder: 'github.com/username' },
                    { key: 'twitter_url', label: 'Twitter', placeholder: 'twitter.com/username' },
                    { key: 'linkedin_url', label: 'LinkedIn', placeholder: 'linkedin.com/in/username' },
                    { key: 'instagram_url', label: 'Instagram', placeholder: 'instagram.com/username' },
                    { key: 'discord_url', label: 'Discord', placeholder: 'discord.com/users/username' },
                  ].map(({ key, label, placeholder }) => (
                    <div key={key} className="space-y-1">
                      <label className="text-xs font-subheading text-muted-foreground">{label}</label>
                      <Input
                        value={editForm[key as keyof typeof editForm]}
                        onChange={(e) => setEditForm(prev => ({ ...prev, [key]: e.target.value }))}
                        placeholder={placeholder}
                        className="h-8 w-full"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'github_url', platform: 'github', label: 'GitHub' },
                    { key: 'twitter_url', platform: 'twitter', label: 'Twitter' },
                    { key: 'linkedin_url', platform: 'linkedin', label: 'LinkedIn' },
                    { key: 'instagram_url', platform: 'instagram', label: 'Instagram' },
                    { key: 'discord_url', platform: 'discord', label: 'Discord' },
                  ].map(({ key, platform, label }) => {
                    const url = profile[key as keyof Profile] as string;
                    if (!url) return null;
                    
                    return (
                      <a
                        key={key}
                        href={getSocialUrl(platform, url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-2 px-3 py-2 rounded-full bg-secondary hover:bg-accent transition-fast text-xs sm:text-sm"
                      >
                        {getSocialIcon(platform)}
                        <span className="font-body">{label}</span>
                      </a>
                    );
                  }).filter(Boolean)}
                  {![profile.github_url, profile.twitter_url, profile.linkedin_url, profile.instagram_url, profile.discord_url].some(Boolean) && (
                    <p className="text-sm text-muted-foreground">No social links added yet.</p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabs for Posts and Bookmarks */}
        <Tabs defaultValue="posts" className="w-full">
          <TabsList className={`grid w-full ${isOwnProfile ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <TabsTrigger value="posts" className="flex items-center justify-center space-x-1 sm:space-x-2 text-xs sm:text-sm">
              <span className="hidden sm:inline">Posts</span>
              <span className="sm:hidden">Posts</span>
              <span>({userPrompts.length})</span>
            </TabsTrigger>
            {isOwnProfile && (
              <TabsTrigger value="bookmarks" className="flex items-center justify-center space-x-1 sm:space-x-2 text-xs sm:text-sm">
                <Bookmark className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Bookmarks</span>
                <span className="sm:hidden">Saved</span>
                <span>({bookmarkedPrompts.length})</span>
              </TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="posts" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
            {userPrompts.length > 0 ? (
              userPrompts.map((prompt) => (
                <PromptCard
                  key={prompt.id}
                  id={prompt.id}
                  title={prompt.title}
                  content={prompt.content}
                  author={{
                    username: prompt.username,
                    avatar: prompt.avatar_url
                  }}
                  tags={prompt.tags}
                  upvotes={prompt.upvotes}
                  bookmarks={prompt.bookmarks}
                  isUpvoted={currentUserUpvotes.has(prompt.id)}
                  isSaved={currentUserBookmarks.has(prompt.id)}
                  createdAt={prompt.created_at}
                  onUpvote={() => handleUpvote(prompt.id)}
                  onBookmark={() => handleBookmark(prompt.id)}
                />
              ))
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  {isOwnProfile ? "You haven't created any prompts yet." : "This user hasn't created any prompts yet."}
                </p>
              </div>
            )}
          </TabsContent>

          {isOwnProfile && (
            <TabsContent value="bookmarks" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
              {bookmarkedPrompts.length > 0 ? (
                bookmarkedPrompts.map((prompt) => (
                  <PromptCard
                    key={prompt.id}
                    id={prompt.id}
                    title={prompt.title}
                    content={prompt.content}
                    author={{
                      username: prompt.username,
                      avatar: prompt.avatar_url
                    }}
                    tags={prompt.tags}
                    upvotes={prompt.upvotes}
                    bookmarks={prompt.bookmarks}
                    isUpvoted={currentUserUpvotes.has(prompt.id)}
                    isSaved={currentUserBookmarks.has(prompt.id)}
                    createdAt={prompt.created_at}
                    onUpvote={() => handleUpvote(prompt.id)}
                    onBookmark={() => handleBookmark(prompt.id)}
                  />
                ))
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No bookmarked prompts yet.</p>
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
}