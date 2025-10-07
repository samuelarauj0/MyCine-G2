import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, Calendar, Clock, Film, Tv, Play, MessageCircle, User, ArrowLeft } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Title {
  id: string;
  name: string;
  type: 'movie' | 'series';
  release_year: number;
  synopsis: string;
  poster_url: string;
  duration_minutes?: number;
  categories: string[];
  average_rating: number;
  reviews_count: number;
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  user_profile: {
    display_name: string;
    avatar_url?: string;
  };
}

interface UserReview {
  id?: string;
  rating: number;
  comment: string;
}

const TitleDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState<Title | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [userReview, setUserReview] = useState<UserReview>({ rating: 0, comment: '' });
  const [hasUserReview, setHasUserReview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchTitleData();
    }
  }, [id]);

  const fetchTitleData = async () => {
    if (!id) return;

    try {
      // Fetch title details
      const { data: titleData } = await supabase
        .from('titles')
        .select(`
          id,
          name,
          type,
          release_year,
          synopsis,
          poster_url,
          duration_minutes,
          title_categories(
            categories(name)
          )
        `)
        .eq('id', id)
        .single();

      if (titleData) {
        // Calculate average rating and review count
        const { data: reviewsData } = await supabase
          .from('reviews')
          .select('rating')
          .eq('title_id', id)
          .eq('is_deleted', false);

        const ratings = reviewsData?.map(r => r.rating) || [];
        const avgRating = ratings.length > 0 ? 
          ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : 0;

        setTitle({
          ...titleData,
          categories: titleData.title_categories?.map((tc: any) => tc.categories.name) || [],
          average_rating: avgRating,
          reviews_count: ratings.length
        });
      }

      // Fetch reviews with user profiles
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select(`
          id, 
          rating, 
          comment, 
          created_at, 
          user_id
        `)
        .eq('title_id', id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(10);

      if (reviewsData) {
        // Fetch profiles for each user
        const userIds = [...new Set(reviewsData.map(r => r.user_id))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', userIds);

        const profilesMap = new Map(
          profilesData?.map(p => [p.user_id, p]) || []
        );

        const formattedReviews = reviewsData.map(review => {
          const profile = profilesMap.get(review.user_id);
          return {
            id: review.id,
            rating: review.rating,
            comment: review.comment,
            created_at: review.created_at,
            user_profile: {
              display_name: profile?.display_name || 'Usuário',
              avatar_url: profile?.avatar_url
            }
          };
        });
        setReviews(formattedReviews);
      }

      // Check if user has already reviewed this title
      if (user) {
        const { data: existingReview } = await supabase
          .from('reviews')
          .select('*')
          .eq('title_id', id)
          .eq('user_id', user.id)
          .eq('is_deleted', false)
          .maybeSingle();

        if (existingReview) {
          setUserReview({
            id: existingReview.id,
            rating: existingReview.rating,
            comment: existingReview.comment || ''
          });
          setHasUserReview(true);
        } else {
          // Reset user review state if no existing review found
          setUserReview({ rating: 0, comment: '' });
          setHasUserReview(false);
        }
      }

    } catch (error) {
      console.error('Error fetching title data:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados do título.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!user || !id || userReview.rating === 0) return;

    if (userReview.comment && userReview.comment.length < 20) {
      toast({
        title: 'Comentário muito curto',
        description: 'O comentário deve ter pelo menos 20 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      const reviewData = {
        title_id: id,
        user_id: user.id,
        rating: userReview.rating,
        comment: userReview.comment || null,
      };

      if (hasUserReview && userReview.id) {
        // Update existing review
        const { error } = await supabase
          .from('reviews')
          .update(reviewData)
          .eq('id', userReview.id);

        if (error) throw error;

        toast({
          title: 'Avaliação atualizada!',
          description: 'Sua avaliação foi atualizada com sucesso.',
        });
      } else {
        // Create or restore (upsert) user's review for this title
        const { error } = await supabase
          .from('reviews')
          .upsert([{ ...reviewData, is_deleted: false }], { onConflict: 'user_id,title_id' });

        if (error) throw error;

        toast({
          title: 'Avaliação enviada!',
          description: 'Sua avaliação foi registrada com sucesso.',
        });
        setHasUserReview(true);
      }

      // Refresh data
      fetchTitleData();

    } catch (error: any) {
      console.error('Error submitting review:', error);
      
      if (error.code === '23505') {
        toast({
          title: 'Avaliação já existe',
          description: 'Você já avaliou este título.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Erro',
          description: 'Não foi possível enviar sua avaliação. Tente novamente.',
          variant: 'destructive',
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!userReview.id) return;

    try {
      const { error } = await supabase
        .from('reviews')
        .update({ is_deleted: true })
        .eq('id', userReview.id);

      if (error) throw error;

      toast({
        title: 'Avaliação removida',
        description: 'Sua avaliação foi removida com sucesso.',
      });

      setUserReview({ rating: 0, comment: '' });
      setHasUserReview(false);
      fetchTitleData();

    } catch (error) {
      console.error('Error deleting review:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover sua avaliação.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto p-6 flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!title) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto p-6 text-center">
          <h1 className="text-2xl font-bold mb-4">Título não encontrado</h1>
          <Button asChild>
            <Link to="/catalog">Voltar ao catálogo</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto p-6">
        <Button asChild variant="ghost" className="mb-6">
          <Link to="/catalog">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao catálogo
          </Link>
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Title Info */}
          <div className="lg:col-span-2">
            <div className="flex flex-col md:flex-row gap-6 mb-8">
              <div className="flex-shrink-0">
                <img
                  src={title.poster_url || '/placeholder.svg'}
                  alt={title.name}
                  className="w-64 h-96 object-cover rounded-lg shadow-card"
                />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <h1 className="text-3xl font-bold">{title.name}</h1>
                  <Badge variant="secondary">
                    {title.type === 'movie' ? (
                      <Film className="w-4 h-4 mr-2" />
                    ) : (
                      <Tv className="w-4 h-4 mr-2" />
                    )}
                    {title.type === 'movie' ? 'Filme' : 'Série'}
                  </Badge>
                </div>

                <div className="flex items-center gap-6 mb-4 text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{title.release_year}</span>
                  </div>
                  {title.duration_minutes && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{Math.floor(title.duration_minutes / 60)}h {title.duration_minutes % 60}min</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 fill-primary text-primary" />
                    <span>
                      {title.average_rating > 0 ? title.average_rating.toFixed(1) : 'N/A'} 
                      ({title.reviews_count} avaliação{title.reviews_count !== 1 ? 'ões' : ''})
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {title.categories.map((category, index) => (
                    <Badge key={index} variant="outline">{category}</Badge>
                  ))}
                </div>

                <p className="text-muted-foreground leading-relaxed">
                  {title.synopsis}
                </p>
              </div>
            </div>
          </div>

          {/* Review Form */}
          <div>
            <Card className="shadow-card sticky top-24">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-primary" />
                  {hasUserReview ? 'Sua Avaliação' : 'Avaliar Título'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Nota (1-5 estrelas)</Label>
                  <div className="flex gap-1 mt-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setUserReview({ ...userReview, rating: star })}
                        className="p-1 hover:scale-110 transition-transform"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            star <= userReview.rating
                              ? 'fill-primary text-primary'
                              : 'text-muted-foreground'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="comment">Comentário (opcional, mín. 20 caracteres)</Label>
                  <Textarea
                    id="comment"
                    placeholder="O que você achou deste título?"
                    value={userReview.comment}
                    onChange={(e) => setUserReview({ ...userReview, comment: e.target.value })}
                    className="mt-2 min-h-[100px]"
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    {userReview.comment.length}/20 caracteres mínimos
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={handleSubmitReview}
                    disabled={userReview.rating === 0 || submitting}
                    className="flex-1"
                  >
                    {submitting ? 'Enviando...' : hasUserReview ? 'Atualizar' : 'Avaliar'}
                  </Button>
                  {hasUserReview && (
                    <Button 
                      variant="outline" 
                      onClick={handleDeleteReview}
                      disabled={submitting}
                    >
                      Remover
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-primary" />
            Avaliações ({reviews.length})
          </h2>

          <div className="grid gap-4">
            {reviews.map((review) => (
              <Card key={review.id} className="shadow-card">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar>
                      <AvatarImage src={review.user_profile.avatar_url} />
                      <AvatarFallback>
                        <User className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-semibold">
                          {review.user_profile.display_name}
                        </span>
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${
                                star <= review.rating
                                  ? 'fill-primary text-primary'
                                  : 'text-muted-foreground'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {new Date(review.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      
                      {review.comment && (
                        <p className="text-muted-foreground">{review.comment}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {reviews.length === 0 && (
            <div className="text-center py-8">
              <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma avaliação ainda</h3>
              <p className="text-muted-foreground">
                Seja o primeiro a avaliar este título!
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default TitleDetail;