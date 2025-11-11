import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function AdminPopulateTitles() {
  const [loading, setLoading] = useState(false);
  const [batch, setBatch] = useState(0);
  const [totalAdded, setTotalAdded] = useState(0);
  const [lastResults, setLastResults] = useState<any[]>([]);
  const { toast } = useToast();

  const handlePopulate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('populate-titles', {
        body: { batch }
      });

      if (error) throw error;

      setLastResults(data.titles || []);
      setTotalAdded(prev => prev + data.count);
      setBatch(data.nextBatch);

      toast({
        title: 'Sucesso!',
        description: `${data.count} títulos adicionados. Total: ${totalAdded + data.count}`,
      });
    } catch (error: any) {
      console.error('Erro ao popular títulos:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao popular títulos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Popular Títulos</h1>
        <p className="text-muted-foreground mt-2">
          Adicione filmes e séries populares lançados desde 2000 do TMDB
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Importar do TMDB</CardTitle>
          <CardDescription>
            Adiciona 10 títulos por vez (5 filmes + 5 séries)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button 
              onClick={handlePopulate} 
              disabled={loading}
              size="lg"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Adicionar próximos 10 títulos
            </Button>
            
            {totalAdded > 0 && (
              <div className="text-sm text-muted-foreground">
                Total adicionado: <strong>{totalAdded}</strong> títulos
              </div>
            )}
          </div>

          {lastResults.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">Últimos títulos adicionados:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {lastResults.map((title, index) => (
                  <Card key={index}>
                    <CardContent className="p-4 flex gap-4">
                      {title.poster_url && (
                        <img 
                          src={title.poster_url} 
                          alt={title.name}
                          className="w-16 h-24 object-cover rounded"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold truncate">{title.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {title.type === 'movie' ? 'Filme' : 'Série'} • {title.release_year}
                        </p>
                        {title.duration_minutes && (
                          <p className="text-sm text-muted-foreground">
                            {title.duration_minutes} min
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}