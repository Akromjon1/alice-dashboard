export interface Agent {
  id: string;
  name: string;
  description: string;
  status: 'running' | 'stopped' | 'error';
  icon: string;
  lastMessage?: string;
  lastActive?: string;
  sessionKey?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface Skill {
  name: string;
  description: string;
  location: string;
  active: boolean;
}

export interface AppConfig {
  gatewayUrl: string;
  apiToken: string;
}
