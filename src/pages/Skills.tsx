import { useEffect, useState } from 'react';
import { Puzzle } from 'lucide-react';

interface Skill {
  name: string;
  description: string;
  active: boolean;
}

// For now, skills are loaded from a static config
// Later this will connect to the gateway API
const DEFAULT_SKILLS: Skill[] = [
  { name: 'weather', description: 'Get current weather and forecasts', active: true },
  { name: 'github', description: 'Interact with GitHub using gh CLI', active: true },
  { name: 'clawhub', description: 'Search, install, and publish agent skills', active: true },
  { name: 'healthcheck', description: 'Host security hardening and risk checks', active: false },
  { name: 'skill-creator', description: 'Create or update AgentSkills', active: false },
];

export default function Skills() {
  const [skills, setSkills] = useState<Skill[]>([]);

  useEffect(() => {
    // Try to load from localStorage, fallback to defaults
    const saved = localStorage.getItem('alice-skills');
    setSkills(saved ? JSON.parse(saved) : DEFAULT_SKILLS);
  }, []);

  const toggle = (name: string) => {
    const updated = skills.map(s => s.name === name ? { ...s, active: !s.active } : s);
    setSkills(updated);
    localStorage.setItem('alice-skills', JSON.stringify(updated));
  };

  return (
    <>
      <div className="main-header">Skills & MCP</div>
      <div className="main-content">
        <p style={{ color: 'var(--text-muted)', marginBottom: 20, fontSize: 14 }}>
          Manage installed skills. Toggle to activate or deactivate.
        </p>
        {skills.map(skill => (
          <div key={skill.name} className="card" style={{ cursor: 'default' }}>
            <div className="skill-card">
              <div className="skill-info">
                <div className="card-title" style={{ marginBottom: 4 }}>
                  <Puzzle size={16} />
                  {skill.name}
                </div>
                <div className="card-desc">{skill.description}</div>
              </div>
              <button
                className={`toggle ${skill.active ? 'active' : ''}`}
                onClick={() => toggle(skill.name)}
              />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
