import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Banner {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  link_url: string;
  link_type: string;
  is_active: boolean;
  display_order: number;
  start_date: string | null;
  end_date: string | null;
}

export default function AdminBanners() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image_url: '',
    link_url: '',
    link_type: 'ticket',
    is_active: true,
    display_order: 0,
    start_date: '',
    end_date: '',
  });
  const [role, setRole] = useState<string | null>(null);
  const isAdmin = role === 'admin';

  useEffect(() => {
    fetchBanners();
    fetchRole();
  }, []);

  const fetchBanners = async () => {
    const { data } = await supabase
      .from('promotional_banners')
      .select('*')
      .order('display_order', { ascending: true });

    if (data) setBanners(data);
  };

  const fetchRole = async () => {
    const { data, error } = await supabase.rpc('get_current_user_role');
    if (!error) setRole((data as string) ?? null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const bannerData = {
      ...formData,
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
    };

    if (editingBanner) {
      const { error } = await supabase
        .from('promotional_banners')
        .update(bannerData)
        .eq('id', editingBanner.id);

      if (error) {
        toast.error('Erro ao atualizar banner');
        return;
      }
      toast.success('Banner atualizado com sucesso!');
    } else {
      const { error } = await supabase
        .from('promotional_banners')
        .insert([bannerData]);

      if (error) {
        toast.error('Erro ao criar banner');
        return;
      }
      toast.success('Banner criado com sucesso!');
    }

    resetForm();
    fetchBanners();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este banner?')) return;

    const { error } = await supabase
      .from('promotional_banners')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Erro ao excluir banner');
      return;
    }

    toast.success('Banner excluído com sucesso!');
    fetchBanners();
  };

  const toggleActive = async (banner: Banner) => {
    if (!isAdmin) {
      toast.error('Você não tem permissão de administrador para alterar banners.');
      return;
    }

    const { error } = await supabase.rpc('set_banner_active', {
      p_banner_id: banner.id,
      p_is_active: !banner.is_active,
    });

    if (error) {
      console.error('Erro ao atualizar banner:', error);
      toast.error('Erro ao atualizar status: ' + error.message);
      return;
    }

    toast.success(banner.is_active ? 'Banner ocultado' : 'Banner ativado');
    fetchBanners();
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      image_url: '',
      link_url: '',
      link_type: 'ticket',
      is_active: true,
      display_order: 0,
      start_date: '',
      end_date: '',
    });
    setEditingBanner(null);
    setIsDialogOpen(false);
  };

  const openEditDialog = (banner: Banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title,
      description: banner.description || '',
      image_url: banner.image_url,
      link_url: banner.link_url,
      link_type: banner.link_type,
      is_active: banner.is_active,
      display_order: banner.display_order,
      start_date: banner.start_date || '',
      end_date: banner.end_date || '',
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Banners Promocionais</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingBanner(null)}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Banner
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingBanner ? 'Editar Banner' : 'Novo Banner'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="image_url">URL da Imagem *</Label>
                <Input
                  id="image_url"
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="link_url">URL do Link *</Label>
                <Input
                  id="link_url"
                  type="url"
                  value={formData.link_url}
                  onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="link_type">Tipo de Link *</Label>
                <Select value={formData.link_type} onValueChange={(value) => setFormData({ ...formData, link_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ticket">🎟️ Ingresso</SelectItem>
                    <SelectItem value="streaming">📺 Streaming</SelectItem>
                    <SelectItem value="other">🔗 Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="display_order">Ordem de Exibição</Label>
                <Input
                  id="display_order"
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_date">Data de Início</Label>
                  <Input
                    id="start_date"
                    type="datetime-local"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="end_date">Data de Término</Label>
                  <Input
                    id="end_date"
                    type="datetime-local"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label>Banner Ativo</Label>
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingBanner ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {!isAdmin && (
        <Alert>
          <AlertDescription>
            Você não tem permissão para alterar banners. Solicite acesso de administrador.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4">
        {banners.map((banner) => (
          <Card key={banner.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                {banner.title}
                {banner.is_active ? (
                  <Eye className="w-4 h-4 text-green-500" />
                ) : (
                  <EyeOff className="w-4 h-4 text-muted-foreground" />
                )}
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleActive(banner)}
                  disabled={!isAdmin}
                  title={isAdmin ? 'Ativar/ocultar' : 'Sem permissão'}
                >
                  {banner.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEditDialog(banner)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(banner.id)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <img 
                  src={banner.image_url} 
                  alt={banner.title} 
                  className="w-32 h-20 object-cover rounded"
                />
                <div className="flex-1">
                  {banner.description && (
                    <p className="text-sm text-muted-foreground mb-2">{banner.description}</p>
                  )}
                  <div className="text-xs space-y-1">
                    <p>Tipo: {banner.link_type === 'ticket' ? '🎟️ Ingresso' : banner.link_type === 'streaming' ? '📺 Streaming' : '🔗 Outro'}</p>
                    <p>Ordem: {banner.display_order}</p>
                    {banner.start_date && <p>Início: {new Date(banner.start_date).toLocaleString('pt-BR')}</p>}
                    {banner.end_date && <p>Término: {new Date(banner.end_date).toLocaleString('pt-BR')}</p>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
