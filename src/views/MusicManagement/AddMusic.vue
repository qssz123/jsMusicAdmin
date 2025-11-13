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
          <div class="cover-upload-wrapper">
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
            :action="musicUploadAction"
            :headers="uploadHeaders"
            :before-upload="beforeMusicUpload"
            :limit="1"
            :file-list="musicFileList"
            :show-file-list="true"
            :http-request="customMusicUpload"
            @progress="onMusicUploading"
            @success="onMusicSuccess"
            @error="onMusicError"
          >
            <el-button size="small" type="primary">点击上传</el-button>
            <template #tip>
              <div class="el-upload__tip">
                支持 mp3, wav 格式文件，WAV文件将自动压缩
                <div v-if="originalFileSize && compressedFileSize" class="size-comparison">
                  压缩前: {{ originalFileSize }} → 压缩后: {{ compressedFileSize }} (减少
                  {{ compressionRatio }}%)
                </div>
              </div>
            </template>
          </el-upload>
        </el-form-item>

        <!-- 音乐歌词 -->
        <el-form-item label="音乐歌词" prop="lyrics">
          <el-input
            type="textarea"
            v-model="musicForm.lyrics"
            placeholder="请输入歌词或LRC格式歌词"
          />
        </el-form-item>

        <!-- 按钮 -->
        <el-form-item>
          <el-button type="primary" @click="submitForm">提交</el-button>
          <el-button type="success" @click="recharge">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
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
const originalFileSize = ref('')
const compressedFileSize = ref('')

const compressionRatio = computed(() => {
  if (!originalFileSize.value || !compressedFileSize.value) return 0
  const original = parseFloat(originalFileSize.value)
  const compressed = parseFloat(compressedFileSize.value)
  return Math.round((1 - compressed / original) * 100)
})

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
const musicUploadAction = ref('/api/admin/oss/upload')

// 格式化文件大小
const formatFileSize = (bytes) => {
  if (!bytes) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 封面上传
const beforeCoverUpload = () => {
  isUploading.value = true
}
const onCoverUploading = () => {
  isUploading.value = true
}
const onCoverSuccess = (res, file) => {
  isUploading.value = false
  musicForm.cover = res.data || file.url || ''
}
const onCoverError = () => {
  isUploading.value = false
  musicForm.cover = ''
  ElMessage.error('封面上传失败，请重试')
}
const removeCover = () => {
  musicForm.cover = ''
}

// 检测 WAV
const isWAVFile = (file) => file.type === 'audio/wav' || file.name.toLowerCase().endsWith('.wav')

// 压缩 WAV 文件
// 压缩 WAV 文件（更小）
const compressWAVFile = (wavFile) => {
  return new Promise((resolve, reject) => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    const reader = new FileReader()

    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target.result
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

        const targetSampleRate = 8000 // 降到 8kHz
        const offlineCtx = new OfflineAudioContext(
          audioBuffer.numberOfChannels,
          Math.floor((audioBuffer.length * targetSampleRate) / audioBuffer.sampleRate),
          targetSampleRate
        )

        const source = offlineCtx.createBufferSource()
        source.buffer = audioBuffer

        // 动态压缩器 - 更激进
        const compressor = offlineCtx.createDynamicsCompressor()
        compressor.threshold.value = -30
        compressor.knee.value = 20
        compressor.ratio.value = 8
        compressor.attack.value = 0.003
        compressor.release.value = 0.25

        source.connect(compressor)
        compressor.connect(offlineCtx.destination)
        source.start(0)

        offlineCtx.startRendering().then((renderedBuffer) => {
          const wavData = bufferToStandardWav(renderedBuffer)
          const compressedBlob = new Blob([wavData], { type: 'audio/wav' })
          const compressedFile = new File(
            [compressedBlob],
            wavFile.name.replace('.wav', '_compressed.wav'),
            { type: 'audio/wav' }
          )
          compressedFileSize.value = formatFileSize(compressedFile.size)
          uploadProgress.value = 50
          resolve(compressedFile)
        })
      } catch (err) {
        reject(err)
      }
    }

    reader.onerror = reject
    reader.readAsArrayBuffer(wavFile)
  })
}

// 生成标准 WAV
const bufferToStandardWav = (buffer) => {
  const numOfChan = buffer.numberOfChannels
  const length = buffer.length * numOfChan * 2 + 44
  const bufferArray = new ArrayBuffer(length)
  const view = new DataView(bufferArray)
  const channels = []
  let sample,
    offset = 0,
    pos = 0
  const setUint16 = (data) => {
    view.setUint16(pos, data, true)
    pos += 2
  }
  const setUint32 = (data) => {
    view.setUint32(pos, data, true)
    pos += 4
  }
  setUint32(0x46464952)
  setUint32(length - 8)
  setUint32(0x45564157)
  setUint32(0x20746d66)
  setUint32(16)
  setUint16(1)
  setUint16(numOfChan)
  setUint32(buffer.sampleRate)
  setUint32(buffer.sampleRate * 2 * numOfChan)
  setUint16(numOfChan * 2)
  setUint16(16)
  setUint32(0x61746164)
  setUint32(length - pos - 4)
  for (let i = 0; i < buffer.numberOfChannels; i++) channels.push(buffer.getChannelData(i))
  while (offset < buffer.length) {
    for (let i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][offset]))
      sample = sample < 0 ? sample * 32768 : sample * 32767
      view.setInt16(pos, sample, true)
      pos += 2
    }
    offset++
  }
  return bufferArray
}

// 自定义上传
const customMusicUpload = async (options) => {
  const { file, onProgress, onSuccess, onError } = options
  try {
    isUploading.value = true
    uploadProgress.value = 0
    originalFileSize.value = formatFileSize(file.size)
    let finalFile = file
    if (isWAVFile(file)) {
      ElMessage.info('检测到WAV文件，正在压缩...')
      finalFile = await compressWAVFile(file)
      ElMessage.success(`压缩完成: ${originalFileSize.value} → ${compressedFileSize.value}`)
    }

    const formData = new FormData()
    formData.append('file', finalFile)
    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percent = Math.floor((e.loaded / e.total) * 49 + 50) // 上传占 50%~99%
        uploadProgress.value = Math.min(percent, 99)
        onProgress({ percent: uploadProgress.value })
      }
    })

    xhr.addEventListener('load', () => {
      isUploading.value = false
      uploadProgress.value = 100
      if (xhr.status === 200) {
        const res = JSON.parse(xhr.responseText)
        onSuccess({ data: res.data || res.url || '', status: 'success', name: file.name }, file)
      } else {
        onError(new Error(`上传失败: ${xhr.status}`))
      }
    })

    xhr.addEventListener('error', () => {
      isUploading.value = false
      onError(new Error('上传失败'))
    })
    xhr.open('POST', '/api/admin/oss/upload')
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
const onMusicUploading = () => {
  isUploading.value = true
}
const onMusicSuccess = (res, file) => {
  isUploading.value = false
  // 兼容不同返回格式
  musicForm.musicFile =
    (res && (res.data || res.url)) || (file.response && file.response.data) || ''
  musicFileList.value = [file]
  ElMessage.success('音乐上传成功')
}

const onMusicError = () => {
  isUploading.value = false
  musicForm.musicFile = ''
  musicFileList.value = []
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
  originalFileSize.value = ''
  compressedFileSize.value = ''
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

.size-comparison {
  margin-top: 4px;
  font-size: 12px;
  color: #999;
}
</style>
