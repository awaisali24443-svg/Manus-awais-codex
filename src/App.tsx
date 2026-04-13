import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, CheckCircle2, Circle, Terminal, Brain, Eye, Activity, 
  AlertCircle, Box, GitBranch, Database, ChevronDown, Monitor, 
  Layout, MessageSquare, List, ExternalLink, Copy, Menu, X,
  Check, AlertTriangle, Send, History, Cpu, Globe, Search,
  Settings, Clock, ChevronLeft, ChevronRight, ListChecks,
  Terminal as TerminalIcon, ArrowUp, Zap, Server, XCircle,
  LogIn, User as UserIcon, Loader2, Image as ImageIcon, Command
} from 'lucide-react';
import { 
  db, rtdb, doc, onSnapshot, ref, onValue
} from './firebase';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import SettingsLayout from './components/SettingsLayout';
import AccountSettings from './components/settings/AccountSettings';
import IntegrationsSettings from './components/settings/IntegrationsSettings';
import NotificationsSettings from './components/settings/NotificationsSettings';
import SecuritySettings from './components/settings/SecuritySettings';
import PreferencesSettings from './components/settings/PreferencesSettings';
import DiagnosticsSettings from './components/settings/DiagnosticsSettings';
import CommandPalette from './components/CommandPalette';

// FIXED: Never strip the onrender.com URL.
// The old code caused all fetch calls to go to '' (the frontend 
// host) instead of the backend, producing "backend not reachable".
// FIXED: Use VITE_API_URL directly. Never override or strip it.
// In dev, Vite's proxy (/api → localhost:8000) handles routing automatically.
// In production (Render), VITE_API_URL must be set to your backend URL.
let API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
// FIXED: In AI Studio preview, if VITE_API_URL is set to localhost, it will fail in the browser.
// We force it to empty string so it uses the Vite proxy.
if (API_URL.includes('localhost') || API_URL.includes('127.0.0.1')) {
  console.warn(`VITE_API_URL ("${API_URL}") points to localhost. Forcing to empty string to use Vite proxy.`);
  API_URL = '';
}
const SYNOD_API_KEY = import.meta.env.VITE_SYNOD_API_KEY || 'local-dev-key';

// Mock user for Personal Edition
const MOCK_USER = {
  uid: 'local-admin-123',
  displayName: 'Awais (Admin)',
  email: 'admin@codex.local',
  photoURL: null
};

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user] = useState(MOCK_USER); // Personal Edition bypass
  const [goal, setGoal] = useState('');
  const [taskId, setTaskId] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [status, setStatus] = useState('IDLE');
  const [agent, setAgent] = useState('MasterAgent');
  const [logs, setLogs] = useState([]);
  const [plan, setPlan] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [rightPanelOpen, setRightPanelOpen] = useState(window.innerWidth >= 1024);
  const [pendingAction, setPendingAction] = useState(null);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState(null);
  const [isCheckingDiagnostics, setIsCheckingDiagnostics] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const logsEndRef = useRef(null);

  const clearHistory = () => {
    setLogs([]);
  };

  const handleConfirm = async (confirmed: boolean) => {
    if (!taskId) return;
    try {
      const res = await fetch(`${API_URL}/api/tasks/${taskId}/confirm?confirmed=${confirmed}`, {
        method: 'POST',
        headers: { 'X-API-Key': SYNOD_API_KEY }
      });
      if (!res.ok) throw new Error('Failed to send confirmation');
      setPendingAction(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const checkDiagnostics = async () => {
    setIsCheckingDiagnostics(true);
    try {
      const res = await fetch(`${API_URL}/api/diagnostics`, {
        headers: { 'X-API-Key': SYNOD_API_KEY }
      });
      if (!res.ok) throw new Error('Backend unreachable');
      const data = await res.json();
      setDiagnostics(data);
    } catch (err) {
      setDiagnostics({ error: err.message });
    } finally {
      setIsCheckingDiagnostics(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const getLogStyle = (type: string) => {
    const map: Record<string, {fg:string; badge:string; label:string}> = {
      error:       {fg:'text-red-600',    badge:'bg-red-50 text-red-600 border-red-200',         label:'ERROR'},
      thought:     {fg:'text-violet-600', badge:'bg-violet-50 text-violet-600 border-violet-200', label:'THOUGHT'},
      tool:        {fg:'text-blue-600',   badge:'bg-blue-50 text-blue-600 border-blue-200',       label:'TOOL'},
      observation: {fg:'text-emerald-600',badge:'bg-emerald-50 text-emerald-600 border-emerald-200',label:'OBS'},
      replan:      {fg:'text-amber-600',  badge:'bg-amber-50 text-amber-600 border-amber-200',    label:'REPLAN'},
    };
    return map[type] || {fg:'text-gray-700', badge:'bg-gray-50 text-gray-500 border-gray-200', label:'LOG'};
  };

  const [backendStatus, setBackendStatus] = useState<'checking'|'online'|'offline'>('checking');

  // Fetch task history
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await fetch(`${API_URL}/api/tasks?uid=${user.uid}`, {
          headers: { 'X-API-Key': SYNOD_API_KEY }
        });
        const data = await res.json();
        setTasks(data.tasks || []);
      } catch (err) {
        console.error('Failed to fetch tasks', err);
        setBackendStatus('offline');
        if (err instanceof TypeError && err.message === 'Failed to fetch') {
          setLogs(prev => [...prev, {
            type: 'error',
            text: `Network error: Failed to fetch tasks. If you are using a custom backend URL ("${API_URL}"), check for typos or CORS issues. In AI Studio preview, VITE_API_URL should usually be empty.`,
            timestamp: Date.now() / 1000,
            agent: 'system'
          }]);
        }
      }
    };
    fetchTasks();
  }, [user.uid]);

  // Initial diagnostics and health check
  useEffect(() => {
    const checkHealth = async () => {
      try {
        console.log(`Checking backend health at: "${API_URL || '(proxy)'}/api/health"`);
        const res = await fetch(`${API_URL}/api/health`, {
          headers: { 'X-API-Key': SYNOD_API_KEY },
          signal: AbortSignal.timeout(8000)
        });
        setBackendStatus(res.ok ? 'online' : 'offline');
        if (!res.ok) {
          setError(`Backend returned ${res.status}`);
          console.error(`Health check failed with status: ${res.status}`);
        } else {
          setError(null);
          console.log('Backend is online.');
        }
      } catch (err) {
        setBackendStatus('offline');
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error('Health check error:', err);
        setError(`Cannot reach backend at "${API_URL || '(proxy)'}". Error: ${errorMsg}`);
        
        if (err instanceof TypeError && errorMsg === 'Failed to fetch') {
          console.error('This is a network error. Possible causes: 1. Backend not running. 2. Proxy misconfigured. 3. CORS issue. 4. Mixed content (HTTPS/HTTP).');
        }
      }
    };
    checkHealth();
    checkDiagnostics();
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    if (logsEndRef.current) logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Real-time task state and logs
  useEffect(() => {
    if (!taskId || taskId === 'error') return;

    const unsubTask = onSnapshot(doc(db, 'tasks', taskId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setStatus(data.status === 'COMPLETE' || data.status === 'FAIL' ? data.status : data.status || 'RUNNING');
        if (data.current_agent) setAgent(data.current_agent);
        if (data.plan) setPlan(data.plan);
        
        // Detect CONFIRM state and set pendingAction
        if (data.status === 'CONFIRM' && data.pending_action) {
          setPendingAction(data.pending_action);
        } else if (data.status !== 'CONFIRM') {
          setPendingAction(null);
        }
      }
    });

    const logsRef = ref(rtdb, `tasks/${taskId}/events`);
    const unsubLogs = onValue(logsRef, (snapshot) => {
      const data = snapshot.val() as Record<string, any>;
      if (data) {
        const logsArray = Object.values(data)
          .sort((a: any, b: any) => (a.timestamp || 0) - (b.timestamp || 0));
        setLogs(logsArray.map((l: any) => ({
          type: l.type || 'info',
          text: l.content || l.message || '',
          timestamp: l.timestamp || Date.now() / 1000,
          agent: l.agent || 'system'
        })));
        
        // Detect preview URL from logs
        logsArray.forEach((l: any) => {
          if (l.content && l.content.includes('live at:')) {
            const match = l.content.match(/https?:\/\/[^\s]+/);
            if (match) setPreviewUrl(match[0]);
          }
        });
      }
    });

    return () => {
      unsubTask();
      unsubLogs();
    };
  }, [taskId]);

  // Screenshot polling
  useEffect(() => {
    if (!taskId || (status !== 'RUNNING' && status !== 'CONFIRM')) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/api/tasks/${taskId}/screenshot`, {
          headers: { 'X-API-Key': SYNOD_API_KEY }
        });
        const data = await res.json();
        if (data.screenshot) {
          const prefix = "data:image/png;base64,";
          setScreenshot(data.screenshot.startsWith(prefix) ? data.screenshot : prefix + data.screenshot);
        }
      } catch (err) {
        console.error('Screenshot fetch failed', err);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [taskId, status]);

  const handleExecute = async (overrideGoal?: string) => {
    const finalGoal = overrideGoal || goal;
    if (!finalGoal.trim()) return;
    // FIXED: Guard programmatic calls (example prompts) as well as button clicks
    if (backendStatus === 'offline') {
      setError(`Backend is offline. Set VITE_API_URL in Render → Environment Variables.`);
      return;
    }
    setStatus('RUNNING');
    setLogs([{ type: 'info', text: `Initializing task: ${finalGoal}`, timestamp: Date.now() / 1000, agent: 'system' }]);
    setPlan([]);
    setScreenshot(null);
    setPreviewUrl(null);

    try {
      const res = await fetch(`${API_URL}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': SYNOD_API_KEY },
        body: JSON.stringify({ goal: finalGoal, uid: user.uid })
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || 'Failed to create task');
      }
      
      const data = await res.json();
      setTaskId(data.task_id);
      setGoal('');
      
      // Refresh task list
      const tasksRes = await fetch(`${API_URL}/api/tasks?uid=${user.uid}`, {
        headers: { 'X-API-Key': SYNOD_API_KEY }
      });
      const tasksData = await tasksRes.json();
      setTasks(tasksData.tasks || []);
      
      navigate('/');
    } catch (err) {
      console.error('Execution error:', err);
      setStatus('FAIL');
      if (!taskId) setTaskId('error');
      
      let errorMsg = err instanceof Error ? err.message : String(err);
      if (err instanceof TypeError && errorMsg === 'Failed to fetch') {
        errorMsg = `Network error: Failed to fetch. Please verify that your backend is running and the URL (${API_URL || 'localhost'}) is correct without typos.`;
      }
      
      setLogs(prev => [...prev, { 
        type: 'error', 
        text: `Execution failed: ${errorMsg}`, 
        timestamp: Date.now() / 1000, 
        agent: 'system' 
      }]);
    }
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'RUNNING': return 'text-blue-500 bg-blue-50 border-blue-200';
      case 'COMPLETE': return 'text-green-500 bg-green-50 border-green-200';
      case 'FAIL': return 'text-red-500 bg-red-50 border-red-200';
      case 'CONFIRM': return 'text-amber-500 bg-amber-50 border-amber-200';
      default: return 'text-gray-500 bg-gray-50 border-gray-200';
    }
  };

  return (
    <Routes>
      <Route path="/" element={
        <div className="flex h-[100dvh] bg-[#FAFAFA] text-gray-900 font-sans overflow-hidden relative">
          
          <CommandPalette 
            isOpen={cmdPaletteOpen} 
            setIsOpen={setCmdPaletteOpen} 
            setGoal={setGoal}
            handleExecute={handleExecute}
            setStatus={setStatus}
            setTaskId={setTaskId}
            setLogs={setLogs}
            setPlan={setPlan}
            setScreenshot={setScreenshot}
          />

          {/* Mobile Overlay for Sidebar */}
          {sidebarOpen && (
            <div 
              className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-30 lg:hidden transition-opacity"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Panel 1: Sidebar (History & Navigation) */}
          <aside className={`fixed lg:relative inset-y-0 left-0 z-40 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 w-72 lg:w-64 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 ease-in-out`}>
            <div className="h-14 flex items-center justify-between px-4 border-b border-gray-100">
              <div className="flex items-center gap-2 text-gray-900">
                <Brain className="w-5 h-5 text-blue-600" />
                <span className="font-bold tracking-tight">Awais Codex</span>
              </div>
              <button className="lg:hidden p-1 text-gray-400 hover:text-gray-600" onClick={() => setSidebarOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-3">
              <button 
                onClick={() => { setTaskId(null); setGoal(''); setLogs([]); setPlan([]); setScreenshot(null); setStatus('IDLE'); setPreviewUrl(null); if(window.innerWidth < 1024) setSidebarOpen(false); }}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-bold text-sm transition-colors border border-blue-200/50 shadow-sm"
              >
                <Play className="w-4 h-4" /> New Task
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1 pt-0">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2 mt-2">Recent Tasks</div>
              {tasks.map((h) => (
                <div 
                  key={h.task_id}
                  onClick={() => { setTaskId(h.task_id); if(window.innerWidth < 1024) setSidebarOpen(false); }}
                  className={`p-2.5 rounded-lg cursor-pointer transition-all flex items-center gap-3 ${
                    taskId === h.task_id ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-600'
                  }`}
                >
                  <MessageSquare className={`w-4 h-4 flex-shrink-0 ${taskId === h.task_id ? 'text-blue-500' : 'text-gray-400'}`} />
                  <p className="text-sm font-medium truncate">{h.goal}</p>
                </div>
              ))}
              {tasks.length === 0 && (
                <div className="px-2 py-4 text-sm text-gray-400 text-center">No tasks yet</div>
              )}
            </div>
            
            <div className="p-3 border-t border-gray-100 space-y-1">
              <button 
                onClick={() => document.documentElement.classList.toggle('dark')}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors"
              >
                <Monitor className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium">Toggle Theme</span>
              </button>
              <button onClick={() => navigate('/settings/account')}
                className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-gray-50 transition-colors group">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {user.displayName?.[0] || 'A'}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-xs font-semibold text-gray-900 truncate">
                    {user.displayName}
                  </p>
                  <p className="text-[10px] text-gray-400">Personal Edition</p>
                </div>
                <Settings className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 transition-colors" />
              </button>
            </div>
          </aside>

          {/* Panel 2: Main Chat / Interaction Area */}
          <main className="flex-1 flex flex-col min-w-0 bg-white relative z-10 shadow-[-10px_0_30px_rgba(0,0,0,0.02)]">
            <header className="h-14 border-b border-gray-100 flex items-center justify-between px-2 sm:px-4 bg-white/80 backdrop-blur-md">
              <div className="flex items-center gap-2 sm:gap-3">
                <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 hover:bg-gray-100 rounded-md transition-colors text-gray-500">
                  <Menu className="w-5 h-5" />
                </button>
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border uppercase tracking-wider ${
                  backendStatus === 'online'   ? 'bg-green-50 text-green-700 border-green-200' :
                  backendStatus === 'offline'  ? 'bg-red-50 text-red-700 border-red-200' :
                                                 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    backendStatus === 'online'  ? 'bg-green-500' :
                    backendStatus === 'offline' ? 'bg-red-500' : 'bg-amber-400 animate-pulse'
                  }`} />
                  <span className="hidden sm:inline">
                    {backendStatus === 'checking' ? 'Connecting' : backendStatus}
                  </span>
                </div>
                {taskId && (
                  <div className={`flex items-center gap-1.5 px-2 py-1 sm:px-2.5 rounded-md text-[10px] sm:text-xs font-bold uppercase tracking-wider border ${getStatusColor(status)}`}>
                    {status === 'RUNNING' && <Loader2 className="w-3 h-3 animate-spin" />}
                    {status === 'COMPLETE' && <CheckCircle2 className="w-3 h-3" />}
                    {status === 'FAIL' && <XCircle className="w-3 h-3" />}
                    {status === 'CONFIRM' && <AlertTriangle className="w-3 h-3" />}
                    <span className="hidden sm:inline">{status}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <button 
                  onClick={() => setCmdPaletteOpen(true)}
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
                >
                  <Command className="w-3.5 h-3.5" />
                  <span>Cmd K</span>
                </button>
                <button onClick={() => setRightPanelOpen(!rightPanelOpen)} className={`p-1.5 rounded-md transition-colors ${rightPanelOpen ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100 text-gray-500'}`}>
                  <Layout className="w-5 h-5" />
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 sm:p-8">
              <AnimatePresence mode="wait">
                {!taskId ? (
                  <motion.div 
                    key="welcome"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto text-center"
                  >
                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                      <Brain className="w-8 h-8 text-blue-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">What can I help you build?</h2>
                    <p className="text-gray-500 mb-8">Awais Codex is ready. Enter a task below to start the autonomous agent loop.</p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                      {[
                        { emoji: '⚡', text: 'Build a React weather dashboard', hint: 'Tailwind + live API integration' },
                        { emoji: '🐍', text: 'Write a Python HackerNews scraper', hint: 'Rate limiting + data export' },
                        { emoji: '🚀', text: 'Create a Next.js app with Supabase', hint: 'Auth + DB + deployment ready' },
                        { emoji: '📊', text: 'Analyze this dataset and make a report', hint: 'Charts, insights, summary doc' },
                      ].map((example, i) => (
                        <motion.button 
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.1 + 0.2 }}
                          onClick={() => { if(backendStatus !== 'offline'){ setGoal(example.text); handleExecute(example.text); } }}
                          className="p-4 text-left rounded-2xl border border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm transition-all"
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-xl">{example.emoji}</span>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">
                                {example.text}
                              </p>
                              <p className="text-[11px] text-gray-400 mt-0.5">
                                {example.hint}
                              </p>
                            </div>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="task-view"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.3 }}
                    className="max-w-3xl mx-auto space-y-6 pb-20"
                  >
                    {/* Goal Header */}
                    <div className="flex items-start gap-3 p-4 bg-gray-900 rounded-2xl">
                      <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                        <UserIcon className="w-3.5 h-3.5 text-white" />
                      </div>
                      <p className="text-sm text-white font-medium pt-0.5 leading-relaxed">
                        {tasks.find(t => t.task_id === taskId)?.goal || goal}
                      </p>
                    </div>

                    {/* Plan Display */}
                    {plan.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm"
                      >
                        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                          <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                            <ListChecks className="w-4 h-4 text-blue-500" /> Execution Plan
                          </h3>
                        </div>
                        <div className="p-4 space-y-3">
                          {plan.map((step: any, i: number) => (
                            <motion.div 
                              key={i} 
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.05 }}
                              className="flex items-start gap-3"
                            >
                              <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 border ${
                                step.status === 'COMPLETED' ? 'bg-green-50 border-green-200 text-green-600' :
                                step.status === 'IN_PROGRESS' ? 'bg-blue-50 border-blue-200 text-blue-600' :
                                'bg-gray-50 border-gray-200 text-gray-400'
                              }`}>
                                {step.status === 'COMPLETED' ? <Check className="w-3 h-3" /> : 
                                 step.status === 'IN_PROGRESS' ? <Loader2 className="w-3 h-3 animate-spin" /> : 
                                 <span className="text-[10px] font-bold">{i + 1}</span>}
                              </div>
                              <div>
                                <p className={`text-sm ${step.status === 'COMPLETED' ? 'text-gray-500 line-through' : 'text-gray-800 font-medium'}`}>
                                  {step.description}
                                </p>
                                <p className="text-xs text-gray-400 mt-0.5">Agent: {step.agent}</p>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {/* Main Chat Logs */}
                    <div className="space-y-6">
                      {logs.filter(l => ['log', 'thought', 'observation', 'tool', 'error', 'replan', 'infrastructure'].includes(l.type) || !l.type).map((log, i) => {
                        const style = getLogStyle(log.type);
                        return (
                        <motion.div 
                          key={i} 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex gap-4 ${log.type === 'error' ? 'bg-red-50 p-4 rounded-xl border border-red-100' : ''}`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            log.type === 'error' ? 'bg-red-100 text-red-600' : 
                            log.agent === 'user' ? 'bg-gray-900 text-white' : 'bg-blue-100 text-blue-600'
                          }`}>
                            {log.type === 'error' ? <AlertCircle className="w-4 h-4" /> : 
                             log.agent === 'user' ? <UserIcon className="w-4 h-4" /> : <Brain className="w-4 h-4" />}
                          </div>
                          <div className="flex-1 pt-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-bold text-gray-900 capitalize">{log.agent || 'System'}</span>
                              <span className="text-[10px] text-gray-400">{new Date(log.timestamp * 1000).toLocaleTimeString()}</span>
                              {log.type && (
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${style.badge}`}>
                                  {style.label}
                                </span>
                              )}
                            </div>
                            <div className={`text-sm leading-relaxed ${style.fg}`}>
                              {log.text}
                            </div>
                          </div>
                        </motion.div>
                      )})}
                      <div ref={logsEndRef} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Input Area */}
            <div className="bg-white border-t border-gray-200 p-4 shrink-0">
              <div className="max-w-3xl mx-auto flex items-center gap-2.5">
                <input
                  id="main-input"
                  type="text"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleExecute()}
                  placeholder="Ask Awais Codex to build something…"
                  disabled={status === 'RUNNING' || status === 'CONFIRM' || backendStatus === 'offline'}
                  className="flex-1 py-3 px-4 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition-all disabled:opacity-50 placeholder:text-gray-400"
                />
                <button
                  onClick={() => handleExecute()}
                  disabled={!goal.trim() || status === 'RUNNING' || status === 'CONFIRM' || backendStatus === 'offline'}
                  className="p-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
              </div>
            </div>
          </main>

          {/* Mobile Overlay for Right Panel */}
          {rightPanelOpen && (
            <div 
              className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-30 lg:hidden transition-opacity"
              onClick={() => setRightPanelOpen(false)}
            />
          )}

          {/* Panel 3: Execution Timeline & Workspace (Right Sidebar) */}
          <aside className={`fixed lg:relative inset-y-0 right-0 z-40 transform ${rightPanelOpen ? 'translate-x-0' : 'translate-x-full'} lg:translate-x-0 w-[85vw] sm:w-80 lg:w-96 flex-shrink-0 bg-gray-50 border-l border-gray-200 flex flex-col transition-transform duration-300 ease-in-out ${!rightPanelOpen && 'lg:hidden'}`}>
            <div className="h-14 flex items-center justify-between px-4 border-b border-gray-200 bg-white">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <TerminalIcon className="w-4 h-4 text-gray-500" /> Execution Details
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded border border-gray-200 truncate max-w-[100px]">
                  {agent}
                </span>
                <button onClick={() => setRightPanelOpen(false)} className="p-1 hover:bg-gray-100 rounded text-gray-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Screenshot Area */}
              {screenshot && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5" /> Live Workspace
                  </h4>
                  <div className="rounded-lg overflow-hidden border border-gray-200 shadow-sm bg-white">
                    <img src={screenshot} alt="Workspace" className="w-full h-auto" />
                  </div>
                </div>
              )}

              {/* Real-time Terminal Logs */}
              <div className="space-y-2 flex flex-col h-full lg:h-auto">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" /> System Logs
                </h4>
                <div className="bg-[#0D1117] rounded-lg p-3 font-mono text-[10px] sm:text-xs text-gray-300 flex-1 lg:h-64 overflow-y-auto shadow-inner border border-gray-800">
                  {logs.length === 0 ? (
                    <span className="text-gray-600">Waiting for task execution...</span>
                  ) : (
                    logs.map((log, i) => (
                      <div key={i} className={`mb-1.5 ${log.type === 'error' ? 'text-red-400' : log.type === 'tool' ? 'text-blue-300' : 'text-gray-300'}`}>
                        <span className="text-gray-600 mr-2">[{new Date(log.timestamp * 1000).toISOString().split('T')[1].split('.')[0]}]</span>
                        {log.text}
                      </div>
                    ))
                  )}
                  <div ref={logsEndRef} />
                </div>
              </div>
            </div>
          </aside>
          
          {/* Confirmation Modal */}
          {pendingAction && (
            <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
              <div className="bg-white max-w-md w-full p-6 rounded-2xl shadow-2xl border border-gray-100 animate-fade-in-up">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Action Required</h3>
                    <p className="text-sm text-gray-500">The agent needs your permission to proceed.</p>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 mb-6 font-mono text-xs text-gray-700 overflow-x-auto">
                  <span className="font-bold text-gray-900">Tool:</span> {pendingAction.name}<br/>
                  <span className="font-bold text-gray-900">Args:</span> {JSON.stringify(pendingAction.params || pendingAction.args, null, 2)}
                </div>
                
                <div className="flex gap-3">
                  <button onClick={() => handleConfirm(false)} className="flex-1 py-2.5 px-4 bg-white border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors">Reject</button>
                  <button onClick={() => handleConfirm(true)} className="flex-1 py-2.5 px-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-sm">Approve Action</button>
                </div>
              </div>
            </div>
          )}

          {/* Error Toast */}
          {error && (
            <div className="fixed bottom-6 right-6 z-[1000] animate-fade-in-up">
              <div className="bg-white border border-red-200 p-4 rounded-xl flex items-start gap-3 shadow-xl">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 pr-4">
                  <h4 className="text-sm font-bold text-gray-900">Error</h4>
                  <p className="text-xs text-gray-600 mt-0.5">{error}</p>
                </div>
                <button onClick={() => setError(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      } />
      <Route path="/settings/*" element={
        <SettingsLayout onClose={() => navigate('/')}>
          <Routes>
            <Route path="account" element={<AccountSettings user={user} />} />
            <Route path="integrations" element={<IntegrationsSettings diagnostics={diagnostics} copyToClipboard={copyToClipboard} copied={copied} />} />
            <Route path="notifications" element={<NotificationsSettings user={user} />} />
            <Route path="security" element={<SecuritySettings user={user} />} />
            <Route path="preferences" element={<PreferencesSettings user={user} clearHistory={clearHistory} />} />
            <Route path="diagnostics" element={<DiagnosticsSettings diagnostics={diagnostics} checkDiagnostics={checkDiagnostics} />} />
          </Routes>
        </SettingsLayout>
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
