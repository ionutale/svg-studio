export type Tool = 'select' | 'hand' | 'pen' | 'rect' | 'circle' | 'text' | 'poly' | 'image';

export type AnimationType =
    | 'none'
    | 'spin'
    | 'pulse'
    | 'bounce'
    | 'float'
    | 'color-cycle'
    | 'wiggle'
    | 'jello'
    | 'gradient'
    | 'custom';

export interface AnimationStep {
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

export interface AnimationSettings {
    type: AnimationType;
    duration: number;
    delay: number;
    timingFunction: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';
    direction: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
    fillMode: 'none' | 'forwards' | 'backwards' | 'both';
    infinite: boolean;
    steps: AnimationStep[];
}

export interface Point {
    x: number;
    y: number;
    handleIn?: { x: number; y: number };
    handleOut?: { x: number; y: number };
}

export interface Shape {
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

export interface ImageLayer {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface ViewTransform {
    x: number;
    y: number;
    zoom: number;
}

export interface HistoryState {
    id: string;
    shapes: Shape[];
    timestamp: number;
    description: string;
}

export interface ContextMenuState {
    x: number;
    y: number;
    type: 'canvas' | 'shape' | 'point';
    targetId?: string;
    pointIndex?: number;
}
