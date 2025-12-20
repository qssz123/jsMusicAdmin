import { defineStore } from 'pinia'
import { asyncRouterMap, constantRouterMap } from '@/router'
import {
  generateRoutesByFrontEnd,
  generateRoutesByServer,
  flatMultiLevelRoutes
} from '@/utils/routerHelper'
import { store } from '../index'
import { cloneDeep } from 'lodash-es'

export interface PermissionState {
  routers: AppRouteRecordRaw[]
  addRouters: AppRouteRecordRaw[]
  isAddRouters: boolean
  menuTabRouters: AppRouteRecordRaw[]
}

// 获取用户角色：直接从localStorage获取
const getUserRole = (): string => {
  return localStorage.getItem('role') || '0'
}

// 过滤函数
const filterByRole = (routes: AppRouteRecordRaw[], role: string): AppRouteRecordRaw[] => {
  const roleNum = parseInt(role) || 0

  return routes
    .map((route) => ({ ...route })) // 创建深拷贝
    .filter((route) => {
      // 检查当前路由是否有权限
      if (route.meta?.role && !route.meta.role.includes(roleNum)) {
        return false
      }

      // 如果有子路由，递归过滤
      if (route.children && route.children.length > 0) {
        // 深度过滤子路由
        const filteredChildren = filterByRole(route.children, role)

        // 如果子路由全部被过滤，父路由也不显示
        if (filteredChildren.length === 0) {
          return false
        }

        // 更新子路由
        route.children = filteredChildren
      }

      return true
    })
}

export const usePermissionStore = defineStore('permission', {
  state: (): PermissionState => ({
    routers: [],
    addRouters: [],
    isAddRouters: false,
    menuTabRouters: []
  }),
  getters: {
    getRouters(): AppRouteRecordRaw[] {
      // 直接从localStorage获取角色并过滤
      const role = getUserRole()
      return filterByRole(this.routers, role)
    },
    getAddRouters(): AppRouteRecordRaw[] {
      const role = getUserRole()
      const filteredRoutes = filterByRole(this.addRouters, role)
      return flatMultiLevelRoutes(cloneDeep(filteredRoutes))
    },
    getIsAddRouters(): boolean {
      return this.isAddRouters
    },
    getMenuTabRouters(): AppRouteRecordRaw[] {
      const role = getUserRole()
      return filterByRole(this.menuTabRouters, role)
    }
  },
  actions: {
    generateRoutes(
      type: 'server' | 'frontEnd' | 'static',
      routers?: AppCustomRouteRecordRaw[] | string[]
    ): Promise<unknown> {
      return new Promise<void>((resolve) => {
        let routerMap: AppRouteRecordRaw[] = []

        // 直接从localStorage获取角色
        const role = getUserRole()

        console.log('生成路由，当前角色:', role)

        // 根据角色过滤路由
        routerMap = filterByRole(cloneDeep(asyncRouterMap), role)

        console.log(
          '过滤后的路由:',
          routerMap.map((r) => ({
            path: r.path,
            children: r.children?.map((c) => c.path)
          }))
        )

        // 404 一定要放到最后面
        this.addRouters = routerMap.concat([
          {
            path: '/:path(.*)*',
            redirect: '/404',
            name: '404Page',
            meta: {
              hidden: true,
              breadcrumb: false
            }
          }
        ])

        // 存储完整路由
        this.routers = cloneDeep(constantRouterMap).concat(asyncRouterMap)

        resolve()
      })
    },

    setIsAddRouters(state: boolean): void {
      this.isAddRouters = state
    },

    setMenuTabRouters(routers: AppRouteRecordRaw[]): void {
      this.menuTabRouters = routers
    }
  },
  persist: [
    {
      pick: ['routers'],
      storage: localStorage
    },
    {
      pick: ['addRouters'],
      storage: localStorage
    },
    {
      pick: ['menuTabRouters'],
      storage: localStorage
    }
  ]
})

export const usePermissionStoreWithOut = () => {
  return usePermissionStore(store)
}
