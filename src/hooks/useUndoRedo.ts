import { useCallback, useEffect, useRef, useState } from 'react';
import { useWardrobe } from '../store/wardrobeStore';
import type { CanvasItem } from '../types';

const MAX = 50;

/** History of canvas-item snapshots with undo/redo (command-stack equivalent). */
export function useUndoRedo() {
  const past = useRef<CanvasItem[][]>([]);
  const future = useRef<CanvasItem[][]>([]);
  const applying = useRef(false);
  const prev = useRef<CanvasItem[]>(useWardrobe.getState().canvasItems);
  const [, force] = useState(0);
  const rerender = () => force((n) => n + 1);

  useEffect(() => {
    const unsub = useWardrobe.subscribe((state) => {
      const next = state.canvasItems;
      if (next === prev.current) return;
      if (applying.current) {
        prev.current = next;
        applying.current = false;
        return;
      }
      past.current.push(prev.current);
      if (past.current.length > MAX) past.current.shift();
      future.current = [];
      prev.current = next;
      rerender();
    });
    return unsub;
  }, []);

  const undo = useCallback(() => {
    if (!past.current.length) return;
    const snapshot = past.current.pop()!;
    future.current.push(prev.current);
    applying.current = true;
    prev.current = snapshot;
    useWardrobe.getState().setCanvasItems(snapshot);
    useWardrobe.getState().setSelectedItem(null);
    rerender();
  }, []);

  const redo = useCallback(() => {
    if (!future.current.length) return;
    const snapshot = future.current.pop()!;
    past.current.push(prev.current);
    applying.current = true;
    prev.current = snapshot;
    useWardrobe.getState().setCanvasItems(snapshot);
    useWardrobe.getState().setSelectedItem(null);
    rerender();
  }, []);

  return {
    undo,
    redo,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
  };
}
