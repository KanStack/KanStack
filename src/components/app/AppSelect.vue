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
    <div ref="root" class="relative shrink-0 w-40">
        <button
            class="btn flex items-center justify-between gap-2 w-full"
            type="button"
            :aria-expanded="isOpen"
            :aria-label="ariaLabel"
            @click="toggleOpen"
        >
            <span class="truncate normal-case">{{ selectedLabel }}</span>
            <span class="text-text-muted text-sm leading-none shrink-0" aria-hidden="true">+</span>
        </button>

        <div
            v-if="isOpen"
            class="absolute top-[calc(100%+0.25rem)] left-0 z-20 flex flex-col gap-0.5 min-w-full max-h-64 p-1 border border-border bg-surface-1 shadow-lg overflow-y-auto"
            role="listbox"
            :aria-label="ariaLabel"
        >
            <button
                v-for="option in options"
                :key="option.value"
                class="btn w-full text-left normal-case"
                :class="{ 'border-text bg-border': option.value === modelValue }"
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


