<template>
  <!-- 用 route.fullPath 作为 key，强制切换布局时重新渲染 -->
  <router-view :key="$route.fullPath" />
</template>

<script setup>
</script>

<style>
html, body, #app {
  height: 100%;
  margin: 0;
  padding: 0;
}
</style>
