import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { CreatePromptModal } from './CreatePromptModal';

interface QuickCreateBoxProps {
  onPromptCreated: () => void;
}

export function QuickCreateBox({ onPromptCreated }: QuickCreateBoxProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Card className="w-full border-border bg-card mb-4 sm:mb-6 transition-smooth hover:shadow-md">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
              <AvatarImage src="" alt="" />
              <AvatarFallback className="bg-primary text-primary-foreground font-subheading text-xs sm:text-sm">
                U
              </AvatarFallback>
            </Avatar>
            
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex-1 flex items-center space-x-2 sm:space-x-3 p-3 sm:p-4 rounded-lg bg-input hover:bg-accent transition-smooth text-left group"
            >
              <Plus className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground group-hover:text-primary transition-fast" />
              <span className="font-body text-sm sm:text-base text-muted-foreground group-hover:text-foreground transition-fast">
                Share your AI prompt...
              </span>
            </button>
          </div>
        </CardContent>
      </Card>

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