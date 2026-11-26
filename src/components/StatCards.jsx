import React from 'react';
import { FileCode2, AlignLeft, Users, Star } from 'lucide-react';

export default function StatCards({ repo }) {
  const stats = [
    { label: 'Files in repo', value: repo.files, icon: FileCode2 },
    { label: 'Approx. lines of code', value: repo.lines, icon: AlignLeft },
    { label: 'Contributors', value: repo.contributors, icon: Users },
    { label: 'Stars', value: repo.stars, icon: Star }
  ];

  return (
    <div className="stat-grid">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div key={stat.label} className="stat-card">
            <div className="stat-icon">
              <Icon size={18} />
            </div>
            <div>
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
