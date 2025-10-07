import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, Crown, Medal, Star, TrendingUp, Info } from 'lucide-react';

interface LeaderboardUser {
  id: string;
  display_name: string;
  avatar_url?: string;
  total_xp: number;
  level: number;
  rank: string;
  reviews_count: number;
  position: number;
}

const Leaderboard = () => {
  const { user } = useAuth();

  // Fetch leaderboard data
  const { data: leaderboardData, isLoading } = useQuery({
    queryKey: ['leaderboard'],
    refetchInterval: 60000, // Refresh every minute
    queryFn: async () => {
      // Fetch all users with their XP and levels
      const { data: allUsers } = await supabase
        .from('user_xp')
        .select('user_id, total_xp, level')
        .order('total_xp', { ascending: false });

      if (!allUsers) return { topUsers: [], stats: { totalUsers: 0, totalReviews: 0, avgRating: '0.0', legendUsers: 0 } };

      // Get all user IDs
      const userIds = allUsers.map(u => u.user_id);

      // Fetch profiles for all users
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);

      // Create a map of profiles by user_id
      const profileMap = (profiles || []).reduce((acc: any, profile) => {
        acc[profile.user_id] = profile;
        return acc;
      }, {});

      // Get review counts for each user
      const { data: reviewCounts } = await supabase
        .from('reviews')
        .select('user_id')
        .in('user_id', userIds);

      // Count reviews per user
      const reviewCountMap = (reviewCounts || []).reduce((acc: any, review) => {
        acc[review.user_id] = (acc[review.user_id] || 0) + 1;
        return acc;
      }, {});

      // Get stats
      const [totalUsersResult, totalReviewsResult, avgRatingResult] = await Promise.all([
        supabase.from('user_xp').select('*', { count: 'exact', head: true }),
        supabase.from('reviews').select('*', { count: 'exact', head: true }),
        supabase.from('reviews').select('rating')
      ]);

      const avgRating = avgRatingResult.data?.length 
        ? (avgRatingResult.data.reduce((sum, r) => sum + r.rating, 0) / avgRatingResult.data.length).toFixed(1)
        : '0.0';

      return {
        topUsers: allUsers.map((userXp, index) => ({
          id: userXp.user_id,
          display_name: profileMap[userXp.user_id]?.display_name || 'Usuário',
          avatar_url: profileMap[userXp.user_id]?.avatar_url,
          total_xp: userXp.total_xp,
          level: userXp.level,
          rank: getRankFromLevel(userXp.level),
          reviews_count: reviewCountMap[userXp.user_id] || 0,
          position: index + 1
        })),
        stats: {
          totalUsers: totalUsersResult.count || 0,
          totalReviews: totalReviewsResult.count || 0,
          avgRating,
          legendUsers: allUsers.filter(u => u.level >= 10).length
        }
      };
    }
  });

  // Fetch current user position
  const { data: currentUserData } = useQuery({
    queryKey: ['currentUserRank', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data: userXp } = await supabase
        .from('user_xp')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!userXp) return null;

      // Get user's rank position
      const { count: usersAboveCount } = await supabase
        .from('user_xp')
        .select('*', { count: 'exact', head: true })
        .gt('total_xp', userXp.total_xp);

      const { count: reviewsCount } = await supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('user_id', user.id)
        .maybeSingle();

      return {
        ...userXp,
        position: (usersAboveCount || 0) + 1,
        reviews_count: reviewsCount || 0,
        rank: getRankFromLevel(userXp.level),
        display_name: profile?.display_name || 'Você',
        avatar_url: profile?.avatar_url
      };
    },
    enabled: !!user?.id
  });

  const getRankFromLevel = (level: number): string => {
    if (level >= 10) return 'DIAMANTE';
    if (level >= 7) return 'OURO';
    if (level >= 4) return 'PRATA';
    return 'BRONZE';
  };

  const getRankColor = (rank: string) => {
    const colors = {
      'BRONZE': 'bg-orange-600/20 text-orange-400 border-orange-600/30',
      'PRATA': 'bg-slate-600/20 text-slate-600 border-slate-600/30',
      'OURO': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      'DIAMANTE': 'bg-blue-400/20 text-blue-300 border-blue-400/30'
    };
    return colors[rank as keyof typeof colors] || colors.BRONZE;
  };

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Medal className="w-6 h-6 text-orange-500" />;
      default:
        return <span className="w-6 h-6 flex items-center justify-center text-sm font-bold">#{position}</span>;
    }
  };

  const levelRanks = [
    { level: '1-3', rank: 'BRONZE', color: 'text-orange-400', xp: '0 - 500 XP' },
    { level: '4-6', rank: 'PRATA', color: 'text-slate-600', xp: '500 - 1,000 XP' },
    { level: '7-9', rank: 'OURO', color: 'text-yellow-400', xp: '1,000 - 2,500 XP' },
    { level: '10+', rank: 'DIAMANTE', color: 'text-blue-300', xp: '2,500+ XP' }
  ];

  const topUsers = leaderboardData?.topUsers || [];
  const stats = leaderboardData?.stats || { totalUsers: 0, totalReviews: 0, avgRating: '0.0', legendUsers: 0 };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto p-6">
          <div className="flex items-center justify-center min-h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <Trophy className="w-8 h-8 text-primary" />
              Ranking Global
            </h1>
            <p className="text-muted-foreground">
              Os melhores críticos da comunidade MyCine G
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-3 space-y-8">
              {/* Podium */}
              <div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {topUsers.slice(0, 3).map((user, index) => (
                    <Card 
                      key={user.id} 
                      className={`shadow-card relative overflow-hidden ${
                        index === 0 ? 'order-1 md:order-2 md:scale-110' : 
                        index === 1 ? 'order-2 md:order-1' : 'order-3 md:order-3'
                      }`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5"></div>
                      <CardContent className="relative p-6 text-center">
                        <div className="mb-4">
                          {getPositionIcon(user.position)}
                        </div>
                        <Avatar className="w-16 h-16 mx-auto mb-4">
                          <AvatarImage src={user.avatar_url} />
                          <AvatarFallback>
                            {user.display_name[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <h3 className="font-semibold text-lg mb-2">{user.display_name}</h3>
                        <Badge className={`mb-3 ${getRankColor(user.rank)}`}>
                          {user.rank}
                        </Badge>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-center gap-2">
                            <Star className="w-4 h-4 text-primary" />
                            <span className="font-semibold">{user.total_xp.toLocaleString()} XP</span>
                          </div>
                          <div className="text-muted-foreground">
                            Nível {user.level} • {user.reviews_count} avaliações
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="shadow-card">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/20 p-2 rounded-full">
                        <Trophy className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-semibold">{stats.totalUsers.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">Usuários ativos</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-card">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/20 p-2 rounded-full">
                        <Star className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-semibold">{stats.totalReviews.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">Avaliações totais</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-card">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/20 p-2 rounded-full">
                        <TrendingUp className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-semibold">{stats.avgRating}</div>
                        <div className="text-sm text-muted-foreground">Nota média</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-card">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/20 p-2 rounded-full">
                        <Crown className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-semibold">{stats.legendUsers}</div>
                        <div className="text-sm text-muted-foreground">Usuários DIAMANTE</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Full Leaderboard */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Classificação Completa</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {topUsers.map((user, index) => (
                      <div 
                        key={user.id}
                        className="flex items-center gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-shrink-0 w-8 flex justify-center">
                          {getPositionIcon(user.position)}
                        </div>
                        
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={user.avatar_url} />
                          <AvatarFallback>
                            {user.display_name[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1">
                          <h4 className="font-semibold">{user.display_name}</h4>
                          <div className="text-sm text-muted-foreground">
                            {user.reviews_count} avaliações
                          </div>
                        </div>
                        
                        <Badge className={getRankColor(user.rank)}>
                          {user.rank}
                        </Badge>
                        
                        <div className="text-right">
                          <div className="font-semibold">{user.total_xp.toLocaleString()} XP</div>
                          <div className="text-sm text-muted-foreground">Nível {user.level}</div>
                        </div>
                      </div>
                    ))}
                    
                    {/* Current user position (if not in top users) */}
                    {currentUserData && !topUsers.some(u => u.id === user?.id) && (
                      <div className="border-t pt-4 mt-6">
                        <div className="flex items-center gap-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
                          <div className="flex-shrink-0 w-8 flex justify-center">
                            <span className="text-sm font-bold">#{currentUserData.position}</span>
                          </div>
                          
                          <Avatar className="w-12 h-12">
                            <AvatarImage src={currentUserData.avatar_url} />
                            <AvatarFallback>
                              <Star className="w-6 h-6" />
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1">
                            <h4 className="font-semibold">{currentUserData.display_name}</h4>
                            <div className="text-sm text-muted-foreground">
                              {currentUserData.reviews_count} avaliações
                            </div>
                          </div>
                          
                          <Badge className={getRankColor(currentUserData.rank)}>
                            {currentUserData.rank}
                          </Badge>
                          
                          <div className="text-right">
                            <div className="font-semibold">{currentUserData.total_xp.toLocaleString()} XP</div>
                            <div className="text-sm text-muted-foreground">Nível {currentUserData.level}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Ranks & Levels Sidebar */}
            <div className="lg:col-span-1">
              <Card className="shadow-card sticky top-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="w-5 h-5 text-primary" />
                    Ranks & Níveis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground mb-4">
                      Progrida de nível ganhando XP e suba de rank!
                    </p>
                    
                    {levelRanks.map((rank, index) => (
                      <div key={index} className="p-3 rounded-lg border">
                        <div className="flex items-center justify-between mb-2">
                          <Badge className={`${getRankColor(rank.rank)}`}>
                            {rank.rank}
                          </Badge>
                          <span className="text-sm font-medium">
                            Nível {rank.level}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {rank.xp}
                        </p>
                      </div>
                    ))}
                    
                    <div className="mt-6 p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <h4 className="text-sm font-semibold mb-2">Como ganhar XP?</h4>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li>• Fazer avaliações: +10 XP</li>
                        <li>• Completar desafios: +25-100 XP</li>
                        <li>• Desbloquear conquistas: +25-300 XP</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Leaderboard;