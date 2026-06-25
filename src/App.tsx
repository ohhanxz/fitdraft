import { useCallback, useEffect, useRef, useState } from 'react';
import { Topbar } from './components/Topbar';
import { Sidebar, type SidebarTab } from './components/sidebar/Sidebar';
import { CartSidebar } from './components/CartSidebar';
import { OutfitCanvas, type CanvasHandle } from './components/canvas/OutfitCanvas';
import { CanvasControls } from './components/canvas/CanvasControls';
import { LayerPanel } from './components/canvas/LayerPanel';
import { AddItemModal } from './components/modals/AddItemModal';
import { ItemEditor } from './components/modals/ItemEditor';
import { SaveOutfitModal } from './components/modals/SaveOutfitModal';
import { DresserCarousel } from './components/DresserCarousel';
import { SplashScreen } from './components/SplashScreen';
import { X } from 'lucide-react';
import { useWardrobe } from './store/wardrobeStore';
import { useUndoRedo } from './hooks/useUndoRedo';
import { putImage, requestPersistentStorage } from './lib/imageStore';

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return !!el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
}

export default function App() {
  const {
    canvasItems,
    selectedItemIds,
    setSelectedItem,
    removeFromCanvas,
    updateCanvasItem,
    duplicateCanvasItem,
    clearCanvas,
    saveOutfit,
    loadOutfit,
    outfits,
    garments,
    editingGarmentId,
    setEditingGarment,
  } = useWardrobe();

  const editingGarment = garments.find((g) => g.id === editingGarmentId) ?? null;

  const [addOpen, setAddOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [savePreview, setSavePreview] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [tab, setTab] = useState<SidebarTab>('wardrobe');

  const canvasRef = useRef<CanvasHandle>(null);
  const clipboard = useRef<string[]>([]);
  const { undo, redo, canUndo, canRedo } = useUndoRedo();

  // Ask the browser to keep our localStorage + IndexedDB durable so a built-up
  // wardrobe isn't silently evicted under storage pressure.
  useEffect(() => {
    void requestPersistentStorage();
  }, []);

  // z-order nudge only makes sense for a single selected layer.
  const singleId = selectedItemIds.length === 1 ? selectedItemIds[0] : null;

  const reorder = useCallback(
    (dir: 1 | -1) => {
      if (!singleId) return;
      if (canvasItems.find((c) => c.id === singleId)?.locked) return;
      const sorted = [...canvasItems].sort((a, b) => a.zIndex - b.zIndex);
      const idx = sorted.findIndex((c) => c.id === singleId);
      const swapIdx = idx + dir;
      if (idx < 0 || swapIdx < 0 || swapIdx >= sorted.length) return;
      const a = sorted[idx];
      const b = sorted[swapIdx];
      updateCanvasItem(a.id, { zIndex: b.zIndex });
      updateCanvasItem(b.id, { zIndex: a.zIndex });
    },
    [singleId, canvasItems, updateCanvasItem],
  );

  const handleSave = useCallback(() => {
    if (canvasItems.length === 0) return;
    setSavePreview(canvasRef.current?.exportPNG() ?? null);
    setSaveOpen(true);
  }, [canvasItems.length]);

  const handleDownload = useCallback(() => {
    if (canvasItems.length === 0) return;
    const url = canvasRef.current?.exportPNG();
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    const stamp = new Date().toISOString().slice(0, 10);
    a.download = `fitdraft-${stamp}.png`;
    a.click();
  }, [canvasItems.length]);

  const cycleSelection = useCallback(() => {
    const sorted = [...canvasItems].sort((a, b) => a.zIndex - b.zIndex).filter((c) => !c.locked);
    if (sorted.length === 0) return;
    const idx = sorted.findIndex((c) => c.id === singleId);
    setSelectedItem(sorted[(idx + 1) % sorted.length].id);
  }, [canvasItems, singleId, setSelectedItem]);

  // Global keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      // While the Add/Edit/Save modal owns the screen, don't run canvas
      // shortcuts. Crucially, this stops Ctrl+V from being preventDefault'd
      // here so the native paste reaches the ItemEditor's image-slot listener.
      if (addOpen || saveOpen || editingGarmentId) return;
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setCollapsed((v) => !v);
        return;
      }
      if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
        return;
      }
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          if (!canvasRef.current?.tryEraseRedo()) redo();
        } else {
          if (!canvasRef.current?.tryEraseUndo()) undo();
        }
        return;
      }
      if (mod && e.key.toLowerCase() === 'c') {
        clipboard.current = [...selectedItemIds];
        return;
      }
      if (mod && (e.key.toLowerCase() === 'v' || e.key.toLowerCase() === 'd')) {
        // Paste / duplicate the copied (or selected) layers.
        const srcIds = e.key.toLowerCase() === 'd' ? selectedItemIds : clipboard.current;
        if (srcIds.length) {
          e.preventDefault();
          srcIds.forEach((id) => duplicateCanvasItem(id));
        }
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedItemIds.length) {
        e.preventDefault();
        const locked = new Set(canvasItems.filter((c) => c.locked).map((c) => c.id));
        selectedItemIds.filter((id) => !locked.has(id)).forEach((id) => removeFromCanvas(id));
        return;
      }
      if (e.key === 'Escape') {
        setSelectedItem(null);
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        cycleSelection();
        return;
      }
      if (e.key === '[') {
        reorder(-1);
        return;
      }
      if (e.key === ']') {
        reorder(1);
        return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    handleSave,
    undo,
    redo,
    selectedItemIds,
    canvasItems,
    removeFromCanvas,
    duplicateCanvasItem,
    setSelectedItem,
    cycleSelection,
    reorder,
    addOpen,
    saveOpen,
    editingGarmentId,
  ]);

  async function confirmSave(name: string) {
    const url = canvasRef.current?.exportPNG();
    if (url) {
      const blob = await (await fetch(url)).blob();
      const key = await putImage(blob, 'thumb');
      saveOutfit(name, key);
    }
    setSaveOpen(false);
    setTab('wardrobe');
  }

  const [rebuilding, setRebuilding] = useState(false);
  // Re-export every saved outfit's thumbnail with a transparent background
  // (fixes older outfits saved with the white canvas baked in).
  const rebuildThumbnails = useCallback(async () => {
    const st = useWardrobe.getState();
    if (rebuilding || st.outfits.length === 0) return;
    setRebuilding(true);
    const saved = st.canvasItems;
    for (const o of st.outfits) {
      useWardrobe.getState().setCanvasItems(o.items.map((c) => ({ ...c })));
      await new Promise((r) => setTimeout(r, 450));
      const url = canvasRef.current?.exportPNG();
      if (url) {
        const blob = await (await fetch(url)).blob();
        const key = await putImage(blob, 'thumb');
        useWardrobe.getState().updateOutfitThumbnail(o.id, key);
      }
    }
    useWardrobe.getState().setCanvasItems(saved);
    setRebuilding(false);
  }, [rebuilding]);

  function handleLoadOutfit(id: string) {
    const missing = loadOutfit(id);
    if (missing.length) {
      window.alert(
        `${missing.length} item(s) in this outfit are no longer in your wardrobe and were skipped.`,
      );
    }
  }

  const dresser = tab === 'outfits';

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <Topbar
        onAddItem={() => setAddOpen(true)}
        onSaveOutfit={handleSave}
        canSave={canvasItems.length > 0}
      />

      <div
        className={`flex min-h-0 flex-1 transition-[opacity,transform] duration-[420ms] ease-out [will-change:opacity,transform] ${
          dresser ? 'pointer-events-none scale-[0.99] opacity-0' : 'opacity-100'
        }`}
      >
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((v) => !v)}
          tab={tab}
          onTabChange={setTab}
          onAddItem={() => setAddOpen(true)}
          onLoadOutfit={handleLoadOutfit}
        />

        <main className="relative min-w-0 flex-1">
          <OutfitCanvas ref={canvasRef} />
          <LayerPanel />
          <CanvasControls
            onZoomIn={() => canvasRef.current?.zoomIn()}
            onZoomOut={() => canvasRef.current?.zoomOut()}
            onReset={() => canvasRef.current?.resetView()}
            onUndo={undo}
            onRedo={redo}
            onDownload={handleDownload}
            onClear={() => {
              if (canvasItems.length && window.confirm('Clear everything off the canvas?')) {
                clearCanvas();
              }
            }}
            canUndo={canUndo}
            canRedo={canRedo}
            canDownload={canvasItems.length > 0}
            canClear={canvasItems.length > 0}
          />

          {/* Edit item — takes over the canvas area */}
          {editingGarment && (
            <div className="absolute inset-0 z-30 flex flex-col bg-canvas">
              <header className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--border-subtle)] px-4">
                <h2 className="font-display text-[18px]">Edit item</h2>
                <button
                  onClick={() => setEditingGarment(null)}
                  className="press rounded-sm p-1.5 text-ink-muted hover:bg-pearl hover:text-ink"
                  aria-label="Close editor"
                  title="Close and return to canvas"
                >
                  <X size={18} />
                </button>
              </header>
              <div className="flex-1 overflow-auto p-6">
                <ItemEditor
                  mode="edit"
                  garment={editingGarment}
                  active={!!editingGarment}
                  onClose={() => setEditingGarment(null)}
                />
              </div>
            </div>
          )}
        </main>

        <CartSidebar />
      </div>

      <DresserCarousel
        open={dresser}
        rebuilding={rebuilding}
        onRebuild={rebuildThumbnails}
        onClose={() => setTab('wardrobe')}
        onPick={(id) => {
          handleLoadOutfit(id);
          setTab('wardrobe');
        }}
      />

      <SplashScreen />

      <AddItemModal open={addOpen} onClose={() => setAddOpen(false)} />
      <SaveOutfitModal
        open={saveOpen}
        defaultName={`Outfit ${outfits.length + 1}`}
        previewUrl={savePreview}
        onClose={() => setSaveOpen(false)}
        onConfirm={confirmSave}
      />
    </div>
  );
}
