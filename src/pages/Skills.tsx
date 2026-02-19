import { useEffect, useState } from 'react';
import { getSkills } from '../api';
import { Puzzle } from 'lucide-react';

export default function Skills() {
  const [skills, setSkills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSkills()
      .then(data => setSkills(data.skills || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="main-header">Skills</div>
      <div className="main-content">
        <p style={{ color: 'var(--text-muted)', marginBottom: 20, fontSize: 14 }}>
          Installed skills from your OpenClaw instance.
        </p>
        {loading ? (
          <div className="card-desc">Loading...</div>
        ) : skills.length === 0 ? (
          <div className="card-desc">No skills found</div>
        ) : (
          skills.map((skill: any) => (
            <div key={skill.name} className="card" style={{ cursor: 'default' }}>
              <div className="skill-card">
                <div className="skill-info">
                  <div className="card-title" style={{ marginBottom: 4 }}>
                    <Puzzle size={16} />
                    {skill.name}
                  </div>
                  <div className="card-desc">{skill.description || 'No description'}</div>
                </div>
                <span className="badge green">active</span>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
