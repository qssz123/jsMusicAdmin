import request from '@/axios'
import type { commentSerachType } from './types'

export const getCommentList = (params: commentSerachType) => {
  return request.get({ url: '/api/admin/comment/search', params })
}
export const updateCommentStatus = (params: any) => {
  return request.put({ url: `/api/admin/comment/status`, params })
}
export const deleteComment = (id: string) => {
  return request.delete({ url: `/api/admin/comment/${id}` })
}
