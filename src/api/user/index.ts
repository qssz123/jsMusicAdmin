import request from '@/axios'

export const getUserList = (params: any) => {
  return request.get({ url: '/api/admin/user/search', params })
}
