<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, shallowRef, watch } from "vue";

import type { KanbanCardDocument } from "@docs/schemas/kanban-parser-schema";
import type {
    BoardViewCardLink,
    BoardViewColumn,
    BoardViewSection,
} from "@/utils/buildBoardView";
import { DEFAULT_SECTION_KEY } from "@/utils/kanbanPath";
import { shouldStartColumnHeaderDrag } from "./columnHeaderInteraction";
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
    cardReorderEnabled: boolean;
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

function handleHeaderPointerDown(event: PointerEvent) {
    if (!shouldStartColumnHeaderDrag(event.target)) {
        return;
    }

    emit("headerPointerDown", props.column.slug, event);
}

function handleCardPointerDown(item: BoardViewCardLink, event: PointerEvent) {
    if (!props.cardReorderEnabled) {
        return;
    }

    emit("pointerDown", item, event);
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
    <section class="w-[min(20rem,84vw)] min-w-[min(20rem,84vw)] min-h-0 flex flex-col border border-border/60 bg-surface/90" :class="{ 'border-text': selected }">
        <header
            class="p-4 border-b border-border/60"
            @click="handleHeaderClick"
            @pointerdown="handleHeaderPointerDown"
            @pointermove="emit('headerPointerMove', $event)"
            @pointerup="emit('headerPointerUp', $event)"
        >
            <div>
                <button
                    v-if="!isEditingTitle"
                    class="btn-plain column-header"
                    data-column-title-control="true"
                    type="button"
                    @click.stop="handleLabelClick"
                >
                    {{ column.name }}
                </button>
                <input
                    v-else
                    ref="columnNameInput"
                    v-model="columnNameDraft"
                    class="w-full btn-plain border-b border-text column-header"
                    data-column-title-control="true"
                    type="text"
                    :disabled="renamingDisabled"
                    @blur="commitRename"
                    @keydown="handleTitleKeydown"
                />
                <div class="mt-1 text-text-muted text-xs">{{ cardCount }} cards</div>
            </div>
        </header>

        <div class="flex-1 min-h-0 overflow-y-auto p-4">
            <div class="flex flex-col gap-4 min-h-full">
                <section
                    v-for="section in sections"
                    :key="`${column.slug}-${section.key}`"
                    class="flex flex-col gap-2"
                >
                    <div
                        v-if="section.name"
                        class="label"
                    >
                        {{ section.name }}
                    </div>

                    <div
                        class="flex flex-col flex-1 gap-3 py-1.5"
                        :class="{ 'min-h-20': section.cards.length === 0 }"
                        :data-column-name="column.name"
                        :data-column-slug="column.slug"
                        :data-drop-surface-id="section.key"
                        :data-drop-section-key="section.key"
                        :data-section-name="section.name ?? DEFAULT_SECTION_KEY"
                        :data-section-slug="section.slug ?? DEFAULT_SECTION_KEY"
                    >
                        <div
                            v-if="isInsertionVisible(section, 0)"
                            class="h-3.5 min-h-3.5 border border-dashed border-text bg-surface"
                        ></div>

                        <template v-if="section.cards.length > 0">
                            <div
                                v-for="(cardLink, cardIndex) in section.cards"
                                :key="`${column.slug}-${section.key}-${cardLink.slug}-${cardLink.sourceBoardSlug}-${cardIndex}`"
                                class="flex flex-col gap-3"
                                data-card-slot="true"
                            >
                                <CardTile
                                    :card="cardsBySlug[cardLink.slug] ?? null"
                                    :item="cardLink"
                                    :selected="selectedCardKeys.includes(`${cardLink.sourceBoardSlug}:${cardLink.slug}`)"
                                    @pointer-down="handleCardPointerDown($event.item, $event.event)"
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
                                    class="h-3.5 min-h-3.5 border border-dashed border-text bg-surface"
                                ></div>
                            </div>
                        </template>

                        <div
                            v-else-if="
                                !section.name && !isInsertionVisible(section, 0)
                            "
                            class="text-text-muted text-sm border border-dashed border-border/60 p-3.5"
                        >
                            <span>No cards yet.</span>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    </section>
</template>


