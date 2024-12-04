<template>
  <n-flex class="metronome" justify="center" :vertical="true">
    <n-grid :cols="3" x-gap="20" class="settings">
      <n-gi span="2">
        <div class="label">拍号：</div>
        <div class="time-signature">
          <n-input-number
            v-model:value="timeSignature.numerator"
            :min="minTimeSignature"
            :max="maxTimeSignature"
            button-placement="both"
            class="time-signature-input"
          />
          <p>/</p>
          <n-input-number
            v-model:value="timeSignature.denominator"
            :min="minTimeSignature"
            :max="maxTimeSignature"
            :step="timeSignatureStep"
            button-placement="both"
            class="time-signature-input"
          />
        </div>
      </n-gi>
      <n-gi>
        <div class="label">单位音符：</div>
        <n-select v-model:value="unitNote" :options="beatUnitOptions" :filterable="true">
        </n-select>
      </n-gi>
    </n-grid>

    <n-flex class="slider" justify="center" :vertical="true">
      <SliderInput
        v-model="bpm"
        :min-value="minBpm"
        :max-value="maxBpm"
        :text="tempoText"
        @change="handleBpmChange"
      />
      <p>BPM</p>
    </n-flex>

    <div class="visual-container">
      <div class="visual">
        <div
          class="beat-indicator"
          v-for="(dot, index) in numBeats"
          :key="index"
          :class="{ active: isPlaying && currentBeat === index }"
        ></div>
      </div>
      <p>{{ currentBeat + 1 }}</p>
    </div>

    <n-card content-style="margin: 0 auto;">
      <n-button :type="isPlaying ? 'error' : 'primary'" @click="togglePlay" circle
        ><template #icon
          ><n-icon v-if="isPlaying"><Stop /></n-icon> <n-icon v-else><Play /></n-icon> </template
      ></n-button>
    </n-card>
  </n-flex>
</template>

<script setup>
import Worker from '../workers/timeWorker.js?worker';
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { beatUnits, noteDuration, getBeatUnit } from '../metronome.js';
import SliderInput from './common/SliderInput.vue';
import { NFlex, NButton, NIcon, NCard, NInputNumber, NSelect, NGrid, NGi } from 'naive-ui';
import { Play, Stop } from '@vicons/ionicons5';

// 响应式状态
const bpm = ref(80); // 当前 BPM
const lastBpm = ref(bpm.value); // 记录上个 bpm 数值
const isPlaying = ref(false); // 播放状态
const currentBeat = ref(0); // 当前拍
let nextBeat = 0; // 下一拍
const noteLength = 0.04; // 音符长度（单位：秒）
let nextBeatTime = 0.0; // 下一拍的时间（AudioContext 时间）
const scheduleAheadTime = 0.1; // 调度提前时间（单位：秒）

const minTimeSignature = 1;
const maxTimeSignature = 16;
const timeSignatureStep = 2;
const minBpm = 40;
const maxBpm = 220;

// 用户设置
const timeSignature = ref({ numerator: 4, denominator: 4 }); // 默认拍号
const unitNote = ref(4); // 默认每拍单位为四分音符

// 动态计算总拍数
const numBeats = computed(() => timeSignature.value.numerator);
const beatUnitOptions = computed(() => {
  let options = [];
  beatUnits.forEach((unit) => {
    options.push({
      label: unit.note,
      value: unit.value,
    });
  });
  return options;
});

const tempoText = computed(() => {
  const unit = getBeatUnit(unitNote.value);
  return `${unit.note}=${bpm.value}`;
});

// Web Audio API 和 Worker
let audioContext = null;
let timerWorker = null;

// 初始化音频上下文和 Worker
const initializeAudio = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  if (!timerWorker) {
    timerWorker = new Worker();
    timerWorker.onmessage = scheduler;
    timerWorker.postMessage({ interval: 25 }); // 调度间隔
  }
};

// 开始节拍器
const start = () => {
  initializeAudio();
  isPlaying.value = true;
  currentBeat.value = 0;
  nextBeatTime = audioContext.currentTime; // 从当前时间开始
  timerWorker.postMessage('start');
};

// 停止节拍器
const stop = () => {
  isPlaying.value = false;
  timerWorker.postMessage('stop');
};

// 切换播放状态
const togglePlay = () => {
  if (isPlaying.value) {
    stop();
  } else {
    start();
  }
};

// 调度逻辑
const scheduler = () => {
  while (nextBeatTime < audioContext.currentTime + scheduleAheadTime) {
    scheduleNote(nextBeat, nextBeatTime);
    advanceNote();
  }
};

// 调度节拍音效
const scheduleNote = (beatNumber, time) => {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  // 设置频率：强拍和弱拍不同
  oscillator.frequency.value = beatNumber === 0 ? 2000 : 1000;

  // 设置音量和播放时间
  gainNode.gain.linearRampToValueAtTime(0.9, time);
  gainNode.gain.linearRampToValueAtTime(0.001, time + noteLength);

  oscillator.start(time);
  oscillator.stop(time + noteLength);

  currentBeat.value = beatNumber;
};

const unitNoteDuration = computed(() => {
  const unit = getBeatUnit(unitNote.value);
  return noteDuration(lastBpm.value, timeSignature.value.denominator, unit.noteType, unit.dotted);
});

// 计算下一拍
const advanceNote = () => {
  nextBeatTime += unitNoteDuration.value;
  nextBeat = (nextBeat + 1) % numBeats.value;
};

const handleBpmChange = () => {
  lastBpm.value = bpm.value;
  if (isPlaying.value) {
    stop();
    start();
  }
};

const getUrlParams = function () {
  const params = new URLSearchParams(window.location.search);

  let bpmParam = params.get('bpm');
  if (bpmParam) {
    bpmParam = parseInt(bpmParam);
    if (bpmParam >= minBpm && bpmParam <= maxBpm) {
      bpm.value = bpmParam;
      lastBpm.value = bpm.value;
    }
  }

  let tsParam = params.get('ts');
  if (tsParam) {
    tsParam = tsParam.trim();
    try {
      const [numerator, denominator] = tsParam.split('/').map((item) => parseInt(item, 10));
      if (numerator >= minTimeSignature && numerator <= maxTimeSignature) {
        timeSignature.value.numerator = numerator;
      }
      if (
        denominator >= minTimeSignature &&
        denominator <= maxTimeSignature &&
        (denominator - minTimeSignature) % timeSignatureStep === 0
      ) {
        timeSignature.value.denominator = denominator;
      }
    } catch {
      () => {};
    }
  }

  let noteParam = params.get('note');
  if (noteParam) {
    noteParam = noteParam.trim();
    try {
      getBeatUnit(noteParam);
      unitNote.value = noteParam;
    } catch {
      () => {};
    }
  }
};

const updateUrlParams = function () {
  const params = new URLSearchParams(window.location.search);
  params.set('bpm', bpm.value);
  params.set('ts', `${timeSignature.value.numerator}/${timeSignature.value.denominator}`);
  params.set('note', unitNote.value);

  // 更新 URL，避免刷新页面
  const newUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState(null, '', newUrl);
};

watch(
  [bpm, timeSignature, unitNote],
  () => {
    updateUrlParams();
  },
  { deep: true },
);

onMounted(() => {
  getUrlParams();
  initializeAudio();
});

onBeforeUnmount(() => {
  if (timerWorker) {
    timerWorker.terminate();
  }
  if (audioContext) {
    audioContext.close();
  }
});
</script>

<style scoped>
.metronome {
  width: 320px;
  margin: 0 auto;
}

.settings .label {
  margin-bottom: 5px;
  font-weight: 600;
}

.time-signature {
  display: flex;
  align-items: center;
  gap: 5px;
}

.time-signature-input {
  text-align: center;
}

.settings,
.slider {
  margin-bottom: 20px;
}

.slider p {
  margin: 5px auto 0;
  color: #6c757d;
  font-size: 15px;
}

.visual-container {
  text-align: center;
}

.visual {
  display: flex;
  justify-content: center;
  gap: 5px;
  margin-bottom: 20px;
}

.visual-container p {
  font-weight: 600;
}

.beat-indicator {
  width: 16px;
  height: 16px;
  background: lightgray;
  border-radius: 50%;
  transition:
    transform 0.2s ease,
    background-color 0.2s ease;
}

.beat-indicator.active {
  animation: scale-up 0.5s ease-in-out;
  background-color: rgb(239, 103, 92);
}

/* 定义缩放动画 */
@keyframes scale-up {
  0% {
    transform: scale(1); /* 初始大小 */
  }
  50% {
    transform: scale(1.25); /* 放大 */
  }
  100% {
    transform: scale(1); /* 恢复原始大小 */
  }
}
</style>
