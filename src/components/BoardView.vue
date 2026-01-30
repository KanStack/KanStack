<template>
    <div v-if="activeBoard" class="h-full flex flex-col">
        <!-- Board Header -->
        <div
            class="h-10 border-b border-border-subtle flex items-center px-4 justify-between"
        >
            <h2 class="text-base">{{ activeBoard.name }}</h2>
        </div>

        <!-- Columns Container -->
        <div class="flex-1 overflow-x-auto overflow-y-hidden">
            <div class="flex h-full p-4 gap-4 min-w-max">
                <div
                    v-for="column in sortedColumns"
                    :key="column.id"
                    :ref="
                        (el) =>
                            drag.registerColumn(column.id, el as HTMLElement)
                    "
                    class="w-80 flex flex-col bg-bg-secondary border border-border-subtle transition-colors"
                    :class="{
                        'border-text-primary':
                            drag.state.dragOverColumnId === column.id,
                    }"
                >
                    <!-- Column Header -->
                    <div
                        class="p-3 border-b border-border-subtle flex items-center justify-between"
                        :class="{
                            'bg-bg-tertiary':
                                drag.state.dragOverColumnId === column.id,
                        }"
                    >
                        <h3 class="text-sm font-medium">{{ column.name }}</h3>
                        <span class="text-text-muted text-xs">{{
                            getColumnCards(column.id).length
                        }}</span>
                    </div>

                    <!-- Cards Container -->
                    <div class="flex-1 overflow-y-auto p-2 space-y-2">
                        <div
                            v-for="card in getColumnCards(column.id)"
                            :key="card.id"
                            class="bg-bg-tertiary border border-border-subtle p-3 cursor-grab hover:border-border-visible transition-colors select-none"
                            :class="{
                                'opacity-50':
                                    drag.state.isDragging &&
                                    drag.state.draggedItem?.cardId === card.id,
                            }"
                            @pointerdown="
                                drag.handlePointerDown(
                                    {
                                        cardId: card.id,
                                        sourceColumnId: card.column_id,
                                    },
                                    $event,
                                )
                            "
                            @pointermove="drag.handlePointerMove($event)"
                            @pointerup="drag.handlePointerUp($event)"
                            @click="onCardClick(card)"
                        >
                            <div class="flex items-start justify-between mb-2">
                                <h4 class="text-sm font-medium flex-1">
                                    {{ card.title }}
                                </h4>
                                <div
                                    v-if="card.priority > 0"
                                    class="text-xs text-text-muted ml-2"
                                >
                                    {{ "!".repeat(card.priority) }}
                                </div>
                            </div>

                            <!-- Card Meta -->
                            <div
                                class="flex items-center gap-2 text-xs text-text-muted"
                            >
                                <span
                                    v-if="card.due_date"
                                    :class="{
                                        'text-text-primary': isOverdue(
                                            card.due_date,
                                        ),
                                    }"
                                >
                                    {{ formatDate(card.due_date) }}
                                </span>
                                <span v-if="card.checklist.length > 0">
                                    [{{
                                        card.checklist.filter((i) => i.checked)
                                            .length
                                    }}/{{ card.checklist.length }}]
                                </span>
                                <span
                                    v-if="card.tags.length > 0"
                                    class="flex gap-1"
                                >
                                    <span
                                        v-for="tag in card.tags.slice(0, 2)"
                                        :key="tag"
                                        class="px-1 border border-border-subtle"
                                    >
                                        {{ tag }}
                                    </span>
                                </span>
                            </div>
                        </div>

                        <!-- Add Card Button -->
                        <button
                            v-if="!readonly"
                            class="w-full py-2 text-text-muted hover:text-text-primary text-xs border border-dashed border-border-subtle hover:border-border-visible transition-colors"
                            @click="createCardInColumn(column.id)"
                        >
                            + Add Card
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Card Detail Modal -->
        <CardModal
            v-if="selectedCard"
            :card="selectedCard"
            :board="activeBoard"
            @close="selectedCard = null"
            @save="saveCard"
            @archive="archiveCard"
        />

        <!-- New Card Modal -->
        <div
            v-if="showNewCardModal"
            class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            @click.self="showNewCardModal = false"
        >
            <div class="bg-bg-secondary border border-border-subtle p-6 w-96">
                <h3 class="text-lg mb-4">New Card</h3>
                <input
                    v-model="newCardTitle"
                    type="text"
                    placeholder="Card title..."
                    class="terminal-input w-full mb-4"
                    @keyup.enter="confirmCreateCard"
                />
                <div class="flex justify-end gap-2">
                    <button
                        class="terminal-btn"
                        @click="showNewCardModal = false"
                    >
                        Cancel
                    </button>
                    <button
                        class="terminal-btn"
                        @click="confirmCreateCard"
                        :disabled="!newCardTitle"
                    >
                        Create
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useProjectStore } from "@/stores/project";
import { useDragDrop } from "@/composables/useDragDrop";
import CardModal from "./CardModal.vue";
import type { Board, Card } from "@/types";

const props = defineProps<{
    /** Provide an external board to display instead of the store's currentBoard */
    board?: Board;
    /** When true, hides add-card buttons (used for summary view) */
    readonly?: boolean;
}>();

const emit = defineEmits<{
    /** Fired when a card is moved via drag. If not handled, falls through to the store. */
    moveCard: [boardId: string, cardId: string, targetColumnId: string];
    /** Fired when a card is saved via the modal. If not handled, falls through to the store. */
    saveCard: [boardId: string, card: Card];
    /** Fired when a card is archived via the modal. If not handled, falls through to the store. */
    archiveCard: [boardId: string, cardId: string];
}>();

const projectStore = useProjectStore();

const activeBoard = computed<Board | null>(() => {
    return props.board ?? projectStore.currentBoard;
});

const isExternalBoard = computed(() => !!props.board);

const drag = useDragDrop(async (item, targetColumnId) => {
    if (!activeBoard.value) return;
    console.log(
        "[BoardView] onDrop:",
        activeBoard.value.id,
        item.cardId,
        "→",
        targetColumnId,
    );

    if (isExternalBoard.value) {
        emit("moveCard", activeBoard.value.id, item.cardId, targetColumnId);
    } else {
        await projectStore.moveCard(
            activeBoard.value.id,
            item.cardId,
            targetColumnId,
        );
    }
});

const sortedColumns = computed(() => {
    if (!activeBoard.value) return [];
    return [...activeBoard.value.columns].sort((a, b) =>
        a.order.localeCompare(b.order),
    );
});

const selectedCard = ref<Card | null>(null);
const showNewCardModal = ref(false);
const newCardTitle = ref("");
const newCardColumnId = ref("");

function getColumnCards(columnId: string): Card[] {
    if (!activeBoard.value) return [];
    return activeBoard.value.cards
        .filter((c) => c.column_id === columnId && !c.archived)
        .sort((a, b) => a.order.localeCompare(b.order));
}

function onCardClick(card: Card) {
    if (drag.wasDragging()) return;
    selectedCard.value = card;
}

function createCardInFirstColumn() {
    if (!activeBoard.value || sortedColumns.value.length === 0) return;
    createCardInColumn(sortedColumns.value[0].id);
}

function createCardInColumn(columnId: string) {
    newCardTitle.value = "";
    newCardColumnId.value = columnId;
    showNewCardModal.value = true;
}

async function confirmCreateCard() {
    if (!newCardTitle.value || !activeBoard.value || !newCardColumnId.value)
        return;

    await projectStore.createCard(
        activeBoard.value.id,
        newCardColumnId.value,
        newCardTitle.value,
    );
    showNewCardModal.value = false;
    newCardTitle.value = "";
    newCardColumnId.value = "";
}

async function saveCard(card: Card) {
    if (!activeBoard.value) return;

    if (isExternalBoard.value) {
        emit("saveCard", activeBoard.value.id, card);
    } else {
        await projectStore.updateCard(activeBoard.value.id, card.id, card);
    }
    selectedCard.value = null;
}

async function archiveCard(cardId: string) {
    if (!activeBoard.value) return;

    if (isExternalBoard.value) {
        emit("archiveCard", activeBoard.value.id, cardId);
    } else {
        await projectStore.archiveCard(activeBoard.value.id, cardId);
    }
    selectedCard.value = null;
}

function isOverdue(dueDate: string): boolean {
    return new Date(dueDate) < new Date();
}

function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-NZ", { day: "numeric", month: "short" });
}
</script>
