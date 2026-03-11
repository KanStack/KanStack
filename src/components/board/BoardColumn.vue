<script setup lang="ts">
import { computed } from "vue";

import type { KanbanCardDocument } from "@docs/schemas/kanban-parser-schema";
import type {
    BoardViewCardLink,
    BoardViewColumn,
} from "@/utils/buildBoardView";
import CardTile from "./CardTile.vue";

const props = defineProps<{
    activeDragItem: BoardViewCardLink | null;
    activeDropTarget: {
        columnSlug: string;
        displayIndex: number;
        sectionKey: string;
        surfaceId: string | null;
    } | null;
    cardsBySlug: Record<string, KanbanCardDocument>;
    column: BoardViewColumn;
}>();

const emit = defineEmits<{
    pointerDown: [item: BoardViewCardLink, event: PointerEvent];
    pointerMove: [event: PointerEvent];
    pointerUp: [event: PointerEvent];
    selectCard: [slug: string];
}>();

const cardCount = computed(() => props.column.cards.length);

function isInsertionVisible(displayIndex: number) {
    if (
        props.activeDropTarget?.columnSlug !== props.column.slug ||
        props.activeDropTarget?.sectionKey !== "__default__" ||
        props.activeDropTarget.displayIndex !== displayIndex
    ) {
        return false;
    }

    if (!props.activeDragItem) {
        return true;
    }

    const currentIndex = props.column.cards.findIndex(
        (card) =>
            card.slug === props.activeDragItem?.slug &&
            card.sourceBoardSlug === props.activeDragItem?.sourceBoardSlug,
    );

    if (currentIndex === -1) {
        return true;
    }

    return displayIndex !== currentIndex && displayIndex !== currentIndex + 1;
}
</script>

<template>
    <section class="board-column">
        <header class="board-column__header">
            <div>
                <div class="board-column__label">{{ column.name }}</div>
                <div class="board-column__count">{{ cardCount }} cards</div>
            </div>
        </header>

        <div class="board-column__body">
            <div
                v-if="cardCount > 0"
                class="board-column__cards board-column__cards--fill"
                :data-column-name="column.name"
                :data-column-slug="column.slug"
                data-drop-surface-id="column"
                data-drop-section-key="__default__"
                data-section-name="__default__"
                data-section-slug="__default__"
            >
                <div
                    v-if="isInsertionVisible(0)"
                    class="board-column__insertion-line"
                ></div>
                <div
                    v-for="(cardLink, cardIndex) in column.cards"
                    :key="`${column.slug}-${cardLink.slug}-${cardLink.sourceBoardSlug}-${cardIndex}`"
                    class="board-column__card-slot"
                    data-card-slot="true"
                >
                    <CardTile
                        :card="cardsBySlug[cardLink.slug] ?? null"
                        :item="cardLink"
                        @pointer-down="
                            emit('pointerDown', $event.item, $event.event)
                        "
                        @pointer-move="emit('pointerMove', $event)"
                        @pointer-up="emit('pointerUp', $event)"
                        @select="emit('selectCard', $event)"
                    />
                    <div
                        v-if="isInsertionVisible(cardIndex + 1)"
                        class="board-column__insertion-line"
                    ></div>
                </div>
            </div>

            <div v-else class="board-column__empty-area">
                <div
                    class="board-column__empty-drop-surface"
                    :data-column-name="column.name"
                    :data-column-slug="column.slug"
                    data-drop-surface-id="column"
                    data-drop-section-key="__default__"
                    data-section-name="__default__"
                    data-section-slug="__default__"
                >
                    <div
                        v-if="isInsertionVisible(0)"
                        class="board-column__insertion-line board-column__insertion-line--empty"
                    ></div>
                </div>
                <div v-if="!isInsertionVisible(0)" class="board-column__empty">
                    <span>No cards yet.</span>
                </div>
            </div>
        </div>
    </section>
</template>

<style scoped>
.board-column {
    width: min(20rem, 84vw);
    min-width: min(20rem, 84vw);
    min-height: 0;
    display: flex;
    flex-direction: column;
    border: 1px solid var(--shade-3);
    background: rgba(20, 20, 20, 0.9);
}

.board-column__header {
    padding: 1rem;
    border-bottom: 1px solid var(--shade-3);
}

.board-column__label {
    font-size: 0.88rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
}

.board-column__count {
    margin-top: 0.2rem;
    color: var(--shade-4);
    font-size: 0.72rem;
}

.board-column__body {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    padding: 1rem;
}

.board-column__cards {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    min-height: 1.25rem;
    padding: 0.35rem 0;
}

.board-column__cards--fill {
    flex: 1;
    min-height: 5rem;
}

.board-column__card-slot {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.board-column__empty-area {
    position: relative;
    flex: 1;
    min-height: 6rem;
}

.board-column__empty-drop-surface {
    position: absolute;
    inset: 0;
}

.board-column__insertion-line {
    height: 0.8rem;
    min-height: 0.8rem;
    border: 1px dashed var(--shade-5);
    background: var(--shade-2);
}

.board-column__insertion-line--empty {
    min-height: 3rem;
}

.board-column__empty {
    position: relative;
    color: var(--shade-4);
    font-size: 0.78rem;
    border: 1px dashed var(--shade-3);
    padding: 0.9rem;
}
</style>
