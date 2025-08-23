import { useState } from 'react';
import { ArrowUp, Bookmark, Copy, Download, MoreHorizontal } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface PromptCardProps {
  id: string;
  title: string;
  content: string;
  author: {
    username: string;
    avatar?: string;
  };
  tags: string[];
  upvotes: number;
  isUpvoted: boolean;
  isSaved: boolean;
  createdAt: string;
  onUpvote: () => void;
  onBookmark: () => void;
}

export function PromptCard({
  id,
  title,
  content,
  author,
  tags,
  upvotes,
  isUpvoted,
  isSaved,
  createdAt,
  onUpvote,
  onBookmark
}: PromptCardProps) {
  const [showFullContent, setShowFullContent] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleUpvote = () => {
    onUpvote();
  };

  const handleSave = () => {
    onBookmark();
    toast({
      description: isSaved ? 'Removed from saved prompts' : 'Added to saved prompts',
    });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      toast({
        description: 'Prompt copied to clipboard',
      });
    } catch (err) {
      toast({
        description: 'Failed to copy prompt',
        variant: 'destructive',
      });
    }
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    
    toast({
      description: 'Prompt downloaded successfully',
    });
  };

  const truncatedContent = content.length > 200 ? content.substring(0, 200) + '...' : content;
  const shouldShowMore = content.length > 200;

  return (
    <Card className="w-full transition-smooth hover:shadow-lg border-border bg-card">
      <CardHeader className="pb-3 p-4 sm:p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
              <AvatarImage src={author.avatar} alt={author.username} />
              <AvatarFallback className="bg-primary text-primary-foreground font-subheading text-xs sm:text-sm">
                {author.username[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p 
                onClick={() => navigate(`/profile/${author.username}`)}
                className="font-subheading text-xs sm:text-sm text-foreground hover:text-primary cursor-pointer transition-fast"
              >
                @{author.username}
              </p>
              <p className="font-caption text-xs text-muted-foreground">
                {new Date(createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
        
        <h3 className="font-heading text-base sm:text-lg text-foreground mt-2 sm:mt-3 leading-tight">
          {title}
        </h3>
      </CardHeader>

      <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6">
        {/* Content */}
        <div className="space-y-2">
          <p className="font-body text-sm text-foreground leading-relaxed whitespace-pre-wrap">
            {showFullContent ? content : truncatedContent}
          </p>
          {shouldShowMore && (
            <button
              onClick={() => setShowFullContent(!showFullContent)}
              className="font-body text-sm text-primary hover:text-primary/80 transition-fast"
            >
              {showFullContent ? 'Show Less' : 'Show More'}
            </button>
          )}
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {tags.map((tag) => (
              <Badge 
                key={tag} 
                variant="secondary" 
                className="font-caption text-xs hover:bg-accent cursor-pointer transition-fast px-2 py-1"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Action Bar */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center space-x-0.5 sm:space-x-1">
            {/* Upvote */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleUpvote}
              className={`h-8 px-2 sm:px-3 transition-fast hover:bg-accent ${
                isUpvoted ? 'text-primary hover:text-primary' : 'text-muted-foreground'
              }`}
            >
              <ArrowUp className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 ${isUpvoted ? 'fill-current' : ''}`} />
              <span className="font-body text-xs hidden sm:inline">{upvotes}</span>
              <span className="font-body text-xs sm:hidden">{upvotes > 999 ? `${Math.floor(upvotes/1000)}k` : upvotes}</span>
            </Button>

            {/* Save */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSave}
              className={`h-8 px-2 sm:px-3 transition-fast hover:bg-accent ${
                isSaved ? 'text-primary hover:text-primary' : 'text-muted-foreground'
              }`}
            >
              <Bookmark className={`h-3 w-3 sm:h-4 sm:w-4 ${isSaved ? 'fill-current' : ''}`} />
            </Button>
          </div>

          <div className="flex items-center space-x-0.5 sm:space-x-1">
            {/* Copy */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-8 px-2 sm:px-3 text-muted-foreground hover:text-foreground hover:bg-accent transition-fast"
            >
              <Copy className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>

            {/* Download */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="h-8 px-2 sm:px-3 text-muted-foreground hover:text-foreground hover:bg-accent transition-fast"
            >
              <Download className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}