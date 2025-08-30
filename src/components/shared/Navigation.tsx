import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import {
  Search,
  Menu,
  X,
  User,
  ArrowLeft,
  BarChart3,
  Settings,
  LogOut
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/home?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const isHomePage = location.pathname === '/home';
  const isDashboardPage = location.pathname === '/dashboard';
  const isAnalyticsPage = location.pathname === '/analytics';
  const isProfilePage = location.pathname.startsWith('/profile');
  const isSettingsPage = location.pathname === '/settings';

  return (
    <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
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
            <Button
              variant="ghost"
              className="text-xl font-display font-bold text-primary hover:text-primary/80 hover:bg-transparent"
              onClick={() => navigate('/home')}
            >
              UPPrompt
            </Button>
          </div>

          {/* Center Section - Search Bar */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <form onSubmit={handleSearch} className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search prompts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
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
                <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/analytics')}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Analytics
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
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
                {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isSidebarOpen && (
        <div className="md:hidden border-t border-border bg-card">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {/* Search Bar for Mobile */}
            <form onSubmit={handleSearch} className="px-2 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search prompts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
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
              className={`w-full justify-start ${isDashboardPage ? 'text-foreground bg-muted/50' : 'text-muted-foreground'}`}
              onClick={() => {
                navigate('/dashboard');
                setIsSidebarOpen(false);
              }}
            >
              Dashboard
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
      )}
    </nav>
  );
}
