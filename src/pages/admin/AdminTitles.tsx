import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Edit, Trash2, X, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Title {
  id: string;
  name: string;
  type: 'movie' | 'series';
  release_year?: number;
  duration_minutes?: number;
  synopsis?: string;
  poster_url?: string;
  categories?: Category[];
}

interface Category {
  id: string;
  name: string;
}

export const AdminTitles = () => {
  const [editingTitle, setEditingTitle] = useState<Title | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'movie' | 'series'>('all');
  const [yearFilter, setYearFilter] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'movie' as 'movie' | 'series',
    release_year: '',
    duration_minutes: '',
    synopsis: '',
    poster_url: '',
    selectedCategories: [] as string[]
  });

  const { data: titles, isLoading } = useQuery({
    queryKey: ['admin-titles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('titles')
        .select(`
          *,
          title_categories(
            categories(id, name)
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Transform the data to include categories
      const transformedData = data?.map(title => ({
        ...title,
        categories: title.title_categories?.map((tc: any) => tc.categories).filter(Boolean) || []
      })) || [];
      
      return transformedData as Title[];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Category[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (titleData: { title: Omit<Title, 'id'>; categoryIds: string[] }) => {
      // First create the title
      const { data: titleResult, error: titleError } = await supabase
        .from('titles')
        .insert([{
          name: titleData.title.name,
          type: titleData.title.type,
          release_year: titleData.title.release_year || null,
          duration_minutes: titleData.title.duration_minutes || null,
          synopsis: titleData.title.synopsis || null,
          poster_url: titleData.title.poster_url || null
        }])
        .select()
        .single();
      
      if (titleError) throw titleError;
      
      // Then create the category associations
      if (titleData.categoryIds.length > 0) {
        const { error: categoryError } = await supabase
          .from('title_categories')
          .insert(
            titleData.categoryIds.map(categoryId => ({
              title_id: titleResult.id,
              category_id: categoryId
            }))
          );
        
        if (categoryError) throw categoryError;
      }
      
      return titleResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-titles'] });
      toast({ title: "Título criado com sucesso!" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Erro ao criar título", variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (titleData: { title: Title; categoryIds: string[] }) => {
      // First update the title
      const { data: titleResult, error: titleError } = await supabase
        .from('titles')
        .update({
          name: titleData.title.name,
          type: titleData.title.type,
          release_year: titleData.title.release_year || null,
          duration_minutes: titleData.title.duration_minutes || null,
          synopsis: titleData.title.synopsis || null,
          poster_url: titleData.title.poster_url || null
        })
        .eq('id', titleData.title.id)
        .select()
        .single();
      
      if (titleError) throw titleError;
      
      // Remove existing category associations
      const { error: deleteError } = await supabase
        .from('title_categories')
        .delete()
        .eq('title_id', titleData.title.id);
      
      if (deleteError) throw deleteError;
      
      // Add new category associations
      if (titleData.categoryIds.length > 0) {
        const { error: categoryError } = await supabase
          .from('title_categories')
          .insert(
            titleData.categoryIds.map(categoryId => ({
              title_id: titleData.title.id,
              category_id: categoryId
            }))
          );
        
        if (categoryError) throw categoryError;
      }
      
      return titleResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-titles'] });
      toast({ title: "Título atualizado com sucesso!" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Erro ao atualizar título", variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('titles')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-titles'] });
      toast({ title: "Título excluído com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao excluir título", variant: "destructive" });
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'movie',
      release_year: '',
      duration_minutes: '',
      synopsis: '',
      poster_url: '',
      selectedCategories: []
    });
    setEditingTitle(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (title: Title) => {
    setEditingTitle(title);
    setFormData({
      name: title.name,
      type: title.type,
      release_year: title.release_year?.toString() || '',
      duration_minutes: title.duration_minutes?.toString() || '',
      synopsis: title.synopsis || '',
      poster_url: title.poster_url || '',
      selectedCategories: title.categories?.map(cat => cat.id) || []
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const titleData = {
      name: formData.name,
      type: formData.type,
      release_year: formData.release_year ? parseInt(formData.release_year) : undefined,
      duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : undefined,
      synopsis: formData.synopsis,
      poster_url: formData.poster_url
    };

    if (editingTitle) {
      updateMutation.mutate({ 
        title: { ...titleData, id: editingTitle.id } as Title, 
        categoryIds: formData.selectedCategories 
      });
    } else {
      createMutation.mutate({ 
        title: titleData, 
        categoryIds: formData.selectedCategories 
      });
    }
  };

  const handleCategoryToggle = (categoryId: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        selectedCategories: [...prev.selectedCategories, categoryId]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        selectedCategories: prev.selectedCategories.filter(id => id !== categoryId)
      }));
    }
  };

  const removeCategory = (categoryId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedCategories: prev.selectedCategories.filter(id => id !== categoryId)
    }));
  };

  // Filter titles
  const filteredTitles = useMemo(() => {
    if (!titles) return [];
    
    return titles.filter(title => {
      // Search filter
      if (searchQuery && !title.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // Type filter
      if (typeFilter !== 'all' && title.type !== typeFilter) {
        return false;
      }
      
      // Year filter
      if (yearFilter && title.release_year?.toString() !== yearFilter) {
        return false;
      }
      
      return true;
    });
  }, [titles, searchQuery, typeFilter, yearFilter]);

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
        <h1 className="text-2xl font-bold">Gestão de Títulos</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Título
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingTitle ? 'Editar Título' : 'Novo Título'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
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
                    onValueChange={(value: 'movie' | 'series') => 
                      setFormData({ ...formData, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="movie">Filme</SelectItem>
                      <SelectItem value="series">Série</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="release_year">Ano de Lançamento</Label>
                  <Input
                    id="release_year"
                    type="number"
                    value={formData.release_year}
                    onChange={(e) => setFormData({ ...formData, release_year: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="duration_minutes">Duração (minutos)</Label>
                  <Input
                    id="duration_minutes"
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="poster_url">URL do Poster</Label>
                <Input
                  id="poster_url"
                  value={formData.poster_url}
                  onChange={(e) => setFormData({ ...formData, poster_url: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="synopsis">Sinopse</Label>
                <Textarea
                  id="synopsis"
                  value={formData.synopsis}
                  onChange={(e) => setFormData({ ...formData, synopsis: e.target.value })}
                  rows={4}
                />
              </div>

              <div>
                <Label>Categorias</Label>
                <div className="mt-2 space-y-3">
                  {/* Selected categories */}
                  {formData.selectedCategories.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.selectedCategories.map(categoryId => {
                        const category = categories?.find(cat => cat.id === categoryId);
                        return category ? (
                          <Badge key={categoryId} variant="secondary" className="flex items-center gap-1">
                            {category.name}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-auto p-0 w-4 h-4"
                              onClick={() => removeCategory(categoryId)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  )}
                  
                  {/* Available categories */}
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded p-2">
                    {categories?.map(category => (
                      <div key={category.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={category.id}
                          checked={formData.selectedCategories.includes(category.id)}
                          onCheckedChange={(checked) => 
                            handleCategoryToggle(category.id, checked as boolean)
                          }
                        />
                        <Label 
                          htmlFor={category.id} 
                          className="text-sm font-normal cursor-pointer"
                        >
                          {category.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingTitle ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={(value: any) => setTypeFilter(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="movie">Filmes</SelectItem>
                <SelectItem value="series">Séries</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Filtrar por ano..."
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              type="number"
            />
          </div>
          {(searchQuery || typeFilter !== 'all' || yearFilter) && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {filteredTitles.length} {filteredTitles.length === 1 ? 'resultado' : 'resultados'}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setTypeFilter('all');
                  setYearFilter('');
                }}
              >
                Limpar filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTitles?.map((title) => (
          <Card key={title.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{title.name}</CardTitle>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <Badge variant={title.type === 'movie' ? 'default' : 'secondary'}>
                      {title.type === 'movie' ? 'Filme' : 'Série'}
                    </Badge>
                    {title.release_year && (
                      <Badge variant="outline">{title.release_year}</Badge>
                    )}
                    {title.categories?.map(category => (
                      <Badge key={category.id} variant="outline" className="text-xs">
                        {category.name}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEditDialog(title)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    onClick={() => deleteMutation.mutate(title.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {title.duration_minutes && (
                <p className="text-sm text-muted-foreground mb-2">
                  {title.duration_minutes} minutos
                </p>
              )}
              {title.synopsis && (
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {title.synopsis}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTitles.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">
              {searchQuery || typeFilter !== 'all' || yearFilter
                ? 'Nenhum título encontrado com os filtros aplicados.'
                : 'Nenhum título cadastrado ainda.'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};