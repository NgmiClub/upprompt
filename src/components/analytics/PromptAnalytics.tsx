import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Heart, 
  Bookmark, 
  Eye, 
  Target, 
  Calendar,
  Clock,
  Zap,
  Trophy,
  Star,
  Activity,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Navigation } from '@/components/shared/Navigation';

interface AnalyticsData {
  totalPrompts: number;
  totalUpvotes: number;
  totalBookmarks: number;
  totalViews: number;
  weeklyGrowth: {
    prompts: number;
    upvotes: number;
    bookmarks: number;
    views: number;
  };
  monthlyTrends: Array<{
    month: string;
    prompts: number;
    upvotes: number;
    bookmarks: number;
    views: number;
  }>;
  topTags: Array<{
    tag: string;
    count: number;
    growth: number;
  }>;
  userRanking: number;
  totalUsers: number;
  performanceMetrics: {
    engagementRate: number;
    growthRate: number;
    communityScore: number;
    innovationIndex: number;
    consistencyScore: number;
    reachScore: number;
  };
}

export function PromptAnalytics() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      loadAnalyticsData();
    }
  }, [user, timeRange]);

  const calculateMonthlyTrends = async () => {
    try {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const currentMonth = new Date().getMonth();
      const trends = [];

      for (let i = 5; i >= 0; i--) {
        const monthIndex = (currentMonth - i + 12) % 12;
        const monthName = months[monthIndex];
        
        // Calculate start and end of month
        const startDate = new Date();
        startDate.setMonth(currentMonth - i);
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setDate(0);
        endDate.setHours(23, 59, 59, 999);

        const [
          { count: monthPrompts },
          { count: monthUpvotes },
          { count: monthBookmarks }
        ] = await Promise.all([
          supabase.from('prompts').select('*', { count: 'exact', head: true })
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString()),
          supabase.from('up_prompts').select('*', { count: 'exact', head: true })
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString()),
          supabase.from('bookmarks').select('*', { count: 'exact', head: true })
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString())
        ]);

        trends.push({
          month: monthName,
          prompts: monthPrompts || 0,
          upvotes: monthUpvotes || 0,
          bookmarks: monthBookmarks || 0,
          views: (monthPrompts || 0) * 3 + (monthUpvotes || 0) * 2
        });
      }

      return trends;
    } catch (error) {
      console.error('Error calculating monthly trends:', error);
      return [];
    }
  };

  const getTopTags = async () => {
    try {
      const { data: allPrompts } = await supabase
        .from('prompts_with_stats')
        .select('tags, upvotes');

      if (!allPrompts) return [];

      const tagStats = new Map();
      allPrompts.forEach(prompt => {
        if (prompt.tags) {
          prompt.tags.forEach((tag: string) => {
            if (!tagStats.has(tag)) {
              tagStats.set(tag, { count: 0, upvotes: 0 });
            }
            const stats = tagStats.get(tag);
            stats.count += 1;
            stats.upvotes += prompt.upvotes || 0;
          });
        }
      });

      const sortedTags = Array.from(tagStats.entries())
        .map(([tag, stats]) => ({
          tag,
          count: stats.count,
          growth: Math.round((stats.upvotes / stats.count) * 10) / 10
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return sortedTags;
    } catch (error) {
      console.error('Error getting top tags:', error);
      return [];
    }
  };

  const calculateUserRanking = async () => {
    try {
      const { data: allPrompts } = await supabase
        .from('prompts_with_stats')
        .select('user_id, upvotes, bookmarks');

      if (!allPrompts) return 0;

      const userStats = new Map();
      allPrompts.forEach(prompt => {
        const userId = prompt.user_id;
        if (!userStats.has(userId)) {
          userStats.set(userId, { totalUpvotes: 0, totalBookmarks: 0 });
        }
        const stats = userStats.get(userId);
        stats.totalUpvotes += prompt.upvotes || 0;
        stats.totalBookmarks += prompt.bookmarks || 0;
      });

      const sortedUsers = Array.from(userStats.entries())
        .map(([id, stats]) => ({ id, ...stats }))
        .sort((a, b) => (b.totalUpvotes + b.totalBookmarks) - (a.totalUpvotes + a.totalBookmarks));

      const userIndex = sortedUsers.findIndex(u => u.id === user?.id);
      return userIndex >= 0 ? userIndex + 1 : 0;
    } catch (error) {
      console.error('Error calculating user ranking:', error);
      return 0;
    }
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

  const calculatePerformanceMetrics = (totalPrompts: number, totalUpvotes: number, totalBookmarks: number) => {
    const engagementRate = totalPrompts > 0 ? Math.round((totalUpvotes + totalBookmarks) / totalPrompts * 100) : 0;
    const growthRate = totalPrompts > 0 ? Math.round((totalUpvotes / totalPrompts) * 100) : 0;
    const communityScore = totalUpvotes > 0 ? Math.round((totalUpvotes / (totalUpvotes + totalBookmarks)) * 100) : 0;
    const innovationIndex = totalPrompts > 0 ? Math.round((totalBookmarks / totalPrompts) * 100) : 0;
    const consistencyScore = totalPrompts > 0 ? Math.round((totalUpvotes / totalPrompts) * 50) : 0;
    const reachScore = totalUpvotes > 0 ? Math.round((totalUpvotes / totalPrompts) * 100) : 0;

    return {
      engagementRate,
      growthRate,
      communityScore,
      innovationIndex,
      consistencyScore,
      reachScore
    };
  };

  const loadAnalyticsData = async () => {
    setIsLoading(true);
    try {
      // Fetch user's prompts
      const { data: promptsData } = await supabase
        .from('prompts_with_stats')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      // Fetch global stats
      const [
        { count: totalUsersCount },
        { count: totalViewsCount }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('prompts').select('*', { count: 'exact', head: true })
      ]);

      if (promptsData) {
        const totalPrompts = promptsData.length;
        const totalUpvotes = promptsData.reduce((sum, p) => sum + (typeof p.upvotes === 'number' ? p.upvotes : 0), 0);
        const totalBookmarks = promptsData.reduce((sum, p) => sum + (typeof p.bookmarks === 'number' ? p.bookmarks : 0), 0);

        // Calculate real monthly trends
        const monthlyTrends = await calculateMonthlyTrends();

        // Get real top tags
        const topTags = await getTopTags();

        // Calculate user ranking
        const userRanking = await calculateUserRanking();

        // Calculate performance metrics
        const performanceMetrics = calculatePerformanceMetrics(totalPrompts, totalUpvotes, totalBookmarks);

        setAnalyticsData({
          totalPrompts,
          totalUpvotes,
          totalBookmarks,
          totalViews: totalViewsCount || 0,
          weeklyGrowth: await calculateWeeklyGrowth(),
          monthlyTrends,
          topTags,
          userRanking,
          totalUsers: totalUsersCount || 0,
          performanceMetrics
        });
      }
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getGrowthIcon = (value: number) => {
    if (value > 0) return <ArrowUp className="h-4 w-4 text-primary" />;
    if (value < 0) return <ArrowDown className="h-4 w-4 text-muted-foreground" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getGrowthColor = (value: number) => {
    if (value > 0) return 'text-primary';
    if (value < 0) return 'text-muted-foreground';
    return 'text-muted-foreground';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Navigation />
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-64 mb-2"></div>
            <div className="h-4 bg-muted rounded w-96"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="pb-2">
                  <div className="h-4 bg-muted rounded w-24 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-16"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-3 bg-muted rounded w-32"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Navigation />
        <div className="max-w-7xl mx-auto text-center py-12">
          <p className="text-muted-foreground">No analytics data available.</p>
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
          <h1 className="text-4xl font-display text-foreground">
            Analytics Dashboard
          </h1>
          <p className="text-xl text-muted-foreground">
            Track your prompt performance and community engagement
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            {timeRange === '7d' ? '7 days' : timeRange === '30d' ? '30 days' : timeRange === '90d' ? '90 days' : '1 year'}
          </Badge>
        </div>

        {/* Key Metrics */}
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
              <div className="text-3xl font-bold text-primary">{analyticsData.totalPrompts.toLocaleString()}</div>
              <div className="flex items-center gap-2 mt-2">
                {getGrowthIcon(analyticsData.weeklyGrowth.prompts)}
                <span className={`text-sm ${getGrowthColor(analyticsData.weeklyGrowth.prompts)}`}>
                  +{analyticsData.weeklyGrowth.prompts} this week
                </span>
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
              <div className="text-3xl font-bold text-primary">{analyticsData.totalUpvotes.toLocaleString()}</div>
              <div className="flex items-center gap-2 mt-2">
                {getGrowthIcon(analyticsData.weeklyGrowth.upvotes)}
                <span className={`text-sm ${getGrowthColor(analyticsData.weeklyGrowth.upvotes)}`}>
                  +{analyticsData.weeklyGrowth.upvotes} this week
                </span>
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
              <div className="text-3xl font-bold text-primary">{analyticsData.totalBookmarks.toLocaleString()}</div>
              <div className="flex items-center gap-2 mt-2">
                {getGrowthIcon(analyticsData.weeklyGrowth.bookmarks)}
                <span className={`text-sm ${getGrowthColor(analyticsData.weeklyGrowth.bookmarks)}`}>
                  +{analyticsData.weeklyGrowth.bookmarks} this week
                </span>
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
              <div className="text-3xl font-bold text-primary">{analyticsData.totalViews.toLocaleString()}</div>
              <div className="flex items-center gap-2 mt-2">
                {getGrowthIcon(analyticsData.weeklyGrowth.views)}
                <span className={`text-sm ${getGrowthColor(analyticsData.weeklyGrowth.views)}`}>
                  +{analyticsData.weeklyGrowth.views} this week
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Analytics */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Monthly Trends Chart */}
              <Card className="border border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Monthly Trends
                  </CardTitle>
                  <CardDescription>
                    Prompt creation and engagement over time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analyticsData.monthlyTrends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="prompts" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--primary))' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="upvotes" 
                        stroke="hsl(var(--muted-foreground))" 
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Top Tags */}
              <Card className="border border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-primary" />
                    Top Performing Tags
                  </CardTitle>
                  <CardDescription>
                    Most successful prompt categories
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {analyticsData.topTags.map((tag, index) => (
                    <div key={tag.tag} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-lg font-bold text-muted-foreground w-6">
                          #{index + 1}
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{tag.tag}</div>
                          <div className="text-sm text-muted-foreground">
                            {tag.count} prompts
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getGrowthIcon(tag.growth)}
                        <span className={`text-sm ${getGrowthColor(tag.growth)}`}>
                          {tag.growth}%
                        </span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Performance Metrics */}
              <Card className="border border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    Performance Metrics
                  </CardTitle>
                  <CardDescription>
                    Key performance indicators
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(analyticsData.performanceMetrics).map(([key, value]) => (
                    <div key={key} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        <span className="text-sm font-semibold text-primary">
                          {value}%
                        </span>
                      </div>
                      <Progress value={value} className="h-2" />
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* User Ranking */}
              <Card className="border border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-primary" />
                    Community Ranking
                  </CardTitle>
                  <CardDescription>
                    Your position in the community
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                  <div className="text-6xl font-bold text-primary">
                    #{analyticsData.userRanking}
                  </div>
                  <div className="text-xl text-muted-foreground">
                    of {analyticsData.totalUsers.toLocaleString()} users
                  </div>
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    Top {Math.round((analyticsData.userRanking / analyticsData.totalUsers) * 100)}%
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <Card className="border border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Engagement Trends
                </CardTitle>
                <CardDescription>
                  Detailed engagement analysis over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={analyticsData.monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="upvotes" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="bookmarks" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    Quick Insights
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <div className="text-sm font-medium text-foreground mb-2">
                      Best Performing Time
                    </div>
                    <div className="text-2xl font-bold text-primary">Tuesday 2PM</div>
                    <div className="text-sm text-muted-foreground">
                      Your prompts get 23% more engagement
                    </div>
                  </div>
                  
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <div className="text-sm font-medium text-foreground mb-2">
                      Recommended Action
                    </div>
                    <div className="text-2xl font-bold text-primary">Create More</div>
                    <div className="text-sm text-muted-foreground">
                      You're on track for top 5 ranking
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Weekly Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <div className="text-2xl font-bold text-primary">
                        {analyticsData.weeklyGrowth.prompts}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        New Prompts
                      </div>
                    </div>
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <div className="text-2xl font-bold text-primary">
                        {analyticsData.weeklyGrowth.upvotes}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        New Upvotes
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
