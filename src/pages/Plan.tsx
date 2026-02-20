import { useState, useCallback } from 'react';
import { getPlan, savePlan, createTask } from '../api';
import { usePolling } from '../hooks/usePolling';
import { useToast } from '../contexts/ToastContext';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Plus, ArrowRight, Check, ClipboardList } from 'lucide-react';
import type { Plan as PlanType, PlanSection } from '../types';

function getTashkentDate(): string {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const t = new Date(utc + 5 * 3600000);
  return t.toISOString().slice(0, 10);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function planToMarkdown(plan: PlanType): string {
  let md = `# ${plan.title || '📋 Plan — ' + formatDate(plan.date)}\n\n`;
  for (const section of plan.sections) {
    md += `## ${section.name}\n`;
    for (const item of section.items) {
      md += `- [${item.checked ? 'x' : ' '}] ${item.text}\n`;
    }
    md += '\n';
  }
  return md.trimEnd() + '\n';
}

export default function Plan() {
  const { showToast } = useToast();
  const [date, setDate] = useState(getTashkentDate);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [addedToMC, setAddedToMC] = useState<Set<string>>(new Set());
  const [newItems, setNewItems] = useState<Record<string, string>>({});
  const [newSection, setNewSection] = useState('');
  const [showNewSection, setShowNewSection] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchPlan = useCallback(() => getPlan(date), [date]);
  const { data, loading, error, refresh } = usePolling<{ ok: boolean; plan: PlanType }>(fetchPlan, 30000);
  const plan = data?.plan;

  const save = async (updated: PlanType) => {
    setSaving(true);
    try {
      const md = planToMarkdown(updated);
      await savePlan(date, md);
      refresh();
    } catch {
      showToast('Failed to save plan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleCheck = (sectionIdx: number, itemIdx: number) => {
    if (!plan) return;
    const updated = structuredClone(plan);
    updated.sections[sectionIdx].items[itemIdx].checked = !updated.sections[sectionIdx].items[itemIdx].checked;
    save(updated);
  };

  const addToMissionControl = async (text: string) => {
    try {
      await createTask({ title: text, source: 'plan' });
      setAddedToMC(prev => new Set(prev).add(text));
      showToast('Added to Mission Control', 'success');
    } catch {
      showToast('Failed to add task', 'error');
    }
  };

  const addItem = (sectionIdx: number) => {
    if (!plan) return;
    const sectionName = plan.sections[sectionIdx].name;
    const text = (newItems[sectionName] || '').trim();
    if (!text) return;
    const updated = structuredClone(plan);
    updated.sections[sectionIdx].items.push({
      id: Date.now(),
      text,
      checked: false,
      section: sectionName,
    });
    setNewItems(prev => ({ ...prev, [sectionName]: '' }));
    save(updated);
  };

  const addSection = () => {
    if (!plan || !newSection.trim()) return;
    const updated = structuredClone(plan);
    if (!updated.title) updated.title = '📋 Plan — ' + formatDate(date);
    updated.sections.push({ name: newSection.trim(), items: [] });
    setNewSection('');
    setShowNewSection(false);
    save(updated);
  };

  const toggleCollapse = (name: string) => {
    setCollapsed(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const isToday = date === getTashkentDate();

  if (loading && !plan) return <div className="page"><h2>📋 Daily Plan</h2><LoadingSkeleton count={3} /></div>;
  if (error && !plan) return (
    <div className="page">
      <h2>📋 Daily Plan</h2>
      <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--red)' }}>
        Failed to load plan: {error}
      </div>
    </div>
  );

  const sections = plan?.sections || [];
  const totalItems = sections.reduce((s, sec) => s + sec.items.length, 0);
  const checkedItems = sections.reduce((s, sec) => s + sec.items.filter(i => i.checked).length, 0);

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <ClipboardList size={24} />
          Daily Plan
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => setDate(d => shiftDate(d, -1))} style={{ padding: '6px 8px' }}>
            <ChevronLeft size={18} />
          </button>
          <button
            className={`btn ${isToday ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setDate(getTashkentDate())}
            style={{ minWidth: 160, fontSize: 14, fontWeight: 600 }}
          >
            {formatDate(date)}
          </button>
          <button className="btn btn-ghost" onClick={() => setDate(d => shiftDate(d, 1))} style={{ padding: '6px 8px' }}>
            <ChevronRight size={18} />
          </button>
        </div>
        {totalItems > 0 && (
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
            {checkedItems}/{totalItems} done
          </span>
        )}
      </div>

      {saving && (
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>Saving...</div>
      )}

      {sections.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <ClipboardList size={48} style={{ color: 'var(--text-secondary)', marginBottom: 16 }} />
          <h3 style={{ margin: '0 0 8px', color: 'var(--text-primary)' }}>No plan for {isToday ? 'today' : formatDate(date)}</h3>
          <p style={{ color: 'var(--text-secondary)', margin: '0 0 20px' }}>Start adding items!</p>
          <button className="btn btn-primary" onClick={() => setShowNewSection(true)}>
            <Plus size={16} /> Add Section
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sections.map((section: PlanSection, si: number) => (
            <div key={section.name} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div
                onClick={() => toggleCollapse(section.name)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 18px', cursor: 'pointer', userSelect: 'none',
                  borderBottom: collapsed[section.name] ? 'none' : '1px solid var(--border)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {collapsed[section.name] ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{section.name}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {section.items.filter(i => i.checked).length}/{section.items.length}
                  </span>
                </div>
              </div>

              {!collapsed[section.name] && (
                <div style={{ padding: '8px 0' }}>
                  {section.items.map((item, ii) => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 18px', transition: 'background 0.15s',
                      }}
                      className="plan-item-row"
                    >
                      <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', flex: 1, gap: 10 }}>
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={() => toggleCheck(si, ii)}
                          className="plan-checkbox"
                        />
                        <span style={{
                          textDecoration: item.checked ? 'line-through' : 'none',
                          color: item.checked ? 'var(--text-secondary)' : 'var(--text-primary)',
                          transition: 'all 0.2s',
                          fontSize: 14,
                        }}>
                          {item.text}
                        </span>
                      </label>
                      {!item.checked && (
                        addedToMC.has(item.text) ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--green)', fontWeight: 500 }}>
                            <Check size={12} /> Added
                          </span>
                        ) : (
                          <button
                            className="btn btn-ghost"
                            onClick={() => addToMissionControl(item.text)}
                            style={{ padding: '2px 8px', fontSize: 11, opacity: 0.6 }}
                            title="Add to Mission Control"
                          >
                            <ArrowRight size={12} /> MC
                          </button>
                        )
                      )}
                    </div>
                  ))}

                  <div style={{ padding: '8px 18px', display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      className="input"
                      placeholder="Add item..."
                      value={newItems[section.name] || ''}
                      onChange={e => setNewItems(prev => ({ ...prev, [section.name]: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && addItem(si)}
                      style={{ flex: 1, padding: '6px 10px', fontSize: 13 }}
                    />
                    <button className="btn btn-ghost" onClick={() => addItem(si)} style={{ padding: '6px 8px' }}>
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
        {showNewSection ? (
          <>
            <input
              type="text"
              className="input"
              placeholder="Section name..."
              value={newSection}
              onChange={e => setNewSection(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addSection()}
              autoFocus
              style={{ flex: 1, maxWidth: 300, padding: '8px 12px', fontSize: 13 }}
            />
            <button className="btn btn-primary" onClick={addSection} style={{ padding: '8px 14px', fontSize: 13 }}>
              Add
            </button>
            <button className="btn btn-ghost" onClick={() => { setShowNewSection(false); setNewSection(''); }} style={{ padding: '8px 14px', fontSize: 13 }}>
              Cancel
            </button>
          </>
        ) : (
          <button className="btn btn-ghost" onClick={() => setShowNewSection(true)} style={{ fontSize: 13 }}>
            <Plus size={14} /> Add Section
          </button>
        )}
      </div>
    </div>
  );
}
