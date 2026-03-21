<script setup lang="ts">
import { computed, onMounted, onUnmounted, shallowRef, watch } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

import AppHeader from "@/components/app/AppHeader.vue";
import AppMessageBanner from "@/components/app/AppMessageBanner.vue";
import BoardCanvas from "@/components/board/BoardCanvas.vue";
import CardEditorModal from "@/components/card/CardEditorModal.vue";
import {
    useAppUpdater,
    type AppUpdaterMessageKind,
} from "@/composables/useAppUpdater";
import { useBoardActions } from "@/composables/useBoardActions";
import { useBoardSelection } from "@/composables/useBoardSelection";
import {
    useActionHistory,
    type HistoryStateSnapshot,
} from "@/history/useActionHistory";
import { useWorkspace } from "@/composables/useWorkspace";
import { isCardReorderEnabled } from "@/utils/appConfig";
import {
    ARCHIVE_COLUMN_NAME,
    ARCHIVE_COLUMN_SLUG,
    SHOW_ARCHIVE_COLUMN_SETTING,
} from "@/utils/archiveColumn";
import type {
    VisibleBoardCardSelection,
    WorkspaceCardSelection,
    WorkspaceSnapshot,
} from "@/types/workspace";

const {
    workspace,
    currentBoard,
    currentBoardSlug,
    boardLineage,
    childBoards,
    selectedCard,
    selectedCardSlug,
    selectedCardSourceBoard,
    isLoading,
    errorMessage,
    viewPreferences,
    openWorkspace,
    attachExistingBoard,
    closeWorkspace,
    restoreWorkspace,
    loadWorkspaceRoot,
    registerKnownBoardRoots,
    selectBoard,
    selectCard,
    closeCard,
    applyWorkspaceMutation,
    updateViewPreferences,
} = useWorkspace();

const appBoardActions = useBoardActions({
    getBoardsBySlug: () => workspace.value?.boardsBySlug ?? {},
    getWorkspaceRoot: () => workspace.value?.rootPath ?? null,
    getBoardFilesBySlug: () => workspace.value?.boardFilesBySlug ?? {},
    getCardsBySlug: () => workspace.value?.cardsBySlug ?? {},
});
const boardSelection = useBoardSelection();
const appMessage = shallowRef<{
    kind: AppUpdaterMessageKind;
    text: string;
} | null>(null);
const keyboardMoveMode = shallowRef<"card" | "column" | null>(null);
const selectedColumnState = shallowRef<string | null>(null);
const actionHistory = useActionHistory();
let appMessageTimer: number | null = null;
let unlistenMenuActions: UnlistenFn | null = null;
const { checkForUpdates, scheduleStartupCheck } = useAppUpdater({
    notify: showAppMessage,
});
const canReorderCards = computed(() => isCardReorderEnabled(viewPreferences.value));
const selectedColumn = computed(() => {
    if (!currentBoard.value || !selectedColumnState.value) {
        return null;
    }

    return (
        currentBoard.value.columns.find(
            (column) => column.slug === selectedColumnState.value,
        ) ?? null
    );
});
const selectedColumnSlug = computed(() => selectedColumn.value?.slug ?? null);

watch(canReorderCards, (enabled) => {
    if (!enabled && keyboardMoveMode.value === "card") {
        keyboardMoveMode.value = null;
    }
});

const emptyStateCopy = computed(() => {
    if (isLoading.value) {
        return "Reading markdown workspace...";
    }

    if (errorMessage.value) {
        return errorMessage.value;
    }

    return "Open an existing or create a new KanStack board ";
});

function createHistoryStateSnapshot(): HistoryStateSnapshot | null {
    if (!workspace.value) {
        return null;
    }

    return {
        currentBoardSlug: currentBoardSlug.value,
        selectedCard:
            selectedCardSlug.value && selectedCardSourceBoard.value
                ? {
                      slug: selectedCardSlug.value,
                      sourceBoardSlug: selectedCardSourceBoard.value.slug,
                  }
                : null,
        selectedColumnSlug: selectedColumnState.value,
        snapshot: structuredClone(workspace.value.snapshot),
    };
}

async function applyHistoryStateSnapshot(state: HistoryStateSnapshot) {
    const snapshot = await invoke<WorkspaceSnapshot>(
        "apply_workspace_snapshot",
        {
            snapshot: state.snapshot,
        },
    );

    applyWorkspaceMutation({
        snapshot,
        currentBoardSlug: state.currentBoardSlug,
        selectedCard: state.selectedCard,
    });
    selectedColumnState.value = state.selectedColumnSlug;
}

async function executeTrackedAction(
    label: string,
    perform: () => Promise<HistoryStateSnapshot | null>,
) {
    const before = createHistoryStateSnapshot();
    if (!before) {
        return null;
    }

    const after = await perform();
    if (!after) {
        return null;
    }

    actionHistory.push({
        label,
        before,
        after,
    });

    return after;
}

async function createBoardFromWorkspace() {
    const hadWorkspace = Boolean(workspace.value?.rootPath);
    const result = await appBoardActions.createBoard();
    if (!result) {
        return;
    }

    if (!hadWorkspace) {
        const loadResult = await loadWorkspaceRoot(result.todoPath);
        showMissingKnownBoardMessage(loadResult?.missingBoardRoots ?? []);
        showAppMessage(`Created new board at ${result.todoPath}.`);
        return;
    }

    const syncResult = await registerKnownBoardRoots([result.todoPath]);
    showAppMessage(
        `Created new board at ${result.todoPath}.${missingKnownBoardSuffix(syncResult?.missingBoardRoots ?? [])}`,
    );
}

async function openWorkspaceFromMenu() {
    const result = await openWorkspace();
    showMissingKnownBoardMessage(result?.missingBoardRoots ?? []);
}

async function attachExistingBoardFromWorkspace() {
    const result = await attachExistingBoard();
    if (!result) {
        return;
    }

    showAppMessage(
        `Attached board at ${result.attachedRootPath}.${missingKnownBoardSuffix(result.missingBoardRoots)}`,
    );
}

onMounted(() => {
    void restoreWorkspace();
    void attachMenuActionListener();
    scheduleStartupCheck();
    window.addEventListener("keydown", handleGlobalKeydown);
    window.addEventListener("keyup", handleGlobalKeyup);
});

onUnmounted(() => {
    clearAppMessageTimer();
    if (unlistenMenuActions) {
        unlistenMenuActions();
        unlistenMenuActions = null;
    }

    window.removeEventListener("keydown", handleGlobalKeydown);
    window.removeEventListener("keyup", handleGlobalKeyup);
});

async function undoAction() {
    const entry = actionHistory.shiftUndo();
    if (!entry) {
        return;
    }

    await applyHistoryStateSnapshot(entry.before);
}

async function redoAction() {
    const entry = actionHistory.shiftRedo();
    if (!entry) {
        return;
    }

    await applyHistoryStateSnapshot(entry.after);
}

async function createCardFromBoard() {
    if (!currentBoard.value) {
        return;
    }

    const after = await executeTrackedAction("New Card", async () => {
        const result = await appBoardActions.createCard(currentBoard.value!);
        if (!result) {
            return null;
        }

        return {
            currentBoardSlug: currentBoard.value!.slug,
            selectedCard: {
                slug: result.slug,
                sourceBoardSlug: currentBoard.value!.slug,
            },
            selectedColumnSlug: null,
            snapshot: result.snapshot,
        };
    });

    if (!after) {
        return;
    }

    boardSelection.clearSelection();
    selectedColumnState.value = null;
    applyWorkspaceMutation({
        snapshot: after.snapshot,
        currentBoardSlug: after.currentBoardSlug,
        selectedCard: after.selectedCard,
    });
}

async function createColumn() {
    if (!currentBoard.value) {
        return;
    }

    const after = await executeTrackedAction("New Column", async () => {
        const result = await appBoardActions.addColumn(currentBoard.value!);
        if (!result) {
            return null;
        }

        return {
            currentBoardSlug: currentBoard.value!.slug,
            selectedCard: null,
            selectedColumnSlug: result.slug,
            snapshot: result.snapshot,
        };
    });

    if (!after) {
        return;
    }

    boardSelection.clearSelection();
    applyWorkspaceMutation({
        snapshot: after.snapshot,
        currentBoardSlug: after.currentBoardSlug,
        selectedCard: after.selectedCard,
    });
    selectedColumnState.value = after.selectedColumnSlug;
}

async function handleColumnReorder(payload: {
    draggedSlug: string;
    targetIndex: number;
}) {
    if (!currentBoard.value) {
        return;
    }

    const after = await executeTrackedAction("Reorder Columns", async () => {
        const snapshot = await appBoardActions.reorderColumns(
            currentBoard.value!,
            payload.draggedSlug,
            payload.targetIndex,
        );
        if (!snapshot) {
            return null;
        }

        return {
            currentBoardSlug: currentBoard.value!.slug,
            selectedCard: null,
            selectedColumnSlug: selectedColumnState.value,
            snapshot,
        };
    });

    if (!after) {
        return;
    }

    applyWorkspaceMutation({
        snapshot: after.snapshot,
        currentBoardSlug: after.currentBoardSlug,
        selectedCard: after.selectedCard,
    });
    selectedColumnState.value = after.selectedColumnSlug;
}

async function toggleArchiveColumn() {
    if (!currentBoard.value) {
        return;
    }

    const nextValue = !(
        currentBoard.value.settings?.[SHOW_ARCHIVE_COLUMN_SETTING] ?? false
    );
    const after = await executeTrackedAction(
        nextValue ? "Show Archive Column" : "Hide Archive Column",
        async () => {
            const snapshot = await appBoardActions.saveBoardSettings(
                currentBoard.value!,
                {
                    ...(currentBoard.value!.settings ?? {}),
                    [SHOW_ARCHIVE_COLUMN_SETTING]: nextValue,
                },
            );
            if (!snapshot) {
                return null;
            }

            return {
                currentBoardSlug: currentBoard.value!.slug,
                selectedCard: null,
                selectedColumnSlug: selectedColumnState.value,
                snapshot,
            };
        },
    );

    if (!after) {
        return;
    }

    applyWorkspaceMutation({
        snapshot: after.snapshot,
        currentBoardSlug: after.currentBoardSlug,
        selectedCard: after.selectedCard,
    });
    selectedColumnState.value = after.selectedColumnSlug;
}

async function toggleSubBoards() {
    if (!currentBoard.value) {
        return;
    }

    const nextValue = !(
        currentBoard.value.settings?.["show-sub-boards"] ?? true
    );
    const after = await executeTrackedAction(
        nextValue ? "Show Sub Boards" : "Hide Sub Boards",
        async () => {
            const snapshot = await appBoardActions.saveBoardSettings(
                currentBoard.value!,
                {
                    ...(currentBoard.value!.settings ?? {}),
                    "show-sub-boards": nextValue,
                },
            );
            if (!snapshot) {
                return null;
            }

            return {
                currentBoardSlug: currentBoard.value!.slug,
                selectedCard: null,
                selectedColumnSlug: selectedColumnState.value,
                snapshot,
            };
        },
    );

    if (!after) {
        return;
    }

    applyWorkspaceMutation({
        snapshot: after.snapshot,
        currentBoardSlug: after.currentBoardSlug,
        selectedCard: after.selectedCard,
    });
    selectedColumnState.value = after.selectedColumnSlug;
}

function handleVisibleCards(cards: VisibleBoardCardSelection[]) {
    boardSelection.setVisibleCards(cards);
}

function clearSelections() {
    boardSelection.clearSelection();
    selectedColumnState.value = null;
    keyboardMoveMode.value = null;
}

function handleColumnSelect(slug: string) {
    boardSelection.clearSelection();
    closeCard();
    selectedColumnState.value = slug;
    keyboardMoveMode.value = null;
}

async function handleColumnRename(payload: { name: string; slug: string }) {
    if (!currentBoard.value) {
        return;
    }

    if (payload.slug === ARCHIVE_COLUMN_SLUG) {
        showAppMessage(`${ARCHIVE_COLUMN_NAME} cannot be renamed.`);
        return;
    }

    const after = await executeTrackedAction("Rename Column", async () => {
        const result = await appBoardActions.renameColumn(
            currentBoard.value!,
            payload.slug,
            payload.name,
        );
        if (!result) {
            return null;
        }

        return {
            currentBoardSlug: currentBoard.value!.slug,
            selectedCard: null,
            selectedColumnSlug: result.slug,
            snapshot: result.snapshot,
        };
    });

    if (!after) {
        return;
    }

    applyWorkspaceMutation({
        snapshot: after.snapshot,
        currentBoardSlug: after.currentBoardSlug,
        selectedCard: after.selectedCard,
    });
    selectedColumnState.value = after.selectedColumnSlug;
}

async function handleBoardRename(title: string) {
    if (!currentBoard.value) {
        return;
    }

    const after = await executeTrackedAction("Rename Board", async () => {
        const result = await appBoardActions.renameBoard(
            currentBoard.value!,
            title,
        );
        if (!result?.snapshot) {
            return null;
        }

        return {
            currentBoardSlug: result.slug,
            selectedCard: null,
            selectedColumnSlug: selectedColumnState.value,
            snapshot: result.snapshot,
        };
    });

    if (!after) {
        return;
    }

    applyWorkspaceMutation({
        snapshot: after.snapshot,
        currentBoardSlug: after.currentBoardSlug,
        selectedCard: after.selectedCard,
    });
    selectedColumnState.value = after.selectedColumnSlug;
}

function handleCardActivate(payload: {
    metaKey: boolean;
    shiftKey: boolean;
    selection: WorkspaceCardSelection;
}) {
    selectedColumnState.value = null;
    keyboardMoveMode.value = null;
    boardSelection.handleSelection(payload.selection, {
        metaKey: payload.metaKey,
        shiftKey: payload.shiftKey,
    });
}

function openCard(selection: WorkspaceCardSelection) {
    selectedColumnState.value = null;
    keyboardMoveMode.value = null;
    boardSelection.selectSingle(selection);
    selectCard(selection);
}

async function handleCardMove(payload: {
    cardSlug: string;
    sourceBoardSlug: string;
    targetColumnName: string;
    targetColumnSlug: string;
    targetSectionName: string | null;
    targetSectionSlug: string | null;
    targetIndex: number;
}) {
    await moveCardTracked(payload);
}

function openSelectedCard() {
    if (boardSelection.selectedCount.value !== 1) {
        return;
    }

    const [selection] = boardSelection.selectedCards.value;
    if (selection) {
        selectCard(selection);
    }
}

async function moveCardTracked(input: {
    cardSlug: string;
    sourceBoardSlug: string;
    targetColumnName: string;
    targetColumnSlug: string;
    targetSectionName: string | null;
    targetSectionSlug: string | null;
    targetIndex: number;
}) {
    if (!workspace.value) {
        return null;
    }

    const ownerBoard = workspace.value.boardsBySlug[input.sourceBoardSlug];
    if (!ownerBoard) {
        return null;
    }

    const after = await executeTrackedAction("Move Card", async () => {
        const snapshot = await appBoardActions.moveCard(ownerBoard, {
            cardSlug: input.cardSlug,
            targetColumnName: input.targetColumnName,
            targetColumnSlug: input.targetColumnSlug,
            targetSectionName: input.targetSectionName,
            targetSectionSlug: input.targetSectionSlug,
            targetIndex: input.targetIndex,
        });

        if (!snapshot) {
            return null;
        }

        return {
            currentBoardSlug: currentBoardSlug.value,
            selectedCard: selectedCardSlug.value
                ? {
                      slug: input.cardSlug,
                      sourceBoardSlug: input.sourceBoardSlug,
                  }
                : null,
            selectedColumnSlug: selectedColumnState.value,
            snapshot,
        };
    });

    if (!after) {
        return null;
    }

    applyWorkspaceMutation({
        snapshot: after.snapshot,
        currentBoardSlug: after.currentBoardSlug,
        selectedCard: after.selectedCard,
    });
    selectedColumnState.value = after.selectedColumnSlug;
    return after;
}

async function archiveSelectedCards() {
    const selectedCards = boardSelection.selectedCards.value;
    if (!selectedCards.length || !workspace.value) {
        return;
    }

    const after = await executeTrackedAction("Archive Cards", async () => {
        const groupedSelections = groupSelectionsByBoard(selectedCards);
        let latestSnapshot: WorkspaceSnapshot | null = null;

        for (const [boardSlug, cards] of groupedSelections.entries()) {
            const board = workspace.value!.boardsBySlug[boardSlug];
            if (!board) {
                continue;
            }

            const snapshot = await appBoardActions.archiveCards(
                board,
                cards.map((card) => card.slug),
            );
            if (!snapshot) {
                return null;
            }

            latestSnapshot = snapshot;
        }

        if (!latestSnapshot) {
            return null;
        }

        return {
            currentBoardSlug: currentBoardSlug.value,
            selectedCard: null,
            selectedColumnSlug: selectedColumnState.value,
            snapshot: latestSnapshot,
        };
    });

    if (!after) {
        return;
    }

    if (
        selectedCardSlug.value &&
        selectedCards.some((card) => card.slug === selectedCardSlug.value)
    ) {
        requestCloseEditor();
    }

    boardSelection.clearSelection();
    applyWorkspaceMutation({
        snapshot: after.snapshot,
        currentBoardSlug: after.currentBoardSlug,
        selectedCard: after.selectedCard,
    });
    selectedColumnState.value = after.selectedColumnSlug;
}

async function archiveSingleCard(selection: WorkspaceCardSelection) {
    boardSelection.selectSingle(selection);
    await archiveSelectedCards();
}

async function deleteSelectedCards() {
    const selectedCards = boardSelection.selectedCards.value;
    if (!selectedCards.length || !workspace.value?.rootPath) {
        return;
    }

    const confirmed = window.confirm(
        `Delete ${selectedCards.length} selected card${selectedCards.length === 1 ? "" : "s"}?`,
    );
    if (!confirmed) {
        return;
    }

    const deletions = selectedCards
        .map((selection) => ({
            ...selection,
            boardPath:
                workspace.value!.boardsBySlug[selection.sourceBoardSlug]
                    ?.path ?? null,
            path: workspace.value!.cardsBySlug[selection.slug]?.path ?? null,
        }))
        .filter(
            (
                selection,
            ): selection is VisibleBoardCardSelection & {
                boardPath: string;
                path: string;
            } => Boolean(selection.path) && Boolean(selection.boardPath),
        );

    const after = await executeTrackedAction("Delete Cards", async () => {
        let latestSnapshot: WorkspaceSnapshot | null = null;

        for (const selection of deletions) {
            latestSnapshot = await invoke<WorkspaceSnapshot>(
                "delete_card_file",
                {
                    root: workspace.value!.rootPath,
                    boardPath: selection.boardPath,
                    path: selection.path,
                    slug: selection.slug,
                },
            );
        }

        if (!latestSnapshot) {
            return null;
        }

        return {
            currentBoardSlug: currentBoardSlug.value,
            selectedCard: null,
            selectedColumnSlug: selectedColumnState.value,
            snapshot: latestSnapshot,
        };
    });

    if (!after) {
        return;
    }

    if (
        selectedCardSlug.value &&
        selectedCards.some((card) => card.slug === selectedCardSlug.value)
    ) {
        requestCloseEditor();
    }

    boardSelection.clearSelection();
    applyWorkspaceMutation({
        snapshot: after.snapshot,
        currentBoardSlug: after.currentBoardSlug,
        selectedCard: after.selectedCard,
    });
    selectedColumnState.value = after.selectedColumnSlug;
}

async function deleteSingleCard(selection: WorkspaceCardSelection) {
    boardSelection.selectSingle(selection);
    await deleteSelectedCards();
}

async function deleteCurrentBoard() {
    if (!currentBoard.value || !workspace.value?.rootPath) {
        return;
    }

    const descendantCount = countDescendantBoards(currentBoard.value.slug);
    const confirmationMessage =
        descendantCount > 0
            ? `Delete board "${currentBoard.value.title}" and its ${descendantCount} sub board${descendantCount === 1 ? "" : "s"}? This will also move their cards to Trash.`
            : `Delete board "${currentBoard.value.title}"? This will also move its cards to Trash.`;
    const confirmed = window.confirm(confirmationMessage);
    if (!confirmed) {
        return;
    }

    const fallbackBoardSlug =
        boardLineage.value[boardLineage.value.length - 2]?.slug ?? null;
    const parentBoardPath = fallbackBoardSlug
        ? (workspace.value.boardsBySlug[fallbackBoardSlug]?.path ?? null)
        : null;
    if (!parentBoardPath) {
        showAppMessage("Deleting the opened root board is not supported yet.");
        return;
    }
    const after = await executeTrackedAction("Delete Board", async () => {
        const snapshot = await invoke<WorkspaceSnapshot>("delete_board", {
            root: workspace.value!.rootPath,
            path: currentBoard.value!.path,
            parentBoardPath,
        });

        return {
            currentBoardSlug: fallbackBoardSlug,
            selectedCard: null,
            selectedColumnSlug: null,
            snapshot,
        };
    });

    if (!after) {
        return;
    }

    closeCard();
    boardSelection.clearSelection();
    keyboardMoveMode.value = null;
    applyWorkspaceMutation({
        snapshot: after.snapshot,
        currentBoardSlug: after.currentBoardSlug,
        selectedCard: after.selectedCard,
    });
    selectedColumnState.value = after.selectedColumnSlug;
}

async function deleteSelectedColumn() {
    if (!currentBoard.value || !selectedColumnSlug.value) {
        return;
    }

    if (selectedColumnSlug.value === ARCHIVE_COLUMN_SLUG) {
        showAppMessage(`${ARCHIVE_COLUMN_NAME} cannot be deleted.`);
        return;
    }

    const confirmed = window.confirm(
        `Delete column "${selectedColumn.value?.name ?? selectedColumnSlug.value}" across all boards?`,
    );
    if (!confirmed) {
        return;
    }

    const after = await executeTrackedAction("Delete Column", async () => {
        const result = await appBoardActions.deleteColumn(
            selectedColumnSlug.value!,
        );
        if (!result) {
            return null;
        }

        if (result.blocked) {
            showAppMessage(
                "You can't delete that column while it still contains cards anywhere in the workspace. Move, archive, or delete those cards first.",
            );
            return null;
        }

        return {
            currentBoardSlug: currentBoard.value!.slug,
            selectedCard: null,
            selectedColumnSlug: null,
            snapshot: result.snapshot,
        };
    });

    if (!after) {
        return;
    }

    selectedColumnState.value = null;
    keyboardMoveMode.value = null;
    applyWorkspaceMutation({
        snapshot: after.snapshot,
        currentBoardSlug: after.currentBoardSlug,
        selectedCard: after.selectedCard,
    });
}

function requestCloseEditor() {
    window.dispatchEvent(new CustomEvent("kanstack:request-close-editor"));
}

function requestCancelBoardRename() {
    window.dispatchEvent(new CustomEvent("kanstack:cancel-board-rename"));
}

function showAppMessage(
    text: string,
    kind: AppUpdaterMessageKind = "error",
    durationMs = 5000,
) {
    clearAppMessageTimer();
    appMessage.value = { kind, text };
    if (durationMs <= 0) {
        return;
    }
    appMessageTimer = window.setTimeout(() => {
        appMessage.value = null;
        appMessageTimer = null;
    }, durationMs);
}

function showMissingKnownBoardMessage(paths: string[]) {
    if (!paths.length) {
        return;
    }

    showAppMessage(
        `Removed ${paths.length} missing known board${paths.length === 1 ? "" : "s"}. Attach them again if needed.`,
    );
}

function missingKnownBoardSuffix(paths: string[]) {
    if (!paths.length) {
        return "";
    }

    return ` Removed ${paths.length} missing known board${paths.length === 1 ? "" : "s"}; attach them again if needed.`;
}

function clearAppMessageTimer() {
    if (appMessageTimer !== null) {
        window.clearTimeout(appMessageTimer);
        appMessageTimer = null;
    }
}

function dismissAppMessage() {
    clearAppMessageTimer();
    appMessage.value = null;
}

function handleGlobalKeydown(event: KeyboardEvent) {
    if (event.defaultPrevented) {
        return;
    }

    const editable = isEditableElement(document.activeElement);
    const hasPrimaryModifier = event.metaKey || event.ctrlKey;

    if (event.key === "Escape") {
        if (keyboardMoveMode.value) {
            event.preventDefault();
            keyboardMoveMode.value = null;
            return;
        }

        if (selectedCardSlug.value) {
            event.preventDefault();
            requestCloseEditor();
            return;
        }

        if (boardSelection.selectedCount.value > 0) {
            event.preventDefault();
            boardSelection.clearSelection();
            return;
        }

        if (selectedColumnSlug.value) {
            event.preventDefault();
            selectedColumnState.value = null;
            return;
        }

        requestCancelBoardRename();
        return;
    }

    if (editable) {
        return;
    }

    if (
        hasPrimaryModifier &&
        event.key.toLowerCase() === "z" &&
        event.shiftKey
    ) {
        event.preventDefault();
        void redoAction();
        return;
    }

    if (hasPrimaryModifier && event.key.toLowerCase() === "z") {
        event.preventDefault();
        void undoAction();
        return;
    }

    if (hasPrimaryModifier && event.key.toLowerCase() === "y") {
        event.preventDefault();
        void redoAction();
        return;
    }

    if (!selectedCardSlug.value) {
        if (
            event.key === " " &&
            boardSelection.selectedCount.value === 1 &&
            canReorderCards.value
        ) {
            event.preventDefault();
            if (!event.repeat && keyboardMoveMode.value !== "card") {
                keyboardMoveMode.value = "card";
            }
            return;
        }

        if (event.key === " " && selectedColumnSlug.value) {
            event.preventDefault();
            if (!event.repeat && keyboardMoveMode.value !== "column") {
                keyboardMoveMode.value = "column";
            }
            return;
        }

        if (
            keyboardMoveMode.value === "column" &&
            (event.key === "ArrowRight" || event.key === "ArrowLeft")
        ) {
            event.preventDefault();
            void moveSelectedColumnByKeyboard(
                event.key === "ArrowRight" ? 1 : -1,
            );
            return;
        }

        if (
            keyboardMoveMode.value === "card" &&
            ["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown"].includes(
                event.key,
            )
        ) {
            event.preventDefault();
            void moveSelectedCardByKeyboard(
                event.key as
                    | "ArrowRight"
                    | "ArrowLeft"
                    | "ArrowUp"
                    | "ArrowDown",
            );
            return;
        }

        if (
            selectedColumnSlug.value &&
            (event.key === "ArrowRight" || event.key === "ArrowLeft")
        ) {
            event.preventDefault();
            moveSelectedColumn(event.key === "ArrowRight" ? 1 : -1);
            return;
        }

        if (event.key === "ArrowRight" || event.key === "ArrowDown") {
            event.preventDefault();
            boardSelection.moveSelection(
                event.key === "ArrowRight" ? "right" : "next",
            );
            return;
        }

        if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
            event.preventDefault();
            boardSelection.moveSelection(
                event.key === "ArrowLeft" ? "left" : "previous",
            );
            return;
        }
    }

    if (
        (event.key === "Delete" || event.key === "Backspace") &&
        boardSelection.selectedCount.value > 0
    ) {
        event.preventDefault();
        if (event.shiftKey) {
            void deleteSelectedCards();
        } else {
            void archiveSelectedCards();
        }
        return;
    }

    if (
        (event.key === "Delete" || event.key === "Backspace") &&
        selectedColumnSlug.value
    ) {
        event.preventDefault();
        void deleteSelectedColumn();
        return;
    }

    if (
        event.key === "Enter" &&
        boardSelection.selectedCount.value === 1 &&
        !selectedCardSlug.value
    ) {
        event.preventDefault();
        openSelectedCard();
        return;
    }

    if (!hasPrimaryModifier) {
        return;
    }

    if (event.key.toLowerCase() === "o") {
        event.preventDefault();
        void openWorkspaceFromMenu();
        return;
    }

    if (event.key.toLowerCase() === "n" && event.shiftKey) {
        event.preventDefault();
        void createBoardFromWorkspace();
        return;
    }

    if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        void createCardFromBoard();
        return;
    }

    if (event.key.toLowerCase() === "a" && event.shiftKey) {
        event.preventDefault();
        void toggleArchiveColumn();
    }
}

function handleGlobalKeyup(event: KeyboardEvent) {
    if (event.key !== " ") {
        return;
    }

    if (!keyboardMoveMode.value) {
        return;
    }

    keyboardMoveMode.value = null;
}

async function attachMenuActionListener() {
    if (unlistenMenuActions) {
        return;
    }

    unlistenMenuActions = await listen<{ action: string }>(
        "menu-action",
        (event) => {
            void dispatchMenuAction(event.payload.action);
        },
    );
}

async function dispatchMenuAction(action: string) {
    switch (action) {
        case "open-folder":
            await openWorkspaceFromMenu();
            break;
        case "check-for-updates":
            await checkForUpdates("manual");
            break;
        case "close-folder":
            await closeWorkspace();
            break;
        case "undo-action":
            await undoAction();
            break;
        case "redo-action":
            await redoAction();
            break;
        case "new-card":
            await createCardFromBoard();
            break;
        case "new-board":
            await createBoardFromWorkspace();
            break;
        case "attach-existing-board":
            await attachExistingBoardFromWorkspace();
            break;
        case "new-column":
            await createColumn();
            break;
        case "rename-selected-column":
            if (selectedColumnSlug.value === ARCHIVE_COLUMN_SLUG) {
                showAppMessage(`${ARCHIVE_COLUMN_NAME} cannot be renamed.`);
            } else if (!selectedColumnSlug.value) {
            } else {
                window.dispatchEvent(
                    new CustomEvent("kanstack:request-rename-column", {
                        detail: { slug: selectedColumnSlug.value },
                    }),
                );
            }
            break;
        case "delete-selected-column":
            if (!selectedColumnSlug.value) {
            } else {
                await deleteSelectedColumn();
            }
            break;
        case "toggle-archive-column":
            await toggleArchiveColumn();
            break;
        case "toggle-sub-boards":
            await toggleSubBoards();
            break;
        case "delete-current-board":
            await deleteCurrentBoard();
            break;
        case "open-selected-card":
            openSelectedCard();
            break;
        case "archive-selected-cards":
            await archiveSelectedCards();
            break;
        case "delete-selected-cards":
            await deleteSelectedCards();
            break;
        case "close-editor":
            requestCloseEditor();
            break;
    }
}

function isEditableElement(target: Element | null) {
    if (!(target instanceof HTMLElement)) {
        return false;
    }

    const tagName = target.tagName.toLowerCase();
    return (
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select" ||
        target.isContentEditable
    );
}

function groupSelectionsByBoard(selections: WorkspaceCardSelection[]) {
    const grouped = new Map<string, WorkspaceCardSelection[]>();

    for (const selection of selections) {
        const existing = grouped.get(selection.sourceBoardSlug) ?? [];
        existing.push(selection);
        grouped.set(selection.sourceBoardSlug, existing);
    }

    return grouped;
}

function countDescendantBoards(rootSlug: string) {
    if (!workspace.value?.boardsBySlug[rootSlug]) {
        return 0;
    }

    let count = 0;
    const stack = [
        ...workspace.value.boardsBySlug[rootSlug].subBoards.map(
            (board) => board.slug,
        ),
    ];
    const visited = new Set<string>();

    while (stack.length) {
        const slug = stack.pop();
        if (!slug || visited.has(slug) || !workspace.value.boardsBySlug[slug]) {
            continue;
        }

        visited.add(slug);
        count += 1;
        stack.push(
            ...workspace.value.boardsBySlug[slug].subBoards.map(
                (board) => board.slug,
            ),
        );
    }

    return count;
}

function moveSelectedColumn(delta: -1 | 1) {
    if (!currentBoard.value || !selectedColumnSlug.value) {
        return;
    }

    const visibleColumns = currentBoard.value.columns.filter(
        (column) => column.slug !== ARCHIVE_COLUMN_SLUG,
    );
    const currentIndex = visibleColumns.findIndex(
        (column) => column.slug === selectedColumnSlug.value,
    );
    if (currentIndex === -1) {
        return;
    }

    const nextIndex = Math.max(
        0,
        Math.min(visibleColumns.length - 1, currentIndex + delta),
    );
    selectedColumnState.value =
        visibleColumns[nextIndex]?.slug ?? selectedColumnState.value;
}

async function moveSelectedColumnByKeyboard(delta: -1 | 1) {
    if (!currentBoard.value || !selectedColumnSlug.value) {
        return;
    }

    const visibleColumns = currentBoard.value.columns.filter(
        (column) => column.slug !== ARCHIVE_COLUMN_SLUG,
    );
    const currentIndex = visibleColumns.findIndex(
        (column) => column.slug === selectedColumnSlug.value,
    );
    if (currentIndex === -1) {
        return;
    }

    const nextIndex = Math.max(
        0,
        Math.min(visibleColumns.length - 1, currentIndex + delta),
    );
    if (nextIndex === currentIndex) {
        return;
    }

    const snapshot = await appBoardActions.reorderColumns(
        currentBoard.value,
        selectedColumnSlug.value,
        nextIndex,
    );
    if (!snapshot) {
        return;
    }

    applyWorkspaceMutation({
        snapshot,
        currentBoardSlug: currentBoard.value.slug,
        selectedCard: null,
    });
    selectedColumnState.value = selectedColumnSlug.value;
}

async function moveSelectedCardByKeyboard(
    direction: "ArrowRight" | "ArrowLeft" | "ArrowUp" | "ArrowDown",
) {
    if (
        !workspace.value ||
        boardSelection.selectedCount.value !== 1 ||
        !canReorderCards.value
    ) {
        return;
    }

    const [selectedCard] = boardSelection.selectedCards.value;
    if (!selectedCard) {
        return;
    }

    const ownerBoard =
        workspace.value.boardsBySlug[selectedCard.sourceBoardSlug];
    if (!ownerBoard) {
        return;
    }

    const location = findCardLocation(ownerBoard, selectedCard.slug);
    if (!location) {
        return;
    }

    const target = getKeyboardCardMoveTarget(ownerBoard, location, direction);
    if (!target) {
        return;
    }

    const moved = await moveCardTracked({
        cardSlug: selectedCard.slug,
        sourceBoardSlug: ownerBoard.slug,
        targetColumnName: target.targetColumnName,
        targetColumnSlug: target.targetColumnSlug,
        targetSectionName: target.targetSectionName,
        targetSectionSlug: target.targetSectionSlug,
        targetIndex: target.targetIndex,
    });
    if (!moved) {
        return;
    }
}

function findCardLocation(
    board: NonNullable<typeof currentBoard.value>,
    cardSlug: string,
) {
    for (const [columnIndex, column] of board.columns.entries()) {
        let flatIndex = 0;

        for (const [sectionIndex, section] of column.sections.entries()) {
            for (const [cardIndex, card] of section.cards.entries()) {
                if (card.slug === cardSlug) {
                    return {
                        cardIndex,
                        column,
                        columnIndex,
                        flatIndex,
                        section,
                        sectionIndex,
                    };
                }

                flatIndex += 1;
            }
        }
    }

    return null;
}

function getKeyboardCardMoveTarget(
    board: NonNullable<typeof currentBoard.value>,
    location: NonNullable<ReturnType<typeof findCardLocation>>,
    direction: "ArrowRight" | "ArrowLeft" | "ArrowUp" | "ArrowDown",
) {
    if (direction === "ArrowUp" || direction === "ArrowDown") {
        const flatCards = flattenColumnCards(location.column);
        const delta = direction === "ArrowUp" ? -1 : 1;
        const targetFlatIndex = Math.max(
            0,
            Math.min(flatCards.length - 1, location.flatIndex + delta),
        );
        if (targetFlatIndex === location.flatIndex) {
            return null;
        }

        const targetCard = flatCards[targetFlatIndex];
        let targetIndex =
            direction === "ArrowUp"
                ? targetCard.cardIndex
                : targetCard.cardIndex + 1;

        if (
            targetCard.section.slug === location.section.slug &&
            location.cardIndex < targetIndex
        ) {
            targetIndex -= 1;
        }

        return {
            cardSlug:
                targetCard.slug ===
                location.section.cards[location.cardIndex]?.slug
                    ? location.section.cards[location.cardIndex].slug
                    : board.columns[location.columnIndex].sections[
                          location.sectionIndex
                      ].cards[location.cardIndex].slug,
            targetColumnName: location.column.name,
            targetColumnSlug: location.column.slug,
            targetSectionName: targetCard.section.name,
            targetSectionSlug: targetCard.section.slug,
            targetIndex,
        };
    }

    const delta = direction === "ArrowRight" ? 1 : -1;
    const targetColumnIndex = location.columnIndex + delta;
    if (targetColumnIndex < 0 || targetColumnIndex >= board.columns.length) {
        return null;
    }

    const targetColumn = board.columns[targetColumnIndex];
    const targetFlatCards = flattenColumnCards(targetColumn);
    const targetFlatIndex = Math.min(
        location.flatIndex,
        targetFlatCards.length,
    );

    if (!targetFlatCards.length) {
        const matchingSection = location.section.slug
            ? targetColumn.sections.find(
                  (section) => section.slug === location.section.slug,
              )
            : targetColumn.sections.find((section) => section.slug === null);

        return {
            cardSlug:
                board.columns[location.columnIndex].sections[
                    location.sectionIndex
                ].cards[location.cardIndex].slug,
            targetColumnName: targetColumn.name,
            targetColumnSlug: targetColumn.slug,
            targetSectionName: matchingSection?.name ?? null,
            targetSectionSlug: matchingSection?.slug ?? null,
            targetIndex: 0,
        };
    }

    if (targetFlatIndex === targetFlatCards.length) {
        const lastCard = targetFlatCards[targetFlatCards.length - 1];
        return {
            cardSlug:
                board.columns[location.columnIndex].sections[
                    location.sectionIndex
                ].cards[location.cardIndex].slug,
            targetColumnName: targetColumn.name,
            targetColumnSlug: targetColumn.slug,
            targetSectionName: lastCard.section.name,
            targetSectionSlug: lastCard.section.slug,
            targetIndex: lastCard.cardIndex + 1,
        };
    }

    const targetCard = targetFlatCards[targetFlatIndex];
    return {
        cardSlug:
            board.columns[location.columnIndex].sections[location.sectionIndex]
                .cards[location.cardIndex].slug,
        targetColumnName: targetColumn.name,
        targetColumnSlug: targetColumn.slug,
        targetSectionName: targetCard.section.name,
        targetSectionSlug: targetCard.section.slug,
        targetIndex: targetCard.cardIndex,
    };
}

function flattenColumnCards(
    column: NonNullable<typeof currentBoard.value>["columns"][number],
) {
    return column.sections.flatMap((section) =>
        section.cards.map((card, cardIndex) => ({
            cardIndex,
            section,
            slug: card.slug,
        })),
    );
}

watch(currentBoard, (board) => {
    if (!board || !selectedColumnState.value) {
        return;
    }

    if (
        !board.columns.some(
            (column) => column.slug === selectedColumnState.value,
        )
    ) {
        selectedColumnState.value = null;
    }
});

watch(
    () => workspace.value?.rootPath,
    (rootPath, previousRootPath) => {
        if (previousRootPath && rootPath !== previousRootPath) {
            actionHistory.clear();
        }
    },
);
</script>

<template>
    <div class="app-shell">
        <AppHeader
            :board-lineage="boardLineage"
            :child-boards="childBoards"
            @select-board="selectBoard"
        />

        <AppMessageBanner
            v-if="appMessage"
            :kind="appMessage.kind"
            :message="appMessage.text"
            @close="dismissAppMessage"
        />

        <main class="app-shell__main">
            <div v-if="currentBoard" class="app-shell__panel">
                <BoardCanvas
                    :board="currentBoard"
                    :boards-by-slug="workspace?.boardsBySlug ?? {}"
                    :board-files-by-slug="workspace?.boardFilesBySlug ?? {}"
                    :cards-by-slug="workspace?.cardsBySlug ?? {}"
                    :selected-column-slug="selectedColumnSlug"
                    :selected-card-keys="boardSelection.selectedKeys.value"
                    :view-preferences="viewPreferences"
                    :workspace-root="workspace?.rootPath ?? null"
                    @activate-card="handleCardActivate"
                    @add-column="createColumn"
                    @clear-selections="clearSelections"
                    @create-card="createCardFromBoard"
                    @move-card="handleCardMove"
                    @open-card="openCard"
                    @reorder-columns="handleColumnReorder"
                    @rename-board="handleBoardRename"
                    @rename-column="handleColumnRename"
                    @select-column="handleColumnSelect"
                    @toggle-archive-column="toggleArchiveColumn"
                    @toggle-sub-boards="toggleSubBoards"
                    @update-view-preferences="updateViewPreferences"
                    @update-visible-cards="handleVisibleCards"
                />
            </div>

            <section v-else class="app-shell__state">
                <div class="app-shell__state-eyebrow">
                    Built by and for devs
                </div>
                <h1 class="app-shell__state-title">KanStack</h1>
                <p class="app-shell__state-copy">{{ emptyStateCopy }}</p>
                <div class="app-shell__state-actions">
                    <button
                        class="app-shell__state-button"
                        type="button"
                        @click="openWorkspaceFromMenu"
                    >
                        open board
                    </button>
                    <button
                        class="app-shell__state-button app-shell__state-button--primary"
                        type="button"
                        :disabled="appBoardActions.isCreatingBoard.value"
                        @click="createBoardFromWorkspace"
                    >
                        {{
                            appBoardActions.isCreatingBoard.value
                                ? "creating..."
                                : "new board"
                        }}
                    </button>
                </div>
            </section>
        </main>

        <CardEditorModal
            :card="selectedCard"
            :board-files-by-slug="workspace?.boardFilesBySlug ?? {}"
            :boards-by-slug="workspace?.boardsBySlug ?? {}"
            :cards-by-slug="workspace?.cardsBySlug ?? {}"
            :open="Boolean(selectedCardSlug)"
            :source-board="selectedCardSourceBoard"
            :workspace-root="workspace?.rootPath ?? null"
            @archive-card="archiveSingleCard"
            @apply-workspace-mutation="applyWorkspaceMutation"
            @close="closeCard"
            @delete-card="deleteSingleCard"
        />
    </div>
</template>

<style scoped>
.app-shell {
    height: 100%;
    display: flex;
    flex-direction: column;
}

.app-shell__main {
    flex: 1;
    min-height: 0;
    padding: 1.25rem;
}

.app-shell__panel,
.app-shell__state {
    height: 100%;
    border: 1px solid var(--shade-3);
    background: rgba(20, 20, 20, 0.9);
}

.app-shell__panel {
    padding: 1rem;
}

.app-shell__state {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    gap: 1rem;
    padding: min(8vw, 4rem);
}

.app-shell__state-eyebrow {
    color: var(--shade-4);
    font-size: 0.98rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
}

.app-shell__state-title {
    margin: 0;
    font-size: clamp(1.8rem, 3vw, 3rem);
}

.app-shell__state-copy {
    max-width: 34rem;
    margin: 0;
    color: var(--shade-4);
    line-height: 1.7;
}

.app-shell__state-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
}

.app-shell__state-button {
    padding: 0.8rem 1rem;
    border: 1px solid var(--shade-3);
    background: var(--shade-2);
    color: var(--shade-5);
    font: inherit;
    text-transform: uppercase;
    letter-spacing: 0.08em;
}

.app-shell__state-button:hover {
    border-color: var(--shade-5);
}

.app-shell__state-button--primary {
    background: var(--shade-5);
    color: var(--shade-1);
}

.app-shell__state-button--primary:hover {
    background: #ffffff;
}

.app-shell__state-button:disabled {
    opacity: 0.65;
    cursor: not-allowed;
}
</style>
