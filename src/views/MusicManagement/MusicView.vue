<template>
  <el-card class="music-list-card">
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
      <el-table-column prop="musicName" label="音乐名称" width="180" />
      <el-table-column prop="userName" label="音乐作者" width="150" />
      <el-table-column prop="categoryId" label="分类" width="120">
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
      <el-table-column prop="musicFile" label="试听" width="150">
        <template #default="{ row }">
          <el-button v-if="row.musicFile" size="small" type="primary" @click="openPlayer(row)">
            试听
          </el-button>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="创建时间" width="180" />
      <el-table-column prop="musicStatus" label="状态" width="120">
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
      <el-table-column label="操作" width="240" fixed="right">
        <template #default="scope">
          <el-button
            type="primary"
            size="small"
            @click="openEditDialog(scope.row)"
            v-if="scope.row.musicStatus === 1"
          >
            编辑
          </el-button>
          <el-button
            type="danger"
            size="small"
            @click="remove(scope.row)"
            v-if="scope.row.musicStatus !== -1"
          >
            删除
          </el-button>
          <el-button
            type="warning"
            size="small"
            @click="review(scope.row)"
            v-if="scope.row.musicStatus === 1"
          >
            审核
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
    <el-dialog title="编辑音乐" v-model="editDialogVisible" width="600px" :append-to-body="true">
      <el-form ref="musicFormRef" :model="editForm" label-width="100px" :rules="rules">
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
        <el-form-item label="歌词" prop="lyrics">
          <el-input v-model="editForm.lyrics" type="textarea" rows="4" />
        </el-form-item>

        <!-- 封面上传 -->
        <el-form-item label="封面上传" prop="coverImage">
          <div class="cover-upload-wrapper">
            <!-- 上传按钮，当没有上传图片时显示 -->
            <el-upload
              v-if="!editForm.coverImage"
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
              <img :src="editForm.coverImage" alt="封面预览" class="cover-image" />
              <span class="delete-icon" @click="removeCover">×</span>
            </div>
          </div>
        </el-form-item>

        <!-- 音乐文件上传 -->
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
import { editMusic, getCategoryList, getMusicList, musicStatus } from '@/api/music'
import { useUserStoreWithOut } from '@/store/modules/user'

const userStore = useUserStoreWithOut()
const token = userStore.getToken

const rules = {
  musicName: [{ required: true, message: '请输入音乐名称', trigger: 'blur' }],
  category: [{ required: true, message: '请选择音乐分类', trigger: 'change' }],
  description: [{ required: true, message: '请输入音乐简介', trigger: 'blur' }],
  userName: [{ required: true, message: '请输入创作者', trigger: 'blur' }],
  coverImage: [{ required: true, message: '请上传封面', trigger: 'change' }],
  // musicFile: [{ required: true, message: '请上传音乐文件', trigger: 'change' }],
  lyrics: [{ required: true, message: '请输入音乐歌词', trigger: 'blur' }]
}
// 上传状态
const isCoverUploading = ref(false)
const isMusicUploading = ref(false)
// 封面上传状态
const onCoverUploading = () => {
  isCoverUploading.value = true
}
const onCoverSuccess = (response, file) => {
  isCoverUploading.value = false
  editForm.coverImage = response.data || file.url || ''
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
  editForm.musicFile = response.data || file.url || ''
  musicFileList.value = [file]
}
const onMusicError = () => {
  isMusicUploading.value = false
}
// 音乐播放相关
const showPlayer = ref(false)
const currentMusic = ref(null)
const audioRef = ref(null)
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

// 上传请求头
const uploadHeaders = ref({ Authorization: `Bearer ${token}` })
// 删除封面
const removeCover = () => {
  editForm.coverImage = ''
  coverFileList.value = []
}

const beforeCoverUpload = (file) => {
  const isImage = file.type.startsWith('image/')
  if (!isImage) {
    ElMessage.error('只能上传图片文件！')
    return false
  }
  return true
}
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
const musicFormRef = ref(null)
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
const coverFileList = ref([])
const musicFileList = ref([])
const categoryList = ref([])
const beforeMusicUpload = (file) => {
  const isAudio = file.type.startsWith('audio/')
  if (!isAudio) {
    ElMessage.error('只能上传音频文件')
  }
  return isAudio
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

// 上传回调
const handleCoverSuccess = (res) => {
  editForm.coverImage = res.data
  coverFileList.value = [{ name: '封面', url: res.data }]
  ElMessage.success('封面上传成功')
}
const handleMusicSuccess = (res) => {
  editForm.musicFile = res.data
  musicFileList.value = [{ name: '音乐', url: res.data }]
  ElMessage.success('音乐上传成功')
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
  editDialogVisible.value = true
  coverFileList.value = row.coverImage ? [{ name: '封面', url: row.coverImage }] : []
  musicFileList.value = row.musicFile ? [{ name: '音乐', url: row.musicFile }] : []
}
const saveEdit = async () => {
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
      await editMusic(editForm, editForm.id)
      const index = tableData.value.findIndex((i) => i.id === editForm.id)
      if (index !== -1) tableData.value[index] = { ...editForm }
      ElMessage.success('编辑保存成功')
      editDialogVisible.value = false
    } catch (err) {
      console.error(err)
      ElMessage.error('保存失败')
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

.music-list-card {
  padding: 20px;
}

.query-form {
  margin-bottom: 20px;
}
</style>
