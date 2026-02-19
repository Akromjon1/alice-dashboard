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
  post: async (endpoint: string, body?: Record<string, unknown>) => {
    const res = await fetch(`${baseUrl()}${endpoint}`, {
      method: 'POST',
      headers: headers(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json();
  },
  patch: async (endpoint: string, body?: Record<string, unknown>) => {
    const res = await fetch(`${baseUrl()}${endpoint}`, {
      method: 'PATCH',
      headers: headers(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json();
  },
  del: async (endpoint: string, body?: Record<string, unknown>) => {
    const res = await fetch(`${baseUrl()}${endpoint}`, {
      method: 'DELETE',
      headers: headers(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json();
  },
};

export const getStatus = () => api.get('/api/status');
export const getSkills = () => api.get('/api/skills');
export const getNotes = () => api.get('/api/notes');
export const getAgents = () => api.get('/api/agents');
export const getYoutube = () => api.get('/api/youtube');
export const addYoutubeChannel = (name: string, url: string) => api.post('/api/youtube/channel', { name, url });
export const removeYoutubeChannel = (url: string) => api.del('/api/youtube/channel', { url });
export const addYoutubeVideo = (title: string, url: string) => api.post('/api/youtube/video', { title, url });
export const saveNote = (filename: string, content: string) => api.post('/api/notes', { filename, content });
export const sendChat = (message: string) => api.post('/api/chat', { message });
export const getCronJobs = () => api.get('/api/cron');
export const getMatches = () => api.get('/api/matches');
export const addTeam = (name: string, league: string) => api.post('/api/matches/team', { name, league });
export const removeTeam = (name: string) => api.del('/api/matches/team', { name });
export const getUfc = () => api.get('/api/ufc');
export const getActivity = () => api.get('/api/activity');
export const getPipelineStatus = () => api.get('/api/pipeline');

// Projects
export const getProjects = () => api.get('/api/projects');
export const createProject = (project: Record<string, unknown>) => api.post('/api/projects', project);
export const deleteProject = (id: string) => api.del(`/api/projects/${id}`);

// Tasks
export const getTasks = (project?: string) => api.get(`/api/tasks${project ? `?project=${encodeURIComponent(project)}` : ''}`);
export const createTask = (task: Record<string, unknown>) => api.post('/api/tasks', task);
export const updateTask = (id: number, data: Record<string, unknown>) => api.post(`/api/tasks/${id}`, data);
export const patchTask = (id: number, data: Record<string, unknown>) => api.patch(`/api/tasks/${id}`, data);
export const deleteTaskApi = (id: number) => api.del(`/api/tasks/${id}`);
export const startTask = (id: number) => api.post(`/api/tasks/${id}/start`);
export const completeTask = (id: number, result: string) => api.post(`/api/tasks/${id}/complete`, { result });
export const getModelRoles = () => api.get('/api/model-roles');

// Scheduler
export const getSchedulerStatus = () => api.get('/api/scheduler/status');
export const getSchedulerQueue = () => api.get('/api/scheduler/queue');
