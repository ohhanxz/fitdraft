import { useEffect, useRef } from 'react';
import { Image as KonvaImage } from 'react-konva';
import type Konva from 'konva';
import { useImageUrl } from '../../hooks/useImageUrl';
import { useHtmlImage } from '../../hooks/useHtmlImage';

export interface GarmentNodeChange {
  cx: number;
  cy: number;
  w: number;
  h: number;
  rotation: number;
}

interface Props {
  id: string;
  imageKey: string;
  /** When set (erase session), render this canvas instead of loading the key. */
  overrideImage?: HTMLCanvasElement | null;
  worldCenter: { x: number; y: number };
  worldW: number;
  worldH: number;
  rotation: number;
  flipX?: boolean;
  flipY?: boolean;
  visible: boolean;
  editable: boolean; // eligible for the transformer (move mode, unlocked)
  draggable: boolean;
  onSelect: (additive: boolean) => void;
  onChange: (next: GarmentNodeChange) => void;
  registerNode: (id: string, node: Konva.Image | null) => void;
}

export function GarmentNode({
  id,
  imageKey,
  overrideImage,
  worldCenter,
  worldW,
  worldH,
  rotation,
  flipX,
  flipY,
  visible,
  editable,
  draggable,
  onSelect,
  onChange,
  registerNode,
}: Props) {
  const url = useImageUrl(overrideImage ? null : imageKey);
  const loaded = useHtmlImage(url);
  const img = overrideImage ?? loaded;
  const ref = useRef<Konva.Image | null>(null);

  useEffect(() => {
    registerNode(id, ref.current);
    return () => registerNode(id, null);
  }, [id, registerNode, img]);

  if (!visible || !img) return null;

  const sx = flipX ? -1 : 1;
  const sy = flipY ? -1 : 1;

  return (
    <KonvaImage
      ref={(n) => {
        ref.current = n;
        registerNode(id, n);
      }}
      id={id}
      image={img}
      x={worldCenter.x}
      y={worldCenter.y}
      offsetX={worldW / 2}
      offsetY={worldH / 2}
      width={worldW}
      height={worldH}
      scaleX={sx}
      scaleY={sy}
      rotation={rotation}
      draggable={draggable}
      listening={editable}
      shadowColor="black"
      shadowBlur={28}
      shadowOffset={{ x: 3, y: 5 }}
      shadowOpacity={0.18}
      onMouseDown={(e) => onSelect(e.evt.shiftKey)}
      onTap={() => onSelect(false)}
      onDragEnd={(e) =>
        onChange({ cx: e.target.x(), cy: e.target.y(), w: worldW, h: worldH, rotation })
      }
      onTransformEnd={() => {
        const node = ref.current;
        if (!node) return;
        const nsx = node.scaleX();
        const nsy = node.scaleY();
        // Restore the flip sign; fold the resize factor into width/height.
        node.scaleX(sx);
        node.scaleY(sy);
        onChange({
          cx: node.x(),
          cy: node.y(),
          w: Math.max(20, node.width() * Math.abs(nsx)),
          h: Math.max(20, node.height() * Math.abs(nsy)),
          rotation: node.rotation(),
        });
      }}
    />
  );
}
