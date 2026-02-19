import { useEffect, useState, useCallback, useRef } from 'react';
import { getAgents, getActivity, getPipelineStatus, getTasks, createTask, updateTask, deleteTaskApi, getModelRoles } from '../api';
import { Radio, Users, ListTodo, Plus, Activity, CheckCircle, XCircle, Loader, Trash2 } from 'lucide-react';

interface TaskData {
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
}

interface Agent {
  id: string;
  name: string;
  icon: string;
  role: string;
  badge: 'LEAD' | 'INT' | 'SPC';
  status: 'WORKING' | 'IDLE' | 'OFFLINE';
}

interface AgentActivity {
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

interface RoleInfo {
  id: string;
  name: string;
  icon: string;
  model: string;
}

interface PipelineStatus {
  active: boolean;
  stage: string | null;
  task: string | null;
  rounds: number;
}

const COLUMNS: { id: TaskData['status']; label: string }[] = [
  { id: 'inbox', label: 'INBOX' },
  { id: 'assigned', label: 'ASSIGNED' },
  { id: 'in_progress', label: 'IN PROGRESS' },
  { id: 'review', label: 'REVIEW' },
  { id: 'done', label: 'DONE' },
];

const STATUS_COLORS: Record<string, string> = { WORKING: 'var(--green)', IDLE: 'var(--yellow)', OFFLINE: 'var(--text-muted)' };
const BADGE_COLORS: Record<string, string> = { LEAD: '#F59E0B', INT: '#3B82F6', SPC: '#8B5CF6' };
const PRIORITY_COLORS: Record<string, string> = { high: 'var(--red)', medium: 'var(--yellow)', low: 'var(--green)' };
const MODEL_COLORS: Record<string, string> = { opus: '#F59E0B', sonnet: '#3B82F6', haiku: '#10B981', other: '#6B7280' };

function getModelTier(model: string): string {
  if (model.includes('opus')) return 'opus';
  if (model.includes('sonnet')) return 'sonnet';
  if (model.includes('haiku')) return 'haiku';
  return 'other';
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const SOURCE_ICONS: Record<string, string> = { telegram: '📱', dashboard: '🖥️', pipeline: '⚙️' };

export default function MissionControl() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [roles, setRoles] = useState<RoleInfo[]>([]);
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const [pipeline, setPipeline] = useState<PipelineStatus>({ active: false, stage: null, task: null, rounds: 0 });
  const [showAdd, setShowAdd] = useState(false);
  const [stats, setStats] = useState({ agents: 0, tasks: 0, running: 0 });
  const [newTask, setNewTask] = useState({ title: '', description: '', assignedTo: '', priority: 'medium' as const });
  const [dragTask, setDragTask] = useState<number | null>(null);
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null);
  const [workingAgents, setWorkingAgents] = useState<Set<string>>(new Set());
  const rolesRef = useRef<RoleInfo[]>([]);

  const fetchTasks = useCallback(() => {
    getTasks().then(data => {
      setTasks(data.tasks || []);
    }).catch(() => {});
  }, []);

  const fetchActivity = useCallback(() => {
    getActivity().then(data => {
      const acts = data.activities || [];
      setActivities(acts);
      const running = acts.filter((a: AgentActivity) => a.status === 'running');
      setWorkingAgents(new Set(running.map((a: AgentActivity) => a.agent.toLowerCase())));
      setStats(prev => ({ ...prev, running: running.length }));
    }).catch(() => {});
  }, []);

  const fetchPipeline = useCallback(() => {
    getPipelineStatus().then(data => {
      setPipeline({ active: data.active, stage: data.stage, task: data.task, rounds: data.rounds || 0 });
    }).catch(() => {});
  }, []);

  useEffect(() => {
    getAgents().then(data => {
      const mapped: Agent[] = (data.agents || []).map((a: any) => ({
        id: a.id, name: a.name.replace(' (Main)', ''), icon: a.icon || '🤖',
        role: a.description?.slice(0, 30) || a.type,
        badge: (a.type === 'main' ? 'LEAD' : a.type === 'watcher' ? 'SPC' : 'INT') as Agent['badge'],
        status: (a.status === 'running' ? 'WORKING' : 'IDLE') as Agent['status'],
      }));
      setAgents(mapped);
      setStats(prev => ({ ...prev, agents: mapped.filter(a => a.status === 'WORKING').length }));
    }).catch(() => {});

    getModelRoles().then(data => {
      const r = (data.roles || []).map((role: any) => ({ id: role.id, name: role.name, icon: role.icon, model: role.model }));
      setRoles(r);
      rolesRef.current = r;
    }).catch(() => {});

    fetchTasks();
    fetchActivity();
    fetchPipeline();

    const interval = setInterval(() => { fetchTasks(); fetchActivity(); fetchPipeline(); }, 5000);
    return () => clearInterval(interval);
  }, [fetchTasks, fetchActivity, fetchPipeline]);

  useEffect(() => {
    setStats(prev => ({ ...prev, tasks: tasks.length }));
  }, [tasks]);

  const addTask = () => {
    if (!newTask.title) return;
    createTask({
      title: newTask.title,
      description: newTask.description,
      assignedTo: newTask.assignedTo || undefined,
      priority: newTask.priority,
      source: 'dashboard',
    }).then(() => {
      fetchTasks();
      setNewTask({ title: '', description: '', assignedTo: '', priority: 'medium' });
      setShowAdd(false);
    }).catch(() => {});
  };

  const moveTask = (taskId: number, newStatus: TaskData['status']) => {
    updateTask(taskId, { status: newStatus }).then(() => fetchTasks()).catch(() => {});
  };

  const removeTask = (taskId: number) => {
    deleteTaskApi(taskId).then(() => fetchTasks()).catch(() => {});
  };

  const columnTasks = (col: string) => tasks.filter(t => t.status === col);
  const handleDragStart = (taskId: number) => setDragTask(taskId);
  const handleDrop = (status: TaskData['status']) => { if (dragTask) { moveTask(dragTask, status); setDragTask(null); } };

  const isAgentWorking = (name: string) => {
    const lower = name.toLowerCase();
    return workingAgents.has(lower) || workingAgents.has(lower.replace(' (lead)', ''));
  };

  const getRoleInfo = (assignedTo: string): RoleInfo | undefined => rolesRef.current.find(r => r.id === assignedTo);

  return (
    <>
      {/* Pipeline Banner */}
      {pipeline.active && (
        <div style={{
          padding: '10px 20px', background: 'linear-gradient(90deg, var(--accent-bg) 0%, var(--green-bg) 100%)',
          borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10,
          fontFamily: 'Fira Code, monospace', fontSize: 13,
        }}>
          {pipeline.stage === 'complete' ? (
            <><span>✅</span><span style={{ color: 'var(--green)' }}>Pipeline Complete:</span><span>{pipeline.task}</span>
            {pipeline.rounds > 0 && <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>({pipeline.rounds} round{pipeline.rounds > 1 ? 's' : ''})</span>}</>
          ) : pipeline.stage === 'failed' ? (
            <><span>❌</span><span style={{ color: 'var(--red)' }}>Pipeline Failed:</span><span>{pipeline.task}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>(after {pipeline.rounds} rounds)</span></>
          ) : (
            <><span className="pulse-icon">🔄</span><span style={{ color: 'var(--accent)' }}>Pipeline Active:</span>
            {pipeline.stage === 'coding' && <><span>💻 Coder working...</span><span style={{ color: 'var(--text-muted)' }}>→ 🧪 QA next</span></>}
            {pipeline.stage === 'qa' && <><span style={{ color: 'var(--text-muted)' }}>💻 done →</span><span>🧪 QA reviewing...</span></>}
            {pipeline.stage && !['coding', 'qa', 'complete', 'failed'].includes(pipeline.stage) && <span>{pipeline.stage}</span>}
            {pipeline.rounds > 1 && <span style={{ color: 'var(--yellow)', fontSize: 11 }}>Round {pipeline.rounds}</span>}</>
          )}
        </div>
      )}

      {/* Header */}
      <div className="main-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 18 }}>◇</span>
          <span style={{ fontFamily: 'Fira Code, monospace', fontWeight: 700, letterSpacing: 1 }}>MISSION CONTROL</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'Fira Code, monospace', fontSize: 24, fontWeight: 700 }}>{stats.agents}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Agents Active</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'Fira Code, monospace', fontSize: 24, fontWeight: 700, color: stats.running > 0 ? 'var(--green)' : 'var(--text)' }}>{stats.running}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Running Now</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'Fira Code, monospace', fontSize: 24, fontWeight: 700 }}>{stats.tasks}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Tasks</div>
          </div>
          <button onClick={() => setShowAdd(true)} style={{
            padding: '8px 16px', background: 'var(--accent)', color: 'white',
            border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13,
            display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Fira Sans, sans-serif',
          }}>
            <Plus size={14} /> New Task
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Agents Sidebar */}
        <div style={{
          width: 220, borderRight: '1px solid var(--border)', padding: '16px 0',
          overflowY: 'auto', background: 'var(--bg-card)', flexShrink: 0,
        }}>
          <div style={{ padding: '0 16px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Users size={12} /> Agents <span style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>{agents.length}</span>
          </div>
          {agents.map(agent => {
            const working = isAgentWorking(agent.name);
            return (
              <div key={agent.id} style={{
                padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10,
                cursor: 'pointer', transition: 'background 0.15s',
                background: working ? 'var(--green-bg)' : 'transparent',
              }}
                onMouseEnter={e => (e.currentTarget.style.background = working ? 'var(--green-bg)' : 'var(--bg-card-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = working ? 'var(--green-bg)' : 'transparent')}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', background: 'var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, position: 'relative',
                }}>
                  {agent.icon}
                  <div style={{
                    position: 'absolute', bottom: -1, right: -1, width: 10, height: 10,
                    borderRadius: '50%', background: working ? 'var(--green)' : STATUS_COLORS[agent.status],
                    border: '2px solid var(--bg-card)',
                    animation: working ? 'pulse 1.5s ease-in-out infinite' : 'none',
                  }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{agent.name}</span>
                    <span style={{
                      fontSize: 9, padding: '1px 5px', borderRadius: 4, fontWeight: 700,
                      background: BADGE_COLORS[agent.badge] + '22', color: BADGE_COLORS[agent.badge],
                    }}>{agent.badge}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {working ? '⚡ Working...' : agent.role}
                  </div>
                </div>
                {working && <Loader size={12} style={{ color: 'var(--green)', animation: 'spin 1s linear infinite' }} />}
              </div>
            );
          })}
        </div>

        {/* Kanban Board */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, display: 'flex', gap: 1, overflowX: 'auto', padding: '16px 12px', background: 'var(--bg)' }}>
            {COLUMNS.map(col => (
              <div key={col.id} style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column' }}
                onDragOver={e => e.preventDefault()} onDrop={() => handleDrop(col.id)}>
                <div style={{
                  padding: '8px 12px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
                  textTransform: 'uppercase', letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 6,
                  borderBottom: `2px solid ${col.id === 'in_progress' ? 'var(--accent)' : col.id === 'done' ? 'var(--green)' : 'var(--border)'}`,
                  marginBottom: 8,
                }}>
                  <ListTodo size={12} /> {col.label}
                  <span style={{ marginLeft: 'auto', background: 'var(--border)', padding: '1px 6px', borderRadius: 4, fontSize: 10 }}>
                    {columnTasks(col.id).length}
                  </span>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '0 4px' }}>
                  {columnTasks(col.id).map(task => {
                    const role = getRoleInfo(task.assignedTo);
                    const tier = getModelTier(task.model);
                    const isInProgress = task.status === 'in_progress';
                    const isFailed = task.status === 'failed';
                    return (
                      <div key={task.id} draggable onDragStart={() => handleDragStart(task.id)} style={{
                        background: 'var(--bg-card)',
                        border: isFailed ? '1px solid var(--red)' : '1px solid var(--border)',
                        borderRadius: 8, padding: 12, marginBottom: 8, cursor: 'grab',
                        borderLeft: `3px solid ${PRIORITY_COLORS[task.priority]}`,
                        transition: 'box-shadow 0.15s',
                        animation: isInProgress ? 'taskPulse 2s ease-in-out infinite' : 'none',
                      }}
                        onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--shadow-lg)')}
                        onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
                      >
                        {/* Title + delete */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4, flex: 1 }}>{task.title}</div>
                          <button onClick={() => removeTask(task.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2, flexShrink: 0 }}><Trash2 size={12} /></button>
                        </div>

                        {/* Description */}
                        {task.description && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.4 }}>
                            {task.description.slice(0, 80)}{task.description.length > 80 ? '...' : ''}
                          </div>
                        )}

                        {/* Agent + model badge */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                          {role && (
                            <>
                              <span style={{ fontSize: 14 }}>{role.icon}</span>
                              <span style={{ fontSize: 11, fontWeight: 600 }}>{role.name}</span>
                            </>
                          )}
                          {task.model && (
                            <span style={{
                              fontSize: 9, padding: '1px 6px', borderRadius: 4, fontWeight: 700, fontFamily: 'Fira Code, monospace',
                              background: (MODEL_COLORS[tier] || MODEL_COLORS.other) + '22',
                              color: MODEL_COLORS[tier] || MODEL_COLORS.other,
                            }}>{tier}</span>
                          )}
                        </div>

                        {/* Priority + source + time */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                          <span style={{
                            fontSize: 9, padding: '1px 6px', borderRadius: 4, fontWeight: 700,
                            background: PRIORITY_COLORS[task.priority] ? PRIORITY_COLORS[task.priority].replace(')', ', 0.15)').replace('var(', 'color-mix(in srgb, ') : 'var(--border)',
                            color: PRIORITY_COLORS[task.priority],
                          }}>{task.priority}</span>
                          <span style={{ fontSize: 10 }}>{SOURCE_ICONS[task.source] || '📋'}</span>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'Fira Code, monospace', marginLeft: 'auto' }}>
                            {timeAgo(task.createdAt)}
                          </span>
                        </div>

                        {/* Result summary for done tasks */}
                        {task.result && (
                          <div style={{ fontSize: 10, color: 'var(--green)', marginTop: 6, fontStyle: 'italic' }}>
                            ✓ {task.result.slice(0, 60)}{task.result.length > 60 ? '...' : ''}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Activity Feed */}
        <div style={{
          width: 300, borderLeft: '1px solid var(--border)', padding: 0,
          overflowY: 'auto', background: 'var(--bg-card)', flexShrink: 0, display: 'flex', flexDirection: 'column',
        }}>
          <div style={{
            padding: '14px 16px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase',
            letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 6,
            borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1,
          }}>
            <Activity size={12} style={{ color: 'var(--green)' }} />
            Agent Activity
            {stats.running > 0 && (
              <span style={{
                marginLeft: 'auto', background: 'var(--green-bg)', color: 'var(--green)',
                padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700,
                animation: 'pulse 2s ease-in-out infinite',
              }}>{stats.running} live</span>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
            {activities.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '24px 16px', textAlign: 'center' }}>
                <Radio size={24} style={{ opacity: 0.3, marginBottom: 8 }} /><br />
                No recent agent activity
              </div>
            ) : (
              activities.map(act => {
                const isExpanded = expandedActivity === act.id;
                const isRunning = act.status === 'running';
                return (
                  <div key={act.id}
                    onClick={() => setExpandedActivity(isExpanded ? null : act.id)}
                    style={{
                      padding: '10px 16px', cursor: 'pointer', transition: 'background 0.15s',
                      borderBottom: '1px solid var(--border)',
                      background: isRunning ? 'var(--green-bg)' : 'transparent',
                    }}
                    onMouseEnter={e => { if (!isRunning) e.currentTarget.style.background = 'var(--bg-card-hover)'; }}
                    onMouseLeave={e => { if (!isRunning) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 16 }}>{act.icon}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>{act.agent}</span>
                      {isRunning ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--green)', fontWeight: 600 }}>
                          <span style={{
                            width: 6, height: 6, borderRadius: '50%', background: 'var(--green)',
                            animation: 'pulse 1.5s ease-in-out infinite', display: 'inline-block',
                          }} />
                          RUNNING
                        </span>
                      ) : act.status === 'completed' ? (
                        <CheckCircle size={14} style={{ color: 'var(--green)' }} />
                      ) : (
                        <XCircle size={14} style={{ color: 'var(--red)' }} />
                      )}
                    </div>
                    <div style={{
                      fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4,
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      display: '-webkit-box', WebkitLineClamp: isExpanded ? 6 : 2, WebkitBoxOrient: 'vertical',
                    }}>
                      {act.task}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                      <span style={{
                        fontSize: 9, padding: '1px 6px', borderRadius: 4, fontWeight: 700, fontFamily: 'Fira Code, monospace',
                        background: (MODEL_COLORS[act.model] || MODEL_COLORS.other) + '22',
                        color: MODEL_COLORS[act.model] || MODEL_COLORS.other,
                      }}>{act.model}</span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'Fira Code, monospace' }}>{act.runtime}</span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                        {new Date(act.startedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes taskPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
          50% { box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15); }
        }
      `}</style>

      {/* Add Task Modal */}
      {showAdd && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
        }} onClick={() => setShowAdd(false)}>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 14, padding: 28, width: 440, boxShadow: 'var(--shadow-lg)',
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 20, fontFamily: 'Fira Code, monospace', fontSize: 16 }}>New Task</h3>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Title</label>
            <input value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} placeholder="Task title" style={{
              width: '100%', padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 8, color: 'var(--text)', fontSize: 14, marginBottom: 14, outline: 'none', fontFamily: 'Fira Sans, sans-serif', boxSizing: 'border-box',
            }} />
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Description</label>
            <textarea value={newTask.description} onChange={e => setNewTask({ ...newTask, description: e.target.value })} placeholder="What needs to be done?" rows={3} style={{
              width: '100%', padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 8, color: 'var(--text)', fontSize: 14, marginBottom: 14, outline: 'none', resize: 'vertical', fontFamily: 'Fira Sans, sans-serif', boxSizing: 'border-box',
            }} />
            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Assign to Agent</label>
                <select value={newTask.assignedTo} onChange={e => setNewTask({ ...newTask, assignedTo: e.target.value })} style={{
                  width: '100%', padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border)',
                  borderRadius: 8, color: 'var(--text)', fontSize: 14, outline: 'none', fontFamily: 'Fira Sans, sans-serif',
                }}>
                  <option value="">Select agent</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.icon} {r.name}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Priority</label>
                <select value={newTask.priority} onChange={e => setNewTask({ ...newTask, priority: e.target.value as any })} style={{
                  width: '100%', padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border)',
                  borderRadius: 8, color: 'var(--text)', fontSize: 14, outline: 'none', fontFamily: 'Fira Sans, sans-serif',
                }}>
                  <option value="high">🔴 High</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="low">🟢 Low</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAdd(false)} style={{
                padding: '10px 20px', background: 'var(--border)', color: 'var(--text)',
                border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontFamily: 'Fira Sans, sans-serif',
              }}>Cancel</button>
              <button onClick={addTask} style={{
                padding: '10px 20px', background: 'var(--accent)', color: 'white',
                border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontFamily: 'Fira Sans, sans-serif', fontWeight: 600,
              }}>Create Task</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
