import type { Shape, Tool, ViewTransform, HistoryState, ContextMenuState, Point, AnimationSettings, AnimationStep, AnimationType, ImageLayer } from './types';
import { generateId, parseImportedSVG, generateAnimationCSS, getShapePathData } from './utils';

class EditorState {
    view = $state<ViewTransform>({ x: 0, y: 0, zoom: 1 });
    image = $state<string | null>(null);
    imageVisible = $state(true);
    imageLayer = $state<ImageLayer>({ x: 0, y: 0, width: 800, height: 600 });

    showWelcome = $state(true);
    isPlaying = $state(false);
    editingStepId = $state<string | null>(null);

    tool = $state<Tool>('select');
    shapes = $state<Shape[]>([]);
    selectedId = $state<string | null>(null);
    activePolyId = $state<string | null>(null);

    selectedPointIndex = $state<number | null>(null);
    contextMenu = $state<ContextMenuState | null>(null);

    sidebarTab = $state<'layers' | 'history' | 'properties'>('layers');

    history = $state<HistoryState[]>([
        {
            id: generateId(),
            shapes: [],
            timestamp: Date.now(),
            description: 'Initial Empty State'
        }
    ]);
    historyStep = $state(0);

    currentColor = $state('#ef4444');
    currentFill = $state('transparent');
    currentStrokeWidth = $state(4);
    currentFontSize = $state(24);

    isDragging = $state(false);
    isSpacePressed = $state(false);
    dragStart = $state<{ x: number; y: number } | null>(null);
    dragStartWorld = $state<Point | null>(null);

    dragHandle = $state<
        'nw' | 'ne' | 'se' | 'sw' | 'move' | 'point' | 'handleIn' | 'handleOut' | 'pan' | null
    >(null);
    dragPointIndex = $state<number | null>(null);

    isDirty = false;

    svgRef: SVGSVGElement | undefined = $state();
    containerRef: HTMLDivElement | undefined = $state();

    selectedShape = $derived(this.selectedId ? this.shapes.find((s) => s.id === this.selectedId) : null);

    // --- Coordinate Helper ---
    getMousePos(e: PointerEvent | WheelEvent | MouseEvent) {
        if (!this.containerRef) return { x: 0, y: 0 };
        const rect = this.containerRef.getBoundingClientRect();
        const rawX = e.clientX - rect.left;
        const rawY = e.clientY - rect.top;

        return {
            x: (rawX - this.view.x) / this.view.zoom,
            y: (rawY - this.view.y) / this.view.zoom
        };
    }

    handleContextMenu(
        e: MouseEvent,
        type: 'canvas' | 'shape' | 'point',
        id?: string,
        index?: number
    ) {
        e.preventDefault();
        e.stopPropagation();
        this.contextMenu = {
            x: e.clientX,
            y: e.clientY,
            type,
            targetId: id,
            pointIndex: index
        };
    }

    // --- History Helpers ---
    addToHistory(newShapes: Shape[], description: string) {
        const newHistory = this.history.slice(0, this.historyStep + 1);
        const newState: HistoryState = {
            id: generateId(),
            shapes: JSON.parse(JSON.stringify(newShapes)),
            timestamp: Date.now(),
            description
        };
        newHistory.push(newState);
        this.history = newHistory;
        this.historyStep = newHistory.length - 1;
    }

    restoreState(index: number) {
        if (index >= 0 && index < this.history.length) {
            const state = this.history[index];
            this.shapes = JSON.parse(JSON.stringify(state.shapes));
            this.historyStep = index;
            this.selectedId = null;
            this.selectedPointIndex = null;
            this.activePolyId = null;
        }
    }

    undo() {
        if (this.activePolyId) {
            const shape = this.shapes.find((s) => s.id === this.activePolyId);
            if (!shape || (shape.points?.length || 0) <= 2) {
                this.activePolyId = null;
                this.shapes = this.shapes.filter((s) => s.id !== this.activePolyId);
            } else {
                const newPoints = [...(shape.points || [])];
                newPoints.splice(newPoints.length - 2, 1);
                this.shapes = this.shapes.map((s) => (s.id === this.activePolyId ? { ...s, points: newPoints } : s));
            }
            return;
        }
        if (this.historyStep > 0) {
            this.restoreState(this.historyStep - 1);
        }
    }

    redo() {
        if (this.historyStep < this.history.length - 1) {
            this.restoreState(this.historyStep + 1);
        }
    }

    // --- Polygon Logic ---
    finishPolygon() {
        if (this.activePolyId) {
            const finalShapes = this.shapes.map((s) => {
                if (s.id === this.activePolyId && s.points) {
                    const finalPoints = s.points.slice(0, -1);
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
            this.shapes = finalShapes;
            this.addToHistory(finalShapes, 'Draw Polygon');
            this.activePolyId = null;
        }
    }

    // --- Action Helpers ---
    deleteSelected() {
        if (this.selectedId) {
            const newShapes = this.shapes.filter((s) => s.id !== this.selectedId);
            this.shapes = newShapes;
            this.addToHistory(newShapes, 'Delete Item');
            this.selectedId = null;
            this.selectedPointIndex = null;
        }
    }

    deletePoint(shapeId: string, pointIndex: number) {
        const newShapes = this.shapes
            .map((s) => {
                if (s.id === shapeId && s.points) {
                    const newPoints = [...s.points];
                    newPoints.splice(pointIndex, 1);
                    return { ...s, points: newPoints };
                }
                return s;
            })
            .filter((s) => !s.points || s.points.length > 1);

        this.shapes = newShapes;
        this.addToHistory(newShapes, 'Delete Point');
        this.contextMenu = null;
    }

    toggleSmoothPoint(shapeId: string, pointIndex: number) {
        const newShapes = this.shapes.map((s) => {
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
        this.shapes = newShapes;
        this.addToHistory(newShapes, 'Toggle Smooth/Corner');
        this.contextMenu = null;
    }

    updateText(shapeId: string, newText: string) {
        const newShapes = this.shapes.map((s) => (s.id === shapeId ? { ...s, text: newText } : s));
        this.shapes = newShapes;
        this.addToHistory(newShapes, 'Edit Text');
    }

    updateAnimation(shapeId: string, anim: Partial<AnimationSettings>) {
        const newShapes = this.shapes.map((s) => {
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
        this.shapes = newShapes;
        if (Object.keys(anim).includes('type') || Object.keys(anim).includes('steps')) {
            this.addToHistory(newShapes, 'Update Animation');
        }
    }

    // --- Animation Helpers ---
    addAnimationStep(shapeId: string) {
        const shape = this.shapes.find((s) => s.id === shapeId);
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

        this.updateAnimation(shapeId, updatedAnim);
    }

    removeAnimationStep(shapeId: string, stepId: string) {
        const shape = this.shapes.find((s) => s.id === shapeId);
        if (!shape || !shape.animation || !shape.animation.steps) return;

        const newSteps = shape.animation.steps.filter((s) => s.id !== stepId);
        this.updateAnimation(shapeId, { steps: newSteps });
        if (this.editingStepId === stepId) this.editingStepId = null;
    }

    applyStepToShape(shapeId: string, stepId: string) {
        const shape = this.shapes.find((s) => s.id === shapeId);
        if (!shape || !shape.animation || !shape.animation.steps) return;

        const step = shape.animation.steps.find((s) => s.id === stepId);
        if (!step) return;

        const newShapes = this.shapes.map((s) => {
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
        this.shapes = newShapes;
        this.editingStepId = stepId;
        this.isPlaying = false;
    }

    updateStepFromShape(shapeId: string) {
        if (!this.editingStepId) return;
        const shape = this.shapes.find((s) => s.id === shapeId);
        if (!shape || !shape.animation || !shape.animation.steps) return;

        const newSteps = shape.animation.steps.map((s) => {
            if (s.id === this.editingStepId) {
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

        this.updateAnimation(shapeId, { steps: newSteps });
        this.editingStepId = null;
    }

    updateStepProperty(
        shapeId: string,
        stepId: string,
        prop: keyof AnimationStep,
        value: number | string
    ) {
        const shape = this.shapes.find((s) => s.id === shapeId);
        if (!shape || !shape.animation || !shape.animation.steps) return;

        const newSteps = shape.animation.steps.map((s) =>
            s.id === stepId ? { ...s, [prop]: value } : s
        );
        this.updateAnimation(shapeId, { steps: newSteps });
    }

    updateSelectedProperty(key: keyof Shape, value: string | number) {
        if (!this.selectedId) return;
        const newShapes = this.shapes.map((s) => (s.id === this.selectedId ? { ...s, [key]: value } : s));
        this.shapes = newShapes;
        this.addToHistory(newShapes, `Update ${key}`);
    }

    toggleShapeVisibility(shapeId: string) {
        const newShapes = this.shapes.map((s) => (s.id === shapeId ? { ...s, visible: !s.visible } : s));
        this.shapes = newShapes;
        this.addToHistory(newShapes, 'Toggle Visibility');
    }

    // --- File Upload ---
    handleFileUpload(e: Event) {
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];
        if (!file) return;

        this.showWelcome = false;

        if (file.type === 'image/svg+xml') {
            const reader = new FileReader();
            reader.onload = (event) => {
                const content = event.target?.result as string;
                const importedShapes = parseImportedSVG(content);
                const combinedShapes = [...this.shapes, ...importedShapes];
                this.shapes = combinedShapes;
                this.addToHistory(combinedShapes, 'Import SVG');
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
                        if (w > h) {
                            w = maxDim;
                            h = maxDim / ratio;
                        } else {
                            h = maxDim;
                            w = maxDim * ratio;
                        }
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

                    const newShapes = [...this.shapes, newImageShape];
                    this.shapes = newShapes;
                    this.addToHistory(newShapes, 'Add Image');
                };
                img.src = event.target?.result as string;
            };
            reader.readAsDataURL(file);
        }
    }

    // --- Export ---
    handleExport() {
        let minX = Infinity,
            minY = Infinity,
            maxX = -Infinity,
            maxY = -Infinity;

        this.shapes.forEach((s) => {
            if (!s.visible) return;
            if (s.points) {
                s.points.forEach((p) => {
                    minX = Math.min(minX, p.x);
                    minY = Math.min(minY, p.y);
                    maxX = Math.max(maxX, p.x);
                    maxY = Math.max(maxY, p.y);
                });
            }
            if (s.width && s.type !== 'text') {
                minX = Math.min(minX, s.x);
                minY = Math.min(minY, s.y);
                maxX = Math.max(maxX, s.x + (s.width || 0));
                maxY = Math.max(maxY, s.y + (s.height || 0));
            }
            if (s.type === 'text') {
                minX = Math.min(minX, s.x);
                minY = Math.min(minY, s.y - (s.fontSize || 12));
                maxX = Math.max(maxX, s.x + 100);
                maxY = Math.max(maxY, s.y);
            }
        });

        if (minX === Infinity) {
            minX = 0;
            minY = 0;
            maxX = 800;
            maxY = 600;
        }

        const w = maxX - minX;
        const h = maxY - minY;

        const customStyles = this.shapes
            .filter((s) => s.animation?.type === 'custom')
            .map((s) => generateAnimationCSS(s))
            .join('\n');

        const svgContent = `
      <style>
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10%); } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5%); } }
        @keyframes color-cycle { 0% { filter: hue-rotate(0deg); } 100% { filter: hue-rotate(360deg); } }
        @keyframes wiggle { 0%, 100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }
        @keyframes jello { 0%, 100% { transform: scale(1, 1); } 30% { transform: scale(1.25, 0.75); } 40% { transform: scale(0.75, 1.25); } 50% { transform: scale(1.15, 0.85); } 65% { transform: scale(0.95, 1.05); } 75% { transform: scale(1.05, 0.95); } }
        ${customStyles}
      </style>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${w} ${h}" width="${w}" height="${h}">
        <defs>
            <linearGradient id="gradient-anim" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#ff0000"><animate attributeName="offset" values="-1; 1" dur="3s" repeatCount="indefinite" /></stop>
                <stop offset="50%" stop-color="#00ff00"><animate attributeName="offset" values="0; 2" dur="3s" repeatCount="indefinite" /></stop>
                <stop offset="100%" stop-color="#0000ff"><animate attributeName="offset" values="1; 3" dur="3s" repeatCount="indefinite" /></stop>
            </linearGradient>
            <linearGradient id="rainbow-flow" x1="0%" y1="0%" x2="200%" y2="0%">
                <stop offset="0%" stop-color="red" />
                <stop offset="20%" stop-color="orange" />
                <stop offset="40%" stop-color="yellow" />
                <stop offset="60%" stop-color="green" />
                <stop offset="80%" stop-color="blue" />
                <stop offset="100%" stop-color="purple" />
                <animateTransform attributeName="gradientTransform" type="translate" from="0 0" to="-100% 0" dur="2s" repeatCount="indefinite" />
            </linearGradient>
        </defs>
        ${this.shapes
            .filter((s) => s.visible)
            .map((s) => {
                const anim = s.animation;
                let style = `transform-box: fill-box; transform-origin: center;`;

                if (anim) {
                    if (anim.type === 'color-cycle') {
                        style += ` animation: color-cycle ${anim.duration}s ${anim.timingFunction} ${anim.delay}s ${anim.infinite ? 'infinite' : '1'} ${anim.direction} ${anim.fillMode};`;
                    } else if (anim.type === 'custom' && anim.steps && anim.steps.length > 0) {
                        const totalDur = anim.steps.reduce((acc, step) => acc + step.duration, 0);
                        style += ` animation: anim-${s.id} ${totalDur}s linear ${anim.delay}s ${anim.infinite ? 'infinite' : '1'} ${anim.direction} ${anim.fillMode};`;
                    } else if (anim.type !== 'none' && anim.type !== 'gradient') {
                        style += ` animation: ${anim.type} ${anim.duration}s ${anim.timingFunction} ${anim.delay}s ${anim.infinite ? 'infinite' : '1'} ${anim.direction} ${anim.fillMode};`;
                    }
                }

                const fill = anim && anim.type === 'gradient' ? 'url(#rainbow-flow)' : s.fill;

                if (s.type === 'image' && s.href) {
                    return `<image href="${s.href}" x="${s.x}" y="${s.y}" width="${s.width}" height="${s.height}" preserveAspectRatio="none" style="${style}" />`;
                }
                if (s.type === 'text') {
                    return `<text x="${s.x}" y="${s.y}" fill="${s.stroke}" font-size="${s.fontSize || 24}" font-family="sans-serif" style="${style}">${s.text}</text>`;
                }

                const d = getShapePathData(s);

                if (s.type === 'path' && s.pathData) {
                    return `<path d="${d}" fill="${fill}" stroke="${s.stroke}" stroke-width="${s.strokeWidth}" stroke-linecap="round" stroke-linejoin="round" transform="translate(${s.x},${s.y})" style="${style}" />`;
                }

                if (s.type === 'path') {
                    return `<path d="${d}" fill="${fill}" stroke="${s.stroke}" stroke-width="${s.strokeWidth}" stroke-linecap="round" stroke-linejoin="round" style="${style}" />`;
                }
                if (s.type === 'rect') {
                    return `<rect x="${s.x}" y="${s.y}" width="${s.width}" height="${s.height}" fill="${fill}" stroke="${s.stroke}" stroke-width="${s.strokeWidth}" style="${style}" />`;
                }
                if (s.type === 'circle') {
                    return `<ellipse cx="${s.x + (s.width || 0) / 2}" cy="${s.y + (s.height || 0) / 2}" rx="${(s.width || 0) / 2}" ry="${(s.height || 0) / 2}" fill="${fill}" stroke="${s.stroke}" stroke-width="${s.strokeWidth}" style="${style}" />`;
                }
                return '';
            })
            .join('')}
      </svg>
    `;

        const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `svg-editor-${Date.now()}.svg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // --- Interaction Handlers ---
    handleWheel(e: WheelEvent) {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const zoomSensitivity = 0.001;
            const delta = -e.deltaY;
            const scaleFactor = 1 + delta * zoomSensitivity;
            const newZoom = Math.min(Math.max(this.view.zoom * scaleFactor, 0.1), 20);

            if (!this.containerRef) return;
            const rect = this.containerRef.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const worldX = (mouseX - this.view.x) / this.view.zoom;
            const worldY = (mouseY - this.view.y) / this.view.zoom;

            const newX = mouseX - worldX * newZoom;
            const newY = mouseY - worldY * newZoom;

            this.view = { x: newX, y: newY, zoom: newZoom };
        } else {
            this.view = {
                ...this.view,
                x: this.view.x - e.deltaX,
                y: this.view.y - e.deltaY
            };
        }
    }

    handlePointerDown(e: PointerEvent) {
        const pos = this.getMousePos(e);

        if (this.contextMenu) this.contextMenu = null;

        if (this.tool === 'hand' || this.isSpacePressed || e.button === 1) {
            this.isDragging = true;
            this.dragHandle = 'pan';
            this.dragStart = { x: e.clientX, y: e.clientY };
            return;
        }

        this.isDragging = true;
        this.dragStartWorld = pos;
        this.isDirty = false;

        if (this.tool === 'text') {
            const newShape: Shape = {
                id: generateId(),
                type: 'text',
                x: pos.x,
                y: pos.y,
                text: 'Double click to edit',
                fontSize: this.currentFontSize,
                stroke: this.currentColor,
                fill: 'none',
                strokeWidth: 1,
                rotation: 0,
                visible: true,
                width: 200,
                height: this.currentFontSize
            };
            const newShapes = [...this.shapes, newShape];
            this.shapes = newShapes;
            this.selectedId = newShape.id;
            this.isDirty = true;
            this.tool = 'select';
            this.sidebarTab = 'properties';
            return;
        }

        if (this.tool !== 'select') {
            this.selectedId = null;
            this.selectedPointIndex = null;
        }

        if (this.tool === 'select') {
            if (e.target === this.svgRef || (e.target as Element).getAttribute('id') === 'main-svg-bg') {
                this.selectedId = null;
                this.selectedPointIndex = null;
            } else {
                this.sidebarTab = 'properties';
            }
            return;
        }

        if (this.tool === 'poly') {
            const { x, y } = pos;
            if (!this.activePolyId) {
                const newShape: Shape = {
                    id: generateId(),
                    type: 'path',
                    x: 0,
                    y: 0,
                    points: [
                        { x, y },
                        { x, y }
                    ],
                    stroke: this.currentColor,
                    fill: 'none',
                    strokeWidth: this.currentStrokeWidth,
                    rotation: 0,
                    visible: true
                };
                this.shapes = [...this.shapes, newShape];
                this.activePolyId = newShape.id;
                this.selectedId = newShape.id;
                this.isDirty = true;
            } else {
                this.shapes = this.shapes.map((s) => {
                    if (s.id === this.activePolyId) {
                        return { ...s, points: [...(s.points || []), { x, y }] };
                    }
                    return s;
                });
                this.isDirty = true;
            }
            return;
        }

        const { x, y } = pos;
        const newShape: Shape = {
            id: generateId(),
            type: this.tool === 'pen' ? 'path' : (this.tool as Shape['type']),
            x: x,
            y: y,
            width: 0,
            height: 0,
            points: this.tool === 'pen' ? [{ x, y }] : [],
            stroke: this.currentColor,
            fill: this.currentFill,
            strokeWidth: this.currentStrokeWidth,
            rotation: 0,
            text: undefined,
            visible: true
        };

        const newShapes = [...this.shapes, newShape];
        this.shapes = newShapes;
        this.selectedId = newShape.id;
        this.selectedPointIndex = null;
        this.isDirty = true;
        this.sidebarTab = 'properties';
    }

    handlePointerMove(e: PointerEvent) {
        const pos = this.getMousePos(e);

        if (this.dragHandle === 'pan' && this.dragStart) {
            const dx = e.clientX - this.dragStart.x;
            const dy = e.clientY - this.dragStart.y;
            this.view = { ...this.view, x: this.view.x + dx, y: this.view.y + dy };
            this.dragStart = { x: e.clientX, y: e.clientY };
            return;
        }

        if (this.tool === 'poly' && this.activePolyId) {
            this.shapes = this.shapes.map((s) => {
                if (s.id === this.activePolyId && s.points) {
                    const newPoints = [...s.points];
                    newPoints[newPoints.length - 1] = { x: pos.x, y: pos.y };
                    return { ...s, points: newPoints };
                }
                return s;
            });
            return;
        }

        if (!this.isDragging || !this.dragStartWorld) return;

        const dx = pos.x - this.dragStartWorld.x;
        const dy = pos.y - this.dragStartWorld.y;

        if (this.tool !== 'select') {
            this.shapes = this.shapes.map((shape) => {
                if (shape.id === this.selectedId) {
                    this.isDirty = true;
                    if (this.tool === 'pen') {
                        return { ...shape, points: [...(shape.points || []), { x: pos.x, y: pos.y }] };
                    }
                    if (this.tool === 'rect' || this.tool === 'circle') {
                        const newW = pos.x - this.dragStartWorld!.x;
                        const newH = pos.y - this.dragStartWorld!.y;
                        return {
                            ...shape,
                            width: Math.abs(newW),
                            height: Math.abs(newH),
                            x: newW < 0 ? pos.x : this.dragStartWorld!.x,
                            y: newH < 0 ? pos.y : this.dragStartWorld!.y
                        };
                    }
                }
                return shape;
            });
            return;
        }

        if (this.tool === 'select' && this.selectedId && this.dragHandle) {
            this.shapes = this.shapes.map((shape) => {
                if (shape.id !== this.selectedId) return shape;
                this.isDirty = true;

                if (this.dragHandle === 'point' && this.dragPointIndex !== null && shape.points) {
                    const newPoints = [...shape.points];
                    const pt = newPoints[this.dragPointIndex];
                    newPoints[this.dragPointIndex] = {
                        ...pt,
                        x: pos.x,
                        y: pos.y,
                        handleIn: pt.handleIn
                            ? { x: pt.handleIn.x + dx, y: pt.handleIn.y + dy }
                            : undefined,
                        handleOut: pt.handleOut
                            ? { x: pt.handleOut.x + dx, y: pt.handleOut.y + dy }
                            : undefined
                    };
                    return { ...shape, points: newPoints };
                }

                if (
                    (this.dragHandle === 'handleIn' || this.dragHandle === 'handleOut') &&
                    this.dragPointIndex !== null &&
                    shape.points
                ) {
                    const newPoints = [...shape.points];
                    const pt = newPoints[this.dragPointIndex];
                    newPoints[this.dragPointIndex] = {
                        ...pt,
                        [this.dragHandle as 'handleIn' | 'handleOut']: { x: pos.x, y: pos.y }
                    };
                    return { ...shape, points: newPoints };
                }

                if (this.dragHandle === 'move') {
                    if (shape.type === 'path' && shape.points) {
                        const newPoints = shape.points?.map((p) => ({
                            x: p.x + dx,
                            y: p.y + dy,
                            handleIn: p.handleIn
                                ? { x: p.handleIn.x + dx, y: p.handleIn.y + dy }
                                : undefined,
                            handleOut: p.handleOut
                                ? { x: p.handleOut.x + dx, y: p.handleOut.y + dy }
                                : undefined
                        }));
                        return { ...shape, points: newPoints };
                    }
                    return { ...shape, x: shape.x + dx, y: shape.y + dy };
                }

                if (this.dragHandle === 'se') {
                    return {
                        ...shape,
                        width: Math.max(5, (shape.width || 0) + dx),
                        height: Math.max(5, (shape.height || 0) + dy)
                    };
                }

                if (
                    ['nw', 'ne', 'sw'].includes(this.dragHandle!) &&
                    shape.width !== undefined &&
                    shape.height !== undefined
                ) {
                    let newX = shape.x;
                    let newY = shape.y;
                    let newW = shape.width;
                    let newH = shape.height;

                    if (this.dragHandle!.includes('n')) {
                        newY += dy;
                        newH -= dy;
                    }
                    if (this.dragHandle!.includes('s')) {
                        newH += dy;
                    }
                    if (this.dragHandle!.includes('w')) {
                        newX += dx;
                        newW -= dx;
                    }
                    if (this.dragHandle!.includes('e')) {
                        newW += dx;
                    }

                    if (newW < 0) {
                        newX += newW;
                        newW = Math.abs(newW);
                    }
                    if (newH < 0) {
                        newY += newH;
                        newH = Math.abs(newH);
                    }

                    return { ...shape, x: newX, y: newY, width: newW, height: newH };
                }

                return shape;
            });

            if (this.dragHandle === 'move' || this.dragHandle === 'point') {
                this.dragStartWorld = pos;
            } else if (this.dragHandle !== 'handleIn' && this.dragHandle !== 'handleOut') {
                this.dragStartWorld = pos;
            }
        }
    }

    handlePointerUp() {
        this.isDragging = false;
        this.dragStart = null;
        this.dragStartWorld = null;
        this.dragHandle = null;
        this.dragPointIndex = null;

        if (this.isDirty) {
            this.addToHistory(this.shapes, 'Modify Shape');
            this.isDirty = false;
        }
    }

    handleDoubleClick() {
        if (this.tool === 'poly') {
            this.finishPolygon();
            return;
        }

        if (this.tool === 'select' && this.selectedId) {
            const shape = this.shapes.find((s) => s.id === this.selectedId);
            if (shape && shape.type === 'text') {
                const newText = prompt('Edit text:', shape.text);
                if (newText !== null) {
                    this.updateText(shape.id, newText);
                }
            }
        }
    }

    handleKeyDown(e: KeyboardEvent) {
        const panSpeed = 20;
        if (e.key === 'ArrowUp') this.view = { ...this.view, y: this.view.y + panSpeed };
        if (e.key === 'ArrowDown') this.view = { ...this.view, y: this.view.y - panSpeed };
        if (e.key === 'ArrowLeft') this.view = { ...this.view, x: this.view.x + panSpeed };
        if (e.key === 'ArrowRight') this.view = { ...this.view, x: this.view.x - panSpeed };

        if (e.code === 'Space') this.isSpacePressed = true;
        if (e.key === 'Escape') {
            if (this.activePolyId) {
                this.shapes = this.shapes.filter((s) => s.id !== this.activePolyId);
                this.activePolyId = null;
            } else {
                this.selectedId = null;
                this.selectedPointIndex = null;
                this.contextMenu = null;
                if (this.editingStepId) this.editingStepId = null;
            }
        }
        if (e.key === 'Enter' && this.activePolyId) this.finishPolygon();
        if ((e.key === 'Delete' || e.key === 'Backspace') && this.selectedId && !this.activePolyId)
            this.deleteSelected();
        if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
            e.preventDefault();
            if (e.shiftKey) this.redo();
            else this.undo();
        }
        if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
            e.preventDefault();
            this.redo();
        }
    }

    handleKeyUp(e: KeyboardEvent) {
        if (e.code === 'Space') this.isSpacePressed = false;
    }
}

export const editor = new EditorState();
