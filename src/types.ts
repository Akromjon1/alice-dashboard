export interface Agent {
  id: string;
  name: string;
  description: string;
  status: 'running' | 'stopped' | 'error' | 'ready' | 'standby';
  icon: string;
  lastMessage?: string;
  lastActive?: string;
  sessionKey?: string;
  type?: string;
  model?: string;
  modelTier?: string;
  isPipeline?: boolean;
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

export interface Task {
  id: number;
  title: string;
  description: string;
  status: 'inbox' | 'assigned' | 'in_progress' | 'review' | 'done' | 'failed';
  assignedTo: string;
  model: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  sessionId: string | null;
  result: string | null;
  rounds: number;
  source: string;
  priority: 'low' | 'medium' | 'high';
  parentTaskId: number | null;
  pipelineRound: number;
  project: string | null;
}

export interface SchedulerStatus {
  running: boolean;
  lastCheck: string | null;
  busyAgents: string[];
  pendingTasks: number;
  queuedSpawns: { taskId: number; agent: string; model: string; task: string }[];
}

export interface Activity {
  id: string;
  agent: string;
  task: string;
  status: 'running' | 'completed' | 'failed';
  model: string;
  startedAt: string;
  completedAt: string | null;
  runtime: string;
  icon: string;
}

export interface ModelRole {
  id: string;
  name: string;
  description: string;
  model: string;
  icon: string;
}

export interface PipelineStatus {
  active: boolean;
  stage: string | null;
  task: string | null;
  rounds: number;
}

export interface MissionAgent {
  id: string;
  name: string;
  icon: string;
  role: string;
  badge: 'LEAD' | 'INT' | 'SPC';
  status: 'WORKING' | 'IDLE' | 'OFFLINE';
}

export interface RoleInfo {
  id: string;
  name: string;
  icon: string;
  model: string;
}

export interface Project {
  id: string;
  name: string;
  icon: string;
  color: string;
  techStack: string;
  repoPath: string;
}
