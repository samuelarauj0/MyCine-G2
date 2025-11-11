import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Challenge {
  id: string;
  name: string;
  description?: string;
  type: 'daily' | 'weekly' | 'unique';
  target_value: number;
  xp_reward: number;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
}

export const AdminChallenges = () => {
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'daily' as 'daily' | 'weekly' | 'unique',
    target_value: '',
    xp_reward: '',
    is_active: true,
    start_date: '',
    end_date: ''
  });

  const { data: challenges, isLoading } = useQuery({
    queryKey: ['admin-challenges'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Challenge[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (challenge: Omit<Challenge, 'id'>) => {
      const { data, error } = await supabase
        .from('challenges')
        .insert([{
          name: challenge.name,
          description: challenge.description || null,
          type: challenge.type,
          target_value: challenge.target_value,
          xp_reward: challenge.xp_reward,
          is_active: challenge.is_active,
          start_date: challenge.start_date || null,
          end_date: challenge.end_date || null
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-challenges'] });
      toast({ title: "Desafio criado com sucesso!" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Erro ao criar desafio", variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (challenge: Challenge) => {
      const { data, error } = await supabase
        .from('challenges')
        .update({
          name: challenge.name,
          description: challenge.description || null,
          type: challenge.type,
          target_value: challenge.target_value,
          xp_reward: challenge.xp_reward,
          is_active: challenge.is_active,
          start_date: challenge.start_date || null,
          end_date: challenge.end_date || null
        })
        .eq('id', challenge.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-challenges'] });
      toast({ title: "Desafio atualizado com sucesso!" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Erro ao atualizar desafio", variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('challenges')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-challenges'] });
      toast({ title: "Desafio excluído com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao excluir desafio", variant: "destructive" });
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'daily',
      target_value: '',
      xp_reward: '',
      is_active: true,
      start_date: '',
      end_date: ''
    });
    setEditingChallenge(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (challenge: Challenge) => {
    setEditingChallenge(challenge);
    setFormData({
      name: challenge.name,
      description: challenge.description || '',
      type: challenge.type,
      target_value: challenge.target_value.toString(),
      xp_reward: challenge.xp_reward.toString(),
      is_active: challenge.is_active,
      start_date: challenge.start_date ? challenge.start_date.split('T')[0] : '',
      end_date: challenge.end_date ? challenge.end_date.split('T')[0] : ''
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const challengeData = {
      name: formData.name,
      description: formData.description,
      type: formData.type,
      target_value: parseInt(formData.target_value),
      xp_reward: parseInt(formData.xp_reward),
      is_active: formData.is_active,
      start_date: formData.start_date,
      end_date: formData.end_date
    };

    if (editingChallenge) {
      updateMutation.mutate({ ...challengeData, id: editingChallenge.id } as Challenge);
    } else {
      createMutation.mutate(challengeData);
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'daily': return 'Diário';
      case 'weekly': return 'Semanal';
      case 'unique': return 'Único';
      default: return type;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Gestão de Desafios</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Desafio
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingChallenge ? 'Editar Desafio' : 'Novo Desafio'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="type">Tipo *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: 'daily' | 'weekly' | 'unique') => 
                      setFormData({ ...formData, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Diário</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="unique">Único</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="target_value">Meta *</Label>
                  <Input
                    id="target_value"
                    type="number"
                    value={formData.target_value}
                    onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="xp_reward">Recompensa XP *</Label>
                  <Input
                    id="xp_reward"
                    type="number"
                    value={formData.xp_reward}
                    onChange={(e) => setFormData({ ...formData, xp_reward: e.target.value })}
                    required
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Ativo</Label>
                </div>

                <div>
                  <Label htmlFor="start_date">Data de Início</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="end_date">Data de Fim</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingChallenge ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {challenges?.map((challenge) => (
          <Card key={challenge.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{challenge.name}</CardTitle>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline">{getTypeLabel(challenge.type)}</Badge>
                    <Badge variant={challenge.is_active ? 'default' : 'secondary'}>
                      {challenge.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEditDialog(challenge)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    onClick={() => deleteMutation.mutate(challenge.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm"><strong>Meta:</strong> {challenge.target_value}</p>
                <p className="text-sm"><strong>Recompensa:</strong> {challenge.xp_reward} XP</p>
                {challenge.description && (
                  <p className="text-sm text-muted-foreground">{challenge.description}</p>
                )}
                {(challenge.start_date || challenge.end_date) && (
                  <div className="text-xs text-muted-foreground">
                    {challenge.start_date && (
                      <p>Início: {new Date(challenge.start_date).toLocaleDateString('pt-BR')}</p>
                    )}
                    {challenge.end_date && (
                      <p>Fim: {new Date(challenge.end_date).toLocaleDateString('pt-BR')}</p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(!challenges || challenges.length === 0) && (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">Nenhum desafio cadastrado ainda.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};