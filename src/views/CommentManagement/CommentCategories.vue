<template>
  <el-card class="comment-category-card">
    <!-- 查询条件 -->
    <el-form :inline="true" :model="queryForm" class="query-form">
      <el-form-item label="分类名称">
        <el-input v-model="queryForm.name" placeholder="请输入分类名称" />
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="queryForm.status" placeholder="请选择状态" style="width: 150px">
          <el-option label="启用" value="enabled" />
          <el-option label="禁用" value="disabled" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="search">搜索</el-button>
        <el-button type="success" @click="openAddDialog">新增分类</el-button>
      </el-form-item>
    </el-form>

    <!-- 表格 -->
    <el-table :data="filteredCategories" border style="width: 100%; margin-top: 20px">
      <el-table-column prop="name" label="分类名称" width="200" />
      <el-table-column prop="status" label="状态" width="120">
        <template #default="scope">
          <el-tag :type="scope.row.status === 'enabled' ? 'success' : 'info'">
            {{ scope.row.statusText }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="创建日期" width="180" />
      <el-table-column label="操作" width="200">
        <template #default="scope">
          <el-button type="primary" size="mini" @click="openEditDialog(scope.row)">编辑</el-button>
          <el-button type="danger" size="mini" @click="remove(scope.row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 弹窗 -->
    <el-dialog
      :title="isEdit ? '编辑分类' : '新增分类'"
      v-model="dialogVisible"
      width="400px"
      :append-to-body="true"
    >
      <el-form :model="form" label-width="100px">
        <el-form-item label="分类名称">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status" placeholder="请选择状态">
            <el-option label="启用" value="enabled" />
            <el-option label="禁用" value="disabled" />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveCategory">保存</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { reactive, ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

// 查询条件
const queryForm = reactive({
  name: '',
  status: ''
})

// 分类数据
const categories = ref([
  { id: 1, name: '正能量', status: 'enabled', statusText: '启用', createdAt: '2025-10-01' },
  { id: 2, name: '搞笑', status: 'disabled', statusText: '禁用', createdAt: '2025-10-05' },
  { id: 3, name: '励志', status: 'enabled', statusText: '启用', createdAt: '2025-10-10' }
])

// 弹窗控制
const dialogVisible = ref(false)
const isEdit = ref(false)
const form = reactive({ id: null, name: '', status: 'enabled' })

// 搜索
const search = () => {
  ElMessage.info('搜索功能已实现表格过滤')
}

// 打开新增弹窗
const openAddDialog = () => {
  isEdit.value = false
  form.id = null
  form.name = ''
  form.status = 'enabled'
  dialogVisible.value = true
}

// 打开编辑弹窗
const openEditDialog = (row) => {
  isEdit.value = true
  form.id = row.id
  form.name = row.name
  form.status = row.status
  dialogVisible.value = true
}

// 保存分类
const saveCategory = () => {
  if (!form.name) {
    ElMessage.warning('请填写分类名称')
    return
  }
  if (isEdit.value) {
    const index = categories.value.findIndex((item) => item.id === form.id)
    if (index !== -1) {
      categories.value[index].name = form.name
      categories.value[index].status = form.status
      categories.value[index].statusText = form.status === 'enabled' ? '启用' : '禁用'
      ElMessage.success('编辑成功')
    }
  } else {
    const newId = categories.value.length ? Math.max(...categories.value.map((i) => i.id)) + 1 : 1
    categories.value.push({
      id: newId,
      name: form.name,
      status: form.status,
      statusText: form.status === 'enabled' ? '启用' : '禁用',
      createdAt: new Date().toISOString().slice(0, 10)
    })
    ElMessage.success('新增成功')
  }
  dialogVisible.value = false
}

// 删除分类
const remove = (row) => {
  ElMessageBox.confirm(`确定删除分类 ${row.name} 吗？`, '提示', { type: 'warning' })
    .then(() => {
      categories.value = categories.value.filter((item) => item.id !== row.id)
      ElMessage.success('已删除')
    })
    .catch(() => {
      ElMessage.info('已取消删除')
    })
}

// 过滤表格
const filteredCategories = computed(() => {
  return categories.value.filter((item) => {
    const matchesName = queryForm.name ? item.name.includes(queryForm.name) : true
    const matchesStatus = queryForm.status ? item.status === queryForm.status : true
    return matchesName && matchesStatus
  })
})
</script>

<style scoped>
.comment-category-card {
  padding: 20px;
}

.query-form {
  margin-bottom: 20px;
}
</style>
