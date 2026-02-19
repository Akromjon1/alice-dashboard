interface AppConfig {
  gatewayUrl: string;
  apiToken: string;
}

const getConfig = (): AppConfig | null => {
  const raw = localStorage.getItem('alice-config');
  return raw ? JSON.parse(raw) : null;
};

export const saveConfig = (config: AppConfig) => {
  localStorage.setItem('alice-config', JSON.stringify(config));
};

export const clearConfig = () => {
  localStorage.removeItem('alice-config');
};

export const isConfigured = () => !!getConfig();

const headers = () => {
  const config = getConfig();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config?.apiToken}`,
  };
};

const baseUrl = () => {
  const config = getConfig();
  return config?.gatewayUrl || '';
};

export const api = {
  get: async (endpoint: string) => {
    const res = await fetch(`${baseUrl()}${endpoint}`, { headers: headers() });
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json();
  },
  post: async (endpoint: string, body?: any) => {
    const res = await fetch(`${baseUrl()}${endpoint}`, {
      method: 'POST',
      headers: headers(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json();
  },
};

export const getStatus = () => api.get('/api/status');
export const getSessions = () => api.get('/api/sessions');
export const getSkills = () => api.get('/api/skills');
export const getNotes = () => api.get('/api/notes');
export const getConfig_ = () => api.get('/api/config');
export const saveNote = (filename: string, content: string) => api.post('/api/notes', { filename, content });
export const sendChat = (message: string) => api.post('/api/chat', { message });
