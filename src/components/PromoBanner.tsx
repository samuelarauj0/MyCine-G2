import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

interface Banner {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  link_url: string;
  link_type: string;
  display_order: number;
}

export const PromoBanner = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true);
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchBanners();
  }, []);

  useEffect(() => {
    if (!isAutoPlay || banners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlay, banners.length]);

  const fetchBanners = async () => {
    const { data } = await supabase
      .from('promotional_banners')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (data) {
      const now = new Date();
      const validBanners = data.filter(banner => {
        const startValid = !banner.start_date || new Date(banner.start_date) <= now;
        const endValid = !banner.end_date || new Date(banner.end_date) >= now;
        return startValid && endValid;
      });
      setBanners(validBanners);
    }
  };

  const handlePrevious = () => {
    setIsAutoPlay(false);
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const handleNext = () => {
    setIsAutoPlay(false);
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  };

  if (banners.length === 0) return null;

  const currentBanner = banners[currentIndex];

  return (
    <div className="relative w-full bg-gradient-to-r from-primary/20 to-accent/20 border-b">
      <div className="container mx-auto">
        <div className="relative group">
          <a
            href={currentBanner.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block relative overflow-hidden"
          >
            <div className={`flex gap-3 ${isMobile ? 'py-3 px-4' : 'items-center gap-4 py-4 px-6'}`}>
              <div 
                className={`bg-cover bg-center rounded-lg flex-shrink-0 ${
                  isMobile ? 'h-20 w-20' : 'h-24 w-40'
                }`}
                style={{ backgroundImage: `url(${currentBanner.image_url})` }}
              />
              
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h3 className={`font-bold mb-1 flex items-center gap-2 ${
                  isMobile ? 'text-base leading-tight' : 'text-lg truncate'
                }`}>
                  <span className={isMobile ? 'line-clamp-2' : 'truncate'}>
                    {currentBanner.title}
                  </span>
                  <ExternalLink className={`opacity-70 flex-shrink-0 ${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} />
                </h3>
                {currentBanner.description && !isMobile && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {currentBanner.description}
                  </p>
                )}
                <span className={`text-primary font-medium mt-1 inline-block ${
                  isMobile ? 'text-xs' : 'text-xs'
                }`}>
                  {currentBanner.link_type === 'ticket' ? '🎟️ Comprar Ingresso' : 
                   currentBanner.link_type === 'streaming' ? '📺 Assistir Online' : 
                   '🔗 Saiba Mais'}
                </span>
              </div>
            </div>
          </a>

          {banners.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrevious}
                className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>

              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
                {banners.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setIsAutoPlay(false);
                      setCurrentIndex(idx);
                    }}
                    className={`h-1.5 rounded-full transition-all ${
                      idx === currentIndex ? 'w-8 bg-primary' : 'w-1.5 bg-primary/30'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
