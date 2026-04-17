import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

// Clients
export const getClients    = ()                => api.get('/clients')
export const createClient  = (data)            => api.post('/clients', data)
export const updateClient  = (id, data)        => api.put(`/clients/${id}`, data)
export const updateClientStatus = (id, status) => api.patch(`/clients/${id}/status`, { status })
export const deleteClient  = (id)              => api.delete(`/clients/${id}`)
export const setInvoice    = (id, amount)      => api.put(`/clients/${id}/invoice`, { amount })

// Logs
export const getClientLogs = (id)              => api.get(`/clients/${id}/logs`)
export const addClientLog  = (id, data)        => api.post(`/clients/${id}/logs`, data)

// Revenue
export const getRevenue        = ()            => api.get('/revenue')
export const getMonthlyRevenue = ()            => api.get('/revenue/monthly')

// Chat
export const sendChat      = (data)            => api.post('/chat', data)
export const getChatHistory= ()                => api.get('/chat/history')
export const clearChat     = ()                => api.delete('/chat/history')

// AI
export const getBriefing   = ()                => api.get('/briefing')
export const draftEmail    = (data)            => api.post('/email/draft', data)

// Files
export const uploadFile    = (formData)        => api.post('/upload', formData)
export const getFiles      = ()                => api.get('/files')

// Tasks
export const getTasks      = ()                => api.get('/tasks')
export const createTask    = (data)            => api.post('/tasks', data)
export const updateTask    = (id, data)        => api.put(`/tasks/${id}`, data)
export const updateTaskStatus = (id, status)   => api.patch(`/tasks/${id}/status`, { status })
export const deleteTask    = (id)              => api.delete(`/tasks/${id}`)
