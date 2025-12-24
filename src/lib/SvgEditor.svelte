<script lang="ts">
  import { onMount } from 'svelte';
  import {
    Upload,
    MousePointer2,
    Pen,
    Square,
    Circle as CircleIcon,
    Download,
    Trash2,
    Undo,
    Redo,
    Layers,
    X,
    Hexagon,
    History,
    Clock,
    CheckCircle2,
    Eye,
    EyeOff,
    Image as ImageIcon,
    Move,
    Hand,
    ZoomIn,
    ZoomOut,
    FileType,
    MoreVertical,
    CornerUpLeft,
    Spline,
    Trash,
    Type,
    Plus,
    Settings,
    Play,
    Pause,
    Palette,
    FastForward,
    Repeat,
    Save,
    Video,
    Film,
    Edit2,
    Check,
    RefreshCw
  } from 'lucide-svelte';

  // --- Types ---
  type Tool = 'select' | 'hand' | 'pen' | 'rect' | 'circle' | 'text' | 'poly' | 'image';
  type AnimationType = 'none' | 'spin' | 'pulse' | 'bounce' | 'float' | 'color-cycle' | 'wiggle' | 'jello' | 'gradient' | 'custom';

  interface AnimationStep {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    fill: string;
    stroke: string;
    rotation: number;
    scale: number;
    opacity: number;
    duration: number;
    easing: string;
    points?: Point[];
  }

  interface AnimationSettings {
    type: AnimationType;
    duration: number;
    delay: number;
    timingFunction: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';
    direction: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
    fillMode: 'none' | 'forwards' | 'backwards' | 'both';
    infinite: boolean;
    steps: AnimationStep[];
  }

  interface Point {
    x: number;
    y: number;
    handleIn?: { x: number; y: number };
    handleOut?: { x: number; y: number };
  }

  interface Shape {
    id: string;
    type: 'path' | 'rect' | 'circle' | 'text' | 'image';
    x: number;
    y: number;
    width?: number;
    height?: number;
    points?: Point[];
    pathData?: string;
    text?: string;
    href?: string;
    stroke: string;
    fill: string;
    strokeWidth: number;
    fontSize?: number;
    rotation: number;
    scale?: number;
    opacity?: number;
    visible: boolean;
    animation?: AnimationSettings;
  }

  interface ImageLayer {
    x: number;
    y: number;
    width: number;
    height: number;
  }

  interface ViewTransform {
    x: number;
    y: number;
    zoom: number;
  }

  interface HistoryState {
    id: string;
    shapes: Shape[];
    timestamp: number;
    description: string;
  }

  interface ContextMenuState {
    x: number;
    y: number;
    type: 'canvas' | 'shape' | 'point';
    targetId?: string;
    pointIndex?: number;
  }

  // --- Helper: Generate ID ---
  const generateId = () => Math.random().toString(36).substr(2, 9);

  // --- Helper: Generate Path D ---
  const getShapePathData = (shape: Shape, overridePoints?: Point[]) => {
    let d = shape.pathData || '';
    const pts = overridePoints || shape.points;
    if (shape.type === 'path' && pts && pts.length > 0) {
      d = pts.reduce((acc, point, i, arr) => {
        if (i === 0) return `M ${point.x} ${point.y}`;
        const prev = arr[i - 1];

        const cp1 = prev.handleOut ? prev.handleOut : { x: prev.x, y: prev.y };
        const cp2 = point.handleIn ? point.handleIn : { x: point.x, y: point.y };

        return `${acc} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${point.x} ${point.y}`;
      }, '');

      if (shape.pathData?.endsWith('Z') || (pts.length > 2 && shape.fill !== 'none')) {
        d += ' Z';
      }
    }
    return d;
  };

  // --- State ---
  let view = $state<ViewTransform>({ x: 0, y: 0, zoom: 1 });
  let image = $state<string | null>(null);
  let imageVisible = $state(true);
  let imageLayer = $state<ImageLayer>({ x: 0, y: 0, width: 800, height: 600 });
  let showWelcome = $state(true);
  let isPlaying = $state(false);
  let editingStepId = $state<string | null>(null);
  let tool = $state<Tool>('select');
  let shapes = $state<Shape[]>([]);
  let selectedId = $state<string | null>(null);
  let activePolyId = $state<string | null>(null);
  let selectedPointIndex = $state<number | null>(null);
  let contextMenu = $state<ContextMenuState | null>(null);
  let sidebarTab = $state<'layers' | 'history' | 'properties'>('layers');
  let history = $state<HistoryState[]>([{
    id: generateId(),
    shapes: [],
    timestamp: Date.now(),
    description: "Initial Empty State"
  }]);
  let historyStep = $state(0);
  let currentColor = $state('#ef4444');
  let currentFill = $state('transparent');
  let currentStrokeWidth = $state(4);
  let currentFontSize = $state(24);
  let isDragging = $state(false);
  let isSpacePressed = $state(false);
  let dragStart = $state<{ x: number; y: number } | null>(null);
  let dragStartWorld = $state<Point | null>(null);
  let dragHandle = $state<'nw' | 'ne' | 'se' | 'sw' | 'move' | 'point' | 'handleIn' | 'handleOut' | 'pan' | null>(null);
  let dragPointIndex = $state<number | null>(null);

  let svgRef: SVGSVGElement;
  let containerRef: HTMLDivElement;
  let isDirtyRef = false;

  // --- Derived ---
  let selectedShape = $derived(selectedId ? shapes.find(s => s.id === selectedId) : null);
  
  // --- Animation Generator ---
  const generateAnimationCSS = (shape: Shape) => {
    if (!shape.animation || shape.animation.type !== 'custom' || !shape.animation.steps) return '';
    
    const steps = shape.animation.steps;
    const totalDuration = steps.reduce((acc, s) => acc + s.duration, 0);
    if (totalDuration === 0) return '';

    let keyframes = `@keyframes anim-${shape.id} {\n`;
    let currentPercent = 0;
    let accumulatedTime = 0;

    // Start state (0%)
    keyframes += `  0% { transform: translate(${shape.x}px, ${shape.y}px) rotate(${shape.rotation}deg) scale(${shape.scale || 1}); opacity: ${shape.opacity || 1}; fill: ${shape.fill}; stroke: ${shape.stroke}; }\n`;

    steps.forEach((step) => {
      accumulatedTime += step.duration;
      currentPercent = (accumulatedTime / totalDuration) * 100;
      keyframes += `  ${currentPercent}% { transform: translate(${step.x}px, ${step.y}px) rotate(${step.rotation}deg) scale(${step.scale}); opacity: ${step.opacity}; fill: ${step.fill}; stroke: ${step.stroke}; }\n`;
    });

    keyframes += `}\n`;
    return keyframes;
  };

  let customAnimationStyles = $derived(
    shapes.filter(s => s.animation?.type === 'custom').map(s => generateAnimationCSS(s)).join('\n')
  );

  // --- History Helpers ---
  const addToHistory = (newShapes: Shape[], description: string) => {
    const newHistory = history.slice(0, historyStep + 1);
    const newState: HistoryState = {
      id: generateId(),
      shapes: JSON.parse(JSON.stringify(newShapes)),
      timestamp: Date.now(),
      description
    };
    history = [...newHistory, newState];
    historyStep = newHistory.length;
  };

  const restoreState = (index: number) => {
    if (index >= 0 && index < history.length) {
      const state = history[index];
      shapes = JSON.parse(JSON.stringify(state.shapes));
      historyStep = index;
      selectedId = null;
      selectedPointIndex = null;
      activePolyId = null;
    }
  };

  const undo = () => {
    if (activePolyId) {
      const shape = shapes.find(s => s.id === activePolyId);
      if (!shape || (shape.points?.length || 0) <= 2) {
        activePolyId = null;
        shapes = shapes.filter(s => s.id !== activePolyId);
      } else {
        const newPoints = [...(shape.points || [])];
        newPoints.splice(newPoints.length - 2, 1);
        shapes = shapes.map(s => s.id === activePolyId ? { ...s, points: newPoints } : s);
      }
      return;
    }
    if (historyStep > 0) {
      restoreState(historyStep - 1);
    }
  };

  const redo = () => {
    if (historyStep < history.length - 1) {
      restoreState(historyStep + 1);
    }
  };

  // --- Polygon Logic ---
  const finishPolygon = () => {
    if (activePolyId) {
      const finalShapes = shapes.map(s => {
        if (s.id === activePolyId && s.points) {
          let finalPoints = s.points.slice(0, -1);
          if (finalPoints.length > 1) {
            const last = finalPoints[finalPoints.length - 1];
            const prev = finalPoints[finalPoints.length - 2];
            if (Math.abs(last.x - prev.x) < 2 && Math.abs(last.y - prev.y) < 2) {
              finalPoints.pop();
            }
          }
          return { ...s, points: finalPoints };
        }
        return s;
      });
      shapes = finalShapes;
      addToHistory(finalShapes, "Draw Polygon");
      activePolyId = null;
    }
  };

  // --- Action Helpers ---
  const deleteSelected = () => {
    if (selectedId) {
      const newShapes = shapes.filter(s => s.id !== selectedId);
      shapes = newShapes;
      addToHistory(newShapes, "Delete Item");
      selectedId = null;
      selectedPointIndex = null;
    }
  };

  const deletePoint = (shapeId: string, pointIndex: number) => {
    const newShapes = shapes.map(s => {
      if (s.id === shapeId && s.points) {
        const newPoints = [...s.points];
        newPoints.splice(pointIndex, 1);
        return { ...s, points: newPoints };
      }
      return s;
    }).filter(s => !s.points || s.points.length > 1);

    shapes = newShapes;
    addToHistory(newShapes, "Delete Point");
    contextMenu = null;
  };

  const toggleSmoothPoint = (shapeId: string, pointIndex: number) => {
    const newShapes = shapes.map(s => {
      if (s.id === shapeId && s.points) {
        const newPoints = [...s.points];
        const pt = newPoints[pointIndex];

        if (pt.handleIn || pt.handleOut) {
          newPoints[pointIndex] = { x: pt.x, y: pt.y };
        } else {
          newPoints[pointIndex] = {
            ...pt,
            handleIn: { x: pt.x - 30, y: pt.y },
            handleOut: { x: pt.x + 30, y: pt.y }
          };
        }
        return { ...s, points: newPoints };
      }
      return s;
    });
    shapes = newShapes;
    addToHistory(newShapes, "Toggle Smooth/Corner");
    contextMenu = null;
  };

  const updateText = (shapeId: string, newText: string) => {
    const newShapes = shapes.map(s => s.id === shapeId ? { ...s, text: newText } : s);
    shapes = newShapes;
    addToHistory(newShapes, "Edit Text");
  };

  const updateAnimation = (shapeId: string, anim: Partial<AnimationSettings>) => {
    const newShapes = shapes.map(s => {
      if (s.id === shapeId) {
        const currentAnim = s.animation || {
          type: 'none',
          duration: 2,
          delay: 0,
          timingFunction: 'linear',
          direction: 'normal',
          fillMode: 'none',
          infinite: true,
          steps: []
        };
        return { ...s, animation: { ...currentAnim, ...anim } };
      }
      return s;
    });
    shapes = newShapes;
    if (Object.keys(anim).includes('type') || Object.keys(anim).includes('steps')) {
      addToHistory(newShapes, "Update Animation");
    }
  };

  // --- Animation Helpers ---
  const addAnimationStep = (shapeId: string) => {
    const shape = shapes.find(s => s.id === shapeId);
    if (!shape) return;

    const newStep: AnimationStep = {
      id: generateId(),
      x: shape.x,
      y: shape.y,
      width: shape.width || 0,
      height: shape.height || 0,
      fill: shape.fill,
      stroke: shape.stroke,
      rotation: shape.rotation,
      scale: shape.scale ?? 1,
      opacity: shape.opacity ?? 1,
      points: shape.points ? JSON.parse(JSON.stringify(shape.points)) : undefined,
      duration: 1,
      easing: 'linear'
    };

    const currentAnim = shape.animation || {
      type: 'custom',
      duration: 0,
      delay: 0,
      timingFunction: 'linear',
      direction: 'normal',
      fillMode: 'both',
      infinite: true,
      steps: []
    };

    const updatedAnim = {
      ...currentAnim,
      type: 'custom' as AnimationType,
      steps: [...(currentAnim.steps || []), newStep]
    };

    updateAnimation(shapeId, updatedAnim);
  };

  const removeAnimationStep = (shapeId: string, stepId: string) => {
    const shape = shapes.find(s => s.id === shapeId);
    if (!shape || !shape.animation || !shape.animation.steps) return;

    const newSteps = shape.animation.steps.filter(s => s.id !== stepId);
    updateAnimation(shapeId, { steps: newSteps });
    if (editingStepId === stepId) editingStepId = null;
  };

  const applyStepToShape = (shapeId: string, stepId: string) => {
    const shape = shapes.find(s => s.id === shapeId);
    if (!shape || !shape.animation || !shape.animation.steps) return;

    const step = shape.animation.steps.find(s => s.id === stepId);
    if (!step) return;

    const newShapes = shapes.map(s => {
      if (s.id === shapeId) {
        return {
          ...s,
          x: step.x,
          y: step.y,
          width: step.width,
          height: step.height,
          rotation: step.rotation,
          scale: step.scale,
          opacity: step.opacity,
          fill: step.fill,
          stroke: step.stroke,
          points: step.points ? JSON.parse(JSON.stringify(step.points)) : s.points
        };
      }
      return s;
    });
    shapes = newShapes;
    editingStepId = stepId;
    isPlaying = false;
  };

  const updateStepFromShape = (shapeId: string) => {
    if (!editingStepId) return;
    const shape = shapes.find(s => s.id === shapeId);
    if (!shape || !shape.animation || !shape.animation.steps) return;

    const newSteps = shape.animation.steps.map(s => {
      if (s.id === editingStepId) {
        return {
          ...s,
          x: shape.x,
          y: shape.y,
          width: shape.width || 0,
          height: shape.height || 0,
          rotation: shape.rotation,
          scale: shape.scale ?? 1,
          opacity: shape.opacity ?? 1,
          fill: shape.fill,
          stroke: shape.stroke,
          points: shape.points ? JSON.parse(JSON.stringify(shape.points)) : undefined
        };
      }
      return s;
    });

    updateAnimation(shapeId, { steps: newSteps });
    editingStepId = null;
  };

  const updateStepProperty = (shapeId: string, stepId: string, prop: keyof AnimationStep, value: any) => {
    const shape = shapes.find(s => s.id === shapeId);
    if (!shape || !shape.animation || !shape.animation.steps) return;

    const newSteps = shape.animation.steps.map(s => s.id === stepId ? { ...s, [prop]: value } : s);
    updateAnimation(shapeId, { steps: newSteps });
  };

  // --- SVG Parser for Import ---
  const parseImportedSVG = (content: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, "image/svg+xml");
    const newShapes: Shape[] = [];

    const getAttr = (el: Element, name: string, def: string = "") => el.getAttribute(name) || def;
    const getNum = (el: Element, name: string, def: number = 0) => parseFloat(el.getAttribute(name) || String(def));
    const getColor = (el: Element, name: string, def: string) => el.getAttribute(name) || (el as HTMLElement).style?.getPropertyValue(name) || def;

    const traverse = (element: Element) => {
      const tagName = element.tagName.toLowerCase();
      const commonStroke = getColor(element, 'stroke', '#000000');
      const commonFill = getColor(element, 'fill', 'none');
      const commonStrokeWidth = getNum(element, 'stroke-width', 1);

      if (tagName === 'path') {
        newShapes.push({
          id: generateId(),
          type: 'path',
          x: 0, y: 0,
          pathData: getAttr(element, 'd'),
          stroke: commonStroke,
          fill: commonFill,
          strokeWidth: commonStrokeWidth,
          rotation: 0,
          visible: true
        });
      }
      else if (tagName === 'rect') {
        newShapes.push({
          id: generateId(),
          type: 'rect',
          x: getNum(element, 'x'),
          y: getNum(element, 'y'),
          width: getNum(element, 'width'),
          height: getNum(element, 'height'),
          stroke: commonStroke,
          fill: commonFill,
          strokeWidth: commonStrokeWidth,
          rotation: 0,
          visible: true
        });
      }
      else if (tagName === 'circle') {
        const cx = getNum(element, 'cx');
        const cy = getNum(element, 'cy');
        const r = getNum(element, 'r');
        newShapes.push({
          id: generateId(),
          type: 'circle',
          x: cx - r,
          y: cy - r,
          width: r * 2,
          height: r * 2,
          stroke: commonStroke,
          fill: commonFill,
          strokeWidth: commonStrokeWidth,
          rotation: 0,
          visible: true
        });
      }
      else if (tagName === 'line') {
        const x1 = getNum(element, 'x1');
        const y1 = getNum(element, 'y1');
        const x2 = getNum(element, 'x2');
        const y2 = getNum(element, 'y2');
        newShapes.push({
          id: generateId(),
          type: 'path',
          x: 0, y: 0,
          pathData: `M ${x1} ${y1} L ${x2} ${y2}`,
          stroke: commonStroke,
          fill: 'none',
          strokeWidth: commonStrokeWidth,
          rotation: 0,
          visible: true
        });
      }
      else if (tagName === 'polygon' || tagName === 'polyline') {
        const pts = getAttr(element, 'points').trim();
        if (pts) {
          newShapes.push({
            id: generateId(),
            type: 'path',
            x: 0, y: 0,
            pathData: `M ${pts} ${tagName === 'polygon' ? 'Z' : ''}`,
            stroke: commonStroke,
            fill: commonFill,
            strokeWidth: commonStrokeWidth,
            rotation: 0,
            visible: true
          });
        }
      }

      if (element.children) {
        Array.from(element.children).forEach(child => traverse(child));
      }
    };

    const rootSvg = doc.querySelector('svg');
    if (rootSvg) {
      Array.from(rootSvg.children).forEach(traverse);
    }
    return newShapes;
  };

  // --- File Upload ---
  const handleFileUpload = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    showWelcome = false;

    if (file.type === "image/svg+xml") {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        const importedShapes = parseImportedSVG(content);
        const combinedShapes = [...shapes, ...importedShapes];
        shapes = combinedShapes;
        addToHistory(combinedShapes, "Import SVG");
      };
      reader.readAsText(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1000;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            const ratio = w / h;
            if (w > h) { w = maxDim; h = maxDim / ratio; }
            else { h = maxDim; w = maxDim * ratio; }
          }

          const newImageShape: Shape = {
            id: generateId(),
            type: 'image',
            x: 0,
            y: 0,
            width: w,
            height: h,
            href: event.target?.result as string,
            stroke: '',
            fill: '',
            strokeWidth: 0,
            rotation: 0,
            visible: true
          };

          const newShapes = [...shapes, newImageShape];
          shapes = newShapes;
          addToHistory(newShapes, "Add Image");
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  // --- Coordinate Helper ---
  const getMousePos = (e: PointerEvent | WheelEvent | MouseEvent) => {
    if (!containerRef) return { x: 0, y: 0 };
    const rect = containerRef.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;

    return {
      x: (rawX - view.x) / view.zoom,
      y: (rawY - view.y) / view.zoom
    };
  };

  // --- Interaction Handlers ---
  const handleWheel = (e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomSensitivity = 0.001;
      const delta = -e.deltaY;
      const scaleFactor = 1 + delta * zoomSensitivity;
      const newZoom = Math.min(Math.max(view.zoom * scaleFactor, 0.1), 20);

      if (!containerRef) return;
      const rect = containerRef.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const worldX = (mouseX - view.x) / view.zoom;
      const worldY = (mouseY - view.y) / view.zoom;

      const newX = mouseX - worldX * newZoom;
      const newY = mouseY - worldY * newZoom;

      view = { x: newX, y: newY, zoom: newZoom };
    } else {
      view = {
        ...view,
        x: view.x - e.deltaX,
        y: view.y - e.deltaY
      };
    }
  };

  const handlePointerDown = (e: PointerEvent) => {
    const pos = getMousePos(e);

    if (contextMenu) contextMenu = null;

    if (tool === 'hand' || isSpacePressed || (e.button === 1)) {
      isDragging = true;
      dragHandle = 'pan';
      dragStart = { x: e.clientX, y: e.clientY };
      return;
    }

    isDragging = true;
    dragStartWorld = pos;
    isDirtyRef = false;

    if (tool === 'text') {
      const newShape: Shape = {
        id: generateId(),
        type: 'text',
        x: pos.x,
        y: pos.y,
        text: 'Double click to edit',
        fontSize: currentFontSize,
        stroke: currentColor,
        fill: 'none',
        strokeWidth: 1,
        rotation: 0,
        visible: true,
        width: 200,
        height: currentFontSize
      };
      shapes = [...shapes, newShape];
      selectedId = newShape.id;
      isDirtyRef = true;
      tool = 'select';
      sidebarTab = 'properties';
      return;
    }

    if (tool !== 'select') {
      selectedId = null;
      selectedPointIndex = null;
    }

    if (tool === 'select') {
      if (e.target === svgRef || (e.target as Element).getAttribute('id') === 'main-svg-bg') {
        selectedId = null;
        selectedPointIndex = null;
      } else {
        sidebarTab = 'properties';
      }
      return;
    }

    if (tool === 'poly') {
      const { x, y } = pos;
      if (!activePolyId) {
        const newShape: Shape = {
          id: generateId(),
          type: 'path',
          x: 0, y: 0,
          points: [{ x, y }, { x, y }],
          stroke: currentColor,
          fill: 'none',
          strokeWidth: currentStrokeWidth,
          rotation: 0,
          visible: true
        };
        shapes = [...shapes, newShape];
        activePolyId = newShape.id;
        selectedId = newShape.id;
        isDirtyRef = true;
      } else {
        shapes = shapes.map(s => {
          if (s.id === activePolyId) {
            return { ...s, points: [...(s.points || []), { x, y }] };
          }
          return s;
        });
        isDirtyRef = true;
      }
      return;
    }

    const { x, y } = pos;
    const newShape: Shape = {
      id: generateId(),
      type: tool === 'pen' ? 'path' : tool as any,
      x: x,
      y: y,
      width: 0,
      height: 0,
      points: tool === 'pen' ? [{ x, y }] : [],
      stroke: currentColor,
      fill: currentFill,
      strokeWidth: currentStrokeWidth,
      rotation: 0,
      text: undefined,
      visible: true
    };

    shapes = [...shapes, newShape];
    selectedId = newShape.id;
    selectedPointIndex = null;
    isDirtyRef = true;
    sidebarTab = 'properties';
  };

  const handlePointerMove = (e: PointerEvent) => {
    const pos = getMousePos(e);

    if (dragHandle === 'pan' && dragStart) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      view = { ...view, x: view.x + dx, y: view.y + dy };
      dragStart = { x: e.clientX, y: e.clientY };
      return;
    }

    if (tool === 'poly' && activePolyId) {
      shapes = shapes.map(s => {
        if (s.id === activePolyId && s.points) {
          const newPoints = [...s.points];
          newPoints[newPoints.length - 1] = { x: pos.x, y: pos.y };
          return { ...s, points: newPoints };
        }
        return s;
      });
      return;
    }

    if (!isDragging || !dragStartWorld) return;

    const dx = pos.x - dragStartWorld.x;
    const dy = pos.y - dragStartWorld.y;

    if (tool !== 'select') {
      shapes = shapes.map(shape => {
        if (shape.id === selectedId) {
          isDirtyRef = true;
          if (tool === 'pen') {
            return { ...shape, points: [...(shape.points || []), { x: pos.x, y: pos.y }] };
          }
          if (tool === 'rect' || tool === 'circle') {
            const newW = pos.x - dragStartWorld!.x;
            const newH = pos.y - dragStartWorld!.y;
            return {
              ...shape,
              width: Math.abs(newW),
              height: Math.abs(newH),
              x: newW < 0 ? pos.x : dragStartWorld!.x,
              y: newH < 0 ? pos.y : dragStartWorld!.y
            };
          }
        }
        return shape;
      });
      return;
    }

    if (tool === 'select' && selectedId && dragHandle) {
      shapes = shapes.map(shape => {
        if (shape.id !== selectedId) return shape;
        isDirtyRef = true;

        if (dragHandle === 'point' && dragPointIndex !== null && shape.points) {
          const newPoints = [...shape.points];
          const pt = newPoints[dragPointIndex];
          newPoints[dragPointIndex] = {
            ...pt,
            x: pos.x,
            y: pos.y,
            handleIn: pt.handleIn ? { x: pt.handleIn.x + dx, y: pt.handleIn.y + dy } : undefined,
            handleOut: pt.handleOut ? { x: pt.handleOut.x + dx, y: pt.handleOut.y + dy } : undefined
          };
          return { ...shape, points: newPoints };
        }

        if ((dragHandle === 'handleIn' || dragHandle === 'handleOut') && dragPointIndex !== null && shape.points) {
          const newPoints = [...shape.points];
          const pt = newPoints[dragPointIndex];
          newPoints[dragPointIndex] = {
            ...pt,
            [dragHandle]: { x: pos.x, y: pos.y }
          };
          return { ...shape, points: newPoints };
        }

        if (dragHandle === 'move') {
          if (shape.type === 'path' && shape.points) {
            const newPoints = shape.points?.map(p => ({
              x: p.x + dx,
              y: p.y + dy,
              handleIn: p.handleIn ? { x: p.handleIn.x + dx, y: p.handleIn.y + dy } : undefined,
              handleOut: p.handleOut ? { x: p.handleOut.x + dx, y: p.handleOut.y + dy } : undefined,
            }));
            return { ...shape, points: newPoints };
          }
          return { ...shape, x: shape.x + dx, y: shape.y + dy };
        }

        if (dragHandle === 'se') {
          return {
            ...shape,
            width: Math.max(5, (shape.width || 0) + dx),
            height: Math.max(5, (shape.height || 0) + dy)
          };
        }

        if (['nw', 'ne', 'sw'].includes(dragHandle) && shape.width !== undefined && shape.height !== undefined) {
          let { x, y, width, height } = shape;
          let newX = shape.x;
          let newY = shape.y;
          let newW = shape.width;
          let newH = shape.height;

          if (dragHandle.includes('n')) { newY += dy; newH -= dy; }
          if (dragHandle.includes('s')) { newH += dy; }
          if (dragHandle.includes('w')) { newX += dx; newW -= dx; }
          if (dragHandle.includes('e')) { newW += dx; }

          if (newW < 0) { newX += newW; newW = Math.abs(newW); }
          if (newH < 0) { newY += newH; newH = Math.abs(newH); }

          return { ...shape, x: newX, y: newY, width: newW, height: newH };
        }

        return shape;
      });

      if (dragHandle === 'move' || dragHandle === 'point') {
        dragStartWorld = pos;
      } else if (dragHandle !== 'handleIn' && dragHandle !== 'handleOut') {
        dragStartWorld = pos;
      }
    }
  };

  const handlePointerUp = () => {
    isDragging = false;
    dragStart = null;
    dragStartWorld = null;
    dragHandle = null;
    dragPointIndex = null;

    if (isDirtyRef) {
      addToHistory(shapes, "Modify Shape");
      isDirtyRef = false;
    }
  };

  const handleContextMenu = (e: MouseEvent, type: 'canvas' | 'shape' | 'point', id?: string, index?: number) => {
    e.preventDefault();
    e.stopPropagation();
    contextMenu = {
      x: e.clientX,
      y: e.clientY,
      type,
      targetId: id,
      pointIndex: index
    };
  };

  const handleGlobalContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    handleContextMenu(e, 'canvas');
  };

  const handleDoubleClick = (e: MouseEvent) => {
    if (tool === 'poly') {
      finishPolygon();
      return;
    }

    if (tool === 'select' && selectedId) {
      const shape = shapes.find(s => s.id === selectedId);
      if (shape && shape.type === 'text') {
        const newText = prompt("Edit text:", shape.text);
        if (newText !== null) {
          updateText(shape.id, newText);
        }
      }
    }
  };

  const toggleShapeVisibility = (shapeId: string, e: MouseEvent) => {
    e.stopPropagation();
    const newShapes = shapes.map(s => s.id === shapeId ? { ...s, visible: !s.visible } : s);
    shapes = newShapes;
    addToHistory(newShapes, "Toggle Visibility");
  };

  onMount(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const panSpeed = 20;
      if (e.key === 'ArrowUp') view = { ...view, y: view.y + panSpeed };
      if (e.key === 'ArrowDown') view = { ...view, y: view.y - panSpeed };
      if (e.key === 'ArrowLeft') view = { ...view, x: view.x + panSpeed };
      if (e.key === 'ArrowRight') view = { ...view, x: view.x - panSpeed };

      if (e.code === 'Space') isSpacePressed = true;
      if (e.key === 'Escape') {
        if (activePolyId) {
          shapes = shapes.filter(s => s.id !== activePolyId);
          activePolyId = null;
        } else {
          selectedId = null;
          selectedPointIndex = null;
          contextMenu = null;
          if (editingStepId) editingStepId = null;
        }
      }
      if (e.key === 'Enter' && activePolyId) finishPolygon();
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId && !activePolyId) deleteSelected();
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') isSpacePressed = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  });

  // --- Export ---
  const handleExport = () => {
    console.log("Exporting...");
  };

  const updateSelectedProperty = (key: keyof Shape, value: any) => {
    if (!selectedId) return;
    const newShapes = shapes.map(s => s.id === selectedId ? { ...s, [key]: value } : s);
    shapes = newShapes;
    addToHistory(newShapes, `Update ${key}`);
  };

  // --- Render Helpers ---
  const getAnimStyle = (shape: Shape) => {
    const anim = shape.animation;
    const isSelected = selectedId === shape.id;
    const isEditingKeyframe = editingStepId !== null && isSelected;

    const shouldRun = isPlaying && !(isDragging && isSelected) && !isEditingKeyframe;
    const playState = shouldRun ? 'running' : 'paused';

    const animStyle: any = {
      transformBox: 'fill-box',
      transformOrigin: 'center',
    };

    if (anim && anim.type !== 'none') {
      const duration = anim.duration || 2;
      const timing = anim.timingFunction || 'linear';
      const delay = anim.delay || 0;
      const iter = anim.infinite ? 'infinite' : '1';
      const dir = anim.direction || 'normal';
      const fillMode = anim.fillMode || 'none';

      let animString = '';

      if (anim.type === 'custom' && anim.steps && anim.steps.length > 0) {
        if (!isEditingKeyframe) {
          const totalDur = anim.steps.reduce((acc, step) => acc + step.duration, 0);
          animString = `anim-${shape.id} ${totalDur}s linear ${delay}s ${iter} ${dir} ${fillMode} ${playState}`;
        }
      } else if (anim.type === 'color-cycle') {
        animString = `color-cycle ${duration}s ${timing} ${delay}s ${iter} ${dir} ${fillMode} ${playState}`;
      } else if (anim.type === 'gradient') {
        // handled via fill
      } else {
        animString = `${anim.type} ${duration}s ${timing} ${delay}s ${iter} ${dir} ${fillMode} ${playState}`;
      }

      if (animString) {
        if (anim.type === 'color-cycle') {
          animStyle.animation = animString;
        } else if (anim.type !== 'gradient' && anim.type !== 'custom') {
          animStyle.animation = animString;
        } else if (anim.type === 'custom' && !isEditingKeyframe) {
          animStyle.animation = animString;
        }
      }
    }
    return animStyle;
  };

  const getIconForShape = (shape: Shape) => {
    if (shape.type === 'rect') return Square;
    if (shape.type === 'circle') return CircleIcon;
    if (shape.type === 'text') return Type;
    if (shape.type === 'image') return ImageIcon;
    if (shape.type === 'path') return shape.points ? Pen : FileType;
    return MousePointer2;
  };

  const getCursorStyle = () => {
    if (tool === 'select') return 'default';
    if (tool === 'hand' || isSpacePressed) return 'grab';
    if (tool === 'text') return 'text';
    return 'crosshair';
  };

</script>

<div class="flex flex-col h-screen bg-gray-50 text-slate-800 font-sans">

  <!-- --- INJECT CSS KEYFRAMES --- -->
  <style>
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
    @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10%); } }
    @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5%); } }
    @keyframes color-cycle { 0% { filter: hue-rotate(0deg); } 100% { filter: hue-rotate(360deg); } }
    @keyframes wiggle { 0%, 100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }
    @keyframes jello { 0%, 100% { transform: scale(1, 1); } 30% { transform: scale(1.25, 0.75); } 40% { transform: scale(0.75, 1.25); } 50% { transform: scale(1.15, 0.85); } 65% { transform: scale(0.95, 1.05); } 75% { transform: scale(1.05, 0.95); } }
  </style>
  
  {@html `<style>${customAnimationStyles}</style>`}

  <div class="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between shadow-sm z-30 h-16">
    <div class="flex items-center space-x-4">
      <h1 class="text-xl font-bold text-slate-700 mr-2">SVG Studio</h1>

      <div class="flex items-center space-x-0.5 bg-gray-100 p-1 rounded-lg">
        <button onclick={undo} disabled={historyStep <= 0} class="p-2 text-slate-600 hover:text-slate-900 disabled:opacity-30 transition-colors" title="Undo">
          <Undo size={18} />
        </button>
        <button onclick={redo} disabled={historyStep >= history.length - 1} class="p-2 text-slate-600 hover:text-slate-900 disabled:opacity-30 transition-colors" title="Redo">
          <Redo size={18} />
        </button>
        <div class="w-px h-5 bg-gray-300 mx-1"></div>

        <button
          onclick={() => tool = 'hand'}
          class={`p-2 rounded transition-all ${tool === 'hand' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700 hover:bg-gray-200'}`}
          title="Pan Tool (Spacebar)"
        >
          <Hand size={18} />
        </button>

        <label class="p-2 rounded cursor-pointer text-slate-500 hover:text-slate-700 hover:bg-gray-200 transition-all" title="Upload Image/SVG">
          <Upload size={18} />
          <input type="file" accept="image/*,.svg" onchange={handleFileUpload} class="hidden" />
        </label>

        <div class="w-px h-5 bg-gray-300 mx-1"></div>

        {#each [
          { id: 'select', icon: MousePointer2, label: 'Select (V)' },
          { id: 'pen', icon: Pen, label: 'Pen (P)' },
          { id: 'poly', icon: Hexagon, label: 'Polygon (Click points)' },
          { id: 'text', icon: Type, label: 'Text (T)' },
          { id: 'rect', icon: Square, label: 'Rectangle (R)' },
          { id: 'circle', icon: CircleIcon, label: 'Circle (C)' },
        ] as t (t.id)}
          <button
            onclick={() => tool = t.id as any}
            class={`p-2 rounded transition-all ${
              tool === t.id
                ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5'
                : 'text-slate-500 hover:text-slate-700 hover:bg-gray-200'
            }`}
            title={t.label}
          >
            <t.icon size={18} />
          </button>
        {/each}
      </div>

      <div class="h-6 w-px bg-gray-300 mx-2"></div>

      <div class="flex items-center space-x-4">
        <div class="flex flex-col items-center">
          <label class="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5" for="stroke-color">Stroke</label>
          <input
            id="stroke-color"
            type="color"
            value={currentColor}
            oninput={(e) => {
              currentColor = e.currentTarget.value;
              updateSelectedProperty('stroke', e.currentTarget.value);
            }}
            class="w-8 h-6 rounded cursor-pointer border-none p-0 bg-transparent"
          />
        </div>

        <div class="flex flex-col items-center">
          <label class="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5" for="fill-color">Fill</label>
          <div class="flex items-center space-x-1">
            <input
              id="fill-color"
              type="color"
              value={currentFill === 'transparent' ? '#ffffff' : currentFill}
              oninput={(e) => {
                currentFill = e.currentTarget.value;
                updateSelectedProperty('fill', e.currentTarget.value);
              }}
              class="w-8 h-6 rounded cursor-pointer border-none p-0 bg-transparent"
              disabled={currentFill === 'transparent'}
            />
            <button
              onclick={() => {
                const newVal = currentFill === 'transparent' ? '#ffffff' : 'transparent';
                currentFill = newVal;
                updateSelectedProperty('fill', newVal);
              }}
              class={`text-[10px] px-2 py-0.5 rounded border ${currentFill === 'transparent' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-gray-50 text-gray-600'}`}
            >
              {currentFill === 'transparent' ? 'None' : 'Fill'}
            </button>
          </div>
        </div>

        <div class="flex flex-col w-24">
          {#if tool === 'text' || (selectedId && shapes.find(s => s.id === selectedId)?.type === 'text')}
            <label class="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5" for="font-size">
              Font Size: {currentFontSize}px
            </label>
            <input
              id="font-size"
              type="range"
              min="10" max="120"
              value={currentFontSize}
              oninput={(e) => {
                const val = parseInt(e.currentTarget.value);
                currentFontSize = val;
                updateSelectedProperty('fontSize', val);
              }}
              class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          {:else}
            <label class="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5" for="stroke-width">
              Stroke: {currentStrokeWidth}px
            </label>
            <input
              id="stroke-width"
              type="range"
              min="1" max="20"
              value={currentStrokeWidth}
              oninput={(e) => {
                const val = parseInt(e.currentTarget.value);
                currentStrokeWidth = val;
                updateSelectedProperty('strokeWidth', val);
              }}
              class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          {/if}
        </div>
      </div>
    </div>

    <div class="flex items-center space-x-2">
      {#if selectedId}
        <button
          onclick={deleteSelected}
          class="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          title="Delete Selected"
        >
          <Trash2 size={18} />
        </button>
      {/if}
      <button
        onclick={handleExport}
        class="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm text-sm"
      >
        <Download size={16} />
        <span>Export</span>
      </button>
    </div>
  </div>

  <div class="flex-1 flex overflow-hidden relative">

    {#if contextMenu}
      <div
        class="absolute z-50 bg-white border border-gray-200 shadow-lg rounded-lg py-1 min-w-[160px]"
        style={`top: ${contextMenu.y}px; left: ${contextMenu.x}px`}
      >
        {#if contextMenu.type === 'point' && contextMenu.targetId && contextMenu.pointIndex !== undefined}
          <button
            onclick={() => toggleSmoothPoint(contextMenu.targetId, contextMenu.pointIndex)}
            class="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-gray-700 flex items-center"
          >
            <Spline size={14} class="mr-2" /> Toggle Smooth
          </button>
          <button
            onclick={() => deletePoint(contextMenu.targetId, contextMenu.pointIndex)}
            class="w-full text-left px-4 py-2 hover:bg-red-50 text-sm text-red-600 flex items-center"
          >
            <Trash size={14} class="mr-2" /> Delete Point
          </button>
        {/if}
        {#if contextMenu.type === 'shape'}
          <button
            onclick={() => { deleteSelected(); contextMenu = null; }}
            class="w-full text-left px-4 py-2 hover:bg-red-50 text-sm text-red-600 flex items-center"
          >
            <Trash size={14} class="mr-2" /> Delete Shape
          </button>
        {/if}
        {#if contextMenu.type === 'canvas'}
          <button
            onclick={() => { view = { x: 0, y: 0, zoom: 1 }; contextMenu = null; }}
            class="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-gray-700 flex items-center"
          >
            <CornerUpLeft size={14} class="mr-2" /> Reset View
          </button>
        {/if}
      </div>
    {/if}

    <div
      bind:this={containerRef}
      class={`flex-1 overflow-hidden bg-slate-200 relative ${tool === 'hand' || isSpacePressed ? 'cursor-grab active:cursor-grabbing' : ''}`}
      onpointerdown={handlePointerDown}
      onpointermove={handlePointerMove}
      onpointerup={handlePointerUp}
      onpointerleave={handlePointerUp}
      onwheel={handleWheel}
      oncontextmenu={handleGlobalContextMenu}
      ondblclick={handleDoubleClick}
      role="application"
      tabindex="-1"
    >
      <!-- Welcome Screen ... -->
      {#if showWelcome && shapes.length === 0}
        <div class="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div class="text-center bg-white/95 p-8 rounded-xl shadow-lg border border-gray-200 pointer-events-auto">
            <div class="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
              <Upload size={32} />
            </div>
            <h3 class="text-lg font-bold text-gray-800 mb-2">Welcome to SVG Studio</h3>
            <p class="text-gray-500 mb-6 max-w-xs mx-auto text-sm">Upload an image to annotate, import an SVG to edit, or start fresh.</p>

            <div class="flex flex-col space-y-3">
              <label class="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors inline-block shadow-sm">
                Import File
                <input type="file" accept="image/*,.svg" onchange={handleFileUpload} class="hidden" />
              </label>
              <button
                onclick={() => showWelcome = false}
                class="flex items-center justify-center space-x-2 text-gray-500 hover:text-gray-800 font-medium py-2 rounded-lg transition-colors"
              >
                <Plus size={16} />
                <span>Start with Blank Canvas</span>
              </button>
            </div>
          </div>
        </div>
      {/if}

      <svg
        bind:this={svgRef}
        class="w-full h-full block"
        style="cursor: {getCursorStyle()}"
        role="graphics-document"
      >
        <g transform={`translate(${view.x}, ${view.y}) scale(${view.zoom})`}>
          <rect
            id="main-svg-bg"
            x={-50000}
            y={-50000}
            width={100000}
            height={100000}
            fill="transparent"
          />
          
          {#each shapes as shape (shape.id)}
            {@const isSelected = selectedId === shape.id}
            {@const animStyle = getAnimStyle(shape)}
            
            <g 
              transform={`translate(${shape.x}, ${shape.y}) rotate(${shape.rotation}) scale(${shape.scale || 1})`}
              style={animStyle}
              opacity={shape.opacity || 1}
              class={isSelected ? 'outline-none' : ''}
              oncontextmenu={(e) => handleContextMenu(e, 'shape', shape.id)}
              onpointerdown={(e) => {
                e.stopPropagation();
                if (tool === 'select') {
                  selectedId = shape.id;
                  dragHandle = 'move';
                  dragStart = { x: e.clientX, y: e.clientY };
                  dragStartWorld = getMousePos(e);
                  sidebarTab = 'properties';
                }
              }}
              role="graphics-symbol"
              aria-label="Shape"
            >
              {#if shape.type === 'path'}
                <path
                  d={getShapePathData(shape)}
                  stroke={shape.stroke}
                  fill={shape.fill}
                  stroke-width={shape.strokeWidth}
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              {:else if shape.type === 'rect'}
                <rect
                  width={shape.width}
                  height={shape.height}
                  stroke={shape.stroke}
                  fill={shape.fill}
                  stroke-width={shape.strokeWidth}
                />
              {:else if shape.type === 'circle'}
                <circle
                  cx={(shape.width || 0) / 2}
                  cy={(shape.height || 0) / 2}
                  r={(shape.width || 0) / 2}
                  stroke={shape.stroke}
                  fill={shape.fill}
                  stroke-width={shape.strokeWidth}
                />
              {:else if shape.type === 'text'}
                <text
                  fill={shape.stroke}
                  font-size={shape.fontSize}
                  font-family="sans-serif"
                  dominant-baseline="hanging"
                  style="user-select: none;"
                >
                  {shape.text}
                </text>
              {:else if shape.type === 'image'}
                <image
                  href={shape.href}
                  width={shape.width}
                  height={shape.height}
                  preserveAspectRatio="none"
                />
              {/if}

              {#if isSelected}
                <rect
                  x={-5}
                  y={-5}
                  width={(shape.width || 0) + 10}
                  height={(shape.height || 0) + 10}
                  fill="none"
                  stroke="#3b82f6"
                  stroke-width="1"
                  stroke-dasharray="4 2"
                  pointer-events="none"
                />
                
                <!-- Resize Handles -->
                {#if shape.type === 'rect' || shape.type === 'image' || shape.type === 'circle'}
                  <rect
                    x={-5} y={-5} width={10} height={10}
                    fill="white" stroke="#3b82f6" stroke-width="1"
                    class="cursor-nw-resize"
                    onpointerdown={(e) => {
                      e.stopPropagation();
                      dragHandle = 'nw';
                      dragStart = { x: e.clientX, y: e.clientY };
                      dragStartWorld = getMousePos(e);
                    }}
                  />
                  <rect
                    x={(shape.width || 0) - 5} y={-5} width={10} height={10}
                    fill="white" stroke="#3b82f6" stroke-width="1"
                    class="cursor-ne-resize"
                    onpointerdown={(e) => {
                      e.stopPropagation();
                      dragHandle = 'ne';
                      dragStart = { x: e.clientX, y: e.clientY };
                      dragStartWorld = getMousePos(e);
                    }}
                  />
                  <rect
                    x={(shape.width || 0) - 5} y={(shape.height || 0) - 5} width={10} height={10}
                    fill="white" stroke="#3b82f6" stroke-width="1"
                    class="cursor-se-resize"
                    onpointerdown={(e) => {
                      e.stopPropagation();
                      dragHandle = 'se';
                      dragStart = { x: e.clientX, y: e.clientY };
                      dragStartWorld = getMousePos(e);
                    }}
                  />
                  <rect
                    x={-5} y={(shape.height || 0) - 5} width={10} height={10}
                    fill="white" stroke="#3b82f6" stroke-width="1"
                    class="cursor-sw-resize"
                    onpointerdown={(e) => {
                      e.stopPropagation();
                      dragHandle = 'sw';
                      dragStart = { x: e.clientX, y: e.clientY };
                      dragStartWorld = getMousePos(e);
                    }}
                  />
                {/if}

                <!-- Path Points -->
                {#if shape.type === 'path' && shape.points}
                  {#each shape.points as point, i (i)}
                    <circle
                      cx={point.x} cy={point.y} r={4}
                      fill="white" stroke="#3b82f6" stroke-width="1"
                      class="cursor-move"
                      onpointerdown={(e) => {
                        e.stopPropagation();
                        dragHandle = 'point';
                        dragPointIndex = i;
                        dragStart = { x: e.clientX, y: e.clientY };
                        dragStartWorld = getMousePos(e);
                        oncontextmenu = (ev) => handleContextMenu(ev, 'point', shape.id, i);
                      }}
                    />
                    {#if point.handleIn}
                      <line
                        x1={point.x} y1={point.y}
                        x2={point.handleIn.x} y2={point.handleIn.y}
                        stroke="#3b82f6" stroke-width="1" opacity="0.5"
                      />
                      <circle
                        cx={point.handleIn.x} cy={point.handleIn.y} r={3}
                        fill="#3b82f6"
                        class="cursor-move"
                        onpointerdown={(e) => {
                          e.stopPropagation();
                          dragHandle = 'handleIn';
                          dragPointIndex = i;
                          dragStart = { x: e.clientX, y: e.clientY };
                          dragStartWorld = getMousePos(e);
                        }}
                      />
                    {/if}
                    {#if point.handleOut}
                      <line
                        x1={point.x} y1={point.y}
                        x2={point.handleOut.x} y2={point.handleOut.y}
                        stroke="#3b82f6" stroke-width="1" opacity="0.5"
                      />
                      <circle
                        cx={point.handleOut.x} cy={point.handleOut.y} r={3}
                        fill="#3b82f6"
                        class="cursor-move"
                        onpointerdown={(e) => {
                          e.stopPropagation();
                          dragHandle = 'handleOut';
                          dragPointIndex = i;
                          dragStart = { x: e.clientX, y: e.clientY };
                          dragStartWorld = getMousePos(e);
                        }}
                      />
                    {/if}
                  {/each}
                {/if}
              {/if}
            </g>
          {/each}
        </g>
      </svg>

      <div class="absolute bottom-4 left-4 flex space-x-2 bg-white p-1.5 rounded-lg shadow border border-gray-200">
        <button onclick={() => view = { ...view, zoom: view.zoom * 1.2 }} class="p-1 hover:bg-gray-100 rounded"><ZoomIn size={16} /></button>
        <span class="text-xs flex items-center px-1 w-12 justify-center">{Math.round(view.zoom * 100)}%</span>
        <button onclick={() => view = { ...view, zoom: view.zoom / 1.2 }} class="p-1 hover:bg-gray-100 rounded"><ZoomOut size={16} /></button>
      </div>
    </div>

    <div class="w-80 bg-white border-l border-gray-200 flex flex-col h-full shadow-xl z-20 overflow-hidden">
      <div class="flex border-b border-gray-200">
        <button
          onclick={() => sidebarTab = 'layers'}
          class={`flex-1 py-3 text-sm font-medium flex items-center justify-center ${sidebarTab === 'layers' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Layers size={16} class="mr-2" /> Layers
        </button>
        <button
          onclick={() => sidebarTab = 'history'}
          class={`flex-1 py-3 text-sm font-medium flex items-center justify-center ${sidebarTab === 'history' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <History size={16} class="mr-2" /> History
        </button>
        <button
          onclick={() => sidebarTab = 'properties'}
          class={`flex-1 py-3 text-sm font-medium flex items-center justify-center ${sidebarTab === 'properties' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Settings size={16} class="mr-2" /> Props
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-2 space-y-1">

        <!-- PROPERTIES TAB -->
        {#if sidebarTab === 'properties'}
          <div class="p-2 space-y-6 pb-20">
            {#if !selectedShape}
              <div class="text-gray-400 text-sm text-center mt-10 italic">
                Select an object to edit properties
              </div>
            {:else}
              <div class="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <div class="flex items-center justify-between mb-3">
                  <h3 class="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center">
                    <Play size={12} class="mr-1" /> Animation
                  </h3>
                  <button
                    onclick={() => isPlaying = !isPlaying}
                    class={`p-1 rounded ${isPlaying ? 'text-blue-600 bg-blue-100' : 'text-gray-500 hover:bg-gray-100'}`}
                    title={isPlaying ? "Pause Preview" : "Play Preview"}
                  >
                    {#if isPlaying}
                      <Pause size={14} />
                    {:else}
                      <Play size={14} />
                    {/if}
                  </button>
                </div>

                <div class="space-y-3">
                  <div>
                    <label class="text-xs text-gray-600 block mb-1" for="anim-type">Animation Type</label>
                    <select
                      id="anim-type"
                      value={selectedShape.animation?.type || 'none'}
                      onchange={(e) => updateAnimation(selectedShape.id, { type: e.currentTarget.value as AnimationType })}
                      class="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 p-1 border"
                    >
                      <option value="none">None</option>
                      <option value="custom">Keyframe Animation</option>
                      <option disabled>--- Presets ---</option>
                      <option value="spin">Spin</option>
                      <option value="pulse">Pulse</option>
                      <option value="bounce">Bounce</option>
                      <option value="float">Float</option>
                      <option value="color-cycle">Color Cycle</option>
                      <option value="wiggle">Wiggle</option>
                      <option value="jello">Jello</option>
                      <option value="gradient">Gradient Flow</option>
                    </select>
                  </div>

                  {#if selectedShape.animation?.type === 'custom'}
                    <div class="space-y-3 pt-2 border-t border-gray-200">
                      <div class="flex items-center justify-between">
                        <span class="text-xs font-medium">Keyframes</span>
                        {#if !editingStepId}
                          <button
                            onclick={() => addAnimationStep(selectedShape.id)}
                            class="text-[10px] bg-green-100 text-green-700 border border-green-200 px-2 py-1 rounded hover:bg-green-200 flex items-center transition-colors"
                            title="Save current state as a new keyframe"
                          >
                            <Plus size={10} class="mr-1" /> Capture Keyframe
                          </button>
                        {/if}
                      </div>

                      <!-- Editing Helper Box -->
                      {#if editingStepId}
                        <div class="bg-amber-50 border border-amber-200 p-3 rounded-lg text-xs mb-2">
                          <div class="font-bold text-amber-800 mb-1 flex items-center">
                            <Edit2 size={12} class="mr-1" /> Editing Keyframe
                          </div>
                          <p class="text-amber-700 mb-3 leading-tight">
                            Move, rotate, or resize the object on the canvas to define this step.
                          </p>
                          <div class="flex space-x-2">
                            <button
                              onclick={() => updateStepFromShape(selectedShape.id)}
                              class="flex-1 bg-amber-600 text-white px-2 py-1.5 rounded hover:bg-amber-700 font-medium flex items-center justify-center shadow-sm"
                            >
                              <Check size={12} class="mr-1" /> Update
                            </button>
                            <button
                              onclick={() => editingStepId = null}
                              class="px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-100 text-gray-600 bg-white"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      {/if}

                      <div class="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {#each selectedShape.animation.steps || [] as step, idx (step.id)}
                          <div
                            class={`w-full text-left bg-white p-2 rounded border text-xs space-y-2 transition-all ${
                              editingStepId === step.id
                                ? 'border-amber-400 ring-2 ring-amber-100 shadow-sm'
                                : 'border-gray-200 hover:border-blue-300 hover:shadow-sm'
                            }`}
                          >
                            <div class="flex justify-between items-center border-b border-gray-100 pb-1 mb-1">
                              <button 
                                class="flex-1 text-left focus:outline-none"
                                onclick={() => !editingStepId && applyStepToShape(selectedShape.id, step.id)}
                              >
                                <span class={`font-semibold flex items-center ${editingStepId === step.id ? 'text-amber-700' : 'text-gray-700'}`}>
                                  <div class={`w-1.5 h-1.5 rounded-full mr-1.5 ${editingStepId === step.id ? 'bg-amber-500' : 'bg-gray-300'}`}></div>
                                  Keyframe {idx + 1}
                                </span>
                              </button>
                              {#if !editingStepId}
                                <button
                                  onclick={(e) => { e.stopPropagation(); removeAnimationStep(selectedShape.id, step.id); }}
                                  class="text-gray-400 hover:text-red-500 p-1 hover:bg-red-50 rounded ml-2"
                                  title="Delete Keyframe"
                                >
                                  <Trash size={12} />
                                </button>
                              {/if}
                            </div>
                            <div class="grid grid-cols-2 gap-2" role="group">
                              <div>
                                <label class="text-[9px] text-gray-400 uppercase tracking-wide" for={`duration-${step.id}`}>Duration</label>
                                <div class="flex items-center">
                                  <input
                                    id={`duration-${step.id}`}
                                    type="number" step="0.1" min="0"
                                    value={step.duration}
                                    oninput={(e) => updateStepProperty(selectedShape.id, step.id, 'duration', parseFloat(e.currentTarget.value))}
                                    class="w-full border-gray-200 text-xs p-1 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                  />
                                  <span class="ml-1 text-gray-400">s</span>
                                </div>
                              </div>
                              <div>
                                <label class="text-[9px] text-gray-400 uppercase tracking-wide" for={`easing-${step.id}`}>Easing</label>
                                <select
                                  id={`easing-${step.id}`}
                                  value={step.easing}
                                  onchange={(e) => updateStepProperty(selectedShape.id, step.id, 'easing', e.currentTarget.value)}
                                  class="w-full border-gray-200 text-xs p-1 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                >
                                  <option value="linear">Linear</option>
                                  <option value="ease">Ease</option>
                                  <option value="ease-in">Ease In</option>
                                  <option value="ease-out">Ease Out</option>
                                  <option value="ease-in-out">Ease In Out</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        {/each}
                        {#if (!selectedShape.animation.steps || selectedShape.animation.steps.length === 0)}
                          <div class="text-center text-gray-500 text-xs py-6 px-4 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                            <div class="bg-gray-100 w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2 text-gray-400">
                              <Film size={14} />
                            </div>
                            <p class="font-medium text-gray-700 mb-1">Start Animating</p>
                            <ol class="text-left list-decimal list-inside space-y-1 text-gray-500">
                              <li>Position object for <b>Start</b>.</li>
                              <li>Click <b>Capture Keyframe</b>.</li>
                              <li>Move object to new spot.</li>
                              <li>Click <b>Capture Keyframe</b> again.</li>
                            </ol>
                          </div>
                        {/if}
                      </div>
                    </div>
                  {/if}

                  <!-- Standard & Custom Settings -->
                  {#if selectedShape.animation?.type && selectedShape.animation.type !== 'none'}
                    <div class="space-y-3 pt-3 border-t border-gray-200">
                      <div class="flex justify-between items-center mb-2">
                        <span class="text-xs font-semibold text-gray-500 uppercase">Timing</span>
                        <button
                          onclick={() => updateAnimation(selectedShape.id, {
                            type: 'none', steps: [], duration: 2, delay: 0
                          })}
                          class="text-[10px] text-red-500 hover:bg-red-50 px-2 py-0.5 rounded flex items-center"
                        >
                          <RefreshCw size={10} class="mr-1" /> Reset
                        </button>
                      </div>

                      {#if selectedShape.animation.type !== 'custom'}
                        <div>
                          <div class="flex justify-between text-xs mb-1 text-gray-600">
                            <span>Duration</span>
                            <span>{selectedShape.animation?.duration || 2}s</span>
                          </div>
                          <input
                            type="range"
                            min="0.5" max="10" step="0.5"
                            value={selectedShape.animation?.duration || 2}
                            oninput={(e) => updateAnimation(selectedShape.id, { duration: parseFloat(e.currentTarget.value) })}
                            class="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            aria-label="Duration"
                          />
                        </div>
                      {/if}

                      <div>
                        <div class="flex justify-between text-xs mb-1 text-gray-600">
                          <span>Start Delay</span>
                          <span>{selectedShape.animation?.delay || 0}s</span>
                        </div>
                        <input
                          type="range"
                          min="0" max="5" step="0.1"
                          value={selectedShape.animation?.delay || 0}
                          oninput={(e) => updateAnimation(selectedShape.id, { delay: parseFloat(e.currentTarget.value) })}
                          class="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                          aria-label="Start Delay"
                        />
                      </div>

                      <div class="grid grid-cols-2 gap-2">
                        <div>
                          <label class="text-xs text-gray-600 block mb-1" for="anim-direction">Direction</label>
                          <select
                            id="anim-direction"
                            value={selectedShape.animation?.direction || 'normal'}
                            onchange={(e) => updateAnimation(selectedShape.id, { direction: e.currentTarget.value as any })}
                            class="w-full text-xs border-gray-300 rounded p-1 border bg-white"
                          >
                            <option value="normal">Normal</option>
                            <option value="reverse">Reverse</option>
                            <option value="alternate">Alternate</option>
                            <option value="alternate-reverse">Alt Reverse</option>
                          </select>
                        </div>
                        <div>
                          <label class="text-xs text-gray-600 block mb-1" for="anim-fill-mode">Fill Mode</label>
                          <select
                            id="anim-fill-mode"
                            value={selectedShape.animation?.fillMode || 'none'}
                            onchange={(e) => updateAnimation(selectedShape.id, { fillMode: e.currentTarget.value as any })}
                            class="w-full text-xs border-gray-300 rounded p-1 border bg-white"
                          >
                            <option value="none">None</option>
                            <option value="forwards">Forwards</option>
                            <option value="backwards">Backwards</option>
                            <option value="both">Both</option>
                          </select>
                        </div>
                      </div>

                      <div class="flex items-center pt-1">
                        <input
                          type="checkbox"
                          id="loop-anim"
                          checked={selectedShape.animation?.infinite ?? true}
                          onchange={(e) => updateAnimation(selectedShape.id, { infinite: e.currentTarget.checked })}
                          class="mr-2 rounded text-blue-600 focus:ring-blue-500 h-4 w-4 border-gray-300"
                        />
                        <label for="loop-anim" class="text-sm text-gray-700">Loop Infinitely</label>
                      </div>
                    </div>
                  {/if}
                </div>
              </div>

              <div class="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <h3 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Transform</h3>
                <div class="grid grid-cols-2 gap-2 text-xs text-gray-600 font-mono">
                  <div class="bg-white px-2 py-1 rounded border border-gray-200">X: {Math.round(selectedShape.x)}</div>
                  <div class="bg-white px-2 py-1 rounded border border-gray-200">Y: {Math.round(selectedShape.y)}</div>
                  {#if selectedShape.width !== undefined}
                    <div class="bg-white px-2 py-1 rounded border border-gray-200">W: {Math.round(selectedShape.width)}</div>
                  {/if}
                  {#if selectedShape.height !== undefined}
                    <div class="bg-white px-2 py-1 rounded border border-gray-200">H: {Math.round(selectedShape.height)}</div>
                  {/if}
                </div>
              </div>
            {/if}
          </div>
        {/if}

        <!-- ... Layers and History tabs ... -->
        {#if sidebarTab === 'layers'}
          {#if shapes.length === 0}
            <div class="text-gray-400 text-sm text-center mt-10 italic">No layers yet</div>
          {/if}

          {#each [...shapes].reverse() as shape, index (shape.id)}
            {@const originalIndex = shapes.length - 1 - index}
            {@const isSelected = shape.id === selectedId}
            {@const Icon = getIconForShape(shape)}
            {@const label = shape.type === 'rect' ? "Rectangle" : shape.type === 'circle' ? "Circle" : shape.type === 'text' ? "Text" : shape.type === 'image' ? "Image" : shape.type === 'path' ? (shape.points ? "Path" : "Imported Path") : "Shape"}

            <div
              class={`w-full flex items-center justify-between p-2 rounded text-sm group ${
                isSelected ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' : 'hover:bg-gray-50 text-gray-600'
              } ${!shape.visible ? 'opacity-50' : ''}`}
            >
              <button
                onclick={() => {
                  selectedId = shape.id;
                  tool = 'select';
                  currentColor = shape.stroke;
                  currentFill = shape.fill;
                  currentStrokeWidth = shape.strokeWidth;
                  if (shape.type === 'text' && shape.fontSize) currentFontSize = shape.fontSize;
                  sidebarTab = 'properties';
                }}
                class="flex-1 flex items-center space-x-2 truncate text-left focus:outline-none"
                title="Select Layer"
              >
                <Icon size={14} class={isSelected ? 'text-blue-500' : 'text-gray-400'} />
                <span class="font-medium">{label} {originalIndex + 1}</span>
                {#if shape.animation && shape.animation.type !== 'none'}
                  <Play size={10} class="text-green-500 ml-1 fill-green-500" />
                {/if}
              </button>

              <div class="flex items-center space-x-1">
                <button
                  onclick={(e) => toggleShapeVisibility(shape.id, e)}
                  class={`p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-all ${!shape.visible ? 'text-gray-400' : ''}`}
                  title={shape.visible ? "Hide Layer" : "Show Layer"}
                >
                  {#if shape.visible}
                    <Eye size={14} />
                  {:else}
                    <EyeOff size={14} />
                  {/if}
                </button>
                <button
                  onclick={(e) => {
                    e.stopPropagation();
                    deleteSelected();
                  }}
                  class={`p-1 rounded hover:bg-red-100 hover:text-red-500 text-gray-300 opacity-0 group-hover:opacity-100 transition-all`}
                  title="Delete Layer"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          {/each}
        {/if}

        {#if sidebarTab === 'history'}
          <div class="space-y-2">
            {#each history.slice().reverse() as state, index (state.id)}
              {@const originalIndex = history.length - 1 - index}
              {@const isActive = originalIndex === historyStep}
              <div
                class={`p-2 rounded border transition-all ${
                  isActive
                    ? 'bg-blue-50 border-blue-200 shadow-sm'
                    : 'bg-white border-gray-100 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <button
                  class="w-full flex items-center justify-between cursor-pointer mb-2"
                  onclick={() => restoreState(originalIndex)}
                  onkeydown={(e) => { if (e.key === 'Enter') restoreState(originalIndex) }}
                >
                  <div class="flex items-center space-x-2">
                    <div class={`w-4 h-4 rounded-full flex items-center justify-center ${isActive ? 'bg-blue-600' : 'bg-gray-200'}`}>
                      {#if isActive}
                        <CheckCircle2 size={10} class="text-white" />
                      {/if}
                    </div>
                    <div>
                      <div class={`text-sm font-medium ${isActive ? 'text-blue-900' : 'text-gray-700'}`}>
                        {state.description || `Version ${originalIndex + 1}`}
                      </div>
                      <div class="text-[10px] text-gray-400 flex items-center">
                        <Clock size={10} class="mr-1" />
                        {new Date(state.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </button>

                {#if isActive}
                  <button
                    onclick={(e) => {
                      e.stopPropagation();
                      handleExport();
                    }}
                    class="w-full flex items-center justify-center space-x-1 py-1.5 bg-white border border-blue-200 text-blue-600 text-xs rounded hover:bg-blue-50 transition-colors"
                  >
                    <Download size={12} />
                    <span>Export This Version</span>
                  </button>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>

    <div class="bg-white border-t border-gray-200 px-4 py-1 text-[10px] text-gray-400 flex justify-between z-30">
      <span>Mode: {isSpacePressed ? 'HAND (Space)' : tool.toUpperCase()}</span>
      <span>Pos: {Math.round(-view.x)}, {Math.round(-view.y)}</span>
      <span>History: {historyStep + 1}/{history.length}</span>
    </div>
  </div>
</div>
