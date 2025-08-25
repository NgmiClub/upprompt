import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart3, 
  BookOpen, 
  Zap, 
  Trophy, 
  TrendingUp, 
  Users, 
  Heart, 
  Bookmark, 
  ArrowRight,
  Calendar,
  Target,
  Lightbulb,
  Plus
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface DashboardStats {
  totalPrompts: number;
  totalUpvotes: number;
  totalBookmarks: number;
  totalViews: number;
  recentActivity: Array<{
    id: string;
    type: 'prompt' | 'upvote' | 'bookmark';
    title: string;
    timestamp: string;
  }>;
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      loadDashboardStats();
    }
  }, [user]);

  const loadDashboardStats = async () => {
    setIsLoading(true);
    try {
      const { data: promptsData } = await supabase
        .from('prompts_with_stats')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (promptsData) {
        const totalPrompts = promptsData.length;
        const totalUpvotes = promptsData.reduce((sum, p) => sum + (p.upvotes || 0), 0);
        const totalBookmarks = promptsData.reduce((sum, p) => sum + (p.bookmarks || 0), 0);
        const totalViews = promptsData.reduce((sum, p) => sum + (p.views || 0), 0);

        const recentActivity = promptsData.slice(0, 3).map(prompt => ({
          id: prompt.id,
          type: 'prompt' as const,
          title: prompt.title,
          timestamp: prompt.created_at
        }));

        setStats({
          totalPrompts,
          totalUpvotes,
          totalBookmarks,
          totalViews,
          recentActivity
        });
      }
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const featureCards = [
    {
      title: 'Analytics Dashboard',
      description: 'Track your prompt performance and engagement metrics',
      icon: BarChart3,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-950/20',
      route: '/analytics',
      features: ['Performance Metrics', 'User Rankings', 'Top Tags', 'Growth Insights']
    },
    {
      title: 'Prompt Collections',
      description: 'Organize and curate your favorite prompts',
      icon: BookOpen,
      color: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-950/20',
      route: '/collections',
      features: ['Create Collections', 'Share Curated Lists', 'Tag Organization', 'Collaborative Curation']
    },
    {
      title: 'AI Prompt Tester',
      description: 'Test your prompts with different AI models',
      icon: Zap,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-50 dark:bg-yellow-950/20',
      route: '/tester',
      features: ['Multi-Model Testing', 'Parameter Tuning', 'Cost Estimation', 'Response Streaming']
    },
    {
      title: 'Community Challenges',
      description: 'Compete in themed prompt competitions',
      icon: Trophy,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-950/20',
      route: '/challenges',
      features: ['Create Challenges', 'Vote on Submissions', 'Prize Pools', 'Community Engagement']
    }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
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

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="font-heading text-3xl sm:text-4xl text-foreground">
            Welcome back, {user?.user_metadata?.username || 'User'}! 👋
          </h1>
          <p className="text-muted-foreground text-lg">
            Here's what's happening with your prompts and the community
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Prompts
              </CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats?.totalPrompts || 0}</div>
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
              <div className="text-2xl font-bold text-foreground">{stats?.totalUpvotes || 0}</div>
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
              <div className="text-2xl font-bold text-foreground">{stats?.totalBookmarks || 0}</div>
              <p className="text-xs text-muted-foreground">
                Saved by users
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Views
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats?.totalViews || 0}</div>
              <p className="text-xs text-muted-foreground">
                Prompt impressions
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Feature Cards */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-2xl text-foreground">Advanced Features</h2>
            <Badge variant="secondary" className="text-sm">
              New & Improved
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {featureCards.map((feature) => (
              <Card key={feature.title} className="bg-card border-border hover:shadow-lg transition-all duration-200 hover:scale-[1.02]">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className={`p-3 rounded-lg ${feature.bgColor}`}>
                      <feature.icon className={`h-6 w-6 ${feature.color}`} />
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
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
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
                    <div key={activity.id} className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
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
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                <span>Quick Actions</span>
              </CardTitle>
              <CardDescription>
                Get started with common tasks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate('/home')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Prompt
              </Button>
              
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate('/collections')}
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Create Collection
              </Button>
              
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate('/challenges')}
              >
                <Trophy className="h-4 w-4 mr-2" />
                Join Challenge
              </Button>
              
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate('/tester')}
              >
                <Zap className="h-4 w-4 mr-2" />
                Test Prompt
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Community Highlights */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-500" />
              <span>Community Highlights</span>
            </CardTitle>
            <CardDescription>
              What's happening in the upprompt community
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <Calendar className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                <h4 className="font-medium text-foreground">Active Challenges</h4>
                <p className="text-sm text-muted-foreground">Join ongoing competitions</p>
              </div>
              
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <TrendingUp className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <h4 className="font-medium text-foreground">Trending Prompts</h4>
                <p className="text-sm text-muted-foreground">Discover popular content</p>
              </div>
              
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <Lightbulb className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
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
