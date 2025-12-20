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
        <!--        <el-button type="success" @click="openAddDialog">新增用户</el-button>-->
      </el-form-item>
    </el-form>

    <!-- 用户表格 -->
    <el-table :data="users" border style="width: 100%; margin-top: 20px">
      <el-table-column prop="username" label="用户名称" width="180" />
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

    <!-- 新增/修改用户弹窗 -->
    <el-dialog
      :title="isEdit ? '修改用户' : '新增用户'"
      v-model="dialogVisible"
      width="400px"
      :append-to-body="true"
    >
      <el-form :model="form" label-width="100px">
        <el-form-item label="用户名称">
          <el-input v-model="form.username" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="form.role" placeholder="请选择角色">
            <el-option label="管理员" value="0" />
            <el-option label="普通用户" value="1" />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveUser">保存</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getUserList } from '@/api/user'

// 查询条件
const queryForm = reactive({
  page: 1,
  size: 10,
  username: '',
  role: ''
})

// 用户列表
const users = ref([])

// 弹窗控制
const dialogVisible = ref(false)
const isEdit = ref(false)
const form = reactive({ id: null, username: '', role: '0' })

// 搜索（发请求）
const search = async () => {
  await getUserData()
}

// 打开新增弹窗
const openAddDialog = () => {
  isEdit.value = false
  form.id = null
  form.username = ''
  form.role = '0'
  dialogVisible.value = true
}

// 打开修改弹窗
const openEditDialog = (row) => {
  isEdit.value = true
  form.id = row.id
  form.username = row.username
  form.role = row.role
  dialogVisible.value = true
}

// 保存用户信息（可根据接口改成调用新增/修改接口）
const saveUser = () => {
  if (!form.username) {
    ElMessage.warning('请填写用户名称')
    return
  }
  if (isEdit.value) {
    const index = users.value.findIndex((item) => item.id === form.id)
    if (index !== -1) {
      users.value[index].username = form.username
      users.value[index].role = form.role
      users.value[index].roleText = form.role === '1' ? '管理员' : '普通用户'
      ElMessage.success('修改成功')
    }
  } else {
    const newId = users.value.length ? Math.max(...users.value.map((i) => i.id)) + 1 : 1
    users.value.push({
      id: newId,
      username: form.username,
      role: form.role,
      roleText: form.role === 1 ? '管理员' : '普通用户',
      createdAt: new Date().toISOString().slice(0, 10)
    })
    ElMessage.success('新增成功')
  }
  dialogVisible.value = false
}

// 删除用户（可根据接口改成调用删除接口）
const remove = (row) => {
  ElMessageBox.confirm(`确定删除用户 ${row.username} 吗？`, '提示', { type: 'warning' })
    .then(() => {
      users.value = users.value.filter((item) => item.id !== row.id)
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
    // 假设接口返回数据在 res.data.records
    users.value = res.data.records.map((item) => ({
      ...item,
      roleText: item.role === 1 ? '管理员' : '普通用户'
    }))
  } catch (error) {
    ElMessage.error('获取用户数据失败')
    console.error(error)
  }
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
</style>
