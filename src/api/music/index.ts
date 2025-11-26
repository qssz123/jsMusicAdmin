import request from '@/axios'

export type MusicStatusParams = Record<string, any>

export const addMusic = (data: any) => {
  return request.post({ url: '/api/admin/music', data })
}

export const getCategoryList = (): Promise<IResponse> => {
  return request.get({ url: '/api/admin/category/list' })
}
export const editMusic = (data: any, id: string) => {
  return request.put({ url: `/api/admin/music/${id}`, data })
}
export const musicChain = (params: MusicStatusParams) => {
  return request.put({
    url: '/api/admin/music/chain',
    params
  })
}
export const musicStatus = (params: MusicStatusParams) => {
  return request.put({
    url: '/api/admin/music/status',
    params
  })
}
export const getMusicList = (params: Record<string, any>): Promise<IResponse> => {
  return request.get({
    url: '/api/admin/music/search',
    params
  })
}
