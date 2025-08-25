import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Eye, Heart, Bookmark, Share2, Users, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface AnalyticsData {
  totalPrompts: number;
  totalUpvotes: number;
  totalBookmarks: number;
  totalViews: number;
  averageRating: number;
  topPerformingPrompt: {
    title: string;
    upvotes: number;
    bookmarks: number;
  };
  weeklyGrowth: {
    prompts: number;
    upvotes: number;
    bookmarks: number;
  };
  topTags: Array<{ tag: string; count: number }>;
  userRanking: number;
}

export function PromptAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState('7d');
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadAnalytics();
    }
  }, [user, timeRange]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const { data: promptsData } = await supabase
        .from('prompts_with_stats')
        .select('*')
        .eq('user_id', user?.id);

      const { data: allPromptsData } = await supabase
        .from('prompts_with_stats')
        .select('*');

      if (promptsData && allPromptsData) {
        const userPrompts = promptsData;
        const allPrompts = allPromptsData;

        const totalPrompts = userPrompts.length;
        const totalUpvotes = userPrompts.reduce((sum, p) => sum + (p.upvotes || 0), 0);
        const totalBookmarks = userPrompts.reduce((sum, p) => sum + (p.bookmarks || 0), 0);
        const totalViews = userPrompts.reduce((sum, p) => sum + (p.views || 0), 0);
        
        const averageRating = totalPrompts > 0 ? (totalUpvotes / totalPrompts) : 0;
        
        const topPerformingPrompt = userPrompts.reduce((top, current) => {
          const currentScore = (current.upvotes || 0) + (current.bookmarks || 0);
          const topScore = (top.upvotes || 0) + (top.bookmarks || 0);
          return currentScore > topScore ? current : top;
        }, userPrompts[0] || { title: 'No prompts yet', upvotes: 0, bookmarks: 0 });

        const topTags = calculateTopTags(userPrompts);
        const userRanking = calculateUserRanking(allPrompts, user?.id);

        setAnalytics({
          totalPrompts,
          totalUpvotes,
          totalBookmarks,
          totalViews,
          averageRating,
          topPerformingPrompt,
          weeklyGrowth: { prompts: 0, upvotes: 0, bookmarks: 0 },
          topTags,
          userRanking
        });
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTopTags = (prompts: any[]) => {
    const tagCounts: { [key: string]: number } = {};
    prompts.forEach(prompt => {
      if (prompt.tags) {
        prompt.tags.forEach((tag: string) => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });
    
    return Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  const calculateUserRanking = (allPrompts: any[], userId: string) => {
    const userScores = allPrompts
      .filter(p => p.user_id === userId)
      .reduce((sum, p) => sum + (p.upvotes || 0) + (p.bookmarks || 0), 0);
    
    const allUserScores = allPrompts.reduce((acc, p) => {
      acc[p.user_id] = (acc[p.user_id] || 0) + (p.upvotes || 0) + (p.bookmarks || 0);
      return acc;
    }, {} as { [key: string]: number });
    
    const sortedUsers = Object.values(allUserScores).sort((a, b) => b - a);
    return sortedUsers.indexOf(userScores) + 1;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-2xl text-foreground">Analytics Dashboard</h2>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-24"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-16 mb-2"></div>
                <div className="h-3 bg-muted rounded w-32"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-2xl text-foreground">Analytics Dashboard</h2>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Prompts
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{analytics.totalPrompts}</div>
            <p className="text-xs text-muted-foreground">
              Your created prompts
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Upvotes
            </CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{analytics.totalUpvotes}</div>
            <p className="text-xs text-muted-foreground">
              Community appreciation
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Bookmarks
            </CardTitle>
            <Bookmark className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{analytics.totalBookmarks}</div>
            <p className="text-xs text-muted-foreground">
              Saved by users
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              User Ranking
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">#{analytics.userRanking}</div>
            <p className="text-xs text-muted-foreground">
              Among all users
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <span>Top Performing Prompt</span>
            </CardTitle>
            <CardDescription>
              Your most successful prompt based on engagement
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium text-foreground mb-2">
                {analytics.topPerformingPrompt.title}
              </h4>
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <span className="flex items-center space-x-1">
                  <Heart className="h-4 w-4" />
                  <span>{analytics.topPerformingPrompt.upvotes}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Bookmark className="h-4 w-4" />
                  <span>{analytics.topPerformingPrompt.bookmarks}</span>
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Share2 className="h-5 w-5 text-blue-500" />
              <span>Top Tags</span>
            </CardTitle>
            <CardDescription>
              Your most used prompt categories
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {analytics.topTags.map((tag) => (
                <Badge key={tag.tag} variant="secondary" className="text-xs">
                  {tag.tag} ({tag.count})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Performance Insights</CardTitle>
          <CardDescription>
            Key metrics and recommendations for improvement
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <div className="text-2xl font-bold text-foreground">
                {analytics.averageRating.toFixed(1)}
              </div>
              <div className="text-sm text-muted-foreground">Avg. Rating</div>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <div className="text-2xl font-bold text-foreground">
                {analytics.totalViews}
              </div>
              <div className="text-sm text-muted-foreground">Total Views</div>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <div className="text-2xl font-bold text-foreground">
                {analytics.totalBookmarks > 0 ? ((analytics.totalBookmarks / analytics.totalPrompts) * 100).toFixed(1) : 0}%
              </div>
              <div className="text-sm text-muted-foreground">Bookmark Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
