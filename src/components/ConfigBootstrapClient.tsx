// filepath: src/components/ConfigBootstrapClient.tsx
'use client'
import React, { useEffect } from 'react';
import { useConfigStore } from '/lib/store/configStore';

export default function ConfigBootstrapClient({ children }: { children: React.ReactNode }) {
  const { imageConfig, fetchImageConfig } = useConfigStore();
  useEffect(() => {
    if (!imageConfig) {
      fetchImageConfig().catch(() => {});
    }
  }, [imageConfig, fetchImageConfig]);
  return <>{children}</>;
}

