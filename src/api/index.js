import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 60000,
  withCredentials: true,
})

export const evidenceApi = {
  upload: async (formData) => {
    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data
  },

  list: async (params) => {
    const response = await api.get('/evidence/list', { params })
    return response.data
  },

  detail: async (id) => {
    const response = await api.get(`/evidence/${id}`)
    return response.data
  },

  verify: async (evidenceId, file) => {
    const form = new FormData()
    form.append('evidenceId', evidenceId)
    form.append('file', file)
    const response = await api.post('/evidence/verify', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  }
}

export const commentApi = {
  create: async (evidenceId, content, author) => {
    throw new Error('留言功能已移除')
  },

  list: async (evidenceId, params) => {
    throw new Error('留言功能已移除')
  }
}

export const adminApi = {
  login: async (password) => {
    const response = await api.post('/admin/login', { password })
    return response.data
  },
  logout: async () => {
    const response = await api.post('/admin/logout')
    return response.data
  },

  listAll: async (params) => {
    const response = await api.get('/admin/evidence', { params })
    return response.data
  },

  hideEvidence: async (id) => {
    const response = await api.post(`/admin/evidence/${id}/hide`)
    return response.data
  },

  showEvidence: async (id) => {
    const response = await api.post(`/admin/evidence/${id}/show`)
    return response.data
  },

  exportExcel: async (params) => {
    const response = await api.get('/admin/export/excel', {
      params,
      responseType: 'blob'
    })
    return response.data
  },

  downloadAll: async (params) => {
    const ids = String(params?.ids || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const response = await api.post('/admin/download/all', {
      ids,
    }, {
      responseType: 'blob'
    })
    return response.data
  },

  listComments: async (params) => {
    throw new Error('留言功能已移除')
  },

  hideComment: async (id) => {
    throw new Error('留言功能已移除')
  }
}

export default api
