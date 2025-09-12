import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  BookmarkSimple,
  Heart,
  MagnifyingGlass,
  X
} from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface Stats {
  totalPrompts: number;
  totalUsers: number;
  totalUpvotes: number;
  activeUsers: number;
  todayPosts: number;
}

interface LeaderboardUser {
  username: string;
  avatar_url?: string;
  total_upvotes: number;
  prompt_count: number;
}

interface PromptStats {
  upvotes: number;
  bookmarks: number;
  created_at: string;
  content: string;
  tags?: string[];
  isUpvoted?: boolean;
  isSaved?: boolean;
}

interface MobileSidebarProps {
  isOpen: boolean;
  isClosing: boolean;
  onClose: () => void;
  promptStats?: PromptStats; // Optional prompt stats for detail pages
  onCopyPrompt?: () => void; // Function to copy prompt content
}

export function MobileSidebar({ isOpen, isClosing, onClose, promptStats, onCopyPrompt }: MobileSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState<Stats>({
    totalPrompts: 0,
    totalUsers: 0,
    totalUpvotes: 0,
    activeUsers: 0,
    todayPosts: 0
  });
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Update search query when URL changes
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const searchParam = urlParams.get('search');
    if (searchParam) {
      setSearchQuery(searchParam);
    } else {
      setSearchQuery('');
    }
  }, [location.search]);

  // Load stats and leaderboard when sidebar opens
  useEffect(() => {
    if (isOpen) {
      loadLiveStats();
      loadLeaderboard();
    }
  }, [isOpen]);

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/home?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/home');
    }
    onClose();
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setSearchQuery('');
      navigate('/home');
      onClose();
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    navigate('/home');
  };

  const isHomePage = location.pathname === '/home';
  const isAnalyticsPage = location.pathname === '/analytics';
  const isProfilePage = location.pathname.startsWith('/profile');
  const isSettingsPage = location.pathname === '/settings';

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      {(isOpen || isClosing) && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div 
            className={`fixed inset-0 bg-black/50 backdrop-blur-sm ${
              isClosing ? 'animate-fade-out' : 'animate-fade-in'
            }`}
            onClick={onClose}
          />
          
          {/* Sidebar */}
          <div className={`fixed right-0 top-0 h-full w-72 max-w-[85vw] bg-background border-l border-border shadow-xl overflow-y-auto ${
            isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'
          }`}>
            <div className="p-4 space-y-4 animate-scale-in">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">Menu</h2>
                <div className="flex items-center gap-2">
                  <ThemeToggle />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Search Bar */}
              <div>
                <form onSubmit={handleSearch} className="relative">
                  <Input
                    placeholder="Search prompts..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onKeyDown={handleKeyDown}
                    className="pl-8 pr-8 h-9 text-sm"
                  />
                  <MagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  {searchQuery && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleClearSearch}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </form>
              </div>

              {/* Navigation Links */}
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  className={`w-full justify-start h-9 text-sm ${isHomePage ? 'text-foreground bg-muted/50' : 'text-muted-foreground'}`}
                  onClick={() => {
                    navigate('/home');
                    onClose();
                  }}
                >
                  Home
                </Button>
                <Button
                  variant="ghost"
                  className={`w-full justify-start h-9 text-sm ${isAnalyticsPage ? 'text-foreground bg-muted/50' : 'text-muted-foreground'}`}
                  onClick={() => {
                    navigate('/analytics');
                    onClose();
                  }}
                >
                  Analytics
                </Button>
                <Button
                  variant="ghost"
                  className={`w-full justify-start h-9 text-sm ${isProfilePage ? 'text-foreground bg-muted/50' : 'text-muted-foreground'}`}
                  onClick={() => {
                    navigate(`/profile/${user?.user_metadata?.username || user?.id}`);
                    onClose();
                  }}
                >
                  Profile
                </Button>
                <Button
                  variant="ghost"
                  className={`w-full justify-start h-9 text-sm ${isSettingsPage ? 'text-foreground bg-muted/50' : 'text-muted-foreground'}`}
                  onClick={() => {
                    navigate('/settings');
                    onClose();
                  }}
                >
                  Settings
                </Button>
              </div>

              {/* Stats Card */}
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
                <h3 className="font-medium text-sm text-foreground mb-3">Stats</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-xs">Prompts</span>
                    <span className="font-medium text-xs">{stats.totalPrompts.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-xs">Users</span>
                    <span className="font-medium text-xs">{stats.totalUsers.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-xs">Upprompts</span>
                    <span className="font-medium text-xs">{stats.totalUpvotes.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Leaderboard */}
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
                <h3 className="font-medium text-sm text-foreground mb-3">Leaderboard</h3>
                <div className="space-y-2">
                  {leaderboard.slice(0, 5).map((user, index) => (
                    <div key={user.username} className="flex items-center space-x-2 py-1">
                      <div className="w-4 h-4 flex items-center justify-center text-xs font-bold text-primary">
                        {index + 1}
                      </div>
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={user.avatar_url} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {user.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-xs truncate">@{user.username}</p>
                        <p className="text-xs text-muted-foreground">{user.total_upvotes} upprompts</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Prompt Statistics - Only show on prompt detail pages */}
              {promptStats && (
                <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
                  <h3 className="font-medium text-sm text-foreground mb-3">Prompt Statistics</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-xs">Upvotes</span>
                      <div className="flex items-center gap-1.5">
                        <Heart className={`h-3 w-3 ${promptStats.isUpvoted ? 'fill-current text-red-500' : 'text-muted-foreground'}`} />
                        <span className="font-medium text-xs">{promptStats.upvotes}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-xs">Bookmarks</span>
                      <div className="flex items-center gap-1.5">
                        <BookmarkSimple className={`h-3 w-3 ${promptStats.isSaved ? 'fill-current text-yellow-500' : 'text-muted-foreground'}`} />
                        <span className="font-medium text-xs">{promptStats.bookmarks}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-xs">Created</span>
                      <span className="font-medium text-xs">
                        {new Date(promptStats.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-xs">Characters</span>
                      <span className="font-medium text-xs">{promptStats.content.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-xs">Words</span>
                      <span className="font-medium text-xs">
                        {promptStats.content.split(/\s+/).filter(word => word.length > 0).length}
                      </span>
                    </div>
                    {promptStats.tags && promptStats.tags.length > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-xs">Tags</span>
                        <span className="font-medium text-xs">{promptStats.tags.length}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* AI Models Quick Actions */}
                  <div className="mt-3 pt-3 border-t border-primary/20">
                    <div className="grid grid-cols-5 gap-2 justify-items-center">
                      <div
                        onClick={async () => {
                          if (onCopyPrompt) await onCopyPrompt();
                          window.open('https://chatgpt.com/', '_blank');
                        }}
                        className="w-6 h-6 cursor-pointer hover:scale-110 transition-transform duration-200"
                        title="Copy prompt and open ChatGPT"
                      >
                        <img
                          src="/chatgpt.svg"
                          alt="ChatGPT"
                          className="w-full h-full object-contain rounded-lg filter dark:invert"
                        />
                      </div>
                      <div
                        onClick={async () => {
                          if (onCopyPrompt) await onCopyPrompt();
                          window.open('https://claude.ai/chat', '_blank');
                        }}
                        className="w-6 h-6 cursor-pointer hover:scale-110 transition-transform duration-200"
                        title="Copy prompt and open Claude"
                      >
                        <img
                          src="/claude.png"
                          alt="Claude"
                          className="w-full h-full object-contain rounded-lg"
                        />
                      </div>
                      <div
                        onClick={async () => {
                          if (onCopyPrompt) await onCopyPrompt();
                          window.open('https://gemini.google.com/app', '_blank');
                        }}
                        className="w-6 h-6 cursor-pointer hover:scale-110 transition-transform duration-200"
                        title="Copy prompt and open Gemini"
                      >
                        <img
                          src="/gemini.png"
                          alt="Gemini"
                          className="w-full h-full object-contain rounded-lg"
                        />
                      </div>
                      <div
                        onClick={async () => {
                          if (onCopyPrompt) await onCopyPrompt();
                          window.open('https://x.ai/grok', '_blank');
                        }}
                        className="w-6 h-6 cursor-pointer hover:scale-110 transition-transform duration-200"
                        title="Copy prompt and open Grok"
                      >
                        <img
                          src="/grok.svg"
                          alt="Grok"
                          className="w-full h-full object-contain rounded-lg filter dark:invert"
                        />
                      </div>
                      <div
                        onClick={async () => {
                          if (onCopyPrompt) await onCopyPrompt();
                          window.open('https://chat.deepseek.com/', '_blank');
                        }}
                        className="w-6 h-6 cursor-pointer hover:scale-110 transition-transform duration-200"
                        title="Copy prompt and open DeepSeek"
                      >
                        <img
                          src="/deepseek.svg"
                          alt="DeepSeek"
                          className="w-full h-full object-contain rounded-lg filter"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}