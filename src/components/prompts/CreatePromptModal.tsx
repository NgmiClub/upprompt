import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface CreatePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPromptCreated: () => void;
}

const suggestedTags = [
  'Midjourney',
  'GPT-4',
  'Code Generation',
  'Creative Writing',
  'Data Analysis',
  'Image Generation',
  'Business',
  'Marketing',
  'Education',
  'Research'
];

export function CreatePromptModal({ isOpen, onClose, onPromptCreated }: CreatePromptModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleCustomTagAdd = () => {
    if (customTag.trim() && !selectedTags.includes(customTag.trim())) {
      setSelectedTags(prev => [...prev, customTag.trim()]);
      setCustomTag('');
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      toast({
        description: 'Please fill in both title and content',
        variant: 'destructive',
      });
      return;
    }

    if (!user) {
      toast({
        description: 'You must be logged in to create a prompt',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { error } = await supabase
        .from('prompts')
        .insert({
          user_id: user.id,
          title: title.trim(),
          content: content.trim(),
          tags: selectedTags
        });

      if (error) throw error;
      
      toast({
        description: 'Prompt created successfully!',
      });
      
      // Reset form
      setTitle('');
      setContent('');
      setSelectedTags([]);
      setCustomTag('');
      onPromptCreated();
    } catch (error) {
      toast({
        description: 'Failed to create prompt',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setTitle('');
      setContent('');
      setSelectedTags([]);
      setCustomTag('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border mx-4 sm:mx-0">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl text-foreground">
            Create New Prompt
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <label className="font-subheading text-sm text-foreground">
              Title
            </label>
            <Input
              placeholder="Give your prompt a descriptive title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-input border-border focus:ring-ring transition-smooth w-full"
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <label className="font-subheading text-sm text-foreground">
              Prompt Content
            </label>
            <Textarea
              placeholder="Write your prompt here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[150px] sm:min-h-[200px] bg-input border-border focus:ring-ring transition-smooth resize-none w-full"
            />
            <p className="font-caption text-xs text-muted-foreground">
              {content.length} characters
            </p>
          </div>

          {/* Tags */}
          <div className="space-y-3">
            <label className="font-subheading text-sm text-foreground">
              Tags
            </label>
            
            {/* Selected Tags */}
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="default"
                    className="cursor-pointer hover:bg-primary/80 transition-fast"
                    onClick={() => handleTagToggle(tag)}
                  >
                    {tag}
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
              </div>
            )}

            {/* Custom Tag Input */}
            <div className="flex space-x-2">
              <Input
                placeholder="Add custom tag..."
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCustomTagAdd();
                  }
                }}
                className="bg-input border-border focus:ring-ring transition-smooth flex-1"
              />
              <Button
                variant="outline"
                onClick={handleCustomTagAdd}
                disabled={!customTag.trim()}
                className="border-border hover:bg-accent transition-fast px-3"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Suggested Tags */}
            <div className="space-y-2">
              <p className="font-caption text-xs text-muted-foreground">Suggested tags:</p>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {suggestedTags
                  .filter(tag => !selectedTags.includes(tag))
                  .map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="cursor-pointer hover:bg-accent transition-fast text-xs px-2 py-1"
                    onClick={() => handleTagToggle(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4 border-t border-border">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="border-border hover:bg-accent transition-fast w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !title.trim() || !content.trim()}
              className="transition-smooth hover:scale-105 w-full sm:w-auto"
            >
              {isSubmitting ? 'Creating...' : 'Create Prompt'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}