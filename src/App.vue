<template>
  <div id="app" class="app">
    <NCard class="card">
      <Metronome />
    </NCard>
  </div>
</template>

<script setup>
import Metronome from './components/MetronomeControl.vue';
import { NCard } from 'naive-ui';
</script>

<style scoped>
.card {
  width: 380px;
  margin: 0 auto;
  box-shadow: 0 0 25px rgba(0, 0, 0, 0.1);
}
</style>
