import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE || '/api'

export const botApi = {
  // Bot Control
  startBot: () => axios.post(`${API_BASE}/bot/start`),
  stopBot: () => axios.post(`${API_BASE}/bot/stop`),
  getStatus: () => axios.get(`${API_BASE}/bot/status`).then(res => res.data),
  runCampaign: (videoUrl, action) => axios.post(`${API_BASE}/campaign/run`, { videoUrl, action }).then(res => res.data),
  
  // Configuration
  getConfig: () => axios.get(`${API_BASE}/config`).then(res => res.data),
  saveConfig: (config) => axios.post(`${API_BASE}/config`, config),
  
  // Proxies
  testProxy: (proxy) => axios.post(`${API_BASE}/proxy/test`, { proxy }),
  getProxyStatus: () => axios.get(`${API_BASE}/proxy/status`).then(res => res.data),
  
  // Database
  getDbStatus: () => axios.get(`${API_BASE}/db/status`).then(res => res.data),

  // Logs
  getLogs: () => axios.get(`${API_BASE}/logs`).then(res => res.data),
  clearLogs: () => axios.post(`${API_BASE}/logs/clear`)
}
