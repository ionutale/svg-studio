import type { Shape, Point, AnimationType, AnimationStep } from './types';

// --- Helper: Generate ID ---
export const generateId = () => Math.random().toString(36).substr(2, 9);

// --- Helper: Generate Path D ---
export const getShapePathData = (shape: Shape, overridePoints?: Point[]) => {
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

// --- Animation Generator ---
export const generateAnimationCSS = (shape: Shape) => {
    if (
        !shape.animation ||
        shape.animation.type !== 'custom' ||
        !shape.animation.steps ||
        shape.animation.steps.length === 0
    ) {
        return '';
    }

    const steps = shape.animation.steps;
    const totalDuration = steps.reduce((acc, s) => acc + s.duration, 0);
    if (totalDuration === 0) return '';

    let keyframes = `@keyframes anim-${shape.id} {`;
    let currentTime = 0;

    // Start state (0%)
    keyframes += `0% { transform: translate(0px, 0px) rotate(${shape.rotation}deg) scale(${shape.scale || 1}); fill: ${shape.fill}; stroke: ${shape.stroke}; opacity: ${shape.opacity || 1}; ${
        shape.width !== undefined ? `width: ${shape.width}px; height: ${shape.height}px;` : ''
    } ${
        shape.type === 'path' && shape.points ? `d: path('${getShapePathData(shape)}');` : ''
    } }`;

    steps.forEach((step, i) => {
        currentTime += step.duration;
        const percentage = (currentTime / totalDuration) * 100;

        const dx = step.x - shape.x;
        const dy = step.y - shape.y;

        keyframes += `${percentage}% { 
          transform: translate(${dx}px, ${dy}px) rotate(${step.rotation}deg) scale(${step.scale}); 
          fill: ${step.fill}; 
          stroke: ${step.stroke}; 
          opacity: ${step.opacity};
          ${step.width !== undefined ? `width: ${step.width}px; height: ${step.height}px;` : ''}
          ${step.points ? `d: path('${getShapePathData({ ...shape, points: step.points }, step.points)}');` : ''}
          animation-timing-function: ${step.easing};
      }`;
    });
    keyframes += `}`;
    return keyframes;
};

// --- SVG Parser for Import ---
export const parseImportedSVG = (content: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'image/svg+xml');
    const newShapes: Shape[] = [];

    const getAttr = (el: Element, name: string, def: string = '') => el.getAttribute(name) || def;
    const getNum = (el: Element, name: string, def: number = 0) =>
        parseFloat(el.getAttribute(name) || String(def));
    const getColor = (el: Element, name: string, def: string) =>
        el.getAttribute(name) || (el as HTMLElement).style?.getPropertyValue(name) || def;

    const traverse = (element: Element) => {
        const tagName = element.tagName.toLowerCase();
        const commonStroke = getColor(element, 'stroke', '#000000');
        const commonFill = getColor(element, 'fill', 'none');
        const commonStrokeWidth = getNum(element, 'stroke-width', 1);

        if (tagName === 'path') {
            newShapes.push({
                id: generateId(),
                type: 'path',
                x: 0,
                y: 0,
                pathData: getAttr(element, 'd'),
                stroke: commonStroke,
                fill: commonFill,
                strokeWidth: commonStrokeWidth,
                rotation: 0,
                visible: true
            });
        } else if (tagName === 'rect') {
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
        } else if (tagName === 'circle') {
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
        } else if (tagName === 'line') {
            const x1 = getNum(element, 'x1');
            const y1 = getNum(element, 'y1');
            const x2 = getNum(element, 'x2');
            const y2 = getNum(element, 'y2');
            newShapes.push({
                id: generateId(),
                type: 'path',
                x: 0,
                y: 0,
                pathData: `M ${x1} ${y1} L ${x2} ${y2}`,
                stroke: commonStroke,
                fill: 'none',
                strokeWidth: commonStrokeWidth,
                rotation: 0,
                visible: true
            });
        } else if (tagName === 'polygon' || tagName === 'polyline') {
            const pts = getAttr(element, 'points').trim();
            if (pts) {
                newShapes.push({
                    id: generateId(),
                    type: 'path',
                    x: 0,
                    y: 0,
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
            Array.from(element.children).forEach((child) => traverse(child));
        }
    };

    const rootSvg = doc.querySelector('svg');
    if (rootSvg) {
        Array.from(rootSvg.children).forEach(traverse);
    }
    return newShapes;
};
