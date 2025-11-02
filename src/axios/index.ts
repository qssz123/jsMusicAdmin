import service from './service'
import { CONTENT_TYPE } from '@/constants'
import { useUserStoreWithOut } from '@/store/modules/user'

const API_BASE_PATH = import.meta.env.VITE_API_BASE_PATH || '/api'
const request = (option: AxiosConfig) => {
  const { url, method, params, data, headers, responseType } = option
  const userStore = useUserStoreWithOut()

  // 👉 判断是否 mock 请求（url 中包含 "mock"）
  // const isMock = url.includes('mock')
  // if (!url.includes('mock') && !url.startsWith(API_BASE_PATH)) {
  //   url = `${API_BASE_PATH}${url}`
  // }
  // 动态构建请求配置
  const config: any = {
    url,
    method,
    params,
    data,
    responseType,
    headers: {
      'Content-Type': CONTENT_TYPE,
      [userStore.getTokenKey ?? 'Authorization']: userStore.getToken
        ? `Bearer ${userStore.getToken}`
        : '',
      ...headers
    }
  }

  // ⚙️ 如果是 mock 请求，不使用 VITE_API_BASE_PATH
  // if (isMock) {
  config.baseURL = ''
  // }

  return service.request(config)
}

export default {
  get: <T = any>(option: AxiosConfig) => {
    return request({ method: 'get', ...option }) as Promise<IResponse<T>>
  },
  post: <T = any>(option: AxiosConfig) => {
    return request({ method: 'post', ...option }) as Promise<IResponse<T>>
  },
  delete: <T = any>(option: AxiosConfig) => {
    return request({ method: 'delete', ...option }) as Promise<IResponse<T>>
  },
  put: <T = any>(option: AxiosConfig) => {
    return request({ method: 'put', ...option }) as Promise<IResponse<T>>
  },
  cancelRequest: (url: string | string[]) => {
    return service.cancelRequest(url)
  },
  cancelAllRequest: () => {
    return service.cancelAllRequest()
  }
}
