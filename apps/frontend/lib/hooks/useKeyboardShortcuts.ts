'use client';

import { useEffect, useCallback } from 'react';

interface KeyboardShortcutsOptions {
  /** Ref or selector string for the search input to focus on '/' */
  searchRef?: React.RefObject<HTMLInputElement | null>;
  /** Called when 'N' is pressed outside of inputs — for creating a new item */
  onNew?: () => void;
  /** Set to false to disable shortcuts (e.g. when a modal is open) */
  enabled?: boolean;
}

/**
 * Registers page-level keyboard shortcuts:
 *  '/'  — focuses the search input (if searchRef provided)
 *  'N'  — triggers onNew callback (if provided), outside of inputs/textareas
 */
export function useKeyboardShortcuts({
  searchRef,
  onNew,
  enabled = true,
}: KeyboardShortcutsOptions = {}) {
  const isEditableTarget = useCallback((target: EventTarget | null): boolean => {
    if (!target) return false;
    const el = target as HTMLElement;
    const tag = el.tagName?.toLowerCase();
    return (
      tag === 'input' ||
      tag === 'textarea' ||
      tag === 'select' ||
      el.isContentEditable
    );
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when modifier keys are held
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // '/' — focus search input
      if (e.key === '/' && searchRef?.current) {
        // Don't intercept if already in an editable element (let it type '/')
        if (isEditableTarget(e.target)) return;
        e.preventDefault();
        searchRef.current.focus();
        searchRef.current.select();
        return;
      }

      // 'n' or 'N' — new item (only outside inputs)
      if ((e.key === 'n' || e.key === 'N') && onNew) {
        if (isEditableTarget(e.target)) return;
        e.preventDefault();
        onNew();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, searchRef, onNew, isEditableTarget]);
}
