/**
 * MEDiKIOSK — PHASE 00
 * Keyboard Shortcut & Media Query Hooks
 */

import { useEffect, useState } from 'react';

interface ShortcutOptions {
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  preventDefault?: boolean;
}

export function useKeyboardShortcut(
  targetKey: string,
  callback: (event: KeyboardEvent) => void,
  options: ShortcutOptions = {}
) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isKeyMatch = event.key.toLowerCase() === targetKey.toLowerCase();
      const isCtrlMatch = options.ctrlKey ? (event.ctrlKey || event.metaKey) : true;
      const isShiftMatch = options.shiftKey ? event.shiftKey : true;
      const isAltMatch = options.altKey ? event.altKey : true;

      if (isKeyMatch && isCtrlMatch && isShiftMatch && isAltMatch) {
        if (options.preventDefault) {
          event.preventDefault();
        }
        callback(event);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [targetKey, callback, options]);
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);
    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);
    mediaQueryList.addEventListener('change', listener);
    setMatches(mediaQueryList.matches);
    return () => mediaQueryList.removeEventListener('change', listener);
  }, [query]);

  return matches;
}
