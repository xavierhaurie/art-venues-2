// filepath: tests/lib/config.test.ts
// Basic tests for the config store + hook logic.
// We mock fetch and the config table response.

import { act, renderHook } from '@testing-library/react';
import { useConfigStore } from '/lib/store/configStore';
import { useImageConfig } from '/lib/hooks/useImageConfig';

// Mock global fetch
const mockConfig = {
  config: {
    max_image_weight: 200000,
    target_image_size: 800,
    thumbnail_image_size: 100,
    max_image_count: 20,
    signed_url_ttl_seconds: 300
  }
};

describe('config store', () => {
  beforeEach(() => {
    (global as any).fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(mockConfig) }));
    // Reset store between tests
    const { setState } = (useConfigStore as any);
    setState({ imageConfig: null, loading: false, error: null });
  });

  it('fetchImageConfig populates imageConfig', async () => {
    const { result } = renderHook(() => useConfigStore());
    expect(result.current.imageConfig).toBeNull();
    await act(async () => {
      await result.current.fetchImageConfig();
    });
    expect(result.current.imageConfig).not.toBeNull();
    expect(result.current.imageConfig?.max_image_weight).toBe(200000);
  });

  it('useImageConfig auto fetches config', async () => {
    const { result } = renderHook(() => useImageConfig());
    expect(result.current.config).toBeNull();
    // Wait a tick for useEffect
    await act(async () => {});
    expect(result.current.config?.target_image_size).toBe(800);
  });

  it('handles fetch failure', async () => {
    (global as any).fetch = jest.fn(() => Promise.resolve({ ok: false }));
    const { result } = renderHook(() => useConfigStore());
    await act(async () => {
      await result.current.fetchImageConfig();
    });
    expect(result.current.imageConfig).toBeNull();
    expect(result.current.error).toBeTruthy();
  });
});

