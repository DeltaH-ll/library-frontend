<template>
  <el-upload class="avatar-uploader" :show-file-list="false" :on-change="handleChange" accept="image/*">
    <img v-if="imageUrl" :src="imageUrl" class="avatar" />
    <div v-else class="avatar-placeholder">
      <el-icon><User /></el-icon>
      <p>上传头像</p>
    </div>
  </el-upload>
</template>

<script setup>
import { ref } from 'vue'
import { User } from '@element-plus/icons-vue'

const imageUrl = ref('/avatars/default.png')

function handleChange(file) {
  const reader = new FileReader()
  reader.onload = e => (imageUrl.value = e.target.result)
  reader.readAsDataURL(file.raw)
}
</script>

<style scoped>
.avatar-uploader {
  border: 1px dashed #ccc;
  border-radius: 50%;
  width: 120px;
  height: 120px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition: all 0.2s;
}
.avatar-uploader:hover {
  border-color: #8bb8a8;
}
.avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.avatar-placeholder {
  text-align: center;
  color: #888;
  font-size: 14px;
}
.avatar-placeholder .el-icon {
  font-size: 36px;
  color: #bbb;
}
</style>
