import { useEffect, useState } from 'react';
import { api } from './api';

function StatCard({ label, value, color }) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-5 flex flex-col gap-1`}>
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-3xl font-bold ${color}`}>{value}</span>
    </div>
  );
}

function Dashboard({ token }) {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/dashboard', {}, token)
      .then(setStats)
      .catch((err) => setError(err.message));
  }, [token]);

  if (error) return <p className="text-red-500 mt-4">{error}</p>;
  if (!stats) return <p className="text-gray-400 mt-4">Loading...</p>;

  return (
    <div>
      <h1 className="text-xl font-bold mb-5 mt-2">Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Total Projects" value={stats.totalProjects} color="text-blue-600" />
        <StatCard label="Total Tasks" value={stats.totalTasks} color="text-gray-700" />
        <StatCard label="Completed Tasks" value={stats.completedTasks} color="text-green-600" />
        <StatCard label="Pending Tasks" value={stats.pendingTasks} color="text-yellow-600" />
        <StatCard label="Overdue Tasks" value={stats.overdueTasks} color="text-red-600" />
      </div>
    </div>
  );
}

export default Dashboard;
