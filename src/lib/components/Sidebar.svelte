<script lang="ts">
	import { Layers, History, Settings, ChevronRight } from 'lucide-svelte';
	import { editor } from '$lib/state.svelte';
	import PropertiesPanel from './PropertiesPanel.svelte';
    import { 
        Square, 
        Circle as CircleIcon, 
        Type, 
        Image as ImageIcon, 
        Eye, 
        EyeOff, 
        Trash2,
        Clock,
        ArrowUp,
        ArrowDown
    } from 'lucide-svelte';

	const tabs = [
		{ id: 'layers', icon: Layers, label: 'Layers' },
		{ id: 'history', icon: History, label: 'History' },
		{ id: 'properties', icon: Settings, label: 'Props' }
	];

    function getLayerIcon(type: string) {
        switch (type) {
            case 'rect': return Square;
            case 'circle': return CircleIcon;
            case 'text': return Type;
            case 'image': return ImageIcon;
            default: return Square;
        }
    }
</script>

<div
	class="z-20 flex h-full w-80 flex-col overflow-hidden border-l border-slate-200 bg-white shadow-[0_0_40px_-15px_rgba(0,0,0,0.1)] transition-all duration-300"
>
	<!-- Tab Navigation -->
	<div class="flex border-b border-slate-200 p-1.5">
		{#each tabs as tab}
			<button
				onclick={() => (editor.sidebarTab = tab.id as any)}
				class={`flex flex-1 items-center justify-center rounded-xl py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
					editor.sidebarTab === tab.id
						? 'bg-blue-600 text-white shadow-lg shadow-blue-100'
						: 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
				}`}
			>
				<tab.icon size={14} class="mr-2" strokeWidth={2.5} />
				{tab.label}
			</button>
		{/each}
	</div>

	<div class="flex-1 overflow-y-auto custom-scrollbar">
		{#if editor.sidebarTab === 'properties'}
			<PropertiesPanel />
		{:else}
			<div class="space-y-1 p-3">
				<!-- LAYERS TAB -->
				{#if editor.sidebarTab === 'layers'}
					<div class="mb-4 flex items-center justify-between px-2">
                        <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">Scene Tree</span>
                        <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                            {editor.shapes.length}
                        </span>
                    </div>
                    
					{#if editor.shapes.length === 0}
						<div class="flex flex-col items-center justify-center pt-20 px-6 text-center">
                            <div class="mb-4 rounded-2xl bg-slate-50 p-4 text-slate-300">
                                <Layers size={32} />
                            </div>
							<p class="text-sm font-medium text-slate-400">No layers in this project yet</p>
						</div>
					{:else}
                        <div class="space-y-1">
                            {#each [...editor.shapes].reverse() as shape (shape.id)}
                                {@const isSelected = shape.id === editor.selectedId}
                                <div
                                    class={`group flex items-center justify-between rounded-xl border p-2 transition-all ${
                                        isSelected
                                            ? 'border-blue-200 bg-blue-50/50 shadow-sm'
                                            : 'border-transparent hover:bg-slate-50'
                                    }`}
                                >
                                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                                    <div
                                        class="flex flex-1 cursor-pointer items-center space-x-3 overflow-hidden"
                                        onclick={(e) => {
                                            if (e.shiftKey) {
                                                if (editor.multiSelectedIds.includes(shape.id)) {
                                                    editor.multiSelectedIds = editor.multiSelectedIds.filter(id => id !== shape.id);
                                                } else {
                                                    editor.multiSelectedIds = [...editor.multiSelectedIds, shape.id];
                                                }
                                            } else {
                                                editor.selectedId = shape.id;
                                                editor.multiSelectedIds = [];
                                            }
                                            editor.sidebarTab = 'properties';
                                        }}
                                    >
                                        <div class={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
                                            isSelected ? 'bg-white border-blue-200 text-blue-600' : 'bg-white border-slate-100 text-slate-400'
                                        }`}>
                                            <svelte:component this={getLayerIcon(shape.type)} size={16} />
                                        </div>
                                        <div class="flex flex-col overflow-hidden">
                                            <span class={`truncate text-xs font-bold leading-none ${isSelected ? 'text-blue-900' : 'text-slate-700'}`}>
                                                {shape.type.charAt(0).toUpperCase() + shape.type.slice(1)}
                                            </span>
                                            <span class="mt-1 truncate text-[10px] text-slate-400">
                                                ID: {shape.id.slice(0, 8)}...
                                            </span>
                                        </div>
                                    </div>

                                    <div class="flex items-center space-x-0.5 px-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onclick={() => editor.moveLayer(shape.id, 'up')}
                                            class="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                                            title="Move Up"
                                        >
                                            <ArrowUp size={12} />
                                        </button>
                                        <button
                                            onclick={() => editor.moveLayer(shape.id, 'down')}
                                            class="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                                            title="Move Down"
                                        >
                                            <ArrowDown size={12} />
                                        </button>
                                        <button
                                            onclick={() => editor.toggleShapeVisibility(shape.id)}
                                            class={`rounded-lg p-1 transition-colors ${
                                                shape.visible ? 'text-slate-400 hover:text-slate-600 hover:bg-slate-100' : 'text-red-400 hover:text-red-600 hover:bg-red-50'
                                            }`}
                                            title={shape.visible ? 'Hide Layer' : 'Show Layer'}
                                        >
                                            {#if shape.visible}
                                                <Eye size={14} />
                                            {:else}
                                                <EyeOff size={14} />
                                            {/if}
                                        </button>
                                        <button
                                            onclick={() => {
                                                editor.selectedId = shape.id;
                                                editor.deleteSelected();
                                            }}
                                            class="rounded-lg p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                                            title="Delete Layer"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            {/each}
                        </div>
					{/if}
				{/if}

				<!-- HISTORY TAB -->
				{#if editor.sidebarTab === 'history'}
                    <div class="mb-4 flex items-center justify-between px-2">
                        <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">Timeline</span>
                        <button 
                            onclick={() => editor.restoreState(0)}
                            class="text-[10px] font-bold uppercase tracking-wider text-blue-600 hover:underline"
                        >
                            Reset All
                        </button>
                    </div>

                    <div class="space-y-1">
                        {#each [...editor.history].reverse() as state, index (state.id)}
                            {@const originalIndex = editor.history.length - 1 - index}
                            {@const isActive = originalIndex === editor.historyStep}
                            <button
                                onclick={() => editor.restoreState(originalIndex)}
                                class={`group relative flex w-full items-center space-x-3 rounded-xl border p-2.5 text-left transition-all ${
                                    isActive
                                        ? 'border-blue-200 bg-blue-50/50 shadow-sm'
                                        : 'border-transparent hover:bg-slate-50'
                                }`}
                            >
                                <div class={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
                                    isActive ? 'bg-white border-blue-200 text-blue-600' : 'bg-white border-slate-100 text-slate-400 group-hover:border-slate-200'
                                }`}>
                                    <Clock size={16} />
                                </div>
                                <div class="flex flex-col">
                                    <span class={`text-xs font-bold leading-none ${isActive ? 'text-blue-900' : 'text-slate-700'}`}>
                                        {state.description}
                                    </span>
                                    <span class="mt-1 text-[10px] text-slate-400">
                                        {new Date(state.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    </span>
                                </div>
                                {#if isActive}
                                    <div class="absolute right-3">
                                        <ChevronRight size={14} class="text-blue-400" />
                                    </div>
                                {/if}
                            </button>
                        {/each}
                    </div>
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
    .custom-scrollbar::-webkit-scrollbar {
        width: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #e2e8f0;
        border-radius: 10px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: #cbd5e1;
    }
</style>
