import { useEffect, useState, useCallback } from 'react';
import { getAgents, getActivity, getPipelineStatus } from '../api';
import { Radio, Users, ListTodo, Plus, X, Activity, CheckCircle, XCircle, Loader } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string;
  assignee: string;
  status: 'inbox' | 'assigned' | 'active' | 'review' | 'done';
  tags: string[];
  createdAt: string;
  priority?: 'high' | 'medium' | 'low';
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
  sessionKey?: string;
}

interface PipelineStatus {
  active: boolean;
  stage: string | null;
  task: string | null;
  rounds: number;
}

const COLUMNS = [
  { id: 'inbox', label: 'INBOX' },
  { id: 'assigned', label: 'ASSIGNED' },
  { id: 'active', label: 'IN PROGRESS' },
  { id: 'review', label: 'REVIEW' },
  { id: 'done', label: 'DONE' },
];

const BADGE_COLORS: Record<string, string> = { LEAD: '#F59E0B', INT: '#3B82F6', SPC: '#8B5CF6' };
const STATUS_COLORS: Record<string, string> = { WORKING: 'var(--green)', IDLE: 'var(--yellow)', OFFLINE: 'var(--text-muted)' };
const PRIORITY_COLORS: Record<string, string> = { high: 'var(--red)', medium: 'var(--yellow)', low: 'var(--green)' };
const MODEL_COLORS: Record<string, string> = { opus: '#F59E0B', sonnet: '#3B82F6', haiku: '#10B981', other: '#6B7280' };

const loadTasks = (): Task[] => { try { return JSON.parse(localStorage.getItem('alice-tasks') || '[]'); } catch { return []; } };
const saveTasks = (tasks: Task[]) => localStorage.setItem('alice-tasks', JSON.stringify(tasks));

export default function MissionControl() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<Task[]>(loadTasks());
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const [pipeline, setPipeline] = useState<PipelineStatus>({ active: false, stage: null, task: null, rounds: 0 });
  const [filter, setFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [stats, setStats] = useState({ agents: 0, tasks: 0, running: 0 });
  const [newTask, setNewTask] = useState({ title: '', description: '', assignee: '', tags: '', priority: 'medium' as 'high' | 'medium' | 'low' });
  const [dragTask, setDragTask] = useState<string | null>(null);
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null);

  // Track which agents are currently working (from activity feed)
  const [workingAgents, setWorkingAgents] = useState<Set<string>>(new Set());

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
        id: a.id,
        name: a.name.replace(' (Main)', ''),
        icon: a.icon || '🤖',
        role: a.description?.slice(0, 30) || a.type,
        badge: a.type === 'main' ? 'LEAD' : a.type === 'watcher' ? 'SPC' : 'INT',
        status: a.status === 'running' ? 'WORKING' : 'IDLE',
      }));
      setAgents(mapped);
      setStats(prev => ({ ...prev, agents: mapped.filter(a => a.status === 'WORKING').length }));
    }).catch(() => {});

    fetchActivity();
    fetchPipeline();

    const interval = setInterval(() => {
      fetchActivity();
      fetchPipeline();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchActivity, fetchPipeline]);

  useEffect(() => {
    setStats(prev => ({ ...prev, tasks: tasks.length }));
    saveTasks(tasks);
  }, [tasks]);

  const addTask = () => {
    if (!newTask.title) return;
    const task: Task = {
      id: Date.now().toString(), title: newTask.title, description: newTask.description,
      assignee: newTask.assignee || agents[0]?.name || 'Alice', status: 'inbox',
      tags: newTask.tags.split(',').map(t => t.trim()).filter(Boolean),
      createdAt: new Date().toISOString(), priority: newTask.priority,
    };
    setTasks(prev => [...prev, task]);
    setNewTask({ title: '', description: '', assignee: '', tags: '', priority: 'medium' });
    setShowAdd(false);
  };

  const moveTask = (taskId: string, newStatus: Task['status']) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
  };

  const deleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const columnTasks = (col: string) => tasks.filter(t => t.status === col);
  const handleDragStart = (taskId: string) => setDragTask(taskId);
  const handleDrop = (status: Task['status']) => { if (dragTask) { moveTask(dragTask, status); setDragTask(null); } };

  // Check if agent is currently working
  const isAgentWorking = (name: string) => {
    const lower = name.toLowerCase();
    return workingAgents.has(lower) || workingAgents.has(lower.replace(' (lead)', ''));
  };

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
            <>
              <span>✅</span>
              <span style={{ color: 'var(--green)' }}>Pipeline Complete:</span>
              <span>{pipeline.task}</span>
              {pipeline.rounds > 0 && <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>({pipeline.rounds} round{pipeline.rounds > 1 ? 's' : ''})</span>}
            </>
          ) : pipeline.stage === 'failed' ? (
            <>
              <span>❌</span>
              <span style={{ color: 'var(--red)' }}>Pipeline Failed:</span>
              <span>{pipeline.task}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>(after {pipeline.rounds} rounds)</span>
            </>
          ) : (
            <>
              <span className="pulse-icon">🔄</span>
              <span style={{ color: 'var(--accent)' }}>Pipeline Active:</span>
              {pipeline.stage === 'coding' && <><span>💻 Coder (opus) working...</span><span style={{ color: 'var(--text-muted)' }}>→ 🧪 QA next</span></>}
              {pipeline.stage === 'qa' && <><span style={{ color: 'var(--text-muted)' }}>💻 Coder done →</span><span>🧪 QA reviewing...</span></>}
              {pipeline.stage && !['coding', 'qa', 'complete', 'failed'].includes(pipeline.stage) && <span>{pipeline.stage}</span>}
              {pipeline.rounds > 1 && <span style={{ color: 'var(--yellow)', fontSize: 11 }}>Round {pipeline.rounds}</span>}
            </>
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

        {/* Mission Queue */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Filter tabs */}
          <div style={{
            padding: '12px 20px', borderBottom: '1px solid var(--border)',
            display: 'flex', gap: 6, overflowX: 'auto',
          }}>
            {[{ id: 'all', label: 'All', count: tasks.length }, ...COLUMNS.map(c => ({ id: c.id, label: c.label, count: columnTasks(c.id).length }))].map(tab => (
              <button key={tab.id} onClick={() => setFilter(tab.id)} style={{
                padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border)',
                background: filter === tab.id ? 'var(--accent)' : 'transparent',
                color: filter === tab.id ? 'white' : 'var(--text-muted)',
                cursor: 'pointer', fontSize: 12, fontFamily: 'Fira Sans, sans-serif',
                display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
              }}>
                {tab.label} <span style={{ opacity: 0.7 }}>{tab.count}</span>
              </button>
            ))}
          </div>

          {/* Kanban board */}
          <div style={{ flex: 1, display: 'flex', gap: 1, overflowX: 'auto', padding: '16px 12px', background: 'var(--bg)' }}>
            {COLUMNS.map(col => (
              <div key={col.id} style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column' }}
                onDragOver={e => e.preventDefault()} onDrop={() => handleDrop(col.id as Task['status'])}>
                <div style={{
                  padding: '8px 12px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
                  textTransform: 'uppercase', letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 6,
                  borderBottom: `2px solid ${col.id === 'active' ? 'var(--accent)' : col.id === 'done' ? 'var(--green)' : 'var(--border)'}`,
                  marginBottom: 8,
                }}>
                  <ListTodo size={12} /> {col.label}
                  <span style={{ marginLeft: 'auto', background: 'var(--border)', padding: '1px 6px', borderRadius: 4, fontSize: 10 }}>
                    {columnTasks(col.id).length}
                  </span>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '0 4px' }}>
                  {(filter === 'all' ? columnTasks(col.id) : tasks.filter(t => t.status === col.id)).map(task => (
                    <div key={task.id} draggable onDragStart={() => handleDragStart(task.id)} style={{
                      background: 'var(--bg-card)', border: '1px solid var(--border)',
                      borderRadius: 8, padding: 12, marginBottom: 8, cursor: 'grab',
                      borderLeft: `3px solid ${PRIORITY_COLORS[task.priority || 'medium']}`,
                      transition: 'box-shadow 0.15s',
                    }}
                      onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--shadow-lg)')}
                      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4, flex: 1 }}>{task.title}</div>
                        <button onClick={() => deleteTask(task.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2, flexShrink: 0 }}><X size={12} /></button>
                      </div>
                      {task.description && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.4 }}>{task.description.slice(0, 80)}{task.description.length > 80 ? '...' : ''}</div>}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                        {task.tags.map((tag, i) => (
                          <span key={i} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'var(--accent-glow)', color: 'var(--accent)', fontWeight: 500 }}>{tag}</span>
                        ))}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)' }}>
                          <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 600 }}>{task.assignee[0]}</div>
                          {task.assignee}
                        </div>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{new Date(task.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                        {COLUMNS.filter(c => c.id !== task.status).map(c => (
                          <button key={c.id} onClick={() => moveTask(task.id, c.id as Task['status'])} style={{
                            fontSize: 9, padding: '2px 6px', borderRadius: 4, cursor: 'pointer',
                            background: 'var(--border)', color: 'var(--text-muted)', border: 'none', fontFamily: 'Fira Sans, sans-serif',
                          }}>→ {c.label}</button>
                        ))}
                      </div>
                    </div>
                  ))}
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
                    {/* Top row: icon + name + status */}
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

                    {/* Task summary */}
                    <div style={{
                      fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4,
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      display: '-webkit-box', WebkitLineClamp: isExpanded ? 6 : 2, WebkitBoxOrient: 'vertical',
                    }}>
                      {act.task}
                    </div>

                    {/* Meta row: model + runtime */}
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

      {/* Pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
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
              borderRadius: 8, color: 'var(--text)', fontSize: 14, marginBottom: 14, outline: 'none', fontFamily: 'Fira Sans, sans-serif',
            }} />
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Description</label>
            <textarea value={newTask.description} onChange={e => setNewTask({ ...newTask, description: e.target.value })} placeholder="What needs to be done?" rows={3} style={{
              width: '100%', padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 8, color: 'var(--text)', fontSize: 14, marginBottom: 14, outline: 'none', resize: 'vertical', fontFamily: 'Fira Sans, sans-serif',
            }} />
            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Assignee</label>
                <select value={newTask.assignee} onChange={e => setNewTask({ ...newTask, assignee: e.target.value })} style={{
                  width: '100%', padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border)',
                  borderRadius: 8, color: 'var(--text)', fontSize: 14, outline: 'none', fontFamily: 'Fira Sans, sans-serif',
                }}>
                  <option value="">Select agent</option>
                  {agents.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
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
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Tags (comma separated)</label>
            <input value={newTask.tags} onChange={e => setNewTask({ ...newTask, tags: e.target.value })} placeholder="dashboard, feature, urgent" style={{
              width: '100%', padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 8, color: 'var(--text)', fontSize: 14, marginBottom: 20, outline: 'none', fontFamily: 'Fira Sans, sans-serif',
            }} />
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
