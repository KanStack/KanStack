<script setup lang="ts">
import {
    computed,
    nextTick,
    onMounted,
    onUnmounted,
    shallowRef,
    watch,
} from "vue";

import type {
    KanbanBoardDocument,
    KanbanCardDocument,
} from "@docs/schemas/kanban-parser-schema";
import {
    SHOW_ARCHIVE_COLUMN_SETTING,
    isArchiveColumnSlug,
} from "@/utils/archiveColumn";
import { useBoardColumnDrag } from "@/composables/useBoardColumnDrag";
import {
    useBoardPointerDrag,
    type BoardPointerDropTarget,
} from "@/composables/useBoardPointerDrag";
import type {
    VisibleBoardCardSelection,
    WorkspaceCardSelection,
} from "@/types/workspace";
import { buildBoardView } from "@/utils/buildBoardView";

import BoardColumn from "./BoardColumn.vue";

const props = defineProps<{
    board: KanbanBoardDocument;
    boardsBySlug: Record<string, KanbanBoardDocument>;
    boardFilesBySlug: Record<string, { content: string; path: string }>;
    cardsBySlug: Record<string, KanbanCardDocument>;
    selectedColumnSlug: string | null;
    selectedCardKeys: string[];
    workspaceRoot: string | null;
}>();

const emit = defineEmits<{
    activateCard: [
        payload: {
            metaKey: boolean;
            shiftKey: boolean;
            selection: WorkspaceCardSelection;
        },
    ];
    addColumn: [];
    clearSelections: [];
    createCard: [];
    moveCard: [payload: {
        cardSlug: string;
        sourceBoardSlug: string;
        targetColumnName: string;
        targetColumnSlug: string;
        targetSectionName: string | null;
        targetSectionSlug: string | null;
        targetIndex: number;
    }];
    openCard: [selection: WorkspaceCardSelection];
    reorderColumns: [payload: { draggedSlug: string; targetIndex: number }];
    renameBoard: [title: string];
    renameColumn: [payload: { name: string; slug: string }];
    selectColumn: [slug: string];
    toggleArchiveColumn: [];
    toggleSubBoards: [];
    updateVisibleCards: [cards: VisibleBoardCardSelection[]];
}>();

const includeSubBoards = shallowRef(
    props.board.settings?.["show-sub-boards"] ?? true,
);
const showArchiveColumn = shallowRef(
    props.board.settings?.[SHOW_ARCHIVE_COLUMN_SETTING] ?? false,
);
const isEditingTitle = shallowRef(false);
const boardTitleDraft = shallowRef(props.board.title);
const boardTitleInput = shallowRef<HTMLInputElement | null>(null);
const boardCanvasEl = shallowRef<HTMLElement | null>(null);
const isRenamingBoard = shallowRef(false);

const boardView = computed(() =>
    buildBoardView(props.board, props.boardsBySlug, includeSubBoards.value),
);
const visibleColumns = computed(() =>
    showArchiveColumn.value
        ? boardView.value.columns
        : boardView.value.columns.filter(
              (column) => !isArchiveColumnSlug(column.slug),
            ),
);
const movableColumns = computed(() =>
    visibleColumns.value.filter((column) => !isArchiveColumnSlug(column.slug)),
);
const archiveColumn = computed(
    () => visibleColumns.value.find((column) => isArchiveColumnSlug(column.slug)) ?? null,
);
const activeDropTarget = computed(() => {
    if (
        drag.state.insertColumnSlug === null ||
        drag.state.insertSectionKey === null ||
        drag.state.insertDisplayIndex === null
    ) {
        return null;
    }

    return {
        columnSlug: drag.state.insertColumnSlug,
        sectionKey: drag.state.insertSectionKey,
        displayIndex: drag.state.insertDisplayIndex,
        surfaceId: drag.state.insertSurfaceId,
    };
});
const rollupBoardCount = computed(
    () =>
        buildBoardView(props.board, props.boardsBySlug, true)
            .descendantBoardCount,
);
const columnDrag = useBoardColumnDrag(async (draggedSlug, targetIndex) => {
    emit("reorderColumns", { draggedSlug, targetIndex });
});

const drag = useBoardPointerDrag(async (item, target) => {
    const displayCards = getDisplayCardsForTarget(target);
    const targetIndex = displayCards
        .slice(0, target.displayIndex)
        .filter(
            (card) =>
                card.sourceBoardSlug === item.sourceBoardSlug &&
                card.slug !== item.slug,
        ).length;

    emit("moveCard", {
        cardSlug: item.slug,
        sourceBoardSlug: item.sourceBoardSlug,
        targetColumnName: target.columnName,
        targetColumnSlug: target.columnSlug,
        targetSectionName: target.sectionName,
        targetSectionSlug: target.sectionSlug,
        targetIndex,
    });
});

async function startBoardTitleEdit() {
    boardTitleDraft.value = props.board.title;
    isEditingTitle.value = true;
    await nextTick();
    boardTitleInput.value?.focus();
    boardTitleInput.value?.select();
}

function cancelBoardTitleEdit() {
    boardTitleDraft.value = props.board.title;
    isEditingTitle.value = false;
}

function handleCancelBoardRename() {
    if (!isEditingTitle.value) {
        return;
    }

    cancelBoardTitleEdit();
}

async function saveBoardTitle() {
    const normalizedTitle = boardTitleDraft.value.trim();
    if (!normalizedTitle) {
        boardTitleDraft.value = props.board.title;
        isEditingTitle.value = false;
        return;
    }

    isRenamingBoard.value = true;
    try {
        isEditingTitle.value = false;
        emit("renameBoard", normalizedTitle);
    } finally {
        isRenamingBoard.value = false;
    }
}

async function handleBoardTitleBlur() {
    await saveBoardTitle();
}

async function handleBoardTitleKeydown(event: KeyboardEvent) {
    if (event.key === "Enter") {
        event.preventDefault();
        await saveBoardTitle();
    }

    if (event.key === "Escape") {
        event.preventDefault();
        cancelBoardTitleEdit();
    }
}

function getDisplayCardsForTarget(target: BoardPointerDropTarget) {
    const column = boardView.value.columns.find(
        (entry) => entry.slug === target.columnSlug,
    );
    if (!column) {
        return [];
    }

    const section = column.sections.find(
        (entry) => entry.key === target.sectionKey,
    );
    return section?.cards ?? [];
}

function handleActivateCard(payload: {
    metaKey: boolean;
    shiftKey: boolean;
    selection: WorkspaceCardSelection;
}) {
    if (drag.wasDragging()) {
        return;
    }

    emit("activateCard", payload);
}

function handleOpenCard(selection: WorkspaceCardSelection) {
    if (drag.wasDragging()) {
        return;
    }

    emit("openCard", selection);
}

function handleCanvasClick(event: MouseEvent) {
    const target = event.target as HTMLElement | null;
    if (!target) {
        return;
    }

    if (
        target.closest('[data-column-reorder-item="true"]') ||
        target.closest('.board-canvas__toggle') ||
        target.closest('.board-canvas__title-button') ||
        target.closest('.board-canvas__title-input')
    ) {
        return;
    }

    emit('clearSelections');
}

function scrollSelectionIntoView(cardKey: string | null) {
    if (!cardKey || !boardCanvasEl.value) {
        return;
    }

    const target = boardCanvasEl.value.querySelector<HTMLElement>(
        `[data-card-key="${cardKey}"]`,
    );
    target?.scrollIntoView({ block: "nearest", inline: "nearest" });
}

watch(
    () => props.board.settings?.["show-sub-boards"],
    (value) => {
        includeSubBoards.value = value ?? true;
    },
);

watch(
    () => props.board.settings?.[SHOW_ARCHIVE_COLUMN_SETTING],
    (value) => {
        showArchiveColumn.value = value ?? false;
    },
);

watch(
    () => props.board.title,
    (value) => {
        if (!isEditingTitle.value) {
            boardTitleDraft.value = value;
        }
    },
);

watch(
    visibleColumns,
    (columns) => {
        emit(
            "updateVisibleCards",
            columns.flatMap((column, columnIndex) =>
                column.cards.map((card, rowIndex) => ({
                    slug: card.slug,
                    sourceBoardSlug: card.sourceBoardSlug,
                    columnIndex,
                    rowIndex,
                })),
            ),
        );
    },
    { immediate: true },
);

watch(
    () => props.selectedCardKeys,
    (keys) => {
        const activeKey = keys[keys.length - 1] ?? null;
        void nextTick(() => {
            scrollSelectionIntoView(activeKey);
        });
    },
    { deep: true },
);

onMounted(() => {
    window.addEventListener(
        "kanstack:cancel-board-rename",
        handleCancelBoardRename as EventListener,
    );
});

onUnmounted(() => {
    window.removeEventListener(
        "kanstack:cancel-board-rename",
        handleCancelBoardRename as EventListener,
    );
});
</script>

<template>
    <section ref="boardCanvasEl" class="board-canvas" @click="handleCanvasClick">
        <header class="board-canvas__header">
            <div>
                <button
                    v-if="!isEditingTitle"
                    class="board-canvas__title-button"
                    type="button"
                    @click="startBoardTitleEdit"
                >
                    <h1 class="board-canvas__title">{{ board.title }}</h1>
                </button>
                <input
                    v-else
                    ref="boardTitleInput"
                    v-model="boardTitleDraft"
                    class="board-canvas__title-input"
                    type="text"
                    :disabled="isRenamingBoard"
                    @blur="handleBoardTitleBlur"
                    @keydown="handleBoardTitleKeydown"
                />
            </div>

            <div class="board-canvas__meta">
                <button
                    class="board-canvas__toggle"
                    type="button"
                    @click="emit('addColumn')"
                >
                    + column
                </button>
                <button
                    class="board-canvas__toggle"
                    type="button"
                    @click="emit('createCard')"
                >
                    new card
                </button>
                <button
                    v-if="rollupBoardCount"
                    class="board-canvas__toggle"
                    type="button"
                    @click="emit('toggleSubBoards')"
                >
                    subboards {{ includeSubBoards ? "on" : "off" }}
                </button>
                <button
                    class="board-canvas__toggle"
                    type="button"
                    @click="emit('toggleArchiveColumn')"
                >
                    archive {{ showArchiveColumn ? "on" : "off" }}
                </button>
            </div>
        </header>

        <div class="board-canvas__columns">
            <template v-for="(column, index) in movableColumns" :key="column.slug">
                <div
                    class="board-canvas__column-insert-slot"
                    :class="{
                        'board-canvas__column-insert-slot--active':
                            columnDrag.state.insertIndex === index,
                    }"
                    :data-column-drop-index="index"
                >
                    <div class="board-canvas__column-insert-marker"></div>
                </div>

                <div
                    class="board-canvas__column-item"
                    data-column-reorder-item="true"
                    :data-column-index="index"
                >
                    <BoardColumn
                        :active-drag-item="drag.state.draggedItem"
                        :active-drop-target="activeDropTarget"
                        :cards-by-slug="cardsBySlug"
                        :column="column"
                        :renaming-disabled="column.slug === 'archive'"
                        :selected="selectedColumnSlug === column.slug"
                        :selected-card-keys="selectedCardKeys"
                        @header-pointer-down="columnDrag.handlePointerDown"
                        @header-pointer-move="columnDrag.handlePointerMove"
                        @header-pointer-up="columnDrag.handlePointerUp"
                        @pointer-down="drag.handlePointerDown"
                        @pointer-move="drag.handlePointerMove"
                        @pointer-up="drag.handlePointerUp"
                        @activate-card="handleActivateCard"
                        @open-card="handleOpenCard"
                        @rename-column="emit('renameColumn', $event)"
                        @select-column="emit('selectColumn', $event)"
                    />
                </div>
            </template>

            <div
                class="board-canvas__column-insert-slot"
                :class="{
                    'board-canvas__column-insert-slot--active':
                        columnDrag.state.insertIndex === movableColumns.length,
                }"
                :data-column-drop-index="movableColumns.length"
            >
                <div class="board-canvas__column-insert-marker"></div>
            </div>

            <div
                v-if="archiveColumn"
                class="board-canvas__column-item"
                data-column-reorder-item="true"
                :data-column-index="movableColumns.length"
            >
                <BoardColumn
                    :active-drag-item="drag.state.draggedItem"
                    :active-drop-target="activeDropTarget"
                    :cards-by-slug="cardsBySlug"
                    :column="archiveColumn"
                    :renaming-disabled="true"
                    :selected="selectedColumnSlug === archiveColumn.slug"
                    :selected-card-keys="selectedCardKeys"
                    @pointer-down="drag.handlePointerDown"
                    @pointer-move="drag.handlePointerMove"
                    @pointer-up="drag.handlePointerUp"
                    @activate-card="handleActivateCard"
                    @open-card="handleOpenCard"
                    @rename-column="emit('renameColumn', $event)"
                    @select-column="emit('selectColumn', $event)"
                />
            </div>
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

.board-canvas__title-button,
.board-canvas__title-input {
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
}

.board-canvas__title-button {
    text-align: left;
    cursor: text;
}

.board-canvas__title-input {
    width: min(28rem, 80vw);
    margin: 0.2rem 0 0;
    border-bottom: 1px solid var(--shade-4);
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
    gap: 0;
    overflow-x: auto;
    overflow-y: hidden;
    padding: 0.25rem;
}

.board-canvas__column-item {
    display: flex;
}

.board-canvas__column-insert-slot {
    width: 1rem;
    flex: 0 0 1rem;
    display: flex;
    align-items: stretch;
    justify-content: center;
}

.board-canvas__column-insert-marker {
    width: 2px;
    border-radius: 999px;
    background: transparent;
}

.board-canvas__column-insert-slot--active .board-canvas__column-insert-marker {
    background: var(--shade-5);
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
