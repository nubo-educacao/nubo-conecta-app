// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProactiveDrawer } from '@/hooks/useProactiveDrawer';
import { usePathname } from 'next/navigation';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
}));

describe('useProactiveDrawer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    sessionStorage.clear();
  });

  it('deve chamar openDrawer após 5 segundos', () => {
    const openDrawer = vi.fn();
    renderHook(() => useProactiveDrawer({ isDrawerOpen: false, onOpen: openDrawer }));

    expect(openDrawer).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(5000); });
    expect(openDrawer).toHaveBeenCalledTimes(1);
  });

  it('NÃO deve abrir se drawer já está aberto', () => {
    const openDrawer = vi.fn();
    renderHook(() => useProactiveDrawer({ isDrawerOpen: true, onOpen: openDrawer }));
    act(() => { vi.advanceTimersByTime(5000); });
    expect(openDrawer).not.toHaveBeenCalled();
  });

  it('NÃO deve abrir se sessionStorage "nubo_proactive_shown" já existe', () => {
    sessionStorage.setItem('nubo_proactive_shown', 'true');
    const openDrawer = vi.fn();
    renderHook(() => useProactiveDrawer({ isDrawerOpen: false, onOpen: openDrawer }));
    act(() => { vi.advanceTimersByTime(5000); });
    expect(openDrawer).not.toHaveBeenCalled();
  });

  it('deve setar sessionStorage ao abrir', () => {
    const openDrawer = vi.fn();
    renderHook(() => useProactiveDrawer({ isDrawerOpen: false, onOpen: openDrawer }));
    act(() => { vi.advanceTimersByTime(5000); });
    expect(sessionStorage.getItem('nubo_proactive_shown')).toBe('true');
  });

  it('deve cancelar o timer no unmount', () => {
    const openDrawer = vi.fn();
    const { unmount } = renderHook(() =>
      useProactiveDrawer({ isDrawerOpen: false, onOpen: openDrawer })
    );
    unmount();
    act(() => { vi.advanceTimersByTime(5000); });
    expect(openDrawer).not.toHaveBeenCalled();
  });

  it('NÃO deve abrir em rotas de privacidade', () => {
    vi.mocked(usePathname).mockReturnValue('/privacidade');
    const openDrawer = vi.fn();
    renderHook(() => useProactiveDrawer({ isDrawerOpen: false, onOpen: openDrawer }));
    act(() => { vi.advanceTimersByTime(5000); });
    expect(openDrawer).not.toHaveBeenCalled();
  });
});
