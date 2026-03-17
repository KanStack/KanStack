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
        class="w-full flex flex-col gap-2 p-3.5 border border-border/60 bg-gradient-to-b from-surface to-surface-1 text-left"
        :class="{ 'selected-ring': selected }"
        :data-card-key="`${item.sourceBoardSlug}:${item.slug}`"
        type="button"
        @click="handleClick"
        @dblclick="handleDoubleClick"
        @pointerdown="handlePointerDown"
        @pointermove="emit('pointerMove', $event)"
        @pointerup="emit('pointerUp', $event)"
    >
        <div v-if="item.isRolledUp || dueLabel" class="flex items-center justify-between flex-wrap gap-2.5 text-text-muted text-xs tracking-wider uppercase">
            <span v-if="item.isRolledUp" class="shrink-0 px-1.5 py-0.5 border border-border/60 text-text bg-surface-1">{{ item.sourceBoardTitle ?? item.sourceBoardSlug }}</span>
            <span v-if="dueLabel" class="badge badge-warning">{{ dueLabel }}</span>
        </div>
        <div class="text-text text-body">{{ card?.title ?? item.slug }}</div>
        <div class="text-text-muted text-body">{{ preview }}</div>

        <div v-if="badges.length" class="flex flex-wrap gap-1.5">
            <span
                v-for="badge in badges"
                :key="badge"
                class="badge"
                >{{ badge }}</span
            >
        </div>
    </button>
</template>


