<script setup lang="tsx">
import { reactive, ref, watch, onMounted, unref, onUnmounted } from 'vue'
import { Form, FormSchema } from '@/components/Form'
import { useI18n } from '@/hooks/web/useI18n'
import { ElCheckbox, ElLink, ElTabs, ElTabPane, ElMessage } from 'element-plus'
import { useForm } from '@/hooks/web/useForm'
import { loginApi, getTestRoleApi, getAdminRoleApi, senCode } from '@/api/login'
import { useAppStore } from '@/store/modules/app'
import { usePermissionStore } from '@/store/modules/permission'
import { useRouter } from 'vue-router'
import type { RouteLocationNormalizedLoaded, RouteRecordRaw } from 'vue-router'
import { UserType } from '@/api/login/types'
import { useValidator } from '@/hooks/web/useValidator'
import { useUserStore } from '@/store/modules/user'
import { BaseButton } from '@/components/Button'

const { required } = useValidator()
const { t } = useI18n()
const appStore = useAppStore()
const userStore = useUserStore()
const permissionStore = usePermissionStore()
const { currentRoute, addRoute, push } = useRouter()

const emit = defineEmits(['to-register'])
const loading = ref(false)
const remember = ref(userStore.getRememberMe)
const sendLoading = ref(false)
const countDown = ref(0)
let timer: number | null = null

// 登录方式：account 或 phone
const loginType = ref<'account' | 'phone'>('account')

// schema
const schema = ref<FormSchema[]>([])
const { formRegister, formMethods } = useForm()
const { getFormData, getElFormExpose, setValues } = formMethods
import { constantRoutes } from '@/router/routes'
// 倒计时发送验证码
const sendCodeF = async () => {
  const formData = await getFormData<UserType>()
  const username = formData.username
  if (!username) {
    ElMessage.warning('请先输入手机号')
    return
  }
  sendLoading.value = true
  try {
    const res = await senCode(username)
    ElMessage.success('验证码已发送')
    if (res.data?.code) setValues({ code: res.data.code })
    countDown.value = 60
    timer = window.setInterval(() => {
      countDown.value--
      if (countDown.value <= 0 && timer) {
        clearInterval(timer)
        timer = null
      }
    }, 1000)
  } catch {
    ElMessage.error('发送失败')
  } finally {
    sendLoading.value = false
  }
}

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

// 初始化 schema
const updateSchema = () => {
  const base: FormSchema[] = [
    // {
    //   field: 'title',
    //   colProps: { span: 24 },
    //   formItemProps: {
    //     slots: {
    //       default: () => (
    //         <h2 class="text-2xl font-bold text-center w-[100%]">
    //           {loginType.value === 'account' ? '账号登录' : '手机号登录'}
    //         </h2>
    //       )
    //     }
    //   }
    // }
  ]

  if (loginType.value === 'account') {
    base.push(
      {
        field: 'username',
        label: '账号',
        component: 'Input',
        colProps: { span: 24 },
        componentProps: { placeholder: '请输入用户名' }
      },
      {
        field: 'password',
        label: '密码',
        component: 'InputPassword',
        colProps: { span: 24 },
        componentProps: {
          placeholder: '请输入密码',
          onKeydown: (_e: any) => {
            if (_e.key === 'Enter') signIn()
          }
        }
      }
    )
  } else {
    base.push(
      {
        field: 'username',
        label: '手机号',
        component: 'Input',
        colProps: { span: 24 },
        componentProps: {
          placeholder: '请输入手机号',
          slots: {
            suffix: () => (
              <ElLink
                type="primary"
                underline={false}
                disabled={sendLoading.value || countDown.value > 0}
                onClick={sendCodeF}
                style="font-size: 13px; margin-right: 5px;"
              >
                {countDown.value > 0 ? `${countDown.value}s后重发` : '发送验证码'}
              </ElLink>
            )
          }
        }
      },
      {
        field: 'code',
        label: '验证码',
        component: 'Input',
        colProps: { span: 24 },
        componentProps: {
          placeholder: '请输入验证码',
          onKeydown: (_e: any) => {
            if (_e.key === 'Enter') signIn()
          }
        }
      }
    )
  }

  // 记住我 + 登录按钮
  base.push(
    {
      field: 'tool',
      colProps: { span: 24 },
      formItemProps: {
        slots: {
          default: () => (
            <div class="flex justify-between items-center w-[100%]">
              <ElCheckbox v-model={remember.value} label={t('login.remember')} size="small" />
            </div>
          )
        }
      }
    },
    {
      field: 'login',
      colProps: { span: 24 },
      formItemProps: {
        slots: {
          default: () => (
            <BaseButton loading={loading.value} type="primary" class="w-[100%]" onClick={signIn}>
              {t('login.login')}
            </BaseButton>
          )
        }
      }
    }
  )

  schema.value = base
}

// 切换登录方式
watch(loginType, updateSchema, { immediate: true })

// 初始化
onMounted(() => {
  setValues({ username: '13800138000', password: '' })
})

const redirect = ref<string>('')
watch(
  () => currentRoute.value,
  (route: RouteLocationNormalizedLoaded) => {
    redirect.value = route?.query?.redirect as string
  },
  { immediate: true }
)

// 登录逻辑
const signIn = async () => {
  const formRef = await getElFormExpose()
  await formRef?.validate(async (isValid) => {
    if (!isValid) return
    loading.value = true
    const formData = await getFormData<UserType>()
    try {
      const payload =
        loginType.value === 'account'
          ? { phone: formData.username, password: formData.password }
          : { phone: formData.username, code: formData.code }

      const res = await loginApi(payload)
      if (res) {
        if (unref(remember)) {
          userStore.setLoginInfo({
            username: formData.username,
            password: formData.password,
            code: formData.code
          })
        } else {
          userStore.setLoginInfo(undefined)
        }
        userStore.setRememberMe(unref(remember))
        localStorage.setItem('role', res.data.role)
        userStore.setToken(res.data.token)
        userStore.setUserInfo(res.data)

        if (appStore.getDynamicRouter) {
          await getRole()
        } else {
          await permissionStore.generateRoutes('static').catch(() => {})
          permissionStore.getAddRouters.forEach((route) => addRoute(route as RouteRecordRaw))
          permissionStore.setIsAddRouters(true)
          push({ path: redirect.value || permissionStore.addRouters[0].path })
        }
      }
    } finally {
      loading.value = false
    }
  })
}

// 获取角色信息
const getRole = async () => {
  // 获取表单数据
  const formData = await getFormData<UserType>()
  const params = { roleName: formData.username }

  // 之前根据 appStore 动态获取接口，现在可忽略接口调用
  // const res =
  //   appStore.getDynamicRouter && appStore.getServerDynamicRouter
  //     ? await getAdminRoleApi(params)
  //     : await getTestRoleApi(params)

  // 直接使用固定路由
  const routers: RouteRecordRaw[] = constantRoutes

  // 设置用户路由（如果需要存储）
  userStore.setRoleRouters(routers)

  // 添加固定路由到路由器
  routers.forEach((route) => addRoute(route))

  // 标记已添加路由
  permissionStore.setIsAddRouters(true)

  // 跳转到首页或默认路由
  push({ path: redirect.value || routers[0].path })
}
</script>

<template>
  <div class="w-full">
    <ElTabs v-model="loginType" class="mb-4 no-tab-border">
      <ElTabPane label="账号登录" name="account" />
      <ElTabPane label="手机号登录" name="phone" />
    </ElTabs>

    <Form
      :schema="schema"
      label-position="left"
      hide-required-asterisk
      size="large"
      class="dark:(border-1 border-[var(--el-border-color)] border-solid)"
      @register="formRegister"
    />
  </div>
</template>
<style scoped>
.no-tab-border :deep(.el-tabs__nav-wrap::after) {
  display: none !important;
}
</style>
