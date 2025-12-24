<script lang="ts">
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
	import { onMount } from 'svelte';
	import { editor } from '$lib/state.svelte';
	import ShapeRenderer from '$lib/components/ShapeRenderer.svelte';
	import SelectionHandles from '$lib/components/SelectionHandles.svelte';
	import type { AnimationType } from '$lib/types';

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

<div class="flex h-screen flex-col bg-gray-50 font-sans text-slate-800">
	<div
		class="z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 py-2 shadow-sm"
	>
		<div class="flex items-center space-x-4">
			<h1 class="mr-2 text-xl font-bold text-slate-700">SVG Studio</h1>

			<div class="flex items-center space-x-0.5 rounded-lg bg-gray-100 p-1">
				<button
					onclick={() => editor.undo()}
					disabled={editor.historyStep <= 0}
					class="p-2 text-slate-600 transition-colors hover:text-slate-900 disabled:opacity-30"
					title="Undo"
				>
					<Undo size={18} />
				</button>
				<button
					onclick={() => editor.redo()}
					disabled={editor.historyStep >= editor.history.length - 1}
					class="p-2 text-slate-600 transition-colors hover:text-slate-900 disabled:opacity-30"
					title="Redo"
				>
					<Redo size={18} />
				</button>
				<div class="mx-1 h-5 w-px bg-gray-300"></div>

				<button
					onclick={() => (editor.tool = 'hand')}
					class={`rounded p-2 transition-all ${editor.tool === 'hand' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:bg-gray-200 hover:text-slate-700'}`}
					title="Pan Tool (Spacebar)"
				>
					<Hand size={18} />
				</button>

				<label
					class="cursor-pointer rounded p-2 text-slate-500 transition-all hover:bg-gray-200 hover:text-slate-700"
					title="Upload Image/SVG"
				>
					<Upload size={18} />
					<input
						type="file"
						accept="image/*,.svg"
						onchange={(e) => editor.handleFileUpload(e)}
						class="hidden"
					/>
				</label>

				<div class="mx-1 h-5 w-px bg-gray-300"></div>

				{#each [{ id: 'select', icon: MousePointer2, label: 'Select (V)' }, { id: 'pen', icon: Pen, label: 'Pen (P)' }, { id: 'poly', icon: Hexagon, label: 'Polygon (Click points)' }, { id: 'text', icon: Type, label: 'Text (T)' }, { id: 'rect', icon: Square, label: 'Rectangle (R)' }, { id: 'circle', icon: CircleIcon, label: 'Circle (C)' }] as t}
					<button
						onclick={() => (editor.tool = t.id as any)}
						class={`rounded p-2 transition-all ${
							editor.tool === t.id
								? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5'
								: 'text-slate-500 hover:bg-gray-200 hover:text-slate-700'
						}`}
						title={t.label}
					>
						<t.icon size={18} />
					</button>
				{/each}
			</div>

			<div class="mx-2 h-6 w-px bg-gray-300"></div>

			<div class="flex items-center space-x-4">
				<label class="flex flex-col items-center">
					<span class="mb-0.5 text-[10px] uppercase tracking-wider text-gray-500">Stroke</span>
					<input
						type="color"
						value={editor.currentColor}
						oninput={(e) => {
							editor.currentColor = e.currentTarget.value;
							editor.updateSelectedProperty('stroke', e.currentTarget.value);
						}}
						class="h-6 w-8 cursor-pointer rounded border-none bg-transparent p-0"
					/>
				</label>

				<div class="flex flex-col items-center">
					<span class="mb-0.5 text-[10px] uppercase tracking-wider text-gray-500">Fill</span>
					<div class="flex items-center space-x-1">
						<input
							type="color"
							aria-label="Fill color"
							value={editor.currentFill === 'transparent' ? '#ffffff' : editor.currentFill}
							oninput={(e) => {
								editor.currentFill = e.currentTarget.value;
								editor.updateSelectedProperty('fill', e.currentTarget.value);
							}}
							class="h-6 w-8 cursor-pointer rounded border-none bg-transparent p-0"
							disabled={editor.currentFill === 'transparent'}
						/>
						<button
							onclick={() => {
								const newVal =
									editor.currentFill === 'transparent' ? '#ffffff' : 'transparent';
								editor.currentFill = newVal;
								editor.updateSelectedProperty('fill', newVal);
							}}
							class={`rounded border px-2 py-0.5 text-[10px] ${editor.currentFill === 'transparent' ? 'border-red-200 bg-red-50 text-red-600' : 'bg-gray-50 text-gray-600'}`}
						>
							{editor.currentFill === 'transparent' ? 'None' : 'Fill'}
						</button>
					</div>
				</div>

				<div class="flex w-24 flex-col">
					{#if editor.tool === 'text' || (editor.selectedId && editor.shapes.find((s) => s.id === editor.selectedId)?.type === 'text')}
						<label class="flex flex-col">
							<span class="mb-0.5 text-[10px] uppercase tracking-wider text-gray-500">
								Font Size: {editor.currentFontSize}px
							</span>
							<input
								type="range"
								min="10"
								max="120"
								value={editor.currentFontSize}
								oninput={(e) => {
									const val = parseInt(e.currentTarget.value);
									editor.currentFontSize = val;
									editor.updateSelectedProperty('fontSize', val);
								}}
								class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200"
							/>
						</label>
					{:else}
						<label class="flex flex-col">
							<span class="mb-0.5 text-[10px] uppercase tracking-wider text-gray-500">
								Stroke: {editor.currentStrokeWidth}px
							</span>
							<input
								type="range"
								min="1"
								max="20"
								value={editor.currentStrokeWidth}
								oninput={(e) => {
									const val = parseInt(e.currentTarget.value);
									editor.currentStrokeWidth = val;
									editor.updateSelectedProperty('strokeWidth', val);
								}}
								class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200"
							/>
						</label>
					{/if}
				</div>
			</div>
		</div>

		<div class="flex items-center space-x-2">
			{#if editor.selectedId}
				<button
					onclick={() => editor.deleteSelected()}
					class="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50"
					title="Delete Selected"
				>
					<Trash2 size={18} />
				</button>
			{/if}
			<button
				onclick={() => editor.handleExport()}
				class="flex items-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
			>
				<Download size={16} />
				<span>Export</span>
			</button>
		</div>
	</div>

	<div class="relative flex flex-1 overflow-hidden">
		{#if editor.contextMenu}
			<div
				class="absolute z-50 min-w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
				style={`top: ${editor.contextMenu.y}px; left: ${editor.contextMenu.x}px`}
			>
				{#if editor.contextMenu.type === 'point' && editor.contextMenu.targetId && editor.contextMenu.pointIndex !== undefined}
					<button
						onclick={() =>
							editor.toggleSmoothPoint(
								editor.contextMenu!.targetId!,
								editor.contextMenu!.pointIndex!
							)}
						class="flex w-full items-center px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
					>
						<Spline size={14} class="mr-2" /> Toggle Smooth
					</button>
					<button
						onclick={() =>
							editor.deletePoint(editor.contextMenu!.targetId!, editor.contextMenu!.pointIndex!)}
						class="flex w-full items-center px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
					>
						<Trash size={14} class="mr-2" /> Delete Point
					</button>
				{/if}
				{#if editor.contextMenu.type === 'shape'}
					<button
						onclick={() => {
							editor.deleteSelected();
							editor.contextMenu = null;
						}}
						class="flex w-full items-center px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
					>
						<Trash size={14} class="mr-2" /> Delete Shape
					</button>
				{/if}
				{#if editor.contextMenu.type === 'canvas'}
					<button
						onclick={() => {
							editor.view = { x: 0, y: 0, zoom: 1 };
							editor.contextMenu = null;
						}}
						class="flex w-full items-center px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
					>
						<CornerUpLeft size={14} class="mr-2" /> Reset View
					</button>
				{/if}
			</div>
		{/if}

		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			bind:this={editor.containerRef}
			class={`relative flex-1 overflow-hidden bg-slate-200 ${editor.tool === 'hand' || editor.isSpacePressed ? 'cursor-grab active:cursor-grabbing' : ''}`}
			onpointerdown={(e) => editor.handlePointerDown(e)}
			onpointermove={(e) => editor.handlePointerMove(e)}
			onpointerup={() => editor.handlePointerUp()}
			onpointerleave={() => editor.handlePointerUp()}
			onwheel={(e) => editor.handleWheel(e)}
			oncontextmenu={(e) => editor.handleContextMenu(e, 'canvas')}
			ondblclick={() => editor.handleDoubleClick()}
		>
			<!-- Welcome Screen -->
			{#if editor.showWelcome && editor.shapes.length === 0}
				<div
					class="absolute inset-0 z-10 flex items-center justify-center pointer-events-none"
				>
					<div
						class="pointer-events-auto rounded-xl border border-gray-200 bg-white/95 p-8 text-center shadow-lg"
					>
						<div
							class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600"
						>
							<Upload size={32} />
						</div>
						<h3 class="mb-2 text-lg font-bold text-gray-800">Welcome to SVG Studio</h3>
						<p class="mx-auto mb-6 max-w-xs text-sm text-gray-500">
							Upload an image to annotate, import an SVG to edit, or start fresh.
						</p>

						<div class="flex flex-col space-y-3">
							<label
								class="inline-block cursor-pointer rounded-lg bg-blue-600 px-6 py-2.5 font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
							>
								Import File
								<input
									type="file"
									accept="image/*,.svg"
									onchange={(e) => editor.handleFileUpload(e)}
									class="hidden"
								/>
							</label>
							<button
								onclick={() => (editor.showWelcome = false)}
								class="flex items-center justify-center space-x-2 rounded-lg py-2 font-medium text-gray-500 transition-colors hover:text-gray-800"
							>
								<Plus size={16} />
								<span>Start with Blank Canvas</span>
							</button>
						</div>
					</div>
				</div>
			{/if}

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
				</g>
			</svg>

			<div
				class="absolute bottom-4 left-4 flex space-x-2 rounded-lg border border-gray-200 bg-white p-1.5 shadow"
			>
				<button
					onclick={() => (editor.view = { ...editor.view, zoom: editor.view.zoom * 1.2 })}
					class="rounded p-1 hover:bg-gray-100"
				>
					<ZoomIn size={16} />
				</button>
				<span class="flex w-12 items-center justify-center text-xs"
					>{Math.round(editor.view.zoom * 100)}%</span
				>
				<button
					onclick={() => (editor.view = { ...editor.view, zoom: editor.view.zoom / 1.2 })}
					class="rounded p-1 hover:bg-gray-100"
				>
					<ZoomOut size={16} />
				</button>
			</div>
		</div>

		<div
			class="z-20 flex h-full w-80 flex-col overflow-hidden border-l border-gray-200 bg-white shadow-xl"
		>
			<div class="flex border-b border-gray-200">
				<button
					onclick={() => (editor.sidebarTab = 'layers')}
					class={`flex flex-1 items-center justify-center py-3 text-sm font-medium ${editor.sidebarTab === 'layers' ? 'border-b-2 border-blue-600 bg-blue-50/50 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
				>
					<Layers size={16} class="mr-2" /> Layers
				</button>
				<button
					onclick={() => (editor.sidebarTab = 'history')}
					class={`flex flex-1 items-center justify-center py-3 text-sm font-medium ${editor.sidebarTab === 'history' ? 'border-b-2 border-blue-600 bg-blue-50/50 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
				>
					<History size={16} class="mr-2" /> History
				</button>
				<button
					onclick={() => (editor.sidebarTab = 'properties')}
					class={`flex flex-1 items-center justify-center py-3 text-sm font-medium ${editor.sidebarTab === 'properties' ? 'border-b-2 border-blue-600 bg-blue-50/50 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
				>
					<Settings size={16} class="mr-2" /> Props
				</button>
			</div>

			<div class="flex-1 space-y-1 overflow-y-auto p-2">
				<!-- PROPERTIES TAB -->
				{#if editor.sidebarTab === 'properties'}
					<div class="space-y-6 p-2 pb-20">
						{#if !editor.selectedShape}
							<div class="mt-10 text-center text-sm italic text-gray-400">
								Select an object to edit properties
							</div>
						{:else}
							<div class="rounded-lg border border-gray-200 bg-gray-50 p-3">
								<div class="mb-3 flex items-center justify-between">
									<h3
										class="flex items-center text-xs font-bold uppercase tracking-wider text-gray-500"
									>
										<Play size={12} class="mr-1" /> Animation
									</h3>
									<button
										onclick={() => (editor.isPlaying = !editor.isPlaying)}
										class={`rounded p-1 ${editor.isPlaying ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
										title={editor.isPlaying ? 'Pause Preview' : 'Play Preview'}
									>
										{#if editor.isPlaying}
											<Pause size={14} />
										{:else}
											<Play size={14} />
										{/if}
									</button>
								</div>

								<div class="space-y-3">
									<div>
										<label class="block">
											<span class="mb-1 block text-xs text-gray-600">Animation Type</span>
											<select
												value={editor.selectedShape.animation?.type || 'none'}
												onchange={(e) =>
													editor.updateAnimation(editor.selectedShape!.id, {
														type: e.currentTarget.value as AnimationType
													})}
												class="w-full rounded-md border border-gray-300 p-1 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
										</label>
									</div>

									{#if editor.selectedShape.animation?.type === 'custom'}
										<div class="space-y-3 border-t border-gray-200 pt-2">
											<div class="flex items-center justify-between">
												<span class="text-xs font-medium">Keyframes</span>
												{#if !editor.editingStepId}
													<button
														onclick={() => editor.addAnimationStep(editor.selectedShape!.id)}
														class="flex items-center rounded border border-green-200 bg-green-100 px-2 py-1 text-[10px] text-green-700 transition-colors hover:bg-green-200"
														title="Save current state as a new keyframe"
													>
														<Plus size={10} class="mr-1" /> Capture Keyframe
													</button>
												{/if}
											</div>

											<!-- Editing Helper Box -->
											{#if editor.editingStepId}
												<div
													class="mb-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs"
												>
													<div class="mb-1 flex items-center font-bold text-amber-800">
														<Edit2 size={12} class="mr-1" /> Editing Keyframe
													</div>
													<p class="mb-3 leading-tight text-amber-700">
														Move, rotate, or resize the object on the canvas to define this step.
													</p>
													<div class="flex space-x-2">
														<button
															onclick={() => editor.updateStepFromShape(editor.selectedShape!.id)}
															class="flex flex-1 items-center justify-center rounded bg-amber-600 px-2 py-1.5 font-medium text-white shadow-sm hover:bg-amber-700"
														>
															<Check size={12} class="mr-1" /> Update
														</button>
														<button
															onclick={() => (editor.editingStepId = null)}
															class="rounded border border-gray-300 bg-white px-3 py-1.5 text-gray-600 hover:bg-gray-100"
														>
															Cancel
														</button>
													</div>
												</div>
											{/if}

											<div class="max-h-60 space-y-2 overflow-y-auto pr-1">
												{#each editor.selectedShape.animation.steps || [] as step, idx (step.id)}
													<!-- svelte-ignore a11y_click_events_have_key_events -->
													<!-- svelte-ignore a11y_no_static_element_interactions -->
													<div
														class={`cursor-pointer space-y-2 rounded border bg-white p-2 text-xs transition-all ${
															editor.editingStepId === step.id
																? 'border-amber-400 ring-2 ring-amber-100 shadow-sm'
																: 'border-gray-200 hover:border-blue-300 hover:shadow-sm'
														}`}
														onclick={() =>
															!editor.editingStepId &&
															editor.applyStepToShape(editor.selectedShape!.id, step.id)}
													>
														<div
															class="mb-1 flex items-center justify-between border-b border-gray-100 pb-1"
														>
															<span
																class={`flex items-center font-semibold ${editor.editingStepId === step.id ? 'text-amber-700' : 'text-gray-700'}`}
															>
																<div
																	class={`mr-1.5 h-1.5 w-1.5 rounded-full ${editor.editingStepId === step.id ? 'bg-amber-500' : 'bg-gray-300'}`}
																></div>
																Keyframe {idx + 1}
															</span>
															{#if !editor.editingStepId}
																<button
																	onclick={(e) => {
																		e.stopPropagation();
																		editor.removeAnimationStep(editor.selectedShape!.id, step.id);
																	}}
																	class="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
																	title="Delete Keyframe"
																>
																	<Trash size={12} />
																</button>
															{/if}
														</div>
														<div
															class="grid grid-cols-2 gap-2"
															onclick={(e) => e.stopPropagation()}
														>
															<div>
																<span class="text-[9px] uppercase tracking-wide text-gray-400"
																	>Duration</span
																>
																<div class="flex items-center">
																	<input
																		type="number"
																		aria-label="Duration"
																		step="0.1"
																		min="0"
																		value={step.duration}
																		oninput={(e) =>
																			editor.updateStepProperty(
																				editor.selectedShape!.id,
																				step.id,
																				'duration',
																				parseFloat(e.currentTarget.value)
																			)}
																		class="w-full rounded border-gray-200 p-1 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
																	/>
																	<span class="ml-1 text-gray-400">s</span>
																</div>
															</div>
															<div>
																<label class="block">
																	<span class="text-[9px] uppercase tracking-wide text-gray-400"
																		>Easing</span
																	>
																	<select
																		value={step.easing}
																		onchange={(e) =>
																			editor.updateStepProperty(
																				editor.selectedShape!.id,
																				step.id,
																				'easing',
																				e.currentTarget.value
																			)}
																		class="w-full rounded border-gray-200 p-1 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
																	>
																		<option value="linear">Linear</option>
																		<option value="ease">Ease</option>
																		<option value="ease-in">Ease In</option>
																		<option value="ease-out">Ease Out</option>
																		<option value="ease-in-out">Ease In Out</option>
																	</select>
																</label>
															</div>
														</div>
													</div>
												{/each}
												{#if !editor.selectedShape.animation.steps || editor.selectedShape.animation.steps.length === 0}
													<div
														class="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-xs text-gray-500"
													>
														<div
															class="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-400"
														>
															<Film size={14} />
														</div>
														<p class="mb-1 font-medium text-gray-700">Start Animating</p>
														<ol class="list-inside list-decimal space-y-1 text-left text-gray-500">
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
									{#if editor.selectedShape.animation?.type && editor.selectedShape.animation.type !== 'none'}
										<div class="space-y-3 border-t border-gray-200 pt-3">
											<div class="mb-2 flex items-center justify-between">
												<span class="text-xs font-semibold uppercase text-gray-500">Timing</span>
												<button
													onclick={() =>
														editor.updateAnimation(editor.selectedShape!.id, {
															type: 'none',
															steps: [],
															duration: 2,
															delay: 0
														})}
													class="flex items-center rounded px-2 py-0.5 text-[10px] text-red-500 hover:bg-red-50"
												>
													<RefreshCw size={10} class="mr-1" /> Reset
												</button>
											</div>

											{#if editor.selectedShape.animation.type !== 'custom'}
												<div>
													<div class="mb-1 flex justify-between text-xs text-gray-600">
														<span>Duration</span>
														<span>{editor.selectedShape.animation?.duration || 2}s</span>
													</div>
													<input
														type="range"
														min="0.5"
														max="10"
														step="0.5"
														value={editor.selectedShape.animation?.duration || 2}
														oninput={(e) =>
															editor.updateAnimation(editor.selectedShape!.id, {
																duration: parseFloat(e.currentTarget.value)
															})}
														class="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-blue-600"
													/>
												</div>
											{/if}

											<div>
												<div class="mb-1 flex justify-between text-xs text-gray-600">
													<span>Start Delay</span>
													<span>{editor.selectedShape.animation?.delay || 0}s</span>
												</div>
												<input
													type="range"
													min="0"
													max="5"
													step="0.1"
													value={editor.selectedShape.animation?.delay || 0}
													oninput={(e) =>
														editor.updateAnimation(editor.selectedShape!.id, {
															delay: parseFloat(e.currentTarget.value)
														})}
													class="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-blue-600"
												/>
											</div>

											<div class="grid grid-cols-2 gap-2">
												<div>
													<label class="block">
														<span class="mb-1 block text-xs text-gray-600">Direction</span>
														<select
															value={editor.selectedShape.animation?.direction || 'normal'}
															onchange={(e) =>
																editor.updateAnimation(editor.selectedShape!.id, {
																	direction: e.currentTarget.value as any
																})}
															class="w-full rounded border border-gray-300 bg-white p-1 text-xs"
														>
															<option value="normal">Normal</option>
															<option value="reverse">Reverse</option>
															<option value="alternate">Alternate</option>
															<option value="alternate-reverse">Alt Reverse</option>
														</select>
													</label>
												</div>
												<div>
													<label class="block">
														<span class="mb-1 block text-xs text-gray-600">Fill Mode</span>
														<select
															value={editor.selectedShape.animation?.fillMode || 'none'}
															onchange={(e) =>
																editor.updateAnimation(editor.selectedShape!.id, {
																	fillMode: e.currentTarget.value as any
																})}
															class="w-full rounded border border-gray-300 bg-white p-1 text-xs"
														>
															<option value="none">None</option>
															<option value="forwards">Forwards</option>
															<option value="backwards">Backwards</option>
															<option value="both">Both</option>
														</select>
													</label>
												</div>
											</div>

											<div class="flex items-center pt-1">
												<input
													type="checkbox"
													id="loop-anim"
													checked={editor.selectedShape.animation?.infinite ?? true}
													onchange={(e) =>
														editor.updateAnimation(editor.selectedShape!.id, {
															infinite: e.currentTarget.checked
														})}
													class="mr-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
												/>
												<label for="loop-anim" class="text-sm text-gray-700">Loop Infinitely</label>
											</div>
										</div>
									{/if}
								</div>
							</div>

							<div class="rounded-lg border border-gray-200 bg-gray-50 p-3">
								<h3 class="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
									Transform
								</h3>
								<div class="grid grid-cols-2 gap-2 font-mono text-xs text-gray-600">
									<div class="rounded border border-gray-200 bg-white px-2 py-1">
										X: {Math.round(editor.selectedShape.x)}
									</div>
									<div class="rounded border border-gray-200 bg-white px-2 py-1">
										Y: {Math.round(editor.selectedShape.y)}
									</div>
									{#if editor.selectedShape.width !== undefined}
										<div class="rounded border border-gray-200 bg-white px-2 py-1">
											W: {Math.round(editor.selectedShape.width)}
										</div>
									{/if}
									{#if editor.selectedShape.height !== undefined}
										<div class="rounded border border-gray-200 bg-white px-2 py-1">
											H: {Math.round(editor.selectedShape.height)}
										</div>
									{/if}
								</div>
							</div>
						{/if}
					</div>
				{/if}

				<!-- LAYERS TAB -->
				{#if editor.sidebarTab === 'layers'}
					{#if editor.shapes.length === 0}
						<div class="mt-10 text-center text-sm italic text-gray-400">No layers yet</div>
					{/if}

					{#each [...editor.shapes].reverse() as shape, index (shape.id)}
						{@const originalIndex = editor.shapes.length - 1 - index}
						{@const isSelected = shape.id === editor.selectedId}
						{@const Icon =
							shape.type === 'rect'
								? Square
								: shape.type === 'circle'
									? CircleIcon
									: shape.type === 'text'
										? Type
										: shape.type === 'image'
											? ImageIcon
											: shape.type === 'path'
												? shape.points
													? Pen
													: FileType
												: MousePointer2}
						{@const label =
							shape.type === 'rect'
								? 'Rectangle'
								: shape.type === 'circle'
									? 'Circle'
									: shape.type === 'text'
										? 'Text'
										: shape.type === 'image'
											? 'Image'
											: shape.type === 'path'
												? shape.points
													? 'Path'
													: 'Imported Path'
												: 'Shape'}

						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div
							onclick={() => {
								editor.selectedId = shape.id;
								editor.tool = 'select';
								editor.currentColor = shape.stroke;
								editor.currentFill = shape.fill;
								editor.currentStrokeWidth = shape.strokeWidth;
								if (shape.type === 'text' && shape.fontSize)
									editor.currentFontSize = shape.fontSize;
								editor.sidebarTab = 'properties';
							}}
							class={`group flex cursor-pointer items-center justify-between rounded p-2 text-sm ${
								isSelected
									? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
									: 'text-gray-600 hover:bg-gray-50'
							} ${!shape.visible ? 'opacity-50' : ''}`}
						>
							<div class="flex items-center space-x-2 truncate">
								<Icon size={14} class={isSelected ? 'text-blue-500' : 'text-gray-400'} />
								<span class="font-medium">{label} {originalIndex + 1}</span>
								{#if shape.animation && shape.animation.type !== 'none'}
									<Play size={10} class="ml-1 fill-green-500 text-green-500" />
								{/if}
							</div>

							<div class="flex items-center space-x-1">
								<button
									onclick={(e) => {
										e.stopPropagation();
										editor.toggleShapeVisibility(shape.id);
									}}
									class={`rounded p-1 text-gray-400 transition-all hover:bg-gray-200 hover:text-gray-600 ${!shape.visible ? 'text-gray-400' : ''}`}
									title={shape.visible ? 'Hide Layer' : 'Show Layer'}
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
										editor.selectedId = shape.id;
										editor.deleteSelected();
									}}
									class="rounded p-1 text-gray-300 opacity-0 transition-all hover:bg-red-100 hover:text-red-500 group-hover:opacity-100"
									title="Delete Layer"
								>
									<X size={14} />
								</button>
							</div>
						</div>
					{/each}
				{/if}

				<!-- HISTORY TAB -->
				{#if editor.sidebarTab === 'history'}
					<div class="space-y-2">
						{#each [...editor.history].reverse() as state, index (state.id)}
							{@const originalIndex = editor.history.length - 1 - index}
							{@const isActive = originalIndex === editor.historyStep}
							<!-- svelte-ignore a11y_click_events_have_key_events -->
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<div
								class={`rounded border p-2 transition-all ${
									isActive
										? 'border-blue-200 bg-blue-50 shadow-sm'
										: 'border-gray-100 bg-white hover:border-gray-300 hover:bg-gray-50'
								}`}
							>
								<div
									class="mb-2 flex cursor-pointer items-center justify-between"
									onclick={() => editor.restoreState(originalIndex)}
								>
									<div class="flex items-center space-x-2">
										<div
											class={`flex h-4 w-4 items-center justify-center rounded-full ${isActive ? 'bg-blue-600' : 'bg-gray-200'}`}
										>
											{#if isActive}
												<CheckCircle2 size={10} class="text-white" />
											{/if}
										</div>
										<div>
											<div
												class={`text-sm font-medium ${isActive ? 'text-blue-900' : 'text-gray-700'}`}
											>
												{state.description || `Version ${originalIndex + 1}`}
											</div>
											<div class="flex items-center text-[10px] text-gray-400">
												<Clock size={10} class="mr-1" />
												{new Date(state.timestamp).toLocaleTimeString()}
											</div>
										</div>
									</div>
								</div>

								{#if isActive}
									<button
										onclick={(e) => {
											e.stopPropagation();
											editor.handleExport();
										}}
										class="flex w-full items-center justify-center space-x-1 rounded border border-blue-200 bg-white py-1.5 text-xs text-blue-600 transition-colors hover:bg-blue-50"
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
	</div>
</div>
