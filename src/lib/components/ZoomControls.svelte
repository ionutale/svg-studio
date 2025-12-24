<script lang="ts">
	import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-svelte';
	import { editor } from '$lib/state.svelte';
</script>

<div
	class="absolute bottom-6 left-6 z-20 flex space-x-1 rounded-2xl border border-white/50 bg-white/70 p-1.5 shadow-2xl backdrop-blur-xl ring-1 ring-black/[0.05]"
>
    <!-- Reset View -->
	<button
		onclick={() => (editor.view = { x: 0, y: 0, zoom: 1 })}
		class="rounded-xl p-2 text-slate-500 transition-all hover:bg-white hover:text-slate-900 hover:shadow-sm"
        title="Reset View"
	>
		<Maximize2 size={16} strokeWidth={2.5} />
	</button>

    <div class="mx-1 w-px bg-slate-200"></div>

    <!-- Zoom Out -->
	<button
		onclick={() => (editor.view = { ...editor.view, zoom: editor.view.zoom / 1.2 })}
		class="rounded-xl p-2 text-slate-500 transition-all hover:bg-white hover:text-slate-900 hover:shadow-sm"
        title="Zoom Out"
	>
		<ZoomOut size={16} strokeWidth={2.5} />
	</button>

	<div class="flex items-center justify-center px-1 tabular-nums">
		<span class="text-[10px] font-black uppercase tracking-widest text-slate-600">
            {Math.round(editor.view.zoom * 100)}%
        </span>
	</div>

    <!-- Zoom In -->
	<button
		onclick={() => (editor.view = { ...editor.view, zoom: editor.view.zoom * 1.2 })}
		class="rounded-xl p-2 text-slate-500 transition-all hover:bg-white hover:text-slate-900 hover:shadow-sm"
        title="Zoom In"
	>
		<ZoomIn size={16} strokeWidth={2.5} />
	</button>
</div>
