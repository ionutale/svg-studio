<script lang="ts">
    import { editor } from '../state.svelte';
    import { getShapePathData } from '../utils';
</script>

{#if editor.tool === 'select'}
    {#each (editor.selectedId ? [editor.selectedId] : editor.multiSelectedIds) as sid (sid)}
        {@const shape = editor.shapes.find(s => s.id === sid)}
        {#if shape && shape.visible}
            {@const handleSize = 8 / editor.view.zoom}
            {@const strokeW = 1 / editor.view.zoom}
            {@const isPrimary = sid === editor.selectedId}

    {#if shape.type === 'text'}
        {@const estWidth = (shape.text?.length || 0) * (shape.fontSize || 24) * 0.6}
        {@const estHeight = shape.fontSize || 24}
        <rect
            x={shape.x}
            y={shape.y - estHeight + 5}
            width={estWidth}
            height={estHeight}
            fill="none"
            stroke="#3b82f6"
            stroke-width={strokeW}
            stroke-dasharray="4"
            pointer-events="none"
        />
    {/if}

    {#if shape.type === 'path' && shape.points}
        <g>
            <path
                d={getShapePathData(shape)}
                fill="none"
                stroke="#3b82f6"
                stroke-width={strokeW}
                stroke-dasharray="4"
                pointer-events="none"
                opacity={0.5}
            />
            {#each shape.points as p, i}
                <g>
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <circle
                        cx={p.x}
                        cy={p.y}
                        r={6 / editor.view.zoom}
                        fill={editor.selectedPointIndex === i ? '#2563eb' : 'white'}
                        stroke="#2563eb"
                        stroke-width={2 / editor.view.zoom}
                        style="cursor: pointer"
                        onpointerdown={(e) => {
                            e.stopPropagation();
                            editor.selectedPointIndex = i;
                            editor.dragHandle = 'point';
                            editor.dragPointIndex = i;
                            editor.isDragging = true;
                            editor.dragStartWorld = editor.getMousePos(e);
                        }}
                        ondblclick={(e) => {
                            e.stopPropagation();
                            editor.toggleSmoothPoint(shape.id, i);
                        }}
                        oncontextmenu={(e) => editor.handleContextMenu(e, 'point', shape.id, i)}
                    />
                    {#if editor.selectedPointIndex === i}
                        {#if p.handleIn}
                            <line
                                x1={p.x}
                                y1={p.y}
                                x2={p.handleIn.x}
                                y2={p.handleIn.y}
                                stroke="#8b5cf6"
                                stroke-width={strokeW}
                            />
                            <!-- svelte-ignore a11y_no_static_element_interactions -->
                            <circle
                                cx={p.handleIn.x}
                                cy={p.handleIn.y}
                                r={4 / editor.view.zoom}
                                fill="#8b5cf6"
                                style="cursor: move"
                                onpointerdown={(e) => {
                                    e.stopPropagation();
                                    editor.dragHandle = 'handleIn';
                                    editor.dragPointIndex = i;
                                    editor.isDragging = true;
                                    editor.dragStartWorld = editor.getMousePos(e);
                                }}
                            />
                        {/if}
                        {#if p.handleOut}
                            <line
                                x1={p.x}
                                y1={p.y}
                                x2={p.handleOut.x}
                                y2={p.handleOut.y}
                                stroke="#8b5cf6"
                                stroke-width={strokeW}
                            />
                            <!-- svelte-ignore a11y_no_static_element_interactions -->
                            <circle
                                cx={p.handleOut.x}
                                cy={p.handleOut.y}
                                r={4 / editor.view.zoom}
                                fill="#8b5cf6"
                                style="cursor: move"
                                onpointerdown={(e) => {
                                    e.stopPropagation();
                                    editor.dragHandle = 'handleOut';
                                    editor.dragPointIndex = i;
                                    editor.isDragging = true;
                                    editor.dragStartWorld = editor.getMousePos(e);
                                }}
                            />
                        {/if}
                    {/if}
                </g>
            {/each}
        </g>
    {/if}

    {#if shape.width !== undefined && (isPrimary || editor.multiSelectedIds.length > 0)}
        {@const right = shape.x + (shape.width || 0)}
        {@const bottom = shape.y + (shape.height || 0)}
        {@const handleW = 10 / editor.view.zoom}

        <g>
            <rect
                x={shape.x}
                y={shape.y}
                width={shape.width}
                height={shape.height}
                fill="none"
                stroke="#3b82f6"
                stroke-width={strokeW}
                stroke-dasharray="4"
                pointer-events="none"
            />
            <!-- NW -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <rect
                x={shape.x - handleW / 2}
                y={shape.y - handleW / 2}
                width={handleW}
                height={handleW}
                fill="white"
                stroke="#3b82f6"
                style="cursor: nw-resize"
                onpointerdown={(e) => {
                    e.stopPropagation();
                    editor.dragHandle = 'nw';
                    editor.isDragging = true;
                    editor.dragStartWorld = editor.getMousePos(e);
                }}
            />
            <!-- NE -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <rect
                x={right - handleW / 2}
                y={shape.y - handleW / 2}
                width={handleW}
                height={handleW}
                fill="white"
                stroke="#3b82f6"
                style="cursor: ne-resize"
                onpointerdown={(e) => {
                    e.stopPropagation();
                    editor.dragHandle = 'ne';
                    editor.isDragging = true;
                    editor.dragStartWorld = editor.getMousePos(e);
                }}
            />
            <!-- SW -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <rect
                x={shape.x - handleW / 2}
                y={bottom - handleW / 2}
                width={handleW}
                height={handleW}
                fill="white"
                stroke="#3b82f6"
                style="cursor: sw-resize"
                onpointerdown={(e) => {
                    e.stopPropagation();
                    editor.dragHandle = 'sw';
                    editor.isDragging = true;
                    editor.dragStartWorld = editor.getMousePos(e);
                }}
            />
            <!-- SE -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            {#if isPrimary}
                <rect
                    x={right - handleW / 2}
                    y={bottom - handleW / 2}
                    width={handleW}
                    height={handleW}
                    fill="white"
                    stroke="#3b82f6"
                    style="cursor: se-resize"
                    onpointerdown={(e) => {
                        e.stopPropagation();
                        editor.dragHandle = 'se';
                        editor.isDragging = true;
                        editor.dragStartWorld = editor.getMousePos(e);
                    }}
                />
            {/if}
        </g>
    {/if}
    {/if}
    {/each}
{/if}
