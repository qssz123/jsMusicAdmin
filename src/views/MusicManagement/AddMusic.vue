<template>
  <el-card class="add-music-card">
    <h2>添加音乐</h2>
    <el-form ref="musicFormRef" :model="musicForm" :rules="rules" label-width="120px">
      <!-- 音乐名称 -->
      <el-form-item label="音乐名称" prop="name">
        <el-input v-model="musicForm.name" placeholder="请输入音乐名称" />
      </el-form-item>

      <!-- 音乐分类 -->
      <el-form-item label="音乐分类" prop="category">
        <el-select v-model="musicForm.category" placeholder="请选择分类">
          <el-option
            v-for="item in categoryList"
            :key="item.id"
            :label="item.categoryName"
            :value="item.id"
          />
        </el-select>
      </el-form-item>

      <!-- 音乐简介 -->
      <el-form-item label="音乐简介" prop="description">
        <el-input type="textarea" v-model="musicForm.description" placeholder="请输入音乐简介" />
      </el-form-item>

      <!-- 创作者 -->
      <el-form-item label="创作者" prop="author">
        <el-input v-model="musicForm.author" placeholder="请输入创作者" disabled />
      </el-form-item>

      <!-- 封面上传 -->
      <el-form-item label="封面上传" prop="cover">
        <div class="cover-upload-wrapper">
          <!-- 上传按钮，当没有上传图片时显示 -->
          <el-upload
            v-if="!musicForm.cover"
            class="upload-demo"
            action="/api/admin/oss/upload"
            :headers="uploadHeaders"
            :before-upload="beforeCoverUpload"
            :show-file-list="false"
            list-type="picture-card"
            @progress="onCoverUploading"
            @success="onCoverSuccess"
            @error="onCoverError"
          >
            <i class="el-icon-plus"></i>
          </el-upload>

          <!-- 预览图，当有图片时显示 -->
          <div v-else class="cover-preview">
            <img :src="musicForm.cover" alt="封面预览" class="cover-image" />
            <span class="delete-icon" @click="removeCover">×</span>
          </div>
        </div>
      </el-form-item>

      <!-- 音乐上传 -->
      <el-form-item label="音乐上传" prop="musicFile">
        <el-upload
          class="upload-demo"
          action="/api/admin/oss/upload"
          :headers="uploadHeaders"
          :before-upload="beforeMusicUpload"
          :limit="1"
          :file-list="musicFileList"
          :show-file-list="true"
          @progress="onMusicUploading"
          @success="onMusicSuccess"
          @error="onMusicError"
        >
          <el-button size="small" type="primary">点击上传</el-button>
        </el-upload>
      </el-form-item>

      <!-- 音乐歌词 -->
      <el-form-item label="音乐歌词" prop="lyrics">
        <el-input type="textarea" v-model="musicForm.lyrics" placeholder="请输入歌词" />
      </el-form-item>

      <!-- 按钮 -->
      <el-form-item>
        <el-button type="primary" @click="submitForm">提交</el-button>
        <el-button type="success" @click="recharge">重置</el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { addMusic, getCategoryList } from '@/api/music'
import { useUserStoreWithOut } from '@/store/modules/user'
import { useRouter } from 'vue-router'

const router = useRouter()
const userStore = useUserStoreWithOut()
const token = userStore.getToken
// 上传状态
const isCoverUploading = ref(false)
const isMusicUploading = ref(false)
// 封面上传状态
const onCoverUploading = () => {
  isCoverUploading.value = true
}
const onCoverSuccess = (response, file) => {
  isCoverUploading.value = false
  musicForm.cover = response.data || file.url || ''
}
const onCoverError = () => {
  isCoverUploading.value = false
}

// 音乐上传状态
const onMusicUploading = () => {
  isMusicUploading.value = true
}
const onMusicSuccess = (response, file) => {
  isMusicUploading.value = false
  musicForm.musicFile = response.data || file.url || ''
  musicFileList.value = [file]
}
const onMusicError = () => {
  isMusicUploading.value = false
}
const uploadHeaders = ref({
  Authorization: `Bearer ${token}`
})

const musicFormRef = ref(null)
const musicForm = reactive({
  name: '',
  category: '',
  description: '',
  author: userStore.getUserInfo.username,
  cover: '',
  musicFile: '',
  lyrics: ''
})

const categoryList = ref([])

const rules = {
  name: [{ required: true, message: '请输入音乐名称', trigger: 'blur' }],
  category: [{ required: true, message: '请选择音乐分类', trigger: 'change' }],
  description: [{ required: true, message: '请输入音乐简介', trigger: 'blur' }],
  author: [{ required: true, message: '请输入创作者', trigger: 'blur' }],
  cover: [{ required: true, message: '请上传封面', trigger: 'change' }],
  // musicFile: [{ required: true, message: '请上传音乐文件', trigger: 'change' }],
  lyrics: [{ required: true, message: '请输入音乐歌词', trigger: 'blur' }]
}

const beforeMusicUpload = (file) => {
  const isAudio = file.type.startsWith('audio/')
  if (!isAudio) {
    ElMessage.error('只能上传音频文件')
  }
  return isAudio
}

const coverFileList = ref([])
const musicFileList = ref([])

const handleCoverSuccess = (response, file) => {
  musicForm.cover = response.data || file.url || ''
  coverFileList.value = [file]
}

const handleMusicSuccess = (response, file) => {
  musicForm.musicFile = response.data || file.url || ''
  musicFileList.value = [file]
}

const getMusicCategories = async () => {
  const res = await getCategoryList()
  categoryList.value = res.data
}

function transformToApiPayload(form, uploaderId) {
  return {
    userName: form.author,
    musicName: form.name,
    categoryId: Number(form.category),
    description: form.description,
    uploaderId,
    coverImage: form.cover,
    musicFile: form.musicFile,
    lyrics: form.lyrics
  }
}

const submitForm = () => {
  musicFormRef.value.validate(async (valid) => {
    if (!valid) {
      ElMessage.error('请完整填写表单信息！')
      return
    }

    // 检查上传状态
    if (isCoverUploading.value || isMusicUploading.value) {
      ElMessage.warning('请等待上传完成后再提交！')
      return
    }

    try {
      const res = await addMusic(transformToApiPayload(musicForm, 123))
      ElMessage.success('音乐已提交！')
      router.push('/musicManagement/musicView')
    } catch (error) {
      ElMessage.error('提交失败，请稍后重试')
    }
  })
}

const recharge = () => {
  ElMessage.info('充值功能待实现')
}

onMounted(() => {
  getMusicCategories()
})
</script>

<style scoped>
.cover-upload-wrapper {
  display: flex;
  align-items: center;
}

.cover-preview {
  position: relative;
  display: inline-block;
}

.cover-image {
  width: 148px;
  height: 148px;
  object-fit: cover;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: 0.3s;
}

/* 初始隐藏 × */
.delete-icon {
  position: absolute;
  top: -6px;
  right: -6px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  text-align: center;
  line-height: 20px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
}

/* hover 时显示 × */
.cover-preview:hover .delete-icon {
  opacity: 1;
}

.delete-icon:hover {
  background: rgba(255, 0, 0, 0.8);
}

.upload-demo {
  display: inline-block;
}
</style>
