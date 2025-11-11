import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/layout/Header';
import { PromoBanner } from '@/components/PromoBanner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { User, Star, Trophy, Target, Calendar, Edit2, Save, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const Profile = () => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');

  // Fetch user data
  const { data: userData, isLoading } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Fetch user XP and level
      const { data: userXp } = await supabase
        .from('user_xp')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Fetch user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Fetch user reviews count
      const { data: reviews } = await supabase
        .from('reviews')
        .select('id, rating, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Fetch user achievements
      const { data: achievements } = await supabase
        .from('user_achievements')
        .select(`
          achievement_id,
          unlocked_at,
          achievements!inner(name, icon, xp_reward)
        `)
        .eq('user_id', user.id)
        .order('unlocked_at', { ascending: false })
        .limit(3);

      return {
        userXp: userXp || { total_xp: 0, level: 1 },
        profile: profile || {},
        reviews: reviews || [],
        achievements: achievements || []
      };
    },
    enabled: !!user?.id
  });

  // Calculate level progress
  const getLevelInfo = (level: number, totalXp: number) => {
    const levelThresholds = [0, 150, 300, 500, 700, 1000, 1500, 2500, 5000, 10000];
    
    if (level >= 10) {
      return {
        currentLevelXp: levelThresholds[9],
        nextLevelXp: levelThresholds[9],
        progress: 100,
        levelName: 'DIAMANTE'
      };
    }

    const currentLevelXp = levelThresholds[level - 1];
    const nextLevelXp = levelThresholds[level];
    const progress = level === 10 ? 100 : ((totalXp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;
    
    const levelNames = ['BRONZE', 'BRONZE', 'BRONZE', 'PRATA', 'PRATA', 'PRATA', 'OURO', 'OURO', 'PLATINA', 'DIAMANTE'];
    
    return {
      currentLevelXp,
      nextLevelXp,
      progress: Math.max(0, Math.min(100, progress)),
      levelName: levelNames[level - 1] || 'BRONZE'
    };
  };

  const userXp = userData?.userXp || { total_xp: 0, level: 1 };
  const profile = userData?.profile || {};
  const reviews = userData?.reviews || [];
  const achievements = userData?.achievements || [];
  
  const levelInfo = getLevelInfo(userXp.level, userXp.total_xp);

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
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <User className="w-8 h-8 text-primary" />
              Meu Perfil
            </h1>
            <p className="text-muted-foreground">
              Gerencie suas informações e acompanhe seu progresso
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile Info */}
            <div className="lg:col-span-1">
              <Card className="shadow-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Informações Pessoais</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditing(!isEditing)}
                    >
                      {isEditing ? <X className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <Avatar className="w-24 h-24 mx-auto mb-4">
                      <AvatarImage src="" />
                      <AvatarFallback>
                        <User className="w-12 h-12" />
                      </AvatarFallback>
                    </Avatar>
                    
                     {isEditing ? (
                       <div className="space-y-3">
                         <div>
                           <Label htmlFor="displayName">Nome de exibição</Label>
                           <Input
                             id="displayName"
                             value={displayName}
                             onChange={(e) => setDisplayName(e.target.value)}
                             placeholder="Seu nome"
                           />
                         </div>
                         <Button size="sm" className="w-full">
                           <Save className="w-4 h-4 mr-2" />
                           Salvar
                         </Button>
                       </div>
                     ) : (
                       <div>
                         <h3 className="font-semibold text-lg">
                           {(profile as any)?.display_name || user?.email?.split('@')[0] || 'Usuário'}
                         </h3>
                         <p className="text-muted-foreground text-sm">{user?.email}</p>
                         <Badge variant="secondary" className="mt-2">
                           Usuário
                         </Badge>
                       </div>
                     )}
                  </div>
                </CardContent>
              </Card>

              {/* Stats Cards */}
              <div className="space-y-4 mt-6">
                <Card className="shadow-card">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/20 p-2 rounded-full">
                        <Star className="w-5 h-5 text-primary" />
                      </div>
                       <div>
                         <div className="font-semibold">{userXp.total_xp} XP</div>
                         <div className="text-sm text-muted-foreground">Experiência total</div>
                       </div>
                     </div>
                   </CardContent>
                 </Card>

                 <Card className="shadow-card">
                   <CardContent className="p-4">
                     <div className="flex items-center gap-3">
                       <div className="bg-primary/20 p-2 rounded-full">
                         <Trophy className="w-5 h-5 text-primary" />
                       </div>
                       <div>
                         <div className="font-semibold">Nível {userXp.level}</div>
                         <div className="text-sm text-muted-foreground">{levelInfo.levelName}</div>
                       </div>
                     </div>
                   </CardContent>
                 </Card>

                 <Card className="shadow-card">
                   <CardContent className="p-4">
                     <div className="flex items-center gap-3">
                       <div className="bg-primary/20 p-2 rounded-full">
                         <Target className="w-5 h-5 text-primary" />
                       </div>
                       <div>
                         <div className="font-semibold">{reviews.length}</div>
                         <div className="text-sm text-muted-foreground">Avaliações feitas</div>
                       </div>
                     </div>
                   </CardContent>
                 </Card>
              </div>
            </div>

            {/* Progress & Activities */}
            <div className="lg:col-span-2 space-y-6">
              {/* Level Progress */}
               <Card className="shadow-card">
                 <CardHeader>
                   <CardTitle className="flex items-center gap-2">
                     <Star className="w-5 h-5 text-primary" />
                     Progresso de Nível
                   </CardTitle>
                 </CardHeader>
                 <CardContent>
                   <div className="space-y-4">
                     <div className="flex justify-between text-sm">
                       <span>Nível {userXp.level}</span>
                       <span>{userXp.total_xp} / {levelInfo.nextLevelXp} XP</span>
                     </div>
                     <Progress value={levelInfo.progress} className="h-3" />
                     <p className="text-sm text-muted-foreground">
                       {levelInfo.progress >= 100 
                         ? `Parabéns! Você alcançou o nível máximo ${levelInfo.levelName}!`
                         : `Continue avaliando para subir de nível! Faltam ${levelInfo.nextLevelXp - userXp.total_xp} XP.`
                       }
                     </p>
                   </div>
                 </CardContent>
               </Card>

               {/* Recent Activity */}
               <Card className="shadow-card">
                 <CardHeader>
                   <CardTitle className="flex items-center gap-2">
                     <Calendar className="w-5 h-5 text-primary" />
                     Atividade Recente
                   </CardTitle>
                 </CardHeader>
                 <CardContent>
                   {reviews.length > 0 ? (
                     <div className="space-y-3">
                       {reviews.slice(0, 3).map((review: any, index: number) => (
                         <div key={review.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                           <div className="flex items-center gap-1">
                             {[...Array(5)].map((_, i) => (
                               <Star
                                 key={i}
                                 className={`w-4 h-4 ${
                                   i < review.rating ? 'text-yellow-400 fill-current' : 'text-muted-foreground'
                                 }`}
                               />
                             ))}
                           </div>
                           <div className="flex-1">
                             <p className="text-sm text-muted-foreground">
                               Avaliação feita em {new Date(review.created_at).toLocaleDateString('pt-BR')}
                             </p>
                           </div>
                         </div>
                       ))}
                       {reviews.length > 3 && (
                         <p className="text-sm text-muted-foreground text-center">
                           E mais {reviews.length - 3} avaliações...
                         </p>
                       )}
                     </div>
                   ) : (
                     <div className="text-center py-8">
                       <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                       <h3 className="text-lg font-semibold mb-2">Nenhuma atividade ainda</h3>
                       <p className="text-muted-foreground mb-4">
                         Suas avaliações e conquistas aparecerão aqui
                       </p>
                       <Button asChild>
                         <a href="/catalog">Explorar Catálogo</a>
                       </Button>
                     </div>
                   )}
                 </CardContent>
               </Card>

               {/* Achievements Preview */}
               <Card className="shadow-card">
                 <CardHeader>
                   <CardTitle className="flex items-center gap-2 justify-between">
                     <div className="flex items-center gap-2">
                       <Trophy className="w-5 h-5 text-primary" />
                       Conquistas
                     </div>
                     <Button variant="outline" size="sm" asChild>
                       <a href="/achievements">Ver todas</a>
                     </Button>
                   </CardTitle>
                 </CardHeader>
                 <CardContent>
                   {achievements.length > 0 ? (
                     <div className="space-y-3">
                       {achievements.map((userAchievement: any) => {
                         const achievement = userAchievement.achievements;
                         return (
                           <div key={userAchievement.achievement_id} className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
                             <span className="text-2xl">{achievement.icon}</span>
                             <div className="flex-1">
                               <h4 className="font-semibold">{achievement.name}</h4>
                               <p className="text-sm text-muted-foreground">
                                 +{achievement.xp_reward} XP • Desbloqueada em {new Date(userAchievement.unlocked_at).toLocaleDateString('pt-BR')}
                               </p>
                             </div>
                           </div>
                         );
                       })}
                       <Button variant="outline" className="w-full mt-4" asChild>
                         <a href="/achievements">Ver todas as conquistas</a>
                       </Button>
                     </div>
                   ) : (
                     <div className="text-center py-8">
                       <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                       <h3 className="text-lg font-semibold mb-2">Nenhuma conquista desbloqueada</h3>
                       <p className="text-muted-foreground mb-4">
                         Comece avaliando filmes e séries para desbloquear conquistas
                       </p>
                       <Button asChild>
                         <a href="/achievements">Ver conquistas disponíveis</a>
                       </Button>
                     </div>
                   )}
                 </CardContent>
               </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;