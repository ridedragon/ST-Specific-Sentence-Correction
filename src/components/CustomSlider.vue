<template>
  <div ref="sliderRef" class="custom-slider" @click="handleClick">
    <div class="track">
      <div class="track-fill" :style="{ width: fillWidth }"></div>
    </div>
    <div
      class="thumb"
      :style="{ left: fillWidth }"
      @mousedown.prevent="startDrag"
      @touchstart.prevent="startDrag"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue';

const props = defineProps<{
  modelValue: number;
  min: number;
  max: number;
  step: number;
}>();

const emit = defineEmits(['update:modelValue']);

const sliderRef = ref<HTMLElement | null>(null);

const percentage = computed(() => {
  const range = props.max - props.min;
  if (range === 0) return 0;
  return (props.modelValue - props.min) / range;
});

const fillWidth = computed(() => `${Math.max(0, Math.min(1, percentage.value)) * 100}%`);

function updateValueFromPosition(clientX: number) {
  if (!sliderRef.value) return;

  const rect = sliderRef.value.getBoundingClientRect();
  const newPercentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  
  let rawValue = props.min + newPercentage * (props.max - props.min);

  // Snap to the nearest step
  const steps = (rawValue - props.min) / props.step;
  const closestStep = Math.round(steps);
  let newValue = props.min + closestStep * props.step;

  // Clamp to min/max to be safe
  newValue = Math.max(props.min, Math.min(props.max, newValue));

  // Avoid emitting the same value repeatedly
  if (newValue !== props.modelValue) {
    // Use toFixed to handle floating point inaccuracies, then convert back to number
    const precision = String(props.step).split('.')[1]?.length || 0;
    emit('update:modelValue', parseFloat(newValue.toFixed(precision)));
  }
}

function handleClick(event: MouseEvent) {
  updateValueFromPosition(event.clientX);
}

function handleDrag(event: MouseEvent | TouchEvent) {
  const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
  updateValueFromPosition(clientX);
}

function stopDrag() {
  window.removeEventListener('mousemove', handleDrag);
  window.removeEventListener('touchmove', handleDrag);
  window.removeEventListener('mouseup', stopDrag);
  window.removeEventListener('touchend', stopDrag);
}

function startDrag() {
  window.addEventListener('mousemove', handleDrag);
  window.addEventListener('touchmove', handleDrag);
  window.addEventListener('mouseup', stopDrag);
  window.addEventListener('touchend', stopDrag);
}

onUnmounted(() => {
  // Clean up global event listeners if the component is ever destroyed while dragging
  stopDrag();
});
</script>

<style scoped>
.custom-slider {
  position: relative;
  width: 100%;
  height: 20px; /* Provides click/touch area */
  display: flex;
  align-items: center;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent; /* Disable tap highlight on mobile */
}

.track {
  position: absolute;
  width: 100%;
  height: 4px;
  background-color: #555;
  border-radius: 2px;
}

.track-fill {
  height: 100%;
  background-color: #4CAF50;
  border-radius: 2px;
}

.thumb {
  position: absolute;
  width: 16px;
  height: 16px;
  background-color: #f1f1f1;
  border: 2px solid #4CAF50;
  border-radius: 50%;
  transform: translateX(-50%); /* Center the thumb over the track-fill end */
  z-index: 1;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}
</style>
