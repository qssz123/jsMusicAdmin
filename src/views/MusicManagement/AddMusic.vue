<template>
  <div class="add-music-page">
    <!-- 上传遮罩层 -->
    <div v-if="isUploading" class="upload-mask">
      <div class="mask-content">
        <el-icon class="loading-icon"><i class="el-icon-loading"></i></el-icon>
        <p>上传文件中，请稍候...</p>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: uploadProgress + '%' }"></div>
        </div>
        <p>{{ uploadProgress }}%</p>
      </div>
    </div>

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
          <div class="upload-section">
            <!-- URL输入框放在前面 -->
            <div class="url-input-wrapper">
              <div class="url-input-header">
                <span>输入封面URL</span>
                <el-tag v-if="musicForm.cover" type="success" size="small">已设置</el-tag>
              </div>
              <el-input
                v-model="coverUrlInput"
                placeholder="请输入封面图片URL，输入后自动应用"
                clearable
                @input="handleCoverUrlInput"
                @blur="handleCoverUrlBlur"
              >
                <template #append>
                  <el-button @click="clearCoverUrl">清空</el-button>
                </template>
              </el-input>
              <div class="url-tip">输入有效的图片URL后自动应用</div>
            </div>

            <!-- 上传组件 -->
            <div class="cover-upload-wrapper">
              <div class="upload-or">或</div>
              <el-upload
                v-if="!musicForm.cover"
                class="upload-demo"
                action="/api/admin/s3/upload"
                :headers="uploadHeaders"
                :before-upload="beforeCoverUpload"
                :show-file-list="false"
                list-type="picture-card"
                @success="onCoverSuccess"
                @error="onCoverError"
              >
                <i class="el-icon-plus"></i>
              </el-upload>
              <div v-else class="cover-preview">
                <img :src="musicForm.cover" alt="封面预览" class="cover-image" />
                <span class="delete-icon" @click="removeCover">×</span>
              </div>
            </div>
          </div>
        </el-form-item>

        <!-- 音乐上传 -->
        <el-form-item label="音乐上传" prop="musicFile">
          <div class="upload-section">
            <!-- URL输入框放在前面 -->
            <div class="url-input-wrapper">
              <div class="url-input-header">
                <span>输入音乐URL</span>
                <el-tag v-if="musicForm.musicFile" type="success" size="small">已设置</el-tag>
              </div>
              <el-input
                v-model="musicUrlInput"
                placeholder="请输入音乐文件URL，输入后自动应用"
                clearable
                @input="handleMusicUrlInput"
                @blur="handleMusicUrlBlur"
              >
                <template #append>
                  <el-button @click="clearMusicUrl">清空</el-button>
                </template>
              </el-input>
              <div class="url-tip">输入有效的音频文件URL后自动应用</div>
            </div>

            <!-- 上传组件 -->
            <div class="music-upload-wrapper">
              <div class="upload-or">或</div>
              <el-upload
                class="upload-demo"
                :headers="uploadHeaders"
                :before-upload="beforeMusicUpload"
                :limit="1"
                :file-list="musicFileList"
                :show-file-list="true"
                :http-request="customMusicUpload"
                @success="onMusicSuccess"
                @error="onMusicError"
              >
                <el-button size="small" type="primary">点击上传</el-button>
                <template #tip>
                  <div class="el-upload__tip">支持 mp3, wav 格式文件</div>
                </template>
              </el-upload>
            </div>
          </div>
        </el-form-item>

        <!-- 音乐歌词 -->
        <el-form-item label="音乐歌词" prop="lyrics">
          <el-input
            type="textarea"
            v-model="musicForm.lyrics"
            placeholder="请输入歌词或LRC格式歌词"
            :rows="6"
          />
        </el-form-item>

        <!-- 按钮 -->
        <el-form-item>
          <el-button type="primary" @click="submitForm">提交</el-button>
          <el-button type="success" @click="recharge">重置</el-button>
          <span style="margin-left: 60px; line-height: 20px">
            音乐创作平台推荐suno：
            <a href="https://suno.cn" target="_blank">https://suno.cn</a><br />
            歌词生成lrc推荐地址：
            <a href="https://sanmusen214.github.io/web_lyric_editor/" target="_blank"
              >https://sanmusen214.github.io/web_lyric_editor/</a
            >
          </span>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { addMusic, getCategoryList } from '@/api/music'
import { useUserStoreWithOut } from '@/store/modules/user'
import { useRouter } from 'vue-router'

const router = useRouter()
const userStore = useUserStoreWithOut()
const token = userStore.getToken

// 上传状态
const isUploading = ref(false)
const uploadProgress = ref(0)

// URL输入框的值
const coverUrlInput = ref('')
const musicUrlInput = ref('')

// 防抖定时器
let coverUrlTimer = null
let musicUrlTimer = null

const uploadHeaders = ref({ Authorization: `Bearer ${token}` })
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
  musicFile: [{ required: true, message: '请上传音乐', trigger: 'change' }],
  lyrics: [{ required: true, message: '请输入音乐歌词', trigger: 'blur' }]
}

const musicFileList = ref([])

// 封面URL输入处理
const handleCoverUrlInput = (value) => {
  // 清除之前的定时器
  if (coverUrlTimer) {
    clearTimeout(coverUrlTimer)
  }

  // 设置新的定时器，延迟500ms后自动应用
  coverUrlTimer = setTimeout(() => {
    applyCoverUrl(value)
  }, 800)
}

const handleCoverUrlBlur = () => {
  // 输入框失去焦点时立即应用
  if (coverUrlInput.value) {
    applyCoverUrl(coverUrlInput.value)
  }
}

// 音乐URL输入处理
const handleMusicUrlInput = (value) => {
  // 清除之前的定时器
  if (musicUrlTimer) {
    clearTimeout(musicUrlTimer)
  }

  // 设置新的定时器，延迟500ms后自动应用
  musicUrlTimer = setTimeout(() => {
    applyMusicUrl(value)
  }, 800)
}

const handleMusicUrlBlur = () => {
  // 输入框失去焦点时立即应用
  if (musicUrlInput.value) {
    applyMusicUrl(musicUrlInput.value)
  }
}

// 应用封面URL
const applyCoverUrl = (url) => {
  if (!url) {
    return
  }

  // 简单验证URL格式
  if (!isValidUrl(url)) {
    // 不显示错误，因为用户可能正在输入
    return
  }

  // 验证图片格式
  const imageExt = url.toLowerCase().split('.').pop()
  const allowedImageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp']
  if (!allowedImageExts.includes(imageExt)) {
    ElMessage.warning('请输入支持的图片格式URL (jpg, png, gif, webp, bmp)')
    return
  }

  // 设置封面URL并预览
  musicForm.cover = url
  musicFormRef.value.clearValidate(['cover'])
  ElMessage.success('封面URL已自动应用')
}

// 应用音乐URL
const applyMusicUrl = (url) => {
  if (!url) {
    return
  }

  // 简单验证URL格式
  if (!isValidUrl(url)) {
    // 不显示错误，因为用户可能正在输入
    return
  }

  // 验证文件格式
  const musicExt = url.toLowerCase().split('.').pop()
  const allowedExts = ['mp3', 'wav', 'm4a', 'ogg', 'flac']
  if (!allowedExts.includes(musicExt)) {
    ElMessage.warning('请输入支持的音频文件URL (mp3, wav, m4a, ogg, flac)')
    return
  }

  // 设置音乐文件URL
  musicForm.musicFile = url
  musicFileList.value = [
    {
      name: url.split('/').pop() || '音乐文件',
      url: url
    }
  ]
  musicFormRef.value.clearValidate(['musicFile'])
  ElMessage.success('音乐文件URL已自动应用')
}

// 清空封面URL
const clearCoverUrl = () => {
  coverUrlInput.value = ''
  musicForm.cover = ''
  musicFormRef.value.clearValidate(['cover'])
}

// 清空音乐URL
const clearMusicUrl = () => {
  musicUrlInput.value = ''
  musicForm.musicFile = ''
  musicFileList.value = []
  musicFormRef.value.clearValidate(['musicFile'])
}

// 简单的URL验证函数
const isValidUrl = (string) => {
  try {
    new URL(string)
    return true
  } catch (_) {
    return false
  }
}

// 监听表单变化，同步输入框
watch(
  () => musicForm.cover,
  (newVal) => {
    if (newVal && !coverUrlInput.value) {
      coverUrlInput.value = newVal
    }
  }
)

watch(
  () => musicForm.musicFile,
  (newVal) => {
    if (newVal && !musicUrlInput.value) {
      musicUrlInput.value = newVal
    }
  }
)

// 封面上传
const beforeCoverUpload = () => {
  isUploading.value = true
}
const onCoverSuccess = (res, file) => {
  isUploading.value = false
  const coverUrl = res.data || file.url || ''
  musicForm.cover = coverUrl
  coverUrlInput.value = coverUrl
  musicFormRef.value.clearValidate(['cover'])
}
const onCoverError = () => {
  isUploading.value = false
  musicForm.cover = ''
  coverUrlInput.value = ''
  ElMessage.error('封面上传失败，请重试')
}
const removeCover = () => {
  musicForm.cover = ''
  coverUrlInput.value = ''
}

// 检测 WAV
const isWAVFile = (file) => file.type === 'audio/wav' || file.name.toLowerCase().endsWith('.wav')

// 自定义上传
const customMusicUpload = async (options) => {
  const { file, onProgress, onSuccess, onError } = options
  try {
    isUploading.value = true
    uploadProgress.value = 0

    const formData = new FormData()
    formData.append('file', file)
    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        // 上传过程中最多显示到99%
        const percent = Math.min(99, Math.floor((e.loaded / e.total) * 100))
        uploadProgress.value = percent
        onProgress({ percent: uploadProgress.value })
      }
    })

    xhr.addEventListener('load', () => {
      // 上传完成，立即显示100%
      uploadProgress.value = 100
      onProgress({ percent: 100 })

      setTimeout(() => {
        isUploading.value = false
        if (xhr.status === 200) {
          const res = JSON.parse(xhr.responseText)
          const musicUrl = res.data || res.url || ''
          onSuccess({ data: musicUrl, status: 'success', name: file.name }, file)
          musicUrlInput.value = musicUrl
        } else {
          onError(new Error(`上传失败: ${xhr.status}`))
        }
      }, 300) // 短暂延迟确保用户看到100%
    })

    xhr.addEventListener('error', () => {
      isUploading.value = false
      onError(new Error('上传失败'))
    })

    xhr.open('POST', '/api/admin/s3/upload')
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.send(formData)
  } catch (err) {
    isUploading.value = false
    onError(err)
  }
}

// 音乐上传验证
const beforeMusicUpload = (file) => {
  const isAudio = file.type.startsWith('audio/') || isWAVFile(file)
  if (!isAudio) {
    ElMessage.error('只能上传音频文件')
    return false
  }
  if (file.size > 100 * 1024 * 1024) ElMessage.warning('文件较大，上传可能需要一些时间')
  return isAudio
}

const onMusicSuccess = (res, file) => {
  // 兼容不同返回格式
  const musicUrl = (res && (res.data || res.url)) || (file.response && file.response.data) || ''
  musicForm.musicFile = musicUrl
  musicFileList.value = [file]
  musicUrlInput.value = musicUrl
  musicFormRef.value.clearValidate(['musicFile'])
}

const onMusicError = () => {
  isUploading.value = false
  musicForm.musicFile = ''
  musicFileList.value = []
  musicUrlInput.value = ''
  ElMessage.error('音乐上传失败，请重试')
}

// 分类
const getMusicCategories = async () => {
  try {
    const res = await getCategoryList()
    categoryList.value = res.data || []
  } catch (err) {
    console.error(err)
    categoryList.value = []
  }
}

// LRC
const isLRCFormat = (lyrics) => /\[\d{1,2}:\d{2}(?:\.\d{1,2})?\]/.test(lyrics)
const generateLRC = (lyrics, musicFile) => {
  if (!lyrics) return ''
  const lines = lyrics
    .trim()
    .split('\n')
    .filter((l) => l.trim())
  return new Promise((resolve) => {
    const audio = new Audio(musicFile)
    audio.addEventListener('loadedmetadata', () => {
      const duration = audio.duration
      const interval = duration / lines.length
      let lrc = ''
      lines.forEach((line, idx) => {
        const totalSeconds = Math.floor(idx * interval)
        const min = String(Math.floor(totalSeconds / 60)).padStart(2, '0')
        const sec = String(totalSeconds % 60).padStart(2, '0')
        lrc += `[${min}:${sec}.00]${line}\n`
      })
      resolve(lrc)
    })
    audio.addEventListener('error', () => {
      let lrc = ''
      lines.forEach((line, idx) => {
        const totalSeconds = idx * 5
        const min = String(Math.floor(totalSeconds / 60)).padStart(2, '0')
        const sec = String(totalSeconds % 60).padStart(2, '0')
        lrc += `[${min}:${sec}.00]${line}\n`
      })
      resolve(lrc)
    })
  })
}

// 提交
const submitForm = () => {
  if (isUploading.value) {
    ElMessage.warning('文件上传中，请稍候...')
    return
  }
  musicFormRef.value.validate(async (valid) => {
    if (!valid) {
      ElMessage.error('请完整填写表单信息！')
      return
    }
    try {
      if (!isLRCFormat(musicForm.lyrics)) {
        musicForm.lyrics = await generateLRC(musicForm.lyrics, musicForm.musicFile)
      }
      await addMusic({
        userName: musicForm.author,
        musicName: musicForm.name,
        categoryId: Number(musicForm.category),
        description: musicForm.description,
        uploaderId: 123,
        coverImage: musicForm.cover,
        musicFile: musicForm.musicFile,
        lyrics: musicForm.lyrics
      })
      ElMessage.success('音乐已提交！')
      router.push('/musicManagement/musicView')
    } catch (err) {
      console.error(err)
      ElMessage.error('提交失败，请稍后重试')
    }
  })
}

// 重置
const recharge = () => {
  musicFormRef.value.resetFields()
  musicForm.cover = ''
  musicForm.musicFile = ''
  musicFileList.value = []
  coverUrlInput.value = ''
  musicUrlInput.value = ''
  uploadProgress.value = 0
  ElMessage.success('表单已重置')
}

onMounted(() => {
  getMusicCategories()
})
</script>

<style scoped>
.upload-mask {
  position: fixed;
  z-index: 2000;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: not-allowed;
}

.mask-content {
  text-align: center;
  color: #333;
  font-size: 18px;
}

.loading-icon {
  font-size: 40px;
  color: #409eff;
  margin-bottom: 12px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  100% {
    transform: rotate(360deg);
  }
}

.progress-bar {
  width: 300px;
  height: 8px;
  background: #eee;
  border-radius: 4px;
  overflow: hidden;
  margin-top: 12px;
}

.progress-fill {
  height: 100%;
  background: #409eff;
  width: 0%;
  transition: width 0.2s;
}

.upload-section {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.url-input-wrapper {
  flex: 1;
  min-width: 400px;
}

.url-input-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

.url-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.cover-upload-wrapper,
.music-upload-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.upload-or {
  color: #909399;
  font-size: 14px;
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
}

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

.cover-preview:hover .delete-icon {
  opacity: 1;
}

.apply-url-btn {
  padding: 0;
  height: auto;
}
</style>
