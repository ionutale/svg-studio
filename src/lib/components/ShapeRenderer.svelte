<script lang="ts">
    import type { Shape, AnimationStep } from '../types';
    import { getShapePathData } from '../utils';
    import { editor } from '../state.svelte';

    let { shape } = $props<{ shape: Shape }>();
</script>

{#if shape.visible}
    {@const anim = shape.animation}
    {@const isSelected = editor.selectedId === shape.id}
    {@const isEditingKeyframe = editor.editingStepId !== null && isSelected}
    {@const shouldRun = editor.isPlaying && !(editor.isDragging && isSelected) && !isEditingKeyframe}
    {@const playState = shouldRun ? 'running' : 'paused'}
    {@const fill =
        anim && anim.type === 'gradient'
            ? 'url(#rainbow-flow)'
            : shape.fill !== 'none' || (shape.points && shape.points.length > 2)
                ? shape.fill
                : 'none'}

    <!-- Calculate Animation Style -->
    {@const animStyle = (() => {
        let style: any = {
            transformBox: 'fill-box',
            transformOrigin: 'center'
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
                    const totalDur = anim.steps.reduce((acc: number, step: AnimationStep) => acc + step.duration, 0);
                    animString = `anim-${shape.id} ${totalDur}s linear ${delay}s ${iter} ${dir} ${fillMode} ${playState}`;
                }
            } else if (anim.type === 'color-cycle') {
                animString = `color-cycle ${duration}s ${timing} ${delay}s ${iter} ${dir} ${fillMode} ${playState}`;
            } else if (anim.type !== 'gradient') {
                animString = `${anim.type} ${duration}s ${timing} ${delay}s ${iter} ${dir} ${fillMode} ${playState}`;
            }

            if (animString) {
                style.animation = animString;
            }
        }
        return style;
    })()}

    <!-- Common Props -->
    {@const commonProps = {
        stroke: shape.stroke,
        fill: fill,
        'stroke-width': shape.strokeWidth,
        'stroke-linecap': 'round' as const,
        'stroke-linejoin': 'round' as const,
        'vector-effect': 'non-scaling-stroke',
        cursor: editor.tool === 'select' ? 'move' : 'crosshair',
        style: Object.entries(animStyle)
            .map(([k, v]) => `${k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())}: ${v}`)
            .join('; '),
        onpointerdown: (e: PointerEvent) => {
            if (editor.tool === 'select') {
                e.stopPropagation();
                editor.selectedId = shape.id;
                editor.dragHandle = 'move';
                editor.dragStartWorld = editor.getMousePos(e);
                editor.isDragging = true;

                editor.currentColor = shape.stroke;
                editor.currentFill = shape.fill;
                editor.currentStrokeWidth = shape.strokeWidth;
                if (shape.type === 'text' && shape.fontSize) editor.currentFontSize = shape.fontSize;
                editor.sidebarTab = 'properties';
            }
        },
        oncontextmenu: (e: MouseEvent) => editor.handleContextMenu(e, 'shape', shape.id)
    }}

    {#if shape.type === 'path' && shape.pathData}
        <g transform={`translate(${shape.x},${shape.y})`}>
            <path d={shape.pathData} {...commonProps} />
        </g>
    {:else if shape.type === 'image' && shape.href}
        <image
            href={shape.href}
            x={shape.x}
            y={shape.y}
            width={shape.width}
            height={shape.height}
            preserveAspectRatio="none"
            {...commonProps}
            style={commonProps.style + '; pointer-events: all;'}
        />
    {:else if shape.type === 'text' && shape.text}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <text
            x={shape.x}
            y={shape.y}
            font-size={shape.fontSize || 24}
            {...commonProps}
            fill={shape.stroke}
            style={commonProps.style +
                '; user-select: none; pointer-events: all; font-family: sans-serif;'}
            ondblclick={(e) => {
                e.stopPropagation();
                if (editor.tool === 'select') {
                    const newText = prompt('Edit text:', shape.text);
                    if (newText !== null) editor.updateText(shape.id, newText);
                }
            }}
        >
            {shape.text}
        </text>
    {:else if shape.type === 'path'}
        <path d={getShapePathData(shape)} {...commonProps} />
    {:else if shape.type === 'rect'}
        <rect
            x={shape.x}
            y={shape.y}
            width={shape.width}
            height={shape.height}
            {...commonProps}
        />
    {:else if shape.type === 'circle'}
        <ellipse
            cx={shape.x + (shape.width || 0) / 2}
            cy={shape.y + (shape.height || 0) / 2}
            rx={(shape.width || 0) / 2}
            ry={(shape.height || 0) / 2}
            {...commonProps}
        />
    {/if}
{/if}
