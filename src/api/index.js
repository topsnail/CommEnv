import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 60000
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('adminToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
}, error => {
  return Promise.reject(error)
})

export const evidenceApi = {
  upload: async (formData) => {
    const response = await api.post('/evidence/upload', formData, {
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

export const adminApi = {
  login: async (password) => {
    const response = await api.post('/admin/login', { password })
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

  exportExcel: async () => {
    const response = await api.get('/admin/export/excel', {
      responseType: 'blob'
    })
    return response.data
  },

  downloadAll: async () => {
    const response = await api.get('/admin/download/all', {
      responseType: 'blob'
    })
    return response.data
  }
}

export default api
