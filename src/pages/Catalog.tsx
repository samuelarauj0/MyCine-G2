import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Star, Calendar, Film, Tv } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { PromoBanner } from '@/components/PromoBanner';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

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

interface Category {
  id: string;
  name: string;
}

const Catalog = () => {
  const { user } = useAuth();
  const [allTitles, setAllTitles] = useState<Title[]>([]);
  const [filteredTitles, setFilteredTitles] = useState<Title[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterTitles();
  }, [searchTerm, selectedType, selectedCategory, sortBy]);

  const fetchData = async () => {
    try {
      // Fetch categories
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (categoriesData) {
        setCategories(categoriesData);
      }

      // Fetch titles with categories and reviews
      const { data: titlesData } = await supabase
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
          ),
          reviews!left(rating)
        `)
        .order('name');

      if (titlesData) {
        const processedTitles = titlesData.map(title => {
          const ratings = title.reviews.map(r => r.rating).filter(Boolean);
          const avgRating = ratings.length > 0 ? 
            ratings.reduce((sum: number, rating: number) => sum + rating, 0) / ratings.length : 0;
          
          return {
            id: title.id,
            name: title.name,
            type: title.type,
            release_year: title.release_year,
            synopsis: title.synopsis,
            poster_url: title.poster_url,
            duration_minutes: title.duration_minutes,
            categories: title.title_categories?.map((tc: any) => tc.categories.name) || [],
            average_rating: avgRating,
            reviews_count: ratings.length
          };
        });
        setAllTitles(processedTitles);
        setFilteredTitles(processedTitles);
      }

    } catch (error) {
      console.error('Error fetching catalog data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterTitles = () => {
    let filtered = [...allTitles];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(title => 
        title.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(title => title.type === selectedType);
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(title => 
        title.categories.includes(selectedCategory)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'year':
          return b.release_year - a.release_year;
        case 'rating':
          return b.average_rating - a.average_rating;
        case 'reviews':
          return b.reviews_count - a.reviews_count;
        default:
          return 0;
      }
    });

    setFilteredTitles(filtered);
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <PromoBanner />
      
      <main className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Film className="w-8 h-8 text-primary" />
            Catálogo de Filmes e Séries
          </h1>
          <p className="text-muted-foreground">
            Descubra e avalie seus filmes e séries favoritos
          </p>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 p-6 bg-card rounded-lg shadow-card">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar títulos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger>
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="movie">Filmes</SelectItem>
              <SelectItem value="series">Séries</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.name}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger>
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Nome A-Z</SelectItem>
              <SelectItem value="year">Ano (mais recente)</SelectItem>
              <SelectItem value="rating">Melhor avaliados</SelectItem>
              <SelectItem value="reviews">Mais avaliados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
          {filteredTitles.map((title) => (
            <Link 
              key={title.id}
              to={`/title/${title.id}`}
              className="group"
            >
              <Card className="shadow-card hover:shadow-primary/20 transition-all group-hover:scale-105">
                <div className="aspect-[2/3] overflow-hidden rounded-t-lg relative">
                  <img
                    src={title.poster_url || '/placeholder.svg'}
                    alt={title.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2">
                    <Badge variant="secondary" className="bg-background/80">
                      {title.type === 'movie' ? (
                        <Film className="w-3 h-3 mr-1" />
                      ) : (
                        <Tv className="w-3 h-3 mr-1" />
                      )}
                      {title.type === 'movie' ? 'Filme' : 'Série'}
                    </Badge>
                  </div>
                  {title.reviews_count > 0 && (
                    <div className="absolute top-2 right-2">
                      <Badge variant="secondary" className="bg-background/80">
                        <Star className="w-3 h-3 mr-1 fill-primary text-primary" />
                        {title.average_rating.toFixed(1)}
                      </Badge>
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-sm mb-2 line-clamp-2">{title.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <Calendar className="w-3 h-3" />
                    <span>{title.release_year}</span>
                    {title.duration_minutes && (
                      <>
                        <span>•</span>
                        <span>{Math.floor(title.duration_minutes / 60)}h {title.duration_minutes % 60}min</span>
                      </>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {title.categories.slice(0, 2).map((category, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {category}
                      </Badge>
                    ))}
                    {title.categories.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{title.categories.length - 2}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground">
                    {title.reviews_count > 0 ? (
                      <span>{title.reviews_count} avaliação{title.reviews_count !== 1 ? 'ões' : ''}</span>
                    ) : (
                      <span>Sem avaliações</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {filteredTitles.length === 0 && allTitles.length > 0 && (
          <div className="text-center py-12">
            <Film className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum título encontrado</h3>
            <p className="text-muted-foreground">
              Tente ajustar os filtros de busca
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Catalog;