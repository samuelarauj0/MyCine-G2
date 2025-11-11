import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/layout/Header';
import { PromoBanner } from '@/components/PromoBanner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, Star, Lock, CheckCircle } from 'lucide-react';

interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  requirement_type: string;
  requirement_value: number;
  xp_reward: number;
  unlocked: boolean;
  progress: number;
}

const Achievements = () => {
  const { user } = useAuth();

  // Fetch achievements and user progress
  const { data: achievementsData, isLoading } = useQuery({
    queryKey: ['achievements', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Fetch all achievements
      const { data: achievements, error: achievementsError } = await supabase
        .from('achievements')
        .select('*')
        .eq('is_active', true)
        .order('requirement_value');
      
      if (achievementsError) throw achievementsError;

      // Fetch user achievements
      const { data: userAchievements, error: userAchievementsError } = await supabase
        .from('user_achievements')
        .select('achievement_id')
        .eq('user_id', user.id);
      
      if (userAchievementsError) throw userAchievementsError;

      // Fetch user stats for progress calculation
      const [reviewsResult, userXpResult, highRatingsResult, lowRatingsResult, commentsResult] = await Promise.all([
        supabase.from('reviews').select('rating, comment, title_id').eq('user_id', user.id),
        supabase.from('user_xp').select('level').eq('user_id', user.id).single(),
        supabase.from('reviews').select('id').eq('user_id', user.id).gte('rating', 5),
        supabase.from('reviews').select('id').eq('user_id', user.id).lte('rating', 2),
        supabase.from('reviews').select('comment').eq('user_id', user.id).not('comment', 'is', null)
      ]);

      // Calculate stats
      const totalReviews = reviewsResult.data?.length || 0;
      const userLevel = userXpResult.data?.level || 1;
      const highRatings = highRatingsResult.data?.length || 0;
      const lowRatings = lowRatingsResult.data?.length || 0;
      const commentsCount = reviewsResult.data?.filter(review => review.comment && review.comment.trim().length > 0).length || 0;
      
      // Calculate genres explored
      const { data: titlesWithCategories } = await supabase
        .from('reviews')
        .select(`
          title_id,
          titles!inner(
            title_categories(
              categories(name)
            )
          )
        `)
        .eq('user_id', user.id);

      const uniqueGenres = new Set();
      titlesWithCategories?.forEach(review => {
        const title = review.titles as any;
        title?.title_categories?.forEach((tc: any) => {
          if (tc.categories?.name) {
            uniqueGenres.add(tc.categories.name);
          }
        });
      });
      
      const genresExplored = uniqueGenres.size;

      const unlockedAchievementIds = new Set(userAchievements?.map(ua => ua.achievement_id) || []);

      // Map achievements with progress and auto-unlock completed ones
      const achievementsWithProgress = achievements?.map(achievement => {
        let progress = 0;
        
        switch (achievement.requirement_type) {
          case 'reviews_count':
            progress = totalReviews;
            break;
          case 'level':
            progress = userLevel;
            break;
          case 'high_ratings':
            progress = highRatings;
            break;
          case 'low_ratings':
            progress = lowRatings;
            break;
          case 'comments_count':
            progress = commentsCount;
            break;
          case 'genres_explored':
            progress = genresExplored;
            break;
        }

        const isCompleted = progress >= achievement.requirement_value;
        const wasAlreadyUnlocked = unlockedAchievementIds.has(achievement.id);

        // Auto-unlock achievement if completed but not yet unlocked
        if (isCompleted && !wasAlreadyUnlocked) {
          // Don't await this, let it run in background
          supabase
            .from('user_achievements')
            .insert({
              user_id: user.id,
              achievement_id: achievement.id
            })
            .then(() => {
              // Optionally refresh data or show toast
              console.log(`Achievement unlocked: ${achievement.name}`);
            });
          
          unlockedAchievementIds.add(achievement.id);
        }

        return {
          ...achievement,
          progress: Math.min(progress, achievement.requirement_value),
          unlocked: unlockedAchievementIds.has(achievement.id)
        };
      }) || [];

      return achievementsWithProgress;
    },
    enabled: !!user?.id
  });

  const getRarityInfo = (xpReward: number) => {
    if (xpReward >= 300) {
      return {
        label: 'Lendária',
        color: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
        border: 'border-purple-500/50'
      };
    } else if (xpReward >= 150) {
      return {
        label: 'Épica',
        color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
        border: 'border-purple-500/30'
      };
    } else if (xpReward >= 75) {
      return {
        label: 'Rara',
        color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        border: 'border-blue-500/30'
      };
    } else {
      return {
        label: 'Comum',
        color: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
        border: 'border-gray-500/30'
      };
    }
  };

  const achievements = achievementsData || [];
  const unlockedAchievements = achievements.filter(a => a.unlocked);
  const lockedAchievements = achievements.filter(a => !a.unlocked);

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
      <PromoBanner />
      
      <main className="container mx-auto p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <Trophy className="w-8 h-8 text-primary" />
              Conquistas
            </h1>
            <p className="text-muted-foreground">
              Desbloqueie conquistas avaliando filmes e séries
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="shadow-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/20 p-2 rounded-full">
                    <Trophy className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold">{achievements.length}</div>
                    <div className="text-sm text-muted-foreground">Total</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="bg-green-500/20 p-2 rounded-full">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <div className="font-semibold">{unlockedAchievements.length}</div>
                    <div className="text-sm text-muted-foreground">Desbloqueadas</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="bg-orange-500/20 p-2 rounded-full">
                    <Lock className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <div className="font-semibold">{lockedAchievements.length}</div>
                    <div className="text-sm text-muted-foreground">Bloqueadas</div>
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
                    <div className="font-semibold">
                      {achievements.reduce((sum, a) => sum + (a.unlocked ? a.xp_reward : 0), 0)}
                    </div>
                    <div className="text-sm text-muted-foreground">XP conquistado</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Progress Overview */}
          <Card className="shadow-card mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" />
                Progresso Geral
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Conquistas Desbloqueadas</span>
                  <span>{unlockedAchievements.length}/{achievements.length}</span>
                </div>
                <Progress 
                  value={(unlockedAchievements.length / achievements.length) * 100}
                  className="h-3"
                />
                <p className="text-sm text-muted-foreground">
                  {achievements.length - unlockedAchievements.length} conquistas restantes
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Achievement Categories */}
          <div className="space-y-8">
            {/* Unlocked Achievements */}
            {unlockedAchievements.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                  <h2 className="text-2xl font-bold">Conquistas Desbloqueadas</h2>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    {unlockedAchievements.length}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {unlockedAchievements.map((achievement) => {
                    const rarity = getRarityInfo(achievement.xp_reward);
                    
                    return (
                      <Card 
                        key={achievement.id} 
                        className={`shadow-card hover:shadow-primary/20 transition-shadow ${rarity.border} bg-gradient-to-br from-green-500/5 to-emerald-500/5`}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-3xl">{achievement.icon}</span>
                            <Badge className={rarity.color}>
                              {rarity.label}
                            </Badge>
                          </div>
                          <CardTitle className="text-lg">{achievement.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">{achievement.description}</p>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-green-500">
                              <CheckCircle className="w-4 h-4" />
                              <span className="text-sm font-medium">Desbloqueada</span>
                            </div>
                            <span className="text-sm font-medium text-primary">
                              +{achievement.xp_reward} XP
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Locked Achievements */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Lock className="w-6 h-6 text-muted-foreground" />
                <h2 className="text-2xl font-bold">Conquistas Bloqueadas</h2>
                <Badge variant="outline">
                  {lockedAchievements.length}
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {lockedAchievements.map((achievement) => {
                  const rarity = getRarityInfo(achievement.xp_reward);
                  const progressPercentage = (achievement.progress / achievement.requirement_value) * 100;
                  
                  return (
                    <Card 
                      key={achievement.id} 
                      className={`shadow-card hover:shadow-primary/20 transition-shadow ${rarity.border} opacity-80`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-3xl grayscale">{achievement.icon}</span>
                          <Badge className={rarity.color}>
                            {rarity.label}
                          </Badge>
                        </div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Lock className="w-4 h-4 text-muted-foreground" />
                          {achievement.name}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">{achievement.description}</p>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span>Progresso</span>
                            <span>{achievement.progress}/{achievement.requirement_value}</span>
                          </div>
                          <Progress 
                            value={progressPercentage}
                            className="h-2"
                          />
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                              {Math.round(progressPercentage)}% completo
                            </span>
                            <span className="text-sm font-medium text-primary">
                              +{achievement.xp_reward} XP
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Achievement Tips */}
          <Card className="shadow-card mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-primary" />
                Dicas para Conquistar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">💡 Para Iniciantes</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Comece avaliando filmes que você já assistiu</li>
                    <li>• Escreva comentários para ganhar XP extra</li>
                    <li>• Explore diferentes gêneros de filmes e séries</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">🚀 Para Avançados</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Mantenha uma rotina diária de avaliações</li>
                    <li>• Participe dos desafios semanais</li>
                    <li>• Ajude a comunidade com avaliações detalhadas</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Achievements;