import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useAuth } from '@/hooks/useAuth';
import {
  ArrowLeft,
  ChartBar,
  Gear,
  List,
  MagnifyingGlass,
  SignOut,
  User,
  X
} from '@phosphor-icons/react';
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface NavigationProps {
  showBackButton?: boolean;
  onBack?: () => void;
}

export function Navigation({ showBackButton = false, onBack }: NavigationProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Update search query when URL changes
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const searchParam = urlParams.get('search');
    if (searchParam) {
      setSearchQuery(searchParam);
    } else {
      setSearchQuery('');
    }
  }, [location.search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/home?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/home');
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Clear search on Escape key
    if (e.key === 'Escape') {
      setSearchQuery('');
      navigate('/home');
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    navigate('/home');
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await signOut();
      if (error) {
        console.error('Error signing out:', error);
        return;
      }
      // Force page reload to ensure clean state
      window.location.href = '/auth';
    } catch (error) {
      console.error('Error during signout:', error);
    }
  };

  const isHomePage = location.pathname === '/home';
  const isAnalyticsPage = location.pathname === '/analytics';
  const isProfilePage = location.pathname.startsWith('/profile');
  const isSettingsPage = location.pathname === '/settings';

  return (
    <nav className="sticky top-0 z-50 w-full py-3 pt-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-4">
        <div className="bg-card/80 backdrop-blur-lg border border-border/50 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="flex justify-between items-center h-16 px-6">
            {/* Left Section */}
            <div className="flex items-center gap-4">
              {showBackButton && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                  className="h-9 w-9 p-0 hover:bg-muted/50"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}

              {/* Logo */}
              <img src="/upprompt.png" alt="UPPrompt" className="h-14 w-14 cursor-pointer" onClick={() => navigate('/home')}/>
            </div>

            {/* Center Section - Search Bar */}
            <div className="hidden md:flex flex-1 max-w-md mx-8">
              <form onSubmit={handleSearch} className="relative w-full">
                <MagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search prompts..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onKeyDown={handleKeyDown}
                  className="pl-10 pr-10 bg-background/50 border-border/50 rounded-lg"
                />
                {searchQuery && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearSearch}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted/50"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </form>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-3">
              {/* Theme Toggle */}
              <ThemeToggle />

              {/* Profile Icon with Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0 hover:bg-muted/50"
                  >
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={user?.user_metadata?.avatar_url} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                        {user?.user_metadata?.username?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => navigate(`/profile/${user?.user_metadata?.username || user?.id}`)}>
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/analytics')}>
                    <ChartBar className="h-4 w-4 mr-2" />
                    Analytics
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/settings')}>
                    <Gear className="h-4 w-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <SignOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Mobile Menu Button */}
              <div className="md:hidden">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="h-9 w-9 p-0"
                >
                  {isSidebarOpen ? <X className="h-5 w-5" /> : <List className="h-5 w-5" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isSidebarOpen && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-2 md:hidden">
          <div className="bg-background/95 backdrop-blur-lg border border-border/50 rounded-xl shadow-lg">
            <div className="px-4 pt-4 pb-3 space-y-1">
              {/* Search Bar for Mobile */}
              <form onSubmit={handleSearch} className="px-2 pb-2">
                <div className="relative">
                  <MagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search prompts..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onKeyDown={handleKeyDown}
                    className="pl-10 pr-10 bg-background/50 border-border/50 rounded-lg"
                  />
                  {searchQuery && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleClearSearch}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted/50"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </form>

              {/* Navigation Links */}
              <Button
                variant="ghost"
                className={`w-full justify-start ${isHomePage ? 'text-foreground bg-muted/50' : 'text-muted-foreground'}`}
                onClick={() => {
                  navigate('/home');
                  setIsSidebarOpen(false);
                }}
              >
                Home
              </Button>

              <Button
                variant="ghost"
                className={`w-full justify-start ${isAnalyticsPage ? 'text-foreground bg-muted/50' : 'text-muted-foreground'}`}
                onClick={() => {
                  navigate('/analytics');
                  setIsSidebarOpen(false);
                }}
              >
                Analytics
              </Button>

              <Button
                variant="ghost"
                className={`w-full justify-start ${isProfilePage ? 'text-foreground bg-muted/50' : 'text-muted-foreground'}`}
                onClick={() => {
                  navigate(`/profile/${user?.user_metadata?.username || user?.id}`);
                  setIsSidebarOpen(false);
                }}
              >
                Profile
              </Button>

              <Button
                variant="ghost"
                className={`w-full justify-start ${isSettingsPage ? 'text-foreground bg-muted/50' : 'text-muted-foreground'}`}
                onClick={() => {
                  navigate('/settings');
                  setIsSidebarOpen(false);
                }}
              >
                Settings
              </Button>

              <Button
                variant="ghost"
                className="w-full justify-start text-muted-foreground"
                onClick={() => {
                  handleSignOut();
                  setIsSidebarOpen(false);
                }}
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}