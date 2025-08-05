import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { ShoppingCart, Search, Bot, Bell, Moon, Sun, ChevronDown, User, Settings, LogOut } from "lucide-react";
import RoleSelector from "@/components/role-selector";

export default function Header() {
  const { user, logout } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isRoleSelectorOpen, setIsRoleSelectorOpen] = useState(false);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('darkMode', (!isDarkMode).toString());
  };

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-border sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Title */}
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-primary to-secondary rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-white" />
              </div>
              <span className="ml-3 text-xl font-bold text-foreground">SCLEN Procurement</span>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-lg mx-8">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search vendors, products, or POs..."
                className="w-full pl-10 pr-4"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
            {/* AI Assistant Button */}
            <Button variant="ghost" size="icon" className="relative">
              <Bot className="w-5 h-5" />
              <span className="notification-badge">1</span>
            </Button>
            
            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="notification-badge">5</span>
            </Button>
            
            {/* Dark Mode Toggle */}
            <Button variant="ghost" size="icon" onClick={toggleDarkMode}>
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            
            {/* Profile Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2 p-2">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={(user as any)?.profileImageUrl || ""} alt={(user as any)?.firstName || "User"} />
                    <AvatarFallback>
                      {(user as any)?.firstName?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:block">
                    <span className="text-sm font-medium">
                      {(user as any)?.firstName || "User"}
                    </span>
                    {(user as any)?.role && (
                      <Badge variant="secondary" className="text-xs ml-2">
                        {(user as any).role === 'buyer_admin' ? 'Buyer Admin' :
                         (user as any).role === 'buyer_user' ? 'Buyer' :
                         (user as any).role === 'sourcing_manager' ? 'Sourcing Manager' :
                         (user as any).role === 'vendor' ? 'Vendor' : (user as any).role}
                      </Badge>
                    )}
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem>
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsRoleSelectorOpen(true)}>
                  <Settings className="w-4 h-4 mr-2" />
                  Change Role
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      
      <RoleSelector 
        open={isRoleSelectorOpen} 
        onClose={() => setIsRoleSelectorOpen(false)}
        currentRole={(user as any)?.role}
      />
    </header>
  );
}
