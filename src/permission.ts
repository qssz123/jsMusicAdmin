import router from './router'
import { useAppStoreWithOut } from '@/store/modules/app'
import type { RouteRecordRaw } from 'vue-router'
import { useTitle } from '@/hooks/web/useTitle'
import { useNProgress } from '@/hooks/web/useNProgress'
import { usePermissionStoreWithOut } from '@/store/modules/permission'
import { usePageLoading } from '@/hooks/web/usePageLoading'
import { NO_REDIRECT_WHITE_LIST } from '@/constants'
import { useUserStoreWithOut } from '@/store/modules/user'

const { start, done } = useNProgress()

const { loadStart, loadDone } = usePageLoading()

// 权限检查函数
const hasPermission = (role: number, requiredRoles?: number[]): boolean => {
  if (!requiredRoles || requiredRoles.length === 0) {
    return true
  }
  return requiredRoles.includes(role)
}

// 获取当前用户角色
const getCurrentRole = (): number => {
  const userStore = useUserStoreWithOut()
  const role = userStore.getUserRole

  if (role !== undefined && role !== null) {
    return role
  }

  // 从 localStorage 获取
  const storedRole = localStorage.getItem('role')
  if (storedRole) {
    const roleNum = parseInt(storedRole, 10)
    if (!isNaN(roleNum)) {
      userStore.setRole(roleNum)
      return roleNum
    }
  }

  return 0 // 默认角色
}

router.beforeEach(async (to, from, next) => {
  start()
  loadStart()

  const permissionStore = usePermissionStoreWithOut()
  const appStore = useAppStoreWithOut()
  const userStore = useUserStoreWithOut()

  // 白名单路由直接放行
  if (NO_REDIRECT_WHITE_LIST.includes(to.path)) {
    next()
    return
  }

  // 检查用户是否登录
  if (userStore.getToken) {
    // 已登录用户访问登录页，重定向到首页
    if (to.path === '/login') {
      next({ path: '/' })
      return
    }
    // 强权限检查 - 检查即将访问的路由
    const currentRole = getCurrentRole()

    // 检查是否有权限访问目标路由
    if (to.matched.length > 0) {
      const targetRoute = to.matched[to.matched.length - 1]
      if (targetRoute.meta?.role) {
        const requiredRoles = targetRoute.meta.role as number[]
        if (!hasPermission(currentRole, requiredRoles)) {
          console.warn('无权限访问:', to.path, '用户角色:', currentRole, '所需角色:', requiredRoles)
          // 重定向到有权限的页面
          next('/musicManagement/addMusic')
          return
        }
      }
    }
    if (to.meta?.role) {
      const requiredRoles = to.meta.role as number[]
      if (!hasPermission(currentRole, requiredRoles)) {
        // 没有权限，跳转到404或无权限页面
        next('/404')
        return
      }
    }

    // 检查是否已添加动态路由
    if (permissionStore.getIsAddRouters) {
      next()
      return
    }

    try {
      // 开发者可根据实际情况进行修改
      const roleRouters = userStore.getRoleRouters || []

      // 是否使用动态路由
      if (appStore.getDynamicRouter) {
        appStore.serverDynamicRouter
          ? await permissionStore.generateRoutes('server', roleRouters as AppCustomRouteRecordRaw[])
          : await permissionStore.generateRoutes('frontEnd', roleRouters as string[])
      } else {
        await permissionStore.generateRoutes('static')
      }

      // 动态添加路由
      permissionStore.getAddRouters.forEach((route) => {
        router.addRoute(route as unknown as RouteRecordRaw)
      })

      // 处理重定向
      const redirectPath = from.query.redirect || to.path
      const redirect = decodeURIComponent(redirectPath as string)
      const nextData = to.path === redirect ? { ...to, replace: true } : { path: redirect }

      permissionStore.setIsAddRouters(true)
      next(nextData)
    } catch (error) {
      console.error('路由生成失败:', error)
      // 路由生成失败，跳转到登录页
      userStore.reset()
      next(`/login?redirect=${to.path}`)
    }
  } else {
    // 未登录用户，跳转到登录页
    next(`/login?redirect=${to.path}`)
  }
})

router.afterEach((to) => {
  useTitle(to?.meta?.title as string)
  done() // 结束Progress
  loadDone()
})
