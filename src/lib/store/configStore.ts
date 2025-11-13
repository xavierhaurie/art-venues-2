// filepath: src/lib/store/configStore.ts
import { create } from 'zustand';

export interface ImageConfig {
  max_image_weight: number; // bytes
  target_image_size: number; // px long side
  thumbnail_image_size: number; // px
  max_image_count: number; // count
  signed_url_ttl_seconds: number; // seconds
}

interface ConfigState {
  imageConfig: ImageConfig | null;
  loading: boolean;
  error: string | null;
  setImageConfig: (cfg: ImageConfig) => void;
  fetchImageConfig: () => Promise<void>;
}

export const useConfigStore = create<ConfigState>((set) => ({
  imageConfig: null,
  loading: false,
  error: null,
  setImageConfig: (cfg) => set({ imageConfig: cfg }),
  fetchImageConfig: async () => {
    set({ loading: true, error: null });
    try {
      const resp = await fetch('/api/config/images');
      if (!resp.ok) throw new Error('Failed to load config');
      const data = await resp.json();
      set({ imageConfig: data.config as ImageConfig, loading: false, error: null });
    } catch (e: any) {
      set({ loading: false, error: e?.message || 'Failed to load config' });
    }
  },
}));
