import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import type { App } from 'vue'
import { Layout, getParentLayout } from '@/utils/routerHelper'
import { useI18n } from '@/hooks/web/useI18n'
import { NO_RESET_WHITE_LIST } from '@/constants'

const { t } = useI18n()

export const constantRouterMap: AppRouteRecordRaw[] = [
  {
    path: '/',
    component: Layout,
    redirect: '/musicManagement',
    name: 'Root',
    meta: {
      hidden: true
    }
  },
  {
    path: '/redirect',
    component: Layout,
    name: 'RedirectWrap',
    children: [
      {
        path: '/redirect/:path(.*)',
        name: 'Redirect',
        component: () => import('@/views/Redirect/Redirect.vue'),
        meta: {}
      }
    ],
    meta: {
      hidden: true,
      noTagsView: true
    }
  },
  {
    path: '/login',
    component: () => import('@/views/Login/Login.vue'),
    name: 'Login',
    meta: {
      hidden: true,
      title: t('router.login'),
      noTagsView: true
    }
  },
  {
    path: '/personal',
    component: Layout,
    redirect: '/personal/personal-center',
    name: 'Personal',
    meta: {
      title: t('router.personal'),
      hidden: true,
      canTo: true
    },
    children: [
      {
        path: 'personal-center',
        component: () => import('@/views/Personal/PersonalCenter/PersonalCenter.vue'),
        name: 'PersonalCenter',
        meta: {
          title: t('router.personalCenter'),
          hidden: true,
          canTo: true
        }
      }
    ]
  },
  {
    path: '/404',
    component: () => import('@/views/Error/404.vue'),
    name: 'NoFind',
    meta: {
      hidden: true,
      title: '404',
      noTagsView: true
    }
  }
]

export const asyncRouterMap: AppRouteRecordRaw[] = [
  // {
  //   path: '/dashboard',
  //   component: Layout,
  //   redirect: '/dashboard/analysis',
  //   name: 'Dashboard',
  //   meta: {
  //     title: t('router.dashboard'),
  //     icon: 'vi-ant-design:dashboard-filled',
  //     alwaysShow: true
  //   },
  //   children: [
  //     {
  //       path: 'analysis',
  //       component: () => import('@/views/Dashboard/Analysis.vue'),
  //       name: 'Analysis',
  //       meta: {
  //         title: t('router.analysis'),
  //         noCache: true,
  //         affix: true
  //       }
  //     }
  //   ]
  // },
  {
    path: '/musicManagement',
    component: Layout,
    redirect: '/musicManagement/addMusic',
    name: 'musicManagement',
    meta: {
      title: t('router.musicManagement'),
      icon: 'vi-ant-design:dashboard-filled',
      alwaysShow: true
    },
    children: [
      {
        path: 'addMusic',
        component: () => import('@/views/MusicManagement/AddMusic.vue'),
        name: 'addMusic',
        meta: {
          title: t('router.addMusic'),
          noCache: true,
          affix: true
        }
      },
      {
        path: 'musicView',
        component: () => import('@/views/MusicManagement/MusicView.vue'),
        name: 'musicView',
        meta: {
          title: t('router.musicView'),
          noCache: true,
          affix: true
        }
      },
      {
        path: 'categoryManagement',
        component: () => import('@/views/MusicManagement/CategoryManagement.vue'),
        name: 'categoryManagement',
        meta: {
          title: t('router.categoryManagement'),
          noCache: true,
          affix: true
        }
      }
    ]
  },
  {
    path: '/UserManagement',
    component: Layout,
    redirect: '/UserManagement/viewUsers.vue',
    name: 'userManagement',
    meta: {
      title: t('router.userManagement'),
      icon: 'vi-ant-design:dashboard-filled',
      alwaysShow: true
    },
    children: [
      {
        path: 'viewUsers',
        component: () => import('@/views/UserManagement/ViewUsers.vue'),
        name: 'viewUsers',
        meta: {
          title: t('router.viewUsers'),
          noCache: true,
          affix: true
        }
      },
      {
        path: 'roleManagement',
        component: () => import('@/views/UserManagement/RoleManagement.vue'),
        name: 'roleManagement',
        meta: {
          title: t('router.roleManagement'),
          noCache: true,
          affix: true
        }
      }
    ]
  },
  {
    path: '/commentManagement',
    component: Layout,
    redirect: '/commentManagement/viewComments',
    name: 'commentManagement',
    meta: {
      title: t('router.commentManagement'),
      icon: 'vi-ant-design:dashboard-filled',
      alwaysShow: true
    },
    children: [
      {
        path: 'viewComments',
        component: () => import('@/views/CommentManagement/ViewComments.vue'),
        name: 'viewComments',
        meta: {
          title: t('router.viewComments'),
          noCache: true,
          affix: true
        }
      },
      {
        path: 'commentCategories',
        component: () => import('@/views/CommentManagement/CommentCategories.vue'),
        name: 'commentCategories',
        meta: {
          title: t('router.commentCategories'),
          noCache: true,
          affix: true
        }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  strict: true,
  routes: [...constantRouterMap, ...asyncRouterMap], // ✅ 合并两个路由表
  scrollBehavior: () => ({ left: 0, top: 0 })
})

export const resetRouter = (): void => {
  router.getRoutes().forEach((route) => {
    const { name } = route
    if (name && !NO_RESET_WHITE_LIST.includes(name as string)) {
      router.hasRoute(name) && router.removeRoute(name)
    }
  })
}

export const setupRouter = (app: App<Element>) => {
  app.use(router)
}

export default router
