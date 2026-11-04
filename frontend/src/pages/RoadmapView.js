import React, { useState, useEffect, useCallback } from 'react';
import { roadmapAPI, workspaceAPI, projectAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  FlagIcon,
  MapIcon,
  PlusIcon,
  TrashIcon,
  PencilSquareIcon,
  ClockIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';

const CATEGORIES = ['Product', 'Engineering', 'Marketing', 'Company', 'Operations'];
const PHASES = ['Discovery', 'Design', 'Development', 'Testing', 'Launch', 'Maintenance'];
const STATUS_OPTIONS = [
  { id: 'on_track', label: '🟢 On Track', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  { id: 'at_risk', label: '🟠 At Risk', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  { id: 'behind', label: '🔴 Behind', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
  { id: 'completed', label: '✨ Completed', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
];

const RoadmapView = () => {
  // Active Tab: 'goals' | 'milestones'
  const [activeTab, setActiveTab] = useState('goals');

  // Workspaces and Projects
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');

  // Goals State
  const [goals, setGoals] = useState([]);
  const [goalsLoading, setGoalsLoading] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [goalForm, setGoalForm] = useState({
    title: '',
    description: '',
    category: 'Product',
    timeframe: 'Q1 2026',
    status: 'on_track',
    targetDate: '',
    keyResults: [{ title: '', current: 0, target: 100, unit: '%' }],
  });

  // Milestones State
  const [milestones, setMilestones] = useState([]);
  const [milestonesLoading, setMilestonesLoading] = useState(false);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [milestoneForm, setMilestoneForm] = useState({
    title: '',
    description: '',
    phase: 'Development',
    targetDate: '',
    status: 'in_progress',
    progress: 0,
    project: '',
  });

  // Fetch workspaces
  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const res = await workspaceAPI.getWorkspaces();
        const wsList = res.data?.data || res.data?.workspaces || [];
        setWorkspaces(wsList);
        if (wsList.length > 0) setSelectedWorkspace(wsList[0]);
      } catch (err) {
        console.error('Failed to load workspaces:', err);
      }
    };
    fetchWorkspaces();
  }, []);

  // Fetch projects
  useEffect(() => {
    if (!selectedWorkspace?._id) return;
    const fetchProjects = async () => {
      try {
        const res = await projectAPI.getProjects({ workspace: selectedWorkspace._id });
        setProjects(res.data?.data || res.data?.projects || []);
      } catch (err) {
        console.error('Failed to load projects:', err);
      }
    };
    fetchProjects();
  }, [selectedWorkspace]);

  // Fetch Goals
  const fetchGoals = useCallback(async () => {
    if (!selectedWorkspace?._id) return;
    try {
      setGoalsLoading(true);
      const res = await roadmapAPI.getGoals({ workspaceId: selectedWorkspace._id });
      setGoals(res.data.data || []);
    } catch (err) {
      console.error('Failed to load goals:', err);
    } finally {
      setGoalsLoading(false);
    }
  }, [selectedWorkspace]);

  // Fetch Milestones
  const fetchMilestones = useCallback(async () => {
    if (!selectedWorkspace?._id) return;
    try {
      setMilestonesLoading(true);
      const params = { workspaceId: selectedWorkspace._id };
      if (selectedProject) params.projectId = selectedProject;
      const res = await roadmapAPI.getMilestones(params);
      setMilestones(res.data.data || []);
    } catch (err) {
      console.error('Failed to load milestones:', err);
    } finally {
      setMilestonesLoading(false);
    }
  }, [selectedWorkspace, selectedProject]);

  useEffect(() => {
    if (activeTab === 'goals') {
      fetchGoals();
    } else {
      fetchMilestones();
    }
  }, [activeTab, fetchGoals, fetchMilestones]);

  // Submit Goal
  const handleSubmitGoal = async (e) => {
    e.preventDefault();
    if (!goalForm.title.trim()) return toast.error('Please enter a goal title');
    try {
      const payload = {
        ...goalForm,
        workspace: selectedWorkspace?._id,
        keyResults: goalForm.keyResults.filter((kr) => kr.title.trim() !== ''),
      };

      if (editingGoal) {
        await roadmapAPI.updateGoal(editingGoal._id, payload);
        toast.success('Goal updated successfully');
      } else {
        await roadmapAPI.createGoal(payload);
        toast.success('🎯 Strategic Goal created!');
      }

      setShowGoalModal(false);
      setEditingGoal(null);
      setGoalForm({
        title: '',
        description: '',
        category: 'Product',
        timeframe: 'Q1 2026',
        status: 'on_track',
        targetDate: '',
        keyResults: [{ title: '', current: 0, target: 100, unit: '%' }],
      });
      fetchGoals();
    } catch (err) {
      toast.error('Failed to save goal');
    }
  };

  // Delete Goal
  const handleDeleteGoal = async (id) => {
    try {
      await roadmapAPI.deleteGoal(id);
      toast.success('Goal deleted');
      fetchGoals();
    } catch (err) {
      toast.error('Failed to delete goal');
    }
  };

  // Submit Milestone
  const handleSubmitMilestone = async (e) => {
    e.preventDefault();
    if (!milestoneForm.title.trim() || !milestoneForm.targetDate) {
      return toast.error('Please provide a title and target date');
    }
    try {
      await roadmapAPI.createMilestone({
        ...milestoneForm,
        workspace: selectedWorkspace?._id,
        project: milestoneForm.project || (projects[0]?._id || undefined),
      });
      toast.success('🗺️ Milestone added to roadmap!');
      setShowMilestoneModal(false);
      setMilestoneForm({
        title: '',
        description: '',
        phase: 'Development',
        targetDate: '',
        status: 'in_progress',
        progress: 0,
        project: '',
      });
      fetchMilestones();
    } catch (err) {
      toast.error('Failed to create milestone');
    }
  };

  // Delete Milestone
  const handleDeleteMilestone = async (id) => {
    try {
      await roadmapAPI.deleteMilestone(id);
      toast.success('Milestone deleted');
      fetchMilestones();
    } catch (err) {
      toast.error('Failed to delete milestone');
    }
  };

  // Calculate Overall Goals Progress
  const averageGoalProgress =
    goals.length > 0
      ? Math.round(goals.reduce((acc, g) => acc + (g.progress || 0), 0) / goals.length)
      : 0;

  return (
    <div
      className="min-h-screen text-[#D1D1D1] p-6 lg:p-8"
      style={{
        background: '#0A0A0A',
        fontFamily: "'Satoshi', 'Plus Jakarta Sans', system-ui, sans-serif",
      }}
    >
      {/* ─── Top Header ─── */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#1E1E1E]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
                Strategic Planning
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              Roadmap & Goals
            </h1>
            <p className="text-xs lg:text-sm text-[#828383] mt-1">
              Executive Objectives & Key Results (OKRs) and cross-phase milestone timeline.
            </p>
          </div>

          {/* Workspace & Project Filters */}
          <div className="flex items-center gap-3">
            <select
              value={selectedWorkspace?._id || ''}
              onChange={(e) => {
                const found = workspaces.find((w) => w._id === e.target.value);
                setSelectedWorkspace(found);
              }}
              className="bg-[#141414] border border-[#2A2A2A] text-xs font-semibold text-white px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500"
            >
              {workspaces.map((ws) => (
                <option key={ws._id} value={ws._id}>
                  {ws.name}
                </option>
              ))}
            </select>

            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="bg-[#141414] border border-[#2A2A2A] text-xs font-semibold text-white px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ─── Mode Tabs (Goals vs Milestones) ─── */}
        <div className="flex items-center justify-between mt-6">
          <div className="flex items-center p-1 bg-[#141414] border border-[#1E1E1E] rounded-xl">
            <button
              onClick={() => setActiveTab('goals')}
              className={`flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'goals'
                  ? 'bg-[#1E1E1E] text-white shadow-sm'
                  : 'text-[#828383] hover:text-[#D1D1D1]'
              }`}
            >
              <FlagIcon className="w-4 h-4 text-indigo-400" />
              Strategic OKRs
            </button>
            <button
              onClick={() => setActiveTab('milestones')}
              className={`flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'milestones'
                  ? 'bg-[#1E1E1E] text-white shadow-sm'
                  : 'text-[#828383] hover:text-[#D1D1D1]'
              }`}
            >
              <MapIcon className="w-4 h-4 text-purple-400" />
              Milestone Timeline
            </button>
          </div>

          {activeTab === 'goals' ? (
            <button
              onClick={() => {
                setEditingGoal(null);
                setGoalForm({
                  title: '',
                  description: '',
                  category: 'Product',
                  timeframe: 'Q1 2026',
                  status: 'on_track',
                  targetDate: '',
                  keyResults: [{ title: '', current: 0, target: 100, unit: '%' }],
                });
                setShowGoalModal(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md transition-all shadow-indigo-600/20"
            >
              <PlusIcon className="w-4 h-4" />
              New Objective
            </button>
          ) : (
            <button
              onClick={() => setShowMilestoneModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 shadow-md transition-all shadow-purple-600/20"
            >
              <PlusIcon className="w-4 h-4" />
              Add Milestone
            </button>
          )}
        </div>
      </div>

      {/* ─── TAB 1: STRATEGIC OKRs & GOALS ─── */}
      {activeTab === 'goals' && (
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Progress Overview Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#141414] border border-[#1E1E1E] rounded-2xl p-4">
              <span className="text-[10px] font-bold text-[#828383] uppercase tracking-wider block mb-1">
                Total Objectives
              </span>
              <p className="text-2xl font-black text-white">{goals.length}</p>
            </div>
            <div className="bg-[#141414] border border-[#1E1E1E] rounded-2xl p-4">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                On Track
              </span>
              <p className="text-2xl font-black text-white">
                {goals.filter((g) => g.status === 'on_track').length}
              </p>
            </div>
            <div className="bg-[#141414] border border-[#1E1E1E] rounded-2xl p-4">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
                At Risk / Behind
              </span>
              <p className="text-2xl font-black text-white">
                {goals.filter((g) => g.status === 'at_risk' || g.status === 'behind').length}
              </p>
            </div>
            <div className="bg-[#141414] border border-[#1E1E1E] rounded-2xl p-4">
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block mb-1">
                Average Completion
              </span>
              <p className="text-2xl font-black text-white">{averageGoalProgress}%</p>
            </div>
          </div>

          {/* Goals List */}
          {goalsLoading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto" />
              <p className="text-xs text-[#828383] mt-3">Loading strategic objectives...</p>
            </div>
          ) : goals.length === 0 ? (
            <div className="text-center py-16 bg-[#141414] border border-[#1E1E1E] rounded-2xl p-8">
              <FlagIcon className="w-12 h-12 text-[#434343] mx-auto mb-3" />
              <h3 className="text-sm font-bold text-white">No Strategic Goals Defined</h3>
              <p className="text-xs text-[#828383] mt-1 mb-4">
                Define quarterly OKRs and key metrics to align team delivery with executive goals.
              </p>
              <button
                onClick={() => setShowGoalModal(true)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md"
              >
                Create First Objective
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {goals.map((goal) => {
                const statusConfig = STATUS_OPTIONS.find((s) => s.id === goal.status) || STATUS_OPTIONS[0];
                return (
                  <div
                    key={goal._id}
                    className="bg-[#141414] border border-[#1E1E1E] hover:border-[#2A2A2A] rounded-2xl p-5 shadow-sm transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Header */}
                      <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#1E1E1E]">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            {goal.category}
                          </span>
                          <span className="text-[10px] font-bold text-[#828383]">{goal.timeframe}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusConfig.color}`}>
                            {statusConfig.label}
                          </span>
                          <button
                            onClick={() => {
                              setEditingGoal(goal);
                              setGoalForm({
                                title: goal.title,
                                description: goal.description || '',
                                category: goal.category || 'Product',
                                timeframe: goal.timeframe || 'Q1 2026',
                                status: goal.status || 'on_track',
                                targetDate: goal.targetDate ? goal.targetDate.split('T')[0] : '',
                                keyResults: goal.keyResults?.length
                                  ? goal.keyResults
                                  : [{ title: '', current: 0, target: 100, unit: '%' }],
                              });
                              setShowGoalModal(true);
                            }}
                            className="text-[#605E5E] hover:text-white p-1"
                            title="Edit Goal"
                          >
                            <PencilSquareIcon className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteGoal(goal._id)}
                            className="text-[#605E5E] hover:text-red-400 p-1"
                            title="Delete Goal"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Title & Description */}
                      <h3 className="text-sm font-bold text-white mb-1.5">{goal.title}</h3>
                      {goal.description && (
                        <p className="text-xs text-[#828383] mb-4 leading-relaxed">{goal.description}</p>
                      )}

                      {/* Overall Progress Bar */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                          <span className="text-[#828383]">Progress</span>
                          <span className="text-indigo-400">{goal.progress || 0}%</span>
                        </div>
                        <div className="w-full bg-[#1E1E1E] h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full transition-all duration-500 rounded-full"
                            style={{ width: `${goal.progress || 0}%` }}
                          />
                        </div>
                      </div>

                      {/* Key Results List */}
                      {goal.keyResults && goal.keyResults.length > 0 && (
                        <div className="space-y-2 mt-4 pt-3 border-t border-[#1E1E1E]">
                          <span className="text-[10px] font-black uppercase tracking-wider text-[#605E5E] block">
                            Key Results ({goal.keyResults.length})
                          </span>
                          {goal.keyResults.map((kr, idx) => {
                            const ratio = Math.min(Math.round((kr.current / (kr.target || 1)) * 100), 100);
                            return (
                              <div key={idx} className="bg-[#19191A] p-2.5 rounded-xl border border-[#222]">
                                <div className="flex items-center justify-between text-xs mb-1">
                                  <span className="text-[#D1D1D1] font-medium">{kr.title}</span>
                                  <span className="text-[10px] font-bold text-white">
                                    {kr.current} / {kr.target} {kr.unit}
                                  </span>
                                </div>
                                <div className="w-full bg-[#0A0A0A] h-1.5 rounded-full overflow-hidden">
                                  <div
                                    className="bg-indigo-500 h-full transition-all duration-300"
                                    style={{ width: `${ratio}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Footer Info */}
                    {goal.targetDate && (
                      <div className="flex items-center gap-1.5 pt-3 mt-4 border-t border-[#1E1E1E] text-[10px] text-[#605E5E]">
                        <ClockIcon className="w-3 h-3" />
                        Target: {new Date(goal.targetDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: MILESTONE TIMELINE ─── */}
      {activeTab === 'milestones' && (
        <div className="max-w-7xl mx-auto space-y-6">
          {milestonesLoading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto" />
              <p className="text-xs text-[#828383] mt-3">Loading milestone timeline...</p>
            </div>
          ) : milestones.length === 0 ? (
            <div className="text-center py-16 bg-[#141414] border border-[#1E1E1E] rounded-2xl p-8">
              <MapIcon className="w-12 h-12 text-[#434343] mx-auto mb-3" />
              <h3 className="text-sm font-bold text-white">No Milestones on Roadmap</h3>
              <p className="text-xs text-[#828383] mt-1 mb-4">
                Map cross-functional deliverables across discovery, development, testing, and launch phases.
              </p>
              <button
                onClick={() => setShowMilestoneModal(true)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 shadow-md"
              >
                Add First Milestone
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {PHASES.map((phase) => {
                const phaseMilestones = milestones.filter((m) => m.phase === phase);
                if (phaseMilestones.length === 0) return null;

                return (
                  <div key={phase} className="bg-[#141414] border border-[#1E1E1E] rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#1E1E1E]">
                      <div className="flex items-center gap-2.5">
                        <span className="w-3 h-3 rounded-full bg-purple-500 shadow-sm shadow-purple-500/50" />
                        <h3 className="text-xs font-black uppercase tracking-widest text-white">{phase} Phase</h3>
                      </div>
                      <span className="text-[11px] font-bold text-[#828383] px-2 py-0.5 rounded-md bg-[#19191A]">
                        {phaseMilestones.length} Deliverable{phaseMilestones.length > 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {phaseMilestones.map((m) => {
                        const target = new Date(m.targetDate);
                        const isPast = target < new Date() && m.status !== 'completed';

                        return (
                          <div
                            key={m._id}
                            className="bg-[#19191A] border border-[#2A2A2A] hover:border-[#333] rounded-xl p-4 transition-all text-xs flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md">
                                  {m.project?.name || 'Project Deliverable'}
                                </span>
                                <button
                                  onClick={() => handleDeleteMilestone(m._id)}
                                  className="text-[#605E5E] hover:text-red-400 p-0.5"
                                >
                                  <TrashIcon className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <h4 className="text-xs font-bold text-white mb-1">{m.title}</h4>
                              {m.description && (
                                <p className="text-[11px] text-[#828383] mb-3 leading-relaxed">{m.description}</p>
                              )}

                              {/* Progress bar */}
                              <div className="my-2.5">
                                <div className="flex items-center justify-between text-[10px] font-bold text-[#828383] mb-1">
                                  <span>Progress</span>
                                  <span>{m.progress || 0}%</span>
                                </div>
                                <div className="w-full bg-[#0A0A0A] h-1.5 rounded-full overflow-hidden">
                                  <div
                                    className="bg-purple-500 h-full rounded-full transition-all duration-300"
                                    style={{ width: `${m.progress || 0}%` }}
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-[#2A2A2A]/60 text-[10px]">
                              <span
                                className={`font-bold flex items-center gap-1 ${
                                  m.status === 'completed'
                                    ? 'text-emerald-400'
                                    : isPast
                                    ? 'text-rose-400'
                                    : 'text-[#828383]'
                                }`}
                              >
                                <CalendarDaysIcon className="w-3 h-3" />
                                {target.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>

                              <span className="capitalize px-2 py-0.5 rounded-md bg-[#141414] text-[#A5B4FC] font-semibold border border-[#2A2A2A]">
                                {m.status.replace('_', ' ')}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── Create/Edit Goal Modal ─── */}
      {showGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h3 className="text-base font-bold text-white mb-4">
              {editingGoal ? 'Edit Strategic Objective' : 'New Strategic Objective'}
            </h3>
            <form onSubmit={handleSubmitGoal} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#828383] font-bold mb-1">Objective Title</label>
                <input
                  type="text"
                  required
                  value={goalForm.title}
                  onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
                  placeholder="e.g. Elevate Core App Velocity & User Retention"
                  className="w-full bg-[#0A0A0A] border border-[#1E1E1E] rounded-xl px-3.5 py-2 text-white placeholder-[#605E5E] focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#828383] font-bold mb-1">Category</label>
                  <select
                    value={goalForm.category}
                    onChange={(e) => setGoalForm({ ...goalForm, category: e.target.value })}
                    className="w-full bg-[#0A0A0A] border border-[#1E1E1E] rounded-xl px-3 py-2 text-white"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[#828383] font-bold mb-1">Status</label>
                  <select
                    value={goalForm.status}
                    onChange={(e) => setGoalForm({ ...goalForm, status: e.target.value })}
                    className="w-full bg-[#0A0A0A] border border-[#1E1E1E] rounded-xl px-3 py-2 text-white"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#828383] font-bold mb-1">Timeframe</label>
                  <input
                    type="text"
                    value={goalForm.timeframe}
                    onChange={(e) => setGoalForm({ ...goalForm, timeframe: e.target.value })}
                    placeholder="e.g. Q1 2026 or Annual"
                    className="w-full bg-[#0A0A0A] border border-[#1E1E1E] rounded-xl px-3.5 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[#828383] font-bold mb-1">Target Date</label>
                  <input
                    type="date"
                    value={goalForm.targetDate}
                    onChange={(e) => setGoalForm({ ...goalForm, targetDate: e.target.value })}
                    className="w-full bg-[#0A0A0A] border border-[#1E1E1E] rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#828383] font-bold mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  value={goalForm.description}
                  onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })}
                  placeholder="Explain why this strategic goal matters..."
                  className="w-full bg-[#0A0A0A] border border-[#1E1E1E] rounded-xl px-3.5 py-2 text-white placeholder-[#605E5E]"
                />
              </div>

              {/* Dynamic Key Results */}
              <div className="pt-2 border-t border-[#1E1E1E]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[#828383] font-bold">Key Results (KR)</span>
                  <button
                    type="button"
                    onClick={() =>
                      setGoalForm({
                        ...goalForm,
                        keyResults: [...goalForm.keyResults, { title: '', current: 0, target: 100, unit: '%' }],
                      })
                    }
                    className="text-indigo-400 hover:text-indigo-300 text-[11px] font-bold flex items-center gap-1"
                  >
                    <PlusIcon className="w-3.5 h-3.5" /> Add KR
                  </button>
                </div>

                <div className="space-y-2">
                  {goalForm.keyResults.map((kr, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-[#0A0A0A] p-2 rounded-xl border border-[#1E1E1E]">
                      <input
                        type="text"
                        placeholder="Key metric name..."
                        value={kr.title}
                        onChange={(e) => {
                          const updated = [...goalForm.keyResults];
                          updated[idx].title = e.target.value;
                          setGoalForm({ ...goalForm, keyResults: updated });
                        }}
                        className="flex-1 bg-transparent border-none text-white text-xs focus:outline-none"
                      />
                      <input
                        type="number"
                        placeholder="Current"
                        value={kr.current}
                        onChange={(e) => {
                          const updated = [...goalForm.keyResults];
                          updated[idx].current = Number(e.target.value);
                          setGoalForm({ ...goalForm, keyResults: updated });
                        }}
                        className="w-16 bg-[#141414] border border-[#2A2A2A] rounded-lg px-2 py-1 text-white text-center text-xs"
                      />
                      <span className="text-[#605E5E]">/</span>
                      <input
                        type="number"
                        placeholder="Target"
                        value={kr.target}
                        onChange={(e) => {
                          const updated = [...goalForm.keyResults];
                          updated[idx].target = Number(e.target.value);
                          setGoalForm({ ...goalForm, keyResults: updated });
                        }}
                        className="w-16 bg-[#141414] border border-[#2A2A2A] rounded-lg px-2 py-1 text-white text-center text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Unit"
                        value={kr.unit}
                        onChange={(e) => {
                          const updated = [...goalForm.keyResults];
                          updated[idx].unit = e.target.value;
                          setGoalForm({ ...goalForm, keyResults: updated });
                        }}
                        className="w-12 bg-[#141414] border border-[#2A2A2A] rounded-lg px-1.5 py-1 text-white text-center text-xs"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1E1E1E]">
                <button
                  type="button"
                  onClick={() => setShowGoalModal(false)}
                  className="px-4 py-2 font-bold text-[#828383] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30"
                >
                  {editingGoal ? 'Save Changes' : 'Create Objective'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Create Milestone Modal ─── */}
      {showMilestoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">Add Roadmap Milestone</h3>
            <form onSubmit={handleSubmitMilestone} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#828383] font-bold mb-1">Milestone Deliverable</label>
                <input
                  type="text"
                  required
                  value={milestoneForm.title}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })}
                  placeholder="e.g. Beta API Gateways & OAuth Deprecation"
                  className="w-full bg-[#0A0A0A] border border-[#1E1E1E] rounded-xl px-3.5 py-2 text-white placeholder-[#605E5E] focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#828383] font-bold mb-1">Phase</label>
                  <select
                    value={milestoneForm.phase}
                    onChange={(e) => setMilestoneForm({ ...milestoneForm, phase: e.target.value })}
                    className="w-full bg-[#0A0A0A] border border-[#1E1E1E] rounded-xl px-3 py-2 text-white"
                  >
                    {PHASES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[#828383] font-bold mb-1">Target Date</label>
                  <input
                    type="date"
                    required
                    value={milestoneForm.targetDate}
                    onChange={(e) => setMilestoneForm({ ...milestoneForm, targetDate: e.target.value })}
                    className="w-full bg-[#0A0A0A] border border-[#1E1E1E] rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#828383] font-bold mb-1">Linked Project</label>
                <select
                  value={milestoneForm.project}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, project: e.target.value })}
                  className="w-full bg-[#0A0A0A] border border-[#1E1E1E] rounded-xl px-3 py-2 text-white"
                >
                  <option value="">Default Project</option>
                  {projects.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[#828383] font-bold">Initial Progress</label>
                  <span className="text-purple-400 font-bold">{milestoneForm.progress}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={milestoneForm.progress}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, progress: Number(e.target.value) })}
                  className="w-full accent-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E1E1E]">
                <button
                  type="button"
                  onClick={() => setShowMilestoneModal(false)}
                  className="px-4 py-2 font-bold text-[#828383] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-bold text-white bg-purple-600 hover:bg-purple-500 shadow-md shadow-purple-600/30"
                >
                  Save Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoadmapView;
