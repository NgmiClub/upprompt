import { Navigation } from '@/components/shared/Navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { metaTagsManager } from '@/utils/metaUtils';
import {
  ArrowLeft,
  BookmarkSimple,
  Copy,
  Download,
  Heart,
  ShareNetwork
} from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

interface Prompt {
  id: string;
  title: string;
  content: string;
  tags: string[];
  upvotes: number;
  bookmarks: number;
  username?: string;
  avatar_url?: string;
  created_at: string;
  user_id: string;
}

export function PromptDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUpvoted, setIsUpvoted] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (!id) {
      navigate('/home');
      return;
    }
    fetchPrompt();
    if (user) {
      checkUserInteractions();
    }
  }, [id, user, navigate]);

  // Update document title and meta tags when prompt loads
  useEffect(() => {
    if (prompt) {
      // Set dynamic meta tags for the prompt
      metaTagsManager.setPromptMetaTags({
        title: prompt.title,
        content: prompt.content,
        author: prompt.username || 'Unknown User',
        tags: prompt.tags || [],
        upvotes: prompt.upvotes,
        promptId: prompt.id
      });
    }

    return () => {
      // Reset to default meta tags when leaving the page
      metaTagsManager.resetToDefault();
    };
  }, [prompt]);

  const fetchPrompt = async () => {
    try {
      const { data, error } = await supabase
        .from('prompts_with_stats')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        setPrompt(data);
      } else {
        toast({
          description: 'Prompt not found',
          variant: 'destructive',
        });
        navigate('/home');
      }
    } catch (error) {
      console.error('Error fetching prompt:', error);
      toast({
        description: 'Failed to load prompt',
        variant: 'destructive',
      });
      navigate('/home');
    } finally {
      setLoading(false);
    }
  };

  const checkUserInteractions = async () => {
    if (!user || !id) return;

    try {
      // Check if user has upvoted
      const { data: upvoteData } = await supabase
        .from('up_prompts')
        .select('id')
        .eq('prompt_id', id)
        .eq('user_id', user.id)
        .single();

      setIsUpvoted(!!upvoteData);

      // Check if user has saved
      const { data: saveData } = await supabase
        .from('bookmarks')
        .select('id')
        .eq('prompt_id', id)
        .eq('user_id', user.id)
        .single();

      setIsSaved(!!saveData);
    } catch (error) {
      // Errors are expected when no records exist
    }
  };

  const handleUpvote = async () => {
    if (!user || !prompt) {
      toast({
        description: 'Please sign in to upvote prompts',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (isUpvoted) {
        await supabase
          .from('up_prompts')
          .delete()
          .eq('prompt_id', prompt.id)
          .eq('user_id', user.id);

        setPrompt(prev => prev ? { ...prev, upvotes: prev.upvotes - 1 } : null);
        setIsUpvoted(false);
      } else {
        await supabase
          .from('up_prompts')
          .insert({ prompt_id: prompt.id, user_id: user.id });

        setPrompt(prev => prev ? { ...prev, upvotes: prev.upvotes + 1 } : null);
        setIsUpvoted(true);
      }
    } catch (error) {
      toast({
        description: 'Failed to update upvote',
        variant: 'destructive',
      });
    }
  };

  const handleSave = async () => {
    if (!user || !prompt) {
      toast({
        description: 'Please sign in to save prompts',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (isSaved) {
        await supabase
          .from('bookmarks')
          .delete()
          .eq('prompt_id', prompt.id)
          .eq('user_id', user.id);

        setPrompt(prev => prev ? { ...prev, bookmarks: prev.bookmarks - 1 } : null);
        setIsSaved(false);
        toast({
          description: 'Removed from saved prompts',
        });
      } else {
        await supabase
          .from('bookmarks')
          .insert({ prompt_id: prompt.id, user_id: user.id });

        setPrompt(prev => prev ? { ...prev, bookmarks: prev.bookmarks + 1 } : null);
        setIsSaved(true);
        toast({
          description: 'Added to saved prompts',
        });
      }
    } catch (error) {
      toast({
        description: 'Failed to update bookmark',
        variant: 'destructive',
      });
    }
  };

  const handleCopy = async () => {
    if (!prompt) return;

    try {
      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(prompt.content);
      } else {
        // Fallback to older method
        const textArea = document.createElement('textarea');
        textArea.value = prompt.content;
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
        description: 'Prompt copied to clipboard',
      });
    } catch (err) {
      console.error('Failed to copy prompt:', err);
      toast({
        description: 'Failed to copy prompt. Please copy manually.',
        variant: 'destructive',
      });
    }
  };

  const handleDownload = () => {
    if (!prompt) return;

    const element = document.createElement('a');
    const file = new Blob([prompt.content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${prompt.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    toast({
      description: 'Prompt downloaded successfully',
    });
  };

  const handleShare = async () => {
    if (!prompt) return;

    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: prompt.title,
          text: prompt.content,
          url: url,
        });
      } catch (err) {
        // Fall back to clipboard
        handleCopyUrl();
      }
    } else {
      handleCopyUrl();
    }
  };

  const handleCopyUrl = async () => {
    try {
      const url = window.location.href;
      
      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        // Fallback to older method
        const textArea = document.createElement('textarea');
        textArea.value = url;
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
        description: 'Link copied to clipboard',
      });
    } catch (err) {
      console.error('Failed to copy link:', err);
      toast({
        description: 'Failed to copy link. Please copy manually.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-muted rounded mb-6"></div>
              <Card className="border-border bg-card">
                <CardHeader className="pb-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="h-12 w-12 bg-muted rounded-full"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-muted rounded w-24"></div>
                      <div className="h-3 bg-muted rounded w-16"></div>
                    </div>
                  </div>
                  <div className="h-6 bg-muted rounded w-3/4"></div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded"></div>
                    <div className="h-4 bg-muted rounded w-5/6"></div>
                    <div className="h-4 bg-muted rounded w-4/5"></div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!prompt) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background animate-in fade-in duration-500">
      <Navigation />

      <div className="container mx-auto px-4 py-3">
        <div className="max-w-7xl mx-auto px-5 animate-in slide-in-from-bottom-4 duration-700 delay-150">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-6 text-muted-foreground hover:text-foreground transition-all duration-200 animate-in slide-in-from-left-2 delay-200 hover:scale-105"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Prompt Detail */}
            <div className="lg:col-span-2">
              {/* Prompt Detail Card */}
              <Card className="border-border bg-card shadow-lg">
            <CardHeader className="pb-6">
              {/* Author Info */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={prompt.avatar_url || (user && user.id === prompt.user_id ? user.user_metadata?.avatar_url : null)} alt={prompt.username || 'User'} />
                    <AvatarFallback className="bg-primary text-primary-foreground font-subheading">
                      {(prompt.username || 'U')[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p
                      onClick={() => prompt.username && navigate(`/profile/${prompt.username}`)}
                      className="font-subheading text-lg text-foreground hover:text-primary cursor-pointer transition-fast"
                    >
                      @{prompt.username || 'Unknown User'}
                    </p>
                    <p className="font-caption text-sm text-muted-foreground">
                      {new Date(prompt.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>

                {/* Share Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShare}
                  className="gap-2"
                >
                  <ShareNetwork className="h-4 w-4" />
                  Share
                </Button>
              </div>

              {/* Title */}
              <h1 className="font-heading text-2xl sm:text-3xl text-foreground leading-tight">
                {prompt.title}
              </h1>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Content */}
              <div className="space-y-4">
                <div className="bg-muted/30 rounded-lg p-6 border border-border">
                  <p className="font-body text-base text-foreground leading-relaxed whitespace-pre-wrap">
                    {prompt.content}
                  </p>
                </div>
              </div>

              {/* Tags */}
              {prompt.tags && Array.isArray(prompt.tags) && prompt.tags.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-subheading text-sm text-muted-foreground uppercase tracking-wide">
                    Tags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {prompt.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="font-caption text-sm hover:bg-accent cursor-pointer transition-fast px-3 py-1"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Bar */}
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div className="flex items-center space-x-1">
                  {/* Upvote */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleUpvote}
                    className={`gap-2 transition-fast hover:bg-accent ${
                      isUpvoted ? 'text-primary hover:text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    <Heart className={`h-4 w-4 ${isUpvoted ? 'fill-current' : ''}`} />
                    <span className="font-body text-sm">{prompt.upvotes}</span>
                  </Button>

                  {/* Save */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSave}
                    className={`gap-2 transition-fast hover:bg-accent ${
                      isSaved ? 'text-primary hover:text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    <BookmarkSimple className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
                    <span className="font-body text-sm">{prompt.bookmarks}</span>
                  </Button>
                </div>

                <div className="flex items-center space-x-1">
                  {/* Copy */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    className="gap-2 text-muted-foreground hover:text-foreground hover:bg-accent transition-fast"
                  >
                    <Copy className="h-4 w-4" />
                    <span className="text-sm font-medium">Copy</span>
                  </Button>

                  {/* Download */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDownload}
                    className="gap-2 text-muted-foreground hover:text-foreground hover:bg-accent transition-fast"
                  >
                    <Download className="h-4 w-4" />
                    <span className="text-sm font-medium">Download</span>
                  </Button>
                </div>
              </div>
              </CardContent>
              </Card>
            </div>

            {/* Right Column - Stats Card */}
            <div className="lg:col-span-1">
              <Card className="border-border bg-primary/5 shadow-lg sticky top-6">
                <CardHeader className="pb-4">
                  <h3 className="font-heading text-lg text-primary font-semibold">
                    Prompt Statistics
                  </h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Engagement Stats */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Upvotes</span>
                      <div className="flex items-center gap-2">
                        <Heart className={`h-4 w-4 ${isUpvoted ? 'fill-current text-red-500' : 'text-muted-foreground'}`} />
                        <span className="font-semibold text-foreground">{prompt.upvotes}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Bookmarks</span>
                      <div className="flex items-center gap-2">
                        <BookmarkSimple className={`h-4 w-4 ${isSaved ? 'fill-current text-yellow-500' : 'text-muted-foreground'}`} />
                        <span className="font-semibold text-foreground">{prompt.bookmarks}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Created</span>
                      <span className="font-semibold text-foreground text-sm">
                        {new Date(prompt.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Characters</span>
                      <span className="font-semibold text-foreground">{prompt.content.length}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Words</span>
                      <span className="font-semibold text-foreground">
                        {prompt.content.split(/\s+/).filter(word => word.length > 0).length}
                      </span>
                    </div>

                    {prompt.tags && Array.isArray(prompt.tags) && prompt.tags.length > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Tags</span>
                        <span className="font-semibold text-foreground">{prompt.tags.length}</span>
                      </div>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="border-t border-primary/20"></div>

                  {/* Quick Use with AI Models */}
                  <div className="space-y-2">
                    {/* <h4 className="font-subheading text-sm text-primary font-medium uppercase tracking-wide">
                      Quick Use
                    </h4> */}

                    <div className="flex justify-center gap-8">
                      <div
                        onClick={async () => {
                          await handleCopy();
                          window.open('https://chatgpt.com/', '_blank');
                        }}
                        className="w-8 h-8 cursor-pointer hover:scale-110 transition-transform duration-200 hover:shadow-lg rounded-lg"
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
                          await handleCopy();
                          window.open('https://claude.ai/chat', '_blank');
                        }}
                        className="w-8 h-8 cursor-pointer hover:scale-110 transition-transform duration-200 hover:shadow-lg rounded-lg"
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
                          await handleCopy();
                          window.open('https://gemini.google.com/app', '_blank');
                        }}
                        className="w-8 h-8 cursor-pointer hover:scale-110 transition-transform duration-200 hover:shadow-lg rounded-lg"
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
                          await handleCopy();
                          window.open('https://x.ai/grok', '_blank');
                        }}
                        className="w-8 h-8 cursor-pointer hover:scale-110 transition-transform duration-200 hover:shadow-lg rounded-lg"
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
                          await handleCopy();
                          window.open('https://chat.deepseek.com/', '_blank');
                        }}
                        className="w-8 h-8 cursor-pointer hover:scale-110 transition-transform duration-200 hover:shadow-lg rounded-lg"
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
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}