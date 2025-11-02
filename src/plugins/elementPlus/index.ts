import type { App } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
// import * as ElementPlusIconsVue from '@element-plus/icons-vue'

// 按需引入一些插件（如果需要）
import { ElLoading, ElMessage, ElMessageBox, ElNotification } from 'element-plus'

// 中文语言包
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'

export const setupElementPlus = (app: App<Element>) => {
  // 全局引入 Element Plus 核心
  app.use(ElementPlus, {
    locale: zhCn,
    size: 'default'
  })

  // // 注册所有图标（重要！）
  // for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  //   app.component(key, component)
  // }

  // 全局挂载服务类组件
  const globalProperties = app.config.globalProperties

  globalProperties.$loading = ElLoading.service
  globalProperties.$message = ElMessage
  globalProperties.$msgbox = ElMessageBox
  globalProperties.$alert = ElMessageBox.alert
  globalProperties.$confirm = ElMessageBox.confirm
  globalProperties.$prompt = ElMessageBox.prompt
  globalProperties.$notify = ElNotification

  console.log('🎉 Element Plus 全局引入完成，所有组件已注册')
}
