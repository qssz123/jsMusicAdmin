<template>
  <el-card class="user-card">
    <!-- 查询条件 -->
    <el-form :inline="true" :model="queryForm" class="query-form">
      <el-form-item label="用户名称">
        <el-input v-model="queryForm.username" placeholder="请输入用户名称" />
      </el-form-item>
      <el-form-item label="角色">
        <el-select v-model="queryForm.role" placeholder="请选择角色" style="width: 150px">
          <el-option label="管理员" value="1" />
          <el-option label="普通用户" value="0" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="search">搜索</el-button>
        <el-button @click="resetSearch">重置</el-button>
        <!--        <el-button type="success" @click="openAddDialog">新增用户</el-button>-->
      </el-form-item>
    </el-form>

    <!-- 用户表格 -->
    <el-table :data="users" border style="width: 100%; margin-top: 20px">
      <el-table-column prop="avatar" label="头像" width="100">
        <template #default="scope">
          <div class="avatar-container">
            <el-avatar
              :size="40"
              :src="scope.row.avatar || defaultAvatar"
              :alt="scope.row.username"
            >
              <span v-if="!scope.row.avatar">{{ scope.row.username?.charAt(0) }}</span>
            </el-avatar>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="username" label="用户名称" width="180" />
      <el-table-column prop="phone" label="手机号" width="150" />
      <el-table-column prop="role" label="角色" width="150">
        <template #default="scope">
          <el-tag :type="scope.row.role === 1 ? 'success' : 'danger'">
            {{ scope.row.roleText }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="创建时间" width="180" />
      <el-table-column label="操作" width="200">
        <template #default="scope">
          <!--          <el-button type="primary" size="mini" @click="openEditDialog(scope.row)">修改</el-button>-->
          <el-button type="danger" size="mini" @click="remove(scope.row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div style="margin-top: 20px; text-align: right">
      <el-pagination
        v-model:current-page="queryForm.page"
        v-model:page-size="queryForm.size"
        :page-sizes="[5, 10, 20, 50]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>

    <!-- 新增/修改用户弹窗 -->
    <el-dialog
      :title="isEdit ? '修改用户' : '新增用户'"
      v-model="dialogVisible"
      width="500px"
      :append-to-body="true"
    >
      <el-form :model="form" label-width="100px">
        <el-form-item label="用户名称">
          <el-input v-model="form.username" />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="form.phone" />
        </el-form-item>
        <el-form-item label="头像">
          <div style="display: flex; align-items: center; gap: 10px">
            <el-avatar :size="60" :src="form.avatar || defaultAvatar" :alt="form.username">
              <span v-if="!form.avatar">{{ form.username?.charAt(0) }}</span>
            </el-avatar>
            <el-button type="primary" size="small" @click="showAvatarDialog = true">
              选择头像
            </el-button>
          </div>
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="form.role" placeholder="请选择角色">
            <el-option label="管理员" value="1" />
            <el-option label="普通用户" value="0" />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveUser">保存</el-button>
      </template>
    </el-dialog>

    <!-- 选择头像弹窗 -->
    <el-dialog title="选择头像" v-model="showAvatarDialog" width="600px" :append-to-body="true">
      <div class="avatar-selector">
        <div class="avatar-grid">
          <div
            v-for="(avatar, index) in avatarList"
            :key="index"
            class="avatar-item"
            :class="{ 'avatar-selected': avatar === form.avatar }"
            @click="selectAvatar(avatar)"
          >
            <el-avatar :size="50" :src="avatar" />
          </div>
        </div>
        <div class="avatar-upload">
          <el-upload
            class="avatar-uploader"
            action="/api/upload"
            :show-file-list="false"
            :on-success="handleAvatarSuccess"
            :before-upload="beforeAvatarUpload"
          >
            <el-button type="primary">上传自定义头像</el-button>
          </el-upload>
        </div>
      </div>
      <template #footer>
        <el-button @click="showAvatarDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmAvatar">确定</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getUserList } from '@/api/user'

// 默认头像
const defaultAvatar = 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'

// 头像列表
const avatarList = ref([
  'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png',
  'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png',
  'https://cube.elemecdn.com/9/c2/f0ee8a3c7c9638a54940382568c9dpng.png',
  'https://cube.elemecdn.com/d/bc/7b8d6c8e5e5b5c5e5b5c5e5b5c5e5b5.png',
  'https://cube.elemecdn.com/2/11/6531b51b3b3b3b3b3b3b3b3b3b3b3b.png'
])

// 查询条件
const queryForm = reactive({
  page: 1,
  size: 10,
  username: '',
  role: ''
})

// 用户列表和总数
const users = ref([])
const total = ref(0)

// 弹窗控制
const dialogVisible = ref(false)
const showAvatarDialog = ref(false)
const isEdit = ref(false)
const form = reactive({
  id: null,
  username: '',
  phone: '',
  avatar: '',
  role: '0'
})

// 重置搜索条件
const resetSearch = () => {
  queryForm.username = ''
  queryForm.role = ''
  queryForm.page = 1
  getUserData()
}

// 搜索（发请求）
const search = async () => {
  queryForm.page = 1 // 搜索时重置到第一页
  await getUserData()
}

// 打开新增弹窗
const openAddDialog = () => {
  isEdit.value = false
  form.id = null
  form.username = ''
  form.phone = ''
  form.avatar = ''
  form.role = '0'
  dialogVisible.value = true
}

// 打开修改弹窗
const openEditDialog = (row) => {
  isEdit.value = true
  form.id = row.id
  form.username = row.username
  form.phone = row.phone || ''
  form.avatar = row.avatar || ''
  form.role = row.role.toString()
  dialogVisible.value = true
}

// 保存用户信息
const saveUser = () => {
  if (!form.username) {
    ElMessage.warning('请填写用户名称')
    return
  }
  if (!form.phone) {
    ElMessage.warning('请填写手机号')
    return
  }

  if (isEdit.value) {
    const index = users.value.findIndex((item) => item.id === form.id)
    if (index !== -1) {
      users.value[index].username = form.username
      users.value[index].phone = form.phone
      users.value[index].avatar = form.avatar
      users.value[index].role = form.role
      users.value[index].roleText = form.role === '1' ? '管理员' : '普通用户'
      ElMessage.success('修改成功')
    }
  } else {
    const newId = users.value.length ? Math.max(...users.value.map((i) => i.id)) + 1 : 1
    users.value.push({
      id: newId,
      username: form.username,
      phone: form.phone,
      avatar: form.avatar || defaultAvatar,
      role: form.role,
      roleText: form.role === '1' ? '管理员' : '普通用户',
      createdAt: new Date().toISOString().slice(0, 10)
    })
    ElMessage.success('新增成功')
  }
  dialogVisible.value = false
}

// 删除用户
const remove = (row) => {
  ElMessageBox.confirm(`确定删除用户 ${row.username} 吗？`, '提示', { type: 'warning' })
    .then(() => {
      users.value = users.value.filter((item) => item.id !== row.id)
      total.value -= 1
      ElMessage.success('已删除')
    })
    .catch(() => {
      ElMessage.info('已取消删除')
    })
}

// 获取用户数据
const getUserData = async () => {
  try {
    // 过滤掉空查询参数
    const params = Object.fromEntries(
      Object.entries(queryForm).filter(([_, value]) => value !== '')
    )
    const res = await getUserList(params)
    // 假设接口返回数据格式为：{ data: { records: [], total: 0, size: 10, current: 1 } }
    users.value = res.data.records.map((item) => ({
      ...item,
      phone: item.phone || '未填写',
      avatar: item.avatar || defaultAvatar,
      roleText: item.role === 1 ? '管理员' : '普通用户'
    }))
    total.value = res.data.total || 0
  } catch (error) {
    ElMessage.error('获取用户数据失败')
    console.error(error)
  }
}

// 分页大小改变
const handleSizeChange = (size) => {
  queryForm.size = size
  queryForm.page = 1 // 切换每页条数时回到第一页
  getUserData()
}

// 当前页改变
const handleCurrentChange = (page) => {
  queryForm.page = page
  getUserData()
}

// 头像选择相关
const selectAvatar = (avatar) => {
  form.avatar = avatar
}

const confirmAvatar = () => {
  showAvatarDialog.value = false
}

const handleAvatarSuccess = (response) => {
  // 假设上传成功后返回图片地址
  form.avatar = response.data.url
  ElMessage.success('头像上传成功')
}

const beforeAvatarUpload = (file) => {
  const isImage = file.type.startsWith('image/')
  const isLt2M = file.size / 1024 / 1024 < 2

  if (!isImage) {
    ElMessage.error('只能上传图片格式!')
  }
  if (!isLt2M) {
    ElMessage.error('图片大小不能超过 2MB!')
  }
  return isImage && isLt2M
}

onMounted(() => {
  getUserData()
})
</script>

<style scoped>
.user-card {
  padding: 20px;
}

.query-form {
  margin-bottom: 20px;
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
  padding: 10px 0;
}

.avatar-container {
  display: flex;
  justify-content: center;
  align-items: center;
}

.avatar-selector {
  padding: 10px;
}

.avatar-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 15px;
  margin-bottom: 20px;
}

.avatar-item {
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  padding: 5px;
  border-radius: 5px;
  transition: all 0.3s;
}

.avatar-item:hover {
  background-color: #f5f7fa;
}

.avatar-selected {
  background-color: #ecf5ff;
  border: 2px solid #409eff;
}

.avatar-upload {
  display: flex;
  justify-content: center;
}

.avatar-uploader {
  text-align: center;
}
</style>
