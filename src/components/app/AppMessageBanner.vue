<script setup lang="ts">
defineProps<{
  kind?: 'info' | 'error'
  message: string
}>()

defineEmits<{
  close: []
}>()
</script>

<template>
  <div class="app-message" :class="`app-message--${kind ?? 'info'}`" role="status" aria-live="polite">
    <span class="app-message__text">{{ message }}</span>
    <button class="app-message__close" type="button" aria-label="Dismiss message" @click="$emit('close')">
      x
    </button>
  </div>
</template>

<style scoped>
.app-message {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin: 0.85rem 1.25rem 0;
  padding: 0.7rem 0.9rem;
  border: 1px solid var(--shade-3);
  background: var(--shade-2);
  color: var(--shade-5);
}

.app-message--error {
  border-color: #a85c5c;
  background: rgba(110, 38, 38, 0.35);
}

.app-message__text {
  font-size: 0.82rem;
  line-height: 1.4;
}

.app-message__close {
  flex-shrink: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-transform: uppercase;
}
</style>
