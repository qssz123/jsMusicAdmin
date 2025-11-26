<template>
  <el-card class="music-list-card">
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

    <!-- 查询条件 -->
    <el-form :inline="true" :model="queryForm" class="query-form">
      <el-form-item label="音乐作者">
        <el-input v-model="queryForm.userName" placeholder="请输入作者" />
      </el-form-item>
      <el-form-item label="音乐名称">
        <el-input v-model="queryForm.musicName" placeholder="请输入音乐名称" />
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="queryForm.musicStatus" placeholder="请选择状态" style="width: 150px">
          <el-option label="已发布" value="2" />
          <el-option label="待审核" value="1" />
          <el-option label="审核不通过" value="0" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="search">搜索</el-button>
        <el-button type="success" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <!-- 表格 -->
    <el-table :data="tableData" border style="width: 100%; margin-top: 20px">
      <el-table-column prop="musicName" label="音乐名称" width="150" />
      <el-table-column prop="userName" label="音乐作者" width="120" />
      <el-table-column prop="categoryId" label="分类" width="80">
        <template #default="{ row }">
          {{ getCategoryName(row.categoryId) }}
        </template>
      </el-table-column>
      <el-table-column prop="coverImage" label="封面图" width="120">
        <template #default="{ row }">
          <img
            v-if="row.coverImage"
            :src="row.coverImage"
            alt="封面"
            style="width: 60px; height: 60px; border-radius: 6px"
          />
        </template>
      </el-table-column>
      <el-table-column prop="musicFile" label="试听" width="80">
        <template #default="{ row }">
          <el-button v-if="row.musicFile" size="small" type="primary" @click="openPlayer(row)">
            试听
          </el-button>
        </template>
      </el-table-column>
      <el-table-column prop="musicStatus" label="状态" width="100">
        <template #default="scope">
          <el-tag
            :type="
              scope.row.musicStatus === 2
                ? 'success'
                : scope.row.musicStatus === 1
                  ? 'warning'
                  : scope.row.musicStatus === 0
                    ? 'danger'
                    : 'info'
            "
          >
            {{ scope.row.statusText }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="songCount" label="播放量" width="100">
        <template #default="scope">
          {{ formatCountFunc(scope.row.songCount) }}
        </template>
      </el-table-column>
      <el-table-column prop="goldCoin" label="产生积分" width="100">
        <template #default="scope">
          {{ formatCountFunc(scope.row.goldCoin) }}
        </template>
      </el-table-column>
      <el-table-column prop="chain" label="是否上链" width="100">
        <template #default="{ row }">
          <el-tag :type="row.chain === 1 ? 'success' : 'info'">
            {{ row.chain === 1 ? '是' : '否' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="创建时间" width="180" />
      <el-table-column label="操作" width="300" fixed="right" align="center">
        <template #default="scope">
          <!-- 编辑 -->
          <el-button
            type="primary"
            size="small"
            @click="openEditDialog(scope.row)"
            v-if="
              scope.row.musicStatus !== -1 && (scope.row.musicStatus === 1 || getRole() === '1')
            "
          >
            编辑
          </el-button>

          <!-- 删除 -->
          <el-button
            type="danger"
            size="small"
            @click="remove(scope.row)"
            v-if="scope.row.musicStatus !== -1"
          >
            删除
          </el-button>

          <!-- 审核 -->
          <el-button
            type="warning"
            size="small"
            @click="review(scope.row)"
            v-if="scope.row.musicStatus === 1"
          >
            审核
          </el-button>

          <!-- 申请上链：已发布且未上链 -->
          <el-button
            type="success"
            size="small"
            @click="applyChain(scope.row)"
            v-if="
              scope.row.musicStatus === 2 &&
              scope.row.goldCoin >= 1000000 &&
              scope.row.songCount >= 1000000
            "
          >
            申请上链
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div style="margin-top: 20px; text-align: right">
      <el-pagination
        v-model:current-page="queryForm.page"
        :page-size="queryForm.size"
        :total="total"
        layout="prev, pager, next, jumper"
        @current-change="handlePageChange"
      />
    </div>

    <!-- 编辑弹窗 -->
    <el-dialog title="编辑音乐" v-model="editDialogVisible" width="1000px" :append-to-body="true">
      <el-form ref="editFormRef" :model="editForm" label-width="100px" :rules="rules">
        <el-form-item label="音乐名称" prop="musicName">
          <el-input v-model="editForm.musicName" />
        </el-form-item>
        <el-form-item label="音乐作者" prop="userName">
          <el-input v-model="editForm.userName" disabled />
        </el-form-item>
        <el-form-item label="分类" prop="categoryId">
          <el-select v-model="editForm.categoryId" placeholder="请选择分类" style="width: 100%">
            <el-option
              v-for="cat in categoryList"
              :key="cat.id"
              :label="cat.categoryName"
              :value="cat.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="简介" prop="description">
          <el-input v-model="editForm.description" type="textarea" rows="3" />
        </el-form-item>

        <!-- 歌词部分 -->
        <el-form-item label="音乐歌词" prop="lyrics">
          <el-input
            type="textarea"
            v-model="editForm.lyrics"
            placeholder="请输入歌词或LRC格式歌词，非LRC格式会在保存时自动转换"
            :rows="6"
          />
          <div class="lyrics-tip">
            <el-tag v-if="isLRCFormat(editForm.lyrics)" type="success" size="small">LRC格式</el-tag>
            <el-tag v-else type="warning" size="small">普通文本</el-tag>
            <span class="tip-text">非LRC格式将在保存时自动转换为LRC格式</span>
          </div>
        </el-form-item>

        <!-- 封面上传 -->
        <el-form-item label="封面上传" prop="coverImage">
          <div class="upload-section">
            <!-- URL输入框放在前面 -->
            <div class="url-input-wrapper">
              <div class="url-input-header">
                <span>输入封面URL</span>
                <el-tag v-if="editForm.coverImage" type="success" size="small">已设置</el-tag>
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
                v-if="!editForm.coverImage"
                class="upload-demo"
                :headers="uploadHeaders"
                :before-upload="beforeCoverUpload"
                :show-file-list="false"
                list-type="picture-card"
                :http-request="customCoverUpload"
                @success="onCoverSuccess"
                @error="onCoverError"
              >
                <i class="el-icon-plus"></i>
              </el-upload>
              <div v-else class="cover-preview">
                <img :src="editForm.coverImage" alt="封面预览" class="cover-image" />
                <span class="delete-icon" @click="removeCover">×</span>
              </div>
            </div>
          </div>
        </el-form-item>

        <!-- 音乐文件上传 -->
        <el-form-item label="音乐上传" prop="musicFile">
          <div class="upload-section">
            <!-- URL输入框放在前面 -->
            <div class="url-input-wrapper">
              <div class="url-input-header">
                <span>输入音乐URL</span>
                <el-tag v-if="editForm.musicFile" type="success" size="small">已设置</el-tag>
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
      </el-form>

      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveEdit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 音乐播放弹窗 -->
    <el-dialog v-model="showPlayer" title="音乐试听" width="400px" :before-close="handleClose">
      <div v-if="currentMusic">
        <p style="margin-bottom: 10px">{{ currentMusic.musicName }}</p>
        <audio
          ref="audioRef"
          :src="currentMusic.musicFile"
          controls
          autoplay
          style="width: 100%; outline: none"
        ></audio>
      </div>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { reactive, ref, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { editMusic, getCategoryList, getMusicList, musicStatus, musicChain } from '@/api/music'
import { useUserStoreWithOut } from '@/store/modules/user'

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

const rules = {
  musicName: [{ required: true, message: '请输入音乐名称', trigger: 'blur' }],
  categoryId: [{ required: true, message: '请选择音乐分类', trigger: 'change' }],
  description: [{ required: true, message: '请输入音乐简介', trigger: 'blur' }],
  userName: [{ required: true, message: '请输入创作者', trigger: 'blur' }],
  coverImage: [{ required: true, message: '请上传封面', trigger: 'change' }],
  musicFile: [{ required: true, message: '请上传音乐文件', trigger: 'change' }],
  lyrics: [{ required: true, message: '请输入音乐歌词', trigger: 'blur' }]
}

// 上传请求头
const uploadHeaders = ref({ Authorization: `Bearer ${token}` })

// 音乐播放相关
const showPlayer = ref(false)
const currentMusic = ref(null)
const audioRef = ref(null)
const currentRole = ref('1')
const role = ref('0')

const getRole = () => {
  const roleValue = localStorage.getItem('role') ?? '0'
  role.value = roleValue // 更新响应式数据
  return roleValue
}
const openPlayer = (row) => {
  currentMusic.value = row
  showPlayer.value = true
  setTimeout(() => {
    audioRef.value?.play()
  }, 300)
}
const handleClose = () => {
  audioRef.value?.pause()
  showPlayer.value = false
}
onUnmounted(() => audioRef.value?.pause())

// 查询条件
const queryForm = reactive({
  userName: '',
  musicStatus: '',
  page: 1,
  size: 10,
  musicName: ''
})

// 表格数据
const tableData = ref([])
const total = ref(0)

// 编辑弹窗
const editDialogVisible = ref(false)
const editFormRef = ref(null)
const editForm = reactive({
  id: null,
  userName: '',
  musicName: '',
  categoryId: '',
  description: '',
  lyrics: '',
  coverImage: '',
  musicFile: ''
})
const musicFileList = ref([])
const categoryList = ref([])
const formatCountFunc = (count) => {
  if (!count && count !== 0) return '0'

  const num = Number(count)
  if (isNaN(num)) return '0'

  // 亿级
  if (num >= 100000000) {
    const val = num / 100000000
    // 向上保留 1 位小数
    const result = Math.ceil(val * 10) / 10
    return result + '亿'
  }

  // 万级
  if (num >= 10000) {
    const val = num / 10000
    // ⭐ 向上保留 1 位小数（关键）
    const result = Math.ceil(val * 10) / 10
    return result + '万'
  }

  return num.toString()
}
// LRC歌词处理函数
// 检测是否为LRC格式
const isLRCFormat = (lyrics) => {
  if (!lyrics) return false
  return /\[\d{1,2}:\d{2}(?:\.\d{1,2})?\]/.test(lyrics)
}

// 生成LRC歌词
const generateLRC = (lyrics, musicFile) => {
  if (!lyrics) return ''
  const lines = lyrics
    .trim()
    .split('\n')
    .filter((l) => l.trim())

  return new Promise((resolve) => {
    // 如果有音乐文件，根据音乐时长生成时间戳
    if (musicFile) {
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
        // 如果音频加载失败，使用默认时间间隔
        resolve(generateDefaultLRC(lines))
      })

      // 设置超时，防止音频加载过久
      setTimeout(() => {
        if (audio.readyState === 0) {
          resolve(generateDefaultLRC(lines))
        }
      }, 3000)
    } else {
      // 没有音乐文件，使用默认时间间隔
      resolve(generateDefaultLRC(lines))
    }
  })
}
const applyChain = (row) => {
  ElMessageBox.confirm(`确定要为《${row.musicName}》申请上链吗？`, '提示', {
    type: 'warning'
  }).then(async () => {
    await musicChain({ id: row.id })
    ElMessage.success(`已上链: ${row.musicName}`)
    getMusic()
    // 调你的 API
    // api.applyChain(row.id).then(() => {
    //   ElMessage.success('申请上链已提交')
    //   loadData() // 刷新表格
    // })
  })
}

// 生成默认的LRC歌词（每行5秒间隔）
const generateDefaultLRC = (lines) => {
  let lrc = ''
  lines.forEach((line, idx) => {
    const totalSeconds = idx * 5
    const min = String(Math.floor(totalSeconds / 60)).padStart(2, '0')
    const sec = String(totalSeconds % 60).padStart(2, '0')
    lrc += `[${min}:${sec}.00]${line}\n`
  })
  return lrc
}

// 封面URL输入处理
const handleCoverUrlInput = (value) => {
  if (coverUrlTimer) {
    clearTimeout(coverUrlTimer)
  }
  coverUrlTimer = setTimeout(() => {
    applyCoverUrl(value)
  }, 800)
}

const handleCoverUrlBlur = () => {
  if (coverUrlInput.value) {
    applyCoverUrl(coverUrlInput.value)
  }
}

// 音乐URL输入处理
const handleMusicUrlInput = (value) => {
  if (musicUrlTimer) {
    clearTimeout(musicUrlTimer)
  }
  musicUrlTimer = setTimeout(() => {
    applyMusicUrl(value)
  }, 800)
}

const handleMusicUrlBlur = () => {
  if (musicUrlInput.value) {
    applyMusicUrl(musicUrlInput.value)
  }
}

// 应用封面URL
const applyCoverUrl = (url) => {
  if (!url) return
  if (!isValidUrl(url)) {
    ElMessage.warning('请输入有效的URL地址')
    return
  }
  editForm.coverImage = url
  editFormRef.value?.clearValidate(['coverImage'])
  ElMessage.success('封面URL已自动应用')
}

// 应用音乐URL
const applyMusicUrl = (url) => {
  if (!url) return
  if (!isValidUrl(url)) {
    ElMessage.warning('请输入有效的URL地址')
    return
  }
  const musicExt = url.toLowerCase().split('.').pop()
  const allowedExts = ['mp3', 'wav', 'm4a', 'ogg', 'flac']
  if (!allowedExts.includes(musicExt)) {
    ElMessage.warning('请输入支持的音频文件URL (mp3, wav, m4a, ogg, flac)')
    return
  }
  editForm.musicFile = url
  musicFileList.value = [
    {
      name: url.split('/').pop() || '音乐文件',
      url: url
    }
  ]
  editFormRef.value?.clearValidate(['musicFile'])
  ElMessage.success('音乐文件URL已自动应用')
}

// 清空URL
const clearCoverUrl = () => {
  coverUrlInput.value = ''
  editForm.coverImage = ''
  editFormRef.value?.clearValidate(['coverImage'])
}

const clearMusicUrl = () => {
  musicUrlInput.value = ''
  editForm.musicFile = ''
  musicFileList.value = []
  editFormRef.value?.clearValidate(['musicFile'])
}

// URL验证
const isValidUrl = (string) => {
  try {
    new URL(string)
    return true
  } catch (_) {
    return false
  }
}

// 自定义封面上传
const customCoverUpload = async (options) => {
  const { file, onProgress, onSuccess, onError } = options
  try {
    isUploading.value = true
    uploadProgress.value = 0

    const formData = new FormData()
    formData.append('file', file)
    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percent = Math.min(99, Math.floor((e.loaded / e.total) * 100))
        uploadProgress.value = percent
        onProgress({ percent: uploadProgress.value })
      }
    })

    xhr.addEventListener('load', () => {
      uploadProgress.value = 100
      onProgress({ percent: 100 })

      setTimeout(() => {
        isUploading.value = false
        if (xhr.status === 200) {
          const res = JSON.parse(xhr.responseText)
          onSuccess({ data: res.data || res.url || '', status: 'success', name: file.name }, file)
        } else {
          onError(new Error(`上传失败: ${xhr.status}`))
        }
      }, 300)
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

// 自定义音乐上传
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
        const percent = Math.min(99, Math.floor((e.loaded / e.total) * 100))
        uploadProgress.value = percent
        onProgress({ percent: uploadProgress.value })
      }
    })

    xhr.addEventListener('load', () => {
      uploadProgress.value = 100
      onProgress({ percent: 100 })

      setTimeout(() => {
        isUploading.value = false
        if (xhr.status === 200) {
          const res = JSON.parse(xhr.responseText)
          onSuccess({ data: res.data || res.url || '', status: 'success', name: file.name }, file)
        } else {
          onError(new Error(`上传失败: ${xhr.status}`))
        }
      }, 300)
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

// 上传验证
const beforeCoverUpload = (file) => {
  const isImage = file.type.startsWith('image/')
  if (!isImage) {
    ElMessage.error('只能上传图片文件！')
    return false
  }
  return true
}

const beforeMusicUpload = (file) => {
  const isAudio = file.type.startsWith('audio/')
  if (!isAudio) {
    ElMessage.error('只能上传音频文件')
    return false
  }
  if (file.size > 100 * 1024 * 1024) {
    ElMessage.warning('文件较大，上传可能需要一些时间')
  }
  return true
}

// 上传回调
const onCoverSuccess = (res, file) => {
  const coverUrl = res.data || file.url || ''
  editForm.coverImage = coverUrl
  coverUrlInput.value = coverUrl
  editFormRef.value?.clearValidate(['coverImage'])
}

const onCoverError = () => {
  isUploading.value = false
  editForm.coverImage = ''
  coverUrlInput.value = ''
  ElMessage.error('封面上传失败，请重试')
}

const onMusicSuccess = (res, file) => {
  const musicUrl = (res && (res.data || res.url)) || (file.response && file.response.data) || ''
  editForm.musicFile = musicUrl
  musicFileList.value = [file]
  musicUrlInput.value = musicUrl
  editFormRef.value?.clearValidate(['musicFile'])
}

const onMusicError = () => {
  isUploading.value = false
  editForm.musicFile = ''
  musicFileList.value = []
  musicUrlInput.value = ''
  ElMessage.error('音乐上传失败，请重试')
}

// 删除封面
const removeCover = () => {
  editForm.coverImage = ''
  coverUrlInput.value = ''
  editFormRef.value?.clearValidate(['coverImage'])
}

// 获取分类
const getMusicCategories = async () => {
  const res = await getCategoryList()
  categoryList.value = res.data
}
const getCategoryName = (id) => {
  const cat = categoryList.value.find((c) => c.id === id)
  return cat ? cat.categoryName : '-'
}

// 获取音乐列表
const getMusic = async () => {
  try {
    const res = await getMusicList({ ...queryForm })
    const records = res.data.records || []
    tableData.value = records.map((item) => ({
      ...item,
      createdAt: new Date(item.createdAt).toLocaleString(),
      statusText:
        item.musicStatus === 2
          ? '已发布'
          : item.musicStatus === 1
            ? '待审核'
            : item.musicStatus === 0
              ? '审核不通过'
              : '已删除'
    }))
    total.value = res.data.total || 0
  } catch (err) {
    console.error(err)
    ElMessage.error('获取音乐列表失败')
  }
}

// 搜索和重置
const search = () => {
  queryForm.page = 1
  getMusic()
}
const resetQuery = () => {
  queryForm.userName = ''
  queryForm.musicName = ''
  queryForm.musicStatus = ''
  queryForm.page = 1
  getMusic()
}

// 分页处理
const handlePageChange = (page) => {
  queryForm.page = page
  getMusic()
}

// 编辑操作
const openEditDialog = (row) => {
  Object.assign(editForm, row)
  coverUrlInput.value = row.coverImage || ''
  musicUrlInput.value = row.musicFile || ''
  musicFileList.value = row.musicFile ? [{ name: '音乐', url: row.musicFile }] : []
  editDialogVisible.value = true

  // 如果是编辑已存在的音乐，检查歌词格式
  if (row.lyrics) {
    const isLRC = isLRCFormat(row.lyrics)
    if (isLRC) {
      console.log('当前歌词为LRC格式')
    }
  }
}

const saveEdit = async () => {
  if (isUploading.value) {
    ElMessage.warning('文件上传中，请稍候...')
    return
  }

  editFormRef.value.validate(async (valid) => {
    if (!valid) {
      ElMessage.error('请完整填写表单信息！')
      return
    }

    try {
      // 处理歌词格式转换
      if (editForm.lyrics && !isLRCFormat(editForm.lyrics)) {
        ElMessage.info('正在转换歌词格式...')
        editForm.lyrics = await generateLRC(editForm.lyrics, editForm.musicFile)
      }

      // 构建符合后端格式的提交数据
      const submitData = {
        id: Number(editForm.id),
        musicName: editForm.musicName,
        categoryId: Number(editForm.categoryId),
        description: editForm.description,
        uploaderId: Number(editForm.uploaderId || 1),
        coverImage: editForm.coverImage,
        musicFile: editForm.musicFile,
        lyrics: editForm.lyrics,
        musicStatus: Number(editForm.musicStatus || 1),
        userName: editForm.userName,
        // 使用正确的ISO日期格式
        createdAt: new Date(editForm.createdAt).toISOString(), // 转换为ISO格式
        updatedAt: new Date().toISOString(), // 使用当前时间
        // 确保数字字段有默认值，避免null
        commentCount: Number(editForm.commentCount || 0),
        likeCount: Number(editForm.likeCount || 0)
      }

      console.log('🚀 提交的数据:', JSON.stringify(submitData, null, 2))

      // 调用API
      const response = await editMusic(submitData, editForm.id)
      console.log('✅ 响应数据:', response)

      // 更新本地数据
      const index = tableData.value.findIndex((i) => i.id === editForm.id)
      if (index !== -1) {
        tableData.value[index] = { ...tableData.value[index], ...submitData }
      }

      ElMessage.success('编辑保存成功')
      editDialogVisible.value = false
      getMusic()
    } catch (err) {
      console.error('❌ 保存错误:', err)
      console.error('❌ 错误响应:', err.response?.data)

      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        '保存失败，请检查数据格式'
      ElMessage.error(`保存失败: ${errorMsg}`)
    }
  })
}

// 删除和审核
const musicStatusFunc = async (param) => await musicStatus(param)
const remove = (row) => {
  ElMessageBox.confirm(`确定删除 ${row.musicName} 吗？`, '提示', { type: 'warning' })
    .then(async () => {
      await musicStatusFunc({ music_status: -1, id: row.id })
      ElMessage.success(`已删除: ${row.musicName}`)
      getMusic()
    })
    .catch(() => ElMessage.info('已取消删除'))
}
const review = (row) => {
  ElMessageBox.confirm(`正在审核 ${row.musicName}`, '提示', {
    confirmButtonText: '通过',
    cancelButtonText: '拒绝',
    type: 'warning',
    distinguishCancelAndClose: true
  })
    .then(async () => {
      await musicStatusFunc({ music_status: 2, id: row.id })
      ElMessage.success(`已发布: ${row.musicName}`)
      getMusic()
    })
    .catch(async (action) => {
      if (action === 'cancel') {
        await musicStatusFunc({ music_status: 0, id: row.id })
        ElMessage.info(`已拒绝: ${row.musicName}`)
        getMusic()
      }
    })
}

// 初始化
onMounted(() => {
  getMusic()
  getMusicCategories()
})
</script>

<style scoped>
.upload-mask {
  position: fixed;
  z-index: 9999;
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

.lyrics-tip {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.tip-text {
  font-size: 12px;
  color: #909399;
}

.music-list-card {
  padding: 20px;
}

.query-form {
  margin-bottom: 20px;
}
</style>
