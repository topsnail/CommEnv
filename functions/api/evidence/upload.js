import { onRequestPost as onUpload } from '../upload.js'

// 兼容旧路由：/api/evidence/upload -> /api/upload
export async function onRequestPost(context) {
  return onUpload(context)
}

