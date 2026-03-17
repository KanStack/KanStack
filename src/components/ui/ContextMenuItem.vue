<script setup lang="ts">
defineProps<{
    disabled?: boolean;
}>();

const emit = defineEmits<{
    click: [];
}>();

function handleClick(event: MouseEvent) {
    if ((event.currentTarget as HTMLButtonElement)?.disabled) {
        return;
    }
    emit("click");
}
</script>

<template>
    <button
        type="button"
        class="context-menu-item w-full px-3 py-1.5 text-left text-sm text-text hover:bg-surface-1 disabled:text-text-muted disabled:hover:bg-transparent"
        :disabled="disabled"
        @click="handleClick"
    >
        <slot />
    </button>
</template>