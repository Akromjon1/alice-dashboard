import { useEffect, useState } from 'react';
import { getAgents } from '../api';
import { Radio, Users, ListTodo, Plus, X } from 'lucide-react';

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
  role: string;
  badge: 'LEAD' | 'INT' | 'SPC';
  status: 'WORKING' | 'IDLE' | 'OFFLINE';
}

const COLUMNS = [
  { id: 'inbox', label: 'INBOX' },
  { id: 'assigned', label: 'ASSIGNED' },
  { id: 'active', label: 'IN PROGRESS' },
  { id: 'review', label: 'REVIEW' },
  { id: 'done', label: 'DONE' },
];

const BADGE_COLORS: Record<string, string> = {
  LEAD: '#F59E0B',
  INT: '#3B82F6',
  SPC: '#8B5CF6',
};

const STATUS_COLORS: Record<string, string> = {
  WORKING: 'var(--green)',
  IDLE: 'var(--yellow)',
  OFFLINE: 'var(--text-muted)',
};

const PRIORITY_COLORS: Record<string, string> = {
  high: 'var(--red)',
  medium: 'var(--yellow)',
  low: 'var(--green)',
};

// Persist to localStorage
const loadTasks = (): Task[] => {
  try { return JSON.parse(localStorage.getItem('alice-tasks') || '[]'); } catch { return []; }
};
const saveTasks = (tasks: Task[]) => localStorage.setItem('alice-tasks', JSON.stringify(tasks));

const loadLiveLog = (): string[] => {
  try { return JSON.parse(localStorage.getItem('alice-live-log') || '[]'); } catch { return []; }
};
const saveLiveLog = (log: string[]) => localStorage.setItem('alice-live-log', JSON.stringify(log.slice(-50)));

export default function MissionControl() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<Task[]>(loadTasks());
  const [liveLog, setLiveLog] = useState<string[]>(loadLiveLog());
  const [filter, setFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [stats, setStats] = useState({ agents: 0, tasks: 0 });
  const [newTask, setNewTask] = useState({ title: '', description: '', assignee: '', tags: '', priority: 'medium' as 'high' | 'medium' | 'low' });
  const [dragTask, setDragTask] = useState<string | null>(null);

  useEffect(() => {
    // Load agents from API and map to mission control format
    getAgents().then(data => {
      const mapped: Agent[] = (data.agents || []).map((a: any) => ({
        id: a.id,
        name: a.name.replace(' (Main)', ''),
        role: a.description?.slice(0, 30) || a.type,
        badge: a.type === 'main' ? 'LEAD' : a.type === 'watcher' ? 'SPC' : 'INT',
        status: a.status === 'running' ? 'WORKING' : 'IDLE',
      }));
      setAgents(mapped);
      setStats(prev => ({ ...prev, agents: mapped.filter(a => a.status === 'WORKING').length }));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setStats(prev => ({ ...prev, tasks: tasks.length }));
    saveTasks(tasks);
  }, [tasks]);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    const entry = `${time} — ${msg}`;
    setLiveLog(prev => {
      const updated = [...prev, entry].slice(-50);
      saveLiveLog(updated);
      return updated;
    });
  };

  const addTask = () => {
    if (!newTask.title) return;
    const task: Task = {
      id: Date.now().toString(),
      title: newTask.title,
      description: newTask.description,
      assignee: newTask.assignee || agents[0]?.name || 'Alice',
      status: 'inbox',
      tags: newTask.tags.split(',').map(t => t.trim()).filter(Boolean),
      createdAt: new Date().toISOString(),
      priority: newTask.priority,
    };
    setTasks(prev => [...prev, task]);
    addLog(`📥 New task: "${task.title}" → Inbox`);
    setNewTask({ title: '', description: '', assignee: '', tags: '', priority: 'medium' });
    setShowAdd(false);
  };

  const moveTask = (taskId: string, newStatus: Task['status']) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        addLog(`➡️ "${t.title}" moved to ${newStatus.toUpperCase()}`);
        return { ...t, status: newStatus };
      }
      return t;
    }));
  };

  const deleteTask = (taskId: string) => {
    setTasks(prev => {
      const task = prev.find(t => t.id === taskId);
      if (task) addLog(`🗑️ Deleted: "${task.title}"`);
      return prev.filter(t => t.id !== taskId);
    });
  };

  const filteredTasks = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);
  const columnTasks = (col: string) => tasks.filter(t => t.status === col);

  const handleDragStart = (taskId: string) => setDragTask(taskId);
  const handleDrop = (status: Task['status']) => {
    if (dragTask) {
      moveTask(dragTask, status);
      setDragTask(null);
    }
  };

  return (
    <>
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
            <div style={{ fontFamily: 'Fira Code, monospace', fontSize: 24, fontWeight: 700 }}>{stats.tasks}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Tasks in Queue</div>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            style={{
              padding: '8px 16px', background: 'var(--accent)', color: 'white',
              border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Fira Sans, sans-serif',
            }}
          >
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
          {agents.map(agent => (
            <div key={agent.id} style={{
              padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10,
              cursor: 'pointer', transition: 'background 0.15s',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{
                width: 32, height: 32, borderRadius: '50%', background: 'var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 600, position: 'relative',
              }}>
                {agent.name[0]}
                <div style={{
                  position: 'absolute', bottom: -1, right: -1, width: 10, height: 10,
                  borderRadius: '50%', background: STATUS_COLORS[agent.status],
                  border: '2px solid var(--bg-card)',
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
                <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{agent.role}</div>
              </div>
              <span style={{ fontSize: 9, color: STATUS_COLORS[agent.status], fontWeight: 600 }}>{agent.status}</span>
            </div>
          ))}
        </div>

        {/* Mission Queue */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Filter tabs */}
          <div style={{
            padding: '12px 20px', borderBottom: '1px solid var(--border)',
            display: 'flex', gap: 6, overflowX: 'auto',
          }}>
            {[{ id: 'all', label: 'All', count: tasks.length }, ...COLUMNS.map(c => ({ id: c.id, label: c.label, count: columnTasks(c.id).length }))].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                style={{
                  padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border)',
                  background: filter === tab.id ? 'var(--accent)' : 'transparent',
                  color: filter === tab.id ? 'white' : 'var(--text-muted)',
                  cursor: 'pointer', fontSize: 12, fontFamily: 'Fira Sans, sans-serif',
                  display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
                }}
              >
                {tab.label} <span style={{ opacity: 0.7 }}>{tab.count}</span>
              </button>
            ))}
          </div>

          {/* Kanban board */}
          <div style={{
            flex: 1, display: 'flex', gap: 1, overflowX: 'auto', padding: '16px 12px',
            background: 'var(--bg)',
          }}>
            {COLUMNS.map(col => (
              <div
                key={col.id}
                style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column' }}
                onDragOver={e => e.preventDefault()}
                onDrop={() => handleDrop(col.id as Task['status'])}
              >
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
                  {(filter === 'all' ? columnTasks(col.id) : filteredTasks.filter(t => t.status === col.id)).map(task => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => handleDragStart(task.id)}
                      style={{
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
                        <button
                          onClick={() => deleteTask(task.id)}
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2, flexShrink: 0 }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                      {task.description && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.4 }}>
                          {task.description.slice(0, 80)}{task.description.length > 80 ? '...' : ''}
                        </div>
                      )}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                        {task.tags.map((tag, i) => (
                          <span key={i} style={{
                            fontSize: 10, padding: '2px 6px', borderRadius: 4,
                            background: 'var(--accent-glow)', color: 'var(--accent)', fontWeight: 500,
                          }}>{tag}</span>
                        ))}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)' }}>
                          <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 600 }}>
                            {task.assignee[0]}
                          </div>
                          {task.assignee}
                        </div>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                          {new Date(task.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {/* Move buttons */}
                      <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                        {COLUMNS.filter(c => c.id !== task.status).map(c => (
                          <button
                            key={c.id}
                            onClick={() => moveTask(task.id, c.id as Task['status'])}
                            style={{
                              fontSize: 9, padding: '2px 6px', borderRadius: 4, cursor: 'pointer',
                              background: 'var(--border)', color: 'var(--text-muted)', border: 'none',
                              fontFamily: 'Fira Sans, sans-serif',
                            }}
                          >
                            → {c.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Feed */}
        <div style={{
          width: 260, borderLeft: '1px solid var(--border)', padding: 16,
          overflowY: 'auto', background: 'var(--bg-card)', flexShrink: 0,
        }}>
          <div style={{
            fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase',
            letterSpacing: 1, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Radio size={12} style={{ color: 'var(--red)' }} /> Live
          </div>
          {liveLog.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: 12 }}>No activity yet</div>
          ) : (
            [...liveLog].reverse().map((entry, i) => (
              <div key={i} style={{
                fontSize: 12, color: 'var(--text-secondary)', padding: '8px 0',
                borderBottom: '1px solid var(--border)', lineHeight: 1.5,
              }}>
                {entry}
              </div>
            ))
          )}
        </div>
      </div>

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
            <input
              value={newTask.title}
              onChange={e => setNewTask({ ...newTask, title: e.target.value })}
              placeholder="Task title"
              style={{
                width: '100%', padding: '10px 12px', background: 'var(--bg)',
                border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)',
                fontSize: 14, marginBottom: 14, outline: 'none', fontFamily: 'Fira Sans, sans-serif',
              }}
            />
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Description</label>
            <textarea
              value={newTask.description}
              onChange={e => setNewTask({ ...newTask, description: e.target.value })}
              placeholder="What needs to be done?"
              rows={3}
              style={{
                width: '100%', padding: '10px 12px', background: 'var(--bg)',
                border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)',
                fontSize: 14, marginBottom: 14, outline: 'none', resize: 'vertical',
                fontFamily: 'Fira Sans, sans-serif',
              }}
            />
            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Assignee</label>
                <select
                  value={newTask.assignee}
                  onChange={e => setNewTask({ ...newTask, assignee: e.target.value })}
                  style={{
                    width: '100%', padding: '10px 12px', background: 'var(--bg)',
                    border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)',
                    fontSize: 14, outline: 'none', fontFamily: 'Fira Sans, sans-serif',
                  }}
                >
                  <option value="">Select agent</option>
                  {agents.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Priority</label>
                <select
                  value={newTask.priority}
                  onChange={e => setNewTask({ ...newTask, priority: e.target.value as any })}
                  style={{
                    width: '100%', padding: '10px 12px', background: 'var(--bg)',
                    border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)',
                    fontSize: 14, outline: 'none', fontFamily: 'Fira Sans, sans-serif',
                  }}
                >
                  <option value="high">🔴 High</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="low">🟢 Low</option>
                </select>
              </div>
            </div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Tags (comma separated)</label>
            <input
              value={newTask.tags}
              onChange={e => setNewTask({ ...newTask, tags: e.target.value })}
              placeholder="dashboard, feature, urgent"
              style={{
                width: '100%', padding: '10px 12px', background: 'var(--bg)',
                border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)',
                fontSize: 14, marginBottom: 20, outline: 'none', fontFamily: 'Fira Sans, sans-serif',
              }}
            />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowAdd(false)}
                style={{
                  padding: '10px 20px', background: 'var(--border)', color: 'var(--text)',
                  border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14,
                  fontFamily: 'Fira Sans, sans-serif',
                }}
              >Cancel</button>
              <button
                onClick={addTask}
                style={{
                  padding: '10px 20px', background: 'var(--accent)', color: 'white',
                  border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14,
                  fontFamily: 'Fira Sans, sans-serif', fontWeight: 600,
                }}
              >Create Task</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
