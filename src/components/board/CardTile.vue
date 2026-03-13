<script setup lang="ts">
import { computed } from "vue";

import type { KanbanCardDocument } from "@docs/schemas/kanban-parser-schema";
import type { BoardViewCardLink } from "@/utils/buildBoardView";

const props = defineProps<{
    card: KanbanCardDocument | null;
    item: BoardViewCardLink;
    selected: boolean;
}>();

const emit = defineEmits<{
    pointerDown: [{ item: BoardViewCardLink; event: PointerEvent }];
    pointerMove: [event: PointerEvent];
    pointerUp: [event: PointerEvent];
    activate: [payload: { metaKey: boolean; shiftKey: boolean; selection: { slug: string; sourceBoardSlug: string } }];
    open: [selection: { slug: string; sourceBoardSlug: string }];
}>();

function handlePointerDown(event: PointerEvent) {
    emit("pointerDown", { item: props.item, event });
}

function buildSelection() {
    return { slug: props.item.slug, sourceBoardSlug: props.item.sourceBoardSlug };
}

function handleClick(event: MouseEvent) {
    (event.currentTarget as HTMLButtonElement | null)?.blur();
    emit("activate", {
        metaKey: event.metaKey || event.ctrlKey,
        shiftKey: event.shiftKey,
        selection: buildSelection(),
    });
}

function handleDoubleClick(event: MouseEvent) {
    (event.currentTarget as HTMLButtonElement | null)?.blur();
    emit("open", buildSelection());
}

const preview = computed(() => {
    if (!props.card) {
        return "Missing card file";
    }

    const line = props.card.body
        .split(/\r?\n/)
        .map((entry) => entry.trim())
        .find((entry) => entry && !entry.startsWith("#"));

    return line ?? "No details yet";
});

const dueLabel = computed(() => {
    if (!props.card || typeof props.card.metadata.due !== "string") {
        return null;
    }

    const raw = props.card.metadata.due.trim();
    if (!raw) {
        return null;
    }

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
        return `Due ${raw}`;
    }

    const dateLabel = new Intl.DateTimeFormat(undefined, {
        day: "numeric",
        month: "short",
    }).format(parsed);
    const timeLabel = new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit",
    }).format(parsed).toLowerCase();

    return `Due ${dateLabel} ${timeLabel}`;
});

const badges = computed(() => {
    if (!props.card) {
        return [];
    }

    const metadata = props.card.metadata;
    return [metadata.priority, metadata.type, metadata.assignee]
        .filter(
            (value): value is string =>
                typeof value === "string" && value.length > 0,
        )
        .slice(0, 3);
});
</script>

<template>
    <button
        class="card-tile"
        :class="{ 'card-tile--selected': selected }"
        :data-card-key="`${item.sourceBoardSlug}:${item.slug}`"
        type="button"
        @click="handleClick"
        @dblclick="handleDoubleClick"
        @pointerdown="handlePointerDown"
        @pointermove="emit('pointerMove', $event)"
        @pointerup="emit('pointerUp', $event)"
    >
        <div v-if="item.isRolledUp || dueLabel" class="card-tile__topline">
            <span v-if="item.isRolledUp" class="card-tile__source">{{ item.sourceBoardTitle ?? item.sourceBoardSlug }}</span>
            <span v-if="dueLabel" class="card-tile__due">{{ dueLabel }}</span>
        </div>
        <div class="card-tile__title">{{ card?.title ?? item.slug }}</div>
        <div class="card-tile__preview">{{ preview }}</div>

        <div v-if="badges.length" class="card-tile__badges">
            <span
                v-for="badge in badges"
                :key="badge"
                class="card-tile__badge"
                >{{ badge }}</span
            >
        </div>
    </button>
</template>

<style scoped>
.card-tile {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
    padding: 0.9rem;
    border: 1px solid var(--shade-3);
    background: linear-gradient(180deg, var(--shade-2), var(--shade-1));
    text-align: left;
}

.card-tile--selected {
    border-color: var(--shade-5);
    box-shadow: inset 0 0 0 1px var(--shade-5);
    background: linear-gradient(180deg, var(--shade-3), var(--shade-2));
}

.card-tile__topline {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.6rem;
    color: var(--shade-4);
    font-size: 0.68rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.card-tile__source {
    flex-shrink: 0;
    padding: 0.18rem 0.36rem;
    border: 1px solid var(--shade-3);
    color: var(--shade-5);
    background: var(--shade-1);
}

.card-tile__due {
    padding: 0.18rem 0.36rem;
    border: 1px solid rgba(255, 204, 128, 0.35);
    color: #ffd59a;
    background: rgba(77, 49, 18, 0.22);
}

.card-tile__title {
    color: var(--shade-5);
    font-size: 0.92rem;
    line-height: 1.45;
}

.card-tile__preview {
    color: var(--shade-4);
    font-size: 0.78rem;
    line-height: 1.5;
}

.card-tile__badges {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
}

.card-tile__badge {
    padding: 0.22rem 0.42rem;
    border: 1px solid var(--shade-3);
    color: var(--shade-5);
    font-size: 0.68rem;
    text-transform: uppercase;
}
</style>
