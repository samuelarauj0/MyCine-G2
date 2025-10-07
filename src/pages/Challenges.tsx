import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Target, Calendar, Repeat, Trophy, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const Challenges = () => {
  const { user } = useAuth();

  interface Challenge {
    id: string;
    name: string;
    description: string | null;
    type: string;
    target_value: number;
    xp_reward: number;
    current_progress: number;
    status: string;
  }

  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChallenges = async () => {
    if (!user) return;
    try {
      const { data: challengeRows } = await supabase
        .from('challenges')
        .select('*')
        .eq('is_active', true);

      const { data: progressRows } = await supabase
        .from('user_challenge_progress')
        .select('challenge_id,current_progress,status')
        .eq('user_id', user.id);

      const pMap = new Map(
        (progressRows || []).map((p: any) => [p.challenge_id, p])
      );

      const merged: Challenge[] = (challengeRows || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        type: c.type,
        target_value: c.target_value,
        xp_reward: c.xp_reward,
        current_progress: pMap.get(c.id)?.current_progress ?? 0,
        status: pMap.get(c.id)?.status ?? 'in_progress',
      }));

      setChallenges(merged);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchChallenges();
  }, [user]);

  // Realtime updates when progress changes
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('realtime-challenges-page')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_challenge_progress' },
        (payload) => {
          const uid = (payload.new as any)?.user_id ?? (payload.old as any)?.user_id;
          if (uid === user.id) fetchChallenges();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const getTypeInfo = (type: string) => {
    switch (type) {
      case 'daily':
        return {
          label: 'Diário',
          color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
          icon: Calendar
        };
      case 'weekly':
        return {
          label: 'Semanal',
          color: 'bg-green-500/20 text-green-400 border-green-500/30',
          icon: Repeat
        };
      case 'unique':
        return {
          label: 'Único',
          color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
          icon: Trophy
        };
      default:
        return {
          label: 'Desconhecido',
          color: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
          icon: Target
        };
    }
  };

  const completedChallenges = challenges.filter(c => c.status === 'completed');
  const inProgressChallenges = challenges.filter(c => c.status === 'in_progress');

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <Target className="w-8 h-8 text-primary" />
              Desafios
            </h1>
            <p className="text-muted-foreground">
              Complete desafios para ganhar XP extra e subir de nível mais rapidamente
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="shadow-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/20 p-2 rounded-full">
                    <Target className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold">{challenges.length}</div>
                    <div className="text-sm text-muted-foreground">Total</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="bg-green-500/20 p-2 rounded-full">
                    <Trophy className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <div className="font-semibold">{completedChallenges.length}</div>
                    <div className="text-sm text-muted-foreground">Concluídos</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="bg-orange-500/20 p-2 rounded-full">
                    <Clock className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <div className="font-semibold">{inProgressChallenges.length}</div>
                    <div className="text-sm text-muted-foreground">Em progresso</div>
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
                    <div className="font-semibold">
                      {challenges.reduce((sum, c) => sum + c.xp_reward, 0)}
                    </div>
                    <div className="text-sm text-muted-foreground">XP disponível</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Challenge Categories */}
          <div className="space-y-8">
            {/* Daily Challenges */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-6 h-6 text-blue-500" />
                <h2 className="text-2xl font-bold">Desafios Diários</h2>
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                  Reset em 12h 34min
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {challenges
                  .filter(c => c.type === 'daily')
                  .map((challenge) => {
                    const typeInfo = getTypeInfo(challenge.type);
                    const Icon = typeInfo.icon;
                    
                    return (
                      <Card key={challenge.id} className="shadow-card hover:shadow-primary/20 transition-shadow">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between mb-2">
                            <Badge className={typeInfo.color}>
                              <Icon className="w-3 h-3 mr-1" />
                              {typeInfo.label}
                            </Badge>
                          </div>
                          <CardTitle className="text-lg">{challenge.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">{challenge.description}</p>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                              <span>Progresso</span>
                              <span>{challenge.current_progress}/{challenge.target_value}</span>
                            </div>
                            <Progress 
                              value={(challenge.current_progress / challenge.target_value) * 100} 
                              className="h-2"
                            />
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-primary">
                                +{challenge.xp_reward} XP
                              </span>
                              {challenge.status === 'completed' ? (
                                <Button size="sm" disabled>
                                  Concluído
                                </Button>
                              ) : (
                                <Button size="sm" variant="outline" disabled>
                                  {Math.round((challenge.current_progress / challenge.target_value) * 100)}%
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            </section>

            {/* Weekly Challenges */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Repeat className="w-6 h-6 text-green-500" />
                <h2 className="text-2xl font-bold">Desafios Semanais</h2>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  Reset em 4d 12h
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {challenges
                  .filter(c => c.type === 'weekly')
                  .map((challenge) => {
                    const typeInfo = getTypeInfo(challenge.type);
                    const Icon = typeInfo.icon;
                    
                    return (
                      <Card key={challenge.id} className="shadow-card hover:shadow-primary/20 transition-shadow">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between mb-2">
                            <Badge className={typeInfo.color}>
                              <Icon className="w-3 h-3 mr-1" />
                              {typeInfo.label}
                            </Badge>
                          </div>
                          <CardTitle className="text-lg">{challenge.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">{challenge.description}</p>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                              <span>Progresso</span>
                              <span>{challenge.current_progress}/{challenge.target_value}</span>
                            </div>
                            <Progress 
                              value={(challenge.current_progress / challenge.target_value) * 100} 
                              className="h-2"
                            />
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-primary">
                                +{challenge.xp_reward} XP
                              </span>
                              <Button size="sm" variant="outline" disabled>
                                {Math.round((challenge.current_progress / challenge.target_value) * 100)}%
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            </section>

            {/* Unique Challenges */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-6 h-6 text-purple-500" />
                <h2 className="text-2xl font-bold">Desafios Únicos</h2>
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                  Permanentes
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {challenges
                  .filter(c => c.type === 'unique')
                  .map((challenge) => {
                    const typeInfo = getTypeInfo(challenge.type);
                    const Icon = typeInfo.icon;
                    
                    return (
                      <Card key={challenge.id} className="shadow-card hover:shadow-primary/20 transition-shadow">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between mb-2">
                            
                            <Badge className={typeInfo.color}>
                              <Icon className="w-3 h-3 mr-1" />
                              {typeInfo.label}
                            </Badge>
                          </div>
                          <CardTitle className="text-lg">{challenge.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">{challenge.description}</p>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                              <span>Progresso</span>
                              <span>{challenge.current_progress}/{challenge.target_value}</span>
                            </div>
                            <Progress 
                              value={(challenge.current_progress / challenge.target_value) * 100} 
                              className="h-2"
                            />
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-primary">
                                +{challenge.xp_reward} XP
                              </span>
                              <Button size="sm" variant="outline" disabled>
                                {Math.round((challenge.current_progress / challenge.target_value) * 100)}%
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Challenges;