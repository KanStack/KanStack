<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from "vue";

import type {
    KanbanBoardDocument,
    KanbanCardDocument,
} from "@docs/schemas/kanban-parser-schema";
import { useCardEditor } from "@/composables/useCardEditor";
import type { WorkspaceMutationPayload } from "@/types/workspace";

const props = defineProps<{
    boardFilesBySlug: Record<string, { content: string; path: string }>;
    boardsBySlug: Record<string, KanbanBoardDocument>;
    cardsBySlug: Record<string, KanbanCardDocument>;
    card: KanbanCardDocument | null;
    open: boolean;
    sourceBoard: KanbanBoardDocument | null;
    workspaceRoot: string | null;
}>();

const emit = defineEmits<{
    archiveCard: [selection: { slug: string; sourceBoardSlug: string }];
    applyWorkspaceMutation: [payload: WorkspaceMutationPayload];
    close: [];
    deleteCard: [selection: { slug: string; sourceBoardSlug: string }];
}>();

const editor = useCardEditor({
    getBoardCardPaths: (cardPath) => {
        const boardCardDirectory = cardPath.replace(/\/[^/]+$/, "");
        return Object.values(props.cardsBySlug)
            .map((card) => card.path)
            .filter(
                (path) =>
                    path.startsWith(`${boardCardDirectory}/`) ||
                    path === cardPath,
            );
    },
    getSourceBoardSlug: () => props.sourceBoard?.slug ?? null,
});
const displayCard = computed(
    () => props.card ?? editor.session.value?.card ?? null,
);

function syncEditorState() {
    if (props.open && props.workspaceRoot) {
        const nextCard = props.card ?? editor.session.value?.card ?? null;
        if (!nextCard) {
            return;
        }

        const sameSession =
            editor.session.value?.card.slug === nextCard.slug &&
            editor.session.value?.workspaceRoot === props.workspaceRoot;

        if (sameSession) {
            return;
        }

        editor.open(nextCard, props.workspaceRoot);
        return;
    }

    editor.close();
}

async function handleClose() {
    const result = await editor.flushSave();
    if (!result.ok) {
        return;
    }

    if (result.mutation) {
        emit("applyWorkspaceMutation", result.mutation);
    }

    editor.close();
    emit("close");
}

async function handleBlur() {
    const result = await editor.flushSave();
    if (result.mutation) {
        emit("applyWorkspaceMutation", result.mutation);
    }
}

async function handleDelete() {
    if (
        !displayCard.value ||
        !window.confirm(`Delete "${displayCard.value.title}"?`)
    ) {
        return;
    }

    const result = await editor.flushSave();
    if (!result.ok) {
        return;
    }

    if (result.mutation) {
        emit("applyWorkspaceMutation", result.mutation);
    }

    if (!props.sourceBoard) {
        return;
    }

    emit("deleteCard", {
        slug: displayCard.value.slug,
        sourceBoardSlug: props.sourceBoard.slug,
    });

    editor.close();
    emit("close");
}

async function handleArchive() {
    if (!displayCard.value || !props.sourceBoard) {
        return;
    }

    const result = await editor.flushSave();
    if (!result.ok) {
        return;
    }

    if (result.mutation) {
        emit("applyWorkspaceMutation", result.mutation);
    }

    emit("archiveCard", {
        slug: displayCard.value.slug,
        sourceBoardSlug: props.sourceBoard.slug,
    });

    editor.close();
    emit("close");
}

function handleCloseEditorRequest() {
    void handleClose();
}

watch(
    () => [props.open, props.card?.slug ?? null, props.workspaceRoot],
    syncEditorState,
    { immediate: true },
);

onMounted(() => {
    window.addEventListener(
        "kanstack:request-close-editor",
        handleCloseEditorRequest as EventListener,
    );
});

onUnmounted(() => {
    window.removeEventListener(
        "kanstack:request-close-editor",
        handleCloseEditorRequest as EventListener,
    );
});
</script>

<template>
    <div
        v-if="open && displayCard"
        class="fixed inset-0 flex justify-center p-8 bg-surface-1/5 backdrop-blur-sm max-[720px]:p-0"
        @click.self="handleClose"
    >
        <article
            class="w-[min(62rem,100%)] h-full flex flex-col gap-4 p-5 border border-border/60 bg-surface/95 backdrop-blur-sm max-[720px]:w-full"
        >
            <header
                class="flex items-start justify-between gap-3 max-[720px]:flex-col"
            >
                <div>
                    <div class="label">{{ displayCard.slug }}</div>
                    <h2 class="mt-1 mb-0 text-xl">Edit card</h2>
                </div>

                <div class="flex items-start justify-between gap-3">
                    <button
                        class="btn btn-danger"
                        type="button"
                        :disabled="editor.isDeleting.value"
                        @click="handleDelete"
                    >
                        {{ editor.isDeleting.value ? "deleting..." : "delete" }}
                    </button>
                    <button
                        class="btn"
                        type="button"
                        :disabled="editor.isDeleting.value || !sourceBoard"
                        @click="handleArchive"
                    >
                        archive
                    </button>
                    <button
                        class="btn"
                        type="button"
                        :class="
                            editor.saveStatus.value === 'saved'
                                ? 'border-accent'
                                : 'border-danger'
                        "
                        @click="handleClose"
                    >
                        done
                    </button>
                </div>
            </header>

            <p
                v-if="editor.errorMessage.value"
                class="m-0 p-3 border border-danger/35 text-text bg-danger/10"
            >
                {{ editor.errorMessage.value }}
            </p>

            <div class="grid grid-cols-3 gap-3 max-[600px]:grid-cols-1">
                <label class="flex flex-col gap-2 col-span-3 max-[600px]:col-span-1">
                    <span class="label">Title</span>
                    <input
                        v-model="editor.draft.title"
                        class="input"
                        type="text"
                        @blur="handleBlur"
                    />
                </label>

                <label class="flex flex-col gap-2">
                    <span class="label">Type</span>
                    <select
                        v-model="editor.draft.type"
                        class="input"
                        @blur="handleBlur"
                        @change="handleBlur"
                    >
                        <option value="">None</option>
                        <option value="task">Task</option>
                        <option value="bug">Bug</option>
                        <option value="feature">Feature</option>
                        <option value="research">Research</option>
                        <option value="chore">Chore</option>
                    </select>
                </label>

                <label class="flex flex-col gap-2">
                    <span class="label">Priority</span>
                    <select
                        v-model="editor.draft.priority"
                        class="input"
                        @blur="handleBlur"
                        @change="handleBlur"
                    >
                        <option value="">None</option>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                    </select>
                </label>

                <label class="flex flex-col gap-2">
                    <span class="label">Assignee</span>
                    <input
                        v-model="editor.draft.assignee"
                        class="input"
                        type="text"
                        @blur="handleBlur"
                    />
                </label>

                <label class="flex flex-col gap-2">
                    <span class="label">Due</span>
                    <input
                        v-model="editor.draft.due"
                        class="input"
                        type="datetime-local"
                        @blur="handleBlur"
                    />
                </label>

                <label class="flex flex-col gap-2">
                    <span class="label">Estimate</span>
                    <input
                        v-model="editor.draft.estimate"
                        class="input"
                        type="number"
                        min="0"
                        step="1"
                        @blur="handleBlur"
                    />
                </label>

                <label class="flex flex-col gap-2">
                    <span class="label">Tags</span>
                    <input
                        v-model="editor.draft.tags"
                        class="input"
                        type="text"
                        placeholder="auth, backend"
                        @blur="handleBlur"
                    />
                </label>
            </div>

            <label class="flex-1 min-h-0 flex flex-col gap-2">
                <span class="label">Body</span>
                <textarea
                    v-model="editor.draft.body"
                    class="flex-1 min-h-64 input resize-none leading-relaxed"
                    spellcheck="false"
                    @blur="handleBlur"
                ></textarea>
            </label>
        </article>
    </div>
</template>
