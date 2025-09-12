import { useState } from 'react';
// Using text alternative for icon
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { CreatePromptModal } from './CreatePromptModal';

interface QuickCreateBoxProps {
  onPromptCreated: () => void;
  availableTags?: string[];
  filterTags?: string[];
  onToggleTagFilter?: (tag: string) => void;
  onClearFilters?: () => void;
}

export function QuickCreateBox({ 
  onPromptCreated, 
  availableTags = [], 
  filterTags = [], 
  onToggleTagFilter,
  onClearFilters 
}: QuickCreateBoxProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user } = useAuth();

  return (
    <>
      <Card className="w-full border-border bg-card mb-4 sm:mb-6 transition-smooth hover:shadow-md">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
              <AvatarImage src={user?.user_metadata?.avatar_url} alt={user?.user_metadata?.username || 'User'} />
              <AvatarFallback className="bg-primary text-primary-foreground font-subheading text-xs sm:text-sm">
                {user?.user_metadata?.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex-1 flex items-center space-x-2 sm:space-x-3 p-3 sm:p-4 rounded-lg bg-input hover:bg-input/50 transition-smooth text-left group "
            >
              <span className="font-body text-sm sm:text-base text-muted-foreground group-hover:text-foreground transition-fast ">
                Share your AI prompt...
              </span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Horizontal scrollable filters */}
      {availableTags.length > 0 && (
        <div className="mb-2 sm:mb-6">
          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
            <div className="flex gap-2 shrink-0">
              {availableTags.slice(0, 15).map((tag) => (
                <button
                  key={tag}
                  onClick={() => onToggleTagFilter?.(tag)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                    filterTags.includes(tag)
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-secondary hover:bg-secondary/80 text-foreground'
                  }`}
                >
                  #{tag}
                </button>
              ))}
              {availableTags.length > 15 && (
                <div className="px-3 py-1.5 text-sm text-muted-foreground whitespace-nowrap">
                  +{availableTags.length - 15} more
                </div>
              )}
            </div>
            {filterTags.length > 0 && (
              <Button
                onClick={onClearFilters}
                variant="outline"
                size="sm"
                className="shrink-0 ml-2"
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      )}

      <CreatePromptModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        onPromptCreated={() => {
          setIsModalOpen(false);
          onPromptCreated();
        }}
      />
    </>
  );
}