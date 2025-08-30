import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Target, 
  Heart, 
  Bookmark, 
  Eye, 
  TrendingUp, 
  BarChart3, 
  Zap, 
  Trophy, 
  Users, 
  Calendar, 
  Lightbulb, 
  Clock, 
  Globe, 
  Play, 
  Pause, 
  RefreshCw, 
  Sparkles,
  Plus,
  Activity,
  TrendingDown,
  Settings,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Navigation } from '@/components/shared/Navigation';

interface DashboardStats {
  totalPrompts: number;
  totalUpvotes: number;
  totalBookmarks: number;
  totalViews: number;
  userRanking: number;
  totalUsers: number;
  weeklyGrowth: {
    prompts: number;
    upvotes: number;
    bookmarks: number;
    views: number;
  };
  recentActivity: Array<{
    id: string;
    title: string;
    timestamp: string;
  }>;
}

interface LiveMetric {
  id: string;
  label: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  icon: any;
  color: string;
  previousValue: number;
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [liveMetrics, setLiveMetrics] = useState<LiveMetric[]>([]);
  const [previousMetrics, setPreviousMetrics] = useState<LiveMetric[]>([]);
  const [lastUpdateTime, setLastUpdateTime] = useState(new Date());
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      loadDashboardStats();
    }
  }, [user]);

  useEffect(() => {
    if (isLiveMode) {
      const interval = setInterval(() => {
        updateLiveMetrics();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isLiveMode]);

  useEffect(() => {
    // Auto-refresh dashboard stats every 30 seconds
    const interval = setInterval(() => {
      if (user) {
        loadDashboardStats();
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [user]);

  const loadDashboardStats = useCallback(async () => {
    try {
      // Fetch user's own prompts
      const { data: userPromptsData } = await supabase
        .from('prompts_with_stats')
        .select('*')
        .eq('user_id', user?.id);

      // Fetch all prompts for global stats
      const { data: allPromptsData } = await supabase
        .from('prompts_with_stats')
        .select('*');

      // Fetch total users count
      const { count: totalUsersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Fetch total upvotes count
      const { count: totalUpvotesCount } = await supabase
        .from('up_prompts')
        .select('*', { count: 'exact', head: true });

      // Fetch total bookmarks count
      const { count: totalBookmarksCount } = await supabase
        .from('bookmarks')
        .select('*', { count: 'exact', head: true });

      // Fetch total views (if you have a views table, otherwise calculate)
      const { count: totalViewsCount } = await supabase
        .from('prompts')
        .select('*', { count: 'exact', head: true });

      if (userPromptsData && allPromptsData) {
        const userPrompts = userPromptsData;
        const allPrompts = allPromptsData;

        const totalPrompts = userPrompts.length;
        const userTotalUpvotes = userPrompts.reduce((sum, p) => sum + (typeof p.upvotes === 'number' ? p.upvotes : 0), 0);
        const userTotalBookmarks = userPrompts.reduce((sum, p) => sum + (typeof p.bookmarks === 'number' ? p.bookmarks : 0), 0);
        
        // Calculate user ranking based on total upvotes
        const userRanking = calculateUserRanking(user?.id, allPrompts);

        // Calculate weekly growth
        const weeklyGrowth = await calculateWeeklyGrowth();

        // Get recent activity
        const recentActivity = await getRecentActivity();

        const realStats: DashboardStats = {
          totalPrompts,
          totalUpvotes: userTotalUpvotes,
          totalBookmarks: userTotalBookmarks,
          totalViews: totalViewsCount || 0,
          userRanking,
          totalUsers: totalUsersCount || 0,
          weeklyGrowth,
          recentActivity
        };

        setStats(realStats);
        initializeLiveMetrics(realStats);
      }
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const calculateUserRanking = (userId: string | undefined, allPrompts: any[]) => {
    if (!userId) return 0;
    
    const userStats = new Map();
    allPrompts.forEach(prompt => {
      const promptUserId = prompt.user_id;
      if (!userStats.has(promptUserId)) {
        userStats.set(promptUserId, { totalUpvotes: 0, totalBookmarks: 0 });
      }
      const stats = userStats.get(promptUserId);
      stats.totalUpvotes += prompt.upvotes || 0;
      stats.totalBookmarks += prompt.bookmarks || 0;
    });

    const sortedUsers = Array.from(userStats.entries())
      .map(([id, stats]) => ({ id, ...stats }))
      .sort((a, b) => (b.totalUpvotes + b.totalBookmarks) - (a.totalUpvotes + a.totalBookmarks));

    const userIndex = sortedUsers.findIndex(u => u.id === userId);
    return userIndex >= 0 ? userIndex + 1 : 0;
  };

  const calculateWeeklyGrowth = async () => {
    try {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoISO = weekAgo.toISOString();

      const [
        { count: weeklyPrompts },
        { count: weeklyUpvotes },
        { count: weeklyBookmarks }
      ] = await Promise.all([
        supabase.from('prompts').select('*', { count: 'exact', head: true }).gte('created_at', weekAgoISO),
        supabase.from('up_prompts').select('*', { count: 'exact', head: true }).gte('created_at', weekAgoISO),
        supabase.from('bookmarks').select('*', { count: 'exact', head: true }).gte('created_at', weekAgoISO)
      ]);

      return {
        prompts: weeklyPrompts || 0,
        upvotes: weeklyUpvotes || 0,
        bookmarks: weeklyBookmarks || 0,
        views: (weeklyPrompts || 0) * 3 + (weeklyUpvotes || 0) * 2
      };
    } catch (error) {
      console.error('Error calculating weekly growth:', error);
      return { prompts: 0, upvotes: 0, bookmarks: 0, views: 0 };
    }
  };

  const getRecentActivity = async () => {
    try {
      const { data: recentPrompts } = await supabase
        .from('prompts_with_stats')
        .select('id, title, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      return recentPrompts?.map(p => ({
        id: p.id,
        title: p.title,
        timestamp: p.created_at
      })) || [];
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      return [];
    }
  };

  const initializeLiveMetrics = (currentStats: DashboardStats) => {
    const metrics: LiveMetric[] = [
      {
        id: '1',
        label: 'Total Users',
        value: currentStats.totalUsers,
        change: 0,
        trend: 'stable',
        icon: Users,
        color: 'text-primary',
        previousValue: currentStats.totalUsers
      },
      {
        id: '2',
        label: 'Total Prompts',
        value: currentStats.totalPrompts,
        change: 0,
        trend: 'stable',
        icon: Plus,
        color: 'text-primary',
        previousValue: currentStats.totalPrompts
      },
      {
        id: '3',
        label: 'Total Upvotes',
        value: currentStats.totalUpvotes,
        change: 0,
        trend: 'stable',
        icon: Heart,
        color: 'text-primary',
        previousValue: currentStats.totalUpvotes
      }
    ];
    setLiveMetrics(metrics);
    setPreviousMetrics(metrics);
  };

  const updateLiveMetrics = useCallback(async () => {
    try {
      const activeUsersCount = await getActiveUsersCount();
      const realTimePromptsCount = await getRealTimePromptsCount();
      const realTimeInteractionsCount = await getRealTimeInteractionsCount();

      const updatedMetrics = liveMetrics.map(metric => {
        let newValue = metric.value;
        let change = 0;

        switch (metric.label) {
          case 'Active Users':
            newValue = activeUsersCount;
            change = newValue - metric.previousValue;
            break;
          case 'New Prompts':
            newValue = realTimePromptsCount;
            change = newValue - metric.previousValue;
            break;
          case 'Interactions':
            newValue = realTimeInteractionsCount;
            change = newValue - metric.previousValue;
            break;
        }

        return {
          ...metric,
          value: newValue,
          change: Math.abs(change),
          trend: (change > 0 ? 'up' : change < 0 ? 'down' : 'stable') as 'up' | 'down' | 'stable',
          previousValue: metric.value
        };
      });

      setPreviousMetrics(liveMetrics);
      setLiveMetrics(updatedMetrics);
      setLastUpdateTime(new Date());
    } catch (error) {
      console.error('Error updating live metrics:', error);
    }
  }, [liveMetrics]);

  const getActiveUsersCount = async () => {
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    return count || 0;
  };

  const getRealTimePromptsCount = async () => {
    const { count } = await supabase
      .from('prompts_with_stats')
      .select('*', { count: 'exact', head: true });
    return count || 0;
  };

  const getRealTimeInteractionsCount = async () => {
    const { count: upvotesCount } = await supabase
      .from('up_prompts')
      .select('*', { count: 'exact', head: true });
    
    const { count: bookmarksCount } = await supabase
      .from('bookmarks')
      .select('*', { count: 'exact', head: true });
    
    return (upvotesCount || 0) + (bookmarksCount || 0);
  };

  const handleRefresh = () => {
    loadDashboardStats();
  };

  const featureCards = [
    {
      title: 'Prompt Analytics',
      description: 'Track your prompt performance and engagement metrics',
      icon: BarChart3,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      route: '/analytics',
      features: ['Performance Metrics', 'User Rankings', 'Top Tags', 'Growth Insights']
    },
    {
      title: 'Create Prompt',
      description: 'Create and share new AI prompts with the community',
      icon: Plus,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      route: '/home',
      features: ['Easy Creation', 'Tag Management', 'Preview Mode', 'Community Sharing']
    },
    {
      title: 'Profile Management',
      description: 'Manage your profile and showcase your work',
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      route: '/profile',
      features: ['Custom Profile', 'Work Showcase', 'Statistics', 'Social Links']
    },
    {
      title: 'Settings & Preferences',
      description: 'Customize your experience and account settings',
      icon: Settings,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      route: '/settings',
      features: ['Account Settings', 'Theme Preferences', 'Notifications', 'Privacy Controls']
    }
  ];

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-primary" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-muted-foreground" />;
      default: return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return 'text-primary';
      case 'down': return 'text-primary';
      default: return 'text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="h-8 w-8 bg-primary rounded-full mx-auto mb-4"></div>
          <div className="h-4 bg-muted rounded w-32"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">Please sign in to view your dashboard</h2>
          <Button onClick={() => navigate('/auth')}>Sign In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="space-y-2 animate-slide-up">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary rounded-2xl">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="font-display text-4xl lg:text-5xl text-foreground">
                    Welcome back, {user?.user_metadata?.username || 'Creator'}
                  </h1>
                  <p className="text-xl text-muted-foreground mt-2">
                    Your AI prompt empire is growing stronger every day
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Last updated: {new Date().toLocaleTimeString()}
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Rank #{stats?.userRanking || 'N/A'} of {stats?.totalUsers || 'N/A'} users
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant={isLiveMode ? "default" : "outline"}
                onClick={() => setIsLiveMode(!isLiveMode)}
                className="gap-2 button-hover"
              >
                {isLiveMode ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {isLiveMode ? 'Live Mode' : 'Enable Live'}
              </Button>
              <Button variant="outline" onClick={handleRefresh} className="gap-2 button-hover">
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Live Metrics Bar */}
        {isLiveMode && (
          <div className="animate-scale-in bg-muted border border-border rounded-2xl p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 bg-primary rounded-full animate-pulse"></div>
                <span className="font-semibold text-primary">Live Metrics</span>
                <Badge variant="secondary" className="text-xs ml-2">
                  Updated {lastUpdateTime.toLocaleTimeString()}
                </Badge>
              </div>
              <Badge variant="secondary" className="animate-pulse">Real-time</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {liveMetrics.map((metric) => (
                <div key={metric.id} className="flex items-center justify-between p-3 bg-card rounded-xl border border-border hover:shadow-sm transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <metric.icon className={`h-5 w-5 ${metric.color}`} />
                    <span className="font-medium">{metric.label}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{metric.value}</div>
                    <div className={`flex items-center gap-1 text-sm ${getTrendColor(metric.trend)}`}>
                      {getTrendIcon(metric.trend)}
                      {metric.change > 0 ? '+' : ''}{metric.change}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
          <Card className="card-hover border border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Prompts
              </CardTitle>
              <div className="p-2 bg-primary/10 rounded-lg">
                <Target className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{stats?.totalPrompts.toLocaleString() || '0'}</div>
              <div className="flex items-center gap-2 mt-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">+{stats?.weeklyGrowth?.prompts || 0} this week</span>
              </div>
            </CardContent>
          </Card>

          <Card className="card-hover border border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Upvotes
              </CardTitle>
              <div className="p-2 bg-primary/10 rounded-lg">
                <Heart className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{stats?.totalUpvotes.toLocaleString() || '0'}</div>
              <div className="flex items-center gap-2 mt-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">+{stats?.weeklyGrowth?.upvotes || 0} this week</span>
              </div>
            </CardContent>
          </Card>

          <Card className="card-hover border border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Bookmarks
              </CardTitle>
              <div className="p-2 bg-primary/10 rounded-lg">
                <Bookmark className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{stats?.totalBookmarks.toLocaleString() || '0'}</div>
              <div className="flex items-center gap-2 mt-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">+{stats?.weeklyGrowth?.bookmarks || 0} this week</span>
              </div>
            </CardContent>
          </Card>

          <Card className="card-hover border border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Views
              </CardTitle>
              <div className="p-2 bg-primary/10 rounded-lg">
                <Eye className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{stats?.totalViews.toLocaleString() || '0'}</div>
              <div className="flex items-center gap-2 mt-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">+{stats?.weeklyGrowth?.views || 0} this week</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Feature Cards */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-2xl text-foreground">Quick Actions</h2>
            <Badge variant="secondary" className="text-sm">
              Get Started
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {featureCards.map((feature) => (
              <Card key={feature.title} className="card-hover border border-border">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(feature.route)}
                      className="hover:bg-accent"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardTitle className="text-xl font-heading text-foreground mt-4">
                    {feature.title}
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {feature.features.map((feat) => (
                      <div key={feat} className="flex items-center space-x-2">
                        <div className="h-1.5 w-1.5 bg-primary rounded-full"></div>
                        <span className="text-sm text-muted-foreground">{feat}</span>
                      </div>
                    ))}
                  </div>
                  <Button 
                    onClick={() => navigate(feature.route)}
                    className="w-full"
                  >
                    Explore {feature.title}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Recent Activity & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <Card className="card-hover border border-border">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <span>Recent Activity</span>
              </CardTitle>
              <CardDescription>
                Your latest prompt interactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                <div className="space-y-3">
                  {stats.recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="h-2 w-2 bg-primary rounded-full"></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {activity.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(activity.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No recent activity yet</p>
                  <p className="text-sm">Start creating prompts to see activity here</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="card-hover border border-border">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5 text-primary" />
                <span>Quick Actions</span>
              </CardTitle>
              <CardDescription>
                Get started with common tasks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start button-hover"
                onClick={() => navigate('/home')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Prompt
              </Button>
              
              <Button
                variant="outline"
                className="w-full justify-start button-hover"
                onClick={() => navigate('/analytics')}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                View Analytics
              </Button>
              
              <Button
                variant="outline"
                className="w-full justify-start button-hover"
                onClick={() => navigate('/profile')}
              >
                <Users className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
              
              <Button
                variant="outline"
                className="w-full justify-start button-hover"
                onClick={() => navigate('/settings')}
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Community Highlights */}
        <Card className="card-hover border border-border">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-primary" />
              <span>Community Highlights</span>
            </CardTitle>
            <CardDescription>
              What's happening in the upprompt community
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                <Calendar className="h-8 w-8 text-primary mx-auto mb-2" />
                <h4 className="font-medium text-foreground">Active Users</h4>
                <p className="text-sm text-muted-foreground">Join the community</p>
              </div>
              
              <div className="text-center p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                <TrendingUp className="h-8 w-8 text-primary mx-auto mb-2" />
                <h4 className="font-medium text-foreground">Trending Prompts</h4>
                <p className="text-sm text-muted-foreground">Discover popular content</p>
              </div>
              
              <div className="text-center p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                <Lightbulb className="h-8 w-8 text-primary mx-auto mb-2" />
                <h4 className="font-medium text-foreground">New Features</h4>
                <p className="text-sm text-muted-foreground">Explore latest tools</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
