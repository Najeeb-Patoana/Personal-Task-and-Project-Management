import { useEffect, useState } from "react";
import {
  FaFolder,
  FaTasks,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
} from "react-icons/fa";
import { api } from "./api";

function StatCard({ title, value, icon, iconColor, bgHover }) {
  return (
    <div className={`bg-[#1e1e24] rounded-xl border border-[#2d2d38] p-5 hover:border-[#3e3e4f] ${bgHover} transition-all duration-200 cursor-pointer`}>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-[#a0a0b2] text-xs font-semibold tracking-wider uppercase">{title}</p>
          <h2 className="text-2xl font-bold text-[#f3f3f5]">{value}</h2>
        </div>

        <div className={`text-xl p-3 rounded-lg bg-[#2a2a35] ${iconColor}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function Dashboard({ token }) {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/dashboard", {}, token)
      .then(setStats)
      .catch((err) => setError(err.message));
  }, [token]);

  if (error)
    return (
      <div className="flex justify-center mt-10">
        <div className="bg-[#2c1d21] border border-[#e74c3c]/30 text-[#ff8080] px-4 py-3 rounded-lg text-sm font-medium">
          {error}
        </div>
      </div>
    );

  if (!stats)
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-6 animate-pulse">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="bg-[#1e1e24] border border-[#2d2d38] rounded-xl h-[92px]"
          ></div>
        ))}
      </div>
    );

  const completedPercentage =
    stats.totalTasks === 0
      ? 0
      : Math.round((stats.completedTasks / stats.totalTasks) * 100);

  const hour = new Date().getHours();

  const greeting =
    hour < 12
      ? "Good Morning"
      : hour < 18
      ? "Good Afternoon"
      : "Good Evening";

  return (
    <div className="bg-[#111115] min-h-screen text-[#f3f3f5] p-8 font-sans antialiased">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2d2d38] pb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              {greeting}
            </h1>
            <p className="text-[#a0a0b2] text-sm mt-1">
              Here is a quick overview of your workspace.
            </p>
          </div>
         
        </div>

        {/* Cards - Compact Row */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            title="Projects"
            value={stats.totalProjects}
            icon={<FaFolder />}
            iconColor="text-[#3498db]"
            bgHover="hover:bg-[#1a2530]"
          />

          <StatCard
            title="Tasks"
            value={stats.totalTasks}
            icon={<FaTasks />}
            iconColor="text-[#7b68ee]" // ClickUp brand purple
            bgHover="hover:bg-[#201d30]"
          />

          <StatCard
            title="Completed"
            value={stats.completedTasks}
            icon={<FaCheckCircle />}
            iconColor="text-[#2ecc71]"
            bgHover="hover:bg-[#192b21]"
          />

          <StatCard
            title="Pending"
            value={stats.pendingTasks}
            icon={<FaClock />}
            iconColor="text-[#f1c40f]"
            bgHover="hover:bg-[#2c2819]"
          />

          <StatCard
            title="Overdue"
            value={stats.overdueTasks}
            icon={<FaExclamationTriangle />}
            iconColor="text-[#e74c3c]"
            bgHover="hover:bg-[#2e1d1d]"
          />
        </div>

        {/* Progress Card */}
        <div className="bg-[#1e1e24] border border-[#2d2d38] rounded-xl p-6 shadow-lg max-w-2xl">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="font-bold text-sm uppercase tracking-wider text-[#a0a0b2]">
                Task Progress
              </h2>
              <p className="text-xs text-[#7c7c90] mt-0.5">
                {stats.completedTasks} of {stats.totalTasks} tasks completed
              </p>
            </div>
            <span className="font-bold text-xl text-[#7b68ee]">
              {completedPercentage}%
            </span>
          </div>

          {/* Clean custom progress bar */}
          <div className="w-full bg-[#2a2a35] rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-[#7b68ee] h-2.5 rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${completedPercentage}%`,
              }}
            />
          </div>
        </div>

      </div>
    </div>
  );
}

export default Dashboard;