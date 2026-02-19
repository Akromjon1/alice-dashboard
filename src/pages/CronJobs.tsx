import { useEffect, useState } from 'react';
import { getCronJobs } from '../api';
import { Clock, Play, Pause, Calendar, RefreshCw, Zap, AlertTriangle } from 'lucide-react';
import LoadingSkeleton from '../components/LoadingSkeleton';

export default function CronJobs() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => {
    getCronJobs()
      .then(data => { setJobs(data.jobs || []); setError(null); })
      .catch(err => { setError(err.message || 'Failed to load'); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { refresh(); }, []);

  const getScheduleLabel = (job: any) => {
    const sched = job.schedule;
    if (!sched) return 'Unknown';
    if (sched.kind === 'cron') return `Cron: ${sched.expr}`;
    if (sched.kind === 'every') {
      const mins = Math.round((sched.everyMs || 0) / 60000);
      if (mins < 60) return `Every ${mins}m`;
      const hours = Math.round(mins / 60);
      return `Every ${hours}h`;
    }
    if (sched.kind === 'at') return `At: ${new Date(sched.at).toLocaleString()}`;
    return JSON.stringify(sched);
  };

  const getPayloadLabel = (job: any) => {
    const p = job.payload;
    if (!p) return 'Unknown';
    if (p.kind === 'systemEvent') return `System: ${p.text?.slice(0, 60)}...`;
    if (p.kind === 'agentTurn') return `Agent: ${p.message?.slice(0, 60)}...`;
    return p.kind || 'Unknown';
  };

  return (
    <>
      <div className="main-header">
        <Clock size={20} /> Cron Jobs
        <button
          onClick={refresh}
          style={{
            marginLeft: 'auto', padding: '6px 14px', background: 'var(--accent)', color: 'white',
            border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13,
            display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Fira Sans, sans-serif',
          }}
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>
      <div className="main-content">
        <p style={{ color: 'var(--text-muted)', marginBottom: 20, fontSize: 14 }}>
          Scheduled tasks running on your OpenClaw gateway. Manage via Telegram commands or Alice.
        </p>

        {loading ? (
          <LoadingSkeleton count={3} />
        ) : error ? (
          <div className="card" style={{ cursor: 'default', textAlign: 'center', padding: 40 }}>
            <AlertTriangle size={32} style={{ color: 'var(--yellow)', marginBottom: 12 }} />
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Failed to load cron jobs</div>
            <div className="card-desc" style={{ marginBottom: 16 }}>{error}</div>
            <button onClick={() => { setLoading(true); setError(null); refresh(); }} style={{
              padding: '10px 20px', background: 'var(--accent)', color: 'white',
              border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14,
              display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'Fira Sans, sans-serif',
            }}>
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        ) : jobs.length === 0 ? (
          <div className="card" style={{ cursor: 'default', textAlign: 'center', padding: 40 }}>
            <Clock size={32} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No Cron Jobs</div>
            <div className="card-desc">
              Ask Alice to create scheduled tasks. Examples:
            </div>
            <div style={{ marginTop: 12, textAlign: 'left', display: 'inline-block' }}>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
                💬 "Check match scores every 3 hours"
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
                💬 "Remind me to review stocks at 9am daily"
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                💬 "Check YouTube channels every 6 hours"
              </div>
            </div>
          </div>
        ) : (
          jobs.map((job: any, i: number) => (
            <div key={job.jobId || job.id || i} className="card" style={{ cursor: 'default' }}>
              <div className="card-header">
                <div className="card-title" style={{ textTransform: 'none', letterSpacing: 0 }}>
                  {job.enabled !== false ? (
                    <Play size={14} style={{ color: 'var(--green)' }} />
                  ) : (
                    <Pause size={14} style={{ color: 'var(--text-muted)' }} />
                  )}
                  <span style={{ color: 'var(--text)', fontWeight: 600, fontSize: 15 }}>
                    {job.name || `Job ${(job.jobId || job.id || '').slice(0, 8)}`}
                  </span>
                </div>
                <span className={`badge ${job.enabled !== false ? 'green' : 'red'}`}>
                  {job.enabled !== false ? 'active' : 'disabled'}
                </span>
              </div>

              <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                  <Calendar size={13} />
                  {getScheduleLabel(job)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                  <Zap size={13} />
                  {job.sessionTarget || 'main'}
                </div>
              </div>

              <div style={{
                marginTop: 10, padding: '8px 12px', background: 'var(--bg)',
                borderRadius: 6, fontSize: 12, color: 'var(--text-muted)',
                fontFamily: 'Fira Code, monospace', lineHeight: 1.5,
              }}>
                {getPayloadLabel(job)}
              </div>

              {job.jobId && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, fontFamily: 'Fira Code, monospace' }}>
                  ID: {job.jobId || job.id}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
}
