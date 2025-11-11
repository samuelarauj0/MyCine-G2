import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { batch = 0 } = await req.json();
    const tmdbApiKey = Deno.env.get('TMDB_API_KEY');
    
    if (!tmdbApiKey) {
      throw new Error('TMDB_API_KEY não configurada');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar categorias existentes
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name');

    const categoryMap = new Map(categories?.map(c => [c.name.toLowerCase(), c.id]) || []);

    // Mapear gêneros do TMDB para categorias
    const genreMapping: Record<number, string[]> = {
      28: ['ação'], 12: ['aventura'], 16: ['animação'], 35: ['comédia'],
      80: ['crime'], 99: ['documentário'], 18: ['drama'], 10751: ['família'],
      14: ['fantasia'], 36: ['história'], 27: ['terror'], 10402: ['música'],
      9648: ['mistério'], 10749: ['romance'], 878: ['ficção científica'],
      10770: ['tv'], 53: ['thriller'], 10752: ['guerra'], 37: ['western']
    };

    // Buscar títulos desde 2000
    const releaseDate = '2000-01-01';

    // Cada batch incrementa as páginas de forma diferente para filmes e séries
    // Isso garante variedade de conteúdo
    const moviePage = Math.floor(batch / 2) + 1;
    const seriesPage = Math.floor(batch / 2) + (batch % 2) + 1;
    const results: any[] = [];

    // Buscar filmes populares (sem conteúdo adulto)
    const moviesResponse = await fetch(
      `https://api.themoviedb.org/3/discover/movie?api_key=${tmdbApiKey}&language=pt-BR&sort_by=popularity.desc&primary_release_date.gte=${releaseDate}&page=${moviePage}&include_adult=false&certification_country=US&certification.lte=PG-13`
    );
    const moviesData = await moviesResponse.json();

    // Buscar séries populares (sem conteúdo adulto)
    const seriesResponse = await fetch(
      `https://api.themoviedb.org/3/discover/tv?api_key=${tmdbApiKey}&language=pt-BR&sort_by=popularity.desc&first_air_date.gte=${releaseDate}&page=${seriesPage}&include_adult=false`
    );
    const seriesData = await seriesResponse.json();

    // Processar filmes
    for (const movie of moviesData.results?.slice(0, 5) || []) {
      const detailsResponse = await fetch(
        `https://api.themoviedb.org/3/movie/${movie.id}?api_key=${tmdbApiKey}&language=pt-BR`
      );
      const details = await detailsResponse.json();

      const releaseYear = new Date(movie.release_date).getFullYear();
      
      // Verificar se o título já existe
      const { data: existingTitle } = await supabase
        .from('titles')
        .select('id, name')
        .eq('name', movie.title)
        .eq('release_year', releaseYear)
        .eq('type', 'movie')
        .maybeSingle();

      if (existingTitle) {
        console.log(`Filme já existe: ${movie.title} (${releaseYear})`);
        continue;
      }

      const title = {
        name: movie.title,
        type: 'movie' as const,
        release_year: releaseYear,
        duration_minutes: details.runtime,
        synopsis: movie.overview,
        poster_url: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
      };

      const { data: insertedTitle, error: titleError } = await supabase
        .from('titles')
        .insert(title)
        .select()
        .single();

      if (titleError) {
        console.error('Erro ao inserir filme:', titleError);
        continue;
      }

      // Inserir categorias
      const genreIds = movie.genre_ids || [];
      for (const genreId of genreIds) {
        const categoryNames = genreMapping[genreId] || [];
        for (const categoryName of categoryNames) {
          const categoryId = categoryMap.get(categoryName);
          if (categoryId) {
            await supabase
              .from('title_categories')
              .insert({ title_id: insertedTitle.id, category_id: categoryId });
          }
        }
      }

      results.push({ ...title, id: insertedTitle.id });
    }

    // Processar séries
    for (const series of seriesData.results?.slice(0, 5) || []) {
      const detailsResponse = await fetch(
        `https://api.themoviedb.org/3/tv/${series.id}?api_key=${tmdbApiKey}&language=pt-BR`
      );
      const details = await detailsResponse.json();

      const releaseYear = new Date(series.first_air_date).getFullYear();
      
      // Verificar se o título já existe
      const { data: existingTitle } = await supabase
        .from('titles')
        .select('id, name')
        .eq('name', series.name)
        .eq('release_year', releaseYear)
        .eq('type', 'series')
        .maybeSingle();

      if (existingTitle) {
        console.log(`Série já existe: ${series.name} (${releaseYear})`);
        continue;
      }

      const title = {
        name: series.name,
        type: 'series' as const,
        release_year: releaseYear,
        duration_minutes: details.episode_run_time?.[0] || null,
        synopsis: series.overview,
        poster_url: series.poster_path ? `https://image.tmdb.org/t/p/w500${series.poster_path}` : null,
      };

      const { data: insertedTitle, error: titleError } = await supabase
        .from('titles')
        .insert(title)
        .select()
        .single();

      if (titleError) {
        console.error('Erro ao inserir série:', titleError);
        continue;
      }

      // Inserir categorias
      const genreIds = series.genre_ids || [];
      for (const genreId of genreIds) {
        const categoryNames = genreMapping[genreId] || [];
        for (const categoryName of categoryNames) {
          const categoryId = categoryMap.get(categoryName);
          if (categoryId) {
            await supabase
              .from('title_categories')
              .insert({ title_id: insertedTitle.id, category_id: categoryId });
          }
        }
      }

      results.push({ ...title, id: insertedTitle.id });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: results.length,
        titles: results,
        nextBatch: batch + 1,
        moviePage,
        seriesPage
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});