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
import type { BoardViewPreferences } from "@/types/appConfig";
import {
    SHOW_ARCHIVE_COLUMN_SETTING,
    isArchiveColumnSlug,
} from "@/utils/archiveColumn";
import { applyBoardViewPreferences } from "@/utils/boardViewPreferences";
import { isCardReorderEnabled as isGlobalCardReorderEnabled } from "@/utils/appConfig";
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
import BoardViewControls from "./BoardViewControls.vue";

const props = defineProps<{
    board: KanbanBoardDocument;
    boardsBySlug: Record<string, KanbanBoardDocument>;
    boardFilesBySlug: Record<string, { content: string; path: string }>;
    cardsBySlug: Record<string, KanbanCardDocument>;
    selectedColumnSlug: string | null;
    selectedCardKeys: string[];
    viewPreferences: BoardViewPreferences;
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
    clearSelections: [];
    moveCard: [
        payload: {
            cardSlug: string;
            sourceBoardSlug: string;
            targetColumnName: string;
            targetColumnSlug: string;
            targetSectionName: string | null;
            targetSectionSlug: string | null;
            targetIndex: number;
        },
    ];
    openCard: [selection: WorkspaceCardSelection];
    reorderColumns: [payload: { draggedSlug: string; targetIndex: number }];
    renameBoard: [title: string];
    renameColumn: [payload: { name: string; slug: string }];
    selectColumn: [slug: string];
    toggleArchiveColumn: [];
    toggleSubBoards: [];
    updateViewPreferences: [preferences: BoardViewPreferences];
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
    applyBoardViewPreferences(
        buildBoardView(props.board, props.boardsBySlug, includeSubBoards.value),
        props.cardsBySlug,
        props.viewPreferences,
    ),
);
const cardReorderEnabled = computed(() =>
    isGlobalCardReorderEnabled(props.viewPreferences),
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
    () =>
        visibleColumns.value.find((column) =>
            isArchiveColumnSlug(column.slug),
        ) ?? null,
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
        target.closest(".board-canvas__toggle") ||
        target.closest(".board-canvas__title-button") ||
        target.closest(".board-canvas__title-input")
    ) {
        return;
    }

    emit("clearSelections");
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
    <section
        ref="boardCanvasEl"
        class="h-full min-h-0 flex flex-col gap-4"
        @click="handleCanvasClick"
    >
        <header class="flex items-start justify-between gap-4 px-4 py-2 max-[900px]:flex-col">
            <div>
                <button
                    v-if="!isEditingTitle"
                    class="btn-plain text-left"
                    type="button"
                    @click="startBoardTitleEdit"
                >
                    <h1 class="mt-1 mb-0 text-xl font-semibold">{{ board.title }}</h1>
                </button>
                <input
                    v-else
                    ref="boardTitleInput"
                    v-model="boardTitleDraft"
                    class="w-[min(28rem,80vw)] mt-1 mb-0 btn-plain border-b border-text-muted text-xl font-semibold"
                    type="text"
                    :disabled="isRenamingBoard"
                    @blur="handleBoardTitleBlur"
                    @keydown="handleBoardTitleKeydown"
                />
            </div>

            <BoardViewControls
                :cards-by-slug="cardsBySlug"
                :preferences="viewPreferences"
                :rollup-board-count="rollupBoardCount"
                :include-sub-boards="includeSubBoards"
                :show-archive-column="showArchiveColumn"
                @update-preferences="emit('updateViewPreferences', $event)"
                @toggle-sub-boards="emit('toggleSubBoards')"
                @toggle-archive-column="emit('toggleArchiveColumn')"
            />
        </header>

        <div class="flex-1 min-h-0 flex items-stretch gap-0 overflow-x-auto overflow-y-hidden p-1">
            <template
                v-for="(column, index) in movableColumns"
                :key="column.slug"
            >
                <div
                    class="w-4 shrink-0 flex items-stretch justify-center"
                    :data-column-drop-index="index"
                >
                    <div class="w-0.5 rounded-full" :class="columnDrag.state.insertIndex === index ? 'bg-text' : 'bg-transparent'"></div>
                </div>

                <div
                    class="flex"
                    data-column-reorder-item="true"
                    :data-column-index="index"
                >
                    <BoardColumn
                        :active-drag-item="drag.state.draggedItem"
                        :active-drop-target="activeDropTarget"
                        :cards-by-slug="cardsBySlug"
                        :card-reorder-enabled="cardReorderEnabled"
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
                class="w-4 shrink-0 flex items-stretch justify-center"
                :data-column-drop-index="movableColumns.length"
            >
                <div class="w-0.5 rounded-full" :class="columnDrag.state.insertIndex === movableColumns.length ? 'bg-text' : 'bg-transparent'"></div>
            </div>

            <div
                v-if="archiveColumn"
                class="flex"
                data-column-reorder-item="true"
                :data-column-index="movableColumns.length"
            >
                <BoardColumn
                    :active-drag-item="drag.state.draggedItem"
                    :active-drop-target="activeDropTarget"
                    :cards-by-slug="cardsBySlug"
                    :card-reorder-enabled="cardReorderEnabled"
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


