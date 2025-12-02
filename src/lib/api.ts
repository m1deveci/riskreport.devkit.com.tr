const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:6000';

const getAuthToken = () => localStorage.getItem('token') || '';

async function apiCall(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE_URL}/api${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export const api = {
  locations: {
    getList: async () => apiCall('/locations'),
    get: async (id: string) => apiCall(`/locations/${id}`),
    create: async (data: any) => apiCall('/locations', { method: 'POST', body: JSON.stringify(data) }),
    update: async (id: string, data: any) => apiCall(`/locations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: async (id: string) => apiCall(`/locations/${id}`, { method: 'DELETE' }),
  },
  regions: {
    getList: async (locationId?: string) => apiCall(`/regions${locationId ? `?location_id=${locationId}` : ''}`),
    get: async (id: string) => apiCall(`/regions/${id}`),
    create: async (data: any) => apiCall('/regions', { method: 'POST', body: JSON.stringify(data) }),
    update: async (id: string, data: any) => apiCall(`/regions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: async (id: string) => apiCall(`/regions/${id}`, { method: 'DELETE' }),
  },
  reports: {
    getList: async () => apiCall('/reports'),
    get: async (id: string) => apiCall(`/reports/${id}`),
    create: async (data: any) => apiCall('/reports', { method: 'POST', body: JSON.stringify(data) }),
    update: async (id: string, data: any) => apiCall(`/reports/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: async (id: string) => apiCall(`/reports/${id}`, { method: 'DELETE' }),
  },
  users: {
    getList: async () => apiCall('/users'),
    get: async (id: string) => apiCall(`/users/${id}`),
    create: async (data: any) => apiCall('/users', { method: 'POST', body: JSON.stringify(data) }),
    update: async (id: string, data: any) => apiCall(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: async (id: string) => apiCall(`/users/${id}`, { method: 'DELETE' }),
  },
  settings: {
    getList: async () => apiCall('/system-settings'),
    update: async (id: string, data: any) => apiCall(`/system-settings/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  },
  logs: {
    getList: async () => apiCall('/logs'),
    get: async (id: string) => apiCall(`/logs/${id}`),
  },
  experts: {
    getList: async () => apiCall('/isg-experts'),
    get: async (id: string) => apiCall(`/isg-experts/${id}`),
    create: async (data: any) => apiCall('/isg-experts', { method: 'POST', body: JSON.stringify(data) }),
    update: async (id: string, data: any) => apiCall(`/isg-experts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: async (id: string) => apiCall(`/isg-experts/${id}`, { method: 'DELETE' }),
  },
};
