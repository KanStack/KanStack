<script setup lang="ts">
import { computed, onMounted } from 'vue'

import AppHeader from '@/components/app/AppHeader.vue'
import BoardCanvas from '@/components/board/BoardCanvas.vue'
import CardEditorModal from '@/components/card/CardEditorModal.vue'
import { useWorkspace } from '@/composables/useWorkspace'

const {
  workspace,
  currentBoard,
  currentBoardSlug,
  boardOptions,
  selectedCard,
  isLoading,
  errorMessage,
  openWorkspace,
  restoreWorkspace,
  selectBoard,
  selectCard,
  closeCard
} = useWorkspace()

const emptyStateCopy = computed(() => {
  if (isLoading.value) {
    return 'Reading markdown workspace...'
  }

  if (errorMessage.value) {
    return errorMessage.value
  }

  return 'Open a local folder with `boards/` and `cards/` to render your board.'
})

onMounted(() => {
  void restoreWorkspace()
})
</script>

<template>
  <div class="app-shell">
    <AppHeader
      :board-options="boardOptions"
      :current-board-slug="currentBoardSlug"
      :is-loading="isLoading"
      :workspace-path="workspace?.rootPath ?? null"
      @open-workspace="openWorkspace"
      @select-board="selectBoard"
    />

    <main class="app-shell__main">
      <div v-if="currentBoard" class="app-shell__panel">
        <BoardCanvas
          :board="currentBoard"
          :boards-by-slug="workspace?.boardsBySlug ?? {}"
          :board-files-by-slug="workspace?.boardFilesBySlug ?? {}"
          :cards-by-slug="workspace?.cardsBySlug ?? {}"
          :workspace-root="workspace?.rootPath ?? null"
          @select-board="selectBoard"
          @select-card="selectCard"
        />
      </div>

      <section v-else class="app-shell__state">
        <div class="app-shell__state-eyebrow">kanstack</div>
        <h1 class="app-shell__state-title">Minimal board renderer</h1>
        <p class="app-shell__state-copy">{{ emptyStateCopy }}</p>
        <button class="app-shell__state-button" type="button" @click="openWorkspace">
          open workspace
        </button>
      </section>
    </main>

    <CardEditorModal
      :card="selectedCard"
      :open="Boolean(selectedCard)"
      :workspace-root="workspace?.rootPath ?? null"
      @close="closeCard"
    />
  </div>
</template>

<style scoped>
.app-shell {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.app-shell__main {
  flex: 1;
  min-height: 0;
  padding: 1.25rem;
}

.app-shell__panel,
.app-shell__state {
  height: 100%;
  border: 1px solid var(--shade-3);
  background: rgba(20, 20, 20, 0.9);
}

.app-shell__panel {
  padding: 1rem;
}

.app-shell__state {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 1rem;
  padding: min(8vw, 4rem);
}

.app-shell__state-eyebrow {
  color: var(--shade-4);
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.app-shell__state-title {
  margin: 0;
  font-size: clamp(1.8rem, 3vw, 3rem);
}

.app-shell__state-copy {
  max-width: 34rem;
  margin: 0;
  color: var(--shade-4);
  line-height: 1.7;
}

.app-shell__state-button {
  padding: 0.8rem 1rem;
  border: 1px solid var(--shade-3);
  background: var(--shade-2);
  color: var(--shade-5);
  font: inherit;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.app-shell__state-button:hover {
  border-color: var(--shade-5);
}
</style>
