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

export const apiCall = async (endpoint: string, body?: any) => {
  const config = getConfig();
  if (!config) throw new Error('Not configured');
  
  const res = await fetch(`${config.gatewayUrl}/api${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiToken}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  
  return res.json();
};

// Gateway API wrappers
export const getSessionsList = () => apiCall('/sessions/list', { limit: 50, messageLimit: 1 });
export const getSessionHistory = (sessionKey: string) => apiCall('/sessions/history', { sessionKey, limit: 50 });
export const sendToSession = (sessionKey: string, message: string) => apiCall('/sessions/send', { sessionKey, message });
export const getGatewayStatus = () => apiCall('/status');
export const getSkills = () => apiCall('/skills/list');
