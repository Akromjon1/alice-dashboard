import { useState, useCallback, useRef, useEffect } from 'react';
import { getAgents, getActivity, getPipelineStatus, getTasks, createTask, updateTask, patchTask, deleteTaskApi, getModelRoles } from '../api';
import { Radio, ListTodo, Plus, Activity, CheckCircle, XCircle, Trash2, Search, Edit3, AlertTriangle, RefreshCw } from 'lucide-react';
import { timeAgo, getModelTier } from '../utils';
import { usePolling } from '../hooks/usePolling';
import { useToast } from '../contexts/ToastContext';
import PriorityBadge from '../components/PriorityBadge';
import ConfirmDialog from '../components/ConfirmDialog';
import LoadingSkeleton from '../components/LoadingSkeleton';
import KeyboardShortcuts from '../components/KeyboardShortcuts';
import type { Task, Activity as ActivityType, MissionAgent, RoleInfo, PipelineStatus } from '../types';

const COLUMNS: { id: Task['status']; label: string }[] = [
  { id: 'inbox', label: 'INBOX' },
  { id: 'assigned', label: 'ASSIGNED' },
  { id: 'in_progress', label: 'IN PROGRESS' },
  { id: 'review', label: 'REVIEW' },
  { id: 'done', label: 'DONE' },
];

const PRIORITY_COLORS: Record<string, string> = { high: 'var(--red)', medium: 'var(--yellow)', low: 'var(--green)' };
const MODEL_COLORS: Record<string, string> = { opus: '#F59E0B', sonnet: '#3B82F6', haiku: '#10B981', local: '#6B7280' };
const SOURCE_ICONS: Record<string, string> = { telegram: '📱', dashboard: '🖥️', pipeline: '⚙️' };

type FilterMode = 'all' | 'high' | 'mine';

export default function MissionControl() {
  const { showToast } = useToast();
  const [agents, setAgents] = useState<MissionAgent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [roles, setRoles] = useState<RoleInfo[]>([]);
  const [activities, setActivities] = useState<ActivityType[]>([]);
  const [pipeline, setPipeline] = useState<PipelineStatus>({ active: false, stage: null, task: null, rounds: 0 });
  const [showAdd, setShowAdd] = useState(false);
  const [stats, setStats] = useState({ agents: 0, tasks: 0, running: 0 });
  const [newTask, setNewTask] = useState<{ title: string; description: string; assignedTo: string; priority: 'high' | 'medium' | 'low' }>({ title: '', description: '', assignedTo: '', priority: 'medium' });
  const [dragTask, setDragTask] = useState<number | null>(null);
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null);
  const [workingAgents, setWorkingAgents] = useState<Set<string>>(new Set());
  const rolesRef = useRef<RoleInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activityExpanded, setActivityExpanded] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');

  // Edit modal
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', assignedTo: '', priority: 'medium' as 'high' | 'medium' | 'low' });

  // Delete confirmation
  const [deleteTaskId, setDeleteTaskId] = useState<number | null>(null);

  // Keyboard shortcuts overlay
  const [showShortcuts, setShowShortcuts] = useState(false);

  const fetchTasks = useCallback(() => {
    return getTasks().then((data: { tasks?: Task[] }) => {
      setTasks(data.tasks || []);
      setError(null);
    }).catch((err) => { setError(err.message || 'Failed to load tasks'); });
  }, []);

  const fetchActivity = useCallback(() => {
    getActivity().then((data: { activities?: ActivityType[] }) => {
      const acts = data.activities || [];
      setActivities(acts);
      const running = acts.filter((a: ActivityType) => a.status === 'running');
      setWorkingAgents(new Set(running.map((a: ActivityType) => a.agent.toLowerCase())));
      setStats(prev => ({ ...prev, running: running.length }));
    }).catch(() => {});
  }, []);

  const fetchPipeline = useCallback(() => {
    getPipelineStatus().then((data: { active: boolean; stage: string | null; task: string | null; rounds?: number }) => {
      setPipeline({ active: data.active, stage: data.stage, task: data.task, rounds: data.rounds || 0 });
    }).catch(() => {});
  }, []);

  usePolling(() => Promise.all([fetchTasks(), fetchActivity(), fetchPipeline()]).then(() => null), 10000);

  useEffect(() => {
    Promise.all([
      getAgents().then((data: { agents?: Array<{ id: string; name: string; icon?: string; description?: string; type?: string; status?: string }> }) => {
        const mapped: MissionAgent[] = (data.agents || []).map(a => ({
          id: a.id, name: a.name.replace(' (Main)', ''), icon: a.icon || '🤖',
          role: a.description?.slice(0, 30) || a.type || '',
          badge: (a.type === 'main' ? 'LEAD' : a.type === 'watcher' ? 'SPC' : 'INT') as MissionAgent['badge'],
          status: (a.status === 'running' ? 'WORKING' : 'IDLE') as MissionAgent['status'],
        }));
        setAgents(mapped);
        setStats(prev => ({ ...prev, agents: mapped.filter(a => a.status === 'WORKING').length }));
      }),
      getModelRoles().then((data: { roles?: Array<{ id: string; name: string; icon: string; model: string }> }) => {
        const r: RoleInfo[] = (data.roles || []).map(role => ({ id: role.id, name: role.name, icon: role.icon, model: role.model }));
        setRoles(r);
        rolesRef.current = r;
      }),
      fetchTasks(),
      fetchActivity(),
      fetchPipeline(),
    ]).catch(() => {}).finally(() => setLoading(false));
  }, [fetchTasks, fetchActivity, fetchPipeline]);

  useEffect(() => {
    setStats(prev => ({ ...prev, tasks: tasks.length }));
  }, [tasks]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable;

      if (e.key === 'Escape') {
        if (showShortcuts) { setShowShortcuts(false); return; }
        if (editTask) { setEditTask(null); return; }
        if (showAdd) { setShowAdd(false); return; }
        if (deleteTaskId !== null) { setDeleteTaskId(null); return; }
      }

      if (isInput) return;

      if (e.key === '?') {
        e.preventDefault();
        setShowShortcuts(prev => !prev);
      }

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setShowAdd(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [editTask, showAdd, deleteTaskId, showShortcuts]);

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
      showToast('Task created', 'success');
    }).catch(() => { showToast('Failed to create task', 'error'); });
  };

  const moveTask = (taskId: number, newStatus: Task['status']) => {
    updateTask(taskId, { status: newStatus }).then(() => fetchTasks()).catch(() => { showToast('Failed to update task', 'error'); });
  };

  const confirmRemoveTask = (taskId: number) => {
    setDeleteTaskId(taskId);
  };

  const removeTask = (taskId: number) => {
    deleteTaskApi(taskId).then(() => { fetchTasks(); showToast('Task deleted', 'info'); }).catch(() => { showToast('Failed to delete task', 'error'); });
    setDeleteTaskId(null);
  };

  const openEditModal = (task: Task) => {
    setEditTask(task);
    setEditForm({ title: task.title, description: task.description || '', assignedTo: task.assignedTo || '', priority: task.priority });
  };

  const saveEdit = () => {
    if (!editTask) return;
    patchTask(editTask.id, {
      title: editForm.title,
      description: editForm.description,
      assignedTo: editForm.assignedTo || undefined,
      priority: editForm.priority,
    }).then(() => {
      fetchTasks();
      setEditTask(null);
      showToast('Task updated', 'success');
    }).catch(() => { showToast('Failed to update task', 'error'); });
  };

  // Filtering
  const filteredTasks = tasks.filter(t => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!t.title.toLowerCase().includes(q) && !(t.description || '').toLowerCase().includes(q)) return false;
    }
    if (filterMode === 'high' && t.priority !== 'high') return false;
    if (filterMode === 'mine' && t.assignedTo !== 'coding') return false;
    return true;
  });

  const columnTasks = (col: string) => filteredTasks.filter(t => t.status === col);
  const handleDragStart = (taskId: number) => setDragTask(taskId);
  const handleDrop = (status: Task['status']) => { if (dragTask) { moveTask(dragTask, status); setDragTask(null); } };

  const isAgentWorking = (name: string) => {
    const lower = name.toLowerCase();
    return workingAgents.has(lower) || workingAgents.has(lower.replace(' (lead)', ''));
  };

  const getRoleInfo = (assignedTo: string): RoleInfo | undefined => rolesRef.current.find(r => r.id === assignedTo);

  // Find current task for a working agent
  const getAgentCurrentTask = (agentName: string): string | undefined => {
    const running = activities.find(a => a.status === 'running' && a.agent.toLowerCase() === agentName.toLowerCase());
    return running?.task;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className="main-header" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 18 }}>◇</span>
            <span style={{ fontFamily: 'Fira Code, monospace', fontWeight: 700, letterSpacing: 1 }}>MISSION CONTROL</span>
          </div>
        </div>
        <div className="main-content">
          <LoadingSkeleton count={4} />
        </div>
      </div>
    );
  }

  if (error && tasks.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className="main-header" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 18 }}>◇</span>
            <span style={{ fontFamily: 'Fira Code, monospace', fontWeight: 700, letterSpacing: 1 }}>MISSION CONTROL</span>
          </div>
        </div>
        <div className="main-content">
          <div className="card" style={{ cursor: 'default', textAlign: 'center', padding: 40 }}>
            <AlertTriangle size={32} style={{ color: 'var(--yellow)', marginBottom: 12 }} />
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Failed to load data</div>
            <div className="card-desc" style={{ marginBottom: 16 }}>{error}</div>
            <button onClick={() => { setLoading(true); setError(null); fetchTasks().finally(() => setLoading(false)); }} style={{
              padding: '10px 20px', background: 'var(--accent)', color: 'white',
              border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14,
              display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'Fira Sans, sans-serif',
            }}>
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const activityBarHeight = activityExpanded ? 240 : 40;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Pipeline Banner */}
      {pipeline.active && (
        <div style={{
          padding: '10px 20px', background: 'linear-gradient(90deg, var(--accent-bg) 0%, var(--green-bg) 100%)',
          borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10,
          fontFamily: 'Fira Code, monospace', fontSize: 13, flexShrink: 0,
        }}>
          {pipeline.stage === 'complete' ? (
            <><span>✅</span><span style={{ color: 'var(--green)' }}>Pipeline Complete:</span><span>{pipeline.task}</span>
            {pipeline.rounds > 0 && <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>({pipeline.rounds} round{pipeline.rounds > 1 ? 's' : ''})</span>}</>
          ) : pipeline.stage === 'failed' ? (
            <><span>❌</span><span style={{ color: 'var(--red)' }}>Pipeline Failed:</span><span>{pipeline.task}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>(after {pipeline.rounds} rounds)</span></>
          ) : (
            <><span className="pulse-animation">🔄</span><span style={{ color: 'var(--accent)' }}>Pipeline Active:</span>
            {pipeline.stage === 'coding' && <><span>💻 Coder working...</span><span style={{ color: 'var(--text-muted)' }}>→ 🧪 QA next</span></>}
            {pipeline.stage === 'qa' && <><span style={{ color: 'var(--text-muted)' }}>💻 done →</span><span>🧪 QA reviewing...</span></>}
            {pipeline.stage && !['coding', 'qa', 'complete', 'failed'].includes(pipeline.stage) && <span>{pipeline.stage}</span>}
            {pipeline.rounds > 1 && <span style={{ color: 'var(--yellow)', fontSize: 11 }}>Round {pipeline.rounds}</span>}</>
          )}
        </div>
      )}

      {/* Header */}
      <div className="main-header" style={{ justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 18 }}>◇</span>
          <span style={{ fontFamily: 'Fira Code, monospace', fontWeight: 700, letterSpacing: 1 }}>MISSION CONTROL</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontFamily: 'Fira Code, monospace', fontSize: 18, fontWeight: 700 }}>{stats.agents}</span>
              <span style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Active</span>
            </div>
            <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontFamily: 'Fira Code, monospace', fontSize: 18, fontWeight: 700, color: stats.running > 0 ? 'var(--green)' : 'var(--text)' }}>{stats.running}</span>
              <span style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Running</span>
            </div>
            <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontFamily: 'Fira Code, monospace', fontSize: 18, fontWeight: 700 }}>{stats.tasks}</span>
              <span style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Tasks</span>
            </div>
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

      {/* Search & Filter Bar + Agent Indicators */}
      <div style={{
        padding: '10px 16px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-card)', flexShrink: 0,
      }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search tasks..."
            style={{
              width: '100%', padding: '8px 12px 8px 34px', background: 'var(--bg)',
              border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)',
              fontSize: 13, outline: 'none', fontFamily: 'Fira Sans, sans-serif', boxSizing: 'border-box',
            }}
          />
        </div>
        {(['all', 'high', 'mine'] as FilterMode[]).map(mode => (
          <button key={mode} onClick={() => setFilterMode(mode)} style={{
            padding: '6px 14px', fontSize: 12, fontWeight: 600, border: 'none', borderRadius: 6,
            cursor: 'pointer', fontFamily: 'Fira Sans, sans-serif',
            background: filterMode === mode ? 'var(--accent)' : 'var(--border)',
            color: filterMode === mode ? 'white' : 'var(--text-muted)',
          }}>
            {mode === 'all' ? 'All' : mode === 'high' ? '🔴 High Priority' : '👤 My Agent'}
          </button>
        ))}

        {/* Agent status indicators */}
        <div style={{ width: 1, height: 24, background: 'var(--border)', marginLeft: 4 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {agents.map(agent => {
            const working = isAgentWorking(agent.name);
            const currentTask = getAgentCurrentTask(agent.name);
            return (
              <div key={agent.id} title={`${agent.name}${currentTask ? '\n📋 ' + currentTask : ''}`} style={{
                width: 30, height: 30, borderRadius: '50%', background: 'var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, position: 'relative', cursor: 'default',
                opacity: working ? 1 : 0.5,
              }}>
                {agent.icon}
                <div style={{
                  position: 'absolute', bottom: -1, right: -1, width: 9, height: 9,
                  borderRadius: '50%', background: working ? 'var(--green)' : 'var(--text-muted)',
                  border: '2px solid var(--bg-card)',
                  animation: working ? 'pulse 1.5s ease-in-out infinite' : 'none',
                }} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Kanban Board - Full Width */}
      <div style={{ flex: 1, display: 'flex', gap: 1, overflowX: 'auto', padding: '16px 12px', background: 'var(--bg)' }}>
        {COLUMNS.map(col => (
          <div key={col.id} style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            onDragOver={e => e.preventDefault()} onDrop={() => handleDrop(col.id)}>
            <div style={{
              padding: '8px 12px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 6,
              borderBottom: `2px solid ${col.id === 'in_progress' ? 'var(--accent)' : col.id === 'done' ? 'var(--green)' : 'var(--border)'}`,
              marginBottom: 8, flexShrink: 0,
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
                  <div key={task.id} draggable onDragStart={() => handleDragStart(task.id)}
                    onClick={() => openEditModal(task)}
                    style={{
                      background: 'var(--bg-card)',
                      border: isFailed ? '1px solid var(--red)' : '1px solid var(--border)',
                      borderRadius: 8, padding: 12, marginBottom: 8, cursor: 'pointer',
                      borderLeft: `3px solid ${PRIORITY_COLORS[task.priority]}`,
                      transition: 'box-shadow 0.15s',
                      animation: isInProgress ? 'taskPulse 2s ease-in-out infinite' : 'none',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--shadow-lg)')}
                    onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4, flex: 1 }}>{task.title}</div>
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        <button onClick={e => { e.stopPropagation(); openEditModal(task); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }}><Edit3 size={12} /></button>
                        <button onClick={e => { e.stopPropagation(); confirmRemoveTask(task.id); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }}><Trash2 size={12} /></button>
                      </div>
                    </div>

                    {task.description && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.4 }}>
                        {task.description.slice(0, 80)}{task.description.length > 80 ? '...' : ''}
                      </div>
                    )}

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
                          background: (MODEL_COLORS[tier] || MODEL_COLORS.local) + '22',
                          color: MODEL_COLORS[tier] || MODEL_COLORS.local,
                        }}>{tier}</span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                      <PriorityBadge priority={task.priority} />
                      <span style={{ fontSize: 10 }}>{SOURCE_ICONS[task.source] || '📋'}</span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'Fira Code, monospace', marginLeft: 'auto' }}>
                        {timeAgo(task.createdAt)}
                      </span>
                    </div>

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

      {/* Collapsible Activity Bottom Panel */}
      <div style={{
        flexShrink: 0, borderTop: '1px solid var(--border)', background: 'var(--bg-card)',
        height: activityBarHeight, transition: 'height 0.2s ease', overflow: 'hidden',
      }}>
        {/* Toggle bar */}
        <div onClick={() => setActivityExpanded(prev => !prev)} style={{
          height: 40, padding: '0 16px', display: 'flex', alignItems: 'center', gap: 8,
          cursor: 'pointer', userSelect: 'none', flexShrink: 0,
        }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', transition: 'transform 0.2s', transform: activityExpanded ? 'rotate(180deg)' : 'rotate(0deg)', display: 'inline-block' }}>▾</span>
          <Activity size={12} style={{ color: 'var(--green)' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
            Activity
          </span>
          {stats.running > 0 && (
            <span className="pulse-animation" style={{
              background: 'var(--green-bg)', color: 'var(--green)',
              padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700,
            }}>{stats.running} live</span>
          )}
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>{activities.length} events</span>
        </div>

        {/* Expanded content: horizontal scroll of activity cards */}
        {activityExpanded && (
          <div style={{
            height: 200, overflowX: 'auto', overflowY: 'hidden',
            padding: '0 16px 16px', display: 'flex', gap: 12, alignItems: 'flex-start',
          }}>
            {activities.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '24px 16px', textAlign: 'center', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Radio size={24} style={{ opacity: 0.3, marginBottom: 8 }} />
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
                      minWidth: 260, maxWidth: 300, padding: '12px 14px', cursor: 'pointer',
                      borderRadius: 8, border: '1px solid var(--border)', flexShrink: 0,
                      background: isRunning ? 'var(--green-bg)' : 'var(--bg)',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => { if (!isRunning) e.currentTarget.style.background = 'var(--bg-card-hover)'; }}
                    onMouseLeave={e => { if (!isRunning) e.currentTarget.style.background = isRunning ? 'var(--green-bg)' : 'var(--bg)'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 16 }}>{act.icon}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>{act.agent}</span>
                      {isRunning ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--green)', fontWeight: 600 }}>
                          <span className="pulse-animation" style={{
                            width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block',
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
                        background: (MODEL_COLORS[act.model] || MODEL_COLORS.local) + '22',
                        color: MODEL_COLORS[act.model] || MODEL_COLORS.local,
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
        )}
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
                <select value={newTask.priority} onChange={e => setNewTask({ ...newTask, priority: e.target.value as 'high' | 'medium' | 'low' })} style={{
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

      {/* Edit Task Modal */}
      {editTask && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
        }} onClick={() => setEditTask(null)}>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 14, padding: 28, width: 440, boxShadow: 'var(--shadow-lg)',
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 20, fontFamily: 'Fira Code, monospace', fontSize: 16 }}>Edit Task</h3>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Title</label>
            <input value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} placeholder="Task title" style={{
              width: '100%', padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 8, color: 'var(--text)', fontSize: 14, marginBottom: 14, outline: 'none', fontFamily: 'Fira Sans, sans-serif', boxSizing: 'border-box',
            }} />
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Description</label>
            <textarea value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} placeholder="What needs to be done?" rows={3} style={{
              width: '100%', padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 8, color: 'var(--text)', fontSize: 14, marginBottom: 14, outline: 'none', resize: 'vertical', fontFamily: 'Fira Sans, sans-serif', boxSizing: 'border-box',
            }} />
            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Assign to Agent</label>
                <select value={editForm.assignedTo} onChange={e => setEditForm({ ...editForm, assignedTo: e.target.value })} style={{
                  width: '100%', padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border)',
                  borderRadius: 8, color: 'var(--text)', fontSize: 14, outline: 'none', fontFamily: 'Fira Sans, sans-serif',
                }}>
                  <option value="">Select agent</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.icon} {r.name}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Priority</label>
                <select value={editForm.priority} onChange={e => setEditForm({ ...editForm, priority: e.target.value as 'high' | 'medium' | 'low' })} style={{
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
              <button onClick={() => setEditTask(null)} style={{
                padding: '10px 20px', background: 'var(--border)', color: 'var(--text)',
                border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontFamily: 'Fira Sans, sans-serif',
              }}>Cancel</button>
              <button onClick={saveEdit} style={{
                padding: '10px 20px', background: 'var(--accent)', color: 'white',
                border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontFamily: 'Fira Sans, sans-serif', fontWeight: 600,
              }}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTaskId !== null && (
        <ConfirmDialog
          title="Delete Task"
          message="Are you sure you want to delete this task?"
          confirmLabel="Delete"
          danger
          onConfirm={() => removeTask(deleteTaskId)}
          onCancel={() => setDeleteTaskId(null)}
        />
      )}

      {/* Keyboard Shortcuts Overlay */}
      {showShortcuts && <KeyboardShortcuts onClose={() => setShowShortcuts(false)} />}
    </div>
  );
}
