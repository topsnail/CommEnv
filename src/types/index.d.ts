// 证据类型定义
export interface Evidence {
  id: string
  category: string
  description: string
  location: string
  createdAt: string
  status: 'normal' | 'pending' | 'hidden'
  files: FileInfo[]
  gps?: {
    latitude: number
    longitude: number
  }
  exif?: Record<string, any>
}

// 文件信息类型
export interface FileInfo {
  id: string
  filename: string
  size: number
  type: string
  sha256: string
  url: string
  previewUrl: string
  uploadedAt: string
}

// 分类类型
export interface Category {
  id: string
  name: string
  icon: string
}

// 分类分组类型
export interface CategoryGroup {
  group: string
  items: Category[]
}

// 统计数据类型
export interface Stats {
  total: number
  normal: number
  pending: number
  hidden: number
  month: number
}

// 上传表单数据类型
export interface UploadFormData {
  files: File[]
  category: string
  description: string
  location: string
}

// API 响应类型
export interface ApiResponse<T> {
  success: boolean
  data: T
  error?: string
}
