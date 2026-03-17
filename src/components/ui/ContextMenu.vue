<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";

const props = defineProps<{
    x: number;
    y: number;
    visible: boolean;
}>();

const emit = defineEmits<{
    close: [];
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
            class="context-menu fixed z-50 min-w-48 border border-border/60 bg-surface shadow-lg"
            :style="{ left: `${adjustedPosition.x}px`, top: `${adjustedPosition.y}px` }"
        >
            <slot />
        </div>
    </Teleport>
</template>

<style scoped>
.context-menu {
    padding: 0.25rem 0;
}
</style>