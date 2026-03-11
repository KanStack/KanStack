<script setup lang="ts">
interface BoardOption {
    slug: string;
    title: string;
}

defineProps<{
    boardOptions: BoardOption[];
    currentBoardSlug: string | null;
    isLoading: boolean;
    workspacePath: string | null;
}>();

const emit = defineEmits<{
    openWorkspace: [];
    selectBoard: [slug: string];
}>();
</script>

<template>
    <header class="app-header">
        <div class="app-header__brand">
            <div class="app-header__eyebrow">local markdown</div>
            <div class="app-header__title">KANSTACK</div>
        </div>

        <div class="app-header__controls">
            <label
                v-if="boardOptions.length > 1"
                class="app-header__select-wrap"
            >
                <span class="app-header__label">board</span>
                <select
                    class="app-header__select"
                    :disabled="isLoading"
                    :value="currentBoardSlug ?? ''"
                    @change="
                        emit(
                            'selectBoard',
                            ($event.target as HTMLSelectElement).value,
                        )
                    "
                >
                    <option
                        v-for="board in boardOptions"
                        :key="board.slug"
                        :value="board.slug"
                    >
                        {{ board.title }}
                    </option>
                </select>
            </label>

            <button
                class="app-header__button"
                type="button"
                :disabled="isLoading"
                @click="emit('openWorkspace')"
            >
                {{ isLoading ? "loading..." : "open folder" }}
            </button>
        </div>
    </header>
</template>

<style scoped>
.app-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--shade-3);
    background: rgba(20, 20, 20, 0.9);
    backdrop-filter: blur(14px);
}

.app-header__brand {
    min-width: 0;
}

.app-header__eyebrow {
    color: var(--shade-4);
    font-size: 0.68rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
}

.app-header__title {
    font-size: 1.05rem;
    font-weight: 700;
    letter-spacing: 0.18em;
}

.app-header__controls {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-width: 0;
}

.app-header__select-wrap {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    padding: 0.15rem 0 0.15rem 0.85rem;
    border: 1px solid var(--shade-3);
    background: var(--shade-2);
}

.app-header__label {
    color: var(--shade-4);
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
}

.app-header__select,
.app-header__button {
    border: 1px solid var(--shade-3);
    background: var(--shade-1);
    color: var(--shade-5);
    font: inherit;
}

.app-header__select {
    min-width: 10rem;
    padding: 0.55rem 0.75rem;
}

.app-header__button {
    padding: 0.7rem 0.95rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
}

.app-header__button:hover,
.app-header__select:hover {
    border-color: var(--shade-5);
    background: var(--shade-2);
}

.app-header__button:disabled,
.app-header__select:disabled {
    opacity: 0.65;
    cursor: not-allowed;
}

@media (max-width: 900px) {
    .app-header {
        flex-direction: column;
        align-items: stretch;
    }

    .app-header__controls {
        flex-wrap: wrap;
    }
}
</style>
