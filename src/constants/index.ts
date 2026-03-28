// 统一常量管理

// 应用配置
export const APP_CONFIG = {
  NAME: '社区证据采集系统',
  VERSION: '1.0.0',
  API_TIMEOUT: 60000,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_FILE_TYPES: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic'
  ],
  PAGE_SIZE: 20
}

// 状态常量
export const STATUS = {
  NORMAL: 'normal',
  PENDING: 'pending',
  HIDDEN: 'hidden'
}

// 路由常量
export const ROUTES = {
  HOME: '/',
  UPLOAD: '/upload',
  EVIDENCE: '/evidence',
  ADMIN: '/admin',
  ADMIN_LOGIN: '/admin/login'
}

// 消息常量
export const MESSAGES = {
  UPLOAD_SUCCESS: '上传成功！为避免上传涉黄、暴力、隐私等不合规图片，图片将有管理员通过审核后显示。',
  UPLOAD_ERROR: '上传失败，请重试',
  SELECT_FILE: '请先选择要上传的文件',
  SELECT_CATEGORY: '请先选择问题分类',
  LOGIN_SUCCESS: '登录成功',
  LOGIN_ERROR: '登录失败，请检查密码',
  OPERATION_SUCCESS: '操作成功',
  OPERATION_ERROR: '操作失败，请重试'
}

// 正则表达式
export const REGEX = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^1[3-9]\d{9}$/,
  PASSWORD: /^\w{6,20}$/
}

// 导入分类常量
export * from './categories'
