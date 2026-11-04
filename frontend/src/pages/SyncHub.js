import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { syncAPI, workspaceAPI, projectAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  SparklesIcon,
  ChatBubbleLeftRightIcon,
  HandThumbUpIcon,
  ArrowPathIcon,
  PlusIcon,
  TrashIcon,
  CheckBadgeIcon,
  ArrowTopRightOnSquareIcon,
  FaceSmileIcon,
} from '@heroicons/react/24/outline';

const MOODS = ['🚀 On fire', '⚡ Productive', '🧘 Steady', '⚠️ Struggling', '🛑 Blocked'];
const EMOJIS = ['👍', '🔥', '❤️', '👀', '💪'];

const SyncHub = () => {
  const { user } = useAuth();

  // Active Tab: 'standup' | 'retro'
  const [activeTab, setActiveTab] = useState('standup');

  // Workspaces and Projects
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');

  // Standups state
  const [standups, setStandups] = useState([]);
  const [standupLoading, setStandupLoading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [showStandupForm, setShowStandupForm] = useState(false);
  const [standupForm, setStandupForm] = useState({
    yesterday: '',
    today: '',
    blockers: '',
    mood: '⚡ Productive',
  });

  // Retro state
  const [retros, setRetros] = useState([]);
  const [retroLoading, setRetroLoading] = useState(false);
  const [showRetroModal, setShowRetroModal] = useState(false);
  const [retroCategory, setRetroCategory] = useState('went_well');
  const [retroContent, setRetroContent] = useState('');
  const [convertingId, setConvertingId] = useState(null);

  // Load user workspaces
  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const res = await workspaceAPI.getWorkspaces();
        const wsList = res.data?.data || res.data?.workspaces || [];
        setWorkspaces(wsList);
        if (wsList.length > 0) {
          setSelectedWorkspace(wsList[0]);
        }
      } catch (err) {
        console.error('Failed to load workspaces:', err);
      }
    };
    fetchWorkspaces();
  }, []);

  // Load projects when workspace changes
  useEffect(() => {
    if (!selectedWorkspace?._id) return;
    const fetchProjects = async () => {
      try {
        const res = await projectAPI.getProjects({ workspace: selectedWorkspace._id });
        const pList = res.data?.data || res.data?.projects || [];
        setProjects(pList);
      } catch (err) {
        console.error('Failed to load projects:', err);
      }
    };
    fetchProjects();
  }, [selectedWorkspace]);

  // Fetch standups
  const fetchStandups = useCallback(async () => {
    if (!selectedWorkspace?._id) return;
    try {
      setStandupLoading(true);
      const params = { workspaceId: selectedWorkspace._id };
      if (selectedProject) params.projectId = selectedProject;
      const res = await syncAPI.getStandups(params);
      setStandups(res.data.data || []);
    } catch (err) {
      console.error('Error fetching standups:', err);
    } finally {
      setStandupLoading(false);
    }
  }, [selectedWorkspace, selectedProject]);

  // Fetch retros
  const fetchRetros = useCallback(async () => {
    if (!selectedWorkspace?._id) return;
    try {
      setRetroLoading(true);
      const params = { workspaceId: selectedWorkspace._id };
      if (selectedProject) params.projectId = selectedProject;
      const res = await syncAPI.getRetros(params);
      setRetros(res.data.data || []);
    } catch (err) {
      console.error('Error fetching retros:', err);
    } finally {
      setRetroLoading(false);
    }
  }, [selectedWorkspace, selectedProject]);

  useEffect(() => {
    if (activeTab === 'standup') {
      fetchStandups();
    } else {
      fetchRetros();
    }
  }, [activeTab, fetchStandups, fetchRetros]);

  // AI Generate Standup Draft
  const handleAIGenerateStandup = async () => {
    try {
      setAiGenerating(true);
      const res = await syncAPI.aiGenerateStandup({
        workspaceId: selectedWorkspace?._id,
        projectId: selectedProject || undefined,
      });
      const draft = res.data.data;
      setStandupForm({
        yesterday: draft.yesterday || '',
        today: draft.today || '',
        blockers: draft.blockers || '',
        mood: draft.mood || '⚡ Productive',
      });
      setShowStandupForm(true);
      toast.success('✨ Standup draft synthesized from your task activity!');
    } catch (err) {
      toast.error('AI draft generation failed. Please try again.');
    } finally {
      setAiGenerating(false);
    }
  };

  // Submit Standup
  const handleSubmitStandup = async (e) => {
    e.preventDefault();
    if (!standupForm.yesterday || !standupForm.today) {
      return toast.error('Please fill in yesterday and today sections.');
    }
    try {
      await syncAPI.createStandup({
        workspace: selectedWorkspace?._id,
        project: selectedProject || undefined,
        ...standupForm,
      });
      toast.success('🎉 Standup posted successfully!');
      setStandupForm({ yesterday: '', today: '', blockers: '', mood: '⚡ Productive' });
      setShowStandupForm(false);
      fetchStandups();
    } catch (err) {
      toast.error('Failed to post standup');
    }
  };

  // Toggle emoji reaction
  const handleToggleReaction = async (standupId, emoji) => {
    try {
      await syncAPI.toggleReaction(standupId, emoji);
      fetchStandups();
    } catch (err) {
      toast.error('Failed to update reaction');
    }
  };

  // Create Retro Note
  const handleCreateRetro = async (e) => {
    e.preventDefault();
    if (!retroContent.trim()) return toast.error('Please enter content');
    try {
      await syncAPI.createRetro({
        workspace: selectedWorkspace?._id,
        project: selectedProject || (projects[0]?._id || undefined),
        category: retroCategory,
        content: retroContent.trim(),
      });
      toast.success('Retro note added!');
      setRetroContent('');
      setShowRetroModal(false);
      fetchRetros();
    } catch (err) {
      toast.error('Failed to add retro note');
    }
  };

  // Toggle Retro Vote
  const handleToggleVote = async (retroId) => {
    try {
      await syncAPI.toggleVote(retroId);
      fetchRetros();
    } catch (err) {
      toast.error('Failed to vote');
    }
  };

  // Convert Retro Action Item to Task
  const handleConvertToTask = async (retroId) => {
    const targetProject = selectedProject || projects[0]?._id;
    if (!targetProject) {
      return toast.error('Please create or select a project first to convert this item into a task.');
    }
    try {
      setConvertingId(retroId);
      await syncAPI.convertToTask(retroId, { projectId: targetProject });
      toast.success('🚀 Action item converted to an active task!');
      fetchRetros();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to convert to task');
    } finally {
      setConvertingId(null);
    }
  };

  // Delete Retro
  const handleDeleteRetro = async (retroId) => {
    try {
      await syncAPI.deleteRetro(retroId);
      toast.success('Item deleted');
      fetchRetros();
    } catch (err) {
      toast.error('Failed to delete item');
    }
  };

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
                Agile Ceremonies
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              Sync Hub
            </h1>
            <p className="text-xs lg:text-sm text-[#828383] mt-1">
              Automated async daily standups & collaborative sprint retrospectives.
            </p>
          </div>

          {/* Filters: Workspace & Project */}
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

        {/* ─── Mode Tabs (Standup vs Retrospective) ─── */}
        <div className="flex items-center justify-between mt-6">
          <div className="flex items-center p-1 bg-[#141414] border border-[#1E1E1E] rounded-xl">
            <button
              onClick={() => setActiveTab('standup')}
              className={`flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'standup'
                  ? 'bg-[#1E1E1E] text-white shadow-sm'
                  : 'text-[#828383] hover:text-[#D1D1D1]'
              }`}
            >
              <ChatBubbleLeftRightIcon className="w-4 h-4 text-indigo-400" />
              Daily Standup
            </button>
            <button
              onClick={() => setActiveTab('retro')}
              className={`flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'retro'
                  ? 'bg-[#1E1E1E] text-white shadow-sm'
                  : 'text-[#828383] hover:text-[#D1D1D1]'
              }`}
            >
              <ArrowPathIcon className="w-4 h-4 text-emerald-400" />
              Sprint Retrospective
            </button>
          </div>

          {activeTab === 'standup' ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleAIGenerateStandup}
                disabled={aiGenerating}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white transition-all border border-indigo-500/30 bg-gradient-to-r from-indigo-600/80 to-purple-600/80 hover:from-indigo-600 hover:to-purple-600 shadow-lg shadow-indigo-500/20"
              >
                <SparklesIcon className={`w-4 h-4 ${aiGenerating ? 'animate-spin' : ''}`} />
                {aiGenerating ? 'Synthesizing...' : '✨ Auto-Draft with AI'}
              </button>
              <button
                onClick={() => setShowStandupForm(!showStandupForm)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-[#1E1E1E] hover:bg-[#2A2A2A] border border-[#2A2A2A] transition-all"
              >
                <PlusIcon className="w-4 h-4" />
                {showStandupForm ? 'Close Form' : 'Write Standup'}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowRetroModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md transition-all shadow-indigo-600/20"
            >
              <PlusIcon className="w-4 h-4" />
              Add Retro Note
            </button>
          )}
        </div>
      </div>

      {/* ─── TAB 1: DAILY STANDUP ─── */}
      {activeTab === 'standup' && (
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Post Standup Form Card */}
          {showStandupForm && (
            <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl p-6 shadow-xl relative overflow-hidden transition-all">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FaceSmileIcon className="w-5 h-5 text-indigo-400" />
                  Post Today's Standup Update
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#828383]">Mood:</span>
                  <select
                    value={standupForm.mood}
                    onChange={(e) => setStandupForm({ ...standupForm, mood: e.target.value })}
                    className="bg-[#19191A] border border-[#2A2A2A] text-xs font-bold text-white px-2.5 py-1 rounded-lg"
                  >
                    {MOODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <form onSubmit={handleSubmitStandup} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1.5">
                    1. What did you accomplish yesterday?
                  </label>
                  <textarea
                    rows={2}
                    value={standupForm.yesterday}
                    onChange={(e) => setStandupForm({ ...standupForm, yesterday: e.target.value })}
                    placeholder="e.g. Implemented Firebase auth provider and merged task drag & drop fixes"
                    className="w-full bg-[#0A0A0A] border border-[#1E1E1E] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#605E5E] focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1.5">
                    2. What is your primary focus today?
                  </label>
                  <textarea
                    rows={2}
                    value={standupForm.today}
                    onChange={(e) => setStandupForm({ ...standupForm, today: e.target.value })}
                    placeholder="e.g. Working on Roadmap milestones and reviewing pull requests"
                    className="w-full bg-[#0A0A0A] border border-[#1E1E1E] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#605E5E] focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-amber-400 uppercase tracking-wider mb-1.5">
                    3. Any blockers or dependencies? (Optional)
                  </label>
                  <input
                    type="text"
                    value={standupForm.blockers}
                    onChange={(e) => setStandupForm({ ...standupForm, blockers: e.target.value })}
                    placeholder="e.g. Waiting on API credentials or None"
                    className="w-full bg-[#0A0A0A] border border-[#1E1E1E] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#605E5E] focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowStandupForm(false)}
                    className="px-4 py-2 text-xs font-bold text-[#828383] hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30 transition-all"
                  >
                    Share with Team
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Standup Stream */}
          {standupLoading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto" />
              <p className="text-xs text-[#828383] mt-3">Loading team updates...</p>
            </div>
          ) : standups.length === 0 ? (
            <div className="text-center py-16 bg-[#141414] border border-[#1E1E1E] rounded-2xl p-8">
              <ChatBubbleLeftRightIcon className="w-12 h-12 text-[#434343] mx-auto mb-3" />
              <h3 className="text-sm font-bold text-white">No standups posted today yet</h3>
              <p className="text-xs text-[#828383] mt-1 mb-4">
                Be the first to share your daily progress or use the AI generator!
              </p>
              <button
                onClick={handleAIGenerateStandup}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md"
              >
                ✨ Auto-Draft with AI
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {standups.map((item) => (
                <div
                  key={item._id}
                  className="bg-[#141414] border border-[#1E1E1E] hover:border-[#2A2A2A] rounded-2xl p-5 transition-all shadow-sm flex flex-col justify-between"
                >
                  <div>
                    {/* Member Header */}
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#1E1E1E]">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center font-bold text-indigo-300 text-xs overflow-hidden">
                          {item.user?.avatar ? (
                            <img src={item.user.avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            item.user?.name?.[0]?.toUpperCase() || 'U'
                          )}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white leading-tight">
                            {item.user?.name || 'Team Member'}
                          </h4>
                          <span className="text-[10px] text-[#828383]">
                            {new Date(item.createdAt).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {item.project?.name && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#19191A] text-[#828383] border border-[#2A2A2A]">
                            {item.project.name}
                          </span>
                        )}
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[#19191A] border border-[#2A2A2A] text-white">
                          {item.mood}
                        </span>
                      </div>
                    </div>

                    {/* Standup Content */}
                    <div className="space-y-3 text-xs">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 block mb-0.5">
                          Yesterday
                        </span>
                        <p className="text-[#D1D1D1] leading-relaxed">{item.yesterday}</p>
                      </div>

                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400 block mb-0.5">
                          Today
                        </span>
                        <p className="text-[#D1D1D1] leading-relaxed">{item.today}</p>
                      </div>

                      {item.blockers && item.blockers.toLowerCase() !== 'none' && (
                        <div>
                          <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400 block mb-0.5">
                            Blockers
                          </span>
                          <p className="text-amber-200/90 leading-relaxed">{item.blockers}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Reactions Bar */}
                  <div className="flex items-center gap-1.5 pt-4 mt-4 border-t border-[#1E1E1E]">
                    {EMOJIS.map((emoji) => {
                      const match = item.reactions?.find((r) => r.emoji === emoji);
                      const hasUserReacted = match?.users?.some((u) => u === user?._id || u?._id === user?._id);
                      return (
                        <button
                          key={emoji}
                          onClick={() => handleToggleReaction(item._id, emoji)}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                            hasUserReacted
                              ? 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-300'
                              : 'bg-[#0A0A0A] border border-[#1E1E1E] text-[#828383] hover:text-white'
                          }`}
                        >
                          <span>{emoji}</span>
                          {match && match.users.length > 0 && <span>{match.users.length}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: SPRINT RETROSPECTIVE ─── */}
      {activeTab === 'retro' && (
        <div className="max-w-7xl mx-auto">
          {retroLoading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto" />
              <p className="text-xs text-[#828383] mt-3">Loading retrospective board...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Column 1: What Went Well */}
              <div className="flex flex-col h-full bg-[#141414] border border-[#1E1E1E] rounded-2xl p-4">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#1E1E1E]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-white">Went Well</h3>
                  </div>
                  <span className="text-[11px] font-bold text-[#828383] px-2 py-0.5 rounded-md bg-[#19191A]">
                    {retros.filter((r) => r.category === 'went_well').length}
                  </span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar">
                  {retros
                    .filter((r) => r.category === 'went_well')
                    .map((item) => (
                      <RetroCard
                        key={item._id}
                        item={item}
                        userId={user?._id}
                        onVote={() => handleToggleVote(item._id)}
                        onDelete={() => handleDeleteRetro(item._id)}
                      />
                    ))}
                </div>
              </div>

              {/* Column 2: What Could Be Improved */}
              <div className="flex flex-col h-full bg-[#141414] border border-[#1E1E1E] rounded-2xl p-4">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#1E1E1E]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-white">To Improve</h3>
                  </div>
                  <span className="text-[11px] font-bold text-[#828383] px-2 py-0.5 rounded-md bg-[#19191A]">
                    {retros.filter((r) => r.category === 'to_improve').length}
                  </span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar">
                  {retros
                    .filter((r) => r.category === 'to_improve')
                    .map((item) => (
                      <RetroCard
                        key={item._id}
                        item={item}
                        userId={user?._id}
                        onVote={() => handleToggleVote(item._id)}
                        onDelete={() => handleDeleteRetro(item._id)}
                      />
                    ))}
                </div>
              </div>

              {/* Column 3: Action Items */}
              <div className="flex flex-col h-full bg-[#141414] border border-[#1E1E1E] rounded-2xl p-4">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#1E1E1E]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-white">Action Items</h3>
                  </div>
                  <span className="text-[11px] font-bold text-[#828383] px-2 py-0.5 rounded-md bg-[#19191A]">
                    {retros.filter((r) => r.category === 'action_item').length}
                  </span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar">
                  {retros
                    .filter((r) => r.category === 'action_item')
                    .map((item) => (
                      <RetroCard
                        key={item._id}
                        item={item}
                        userId={user?._id}
                        isActionItem={true}
                        converting={convertingId === item._id}
                        onConvertToTask={() => handleConvertToTask(item._id)}
                        onVote={() => handleToggleVote(item._id)}
                        onDelete={() => handleDeleteRetro(item._id)}
                      />
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Add Retro Item Modal ─── */}
      {showRetroModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">Add Retrospective Note</h3>
            <form onSubmit={handleCreateRetro} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#828383] mb-1.5">Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'went_well', label: '🟢 Went Well' },
                    { id: 'to_improve', label: '🟠 To Improve' },
                    { id: 'action_item', label: '🟣 Action Item' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setRetroCategory(cat.id)}
                      className={`py-2 text-[11px] font-bold rounded-xl border transition-all ${
                        retroCategory === cat.id
                          ? 'bg-indigo-600/20 border-indigo-500 text-white'
                          : 'bg-[#19191A] border-[#2A2A2A] text-[#828383]'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#828383] mb-1.5">Note Content</label>
                <textarea
                  rows={3}
                  value={retroContent}
                  onChange={(e) => setRetroContent(e.target.value)}
                  placeholder="Share a concise reflection or concrete action step..."
                  className="w-full bg-[#0A0A0A] border border-[#1E1E1E] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-[#605E5E] focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRetroModal(false)}
                  className="px-4 py-2 text-xs font-bold text-[#828383] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30"
                >
                  Add Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Retro Card Sub-component
const RetroCard = ({ item, userId, isActionItem, converting, onConvertToTask, onVote, onDelete }) => {
  const hasVoted = item.votes?.some((v) => v === userId || v?._id === userId);

  return (
    <div className="bg-[#19191A] border border-[#2A2A2A] hover:border-[#333] rounded-xl p-3.5 transition-all text-xs flex flex-col justify-between shadow-sm">
      <p className="text-[#D1D1D1] leading-relaxed mb-3">{item.content}</p>

      {item.isConvertedToTask && (
        <div className="mb-2.5 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-md flex items-center gap-1.5 text-emerald-400 text-[10px] font-bold">
          <CheckBadgeIcon className="w-3.5 h-3.5" />
          Converted to Active Task
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-[#2A2A2A]/60">
        <div className="flex items-center gap-2">
          <button
            onClick={onVote}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] transition-all ${
              hasVoted
                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                : 'bg-[#141414] text-[#828383] hover:text-white border border-[#2A2A2A]'
            }`}
          >
            <HandThumbUpIcon className="w-3 h-3" />
            <span>{item.votes?.length || 0}</span>
          </button>
          <span className="text-[10px] text-[#605E5E]">by {item.author?.name?.split(' ')[0] || 'Member'}</span>
        </div>

        <div className="flex items-center gap-2">
          {isActionItem && !item.isConvertedToTask && (
            <button
              onClick={onConvertToTask}
              disabled={converting}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-extrabold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm transition-all"
            >
              <ArrowTopRightOnSquareIcon className="w-3 h-3" />
              {converting ? 'Creating...' : 'Convert to Task'}
            </button>
          )}

          <button
            onClick={onDelete}
            className="text-[#605E5E] hover:text-red-400 transition-colors p-1"
            title="Delete card"
          >
            <TrashIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SyncHub;
