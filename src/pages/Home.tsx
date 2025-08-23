import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigation } from '@/components/layout/Navigation';
import { QuickCreateBox } from '@/components/prompts/QuickCreateBox';
import { PromptCard } from '@/components/prompts/PromptCard';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

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

export function Home() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [filteredPrompts, setFilteredPrompts] = useState<Prompt[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentUserUpvotes, setCurrentUserUpvotes] = useState<Set<string>>(new Set());
  const [currentUserBookmarks, setCurrentUserBookmarks] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Load prompts and user interactions
  useEffect(() => {
    if (user) {
      loadPrompts();
      loadUserInteractions();
    }
  }, [user]);

  const loadPrompts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('prompts_with_stats')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setPrompts(data || []);
      setFilteredPrompts(data || []);
    } catch (error) {
      console.error('Error loading prompts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserInteractions = async () => {
    if (!user) return;

    try {
      // Load user's upvotes
      const { data: upvotes } = await supabase
        .from('up_prompts')
        .select('prompt_id')
        .eq('user_id', user.id);

      // Load user's bookmarks  
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

      // Update prompt count locally
      setPrompts(prev => prev.map(prompt => 
        prompt.id === promptId 
          ? { ...prompt, upvotes: prompt.upvotes + (isUpvoted ? -1 : 1) }
          : prompt
      ));
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

  // Filter prompts based on search query and selected tags
  useEffect(() => {
    let filtered = prompts;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(prompt => 
        prompt.title.toLowerCase().includes(query) ||
        prompt.content.toLowerCase().includes(query) ||
        prompt.username.toLowerCase().includes(query) ||
        prompt.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Filter by selected tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter(prompt =>
        selectedTags.every(selectedTag =>
          prompt.tags.some(tag => 
            tag.toLowerCase() === selectedTag.toLowerCase()
          )
        )
      );
    }

    setFilteredPrompts(filtered);
  }, [prompts, searchQuery, selectedTags]);

  const handlePromptCreated = () => {
    loadPrompts(); // Reload prompts when a new one is created
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to auth
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedTags={selectedTags}
        onTagsChange={setSelectedTags}
        onPromptCreated={handlePromptCreated}
      />
      
      <main className="container mx-auto px-4 py-4 sm:py-6 lg:py-8 max-w-2xl">
        {/* Quick Create Box */}
        <QuickCreateBox onPromptCreated={handlePromptCreated} />

        {/* Feed */}
        <div className="space-y-4 sm:space-y-6">
          {filteredPrompts.map((prompt) => (
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
          ))}
        </div>

        {filteredPrompts.length === 0 && prompts.length > 0 && !isLoading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No prompts match your search criteria.</p>
          </div>
        )}

        {prompts.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No prompts yet. Be the first to share one!</p>
          </div>
        )}

        {isLoading && (
          <div className="flex justify-center mt-8">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        )}
      </main>
    </div>
  );
}