<script lang="ts">
	import { 
        Play, 
        Pause, 
        Plus, 
        Edit2, 
        Check, 
        Trash, 
        RefreshCw, 
        Settings,
        Activity,
        Move,
        Maximize,
        RotateCw,
        Layers,
        Film,
        AlignLeft,
        AlignCenter,
        AlignRight,
        AlignStartVertical,
        AlignVerticalJustifyCenter,
        AlignEndVertical,
        Columns,
        Rows
    } from 'lucide-svelte';
	import { editor } from '$lib/state.svelte';
	import type { AnimationType, Shape } from '$lib/types';
    
    function updateVal(key: keyof Shape, val: string) {
        let num = parseFloat(val);
        if (isNaN(num)) return;
        editor.updateSelectedProperty(key, num);
    }
</script>

<div class="space-y-6 px-4 py-6">
	{#if !editor.selectedShape}
		<div class="flex flex-col items-center justify-center pt-20 px-6 text-center">
            <div class="mb-4 rounded-2xl bg-slate-50 p-4 text-slate-300">
                <Settings size={32} />
            </div>
			<p class="text-sm font-medium text-slate-400">Select an object on the canvas to edit its properties</p>
		</div>
	{:else if editor.multiSelectedIds.length > 1}
        <!-- Multi-Selection Mode -->
        <div class="space-y-6">
            <div class="rounded-3xl border border-blue-100 bg-blue-50/50 p-5">
                <div class="mb-4 flex items-center justify-between">
                    <div class="flex items-center space-x-2">
                        <div class="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                            <Layers size={12} strokeWidth={3} />
                        </div>
                        <h3 class="text-[10px] font-black uppercase tracking-widest text-slate-500">Selection</h3>
                    </div>
                    <span class="text-[10px] font-bold text-blue-600">{editor.multiSelectedIds.length} Objects</span>
                </div>

                <div class="grid grid-cols-3 gap-2">
                    <button onclick={() => editor.alignSelected('left')} class="flex flex-col items-center justify-center rounded-xl bg-white p-3 shadow-sm hover:bg-blue-50 transition-colors" title="Align Left">
                        <AlignLeft size={16} />
                    </button>
                    <button onclick={() => editor.alignSelected('center')} class="flex flex-col items-center justify-center rounded-xl bg-white p-3 shadow-sm hover:bg-blue-50 transition-colors" title="Align Center (H)">
                        <AlignCenter size={16} />
                    </button>
                    <button onclick={() => editor.alignSelected('right')} class="flex flex-col items-center justify-center rounded-xl bg-white p-3 shadow-sm hover:bg-blue-50 transition-colors" title="Align Right">
                        <AlignRight size={16} />
                    </button>
                    <button onclick={() => editor.alignSelected('top')} class="flex flex-col items-center justify-center rounded-xl bg-white p-3 shadow-sm hover:bg-blue-50 transition-colors" title="Align Top">
                        <AlignStartVertical size={16} />
                    </button>
                    <button onclick={() => editor.alignSelected('middle')} class="flex flex-col items-center justify-center rounded-xl bg-white p-3 shadow-sm hover:bg-blue-50 transition-colors" title="Align Middle (V)">
                        <AlignVerticalJustifyCenter size={16} />
                    </button>
                    <button onclick={() => editor.alignSelected('bottom')} class="flex flex-col items-center justify-center rounded-xl bg-white p-3 shadow-sm hover:bg-blue-50 transition-colors" title="Align Bottom">
                        <AlignEndVertical size={16} />
                    </button>
                </div>

                <div class="mt-4 grid grid-cols-2 gap-2">
                    <button onclick={() => editor.distributeSelected('h')} class="flex items-center justify-center space-x-2 rounded-xl bg-white py-2 shadow-sm hover:bg-blue-50 transition-colors text-[10px] font-bold uppercase" title="Distribute Horizontally">
                        <Columns size={14} /> <span>Distribute H</span>
                    </button>
                    <button onclick={() => editor.distributeSelected('v')} class="flex items-center justify-center space-x-2 rounded-xl bg-white py-2 shadow-sm hover:bg-blue-50 transition-colors text-[10px] font-bold uppercase" title="Distribute Vertically">
                        <Rows size={14} /> <span>Distribute V</span>
                    </button>
                </div>
            </div>

            <button
                onclick={() => editor.deleteSelected()}
                class="flex w-full items-center justify-center space-x-2 rounded-2xl bg-red-50 py-3 text-red-600 hover:bg-red-100 transition-colors text-[10px] font-bold uppercase tracking-widest"
            >
                <Trash size={14} />
                <span>Delete Selection</span>
            </button>
        </div>
	{:else}
        <!-- Transform Group -->
        <div class="rounded-3xl border border-slate-100 bg-slate-50/50 p-5">
            <div class="mb-4 flex items-center space-x-2">
                <div class="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                    <Maximize size={12} strokeWidth={3} />
                </div>
                <h3 class="text-[10px] font-black uppercase tracking-widest text-slate-500">Transform</h3>
            </div>
            
            <div class="grid grid-cols-2 gap-4 font-mono">
                <div class="flex flex-col space-y-1">
                    <span class="text-[9px] uppercase tracking-wide text-slate-400">X Position</span>
                    <input
                        type="number"
                        value={Math.round(editor.selectedShape.x)}
                        onchange={(e) => updateVal('x', e.currentTarget.value)}
                        class="w-full rounded-xl border border-white bg-white px-3 py-1.5 text-xs text-slate-700 shadow-sm focus:border-blue-300 focus:outline-none"
                    />
                </div>
                <div class="flex flex-col space-y-1">
                    <span class="text-[9px] uppercase tracking-wide text-slate-400">Y Position</span>
                    <input
                        type="number"
                        value={Math.round(editor.selectedShape.y)}
                        onchange={(e) => updateVal('y', e.currentTarget.value)}
                        class="w-full rounded-xl border border-white bg-white px-3 py-1.5 text-xs text-slate-700 shadow-sm focus:border-blue-300 focus:outline-none"
                    />
                </div>
                {#if editor.selectedShape.width !== undefined}
                    <div class="flex flex-col space-y-1">
                        <span class="text-[9px] uppercase tracking-wide text-slate-400">Width</span>
                        <input
                            type="number"
                            value={Math.round(editor.selectedShape.width)}
                            onchange={(e) => updateVal('width', e.currentTarget.value)}
                            class="w-full rounded-xl border border-white bg-white px-3 py-1.5 text-xs text-slate-700 shadow-sm focus:border-blue-300 focus:outline-none"
                        />
                    </div>
                {/if}
                {#if editor.selectedShape.height !== undefined}
                    <div class="flex flex-col space-y-1">
                        <span class="text-[9px] uppercase tracking-wide text-slate-400">Height</span>
                        <input
                            type="number"
                            value={Math.round(editor.selectedShape.height)}
                            onchange={(e) => updateVal('height', e.currentTarget.value)}
                            class="w-full rounded-xl border border-white bg-white px-3 py-1.5 text-xs text-slate-700 shadow-sm focus:border-blue-300 focus:outline-none"
                        />
                    </div>
                {/if}
            </div>
        </div>

        <!-- Animation Group -->
		<div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
			<div class="mb-5 flex items-center justify-between">
				<div class="flex items-center space-x-2">
                    <div class="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                        <Activity size={12} strokeWidth={3} />
                    </div>
                    <h3 class="text-[10px] font-black uppercase tracking-widest text-slate-500">Animation</h3>
                </div>
                
				<button
					onclick={() => (editor.isPlaying = !editor.isPlaying)}
					class={`flex items-center space-x-2 rounded-xl px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${
                        editor.isPlaying 
                            ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                            : 'bg-green-50 text-green-600 hover:bg-green-100 shadow-lg shadow-green-100'
                    }`}
					title={editor.isPlaying ? 'Pause Preview' : 'Play Preview'}
				>
					{#if editor.isPlaying}
						<Pause size={12} strokeWidth={3} />
                        <span>Stop</span>
					{:else}
						<Play size={12} strokeWidth={3} />
                        <span>Run</span>
					{/if}
				</button>
			</div>

			<div class="space-y-5">
				<div>
					<label class="block">
						<span class="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400">Effect Type</span>
						<div class="relative">
                            <select
                                value={editor.selectedShape.animation?.type || 'none'}
                                onchange={(e) =>
                                    editor.updateAnimation(editor.selectedShape!.id, {
                                        type: e.currentTarget.value as AnimationType
                                    })}
                                class="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 transition-all focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-100"
                            >
                                <option value="none">Disabled</option>
                                <option value="custom">Keyframe Timeline</option>
                                <optgroup label="Presets">
                                    <option value="spin">Spin (Rotate)</option>
                                    <option value="pulse">Pulse (Scale)</option>
                                    <option value="bounce">Bounce (Vertical)</option>
                                    <option value="float">Float (Floating)</option>
                                    <option value="color-cycle">Color Cycle</option>
                                    <option value="wiggle">Wiggle</option>
                                    <option value="jello">Jello Effect</option>
                                    <option value="gradient">Gradient Flow</option>
                                </optgroup>
                            </select>
                            <div class="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                        </div>
					</label>
				</div>

				{#if editor.selectedShape.animation?.type === 'custom'}
					<div class="space-y-4 rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
						<div class="flex items-center justify-between">
                            <div class="flex items-center space-x-1.5">
                                <Film size={12} class="text-slate-400" />
							    <span class="text-[10px] font-bold uppercase tracking-widest text-slate-500">Timeline</span>
                            </div>
							{#if !editor.editingStepId}
								<button
									onclick={() => editor.addAnimationStep(editor.selectedShape!.id)}
									class="flex items-center rounded-lg bg-blue-600 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-white shadow-lg shadow-blue-100 transition-all hover:bg-blue-700"
									title="Save current state as a new keyframe"
								>
									<Plus size={10} class="mr-1" /> Add Key
								</button>
							{/if}
						</div>

						<!-- Editing Helper Box -->
						{#if editor.editingStepId}
							<div class="animate-in fade-in zoom-in slide-in-from-top-2 overflow-hidden rounded-xl border border-amber-200 bg-amber-50 p-3 ring-4 ring-amber-400/10">
								<div class="mb-1 flex items-center font-bold text-amber-800 text-[10px] uppercase tracking-wider">
									<Edit2 size={12} class="mr-1.5" /> Recording Keyframe
								</div>
								<p class="mb-3 text-[10px] font-medium leading-relaxed text-amber-700">
									Adjust position, rotation, or shape on canvas to record this state.
								</p>
								<div class="flex space-x-2">
									<button
										onclick={() => editor.updateStepFromShape(editor.selectedShape!.id)}
										class="flex flex-1 items-center justify-center rounded-lg bg-amber-600 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm hover:bg-amber-700"
									>
										<Check size={12} class="mr-1" /> Commit
									</button>
									<button
										onclick={() => (editor.editingStepId = null)}
										class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-50"
									>
										Exit
									</button>
								</div>
							</div>
						{/if}

						<div class="custom-scrollbar max-h-60 space-y-2 overflow-y-auto pr-1">
							{#each editor.selectedShape.animation.steps || [] as step, idx (step.id)}
								<!-- svelte-ignore a11y_click_events_have_key_events -->
								<!-- svelte-ignore a11y_no_static_element_interactions -->
								<div
									class={`cursor-pointer space-y-3 rounded-xl border p-3 transition-all duration-200 ${
										editor.editingStepId === step.id
											? 'border-amber-400 bg-white ring-4 ring-amber-400/5 shadow-md'
											: 'border-white bg-white shadow-sm hover:border-blue-300 hover:shadow-md'
									}`}
									onclick={() =>
										!editor.editingStepId &&
										editor.applyStepToShape(editor.selectedShape!.id, step.id)}
								>
									<div class="flex items-center justify-between border-b border-slate-50 pb-2">
										<span class={`flex items-center text-[10px] font-bold uppercase tracking-widest ${editor.editingStepId === step.id ? 'text-amber-700' : 'text-slate-500'}`}>
											<div class={`mr-2 h-1.5 w-1.5 rounded-full ${editor.editingStepId === step.id ? 'bg-amber-500 animate-pulse' : 'bg-slate-300'}`}></div>
											Key {idx + 1}
										</span>
										{#if !editor.editingStepId}
											<button
												onclick={(e) => {
													e.stopPropagation();
													editor.removeAnimationStep(editor.selectedShape!.id, step.id);
												}}
												class="rounded-lg p-1 text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500"
												title="Delete Keyframe"
											>
												<Trash size={12} />
											</button>
										{/if}
									</div>
									<div class="grid grid-cols-2 gap-3" onclick={(e) => e.stopPropagation()}>
										<div class="space-y-1">
											<span class="text-[9px] font-bold uppercase tracking-wide text-slate-400">Duration</span>
											<div class="relative flex items-center">
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
													class="w-full rounded-lg border-slate-100 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-700 focus:border-blue-400 focus:outline-none"
												/>
												<span class="absolute right-2 text-[9px] font-black text-slate-300">S</span>
											</div>
										</div>
										<div class="space-y-1">
											<span class="text-[9px] font-bold uppercase tracking-wide text-slate-400">Curve</span>
											<select
												value={step.easing}
												onchange={(e) =>
													editor.updateStepProperty(
														editor.selectedShape!.id,
														step.id,
														'easing',
														e.currentTarget.value
													)}
												class="w-full rounded-lg border-slate-100 bg-slate-50 px-1 py-1 text-[10px] font-bold text-slate-700 focus:border-blue-400 focus:outline-none"
											>
												<option value="linear">Linear</option>
												<option value="ease">Ease</option>
												<option value="ease-in">In</option>
												<option value="ease-out">Out</option>
												<option value="ease-in-out">In-Out</option>
											</select>
										</div>
									</div>
								</div>
							{/each}

							{#if !editor.selectedShape.animation.steps || editor.selectedShape.animation.steps.length === 0}
								<div class="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white/50 py-8 px-4 text-center">
									<div class="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-400">
										<Film size={14} />
									</div>
									<p class="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-tight">Timeline is empty</p>
								</div>
							{/if}
						</div>
					</div>
				{/if}

				<!-- Post-Animation Shared Settings -->
				{#if editor.selectedShape.animation?.type && editor.selectedShape.animation.type !== 'none'}
					<div class="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
						<div class="flex items-center justify-between">
							<span class="text-[10px] font-black uppercase tracking-widest text-slate-500">Configuration</span>
							<button
								onclick={() =>
									editor.updateAnimation(editor.selectedShape!.id, {
										type: 'none',
										steps: [],
										duration: 2,
										delay: 0
									})}
								class="flex items-center space-x-1.5 rounded-lg border border-slate-100 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500"
							>
								<RefreshCw size={10} />
								<span>Reset</span>
							</button>
						</div>

						<div class="space-y-4">
							{#if editor.selectedShape.animation.type !== 'custom'}
								<div class="space-y-2">
									<div class="flex justify-between">
										<span class="text-[10px] font-bold uppercase tracking-wide text-slate-400">Duration</span>
										<span class="text-[10px] font-black tabular-nums text-blue-600">{editor.selectedShape.animation?.duration || 2}s</span>
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
										class="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-blue-600 transition-all hover:bg-slate-300"
									/>
								</div>
							{/if}

							<div class="space-y-2">
								<div class="flex justify-between">
									<span class="text-[10px] font-bold uppercase tracking-wide text-slate-400">Start Delay</span>
									<span class="text-[10px] font-black tabular-nums text-blue-600">{editor.selectedShape.animation?.delay || 0}s</span>
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
                                    class="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-purple-600 transition-all hover:bg-slate-300"
								/>
							</div>

							<div class="grid grid-cols-2 gap-3">
								<div class="space-y-1.5">
                                    <span class="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Direction</span>
                                    <div class="relative">
                                        <select
                                            value={editor.selectedShape.animation?.direction || 'normal'}
                                            onchange={(e) =>
                                                editor.updateAnimation(editor.selectedShape!.id, {
                                                    direction: e.currentTarget.value as any
                                                })}
                                            class="w-full appearance-none rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-[10px] font-bold text-slate-700 transition-all focus:border-blue-400 focus:outline-none"
                                        >
                                            <option value="normal">Forward</option>
                                            <option value="reverse">Reverse</option>
                                            <option value="alternate">Yoyo</option>
                                            <option value="alternate-reverse">Yoyo Rev</option>
                                        </select>
                                    </div>
								</div>
								<div class="space-y-1.5">
                                    <span class="block text-[10px] font-bold uppercase tracking-wide text-slate-400">End State</span>
                                    <div class="relative">
                                        <select
                                            value={editor.selectedShape.animation?.fillMode || 'none'}
                                            onchange={(e) =>
                                                editor.updateAnimation(editor.selectedShape!.id, {
                                                    fillMode: e.currentTarget.value as any
                                                })}
                                            class="w-full appearance-none rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-[10px] font-bold text-slate-700 transition-all focus:border-blue-400 focus:outline-none"
                                        >
                                            <option value="none">Default</option>
                                            <option value="forwards">Freeze</option>
                                            <option value="backwards">Return</option>
                                            <option value="both">Both</option>
                                        </select>
                                    </div>
								</div>
							</div>

							<button 
                                onclick={() => {
                                    const val = editor.selectedShape?.animation?.infinite ?? true;
                                    editor.updateAnimation(editor.selectedShape!.id, {
                                        infinite: !val
                                    })
                                }}
                                class={`flex w-full items-center justify-between rounded-xl px-4 py-3 transition-all ${
                                    (editor.selectedShape.animation?.infinite ?? true) 
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' 
                                        : 'bg-slate-100 text-slate-500'
                                }`}
                            >
								<span class="text-[10px] font-bold uppercase tracking-widest">Loop Animation</span>
                                <div class={`relative h-5 w-9 rounded-full transition-colors ${
                                    (editor.selectedShape.animation?.infinite ?? true) ? 'bg-white/30' : 'bg-slate-300'
                                }`}>
                                    <div class={`absolute top-1 h-3 w-3 rounded-full bg-white transition-all shadow-sm ${
                                        (editor.selectedShape.animation?.infinite ?? true) ? 'right-1' : 'left-1'
                                    }`}></div>
                                </div>
							</button>
						</div>
					</div>
				{/if}
			</div>
		</div>
	{/if}
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
