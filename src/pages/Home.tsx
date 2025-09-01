import { QuickCreateBox } from '@/components/prompts/QuickCreateBox';
import { Navigation } from '@/components/shared/Navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { metaTagsManager } from '@/utils/metaUtils';
import {
  BookmarkSimple,
  Copy,
  DotsThree,
  Download,
  Heart,
  ShareNetwork
} from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

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

interface TrendingPrompt {
  id: string;
  title: string;
  upvotes: number;
  tags: string[];
}

interface LeaderboardUser {
  username: string;
  avatar_url?: string;
  total_upvotes: number;
  prompt_count: number;
}

export function Home() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [trendingPrompts, setTrendingPrompts] = useState<TrendingPrompt[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [isLoading, setIsLoading] = useState(false);  
  const [createForm, setCreateForm] = useState({
    title: '',
    content: '',
    tags: [] as string[],
    newTag: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userInteractions, setUserInteractions] = useState<{
    upvotes: Set<string>;
    bookmarks: Set<string>;
  }>({ upvotes: new Set(), bookmarks: new Set() });
  const [stats, setStats] = useState({
    totalPrompts: 0,
    totalUsers: 0,
    totalUpvotes: 0,
    activeUsers: 0,
    todayPosts: 0
  });

  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    // Reset meta tags to default when on home page
    metaTagsManager.resetToDefault();
    
    loadPrompts();
    loadTrendingPrompts();
    loadLeaderboard();
    loadAvailableTags();
    loadLiveStats();
    if (user) {
      loadUserInteractions();
    }
    
    const interval = setInterval(() => {
      loadPrompts();
      loadTrendingPrompts();
      loadLeaderboard();
      loadLiveStats();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [searchParams, filterTags, user]);

  const loadPrompts = async () => {
    try {
      let query = supabase
        .from('prompts_with_stats')
        .select('*')
        .order('created_at', { ascending: false });

      // Handle search parameter
      const searchQuery = searchParams.get('search');
      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`);
      }

      if (filterTags.length > 0) {
        query = query.overlaps('tags', filterTags);
      }

      const { data, error } = await query.limit(20);
      if (error) throw error;
      setPrompts(data || []);
    } catch (error) {
      console.error('Error loading prompts:', error);
    }
  };

  const loadTrendingPrompts = async () => {
    try {
      const { data, error } = await supabase
        .from('prompts_with_stats')
        .select('id, title, upvotes, tags')
        .order('upvotes', { ascending: false })
        .limit(5);
      if (error) throw error;
      setTrendingPrompts(data || []);
    } catch (error) {
      console.error('Error loading trending prompts:', error);
    }
  };

  const loadLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from('prompts_with_stats')
        .select('user_id, username, avatar_url, upvotes')
        .order('upvotes', { ascending: false })
        .limit(20);
      if (error) throw error;
      
      const userStats = new Map();
      data?.forEach(prompt => {
        const userId = prompt.user_id;
        if (!userStats.has(userId)) {
          userStats.set(userId, {
            username: prompt.username || 'Anonymous',
            avatar_url: prompt.avatar_url,
            total_upvotes: 0,
            prompt_count: 0
          });
        }
        const stats = userStats.get(userId);
        stats.total_upvotes += prompt.upvotes || 0;
        stats.prompt_count += 1;
      });
      
      const leaderboardData = Array.from(userStats.values())
        .sort((a, b) => b.total_upvotes - a.total_upvotes)
        .slice(0, 10);
      
      setLeaderboard(leaderboardData);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    }
  };

  const loadAvailableTags = async () => {
    try {
      const { data, error } = await supabase
        .from('prompts_with_stats')
        .select('tags');
      if (error) throw error;
      
      const allTags = data?.flatMap(p => p.tags || []) || [];
      const uniqueTags = [...new Set(allTags)].sort();
      setAvailableTags(uniqueTags);
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  };

  const loadLiveStats = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      const [
        { count: totalPrompts },
        { count: totalUsers },
        { data: upvotesData },
        { data: todayPostsData }
      ] = await Promise.all([
        supabase.from('prompts').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('up_prompts').select('*'),
        supabase.from('prompts').select('*').gte('created_at', todayISO)
      ]);

      const totalUpvotes = upvotesData?.length || 0;
      const todayPosts = todayPostsData?.length || 0;
      
      // Calculate active users (users who have posted in the last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoISO = weekAgo.toISOString();
      
      const { data: recentUsers } = await supabase
        .from('prompts')
        .select('user_id')
        .gte('created_at', weekAgoISO);
      
      const activeUsers = new Set(recentUsers?.map(p => p.user_id) || []).size;

      setStats({
        totalPrompts: totalPrompts || 0,
        totalUsers: totalUsers || 0,
        totalUpvotes,
        activeUsers,
        todayPosts
      });
    } catch (error) {
      console.error('Error loading live stats:', error);
    }
  };

  const loadUserInteractions = async () => {
    if (!user) return;
    
    try {
      const [upvotesRes, bookmarksRes] = await Promise.all([
        supabase.from('up_prompts').select('prompt_id').eq('user_id', user.id),
        supabase.from('bookmarks').select('prompt_id').eq('user_id', user.id)
      ]);
      
      setUserInteractions({
        upvotes: new Set(upvotesRes.data?.map(u => u.prompt_id) || []),
        bookmarks: new Set(bookmarksRes.data?.map(b => b.prompt_id) || [])
      });
    } catch (error) {
      console.error('Error loading user interactions:', error);
    }
  };

  const handleUpvote = async (promptId: string) => {
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to upvote prompts",
        variant: "destructive",
      });
      return;
    }

    const isUpvoted = userInteractions.upvotes.has(promptId);
    
    try {
      if (isUpvoted) {
        await supabase
          .from('up_prompts')
          .delete()
          .eq('user_id', user.id)
          .eq('prompt_id', promptId);
      } else {
        await supabase
          .from('up_prompts')
          .insert({ user_id: user.id, prompt_id: promptId });
      }

      setUserInteractions(prev => ({
        ...prev,
        upvotes: isUpvoted 
          ? new Set([...prev.upvotes].filter(id => id !== promptId))
          : new Set([...prev.upvotes, promptId])
      }));

      setPrompts(prev => prev.map(prompt => 
        prompt.id === promptId 
          ? { ...prompt, upvotes: prompt.upvotes + (isUpvoted ? -1 : 1) }
          : prompt
      ));

      toast({
        title: isUpvoted ? "Upvote removed" : "Upvoted!",
        description: isUpvoted ? "You removed your upvote" : "Thanks for the upvote!",
      });
    } catch (error) {
      console.error('Error updating upvote:', error);
      toast({
        title: "Error",
        description: "Failed to update upvote",
        variant: "destructive",
      });
    }
  };

  const handleBookmarkSimple = async (promptId: string) => {
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to bookmark prompts",
        variant: "destructive",
      });
      return;
    }

    const isBookmarkSimpleed = userInteractions.bookmarks.has(promptId);
    
    try {
      if (isBookmarkSimpleed) {
        await supabase
          .from('bookmarks')
          .delete()
          .eq('user_id', user.id)
          .eq('prompt_id', promptId);
      } else {
        await supabase
          .from('bookmarks')
          .insert({ user_id: user.id, prompt_id: promptId });
      }

      setUserInteractions(prev => ({
        ...prev,
        bookmarks: isBookmarkSimpleed 
          ? new Set([...prev.bookmarks].filter(id => id !== promptId))
          : new Set([...prev.bookmarks, promptId])
      }));

      setPrompts(prev => prev.map(prompt => 
        prompt.id === promptId 
          ? { ...prompt, bookmarks: prompt.bookmarks + (isBookmarkSimpleed ? -1 : 1) }
          : prompt
      ));

      toast({
        title: isBookmarkSimpleed ? "BookmarkSimple removed" : "BookmarkSimpleed!",
        description: isBookmarkSimpleed ? "Removed from bookmarks" : "Added to bookmarks!",
      });
    } catch (error) {
      console.error('Error updating bookmark:', error);
      toast({
        title: "Error",
        description: "Failed to update bookmark",
        variant: "destructive",
      });
    }
  };

  const handleShare = async (prompt: Prompt) => {
    const shareUrl = `${window.location.origin}/prompt/${prompt.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: prompt.title,
          text: prompt.content.substring(0, 100) + '...',
          url: shareUrl,
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          await copyToClipboard(shareUrl);
        }
      }
    } else {
      await copyToClipboard(shareUrl);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback to older method
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      
      toast({
        title: "Copied!",
        description: "Link copied to clipboard",
      });
    } catch (error) {
      console.error('Failed to copy:', error);
      toast({
        title: "Error",
        description: "Failed to copy to clipboard. Please copy the URL manually.",
        variant: "destructive",
      });
    }
  };

  const copyPromptContent = async (content: string) => {
    await copyToClipboard(content);
  };

  const downloadPrompt = (prompt: Prompt) => {
    const content = `${prompt.title}\n\n${prompt.content}\n\nTags: ${prompt.tags.join(', ')}\n\nCreated by: @${prompt.username}\nDate: ${new Date(prompt.created_at).toLocaleDateString()}`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${prompt.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Downloaded!",
      description: "Prompt saved as text file",
    });
  };

  const handleCreatePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to create prompts",
        variant: "destructive",
      });
      return;
    }

    if (!createForm.title.trim() || !createForm.content.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('prompts')
        .insert([{
          title: createForm.title.trim(),
          content: createForm.content.trim(),
          tags: createForm.tags,
          user_id: user.id,
        }]);

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Your prompt has been created successfully",
      });

      setIsCreateModalOpen(false);
      setCreateForm({ title: '', content: '', tags: [], newTag: '' });
      loadPrompts();
    } catch (error) {
      console.error('Error creating prompt:', error);
      toast({
        title: "Error",
        description: "Failed to create prompt. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addTag = () => {
    if (createForm.newTag.trim() && !createForm.tags.includes(createForm.newTag.trim()) && createForm.tags.length < 5) {
      setCreateForm(prev => ({
        ...prev,
        tags: [...prev.tags, prev.newTag.trim()],
        newTag: ''
      }));
    }
  };

  const removeTag = (tagToRemove: string) => {
    setCreateForm(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const toggleTagFilter = (tag: string) => {
    setFilterTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setFilterTags([]);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 py-2 sm:py-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar - Hidden on mobile */}
          <div className="hidden lg:block lg:col-span-3 space-y-6">
            {/* Community Stats */}
            <div className="p-6 bg-primary/5 rounded-xl border border-primary/10">
              <h3 className="font-semibold text-foreground mb-4">Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prompts</span>
                  <span className="font-medium">{stats.totalPrompts.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Users</span>
                  <span className="font-medium">{stats.totalUsers.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Upprompts</span>
                  <span className="font-medium">{stats.totalUpvotes.toLocaleString()}</span>
                </div>
              </div>
            </div>



          </div>

          {/* Main Feed */}
          <div className="lg:col-span-6 space-y-4 sm:space-y-6">
            {/* Quick Create Prompt */}
            <QuickCreateBox 
              onPromptCreated={loadPrompts} 
              availableTags={availableTags}
              filterTags={filterTags}
              onToggleTagFilter={toggleTagFilter}
              onClearFilters={clearFilters}
            />
            

            {/* Prompts Feed */}
            <div className={`
  bg-card border-t border-x border-border rounded-t-xl
  ${!hasMorePosts ? 'border-b rounded-b-xl' : ''}
`}>

  {prompts.map((prompt, index) => (
    <article 
      key={prompt.id} 
      // Individual posts no longer have their own border or rounding.
      // We add a top border to separate the posts from each other.
      className={`p-4 sm:p-6 cursor-pointer hover:bg-muted/50 transition-colors ${index !== 0 ? 'border-t border-border' : ''}`}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest('button') || target.closest('a') || target.closest('[role="button"]') || target.closest('.badge')) {
          return;
        }
        navigate(`/prompt/${prompt.id}`);
      }}
    >
                  {/* Post Header */}
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <Avatar 
                        className="h-8 w-8 sm:h-12 sm:w-12 cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/profile/${prompt.username}`);
                        }}
                      >
                        <AvatarImage src={prompt.avatar_url || (user && user.id === prompt.user_id ? user.user_metadata?.avatar_url : null)} />
                        <AvatarFallback className="bg-primary/10 text-primary text-sm sm:text-lg font-medium">
                          {prompt.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 
                          className="font-medium sm:font-semibold text-sm sm:text-base text-foreground hover:text-primary cursor-pointer transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/profile/${prompt.username}`);
                          }}
                        >
                          @{prompt.username}
                        </h3>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {new Date(prompt.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <DotsThree className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => copyPromptContent(prompt.content)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Content
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => downloadPrompt(prompt)}>
                          <Download className="h-4 w-4 mr-2" />
                          Download as TXT
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleShare(prompt)}>
                          <ShareNetwork className="h-4 w-4 mr-2" />
                          Share
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Post Content */}
                  <div className="mb-3 sm:mb-4">
                    <h4 className="text-base sm:text-lg font-medium sm:font-semibold text-foreground mb-1 sm:mb-2">{prompt.title}</h4>
                    <p className="text-sm sm:text-base text-foreground leading-relaxed">
                      {prompt.content.length > 200 
                        ? `${prompt.content.substring(0, 200)}...` 
                        : prompt.content
                      }
                    </p>
                    {prompt.content.length > 200 && (
                      <button 
                        className="text-primary text-sm font-medium mt-1 hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/prompt/${prompt.id}`);
                        }}
                      >
                        Read more
                      </button>
                    )}
                  </div>

                  {/* Tags */}
                  {prompt.tags && prompt.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 sm:gap-2 mb-3 sm:mb-4">
                      {prompt.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleTagFilter(tag);
                          }}
                        >
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Post Actions */}
                  <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-border">
                    <div className="flex items-center space-x-3 sm:space-x-6">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpvote(prompt.id);
                        }}
                        className={`flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-colors ${
                          userInteractions.upvotes.has(prompt.id)
                            ? 'text-red-500 bg-red-50 dark:bg-red-950/20'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        }`}
                      >
                        <Heart className={`h-4 sm:h-5 w-4 sm:w-5 ${userInteractions.upvotes.has(prompt.id) ? 'fill-current' : ''}`} />
                        <span className="text-xs sm:text-sm font-medium">{prompt.upvotes}</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBookmarkSimple(prompt.id);
                        }}
                        className={`flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-colors ${
                          userInteractions.bookmarks.has(prompt.id)
                            ? 'text-yellow-500 bg-yellow-50 dark:bg-yellow-950/20'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        }`}
                      >
                        <BookmarkSimple className={`h-4 sm:h-5 w-4 sm:w-5 ${userInteractions.bookmarks.has(prompt.id) ? 'fill-current' : ''}`} />
                        <span className="text-xs sm:text-sm font-medium">{prompt.bookmarks}</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShare(prompt);
                        }}
                        className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <ShareNetwork className="h-4 sm:h-5 w-4 sm:w-5" />
                        <span className="text-xs sm:text-sm font-medium">Share</span>
                      </button>
                      
                    </div>
                  </div>
                </article>
              ))}
              {/* This spinner will only show up when isLoading is true */}
  {isLoading && (
    <div className="flex items-center justify-center p-6 border-t border-border">
      <div className="w-6 h-6 border-4 border-muted border-t-primary rounded-full animate-spin"></div>
    </div>
  )}
            </div>
          </div>

          {/* Right Sidebar - Hidden on mobile */}
          <div className="hidden lg:block lg:col-span-3 space-y-6">

            {/* Global Leaderboard */}
            <div className="p-6 bg-primary/5 rounded-xl border border-primary/10">
              <h3 className="font-semibold text-foreground mb-4">Leaderboard</h3>
              <div className="space-y-3">
                {leaderboard.slice(0, 5).map((user, index) => (
                  <div key={user.username} className="flex items-center space-x-3 py-1">
                    <div className="w-2 h-6  flex items-center justify-center text-xs font-bold text-primary">
                      {index + 1}
                    </div>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {user.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">@{user.username}</p>
                      <p className="text-xs text-muted-foreground">{user.total_upvotes} upprompts</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>


      {/* Create Prompt Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Prompt</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleCreatePrompt} className="space-y-4">
            <div>
              <label htmlFor="title" className="text-sm font-medium text-foreground">
                Title *
              </label>
              <Input
                id="title"
                value={createForm.title}
                onChange={(e) => setCreateForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter a descriptive title"
                className="mt-1 bg-background/50"
                maxLength={100}
              />
              <div className="text-xs text-muted-foreground text-right mt-1">
                {createForm.title.length}/100
              </div>
            </div>

            <div>
              <label htmlFor="content" className="text-sm font-medium text-foreground">
                Prompt Content *
              </label>
              <Textarea
                id="content"
                value={createForm.content}
                onChange={(e) => setCreateForm(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Write your AI prompt here..."
                className="mt-1 min-h-[150px]"
                maxLength={2000}
              />
              <div className="text-xs text-muted-foreground text-right mt-1">
                {createForm.content.length}/2000
              </div>
            </div>

            <div>
              <label htmlFor="newTag" className="text-sm font-medium text-foreground">
                Tags (optional)
              </label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="newTag"
                  value={createForm.newTag}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, newTag: e.target.value }))}
                  placeholder="Add tags"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={addTag}
                  disabled={!createForm.newTag.trim() || createForm.tags.length >= 5}
                  variant="outline"
                  size="sm"
                >
                  Add
                </Button>
              </div>
              {createForm.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {createForm.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="px-2 py-1"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-2 hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !createForm.title.trim() || !createForm.content.trim()}
                className="flex-1"
              >
                {isSubmitting ? 'Creating...' : 'Create Prompt'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}