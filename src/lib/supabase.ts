// Local API Client (MySQL Backend)
// Replaces Supabase with direct API calls

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:6000';

interface ApiResponse<T> {
  data?: T;
  error?: { message: string };
}

// Fetch wrapper - JWT token'ı otomatik ekler
async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  } as Record<string, string>;

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `API Error: ${response.status}`);
  }

  return response;
}

export const api = {
  // Locations
  locations: {
    async getList() {
      const res = await apiFetch(`/api/locations`);
      return res.json();
    },
    async create(data: any) {
      const res = await apiFetch(`/api/locations`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return res.json();
    },
    async update(id: string, data: any) {
      const res = await apiFetch(`/api/locations/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      return res.json();
    },
    async delete(id: string) {
      const res = await apiFetch(`/api/locations/${id}`, {
        method: 'DELETE',
      });
      return res.json();
    },
  },

  // Regions
  regions: {
    async getList(locationId: string) {
      const res = await apiFetch(`/api/regions/${locationId}`);
      return res.json();
    },
    async create(data: any) {
      const res = await apiFetch(`/api/regions`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return res.json();
    },
    async update(id: string, data: any) {
      const res = await apiFetch(`/api/regions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      return res.json();
    },
    async delete(id: string) {
      const res = await apiFetch(`/api/regions/${id}`, {
        method: 'DELETE',
      });
      return res.json();
    },
  },

  // Near-Miss Reports
  reports: {
    async getList() {
      const res = await apiFetch(`/api/reports`);
      return res.json();
    },
    async getByLocation(locationId: string) {
      const res = await apiFetch(`/api/reports/${locationId}`);
      return res.json();
    },
    async create(data: any) {
      const res = await apiFetch(`/api/reports`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return res.json();
    },
  },

  // ISG Experts
  experts: {
    async getList(locationId: string) {
      const res = await apiFetch(`/api/experts/${locationId}`);
      return res.json();
    },
    async create(data: any) {
      const res = await apiFetch(`/api/experts`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return res.json();
    },
    async update(id: string, data: any) {
      const res = await apiFetch(`/api/experts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      return res.json();
    },
    async delete(id: string) {
      const res = await apiFetch(`/api/experts/${id}`, {
        method: 'DELETE',
      });
      return res.json();
    },
  },

  // Users
  users: {
    async getList() {
      const res = await apiFetch(`/api/users`);
      return res.json();
    },
    async create(data: any) {
      const res = await apiFetch(`/api/users`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return res.json();
    },
    async update(id: string, data: any) {
      const res = await apiFetch(`/api/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      return res.json();
    },
    async delete(id: string) {
      const res = await apiFetch(`/api/users/${id}`, {
        method: 'DELETE',
      });
      return res.json();
    },
  },

  // System Logs
  logs: {
    async getList() {
      const res = await apiFetch(`/api/logs`);
      return res.json();
    },
    async create(data: any) {
      const res = await apiFetch(`/api/logs`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return res.json();
    },
  },

  // System Settings
  settings: {
    async get() {
      const res = await apiFetch(`/api/settings`);
      return res.json();
    },
    async update(data: any) {
      const res = await apiFetch(`/api/settings`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      return res.json();
    },
  },

  // Health Check
  async health() {
    const res = await apiFetch(`/api/health`);
    return res.json();
  },
};

// Authentication API
const authApi = {
  async signInWithPassword(credentials: { email: string; password: string }) {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    if (!res.ok) {
      const error = await res.json();
      return { data: null, error: new Error(error.error || 'Login failed') };
    }

    const data = await res.json();
    return { data, error: null };
  },

  async signOut() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return { error: null };
  },

  async getSession() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (!token || !user) {
      return { data: { session: null }, error: null };
    }

    return {
      data: {
        session: {
          user: JSON.parse(user),
          access_token: token,
        },
      },
      error: null,
    };
  },

  onAuthStateChange(callback: any) {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (token && user) {
      callback('SIGNED_IN', {
        user: JSON.parse(user),
        access_token: token,
      });
    } else {
      callback('SIGNED_OUT', null);
    }

    return { data: { subscription: null } };
  },
};

// Mock Supabase compatibility layer (deprecated - use api instead)
// Kept for backward compatibility with existing component code
class QueryBuilder {
  private promise: Promise<any> = Promise.resolve({ data: [], error: null });

  private createProxy() {
    return new Proxy(this, {
      get: (target, prop) => {
        if (prop === 'then' || prop === 'catch' || prop === 'finally') {
          return (this.promise as any)[prop].bind(this.promise);
        }

        // Return chainable methods
        return (...args: any[]) => {
          return target.createProxy();
        };
      },
    });
  }

  select(columns?: string) { return this.createProxy(); }
  eq(column: string, value: any) { return this.createProxy(); }
  neq(column: string, value: any) { return this.createProxy(); }
  gt(column: string, value: any) { return this.createProxy(); }
  gte(column: string, value: any) { return this.createProxy(); }
  lt(column: string, value: any) { return this.createProxy(); }
  lte(column: string, value: any) { return this.createProxy(); }
  order(column: string, options?: any) { return this.createProxy(); }
  limit(count: number) { return this.createProxy(); }
  offset(count: number) { return this.createProxy(); }
  async maybeSingle() { return { data: null, error: null }; }
  async single() { return { data: null, error: null }; }
  async insert(data: any) { return { data: null, error: null }; }
  async update(data: any) { return { data: null, error: null }; }
  async delete() { return { data: null, error: null }; }
  then(onFulfilled?: any, onRejected?: any) { return this.promise.then(onFulfilled, onRejected); }
  catch(onRejected?: any) { return this.promise.catch(onRejected); }
  finally(onFinally?: any) { return this.promise.finally(onFinally); }
}

// Mock Supabase object for backward compatibility
export const supabase = {
  from: (table: string) => new QueryBuilder().createProxy(),
  auth: authApi,
};
