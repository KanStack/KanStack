<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";

export interface AppSelectOption {
    label: string;
    value: string;
}

const props = defineProps<{
    ariaLabel: string;
    modelValue: string;
    options: AppSelectOption[];
}>();

const emit = defineEmits<{
    "update:modelValue": [value: string];
}>();

const isOpen = ref(false);
const root = ref<HTMLElement | null>(null);

const selectedLabel = computed(() => {
    return (
        props.options.find((option) => option.value === props.modelValue)
            ?.label ??
        props.options[0]?.label ??
        ""
    );
});

function toggleOpen() {
    isOpen.value = !isOpen.value;
}

function selectOption(value: string) {
    emit("update:modelValue", value);
    isOpen.value = false;
}

function handleDocumentPointerDown(event: PointerEvent) {
    if (!root.value?.contains(event.target as Node)) {
        isOpen.value = false;
    }
}

function handleDocumentKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
        isOpen.value = false;
    }
}

watch(
    () => props.modelValue,
    () => {
        isOpen.value = false;
    },
);

onMounted(() => {
    document.addEventListener("pointerdown", handleDocumentPointerDown);
    document.addEventListener("keydown", handleDocumentKeydown);
});

onUnmounted(() => {
    document.removeEventListener("pointerdown", handleDocumentPointerDown);
    document.removeEventListener("keydown", handleDocumentKeydown);
});
</script>

<template>
    <div ref="root" class="app-select">
        <button
            class="app-select__trigger"
            type="button"
            :aria-expanded="isOpen"
            :aria-label="ariaLabel"
            @click="toggleOpen"
        >
            <span class="app-select__label">{{ selectedLabel }}</span>
            <span class="app-select__caret" aria-hidden="true">+</span>
        </button>

        <div
            v-if="isOpen"
            class="app-select__menu"
            role="listbox"
            :aria-label="ariaLabel"
        >
            <button
                v-for="option in options"
                :key="option.value"
                class="app-select__option"
                :class="{
                    'app-select__option--selected': option.value === modelValue,
                }"
                type="button"
                role="option"
                :aria-selected="option.value === modelValue"
                @click="selectOption(option.value)"
            >
                {{ option.label }}
            </button>
        </div>
    </div>
</template>

<style scoped>
.app-select {
    position: relative;
    width: 9rem;
    flex: 0 0 9rem;
}

.app-select__trigger,
.app-select__option {
    width: 100%;
    border: 1px solid var(--shade-3);
    background: var(--shade-2);
    color: var(--shade-5);
    font: inherit;
    font-size: 0.72rem;
}

.app-select__trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    min-height: 2.1rem;
    padding: 0.45rem 0.65rem;
}

.app-select__trigger:hover,
.app-select__option:hover,
.app-select__option--selected {
    border-color: var(--shade-5);
    background: var(--shade-3);
}

.app-select__label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.app-select__caret {
    color: var(--shade-4);
    font-size: 0.8rem;
    line-height: 1;
}

.app-select__menu {
    position: absolute;
    top: calc(100% + 0.25rem);
    left: 0;
    z-index: 20;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    min-width: 100%;
    max-height: calc((2.1rem * 6) + (0.2rem * 5) + 0.5rem);
    padding: 0.25rem;
    border: 1px solid var(--shade-3);
    background: rgba(15, 15, 15, 0.98);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.35);
    overflow-y: auto;
}

.app-select__option {
    padding: 0.5rem 0.65rem;
    text-align: left;
}
</style>
