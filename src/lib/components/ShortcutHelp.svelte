<script lang="ts">
	import { X } from 'lucide-svelte';
	import { editor } from '$lib/state.svelte';

	const shortcuts = [
		{ key: 'V', desc: 'Select Tool' },
		{ key: 'P', desc: 'Pen Tool' },
		{ key: 'R', desc: 'Rectangle Tool' },
		{ key: 'C', desc: 'Circle Tool' },
		{ key: 'T', desc: 'Text Tool' },
		{ key: 'L', desc: 'Polyline Tool' },
		{ key: 'H', desc: 'Hand (Pan) Tool' },
		{ key: 'Space', desc: 'Hold to Pan' },
		{ key: 'Del/BS', desc: 'Delete Selected' },
		{ key: '⌘/Ctrl + Z', desc: 'Undo' },
		{ key: '⌘/Ctrl + Shift + Z', desc: 'Redo' },
		{ key: 'Shift + Drag', desc: 'Marquee Multi-Select' },
		{ key: 'Shift + Click', desc: 'Toggle Multi-Select' },
		{ key: '?', desc: 'Toggle this help' }
	];
</script>

{#if editor.showShortcuts}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
		onclick={() => (editor.showShortcuts = false)}
	>
		<div
			class="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/20 bg-white/90 p-8 shadow-2xl backdrop-blur-2xl ring-1 ring-black/5 animate-in zoom-in-95 duration-200"
			onclick={(e) => e.stopPropagation()}
		>
			<button
				onclick={() => (editor.showShortcuts = false)}
				class="absolute right-6 top-6 rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
			>
				<X size={20} />
			</button>

			<h3 class="mb-6 text-2xl font-black tracking-tight text-slate-900">Keyboard Shortcuts</h3>

			<div class="grid grid-cols-1 gap-3">
				{#each shortcuts as { key, desc }}
					<div class="flex items-center justify-between py-1">
						<span class="text-sm font-medium text-slate-500">{desc}</span>
						<kbd class="min-w-[2.5rem] rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-center font-mono text-xs font-bold text-slate-900 shadow-sm">
							{key}
						</kbd>
					</div>
				{/each}
			</div>

			<div class="mt-8 rounded-2xl bg-blue-50 p-4 text-xs font-medium text-blue-700">
				Pro Tip: Use <span class="font-bold">Shift</span> while drawing to snap or multi-select!
			</div>
		</div>
	</div>
{/if}
