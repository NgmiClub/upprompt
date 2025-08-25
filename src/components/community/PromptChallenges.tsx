import { useState, useEffect } from 'react';
import { Trophy, Calendar, Users, Target, Award, Star, Clock, TrendingUp, Lightbulb, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Challenge {
  id: string;
  title: string;
  description: string;
  theme: string;
  category: string;
  start_date: string;
  end_date: string;
  max_participants: number;
  current_participants: number;
  prize_pool: number;
  status: 'upcoming' | 'active' | 'voting' | 'completed';
  created_by: string;
  created_at: string;
  rules: string[];
  requirements: string[];
  tags: string[];
}

interface Submission {
  id: string;
  challenge_id: string;
  user_id: string;
  username: string;
  title: string;
  content: string;
  tags: string[];
  created_at: string;
  upvotes: number;
  bookmarks: number;
  rating: number;
  is_winner: boolean;
}

export function PromptChallenges() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'active' | 'voting' | 'completed'>('all');
  
  const { user } = useAuth();
  const { toast } = useToast();

  const [newSubmission, setNewSubmission] = useState({
    title: '',
    content: '',
    tags: [] as string[]
  });

  const [newChallenge, setNewChallenge] = useState({
    title: '',
    description: '',
    theme: '',
    category: '',
    start_date: '',
    end_date: '',
    max_participants: 100,
    prize_pool: 0,
    rules: [] as string[],
    requirements: [] as string[],
    tags: [] as string[]
  });

  useEffect(() => {
    loadChallenges();
  }, []);

  const loadChallenges = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setChallenges(data || []);
    } catch (error) {
      console.error('Error loading challenges:', error);
      toast({
        description: 'Failed to load challenges',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadSubmissions = async (challengeId: string) => {
    try {
      const { data, error } = await supabase
        .from('challenge_submissions')
        .select(`
          *,
          profiles!challenge_submissions_user_id_fkey(username)
        `)
        .eq('challenge_id', challengeId)
        .order('upvotes', { ascending: false });

      if (error) throw error;

      const formattedSubmissions = data?.map(submission => ({
        ...submission,
        username: submission.profiles?.username || 'Unknown'
      })) || [];

      setSubmissions(formattedSubmissions);
    } catch (error) {
      console.error('Error loading submissions:', error);
    }
  };

  const createChallenge = async () => {
    if (!newChallenge.title.trim() || !newChallenge.description.trim()) {
      toast({
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('challenges')
        .insert({
          ...newChallenge,
          created_by: user?.id,
          status: 'upcoming'
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        description: 'Challenge created successfully!',
      });

      setNewChallenge({
        title: '', description: '', theme: '', category: '',
        start_date: '', end_date: '', max_participants: 100,
        prize_pool: 0, rules: [], requirements: [], tags: []
      });
      setShowCreateDialog(false);
      loadChallenges();
    } catch (error) {
      console.error('Error creating challenge:', error);
      toast({
        description: 'Failed to create challenge',
        variant: 'destructive',
      });
    }
  };

  const submitToChallenge = async () => {
    if (!selectedChallenge || !newSubmission.title.trim() || !newSubmission.content.trim()) {
      toast({
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('challenge_submissions')
        .insert({
          challenge_id: selectedChallenge.id,
          user_id: user?.id,
          title: newSubmission.title.trim(),
          content: newSubmission.content.trim(),
          tags: newSubmission.tags
        });

      if (error) throw error;

      toast({
        description: 'Submission successful! Good luck!',
      });

      setNewSubmission({ title: '', content: '', tags: [] });
      setShowSubmitDialog(false);
      loadSubmissions(selectedChallenge.id);
    } catch (error) {
      console.error('Error submitting to challenge:', error);
      toast({
        description: 'Failed to submit to challenge',
        variant: 'destructive',
      });
    }
  };

  const upvoteSubmission = async (submissionId: string) => {
    try {
      const { error } = await supabase
        .from('challenge_submissions')
        .update({ upvotes: submissions.find(s => s.id === submissionId)?.upvotes + 1 })
        .eq('id', submissionId);

      if (error) throw error;

      loadSubmissions(selectedChallenge?.id || '');
    } catch (error) {
      console.error('Error upvoting submission:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-500';
      case 'active': return 'bg-green-500';
      case 'voting': return 'bg-yellow-500';
      case 'completed': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'upcoming': return 'Upcoming';
      case 'active': return 'Active';
      case 'voting': return 'Voting';
      case 'completed': return 'Completed';
      default: return 'Unknown';
    }
  };

  const filteredChallenges = challenges.filter(challenge => {
    if (filter === 'all') return true;
    return challenge.status === filter;
  });

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-2xl text-foreground">Prompt Challenges</h2>
          <Button disabled className="animate-pulse">
            <Trophy className="h-4 w-4 mr-2" />
            Create Challenge
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-32 mb-2"></div>
                <div className="h-3 bg-muted rounded w-24"></div>
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-muted rounded mb-2"></div>
                <div className="flex justify-between items-center">
                  <div className="h-4 bg-muted rounded w-16"></div>
                  <div className="h-4 bg-muted rounded w-20"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl text-foreground">Prompt Challenges</h2>
          <p className="text-muted-foreground">
            Compete in themed prompt competitions and showcase your creativity
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Trophy className="h-4 w-4 mr-2" />
              Create Challenge
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Challenge</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={newChallenge.title}
                    onChange={(e) => setNewChallenge({ ...newChallenge, title: e.target.value })}
                    placeholder="Challenge title"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Theme</label>
                  <Input
                    value={newChallenge.theme}
                    onChange={(e) => setNewChallenge({ ...newChallenge, theme: e.target.value })}
                    placeholder="e.g., Sci-Fi, Poetry, Code"
                    className="mt-1"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={newChallenge.description}
                  onChange={(e) => setNewChallenge({ ...newChallenge, description: e.target.value })}
                  placeholder="Describe the challenge and what you're looking for"
                  className="mt-1"
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Start Date</label>
                  <Input
                    type="date"
                    value={newChallenge.start_date}
                    onChange={(e) => setNewChallenge({ ...newChallenge, start_date: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">End Date</label>
                  <Input
                    type="date"
                    value={newChallenge.end_date}
                    onChange={(e) => setNewChallenge({ ...newChallenge, end_date: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Max Participants</label>
                  <Input
                    type="number"
                    value={newChallenge.max_participants}
                    onChange={(e) => setNewChallenge({ ...newChallenge, max_participants: parseInt(e.target.value) || 100 })}
                    className="mt-1"
                    min={1}
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={createChallenge}>Create Challenge</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center space-x-2 mb-4">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          All
        </Button>
        <Button
          variant={filter === 'upcoming' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('upcoming')}
        >
          Upcoming
        </Button>
        <Button
          variant={filter === 'active' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('active')}
        >
          Active
        </Button>
        <Button
          variant={filter === 'voting' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('voting')}
        >
          Voting
        </Button>
        <Button
          variant={filter === 'completed' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('completed')}
        >
          Completed
        </Button>
      </div>

      {filteredChallenges.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No challenges found</h3>
            <p className="text-muted-foreground mb-4">
              {filter === 'all' 
                ? 'Be the first to create a challenge!'
                : `No ${filter} challenges at the moment.`
              }
            </p>
            {filter === 'all' && (
              <Button onClick={() => setShowCreateDialog(true)}>
                <Trophy className="h-4 w-4 mr-2" />
                Create First Challenge
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredChallenges.map((challenge) => (
            <Card key={challenge.id} className="bg-card border-border hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between mb-2">
                  <Badge className={`${getStatusColor(challenge.status)} text-white`}>
                    {getStatusText(challenge.status)}
                  </Badge>
                  {challenge.prize_pool > 0 && (
                    <div className="flex items-center space-x-1 text-yellow-600">
                      <Award className="h-4 w-4" />
                      <span className="text-sm font-medium">${challenge.prize_pool}</span>
                    </div>
                  )}
                </div>
                
                <CardTitle className="text-lg font-medium text-foreground mb-1">
                  {challenge.title}
                </CardTitle>
                
                <CardDescription className="text-sm text-muted-foreground line-clamp-2 mb-2">
                  {challenge.description}
                </CardDescription>
                
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-xs">
                    {challenge.theme}
                  </Badge>
                  {challenge.tags?.slice(0, 2).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span className="flex items-center space-x-1">
                    <Users className="h-4 w-4" />
                    <span>{challenge.current_participants}/{challenge.max_participants}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>{getDaysRemaining(challenge.end_date)}d left</span>
                  </span>
                </div>
                
                <Progress 
                  value={(challenge.current_participants / challenge.max_participants) * 100} 
                  className="h-2"
                />
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setSelectedChallenge(challenge);
                      loadSubmissions(challenge.id);
                    }}
                  >
                    View Details
                  </Button>
                  
                  {challenge.status === 'active' && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedChallenge(challenge);
                        setShowSubmitDialog(true);
                      }}
                    >
                      <Zap className="h-4 w-4 mr-1" />
                      Submit
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Submit to Challenge: {selectedChallenge?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Submission Title</label>
              <Input
                value={newSubmission.title}
                onChange={(e) => setNewSubmission({ ...newSubmission, title: e.target.value })}
                placeholder="Give your submission a title"
                className="mt-1"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Prompt Content</label>
              <Textarea
                value={newSubmission.content}
                onChange={(e) => setNewSubmission({ ...newSubmission, content: e.target.value })}
                placeholder="Write your prompt here..."
                className="mt-1"
                rows={6}
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>
                Cancel
              </Button>
              <Button onClick={submitToChallenge}>Submit Entry</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {selectedChallenge && (
        <Dialog open={!!selectedChallenge} onOpenChange={() => setSelectedChallenge(null)}>
          <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                <span>{selectedChallenge.title}</span>
                <Badge className={getStatusColor(selectedChallenge.status)}>
                  {getStatusText(selectedChallenge.status)}
                </Badge>
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              <div className="p-4 bg-muted/30 rounded-lg">
                <h4 className="font-medium text-foreground mb-2">Challenge Description</h4>
                <p className="text-muted-foreground">{selectedChallenge.description}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-bold text-foreground">
                    {selectedChallenge.current_participants}
                  </div>
                  <div className="text-sm text-muted-foreground">Participants</div>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-bold text-foreground">
                    {getDaysRemaining(selectedChallenge.end_date)}
                  </div>
                  <div className="text-sm text-muted-foreground">Days Left</div>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-2xl font-bold text-foreground">
                    {selectedChallenge.prize_pool > 0 ? `$${selectedChallenge.prize_pool}` : 'None'}
                  </div>
                  <div className="text-sm text-muted-foreground">Prize Pool</div>
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium">Submissions ({submissions.length})</h4>
                  {selectedChallenge.status === 'active' && (
                    <Button
                      size="sm"
                      onClick={() => setShowSubmitDialog(true)}
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      Submit Entry
                    </Button>
                  )}
                </div>
                
                {submissions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No submissions yet. Be the first to submit!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {submissions.map((submission) => (
                      <Card key={submission.id} className="bg-muted/30">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h5 className="font-medium text-foreground mb-1">
                                {submission.title}
                                {submission.is_winner && (
                                  <Badge className="ml-2 bg-yellow-500 text-white">
                                    <Star className="h-3 w-3 mr-1" />
                                    Winner
                                  </Badge>
                                )}
                              </h5>
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                {submission.content}
                              </p>
                              <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                                <span>by {submission.username}</span>
                                <span>•</span>
                                <span>{new Date(submission.created_at).toLocaleDateString()}</span>
                                <span>•</span>
                                <span className="flex items-center space-x-1">
                                  <TrendingUp className="h-3 w-3" />
                                  <span>{submission.upvotes}</span>
                                </span>
                              </div>
                            </div>
                            
                            {selectedChallenge.status === 'voting' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => upvoteSubmission(submission.id)}
                              >
                                <TrendingUp className="h-4 w-4 mr-1" />
                                Vote
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
