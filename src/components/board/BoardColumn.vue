<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, shallowRef, watch } from "vue";

import type { KanbanCardDocument } from "@docs/schemas/kanban-parser-schema";
import type {
    BoardViewCardLink,
    BoardViewColumn,
    BoardViewSection,
} from "@/utils/buildBoardView";
import { DEFAULT_SECTION_KEY } from "@/utils/kanbanPath";
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
    renamingDisabled: boolean;
    selected: boolean;
    selectedCardKeys: string[];
}>();

const emit = defineEmits<{
    headerPointerDown: [slug: string, event: PointerEvent];
    headerPointerMove: [event: PointerEvent];
    headerPointerUp: [event: PointerEvent];
    pointerDown: [item: BoardViewCardLink, event: PointerEvent];
    pointerMove: [event: PointerEvent];
    pointerUp: [event: PointerEvent];
    activateCard: [payload: { metaKey: boolean; shiftKey: boolean; selection: { slug: string; sourceBoardSlug: string } }];
    openCard: [selection: { slug: string; sourceBoardSlug: string }];
    renameColumn: [payload: { name: string; slug: string }];
    selectColumn: [slug: string];
}>();

const columnNameDraft = shallowRef(props.column.name);
const columnNameInput = shallowRef<HTMLInputElement | null>(null);
const isEditingTitle = shallowRef(false);

const cardCount = computed(() => props.column.cards.length);
const sections = computed(() => {
    if (props.column.sections.length > 0) {
        return props.column.sections;
    }

    return [
        {
            name: null,
            slug: null,
            key: DEFAULT_SECTION_KEY,
            index: 0,
            cards: [],
        },
    ];
});

function isInsertionVisible(section: BoardViewSection, displayIndex: number) {
    if (
        props.activeDropTarget?.columnSlug !== props.column.slug ||
        props.activeDropTarget?.sectionKey !== section.key ||
        props.activeDropTarget.displayIndex !== displayIndex
    ) {
        return false;
    }

    if (!props.activeDragItem) {
        return true;
    }

    const currentIndex = section.cards.findIndex(
        (card) =>
            card.slug === props.activeDragItem?.slug &&
            card.sourceBoardSlug === props.activeDragItem?.sourceBoardSlug,
    );

    if (currentIndex === -1) {
        return true;
    }

    return displayIndex !== currentIndex && displayIndex !== currentIndex + 1;
}

function handleHeaderClick() {
    emit("selectColumn", props.column.slug);
}

async function handleLabelClick(event: MouseEvent) {
    (event.currentTarget as HTMLButtonElement | null)?.blur();
    if (!props.selected) {
        emit("selectColumn", props.column.slug);
        return;
    }

    await startRename();
}

async function startRename() {
    if (props.renamingDisabled) {
        return;
    }

    isEditingTitle.value = true;
    columnNameDraft.value = props.column.name;
    await nextTick();
    columnNameInput.value?.focus();
    columnNameInput.value?.select();
}

function cancelRename() {
    columnNameDraft.value = props.column.name;
    isEditingTitle.value = false;
}

function commitRename() {
    const name = columnNameDraft.value.trim();
    if (!name) {
        cancelRename();
        return;
    }

    isEditingTitle.value = false;
    emit("renameColumn", { name, slug: props.column.slug });
}

function handleTitleKeydown(event: KeyboardEvent) {
    if (event.key === "Enter") {
        event.preventDefault();
        commitRename();
    }

    if (event.key === "Escape") {
        event.preventDefault();
        cancelRename();
    }
}

function handleRenameRequest(event: Event) {
    const detail = (event as CustomEvent<{ slug?: string }>).detail;
    if (!props.selected || detail?.slug !== props.column.slug) {
        return;
    }

    void startRename();
}

watch(
    () => props.selected,
    (value) => {
        if (!value) {
            cancelRename();
        }
    },
);

watch(
    () => props.column.name,
    (value) => {
        if (!isEditingTitle.value) {
            columnNameDraft.value = value;
        }
    },
);

onMounted(() => {
    window.addEventListener(
        "kanstack:request-rename-column",
        handleRenameRequest as EventListener,
    );
});

onUnmounted(() => {
    window.removeEventListener(
        "kanstack:request-rename-column",
        handleRenameRequest as EventListener,
    );
});
</script>

<template>
    <section class="board-column" :class="{ 'board-column--selected': selected }">
        <header
            class="board-column__header"
            @click="handleHeaderClick"
            @pointerdown="emit('headerPointerDown', column.slug, $event)"
            @pointermove="emit('headerPointerMove', $event)"
            @pointerup="emit('headerPointerUp', $event)"
        >
            <div>
                <button v-if="!isEditingTitle" class="board-column__label" type="button" @click.stop="handleLabelClick">
                    {{ column.name }}
                </button>
                <input
                    v-else
                    ref="columnNameInput"
                    v-model="columnNameDraft"
                    class="board-column__label-input"
                    type="text"
                    :disabled="renamingDisabled"
                    @blur="commitRename"
                    @keydown="handleTitleKeydown"
                />
                <div class="board-column__count">{{ cardCount }} cards</div>
            </div>
        </header>

        <div class="board-column__body">
            <div class="board-column__sections">
                <section
                    v-for="section in sections"
                    :key="`${column.slug}-${section.key}`"
                    class="board-column__section"
                >
                    <div
                        v-if="section.name"
                        class="board-column__section-label"
                    >
                        {{ section.name }}
                    </div>

                    <div
                        class="board-column__drop-surface"
                        :class="{
                            'board-column__drop-surface--empty':
                                section.cards.length === 0,
                        }"
                        :data-column-name="column.name"
                        :data-column-slug="column.slug"
                        :data-drop-surface-id="section.key"
                        :data-drop-section-key="section.key"
                        :data-section-name="section.name ?? DEFAULT_SECTION_KEY"
                        :data-section-slug="section.slug ?? DEFAULT_SECTION_KEY"
                    >
                        <div
                            v-if="isInsertionVisible(section, 0)"
                            class="board-column__insertion-line"
                        ></div>

                        <template v-if="section.cards.length > 0">
                            <div
                                v-for="(cardLink, cardIndex) in section.cards"
                                :key="`${column.slug}-${section.key}-${cardLink.slug}-${cardLink.sourceBoardSlug}-${cardIndex}`"
                                class="board-column__card-slot"
                                data-card-slot="true"
                            >
                                <CardTile
                                    :card="cardsBySlug[cardLink.slug] ?? null"
                                    :item="cardLink"
                                    :selected="selectedCardKeys.includes(`${cardLink.sourceBoardSlug}:${cardLink.slug}`)"
                                    @pointer-down="
                                        emit(
                                            'pointerDown',
                                            $event.item,
                                            $event.event,
                                        )
                                    "
                                    @pointer-move="emit('pointerMove', $event)"
                                    @pointer-up="emit('pointerUp', $event)"
                                    @activate="emit('activateCard', $event)"
                                    @open="emit('openCard', $event)"
                                />
                                <div
                                    v-if="
                                        isInsertionVisible(
                                            section,
                                            cardIndex + 1,
                                        )
                                    "
                                    class="board-column__insertion-line"
                                ></div>
                            </div>
                        </template>

                        <div
                            v-else-if="
                                !section.name && !isInsertionVisible(section, 0)
                            "
                            class="board-column__empty"
                        >
                            <span>No cards yet.</span>
                        </div>
                    </div>
                </section>
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

.board-column--selected {
    border-color: var(--shade-5);
}

.board-column__header {
    padding: 1rem;
    border-bottom: 1px solid var(--shade-3);
}

.board-column__label {
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    font-size: 0.88rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    cursor: pointer;
}

.board-column__label-input {
    width: 100%;
    padding: 0;
    border: 0;
    border-bottom: 1px solid var(--shade-5);
    background: transparent;
    color: inherit;
    font: inherit;
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
    overflow-y: auto;
    padding: 1rem;
}

.board-column__sections {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    min-height: 100%;
}

.board-column__section {
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
}

.board-column__section:last-child {
    flex: 1;
    min-height: 0;
}

.board-column__section-label {
    color: var(--shade-4);
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
}

.board-column__drop-surface {
    display: flex;
    flex-direction: column;
    flex: 1;
    gap: 0.75rem;
    min-height: 1.25rem;
    padding: 0.35rem 0;
}

.board-column__drop-surface--empty {
    min-height: 5rem;
}

.board-column__card-slot {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.board-column__insertion-line {
    height: 0.8rem;
    min-height: 0.8rem;
    border: 1px dashed var(--shade-5);
    background: var(--shade-2);
}

.board-column__empty {
    color: var(--shade-4);
    font-size: 0.78rem;
    border: 1px dashed var(--shade-3);
    padding: 0.9rem;
}
</style>
