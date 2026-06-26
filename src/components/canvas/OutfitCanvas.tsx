import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Stage, Layer, Rect, Image as KonvaImage, Transformer } from 'react-konva';
import type Konva from 'konva';
import { IMPORT_TAG, type GarmentAngle, type GarmentImages } from '../../types';
import { useWardrobe } from '../../store/wardrobeStore';
import { getImageUrl, putImage } from '../../lib/imageStore';
import { downscaleBlob, imageDimensions } from '../../lib/imageUtils';
import { BODY_PARTS, findBodyPart } from '../../lib/bodyParts';
import { useHtmlImage } from '../../hooks/useHtmlImage';
import { GarmentNode } from './GarmentNode';
import { CanvasToolbar, type Tool } from './CanvasToolbar';

export interface CanvasHandle {
  exportPNG: () => string | null;
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
  tryEraseUndo: () => boolean;
  tryEraseRedo: () => boolean;
}

const MIN_SCALE = 0.3;
const MAX_SCALE = 4;
const DEFAULT_SCALE = 1 / 1.2; // ≈0.83 — one zoom-out step from 1:1
const DEFAULT_H = 260;
const MAX_ERASE_UNDO = 24;
const FIGURE_H = 660; // background guide height in world units

function resolveImageKey(images: GarmentImages, angle: GarmentAngle): string {
  return images[angle] ?? images.front;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

interface EditSession {
  itemId: string;
  canvas: HTMLCanvasElement;
  dirty: boolean;
  undo: ImageData[];
  redo: ImageData[];
}

export const OutfitCanvas = forwardRef<CanvasHandle>((_props, ref) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const bgRef = useRef<Konva.Rect>(null);
  const nodes = useRef<Map<string, Konva.Image>>(new Map());

  const [size, setSize] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(DEFAULT_SCALE);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [spaceDown, setSpaceDown] = useState(false);
  const [tool, setTool] = useState<Tool>('move');
  const [brush, setBrush] = useState(36);
  const [editCanvas, setEditCanvas] = useState<HTMLCanvasElement | null>(null);
  const [marquee, setMarquee] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(
    null,
  );

  const {
    canvasItems,
    garments,
    selectedItemIds,
    setSelectedItem,
    setSelectedItems,
    updateCanvasItem,
    addToCanvas,
    addGarment,
    figure,
    setFigure,
  } = useWardrobe();

  const importInputRef = useRef<HTMLInputElement>(null);

  const sessionRef = useRef<EditSession | null>(null);
  const prevSizeRef = useRef({ width: 0, height: 0 });
  const erasingRef = useRef(false);
  const brushCursorRef = useRef<HTMLDivElement>(null);
  const marqueeRef = useRef(false);
  const marqueeBoxRef = useRef<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const groupDragRef = useRef<{ anchorId: string; start: Map<string, { x: number; y: number }> } | null>(
    null,
  );

  const singleId = selectedItemIds.length === 1 ? selectedItemIds[0] : null;

  const figureUrl = figure === 'off' ? null : `/figures/${figure}.png`;
  const figureImg = useHtmlImage(figureUrl);

  useEffect(() => {
    if (!wrapRef.current) return;
    const el = wrapRef.current;
    const measure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      const prev = prevSizeRef.current;
      // When the canvas area resizes (e.g. a sidebar/cart toggles), shift the
      // pan by half the delta so whatever was centred stays centred.
      if (prev.width && (w !== prev.width || h !== prev.height)) {
        setPos((p) => ({ x: p.x + (w - prev.width) / 2, y: p.y + (h - prev.height) / 2 }));
      }
      prevSizeRef.current = { width: w, height: h };
      setSize({ width: w, height: h });
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (size.width && pos.x === 0 && pos.y === 0) {
      setPos({ x: size.width / 2, y: size.height / 2 });
    }
  }, [size, pos.x, pos.y]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !(e.target as HTMLElement)?.matches('input,textarea')) {
        e.preventDefault();
        setSpaceDown(true);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpaceDown(false);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  // Transformer attaches to all unlocked selected nodes (move mode only).
  useEffect(() => {
    const tr = trRef.current;
    if (!tr) return;
    const ns =
      tool === 'move'
        ? canvasItems
            .filter((c) => selectedItemIds.includes(c.id) && !c.locked)
            .map((c) => nodes.current.get(c.id))
            .filter((n): n is Konva.Image => !!n)
        : [];
    tr.nodes(ns);
    tr.getLayer()?.batchDraw();
  }, [selectedItemIds, canvasItems, tool]);

  const ordered = [...canvasItems].sort((a, b) => a.zIndex - b.zIndex);
  const garmentById = useMemo(
    () => Object.fromEntries([...garments, ...BODY_PARTS].map((g) => [g.id, g])),
    [garments],
  );
  const garmentByIdRef = useRef(garmentById);
  garmentByIdRef.current = garmentById;

  const registerNode = useCallback((id: string, node: Konva.Image | null) => {
    if (node) nodes.current.set(id, node);
    else nodes.current.delete(id);
  }, []);

  const commitSession = useCallback(async () => {
    const s = sessionRef.current;
    if (!s) return;
    sessionRef.current = null;
    if (!s.dirty) return;
    const blob = await new Promise<Blob | null>((res) => s.canvas.toBlob(res, 'image/png'));
    if (blob) {
      const key = await putImage(blob, 'edit');
      useWardrobe.getState().updateCanvasItem(s.itemId, { editedImageKey: key });
    }
  }, []);

  // Erase session: only when exactly one item is selected.
  useEffect(() => {
    let cancelled = false;
    if (tool === 'erase' && singleId) {
      (async () => {
        const item = useWardrobe.getState().canvasItems.find((c) => c.id === singleId);
        const garment = item && garmentByIdRef.current[item.garmentId];
        if (!item || !garment) return;
        const key = item.editedImageKey ?? resolveImageKey(garment.images, item.angle);
        const url = await getImageUrl(key);
        if (!url || cancelled) return;
        const image = await loadImage(url);
        if (cancelled) return;
        const cv = document.createElement('canvas');
        cv.width = image.naturalWidth;
        cv.height = image.naturalHeight;
        cv.getContext('2d')!.drawImage(image, 0, 0);
        sessionRef.current = { itemId: singleId, canvas: cv, dirty: false, undo: [], redo: [] };
        setEditCanvas(cv);
      })();
    }
    return () => {
      cancelled = true;
      void commitSession();
      setEditCanvas(null);
    };
  }, [tool, singleId, commitSession]);

  const screenToWorld = useCallback(
    (sx: number, sy: number) => ({ x: (sx - pos.x) / scale, y: (sy - pos.y) / scale }),
    [pos, scale],
  );

  // Move the Photoshop-style brush ring imperatively so we don't re-render the
  // whole node tree on every mouse move while erasing.
  function moveBrushCursor(e: React.MouseEvent) {
    const el = brushCursorRef.current;
    if (!el) return;
    if (tool !== 'erase') {
      el.style.display = 'none';
      return;
    }
    const rect = wrapRef.current!.getBoundingClientRect();
    el.style.display = 'block';
    el.style.left = `${e.clientX - rect.left}px`;
    el.style.top = `${e.clientY - rect.top}px`;
  }

  function snapshot(s: EditSession): ImageData | null {
    const ctx = s.canvas.getContext('2d');
    return ctx ? ctx.getImageData(0, 0, s.canvas.width, s.canvas.height) : null;
  }
  function beginStroke() {
    const s = sessionRef.current;
    if (!s) return;
    const snap = snapshot(s);
    if (!snap) return;
    s.undo.push(snap);
    if (s.undo.length > MAX_ERASE_UNDO) s.undo.shift();
    s.redo = [];
  }
  function restore(s: EditSession, data: ImageData) {
    s.canvas.getContext('2d')?.putImageData(data, 0, 0);
    s.dirty = true;
    nodes.current.get(s.itemId)?.getLayer()?.batchDraw();
  }
  function eraseAtPointer() {
    const s = sessionRef.current;
    const stage = stageRef.current;
    const p = stage?.getPointerPosition();
    if (!s || !p) return;
    const node = nodes.current.get(s.itemId);
    if (!node) return;
    const local = node.getAbsoluteTransform().copy().invert().point(p);
    const cw = s.canvas.width;
    const ch = s.canvas.height;
    const ix = (local.x / node.width()) * cw;
    const iy = (local.y / node.height()) * ch;
    const ctx = s.canvas.getContext('2d');
    if (!ctx) return;
    const rImg = ((brush / 2 / scale) / node.width()) * cw;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(ix, iy, Math.max(1, rImg), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    s.dirty = true;
    node.getLayer()?.batchDraw();
  }

  function zoomTo(newScale: number, center?: { x: number; y: number }) {
    const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale));
    const c = center ?? { x: size.width / 2, y: size.height / 2 };
    const worldX = (c.x - pos.x) / scale;
    const worldY = (c.y - pos.y) / scale;
    setScale(clamped);
    setPos({ x: c.x - worldX * clamped, y: c.y - worldY * clamped });
  }

  function onWheel(e: Konva.KonvaEventObject<WheelEvent>) {
    e.evt.preventDefault();
    const pointer = stageRef.current?.getPointerPosition();
    zoomTo(scale * (e.evt.deltaY > 0 ? 0.92 : 1.08), pointer ?? undefined);
  }

  async function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const garmentId = e.dataTransfer.getData('application/x-garment-id');
    if (!garmentId) return;
    const angle = (e.dataTransfer.getData('application/x-garment-angle') || 'front') as GarmentAngle;
    const garment = garments.find((g) => g.id === garmentId) ?? findBodyPart(garmentId);
    if (!garment) return;
    const rect = wrapRef.current!.getBoundingClientRect();
    const world = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
    const key = garment.images[angle] ?? garment.images.front;
    let aspect = 1;
    const url = await getImageUrl(key);
    if (url) {
      aspect = await new Promise<number>((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img.naturalWidth / img.naturalHeight || 1);
        img.onerror = () => resolve(1);
        img.src = url;
      });
    }
    addToCanvas(garmentId, angle, { x: world.x, y: world.y, width: DEFAULT_H * aspect, height: DEFAULT_H });
  }

  // Import any image straight onto the canvas (a figure, face, prop, …). It
  // becomes a hidden, canvas-only garment (so outfits still save/load) placed
  // at the centre of the current view. No background removal — used as-is.
  async function handleImportFile(file: File) {
    if (!file.type.startsWith('image/')) return;
    const scaled = await downscaleBlob(file, 1400);
    const dims = await imageDimensions(scaled);
    const key = await putImage(scaled, 'import');
    const name = (file.name.replace(/\.[^.]+$/, '').trim() || 'Imported image').slice(0, 40);
    const garment = addGarment({
      name,
      category: 'accessories',
      images: { front: key },
      tags: [IMPORT_TAG],
    });
    // Size to ~420 world units on the long edge, keeping aspect.
    const aspect = dims.w / dims.h || 1;
    const long = 420;
    const w = aspect >= 1 ? long : long * aspect;
    const h = aspect >= 1 ? long / aspect : long;
    const center = screenToWorld(size.width / 2, size.height / 2);
    addToCanvas(garment.id, 'front', { x: center.x, y: center.y, width: w, height: h });
  }

  function flip(axis: 'x' | 'y') {
    canvasItems
      .filter((c) => selectedItemIds.includes(c.id) && !c.locked)
      .forEach((item) =>
        updateCanvasItem(item.id, axis === 'x' ? { flipX: !item.flipX } : { flipY: !item.flipY }),
      );
  }

  // Opacity applies to every unlocked selected layer.
  function setSelectionOpacity(value: number) {
    canvasItems
      .filter((c) => selectedItemIds.includes(c.id) && !c.locked)
      .forEach((item) => updateCanvasItem(item.id, { opacity: value }));
  }

  // --- Selection from a garment click ---
  function selectFromNode(id: string, additive: boolean) {
    if (additive) {
      const set = new Set(selectedItemIds);
      set.has(id) ? set.delete(id) : set.add(id);
      setSelectedItems([...set]);
    } else if (!selectedItemIds.includes(id)) {
      setSelectedItem(id); // clicking an unselected item selects just it; group stays if already in it
    }
  }

  // --- Marquee + group drag handlers (move mode) ---
  function pointerScreen(): { x: number; y: number } | null {
    return stageRef.current?.getPointerPosition() ?? null;
  }

  function onStageMouseDown(e: Konva.KonvaEventObject<MouseEvent>) {
    if (tool === 'erase') {
      if (sessionRef.current) {
        beginStroke();
        erasingRef.current = true;
        eraseAtPointer();
      }
      return;
    }
    if (spaceDown) return; // panning
    const onEmpty = e.target === e.target.getStage() || e.target === bgRef.current;
    if (onEmpty) {
      const p = pointerScreen();
      if (p) {
        marqueeRef.current = true;
        marqueeBoxRef.current = { x0: p.x, y0: p.y, x1: p.x, y1: p.y };
        setMarquee(marqueeBoxRef.current);
      }
    }
  }

  function onStageMouseMove() {
    if (erasingRef.current) {
      eraseAtPointer();
      return;
    }
    if (marqueeRef.current) {
      const p = pointerScreen();
      if (p && marqueeBoxRef.current) {
        marqueeBoxRef.current = { ...marqueeBoxRef.current, x1: p.x, y1: p.y };
        setMarquee(marqueeBoxRef.current);
      }
    }
  }

  function onStageMouseUp() {
    erasingRef.current = false;
    if (!marqueeRef.current) return;
    marqueeRef.current = false;
    const m = marqueeBoxRef.current;
    marqueeBoxRef.current = null;
    setMarquee(null);
    if (!m) return;
    const dragged = Math.hypot(m.x1 - m.x0, m.y1 - m.y0);
    if (dragged < 4) {
      setSelectedItem(null); // a click on empty = deselect
      return;
    }
    const a = screenToWorld(Math.min(m.x0, m.x1), Math.min(m.y0, m.y1));
    const b = screenToWorld(Math.max(m.x0, m.x1), Math.max(m.y0, m.y1));
    const hit = canvasItems
      .filter((c) => {
        const l = c.x - c.width / 2;
        const r = c.x + c.width / 2;
        const t = c.y - c.height / 2;
        const bb = c.y + c.height / 2;
        return l < b.x && r > a.x && t < b.y && bb > a.y;
      })
      .map((c) => c.id);
    setSelectedItems(hit);
  }

  function onStageDragStart(e: Konva.KonvaEventObject<DragEvent>) {
    const id = e.target?.id?.();
    if (!id || !selectedItemIds.includes(id) || selectedItemIds.length < 2) return;
    const start = new Map<string, { x: number; y: number }>();
    selectedItemIds.forEach((sid) => {
      const n = nodes.current.get(sid);
      if (n) start.set(sid, { x: n.x(), y: n.y() });
    });
    groupDragRef.current = { anchorId: id, start };
  }

  function onStageDragMove() {
    const g = groupDragRef.current;
    if (!g) return;
    const anchor = nodes.current.get(g.anchorId);
    const a0 = g.start.get(g.anchorId);
    if (!anchor || !a0) return;
    const dx = anchor.x() - a0.x;
    const dy = anchor.y() - a0.y;
    g.start.forEach((p, sid) => {
      if (sid === g.anchorId) return;
      nodes.current.get(sid)?.position({ x: p.x + dx, y: p.y + dy });
    });
    trRef.current?.getLayer()?.batchDraw();
  }

  function onStageDragEnd(e: Konva.KonvaEventObject<DragEvent>) {
    if (e.target === stageRef.current) {
      setPos({ x: e.target.x(), y: e.target.y() });
      return;
    }
    const g = groupDragRef.current;
    if (g) {
      g.start.forEach((_p, sid) => {
        const n = nodes.current.get(sid);
        if (n) updateCanvasItem(sid, { x: n.x(), y: n.y() });
      });
      groupDragRef.current = null;
    }
  }

  useImperativeHandle(ref, () => ({
    exportPNG: () => {
      const stage = stageRef.current;
      const tr = trRef.current;
      if (!stage) return null;

      const items = canvasItems.filter((c) => c.visible);
      const kept = tr?.nodes() ?? [];
      tr?.nodes([]);
      // Hide the white backing rect so the outfit exports on a transparent
      // background (so outfits overlap cleanly in the dresser).
      bgRef.current?.visible(false);

      // Remember the current view so we can restore it after exporting.
      const savedScale = stage.scaleX();
      const savedPos = { x: stage.x(), y: stage.y() };

      let url: string;
      if (items.length === 0 || !size.width || !size.height) {
        // Nothing to frame — fall back to a plain viewport capture.
        tr?.getLayer()?.batchDraw();
        url = stage.toDataURL({ pixelRatio: 2 });
      } else {
        // World-space bounding box of every visible layer (exact rotated AABB),
        // plus the figure guide when it's on so looks are framed head-to-toe and
        // consistently regardless of the zoom/pan at save time.
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        for (const c of items) {
          const hw = c.width / 2;
          const hh = c.height / 2;
          const rad = ((c.rotation || 0) * Math.PI) / 180;
          const ca = Math.abs(Math.cos(rad));
          const sa = Math.abs(Math.sin(rad));
          const ahw = hw * ca + hh * sa;
          const ahh = hw * sa + hh * ca;
          minX = Math.min(minX, c.x - ahw);
          maxX = Math.max(maxX, c.x + ahw);
          minY = Math.min(minY, c.y - ahh);
          maxY = Math.max(maxY, c.y + ahh);
        }
        if (figureImg && figure !== 'off') {
          const figW = FIGURE_H * (figureImg.width / figureImg.height);
          minX = Math.min(minX, -figW / 2);
          maxX = Math.max(maxX, figW / 2);
          minY = Math.min(minY, -FIGURE_H / 2);
          maxY = Math.max(maxY, FIGURE_H / 2);
        }
        const pad = 0.06 * Math.max(maxX - minX, maxY - minY);
        minX -= pad;
        minY -= pad;
        maxX += pad;
        maxY += pad;
        const bw = maxX - minX;
        const bh = maxY - minY;
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;

        // Fit the bbox inside the on-screen stage (toDataURL can only capture
        // what's actually rendered in the container).
        const fit = Math.min(size.width / bw, size.height / bh);
        stage.scale({ x: fit, y: fit });
        stage.position({ x: size.width / 2 - cx * fit, y: size.height / 2 - cy * fit });
        stage.batchDraw();

        const left = size.width / 2 - (bw / 2) * fit;
        const top = size.height / 2 - (bh / 2) * fit;
        // Normalise output to ~1000px on the long edge for consistent sharpness.
        const pixelRatio = 1000 / (Math.max(bw, bh) * fit);
        url = stage.toDataURL({ x: left, y: top, width: bw * fit, height: bh * fit, pixelRatio });
      }

      // Restore the view + chrome.
      stage.scale({ x: savedScale, y: savedScale });
      stage.position(savedPos);
      bgRef.current?.visible(true);
      tr?.nodes(kept);
      tr?.getLayer()?.batchDraw();
      return url;
    },
    zoomIn: () => zoomTo(scale * 1.2),
    zoomOut: () => zoomTo(scale / 1.2),
    resetView: () => {
      setScale(DEFAULT_SCALE);
      setPos({ x: size.width / 2, y: size.height / 2 });
    },
    tryEraseUndo: () => {
      const s = sessionRef.current;
      if (!s || s.undo.length === 0) return false;
      const cur = snapshot(s);
      if (cur) s.redo.push(cur);
      restore(s, s.undo.pop()!);
      return true;
    },
    tryEraseRedo: () => {
      const s = sessionRef.current;
      if (!s || s.redo.length === 0) return false;
      const cur = snapshot(s);
      if (cur) s.undo.push(cur);
      restore(s, s.redo.pop()!);
      return true;
    },
  }));

  const cursor = tool === 'erase' ? 'crosshair' : spaceDown ? 'grab' : 'default';
  const unlockedSelected = canvasItems.filter(
    (c) => selectedItemIds.includes(c.id) && !c.locked,
  );
  // Opacity shown in the toolbar reflects the first selected layer.
  const selectionOpacity = unlockedSelected[0]?.opacity ?? 1;

  // Marquee overlay rect in screen px.
  const mRect = marquee && {
    left: Math.min(marquee.x0, marquee.x1),
    top: Math.min(marquee.y0, marquee.y1),
    width: Math.abs(marquee.x1 - marquee.x0),
    height: Math.abs(marquee.y1 - marquee.y0),
  };

  return (
    <div
      ref={wrapRef}
      className="relative h-full w-full overflow-hidden bg-[var(--canvas-stage)]"
      style={{ cursor }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      onMouseMove={moveBrushCursor}
      onMouseLeave={() => {
        if (brushCursorRef.current) brushCursorRef.current.style.display = 'none';
      }}
    >
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        scaleX={scale}
        scaleY={scale}
        x={pos.x}
        y={pos.y}
        draggable={spaceDown && tool === 'move'}
        onWheel={onWheel}
        onMouseDown={onStageMouseDown}
        onMouseMove={onStageMouseMove}
        onMouseUp={onStageMouseUp}
        onMouseLeave={() => {
          erasingRef.current = false;
        }}
        onDragStart={onStageDragStart}
        onDragMove={onStageDragMove}
        onDragEnd={onStageDragEnd}
      >
        <Layer>
          <Rect ref={bgRef} x={-6000} y={-6000} width={12000} height={12000} fill="#ffffff" />

          {/* Background figure guide (centered at world origin, non-interactive) */}
          {figureImg && (
            <KonvaImage
              image={figureImg}
              width={FIGURE_H * (figureImg.width / figureImg.height)}
              height={FIGURE_H}
              x={-(FIGURE_H * (figureImg.width / figureImg.height)) / 2}
              y={-FIGURE_H / 2}
              opacity={0.9}
              listening={false}
            />
          )}

          {ordered.map((item) => {
            const garment = garmentById[item.garmentId];
            if (!garment) return null;
            const isEditing = tool === 'erase' && item.id === singleId;
            const moveMode = tool === 'move' && !item.locked;
            return (
              <GarmentNode
                key={item.id}
                id={item.id}
                imageKey={item.editedImageKey ?? resolveImageKey(garment.images, item.angle)}
                overrideImage={isEditing ? editCanvas : null}
                worldCenter={{ x: item.x, y: item.y }}
                worldW={item.width}
                worldH={item.height}
                rotation={item.rotation}
                flipX={item.flipX}
                flipY={item.flipY}
                opacity={item.opacity}
                visible={item.visible}
                editable={moveMode}
                draggable={moveMode}
                onSelect={(additive) => selectFromNode(item.id, additive)}
                onChange={(n) =>
                  updateCanvasItem(item.id, {
                    x: n.cx,
                    y: n.cy,
                    width: n.w,
                    height: n.h,
                    rotation: n.rotation,
                  })
                }
                registerNode={registerNode}
              />
            );
          })}

          <Transformer
            ref={trRef}
            rotateEnabled
            keepRatio
            anchorStroke="#0000c5"
            anchorFill="#0000c5"
            anchorSize={9}
            borderStroke="#0000c5"
            borderStrokeWidth={1}
            boundBoxFunc={(oldBox, newBox) =>
              newBox.width < 20 || newBox.height < 20 ? oldBox : newBox
            }
          />
        </Layer>
      </Stage>

      {mRect && (
        <div
          className="pointer-events-none absolute border border-[var(--accent)] bg-[var(--accent-dim)]"
          style={mRect}
        />
      )}

      {canvasItems.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center overflow-hidden">
          <span className="watermark text-[15vw] text-black/[0.04]">FitDraft</span>
          <p className="absolute text-[14px] text-ink-muted">
            Drag items from your wardrobe onto the canvas
          </p>
        </div>
      )}

      {tool === 'erase' && (
        <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-pill bg-black/70 px-3 py-1 text-[11px] text-white">
          Eraser — drag over the selected layer
        </div>
      )}

      {/* Hidden file picker for the toolbar's import-image button. */}
      <input
        ref={importInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) void handleImportFile(f);
        }}
      />

      {/* Photoshop-style brush ring showing where/how big the eraser is. */}
      <div
        ref={brushCursorRef}
        className="pointer-events-none absolute z-10 rounded-full border-2 border-[#0000c5] shadow-[0_0_0_1.5px_rgba(255,255,255,0.85)]"
        style={{
          display: 'none',
          width: brush,
          height: brush,
          transform: 'translate(-50%, -50%)',
        }}
      />

      <CanvasToolbar
        tool={tool}
        setTool={(t) => {
          if (t === 'erase' && !singleId) return;
          if (t === 'erase' && canvasItems.find((c) => c.id === singleId)?.locked) return;
          setTool(t);
        }}
        brush={brush}
        setBrush={setBrush}
        opacity={selectionOpacity}
        setOpacity={setSelectionOpacity}
        onImport={() => importInputRef.current?.click()}
        onFlipH={() => flip('x')}
        onFlipV={() => flip('y')}
        hasSelection={unlockedSelected.length > 0}
        canErase={!!singleId && !canvasItems.find((c) => c.id === singleId)?.locked}
        figure={figure}
        setFigure={setFigure}
      />
    </div>
  );
});

OutfitCanvas.displayName = 'OutfitCanvas';
