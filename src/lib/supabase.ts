// Local API Client (MySQL Backend)
// Replaces Supabase with direct API calls

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:6000';

interface ApiResponse<T> {
  data?: T;
  error?: { message: string };
}

export const api = {
  // Locations
  locations: {
    async getList() {
      const res = await fetch(`${API_URL}/api/locations`);
      return res.json();
    },
    async create(data: any) {
      const res = await fetch(`${API_URL}/api/locations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
  },

  // Regions
  regions: {
    async getList(locationId: string) {
      const res = await fetch(`${API_URL}/api/regions/${locationId}`);
      return res.json();
    },
    async create(data: any) {
      const res = await fetch(`${API_URL}/api/regions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
  },

  // Near-Miss Reports
  reports: {
    async getList() {
      const res = await fetch(`${API_URL}/api/reports`);
      return res.json();
    },
    async getByLocation(locationId: string) {
      const res = await fetch(`${API_URL}/api/reports/${locationId}`);
      return res.json();
    },
    async create(data: any) {
      const res = await fetch(`${API_URL}/api/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
  },

  // ISG Experts
  experts: {
    async getList(locationId: string) {
      const res = await fetch(`${API_URL}/api/experts/${locationId}`);
      return res.json();
    },
    async create(data: any) {
      const res = await fetch(`${API_URL}/api/experts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
  },

  // Users
  users: {
    async getList() {
      const res = await fetch(`${API_URL}/api/users`);
      return res.json();
    },
    async create(data: any) {
      const res = await fetch(`${API_URL}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
  },

  // System Logs
  logs: {
    async getList() {
      const res = await fetch(`${API_URL}/api/logs`);
      return res.json();
    },
    async create(data: any) {
      const res = await fetch(`${API_URL}/api/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
  },

  // System Settings
  settings: {
    async get() {
      const res = await fetch(`${API_URL}/api/settings`);
      return res.json();
    },
    async update(data: any) {
      const res = await fetch(`${API_URL}/api/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return res.json();
    },
  },

  // Health Check
  async health() {
    const res = await fetch(`${API_URL}/api/health`);
    return res.json();
  },
};

// Mock Supabase compatibility layer for existing code
export const supabase = {
  from: (table: string) => ({
    select: () => Promise.resolve({ data: [], error: null }),
    insert: () => Promise.resolve({ data: null, error: null }),
    update: () => Promise.resolve({ data: null, error: null }),
    delete: () => Promise.resolve({ data: null, error: null }),
  }),
  auth: {
    getSession: () => Promise.resolve({ data: { session: null } }),
    onAuthStateChange: () => ({ data: { subscription: null } }),
  },
};
