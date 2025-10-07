import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Eye, EyeOff, ChevronRight, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TitleWithReviews {
  id: string;
  name: string;
  type: string;
  review_count: number;
  hidden_count: number;
}

interface Review {
  id: string;
  rating: number;
  comment?: string;
  is_deleted: boolean;
  created_at: string;
  user_id: string;
  title_id: string;
}

export const AdminModeration = () => {
  const [selectedTitle, setSelectedTitle] = useState<TitleWithReviews | null>(null);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [moderationReason, setModerationReason] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query for titles with reviews count
  const { data: titlesWithReviews, isLoading: titlesLoading } = useQuery({
    queryKey: ['admin-titles-with-reviews'],
    queryFn: async () => {
      // First get all reviews with title info
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select(`
          id,
          is_deleted,
          title_id,
          titles (
            id,
            name,
            type
          )
        `);
      
      if (reviewsError) throw reviewsError;
      
      // Group reviews by title
      const titlesMap = new Map<string, TitleWithReviews>();
      
      reviewsData?.forEach((review: any) => {
        if (review.titles) {
          const titleId = review.titles.id;
          
          if (!titlesMap.has(titleId)) {
            titlesMap.set(titleId, {
              id: titleId,
              name: review.titles.name,
              type: review.titles.type,
              review_count: 0,
              hidden_count: 0,
            });
          }
          
          const title = titlesMap.get(titleId)!;
          title.review_count++;
          if (review.is_deleted) {
            title.hidden_count++;
          }
        }
      });
      
      return Array.from(titlesMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    },
    enabled: !selectedTitle,
  });

  // Query for reviews of selected title
  const { data: titleReviews, isLoading: reviewsLoading } = useQuery({
    queryKey: ['admin-title-reviews', selectedTitle?.id],
    queryFn: async () => {
      if (!selectedTitle?.id) return [];
      
      const { data, error } = await supabase
        .from('reviews')
        .select(`*`)
        .eq('title_id', selectedTitle.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Review[];
    },
    enabled: !!selectedTitle?.id,
  });

  const moderateMutation = useMutation({
    mutationFn: async ({ reviewId, action, reason }: { 
      reviewId: string; 
      action: 'hide' | 'restore'; 
      reason: string; 
    }) => {
      // Update review status
      const { error: reviewError } = await supabase
        .from('reviews')
        .update({ is_deleted: action === 'hide' })
        .eq('id', reviewId);
      
      if (reviewError) throw reviewError;

      // Log moderation action
      const { error: logError } = await supabase
        .from('admin_moderation_logs')
        .insert([{
          admin_id: user!.id,
          target_id: reviewId,
          target_type: 'review',
          action: action === 'hide' ? 'soft_delete' : 'restore',
          reason: reason || null
        }]);
      
      if (logError) throw logError;
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-title-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['admin-titles-with-reviews'] });
      toast({ 
        title: action === 'hide' ? "Avaliação ocultada com sucesso!" : "Avaliação restaurada com sucesso!" 
      });
      setIsDialogOpen(false);
      setModerationReason('');
      setSelectedReview(null);
    },
    onError: () => {
      toast({ title: "Erro na moderação", variant: "destructive" });
    }
  });

  const openModerationDialog = (review: Review) => {
    setSelectedReview(review);
    setModerationReason('');
    setIsDialogOpen(true);
  };

  const handleModeration = (action: 'hide' | 'restore') => {
    if (!selectedReview) return;
    
    moderateMutation.mutate({
      reviewId: selectedReview.id,
      action,
      reason: moderationReason
    });
  };

  if (titlesLoading || reviewsLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show titles list when no title is selected
  if (!selectedTitle) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Moderação de Avaliações</h1>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {titlesWithReviews?.map((title) => (
            <Card key={title.id} className="cursor-pointer hover:bg-muted/30 transition-colors">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {title.name}
                      <Badge variant={title.type === 'movie' ? 'default' : 'secondary'}>
                        {title.type === 'movie' ? 'Filme' : 'Série'}
                      </Badge>
                    </CardTitle>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span>{title.review_count} avaliações</span>
                      {title.hidden_count > 0 && (
                        <span className="text-destructive">{title.hidden_count} ocultas</span>
                      )}
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedTitle(title)}
                  >
                    Ver Avaliações
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>

        {(!titlesWithReviews || titlesWithReviews.length === 0) && (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">Nenhum título com avaliações encontrado.</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Show reviews for selected title
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setSelectedTitle(null)}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
          <h1 className="text-2xl font-bold">
            Avaliações de "{selectedTitle.name}"
          </h1>
          <Badge variant={selectedTitle.type === 'movie' ? 'default' : 'secondary'}>
            {selectedTitle.type === 'movie' ? 'Filme' : 'Série'}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {titleReviews?.map((review) => (
          <Card key={review.id} className={review.is_deleted ? 'opacity-60 bg-muted/30' : ''}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Por: Usuário</span>
                    <span>⭐ {review.rating}/5</span>
                    <span>{new Date(review.created_at).toLocaleDateString('pt-BR')}</span>
                    {review.is_deleted && (
                      <Badge variant="destructive">
                        <EyeOff className="h-3 w-3 mr-1" />
                        Oculta
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {!review.is_deleted ? (
                    <Dialog open={isDialogOpen && selectedReview?.id === review.id} onOpenChange={setIsDialogOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => openModerationDialog(review)}
                        >
                          <EyeOff className="h-4 w-4 mr-1" />
                          Ocultar
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Ocultar Avaliação</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm text-muted-foreground mb-2">
                              Você está prestes a ocultar esta avaliação
                            </p>
                            <div className="p-3 bg-muted rounded-lg">
                              <p className="font-medium">⭐ {selectedReview?.rating}/5</p>
                              {selectedReview?.comment && (
                                <p className="text-sm mt-1">{selectedReview.comment}</p>
                              )}
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="reason">Motivo da moderação</Label>
                            <Textarea
                              id="reason"
                              value={moderationReason}
                              onChange={(e) => setModerationReason(e.target.value)}
                              placeholder="Descreva o motivo para ocultar esta avaliação..."
                              rows={3}
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                              Cancelar
                            </Button>
                            <Button 
                              variant="destructive" 
                              onClick={() => handleModeration('hide')}
                            >
                              <AlertTriangle className="h-4 w-4 mr-1" />
                              Ocultar Avaliação
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  ) : (
                    <Dialog open={isDialogOpen && selectedReview?.id === review.id} onOpenChange={setIsDialogOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => openModerationDialog(review)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Restaurar
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Restaurar Avaliação</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm text-muted-foreground mb-2">
                              Você está prestes a restaurar esta avaliação
                            </p>
                            <div className="p-3 bg-muted rounded-lg">
                              <p className="font-medium">⭐ {selectedReview?.rating}/5</p>
                              {selectedReview?.comment && (
                                <p className="text-sm mt-1">{selectedReview.comment}</p>
                              )}
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="reason">Motivo da restauração</Label>
                            <Textarea
                              id="reason"
                              value={moderationReason}
                              onChange={(e) => setModerationReason(e.target.value)}
                              placeholder="Descreva o motivo para restaurar esta avaliação..."
                              rows={3}
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                              Cancelar
                            </Button>
                            <Button onClick={() => handleModeration('restore')}>
                              <Eye className="h-4 w-4 mr-1" />
                              Restaurar Avaliação
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>
            </CardHeader>
            {review.comment && (
              <CardContent>
                <p className="text-sm">{review.comment}</p>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {(!titleReviews || titleReviews.length === 0) && (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">Nenhuma avaliação encontrada para este título.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};