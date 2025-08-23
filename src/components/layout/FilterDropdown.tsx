import { useState } from 'react';
import { Filter, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const tags = [
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

const sortOptions = [
  { label: 'Most Up-prompts', value: 'upvotes' },
  { label: 'Newest', value: 'newest' },
  { label: 'Trending', value: 'trending' }
];

interface FilterDropdownProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
}

export function FilterDropdown({ selectedTags, onTagsChange }: FilterDropdownProps) {
  const [sortBy, setSortBy] = useState('trending');
  const [isOpen, setIsOpen] = useState(false);

  const toggleTag = (tag: string) => {
    const newTags = selectedTags.includes(tag) 
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];
    onTagsChange(newTags);
  };

  const clearFilters = () => {
    onTagsChange([]);
    setSortBy('trending');
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="h-10 px-3 hover:bg-accent transition-fast border-border"
        >
          <Filter className="h-4 w-4 mr-2" />
          Filter
          {selectedTags.length > 0 && (
            <Badge variant="secondary" className="ml-2 h-5 px-2 text-xs">
              {selectedTags.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 sm:w-96 bg-popover border-border" align="end">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h4 className="font-subheading text-sm text-foreground">Filter & Sort</h4>
            {(selectedTags.length > 0 || sortBy !== 'trending') && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearFilters}
                className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground"
              >
                Clear all
              </Button>
            )}
          </div>

          {/* Sort Options */}
          <div>
            <h5 className="font-subheading text-xs text-muted-foreground mb-2">Sort by</h5>
            <div className="space-y-1">
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSortBy(option.value)}
                  className="w-full flex items-center justify-between p-2 rounded-md hover:bg-accent transition-fast text-left"
                >
                  <span className="font-body text-sm text-foreground">{option.label}</span>
                  {sortBy === option.value && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Tags */}
          <div>
            <h5 className="font-subheading text-xs text-muted-foreground mb-2">Tags</h5>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {tags.map((tag) => (
                <Badge
                  key={tag}
                  variant={selectedTags.includes(tag) ? "default" : "outline"}
                  className="cursor-pointer transition-fast hover:scale-105 text-xs px-2 py-1"
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}