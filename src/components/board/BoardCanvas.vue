<script setup lang="ts">
import { computed, shallowRef, watch } from "vue";
import { invoke } from '@tauri-apps/api/core'

import type {
    KanbanBoardDocument,
    KanbanBoardSettings,
    KanbanCardDocument,
} from "@docs/schemas/kanban-parser-schema";
import { buildBoardView } from "@/utils/buildBoardView";
import { useBoardPointerDrag, type BoardPointerDropTarget } from '@/composables/useBoardPointerDrag'
import { addBoardCardMarkdown, moveBoardCardMarkdown } from '@/utils/serializeBoard'
import { serializeCardMarkdown } from '@/utils/serializeCard'
import { cardSlugFromTitle, getNextAvailableSlug } from '@/utils/slug'
import { updateBoardSettingsMarkdown } from '@/utils/serializeBoardSettings'

import BoardColumn from "./BoardColumn.vue";

const props = defineProps<{
    board: KanbanBoardDocument;
    boardsBySlug: Record<string, KanbanBoardDocument>;
    boardFilesBySlug: Record<string, { content: string; path: string }>;
    cardsBySlug: Record<string, KanbanCardDocument>;
    workspaceRoot: string | null;
}>();

const emit = defineEmits<{
    selectBoard: [slug: string];
    selectCard: [slug: string];
}>();

const includeSubBoards = shallowRef(props.board.settings?.["show-sub-boards"] ?? true);
const isMovingCard = shallowRef(false);
const isSavingPreference = shallowRef(false);
const boardView = computed(() =>
    buildBoardView(props.board, props.boardsBySlug, includeSubBoards.value),
);
const activeDropTarget = computed(() => {
    if (
        drag.state.insertColumnSlug === null ||
        drag.state.insertSectionKey === null ||
        drag.state.insertDisplayIndex === null
    ) {
        return null
    }

    return {
        columnSlug: drag.state.insertColumnSlug,
        sectionKey: drag.state.insertSectionKey,
        displayIndex: drag.state.insertDisplayIndex,
        surfaceId: drag.state.insertSurfaceId,
    }
})
const rollupBoardCount = computed(
    () => buildBoardView(props.board, props.boardsBySlug, true).descendantBoardCount,
);

const drag = useBoardPointerDrag(async (item, target) => {
    console.debug('[kanstack:pointer-drag:drop]', {
        item,
        target,
        currentBoardSlug: props.board.slug,
    })

    if (!props.workspaceRoot || isMovingCard.value) {
        return
    }

    const ownerBoard = props.boardsBySlug[item.sourceBoardSlug]
    const ownerBoardFile = props.boardFilesBySlug[item.sourceBoardSlug]
    if (!ownerBoard || !ownerBoardFile) {
        console.debug('[kanstack:pointer-drag:missing-owner]', {
            sourceBoardSlug: item.sourceBoardSlug,
            hasOwnerBoard: Boolean(ownerBoard),
            hasOwnerBoardFile: Boolean(ownerBoardFile),
        })
        return
    }

    const displayCards = getDisplayCardsForTarget(target)
    const targetIndex = displayCards
        .slice(0, target.displayIndex)
        .filter(
            (card) =>
                card.sourceBoardSlug === item.sourceBoardSlug &&
                card.slug !== item.slug,
        ).length

    console.debug('[kanstack:pointer-drag:target-index]', {
        cardSlug: item.slug,
        sourceBoardSlug: item.sourceBoardSlug,
        target,
        displayCards: displayCards.map((card) => ({
            slug: card.slug,
            sourceBoardSlug: card.sourceBoardSlug,
        })),
        targetIndex,
    })

    const nextContent = moveBoardCardMarkdown(ownerBoard, {
        cardSlug: item.slug,
        targetColumnName: target.columnName,
        targetColumnSlug: target.columnSlug,
        targetSectionName: target.sectionName,
        targetSectionSlug: target.sectionSlug,
        targetIndex,
    })

    isMovingCard.value = true

    try {
        await invoke('save_board_file', {
            root: props.workspaceRoot,
            path: ownerBoard.path,
            content: nextContent,
        })

        console.debug('[kanstack:pointer-drag:save:success]', {
            ownerBoardSlug: ownerBoard.slug,
            cardSlug: item.slug,
        })
    } catch (error) {
        console.error('[kanstack:pointer-drag:save:error]', error)
    } finally {
        isMovingCard.value = false
    }
})

async function toggleSubBoards() {
    const boardFileContent = props.boardFilesBySlug[props.board.slug]?.content ?? null;

    if (!props.workspaceRoot || !boardFileContent || isSavingPreference.value) {
        includeSubBoards.value = !includeSubBoards.value
        return
    }

    const nextValue = !includeSubBoards.value
    const nextSettings: KanbanBoardSettings = {
        ...(props.board.settings ?? {}),
        'show-sub-boards': nextValue,
    }
    const nextContent = updateBoardSettingsMarkdown(boardFileContent, nextSettings)

    includeSubBoards.value = nextValue
    isSavingPreference.value = true

    try {
        await invoke('save_board_file', {
            root: props.workspaceRoot,
            path: props.board.path,
            content: nextContent,
        })
    } catch (error) {
        includeSubBoards.value = !nextValue
        console.error('Failed to save board settings', error)
    } finally {
        isSavingPreference.value = false
    }
}

async function createCard() {
    if (!props.workspaceRoot || props.board.columns.length === 0) {
        return
    }

    const slug = getNextCardSlug(Object.keys(props.cardsBySlug))
    const title = 'Untitled Card'
    const targetColumn = props.board.columns[0]
    const cardContent = serializeCardMarkdown({
        title,
        metadata: { title },
        body: '',
    })
    const boardContent = addBoardCardMarkdown(props.board, {
        cardSlug: slug,
        targetColumnName: targetColumn.name,
        targetColumnSlug: targetColumn.slug,
    })

    try {
        await invoke('save_card_file', {
            root: props.workspaceRoot,
            path: `cards/${slug}.md`,
            content: cardContent,
        })
        await invoke('save_board_file', {
            root: props.workspaceRoot,
            path: props.board.path,
            content: boardContent,
        })
        emit('selectCard', slug)
    } catch (error) {
        console.error('Failed to create card', error)
    }
}

function getDisplayCardsForTarget(target: BoardPointerDropTarget) {
    const column = boardView.value.columns.find((entry) => entry.slug === target.columnSlug)
    if (!column) {
        return []
    }

    return column.cards
}

function handleSelectCard(slug: string) {
    if (drag.wasDragging()) {
        return
    }

    emit('selectCard', slug)
}

function getNextCardSlug(existingSlugs: string[]) {
    return getNextAvailableSlug(cardSlugFromTitle('Untitled Card'), existingSlugs)
}

watch(
    () => props.board.settings?.['show-sub-boards'],
    (value) => {
        includeSubBoards.value = value ?? true
    },
)
</script>

<template>
    <section class="board-canvas">
        <header class="board-canvas__header">
            <div>
                <h1 class="board-canvas__title">{{ board.title }}</h1>
            </div>

            <div class="board-canvas__meta">
                <button
                    class="board-canvas__toggle"
                    type="button"
                    @click="createCard"
                >
                    new card
                </button>
                <button
                    v-if="rollupBoardCount"
                    class="board-canvas__toggle"
                    type="button"
                    :disabled="isSavingPreference"
                    @click="toggleSubBoards"
                >
                    subboards {{ includeSubBoards ? "on" : "off" }}
                </button>
                <span>{{ boardView.columns.length }} columns</span>
                <span>{{ board.path }}</span>
            </div>
        </header>

        <div class="board-canvas__columns">
            <BoardColumn
                v-for="column in boardView.columns"
                :key="column.slug"
                :active-drag-item="drag.state.draggedItem"
                :active-drop-target="activeDropTarget"
                :cards-by-slug="cardsBySlug"
                :column="column"
                @pointer-down="drag.handlePointerDown"
                @pointer-move="drag.handlePointerMove"
                @pointer-up="drag.handlePointerUp"
                @select-card="handleSelectCard"
            />
        </div>
    </section>
</template>

<style scoped>
.board-canvas {
    height: 100%;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.board-canvas__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    padding: 0 0.25rem;
}

.board-canvas__eyebrow {
    color: var(--shade-4);
    font-size: 0.68rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
}

.board-canvas__title {
    margin: 0.2rem 0 0;
    font-size: 1.35rem;
    font-weight: 600;
}

.board-canvas__meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-end;
    gap: 0.75rem;
    color: var(--shade-4);
    font-size: 0.74rem;
}

.board-canvas__toggle {
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--shade-3);
    background: var(--shade-2);
    color: var(--shade-5);
    font: inherit;
    font-size: 0.72rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.board-canvas__toggle:hover {
    border-color: var(--shade-5);
    background: var(--shade-3);
}

.board-canvas__columns {
    flex: 1;
    min-height: 0;
    display: flex;
    align-items: stretch;
    gap: 1rem;
    overflow-x: auto;
    overflow-y: hidden;
    padding: 0.25rem;
}

.board-canvas__subboards {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
}

.board-canvas__subboard {
    padding: 0.7rem 0.9rem;
    border: 1px solid var(--shade-3);
    background: var(--shade-2);
    color: var(--shade-5);
    font: inherit;
}

.board-canvas__subboard:hover {
    border-color: var(--shade-5);
    background: var(--shade-3);
}

@media (max-width: 900px) {
    .board-canvas__header {
        flex-direction: column;
    }

    .board-canvas__meta {
        justify-content: flex-start;
    }
}
</style>
