import { useState } from 'react';
import { Search, Plus, User, Settings, LogOut, Moon, Sun, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { FilterDropdown } from './FilterDropdown';
import { CreatePromptModal } from '@/components/prompts/CreatePromptModal';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface NavigationProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  onPromptCreated?: () => void;
}

export function Navigation({ searchQuery, onSearchChange, selectedTags, onTagsChange, onPromptCreated }: NavigationProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handlePromptCreated = () => {
    setIsCreateModalOpen(false);
    onPromptCreated?.();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-lg">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-heading text-lg">W</span>
          </div>
          <span className="font-heading text-xl text-foreground hidden sm:block">upprompt</span>
        </div>

        {/* Desktop Search Bar with Filter */}
        <div className="hidden md:flex flex-1 max-w-xl mx-8 items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search prompts..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 pr-4 h-10 bg-input border-border focus:ring-ring transition-smooth"
            />
          </div>
          <FilterDropdown 
            selectedTags={selectedTags}
            onTagsChange={onTagsChange}
          />
        </div>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center space-x-3">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="h-9 w-9 p-0 hover:bg-accent transition-fast"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>

          {/* Create Post Button */}
          <Button 
            onClick={() => setIsCreateModalOpen(true)}
            className="font-subheading transition-smooth hover:scale-105"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.user_metadata?.avatar_url} alt={user?.user_metadata?.username || 'User'} />
                  <AvatarFallback className="bg-primary text-primary-foreground font-subheading">
                    {user?.user_metadata?.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-popover border-border" align="end" forceMount>
              <DropdownMenuItem 
                onClick={() => navigate('/profile')}
                className="hover:bg-accent transition-fast cursor-pointer"
              >
                <User className="mr-2 h-4 w-4" />
                <span className="font-body">Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="hover:bg-accent transition-fast">
                <Settings className="mr-2 h-4 w-4" />
                <span className="font-body">Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="hover:bg-accent transition-fast text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                <span className="font-body">Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Mobile Actions */}
        <div className="md:hidden flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="h-9 w-9 p-0 hover:bg-accent transition-fast"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
          
          {/* Mobile Menu */}
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 bg-background border-border">
              <div className="flex flex-col space-y-4 mt-6">
                {/* User Info */}
                <div className="flex items-center space-x-3 p-4 border border-border rounded-lg">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={user?.user_metadata?.avatar_url} alt={user?.user_metadata?.username || 'User'} />
                    <AvatarFallback className="bg-primary text-primary-foreground font-subheading">
                      {user?.user_metadata?.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-subheading text-sm text-foreground">
                      {user?.user_metadata?.username || user?.email}
                    </p>
                    <p className="font-caption text-xs text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </div>

                {/* Search */}
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search prompts..."
                      value={searchQuery}
                      onChange={(e) => onSearchChange(e.target.value)}
                      className="pl-10 pr-4 h-10 bg-input border-border focus:ring-ring transition-smooth"
                    />
                  </div>
                  <FilterDropdown 
                    selectedTags={selectedTags}
                    onTagsChange={onTagsChange}
                  />
                </div>

                {/* Menu Items */}
                <div className="space-y-2">
                  <Button 
                    variant="outline"
                    className="w-full justify-start font-subheading transition-smooth"
                    onClick={() => {
                      setIsCreateModalOpen(true);
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Prompt
                  </Button>
                  
                  <Button 
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => {
                      navigate('/profile');
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </Button>
                  
                  <Button 
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Button>
                  
                  <Button 
                    variant="ghost"
                    className="w-full justify-start text-destructive hover:text-destructive"
                    onClick={() => {
                      handleSignOut();
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Mobile Search Bar - Below header */}
      <div className="md:hidden border-b bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search prompts..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 pr-4 h-10 bg-input border-border focus:ring-ring transition-smooth"
              />
            </div>
            <FilterDropdown 
              selectedTags={selectedTags}
              onTagsChange={onTagsChange}
            />
          </div>
        </div>
      </div>

      {/* Create Prompt Modal */}
      <CreatePromptModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onPromptCreated={handlePromptCreated}
      />
    </header>
  );
}