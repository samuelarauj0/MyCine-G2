import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Film, User, LogOut, Trophy, Star, Settings, Shield } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';

interface UserProfile {
  display_name?: string;
  avatar_url?: string;
  total_xp: number;
  level: number;
  rank: string;
}

interface HeaderProps {
  userProfile?: UserProfile;
}

export const Header = ({ userProfile }: HeaderProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const { data: userRole } = useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      return data?.role;
    },
    enabled: !!user?.id,
  });

  const handleSignOut = async () => {
    console.log('Header: Starting logout process...');
    
    try {
      await signOut();
      console.log('Header: SignOut completed, redirecting...');
      
      // Small delay to ensure state is cleared
      setTimeout(() => {
        window.location.href = '/auth';
      }, 100);
      
    } catch (error) {
      console.error('Header: Error during sign out:', error);
      // Force redirect even if signOut fails
      setTimeout(() => {
        window.location.href = '/auth';
      }, 100);
    }
  };

  const getRankColor = (rank: string) => {
    const colors = {
      'BRONZE': 'bg-orange-600/20 text-orange-400 border-orange-600/30',
      'PRATA': 'bg-gray-300/20 text-gray-300 border-gray-300/30',
      'OURO': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      'PLATINA': 'bg-cyan-400/20 text-cyan-300 border-cyan-400/30',
      'DIAMANTE': 'bg-blue-400/20 text-blue-300 border-blue-400/30',
      'MESTRE': 'bg-purple-400/20 text-purple-300 border-purple-400/30',
      'GRÃO-MESTRE': 'bg-red-400/20 text-red-300 border-red-400/30',
      'LENDA': 'bg-gradient-primary text-primary-foreground border-primary/30'
    };
    return colors[rank as keyof typeof colors] || colors.BRONZE;
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl">
          <div className="bg-gradient-primary p-2 rounded-lg">
            <Film className="w-5 h-5 text-primary-foreground" />
          </div>
          MyCine G
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link to="/" className="text-sm font-medium hover:text-primary transition-colors">
            Início
          </Link>
          <Link to="/catalog" className="text-sm font-medium hover:text-primary transition-colors">
            Catálogo
          </Link>
          <Link to="/leaderboard" className="text-sm font-medium hover:text-primary transition-colors">
            Ranking
          </Link>
          <Link to="/challenges" className="text-sm font-medium hover:text-primary transition-colors">
            Desafios
          </Link>
        </nav>

        {user ? (
          <div className="flex items-center gap-4">
            {userProfile && (
              <div className="hidden sm:flex items-center gap-3">
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">{userProfile.total_xp} XP</span>
                  </div>
                  <div className="text-xs text-muted-foreground">Nível {userProfile.level}</div>
                </div>
                <Badge variant="secondary" className={getRankColor(userProfile.rank)}>
                  {userProfile.rank}
                </Badge>
              </div>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={userProfile?.avatar_url} alt="Avatar" />
                    <AvatarFallback>
                      {userProfile?.display_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <div className="flex flex-col space-y-1 p-2">
                  <p className="text-sm font-medium leading-none">
                    {userProfile?.display_name || user.email}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    Perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/achievements" className="cursor-pointer">
                    <Trophy className="mr-2 h-4 w-4" />
                    Conquistas
                  </Link>
                </DropdownMenuItem>
                {userRole === 'admin' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="cursor-pointer">
                        <Shield className="mr-2 h-4 w-4" />
                        Painel Admin
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <Button asChild variant="default" className="bg-gradient-primary shadow-primary">
            <Link to="/auth">Entrar</Link>
          </Button>
        )}
      </div>
    </header>
  );
};