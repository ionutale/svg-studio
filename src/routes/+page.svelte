<script lang="ts">
	import { Spline, Trash, Maximize } from 'lucide-svelte';
	import { editor } from '$lib/state.svelte';
	import ShapeRenderer from '$lib/components/ShapeRenderer.svelte';
	import SelectionHandles from '$lib/components/SelectionHandles.svelte';
	import Toolbar from '$lib/components/Toolbar.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import WelcomeScreen from '$lib/components/WelcomeScreen.svelte';
	import ZoomControls from '$lib/components/ZoomControls.svelte';
    import ShortcutHelp from '$lib/components/ShortcutHelp.svelte';

	$effect(() => {
		const handleKeyDown = (e: KeyboardEvent) => editor.handleKeyDown(e);
		const handleKeyUp = (e: KeyboardEvent) => editor.handleKeyUp(e);

		window.addEventListener('keydown', handleKeyDown);
		window.addEventListener('keyup', handleKeyUp);
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
			window.removeEventListener('keyup', handleKeyUp);
		};
	});
</script>

<div class="flex h-screen flex-col bg-slate-100 font-sans text-slate-800">
	<!-- Top Navigation -->
	<Toolbar />

	<div class="relative flex flex-1 overflow-hidden">
		<!-- Context Menu -->
		{#if editor.contextMenu}
			<div
				class="absolute z-50 min-w-48 overflow-hidden rounded-2xl border border-slate-200 bg-white/90 p-1.5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in duration-200"
				style={`top: ${editor.contextMenu.y}px; left: ${editor.contextMenu.x}px`}
			>
				{#if editor.contextMenu.type === 'point' && editor.contextMenu.targetId && editor.contextMenu.pointIndex !== undefined}
					<button
						onclick={() =>
							editor.toggleSmoothPoint(
								editor.contextMenu!.targetId!,
								editor.contextMenu!.pointIndex!
							)}
						class="flex w-full items-center rounded-xl px-4 py-2.5 text-left text-sm font-bold text-slate-700 transition-colors hover:bg-slate-100"
					>
						<div class="mr-3 flex h-6 w-6 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                            <Spline size={14} strokeWidth={2.5} />
                        </div>
                        Toggle Smooth
					</button>
					<button
						onclick={() =>
							editor.deletePoint(editor.contextMenu!.targetId!, editor.contextMenu!.pointIndex!)}
						class="flex w-full items-center rounded-xl px-4 py-2.5 text-left text-sm font-bold text-red-600 transition-colors hover:bg-red-50"
					>
                        <div class="mr-3 flex h-6 w-6 items-center justify-center rounded-lg bg-red-100 text-red-600">
						    <Trash size={14} strokeWidth={2.5} /> 
                        </div>
                        Delete Point
					</button>
				{/if}
				{#if editor.contextMenu.type === 'shape'}
					<button
						onclick={() => {
							editor.deleteSelected();
							editor.contextMenu = null;
						}}
						class="flex w-full items-center rounded-xl px-4 py-2.5 text-left text-sm font-bold text-red-600 transition-colors hover:bg-red-50"
					>
                        <div class="mr-3 flex h-6 w-6 items-center justify-center rounded-lg bg-red-100 text-red-600">
						    <Trash size={14} strokeWidth={2.5} /> 
                        </div>
                        Delete Shape
					</button>
				{/if}
				{#if editor.contextMenu.type === 'canvas'}
					<button
						onclick={() => {
							editor.view = { x: 0, y: 0, zoom: 1 };
							editor.contextMenu = null;
						}}
						class="flex w-full items-center rounded-xl px-4 py-2.5 text-left text-sm font-bold text-slate-700 transition-colors hover:bg-slate-100"
					>
                        <div class="mr-3 flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
						    <Maximize size={14} strokeWidth={2.5} /> 
                        </div>
                        Reset View
					</button>
				{/if}
			</div>
		{/if}

		<!-- Main Canvas Area -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			bind:this={editor.containerRef}
			class={`relative flex-1 overflow-hidden bg-slate-200/50 ${editor.tool === 'hand' || editor.isSpacePressed ? 'cursor-grab active:cursor-grabbing' : ''}`}
			onpointerdown={(e) => editor.handlePointerDown(e)}
			onpointermove={(e) => editor.handlePointerMove(e)}
			onpointerup={() => editor.handlePointerUp()}
			onpointerleave={() => editor.handlePointerUp()}
			onwheel={(e) => editor.handleWheel(e)}
			oncontextmenu={(e) => editor.handleContextMenu(e, 'canvas')}
			ondblclick={() => editor.handleDoubleClick()}
		>
			<!-- Welcome Screen overlay -->
			<WelcomeScreen />

            <!-- Canvas SVG -->
			<svg
				bind:this={editor.svgRef}
				class="block h-full w-full"
				style={`cursor: ${editor.tool === 'select' ? 'default' : editor.tool === 'hand' || editor.isSpacePressed ? 'grab' : editor.tool === 'text' ? 'text' : 'crosshair'}`}
			>
				<defs>
					<pattern id="smallGrid" width="20" height="20" patternUnits="userSpaceOnUse">
						<circle cx="2" cy="2" r="1" fill="#cbd5e1" />
					</pattern>
					<linearGradient id="rainbow-flow" x1="0%" y1="0%" x2="200%" y2="0%">
						<stop offset="0%" stop-color="#ff0000" />
						<stop offset="20%" stop-color="#ffff00" />
						<stop offset="40%" stop-color="#00ff00" />
						<stop offset="60%" stop-color="#00ffff" />
						<stop offset="80%" stop-color="#0000ff" />
						<stop offset="100%" stop-color="#ff00ff" />
						<animateTransform
							attributeName="gradientTransform"
							type="translate"
							from="0 0"
							to="-100% 0"
							dur="2s"
							repeatCount="indefinite"
						/>
					</linearGradient>
				</defs>

				<rect
					id="main-svg-bg"
					width="100%"
					height="100%"
					fill="url(#smallGrid)"
					style={`transform: translate(${editor.view.x % (20 * editor.view.zoom)}px, ${editor.view.y % (20 * editor.view.zoom)}px) scale(${editor.view.zoom})`}
				/>

				<g transform={`translate(${editor.view.x}, ${editor.view.y}) scale(${editor.view.zoom})`}>
					{#each editor.shapes as shape (shape.id)}
						<ShapeRenderer {shape} />
					{/each}
					<SelectionHandles />

                    <!-- Marquee Visualization -->
                    {#if editor.marqueeRect}
                        <rect
                            x={editor.marqueeRect.x}
                            y={editor.marqueeRect.y}
                            width={editor.marqueeRect.w}
                            height={editor.marqueeRect.h}
                            fill="#3b82f6"
                            fill-opacity="0.1"
                            stroke="#3b82f6"
                            stroke-width={1 / editor.view.zoom}
                            stroke-dasharray="4"
                            pointer-events="none"
                        />
                    {/if}
				</g>
			</svg>

            <!-- Modals -->
            <ShortcutHelp />
            
            <!-- Zoom UI -->
			<ZoomControls />
		</div>

		<!-- Right Sidebar Panel -->
		<Sidebar />
	</div>
</div>
