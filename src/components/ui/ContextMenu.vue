<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";

import ContextMenuItem from "./ContextMenuItem.vue";

import type { ContextMenuItem as MenuItem } from "@/composables/useContextMenuActions";

const props = defineProps<{
    x: number;
    y: number;
    visible: boolean;
    items: MenuItem[];
}>();

const emit = defineEmits<{
    close: [];
    action: [action: (() => void | Promise<void>) | undefined];
}>();

const menuRef = ref<HTMLElement | null>(null);

const adjustedPosition = computed(() => {
    if (!menuRef.value) {
        return { x: props.x, y: props.y };
    }

    const menu = menuRef.value;
    const menuWidth = menu.offsetWidth || 200;
    const menuHeight = menu.offsetHeight || 100;

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let x = props.x;
    let y = props.y;

    if (x + menuWidth > windowWidth - 8) {
        x = windowWidth - menuWidth - 8;
    }

    if (y + menuHeight > windowHeight - 8) {
        y = windowHeight - menuHeight - 8;
    }

    x = Math.max(8, x);
    y = Math.max(8, y);

    return { x, y };
});

function handleClickOutside(event: MouseEvent) {
    if (!props.visible) {
        return;
    }

    const target = event.target as HTMLElement;
    if (menuRef.value && !menuRef.value.contains(target)) {
        emit("close");
    }
}

function handleEscape(event: KeyboardEvent) {
    if (event.key === "Escape" && props.visible) {
        emit("close");
    }
}

function handleAction(item: MenuItem) {
    if (item.action) {
        emit("action", item.action);
    }
    emit("close");
}

onMounted(() => {
    document.addEventListener("click", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
});

onUnmounted(() => {
    document.removeEventListener("click", handleClickOutside);
    document.removeEventListener("keydown", handleEscape);
});
</script>

<template>
    <Teleport to="body">
        <div
            v-if="visible"
            ref="menuRef"
            class="context-menu fixed z-50 w-56 border border-border/60 bg-surface shadow-lg"
            :style="{ left: `${adjustedPosition.x}px`, top: `${adjustedPosition.y}px` }"
        >
            <template v-for="(item, index) in items" :key="index">
                <div
                    v-if="item.divider"
                    class="border-t border-border/60 my-1"
                ></div>
                <div
                    v-else-if="!item.action"
                    class="px-3 py-1.5 text-sm text-text-muted"
                >
                    {{ item.label }}
                </div>
                <ContextMenuItem
                    v-else
                    :shortcut="item.shortcut"
                    @click="handleAction(item)"
                >
                    {{ item.label }}
                </ContextMenuItem>
            </template>
        </div>
    </Teleport>
</template>

<style scoped>
.context-menu {
    padding: 0.25rem 0;
}
</style>