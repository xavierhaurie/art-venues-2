import { useEffect } from 'react';
import { useConfigStore, ImageConfig } from '@/lib/store/configStore';

export function useImageConfig(): { config: ImageConfig | null; loading: boolean; error: string | null } {
  const { imageConfig, loading, error, fetchImageConfig } = useConfigStore();
  useEffect(() => {
    if (!imageConfig && !loading) {
      fetchImageConfig().catch(() => {});
    }
  }, [imageConfig, loading, fetchImageConfig]);
  return { config: imageConfig, loading, error };
}

