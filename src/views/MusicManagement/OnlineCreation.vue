<template>
  <div class="page">
    <!-- 遮罩层 -->
    <div v-if="generating" class="mask">
      <div class="mask-content">
        <el-icon class="loading-icon">
          <Loading />
        </el-icon>
        <p class="mask-text">{{ loadingText }}</p>
        <p class="mask-subtext">{{ loadingSubText }}</p>
      </div>
    </div>

    <!-- 左侧表单 -->
    <div class="left">
      <h3 class="title">自定义创作</h3>

      <el-form :model="form" label-position="top" :rules="rules" ref="formRef">
        <el-form-item label="歌曲标题" prop="title" required>
          <el-input
            v-model="form.title"
            placeholder="请输入20字内的歌曲名称"
            maxlength="20"
            show-word-limit
          >
            <template #append>
              <el-button @click="generateLyrics">AI生成歌词</el-button>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item label="歌曲歌词">
          <el-input
            type="textarea"
            v-model="form.lyrics"
            placeholder="请输入歌词"
            :rows="6"
            maxlength="1000"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="歌曲描述" prop="desc" required>
          <el-input
            type="textarea"
            v-model="form.desc"
            placeholder="如：一首关于秋天的伤感歌曲"
            :rows="4"
            maxlength="1000"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="歌手性别">
          <el-radio-group v-model="form.gender">
            <el-radio label="male">男</el-radio>
            <el-radio label="female">女</el-radio>
          </el-radio-group>
        </el-form-item>

        <!-- 曲风单选 -->
        <el-form-item label="曲风">
          <el-radio-group v-model="form.styles">
            <el-radio v-for="item in styleOptions" :key="item" :label="item">
              {{ item }}
            </el-radio>
          </el-radio-group>
        </el-form-item>

        <el-button type="primary" class="submit-btn" @click="submit" :disabled="generating">
          立即创作（消耗12积分）
        </el-button>
      </el-form>
    </div>

    <!-- 右侧列表 -->
    <div class="right">
      <div class="search-bar">
        <el-input v-model="searchTitle" placeholder="请输入歌曲标题" style="width: 240px" />
        <el-button type="primary" @click="search">搜索</el-button>
        <el-button @click="reset">重置</el-button>
      </div>

      <el-table :data="tableData" border style="width: 100%">
        <el-table-column prop="title" label="歌曲标题" />
        <el-table-column label="曲风" width="120">
          <template #default="{ row }">
            {{ row.styles || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="publishTime" label="发布日期" width="180" />

        <el-table-column label="操作" width="260">
          <template #default="{ row }">
            <el-button link type="primary" @click="playMusic(row)">播放</el-button>
            <el-button link type="primary" @click="openDetail(row)">详情</el-button>
            <el-button link type="primary" @click="downloadMusic(row)" :disabled="!row.musicUrl">
              下载
            </el-button>
            <el-button link type="danger" @click="deleteSong(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          layout="prev, pager, next"
          :total="total"
          :page-size="pageSize"
          :current-page="currentPage"
          @current-change="handlePageChange"
        />
      </div>
    </div>

    <SongDetailDrawer v-model="showDetail" :detail="currentDetail" />

    <!-- 播放器 -->
    <el-dialog v-model="showPlayer" title="音乐试听" width="400px" :before-close="handleClose">
      <div v-if="currentMusic">
        <p style="margin-bottom: 10px; font-weight: bold">
          {{ currentMusic.title }}
        </p>

        <audio
          ref="audioRef"
          :src="currentMusic.musicUrl"
          controls
          autoplay
          style="width: 100%"
        ></audio>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
import SongDetailDrawer from './SongDetailDrawer.vue'
import { useUserStoreWithOut } from '@/store/modules/user'

const formRef = ref()
const generating = ref(false)
const userStore = useUserStoreWithOut()
const form = ref({
  title: '',
  lyrics: '',
  desc: '',
  gender: 'male',
  styles: '流行',
  username: userStore.getUserInfo.username
})

const rules = {
  title: [{ required: true, message: '请输入歌曲标题', trigger: 'blur' }],
  desc: [{ required: true, message: '请输入歌曲描述', trigger: 'blur' }]
}
const loadingText = ref('正在生成音乐，请稍候...')
const loadingSubText = ref('AI正在为您创作专属音乐')
const styleOptions = ['流行', '古典', '摇滚', '民谣', '电子', '嘻哈', '国风', 'R&B', 'DJ']

/* 播放器 */
const showPlayer = ref(false)
const currentMusic = ref(null)
const audioRef = ref(null)

function playMusic(song) {
  if (!song.musicUrl) {
    ElMessage.warning('暂无音乐文件')
    return
  }
  currentMusic.value = song
  showPlayer.value = true
}

function handleClose(done) {
  if (audioRef.value) {
    audioRef.value.pause()
    audioRef.value.currentTime = 0
  }
  showPlayer.value = false
  done()
}

/* ✅ 下载音乐（完整版） */
async function downloadMusic(row) {
  if (!row.musicUrl) {
    ElMessage.warning('暂无可下载音乐')
    return
  }

  try {
    ElMessage.info('正在下载，请稍候...')

    const response = await fetch(row.musicUrl)
    const blob = await response.blob()

    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `${row.title || 'music'}.mp3`
    document.body.appendChild(link)
    link.click()

    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    ElMessage.success('下载完成')
  } catch (error) {
    // 如果跨域失败，直接跳转下载
    window.open(row.musicUrl, '_blank')
  }
}

// const baseUrl = 'http://localhost:3000/'
const baseUrl = 'https://admin.echorura.com/musicApi/'

/* 提交 */
async function submit() {
  formRef.value.validate(async (valid) => {
    if (!valid) return
    loadingText.value = '正在生成音乐，请稍候...'
    loadingSubText.value = 'AI正在为您创作专属音乐'
    generating.value = true
    try {
      const res = await fetch(`${baseUrl}api/music/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [userStore.getTokenKey ?? 'Authorization']: userStore.getToken
            ? `Bearer ${userStore.getToken}`
            : ''
        },
        body: JSON.stringify({
          ...form.value,
          styles: form.value.styles ? [form.value.styles] : []
        })
      })

      const data = await res.json()

      if (data.success) {
        const newSong = {
          id: Date.now().toString(),
          title: data.data?.title,
          lyrics: data.data?.prompt,
          desc: form.value.desc,
          gender: form.value.gender,
          styles: form.value.styles,
          musicUrl: data.data?.audio || data.url,
          publishTime: new Date().toLocaleString()
        }

        saveSong(newSong)

        form.value = {
          title: '',
          lyrics: '',
          desc: '',
          gender: 'male',
          styles: ''
        }

        ElMessage.success('音乐生成成功！')
      }
    } catch {
      ElMessage.error('服务器未启动')
    } finally {
      generating.value = false
    }
  })
}

/* 🎼 AI生成歌词 */
async function generateLyrics() {
  if (!form.value.title) {
    ElMessage.warning('请先输入歌曲标题')
    return
  }

  try {
    loadingText.value = '正在生成歌词，请稍候...'
    loadingSubText.value = 'AI正在为您创作歌词内容'
    generating.value = true

    const res = await fetch(`${baseUrl}api/music/getMusicLyric`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: form.value.title
      })
    })

    const data = await res.json()

    if (data.success) {
      form.value.desc = form.value.title
      form.value.lyrics = data.data?.lyrics || ''
      ElMessage.success('歌词生成成功')
    } else {
      ElMessage.error(data.message || '歌词生成失败')
    }
  } catch (err) {
    ElMessage.error('服务器异常')
  } finally {
    generating.value = false
  }
}

/* 本地存储 */
const STORAGE_KEY = 'my_music_songs'

function saveSong(song) {
  const songs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  songs.unshift(song)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(songs))
  loadSongs()
}

const searchTitle = ref('')
const tableData = ref([])
const currentPage = ref(1)
const pageSize = ref(10)

const total = computed(() => {
  const songs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  if (!searchTitle.value) return songs.length
  return songs.filter((s) => s.title.includes(searchTitle.value)).length
})

function loadSongs() {
  let songs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  if (searchTitle.value) {
    songs = songs.filter((s) => s.title.includes(searchTitle.value))
  }

  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  tableData.value = songs.slice(start, end)
}

function handlePageChange(page) {
  currentPage.value = page
  loadSongs()
}

function search() {
  currentPage.value = 1
  loadSongs()
}

function reset() {
  searchTitle.value = ''
  currentPage.value = 1
  loadSongs()
}

loadSongs()

const showDetail = ref(false)
const currentDetail = ref(null)

function openDetail(row) {
  currentDetail.value = row
  showDetail.value = true
}

function deleteSong(row) {
  ElMessageBox.confirm(`确定删除《${row.title}》吗？`, '提示').then(() => {
    const songs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    const updated = songs.filter((s) => s.id !== row.id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    loadSongs()
    ElMessage.success('删除成功')
  })
}

onUnmounted(() => {
  if (audioRef.value) audioRef.value.pause()
})
</script>

<style scoped>
.page {
  display: flex;
  gap: 20px;
}

.left {
  width: 360px;
  background: #fff;
  padding: 20px;
  border-radius: 6px;
}

.right {
  flex: 1;
  background: #fff;
  padding: 20px;
  border-radius: 6px;
}

.submit-btn {
  width: 100%;
  margin-top: 10px;
}

.search-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.pagination {
  margin-top: 15px;
  text-align: right;
}

.mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.mask-content {
  background: white;
  padding: 40px;
  border-radius: 12px;
  text-align: center;
}

.loading-icon {
  font-size: 48px;
  animation: spin 1.5s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
