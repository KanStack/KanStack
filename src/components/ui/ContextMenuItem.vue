<script setup lang="ts">
defineProps<{
    disabled?: boolean;
    shortcut?: string;
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
        class="context-menu-item flex items-center w-full px-3 py-1.5 text-left text-sm text-text hover:bg-surface-1 disabled:text-text-muted disabled:hover:bg-transparent"
        :disabled="disabled"
        @click="handleClick"
    >
        <span><slot /></span>
        <span v-if="shortcut" class="ml-auto pl-4 text-sm text-text-muted">{{ shortcut }}</span>
    </button>
    </template>