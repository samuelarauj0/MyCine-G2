import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, MessageSquare, Award, TrendingUp } from 'lucide-react';

export const AdminDashboard = () => {
  // Fetch dashboard metrics
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['admin-dashboard-metrics'],
    refetchInterval: 30000, // Refresh every 30 seconds
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      // Active users today (users who created reviews today)
      const { count: activeUsersToday } = await supabase
        .from('reviews')
        .select('user_id', { count: 'exact', head: true })
        .gte('created_at', today);

      // Reviews today
      const { count: reviewsToday } = await supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today);

      // Average XP per user
      const { data: avgXpData } = await supabase
        .from('user_xp')
        .select('total_xp');
      
      const avgXp = avgXpData?.length 
        ? Math.round(avgXpData.reduce((sum, user) => sum + user.total_xp, 0) / avgXpData.length)
        : 0;

      // Count total registered titles
      const { count: totalTitles } = await supabase
        .from('titles')
        .select('*', { count: 'exact', head: true });

      // Top rated titles - get all reviews to calculate proper averages
      const { data: allReviews } = await supabase
        .from('reviews')
        .select(`
          title_id,
          rating,
          titles (
            name,
            type
          )
        `)
        .eq('is_deleted', false);

      // Group by title and calculate averages
      const titleRatings = allReviews?.reduce((acc: any, review: any) => {
        const titleId = review.title_id;
        if (!acc[titleId]) {
          acc[titleId] = {
            title: review.titles,
            ratings: [],
            totalRating: 0,
            count: 0
          };
        }
        acc[titleId].ratings.push(review.rating);
        acc[titleId].totalRating += review.rating;
        acc[titleId].count += 1;
        return acc;
      }, {});

      const topRatedTitles = Object.values(titleRatings || {})
        .filter((title: any) => title.count >= 2) // Minimum 2 reviews to be considered
        .map((title: any) => ({
          ...title.title,
          avgRating: (title.totalRating / title.count).toFixed(1),
          reviewCount: title.count
        }))
        .sort((a: any, b: any) => {
          // Sort by average rating, then by review count as tiebreaker
          const avgDiff = parseFloat(b.avgRating) - parseFloat(a.avgRating);
          return avgDiff !== 0 ? avgDiff : b.reviewCount - a.reviewCount;
        })
        .slice(0, 5);

      return {
        activeUsersToday: activeUsersToday || 0,
        reviewsToday: reviewsToday || 0,
        avgXp,
        totalTitles: totalTitles || 0,
        topRatedTitles
      };
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários Ativos Hoje</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.activeUsersToday}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avaliações Hoje</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.reviewsToday}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">XP Médio por Usuário</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.avgXp}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Títulos Cadastrados</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalTitles}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Títulos Avaliados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metrics?.topRatedTitles?.map((title: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{title.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {title.type === 'movie' ? 'Filme' : 'Série'} • {title.reviewCount} avaliações
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-primary">{title.avgRating}</p>
                  <p className="text-sm text-muted-foreground">⭐ Média</p>
                </div>
              </div>
            ))}
            {(!metrics?.topRatedTitles || metrics.topRatedTitles.length === 0) && (
              <p className="text-center text-muted-foreground py-4">Nenhum título avaliado ainda</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};