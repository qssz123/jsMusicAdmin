<template>
  <el-drawer v-model="visible" size="50%" direction="rtl" :with-header="false">
    <!-- 头部 -->
    <div class="header">
      <span class="title">歌曲详情</span>
      <el-icon class="close" @click="visible = false">
        <Close />
      </el-icon>
    </div>

    <!-- 内容 -->
    <div v-if="detail" class="content">
      <h1 class="song-title">{{ detail.title }}</h1>

      <div class="meta">
        <el-tag type="primary" effect="light" style="margin-right: 10px">
          {{ detail.styles }}
        </el-tag>
        <span class="time">{{ detail.publishTime }}</span>
      </div>

      <!-- 风格标签 -->
      <!--      <div v-if="detail.styles.length > 0" class="styles">-->
      <!--        <span v-for="(style, index) in detail.styles" :key="index">-->
      <!--          <el-tag>{{ style }}</el-tag>-->
      <!--        </span>-->
      <!--      </div>-->

      <div class="lyrics">
        <pre>{{ detail.lyrics }}</pre>
      </div>
    </div>

    <el-empty v-else description="暂无数据" />
  </el-drawer>
</template>

<script setup>
import { ref, watch } from 'vue'
import { Close } from '@element-plus/icons-vue'

const props = defineProps({
  modelValue: Boolean,
  detail: Object
})

const emit = defineEmits(['update:modelValue'])

const visible = ref(props.modelValue)

watch(
  () => props.modelValue,
  (val) => (visible.value = val)
)

watch(visible, (val) => {
  emit('update:modelValue', val)
})
</script>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
}

.title {
  font-size: 16px;
  font-weight: bold;
}

.close {
  cursor: pointer;
  font-size: 18px;
}

.content {
  padding: 30px 40px;
}

.song-title {
  text-align: center;
  font-size: 28px;
  margin-bottom: 20px;
}

.meta {
  text-align: center;
  margin-bottom: 30px;
  color: #999;
}

.meta .time {
  margin-left: 10px;
  font-size: 14px;
}

.lyrics {
  max-height: calc(100vh - 260px);
  overflow-y: auto;
  text-align: center;
}

.lyrics pre {
  white-space: pre-wrap;
  font-size: 15px;
  line-height: 1.9;
  color: #333;
}
</style>
