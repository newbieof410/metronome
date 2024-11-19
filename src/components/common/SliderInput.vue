<template>
  <div style="text-align: center">
    <canvas
      ref="canvas"
      :width="width"
      :height="height"
      class="slider"
      @mousedown="handleMouseDown"
      @mousemove="handleMouseMove"
      @mouseup="handleMouseUp"
      @mouseleave="handleLeave"
      @touchstart="handleMouseDown"
      @touchmove="handleMouseMove"
      @touchend="handleMouseUp"
    ></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';

const props = defineProps({
  modelValue: {
    type: Number,
    default: 80,
  },
  minValue: {
    type: Number,
    default: 0,
  },
  maxValue: {
    type: Number,
    default: 200,
  },
  strokeStyle: {
    type: String,
    default: 'rgb(248,186,170)',
  },
  strokeStyleActive: {
    type: String,
    default: 'rgb(239,103,92)',
  },
  text: {
    type: String,
  },
  textFont: {
    type: String,
    default: '60px "Noto Music", sans-serif',
  },
});

const canvas = ref(null);

// 圆心和半径
const margin = 10;
const radius = 150;
const centerX = radius + margin;
const centerY = radius + margin;
const knobRadius = 8;

const width = computed(() => (radius + margin) * 2);
const height = computed(() => radius + margin * 2);

const angle = ref(
  (Math.PI - ((props.modelValue - props.minValue) / (props.maxValue - props.minValue)) * Math.PI) *
    -1,
);
let canvasCtx = null;
let dragging = false; // 是否正在拖动滑块

const emit = defineEmits(['update:modelValue', 'change']);

watch(
  () => props.text,
  () => {
    drawSlider(canvasCtx);
  },
);

const setupCanvas = (canvas) => {
  const ctx = canvas.getContext('2d');

  // 获取设备像素比
  const dpr = window.devicePixelRatio || 1;

  // 获取 CSS 样式的宽高
  const rect = canvas.getBoundingClientRect();

  // 设置实际像素大小
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;

  // 使用 CSS 控制显示大小
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;

  // 缩放绘图上下文
  ctx.scale(dpr, dpr);

  return ctx;
};

// 绘制滑块
function drawSlider(ctx) {
  ctx.clearRect(0, 0, width.value, height.value);

  // 绘制半圆
  const activeAngle = 2 * Math.PI + angle.value;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, Math.PI, activeAngle, false);
  ctx.lineWidth = 4;
  ctx.strokeStyle = props.strokeStyleActive;
  ctx.stroke();

  if (angle.value != 0) {
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, activeAngle, 0, false);
    ctx.lineWidth = 4;
    ctx.strokeStyle = props.strokeStyle;
    ctx.stroke();
  }

  // 计算滑块点的位置
  const knobX = centerX + radius * Math.cos(angle.value);
  const knobY = centerY + radius * Math.sin(angle.value);

  // 绘制滑块点
  ctx.beginPath();
  ctx.arc(knobX, knobY, knobRadius, 0, Math.PI * 2);
  ctx.fillStyle = props.strokeStyleActive;
  ctx.fill();

  updateText(ctx);
}

function updateText(ctx) {
  // 在半圆内部绘制当前值
  if (props.text) {
    ctx.font = props.textFont;
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    const offset = 15;
    ctx.fillText(props.text, centerX, centerY + offset);
  }
}

function updateKnob(clientX, clientY, ctx) {
  const rect = canvas.value.getBoundingClientRect();
  const mouseX = clientX - rect.left;
  const mouseY = clientY - rect.top;

  // 计算鼠标与圆心的相对角度
  let newAngle = Math.atan2(mouseY - centerY, mouseX - centerX);

  if (newAngle > 0) {
    if (mouseX > centerX) {
      newAngle = 0;
    } else {
      newAngle = -Math.PI;
    }
  }

  angle.value = newAngle;

  const newValue = Math.round(
    props.minValue + (1 - Math.abs(angle.value) / Math.PI) * (props.maxValue - props.minValue),
  );
  emit('update:modelValue', newValue);

  // 重新绘制滑块
  drawSlider(ctx);
}

function handleMove(event, ctx) {
  let clientX;
  let clientY;

  if (event.type.startsWith('touch')) {
    clientX = event.touches[0].clientX;
    clientY = event.touches[0].clientY;
  } else {
    clientX = event.clientX;
    clientY = event.clientY;
  }

  updateKnob(clientX, clientY, ctx);
}

function throttle(func, delay) {
  let lastTime = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastTime > delay) {
      lastTime = now;
      func.apply(this, args);
    }
  };
}

const throttledHandleMove = throttle(handleMove, 30);

const handleMouseDown = (event) => {
  dragging = true;
  event.preventDefault();
};

const handleMouseMove = (event) => {
  if (dragging) {
    throttledHandleMove(event, canvasCtx);
  }
};

const handleMouseUp = () => {
  dragging = false;
  emit('change', props.modelValue);
};

const handleLeave = () => {
  if (dragging) {
    emit('change', props.modelValue);
  }
  dragging = false;
};

onMounted(() => {
  canvasCtx = setupCanvas(canvas.value);
  drawSlider(canvasCtx);
});
</script>

<style scoped>
.slider {
  display: block;
  margin: 0 auto;
  cursor: pointer;
}
</style>
