<script lang="ts">
	import { Upload, Plus, Sparkles, Image as ImageIcon, FileCode } from 'lucide-svelte';
	import { editor } from '$lib/state.svelte';
</script>

{#if editor.showWelcome && editor.shapes.length === 0}
	<div class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-4">
		<div
			class="pointer-events-auto w-full max-w-lg overflow-hidden rounded-3xl border border-white/20 bg-white/80 p-1 shadow-2xl backdrop-blur-xl"
		>
			<div class="relative rounded-[calc(1.5rem-4px)] bg-white p-8 md:p-12">
				<!-- Decorative background element -->
				<div
					class="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-blue-500/10 blur-3xl"
				></div>
				<div
					class="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-purple-500/10 blur-3xl"
				></div>

				<div class="relative">
					<div
						class="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200 animate-in zoom-in duration-500"
					>
						<Sparkles size={40} />
					</div>

					<h3
						class="mb-3 text-center text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl"
					>
						SVG Studio
					</h3>
					<p class="mx-auto mb-10 max-w-sm text-center text-base leading-relaxed text-slate-500">
						Create, annotate, and animate SVGs with ease. Start your next project in seconds.
					</p>

					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<label
							class="group relative flex cursor-pointer flex-col items-center justify-center space-y-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 transition-all hover:border-blue-400 hover:bg-blue-50/50"
						>
							<div
								class="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm transition-colors group-hover:bg-blue-600 group-hover:text-white"
							>
								<Upload size={24} />
							</div>
							<div class="text-center">
								<span class="block text-sm font-bold text-slate-900">Import File</span>
								<span class="text-[10px] uppercase tracking-wider text-slate-500"
									>Image or SVG</span
								>
							</div>
							<input
								type="file"
								accept="image/*,.svg"
								onchange={(e) => editor.handleFileUpload(e)}
								class="hidden"
							/>
						</label>

						<button
							onclick={() => (editor.showWelcome = false)}
							class="group flex flex-col items-center justify-center space-y-3 rounded-2xl border-2 border-slate-100 bg-white p-6 transition-all hover:border-blue-400 hover:bg-blue-50/50 hover:shadow-md"
						>
							<div
								class="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 text-slate-600 shadow-sm transition-colors group-hover:bg-blue-600 group-hover:text-white"
							>
								<Plus size={24} />
							</div>
							<div class="text-center">
								<span class="block text-sm font-bold text-slate-900">Blank Canvas</span>
								<span class="text-[10px] uppercase tracking-wider text-slate-500"
									>Start Fresh</span
								>
							</div>
						</button>
					</div>

					<div class="mt-8 flex items-center justify-center space-x-6">
						<div class="flex items-center space-x-2 text-xs text-slate-400">
							<ImageIcon size={14} />
							<span>Annotate Images</span>
						</div>
						<div class="h-1 w-1 rounded-full bg-slate-300"></div>
						<div class="flex items-center space-x-2 text-xs text-slate-400">
							<FileCode size={14} />
							<span>SVG Animations</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}
