<script lang="ts">
	import {
		Undo,
		Redo,
		Hand,
		Upload,
		MousePointer2,
		Pen,
		Hexagon,
		Type,
		Square,
		Circle as CircleIcon,
		Trash2,
		Download,
		ChevronDown,
        Code,
        HelpCircle,
        Grid3X3
	} from 'lucide-svelte';
	import { editor } from '$lib/state.svelte';

	const tools = [
		{ id: 'select', icon: MousePointer2, label: 'Select', shortcut: 'V' },
		{ id: 'pen', icon: Pen, label: 'Pen', shortcut: 'P' },
		{ id: 'poly', icon: Hexagon, label: 'Polygon', shortcut: 'L' },
		{ id: 'text', icon: Type, label: 'Text', shortcut: 'T' },
		{ id: 'rect', icon: Square, label: 'Rectangle', shortcut: 'R' },
		{ id: 'circle', icon: CircleIcon, label: 'Circle', shortcut: 'C' }
	];
</script>

<div
	class="z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white/80 px-6 backdrop-blur-md"
>
	<div class="flex items-center space-x-8">
		<div class="flex flex-col">
			<h1 class="text-lg font-black tracking-tighter text-slate-900">
				SVG<span class="text-blue-600">STUDIO</span>
			</h1>
			<span class="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400"
				>Digital Canvas</span
			>
		</div>

		<div class="h-8 w-px bg-slate-200"></div>

		<div class="flex items-center space-x-1.5 rounded-2xl bg-slate-100/50 p-1.5">
			<!-- History Group -->
			<div class="flex items-center space-x-0.5">
				<button
					onclick={() => editor.undo()}
					disabled={editor.historyStep <= 0}
					class="rounded-xl p-2.5 text-slate-500 transition-all hover:bg-white hover:text-slate-900 hover:shadow-sm disabled:opacity-20"
					title="Undo"
				>
					<Undo size={19} strokeWidth={2.5} />
				</button>
				<button
					onclick={() => editor.redo()}
					disabled={editor.historyStep >= editor.history.length - 1}
					class="rounded-xl p-2.5 text-slate-500 transition-all hover:bg-white hover:text-slate-900 hover:shadow-sm disabled:opacity-20"
					title="Redo"
				>
					<Redo size={19} strokeWidth={2.5} />
				</button>
			</div>

			<div class="mx-1 h-6 w-px bg-slate-200"></div>

			<!-- Interaction Group -->
			<div class="flex items-center space-x-0.5">
				<button
					onclick={() => (editor.tool = 'hand')}
					class={`rounded-xl p-2.5 transition-all ${
						editor.tool === 'hand'
							? 'bg-blue-600 text-white shadow-lg shadow-blue-100'
							: 'text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-sm'
					}`}
					title="Pan Tool (Spacebar)"
				>
					<Hand size={19} strokeWidth={2.5} />
				</button>

				<label
					class="cursor-pointer rounded-xl p-2.5 text-slate-500 transition-all hover:bg-white hover:text-slate-900 hover:shadow-sm"
					title="Upload Image/SVG"
				>
					<Upload size={19} strokeWidth={2.5} />
					<input
						type="file"
						accept="image/*,.svg"
						onchange={(e) => editor.handleFileUpload(e)}
						class="hidden"
					/>
				</label>
			</div>

			<div class="mx-1 h-6 w-px bg-slate-200"></div>

			<!-- Tools Group -->
			<div class="grid grid-cols-6 gap-0.5">
				{#each tools as t}
					<button
						onclick={() => (editor.tool = t.id as any)}
						class={`relative rounded-xl p-2.5 transition-all ${
							editor.tool === t.id
								? 'bg-blue-600 text-white shadow-lg shadow-blue-100'
								: 'text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-sm'
						}`}
						title={`${t.label} (${t.shortcut})`}
					>
						<t.icon size={19} strokeWidth={2.5} />
						{#if editor.tool === t.id}
							<div class="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-white"></div>
						{/if}
					</button>
				{/each}
			</div>
		</div>

		<div class="h-8 w-px bg-slate-200"></div>

		<!-- Appearance Quick Controls -->
		<div class="flex items-center space-x-6">
			<div class="flex items-center space-x-3">
				<div class="flex flex-col">
					<span class="text-[9px] font-bold uppercase tracking-wider text-slate-400">Stroke</span>
					<div class="relative mt-1">
						<input
							type="color"
							value={editor.currentColor}
							oninput={(e) => {
								editor.currentColor = e.currentTarget.value;
								editor.updateSelectedProperty('stroke', e.currentTarget.value);
							}}
							class="h-6 w-10 cursor-pointer overflow-hidden rounded-lg border-2 border-white bg-slate-200 shadow-sm"
						/>
					</div>
				</div>

				<div class="flex flex-col">
					<span class="text-[9px] font-bold uppercase tracking-wider text-slate-400">Fill</span>
					<div class="mt-1 flex items-center space-x-2">
						<div class="relative">
							<input
								type="color"
								aria-label="Fill color"
								value={editor.currentFill === 'transparent' ? '#ffffff' : editor.currentFill}
								oninput={(e) => {
									editor.currentFill = e.currentTarget.value;
									editor.updateSelectedProperty('fill', e.currentTarget.value);
								}}
								class={`h-6 w-10 cursor-pointer overflow-hidden rounded-lg border-2 border-white shadow-sm ${editor.currentFill === 'transparent' ? 'opacity-30' : ''}`}
								disabled={editor.currentFill === 'transparent'}
							/>
							{#if editor.currentFill === 'transparent'}
								<div class="absolute inset-0 pointer-events-none flex items-center justify-center">
									<div class="h-px w-full rotate-45 bg-red-500/50"></div>
								</div>
							{/if}
						</div>
						<button
							onclick={() => {
								const newVal = editor.currentFill === 'transparent' ? '#ffffff' : 'transparent';
								editor.currentFill = newVal;
								editor.updateSelectedProperty('fill', newVal);
							}}
							class={`h-6 rounded-md px-2 text-[10px] font-bold uppercase transition-all ${
								editor.currentFill === 'transparent'
									? 'bg-red-50 text-red-500 hover:bg-red-100'
									: 'bg-slate-100 text-slate-500 hover:bg-slate-200'
							}`}
						>
							{editor.currentFill === 'transparent' ? 'None' : 'Fill'}
						</button>
					</div>
				</div>
			</div>

			<div class="flex flex-col w-32">
				{#if editor.tool === 'text' || (editor.selectedId && editor.shapes.find((s) => s.id === editor.selectedId)?.type === 'text')}
					<span class="text-[9px] font-bold uppercase tracking-wider text-slate-400">
						Font Size ({editor.currentFontSize}px)
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
						class="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-blue-600 transition-all hover:bg-slate-300"
					/>
				{:else}
					<span class="text-[9px] font-bold uppercase tracking-wider text-slate-400">
						Stroke ({editor.currentStrokeWidth}px)
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
						class="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-blue-600 transition-all hover:bg-slate-300"
					/>
				{/if}
			</div>

            <div class="h-8 w-px bg-slate-200"></div>

            <button
                onclick={() => editor.snapToGrid = !editor.snapToGrid}
                class={`flex items-center space-x-2 rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-all ${
                    editor.snapToGrid ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:bg-slate-50'
                }`}
            >
                <Grid3X3 size={16} />
                <span>Snap</span>
            </button>
		</div>
		</div>
	</div>

	<div class="flex items-center space-x-3">
		{#if editor.selectedId}
			<button
				onclick={() => editor.deleteSelected()}
				class="group flex items-center space-x-2 rounded-xl bg-red-50 px-3 py-2 text-red-500 transition-all hover:bg-red-500 hover:text-white hover:shadow-lg hover:shadow-red-100"
				title="Delete Selected"
			>
				<Trash2 size={18} />
				<span class="text-xs font-bold uppercase tracking-wider">Delete</span>
			</button>
		{/if}
		
		<div class="flex items-center overflow-hidden rounded-xl bg-blue-600 shadow-lg shadow-blue-100 shadow-sm ring-1 ring-blue-500/50">
			<button
				onclick={() => editor.handleExport()}
				class="flex items-center space-x-2 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-blue-700"
			>
				<Download size={18} strokeWidth={2.5} />
				<span>EXPORT</span>
			</button>
			<div class="w-px h-6 bg-blue-500/50"></div>
			<button 
                onclick={() => editor.copySVGToClipboard()}
                class="px-3 py-2.5 text-white transition-all hover:bg-blue-700"
                title="Copy SVG Code"
            >
				<Code size={18} strokeWidth={2.5} />
			</button>
		</div>

        <button 
            onclick={() => editor.showShortcuts = true}
            class="group flex items-center justify-center rounded-full bg-slate-100 p-2.5 text-slate-400 transition-all hover:bg-blue-600 hover:text-white hover:shadow-lg hover:shadow-blue-100"
            title="Keyboard Shortcuts"
        >
            <HelpCircle size={20} />
        </button>
		</div>
	</div>
</div>
