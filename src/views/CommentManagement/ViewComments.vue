<template>
  <el-card class="comment-card">
    <!-- 查询条件 -->
    <el-form :inline="true" :model="queryForm" class="query-form">
      <el-form-item label="关键字">
        <el-input v-model="queryForm.content" placeholder="请输入关键字" />
      </el-form-item>
      <el-form-item label="音乐名称">
        <el-input v-model="queryForm.musicId" placeholder="请输入音乐名称" />
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="queryForm.status" placeholder="请选择状态" style="width: 150px">
          <el-option label="已删除" value="0" />
          <el-option label="审核中" value="1" />
          <el-option label="审核通过" value="2" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="search">搜索</el-button>
      </el-form-item>
    </el-form>

    <!-- 评论表格 -->
    <el-table :data="comments" border style="width: 100%; margin-top: 20px">
      <el-table-column prop="content" label="评论内容" />
      <el-table-column prop="music" label="音乐名称" width="180" />
      <el-table-column prop="createdAt" label="创建日期" width="180" />
      <el-table-column prop="status" label="状态" width="120">
        <template #default="scope">
          <el-tag
            :type="scope.row.status === 2 ? 'success' : scope.row.status === 1 ? 'warning' : 'info'"
          >
            {{ scope.row.statusText }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="240">
        <template #default="scope">
          <el-button
            type="primary"
            size="mini"
            @click="audit(scope.row, 2)"
            v-if="scope.row.status !== 2"
          >
            通过
          </el-button>
          <el-button type="danger" size="mini" @click="remove(scope.row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getCommentList, updateCommentStatus, deleteComment } from '@/api/comment'

// 查询条件
const queryForm = reactive({
  page: 1,
  size: 10,
  musicId: '',
  content: '',
  status: ''
})

// 评论数据
const comments = ref([])

// 搜索（发请求）
const search = async () => {
  await getCommentData()
}

// 审核评论
const audit = async (row, newStatus) => {
  try {
    // 如果接口支持审核操作，这里可以调用审核接口
    await updateCommentStatus({ id: row.id, status: newStatus })
    const index = comments.value.findIndex((item) => item.id === row.id)
    if (index !== -1) {
      comments.value[index].status = newStatus
      comments.value[index].statusText =
        newStatus === 2 ? '已审核通过' : newStatus === 1 ? '审核中' : '已删除'
      ElMessage.success(`评论状态已修改为 ${comments.value[index].statusText}`)
    }
  } catch (error) {
    ElMessage.error('修改状态失败')
  }
}

// 删除评论
const remove = async (row) => {
  ElMessageBox.confirm(`确定删除评论吗？`, '提示', { type: 'warning' })
    .then(async () => {
      try {
        // 如果接口支持删除操作，这里可以调用删除接口
        await deleteComment(row.id)
        comments.value = comments.value.filter((item) => item.id !== row.id)
        ElMessage.success('已删除')
      } catch (error) {
        ElMessage.error('删除失败')
      }
    })
    .catch(() => {
      ElMessage.info('已取消删除')
    })
}

// 获取评论数据
const getCommentData = async () => {
  try {
    // 过滤掉空字符串参数
    const filteredParams = Object.fromEntries(
      Object.entries(queryForm).filter(([_, value]) => value !== '')
    )
    const res = await getCommentList({ ...filteredParams })

    // 假设接口返回的数据在 res.data.records
    comments.value = res.data.records.map((item) => ({
      ...item,
      statusText: item.status === 2 ? '已审核通过' : item.status === 1 ? '审核中' : '已删除'
    }))
  } catch (error) {
    ElMessage.error('获取评论数据失败')
    console.error(error)
  }
}

onMounted(() => {
  getCommentData()
})
</script>

<style scoped>
.comment-card {
  padding: 20px;
}

.query-form {
  margin-bottom: 20px;
}
</style>
