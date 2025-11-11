import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Film, Star, TrendingUp, Trophy, Target, Calendar, Play } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { PromoBanner } from '@/components/PromoBanner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface UserStats {
  total_xp: number;
  level: number;
  rank: string;
  reviews_count: number;
  next_level_xp: number;
  xp_progress: number;
}

interface Challenge {
  id: string;
  name: string;
  description: string;
  type: string;
  target_value: number;
  xp_reward: number;
  current_progress: number;
  status: string;
}

interface RecentTitle {
  id: string;
  name: string;
  type: string;
  poster_url: string;
  release_year: number;
  average_rating: number;
  reviews_count: number;
}

const Index = () => {
  const { user } = useAuth();
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [recentTitles, setRecentTitles] = useState<RecentTitle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  // Realtime updates for challenge progress
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('realtime-challenges-index')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_challenge_progress' },
        (payload) => {
          const uid = (payload.new as any)?.user_id ?? (payload.old as any)?.user_id;
          if (uid === user.id) {
            fetchUserData();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchUserData = async () => {
    try {
      // Fetch user XP data directly from user_xp table
      const { data: xpData, error: xpError } = await supabase
        .from('user_xp')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (!xpData && !xpError) {
        // Create initial XP record if it doesn't exist
        await supabase.from('user_xp').insert([
          { user_id: user!.id, total_xp: 0, level: 1 }
        ]);
      }

      // Fetch reviews count
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('id')
        .eq('user_id', user!.id)
        .eq('is_deleted', false);

      if (xpData || !xpError) {
        const totalXp = xpData?.total_xp || 0;
        const level = xpData?.level || 1; // Use the actual level from database
        
        // Calculate level progression using the real level thresholds
        const levelThresholds = [0, 150, 300, 500, 700, 1000, 1500, 2500, 5000, 10000];
        
        let nextLevelXp = 10000; // Max level threshold
        let xpProgress = 100; // If max level
        
        if (level < 10) {
          const currentLevelXp = levelThresholds[level - 1];
          nextLevelXp = levelThresholds[level];
          xpProgress = ((totalXp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;
        }

        // Calculate rank based on level using same logic as other pages
        const getRankFromLevel = (level: number): string => {
          if (level >= 10) return 'DIAMANTE';
          if (level >= 7) return 'OURO';
          if (level >= 4) return 'PRATA';
          return 'BRONZE';
        };

        const rank = getRankFromLevel(level);

        setUserStats({
          total_xp: totalXp,
          level: level,
          rank: rank,
          reviews_count: reviewsData?.length || 0,
          next_level_xp: nextLevelXp,
          xp_progress: Math.min(Math.max(xpProgress, 0), 100)
        });
      }
    

      // Fetch challenges with user progress
      const { data: challengesData } = await supabase
        .from('challenges')
        .select('*')
        .eq('is_active', true)
        .limit(4);

      let merged: Challenge[] = [];
      if (challengesData) {
        const { data: progressData } = await supabase
          .from('user_challenge_progress')
          .select('challenge_id,current_progress,status')
          .eq('user_id', user!.id);

        const progressMap = new Map(
          (progressData || []).map((p) => [p.challenge_id, { current_progress: p.current_progress, status: p.status }])
        );

        merged = challengesData.map((c: any) => ({
          id: c.id,
          name: c.name,
          description: c.description,
          type: c.type,
          target_value: c.target_value,
          xp_reward: c.xp_reward,
          current_progress: progressMap.get(c.id)?.current_progress ?? 0,
          status: progressMap.get(c.id)?.status ?? 'in_progress',
        }));
      }
      setChallenges(merged);


      // Fetch recent titles
      const { data: titlesData } = await supabase
        .from('titles')
        .select('*')
        .limit(6);

      if (titlesData) {
        const titlesWithStats = titlesData.map(title => ({
          id: title.id,
          name: title.name,
          type: title.type,
          poster_url: title.poster_url,
          release_year: title.release_year,
          average_rating: 0, // Will be calculated properly later
          reviews_count: 0
        }));
        setRecentTitles(titlesWithStats);
      }

    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankColor = (rank: string) => {
    const colors = {
      'BRONZE': 'bg-orange-600/20 text-orange-400 border-orange-600/30',
      'PRATA': 'bg-slate-600/20 text-white border-slate-600/30',
      'OURO': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      'DIAMANTE': 'bg-blue-400/20 text-blue-300 border-blue-400/30'
    };
    return colors[rank as keyof typeof colors] || colors.BRONZE;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header userProfile={userStats || undefined} />
        <div className="container mx-auto p-6 flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header userProfile={userStats || undefined} />
      <PromoBanner />
      
      <main className="container mx-auto p-6 space-y-8">
        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-hero p-8 text-primary-foreground">
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-primary/20 p-3 rounded-full animate-glow">
                <Film className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Bem-vindo ao MyCine G!</h1>
                <p className="text-primary-foreground/80">
                  Avalie filmes e séries, ganhe XP e conquiste seu lugar no ranking!
                </p>
              </div>
            </div>
            
            {userStats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                <Card className="bg-card/10 border-primary/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-primary-foreground flex items-center gap-2">
                      <Star className="w-5 h-5" />
                      Seu Progresso
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span>Nível {userStats.level}</span>
                        <span>{userStats.total_xp} XP</span>
                      </div>
                      <Progress 
                        value={userStats.xp_progress} 
                        className="h-2 bg-primary/20"
                      />
                      <div className="flex items-center justify-between">
                        <Badge className={getRankColor(userStats.rank)}>
                          {userStats.rank}
                        </Badge>
                        <span className="text-xs text-primary-foreground/70">
                          {userStats.reviews_count} avaliações
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-card/10 border-primary/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-primary-foreground flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Próximo Nível
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {Math.max(0, userStats.next_level_xp - userStats.total_xp)} XP
                      </div>
                      <div className="text-sm text-primary-foreground/70">
                        restantes para o nível {userStats.level + 1}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-card/10 border-primary/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-primary-foreground flex items-center gap-2">
                      <Trophy className="w-5 h-5" />
                      Ranking
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-2xl font-bold">#?</div>
                      <div className="text-sm text-primary-foreground/70">
                        posição global
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-accent/20"></div>
        </section>

        {/* Challenges Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Target className="w-6 h-6 text-primary" />
              Desafios Ativos
            </h2>
            <Button asChild variant="outline">
              <Link to="/catalog">Ver catálogo</Link>
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {challenges.map((challenge) => (
              <Card key={challenge.id} className="shadow-card hover:shadow-primary/20 transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge variant={challenge.type === 'daily' ? 'default' : challenge.type === 'weekly' ? 'secondary' : 'outline'}>
                      {challenge.type === 'daily' ? 'Diário' : 
                       challenge.type === 'weekly' ? 'Semanal' : 'Único'}
                    </Badge>
                    <span className="text-sm font-medium text-primary">+{challenge.xp_reward} XP</span>
                  </div>
                  <CardTitle className="text-base">{challenge.name}</CardTitle>
                  <CardDescription className="text-xs">{challenge.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progresso</span>
                      <span>{challenge.current_progress}/{challenge.target_value}</span>
                    </div>
                    <Progress 
                      value={(challenge.current_progress / challenge.target_value) * 100} 
                      className="h-2"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Popular Titles */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Play className="w-6 h-6 text-primary" />
              Títulos Populares
            </h2>
            <Button asChild variant="outline">
              <Link to="/catalog">Ver catálogo</Link>
            </Button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {recentTitles.map((title) => (
              <Link 
                key={title.id}
                to={`/title/${title.id}`}
                className="group"
              >
                <Card className="shadow-card hover:shadow-primary/20 transition-all group-hover:scale-105">
                  <div className="aspect-[2/3] overflow-hidden rounded-t-lg">
                    <img
                      src={title.poster_url || '/placeholder.svg'}
                      alt={title.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <CardContent className="p-3">
                    <h3 className="font-medium text-sm mb-1 line-clamp-2">{title.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{title.release_year}</span>
                      {title.reviews_count > 0 && (
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-primary text-primary" />
                          <span>{title.average_rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* Quick Actions */}
        <section className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Comece sua jornada cinéfila!</h2>
          <p className="text-muted-foreground mb-6">
            Explore nosso catálogo e faça sua primeira avaliação
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-gradient-primary shadow-primary">
              <Link to="/catalog">
                <Film className="w-5 h-5 mr-2" />
                Explorar Catálogo
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/leaderboard">
                <Trophy className="w-5 h-5 mr-2" />
                Ver Ranking
              </Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Index;