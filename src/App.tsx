import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, CheckCircle2, Circle, Terminal, Brain, Eye, Activity, 
  AlertCircle, Box, GitBranch, Database, ChevronDown, Monitor, 
  Layout, MessageSquare, List, ExternalLink, Copy, Menu, X,
  Check, AlertTriangle, Send, History, Cpu, Globe, Search,
  Settings, Clock, ChevronLeft, ChevronRight, ListChecks,
  Terminal as TerminalIcon, ArrowUp, Zap, Server, XCircle
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import { getDatabase, ref, onValue } from 'firebase/database';

const API_URL = import.meta.env.VITE_API_URL || '';
const SYNOD_API_KEY = import.meta.env.VITE_SYNOD_API_KEY || '';

// Initialize Firebase
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const rtdb = getDatabase(app);

export default function App() {
  const [goal, setGoal] = useState('');
  const [taskId, setTaskId] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [status, setStatus] = useState('IDLE');
  const [state, setState] = useState('IDLE');
  const [agent, setAgent] = useState('MasterAgent');
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  const [plan, setPlan] = useState([]);
  const [monologue, setMonologue] = useState({ observations: [], thoughts: [], actions: [] });
  const [error, setError] = useState(null);
  const [screenshot, setScreenshot] = useState(null);
  const [devBoxStatus, setDevBoxStatus] = useState('Offline');
  const [replanCount, setReplanCount] = useState(0);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [activeTab, setActiveTab] = useState('computer');
  const [logFilter, setLogFilter] = useState('All');
  const [pendingAction, setPendingAction] = useState(null);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [diagnostics, setDiagnostics] = useState(null);
  const [isCheckingDiagnostics, setIsCheckingDiagnostics] = useState(false);

  const logsEndRef = useRef(null);
  const terminalEndRef = useRef(null);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await fetch(`${API_URL}/api/tasks`, {
          headers: { 'X-API-Key': SYNOD_API_KEY }
        });
        const data = await res.json();
        setTasks(data.tasks || []);
      } catch (err) {
        console.error('Failed to fetch tasks', err);
      }
    };
    fetchTasks();
  }, []);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (logsEndRef.current) logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    if (terminalEndRef.current) terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
    if (!taskId) return;

    const unsubTask = onSnapshot(doc(db, 'tasks', taskId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setStatus(data.status === 'COMPLETE' || data.status === 'FAIL' ? data.status : 'RUNNING');
        setState(data.status || 'IDLE');
        setPlan(data.plan || []);
        setProgress(data.status === 'COMPLETE' ? 100 : (data.status === 'FAIL' ? 0 : 50));
        if (data.monologue) setMonologue(data.monologue);
        if (data.current_agent) setAgent(data.current_agent);
        if (data.pending_action && Object.keys(data.pending_action).length > 0) {
          setPendingAction(data.pending_action);
        } else {
          setPendingAction(null);
        }
      }
    });

    const logsRef = ref(rtdb, `tasks/${taskId}/events`);
    const unsubLogs = onValue(logsRef, (snapshot) => {
      const data = snapshot.val() as Record<string, any>;
      if (data) {
        const logsArray = Object.values(data).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        setLogs(logsArray.map(l => ({ 
          type: l.type || 'info', 
          text: l.content || l.message || '',
          timestamp: l.timestamp 
        })));
        
        let replans = 0;
        let dbStatus = 'Offline';
        logsArray.forEach(l => {
          if (l.type === 'infrastructure') {
            if (l.content && l.content.includes('Online')) dbStatus = 'Online';
            if (l.content && l.content.includes('Offline')) dbStatus = 'Offline';
          }
          if (l.type === 'replan') replans++;
          if (l.text && l.text.includes('live at:')) {
            const match = l.text.match(/https:\/\/[^\s]+/);
            if (match) setPreviewUrl(match[0]);
          }
        });
        setDevBoxStatus(dbStatus);
        setReplanCount(replans);
      }
    });

    return () => {
      unsubTask();
      unsubLogs();
    };
  }, [taskId]);

  useEffect(() => {
    if (!taskId || status !== 'RUNNING') return;
    const screenshotInterval = setInterval(async () => {
        try {
            const res = await fetch(`${API_URL}/api/tasks/${taskId}/screenshot`, { headers: { 'X-API-Key': SYNOD_API_KEY } });
            const data = await res.json();
            if (data.screenshot) setScreenshot(data.screenshot);
        } catch {}
    }, 2000);
    return () => clearInterval(screenshotInterval);
  }, [taskId, status]);

  const handleExecute = async () => {
    if (!goal.trim()) return;
    setError(null);
    setStatus('RUNNING');
    setState('ANALYZE');
    setProgress(5);
    setLogs([{ type: 'info', text: `Initializing task: ${goal}`, timestamp: Date.now() }]);
    setPlan([]);
    setMonologue({ observations: [], thoughts: [], actions: [] });
    setReplanCount(0);
    setPreviewUrl(null);
    setDevBoxStatus('Offline');

    try {
      const res = await fetch(`${API_URL}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': SYNOD_API_KEY },
        body: JSON.stringify({ goal })
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        let errorMessage = 'Failed to create task';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.detail || errorMessage;
        } catch (e) {
          errorMessage = `${res.status} ${res.statusText}: ${errorText || 'No detail provided'}`;
        }
        throw new Error(errorMessage);
      }
      
      const data = await res.json();
      setTaskId(data.task_id);
    } catch (err) {
      console.error('Execution error:', err);
      setError(err.message);
      setStatus('FAIL');
      setState('FAIL');
      setLogs(prev => [...prev, { type: 'error', text: `Execution failed: ${err.message}`, timestamp: Date.now() }]);
    }
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

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);

  const clearHistory = () => {
    setTasks([]);
    setTaskId(null);
  };

  const getLogColor = (type) => {
    switch(type) {
      case 'error': return 'text-red-400';
      case 'observation': return 'text-blue-400';
      case 'thought': return 'text-purple-400';
      case 'tool': return 'text-green-400';
      case 'infrastructure': return 'text-orange-400';
      case 'replan': return 'text-yellow-400';
      default: return 'text-gray-300';
    }
  };

  const getStepStatusColor = (s) => {
    switch(s) {
      case 'COMPLETED': return 'completed';
      case 'IN_PROGRESS': return 'active';
      default: return '';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="manus-layout">
      {/* Mobile Overlay */}
      <div 
        className={`mobile-overlay ${(isSidebarOpen || isTimelineOpen) ? 'active' : ''}`}
        onClick={() => {
          setIsSidebarOpen(false);
          setIsTimelineOpen(false);
        }}
      />

      {/* Sidebar - History */}
      <aside className={`manus-sidebar ${isSidebarOpen ? 'active' : ''}`}>
        <div className="glass-panel rounded-3xl p-6 flex flex-col h-full">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold text-sm tracking-tight">History</h2>
            <button 
              onClick={() => {
                setIsDiagnosticsOpen(true);
                checkDiagnostics();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-manus-text-secondary hover:bg-white/50 hover:text-manus-accent transition-all group"
            >
              <Activity className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span className="font-medium">System Status</span>
            </button>
            <button 
              onClick={clearHistory}
              className="text-[11px] font-medium text-manus-text-secondary hover:text-manus-accent transition-colors"
            >
              Clear
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
            {tasks.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Clock className="w-5 h-5 text-gray-300" />
                </div>
                <p className="text-xs text-gray-400">No recent tasks</p>
              </div>
            ) : (
              tasks.map((h) => (
                <div 
                  key={h.task_id}
                  onClick={() => setTaskId(h.task_id)}
                  className={`group p-3 rounded-2xl cursor-pointer transition-all duration-200 ${
                    taskId === h.task_id 
                      ? 'bg-white shadow-sm border border-gray-100' 
                      : 'hover:bg-white/50 border border-transparent'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      h.status === 'COMPLETE' ? 'bg-green-500' : 
                      h.status === 'FAIL' ? 'bg-red-500' : 'bg-blue-500 pulse-dot'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium truncate leading-tight mb-1">
                        {h.goal}
                      </p>
                      <p className="text-[10px] text-manus-text-secondary font-mono uppercase tracking-wider">
                        {h.task_id.slice(0, 8)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </aside>

      {/* Main Stage */}
      <main className="manus-stage">
        {/* Top Status Bar */}
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-white rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5 text-manus-text-secondary" />
            </button>
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-xs">A</span>
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight">Awais Codex</h1>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full pulse-dot" />
                <span className="text-[10px] font-medium text-manus-text-secondary uppercase tracking-widest">
                  {status || 'Ready'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex -space-x-2">
              <div className="w-6 h-6 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[8px] font-bold">M</div>
              <div className="w-6 h-6 rounded-full border-2 border-white bg-blue-100 flex items-center justify-center text-[8px] font-bold text-blue-600">S</div>
              <div className="w-6 h-6 rounded-full border-2 border-white bg-purple-100 flex items-center justify-center text-[8px] font-bold text-purple-600">R</div>
            </div>
            <button 
              onClick={() => setIsTimelineOpen(true)}
              className="lg:hidden p-2 hover:bg-white rounded-lg transition-colors"
            >
              <ListChecks className="w-5 h-5 text-manus-text-secondary" />
            </button>
            <div className="h-4 w-[1px] bg-gray-200" />
            <button className="p-2 hover:bg-white rounded-full transition-colors">
              <Settings className="w-4 h-4 text-manus-text-secondary" />
            </button>
          </div>
        </div>

        {/* Central Computer Window */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="glass-panel rounded-[32px] flex-1 flex flex-col overflow-hidden shadow-2xl">
            {/* Tabs */}
            <div className="flex items-center gap-1 p-2 bg-white/30 border-b border-white/20">
              {['computer', 'thoughts', 'logs', ...(previewUrl ? ['preview'] : [])].map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t as any)}
                  className={`px-4 py-1.5 rounded-full text-[12px] font-medium transition-all duration-200 ${
                    activeTab === t 
                      ? 'bg-white text-manus-accent shadow-sm' 
                      : 'text-manus-text-secondary hover:text-manus-text-primary hover:bg-white/50'
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            <div className="flex-1 relative overflow-hidden bg-white/50">
              {activeTab === 'computer' && (
                <div className="absolute inset-0 flex flex-col">
                  {/* Browser Chrome */}
                  <div className="browser-header">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
                      <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
                      <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
                    </div>
                    <div className="flex gap-2 ml-4">
                      <ChevronLeft className="w-4 h-4 text-gray-400" />
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="browser-address-bar">
                      <Globe className="w-3 h-3 mr-2 text-gray-400" />
                      <span className="truncate">{previewUrl || 'https://manus.ai/workspace'}</span>
                    </div>
                    <button className="p-1.5 hover:bg-gray-100 rounded-md">
                      <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                  </div>

                  {/* Browser Content */}
                  <div className="flex-1 relative bg-white">
                    {screenshot ? (
                      <img 
                        src={screenshot} 
                        alt="Browser View" 
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                        <div className="text-center">
                          <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4 border border-gray-100">
                            <Monitor className="w-8 h-8 text-gray-200" />
                          </div>
                          <p className="text-sm text-gray-400 font-medium">Waiting for agent to start browser...</p>
                        </div>
                      </div>
                    )}

                    {/* Terminal Overlay */}
                    <div className="absolute bottom-4 left-4 right-4 h-48 glass-panel rounded-2xl overflow-hidden shadow-xl border border-white/40 flex flex-col">
                      <div className="px-4 py-2 border-b border-white/20 flex items-center justify-between bg-white/40">
                        <div className="flex items-center gap-2">
                          <TerminalIcon className="w-3.5 h-3.5 text-manus-text-secondary" />
                          <span className="text-[11px] font-bold uppercase tracking-wider text-manus-text-secondary">Terminal</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => setLogFilter('All')}
                            className={`px-3 py-1 rounded-md text-[11px] font-medium transition-colors ${
                              logFilter === 'All' ? 'bg-white/10 text-white' 
                              : 'hover:bg-white/5 text-gray-400'}`}>
                            All Logs
                          </button>
                          <button onClick={() => setLogFilter('Errors')}
                            className={`px-3 py-1 rounded-md text-[11px] font-medium transition-colors ${
                              logFilter === 'Errors' ? 'bg-white/10 text-white' 
                              : 'hover:bg-white/5 text-gray-400'}`}>
                            Errors
                          </button>
                          <button onClick={() => setLogFilter('System')}
                            className={`px-3 py-1 rounded-md text-[11px] font-medium transition-colors ${
                              logFilter === 'System' ? 'bg-white/10 text-white' 
                              : 'hover:bg-white/5 text-gray-400'}`}>
                            System
                          </button>
                        </div>
                      </div>
                      <div className="flex-1 p-4 font-mono text-[12px] overflow-y-auto bg-black/5 custom-scrollbar">
                        {logs.filter(l => ['tool','observation','infrastructure'].includes(l.type)).length === 0 ? (
                          <div className="text-gray-400 italic">No terminal output yet...</div>
                        ) : (
                          logs.filter(l => ['tool','observation','infrastructure'].includes(l.type)).map((l, i) => (
                            <div key={i} className="mb-1">
                              <span className="text-blue-500 mr-2">$</span>
                              <span className="text-gray-700">{l.text}</span>
                            </div>
                          ))
                        )}
                        <div className="flex items-center gap-1">
                          <span className="text-blue-500">$</span>
                          <span className="w-2 h-4 bg-blue-500 cursor-blink" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'thoughts' && (
                <div className="absolute inset-0 p-8 overflow-y-auto custom-scrollbar">
                  <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Column 1: Observations */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Eye className="w-4 h-4 text-blue-500" />
                        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Observations</h3>
                      </div>
                      {monologue.observations.map((obs, i) => (
                        <div key={i} className="glass-panel p-4 rounded-2xl text-[13px] leading-relaxed fade-in-up" style={{ animationDelay: `${i * 0.1}s` }}>
                          {obs}
                        </div>
                      ))}
                    </div>

                    {/* Column 2: Thoughts */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Brain className="w-4 h-4 text-purple-500" />
                        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Internal Monologue</h3>
                      </div>
                      {monologue.thoughts.map((thought, i) => (
                        <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 text-[13px] leading-relaxed fade-in-up" style={{ animationDelay: `${i * 0.15}s` }}>
                          {thought}
                        </div>
                      ))}
                    </div>

                    {/* Column 3: Actions */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Zap className="w-4 h-4 text-yellow-500" />
                        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Actions</h3>
                      </div>
                      {monologue.actions.map((action, i) => (
                        <div key={i} className="bg-gray-900 p-4 rounded-2xl text-[13px] text-white font-mono fade-in-up" style={{ animationDelay: `${i * 0.2}s` }}>
                          <div className="text-blue-400 mb-1">{typeof action === 'object' ? action.tool : 'action'}</div>
                          <div className="text-gray-400 text-[11px] line-clamp-3">{typeof action === 'object' ? action.result : String(action)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'logs' && (
                <div className="absolute inset-0 flex flex-col bg-[#0D1117]">
                  <div className="p-4 border-b border-white/10 flex items-center gap-2">
                    <button onClick={() => setLogFilter('All')}
                      className={`px-3 py-1 rounded-md text-[11px] font-medium transition-colors ${
                        logFilter === 'All' ? 'bg-white/10 text-white' 
                        : 'hover:bg-white/5 text-gray-400'}`}>
                      All Logs
                    </button>
                    <button onClick={() => setLogFilter('Errors')}
                      className={`px-3 py-1 rounded-md text-[11px] font-medium transition-colors ${
                        logFilter === 'Errors' ? 'bg-white/10 text-white' 
                        : 'hover:bg-white/5 text-gray-400'}`}>
                      Errors
                    </button>
                    <button onClick={() => setLogFilter('System')}
                      className={`px-3 py-1 rounded-md text-[11px] font-medium transition-colors ${
                        logFilter === 'System' ? 'bg-white/10 text-white' 
                        : 'hover:bg-white/5 text-gray-400'}`}>
                      System
                    </button>
                  </div>
                  <div className="flex-1 p-6 font-mono text-[12px] overflow-y-auto custom-scrollbar">
                    {logs.filter(log => {
                      if (logFilter === 'All') return true;
                      if (logFilter === 'Errors') return log.type === 'error';
                      if (logFilter === 'System') return log.type === 'infrastructure';
                      return true;
                    }).map((log, i) => (
                      <div key={i} className="mb-2 flex gap-4">
                        <span className="text-gray-600 w-20 flex-shrink-0">{new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}</span>
                        <span className={`w-24 flex-shrink-0 font-bold uppercase tracking-tighter ${getLogColor(log.type)}`}>[{log.type}]</span>
                        <span className="text-gray-300 break-all">{log.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'preview' && (
                <div className="absolute inset-0 flex items-center justify-center p-12">
                  <div className="max-w-md w-full glass-panel p-8 rounded-[32px] text-center">
                    <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Globe className="w-10 h-10 text-blue-500" />
                    </div>
                    <h2 className="text-xl font-bold mb-2">Live Preview</h2>
                    <p className="text-sm text-manus-text-secondary mb-8">Your application is running and accessible via the following URL.</p>
                    
                    <div className="bg-white rounded-2xl p-4 border border-gray-100 mb-6 flex items-center justify-between">
                      <span className="text-sm font-medium text-manus-accent truncate mr-4">
                        {previewUrl || 'Waiting for server...'}
                      </span>
                      <div className="flex gap-2">
                        <button className="p-2 hover:bg-gray-50 rounded-lg transition-colors">
                          <Copy className="w-4 h-4 text-gray-400" />
                        </button>
                        <button 
                          onClick={() => previewUrl && window.open(previewUrl, '_blank')}
                          className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
                        >
                          <ExternalLink className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => previewUrl && window.open(previewUrl, '_blank')}
                      disabled={!previewUrl}
                      className="w-full py-4 bg-manus-text-primary text-white rounded-2xl font-semibold hover:bg-black transition-all disabled:opacity-50"
                    >
                      Open in New Tab
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Floating Command Bar */}
        <div className="command-bar-container">
          <div className="command-bar">
            <Search className="w-5 h-5 text-gray-400 mr-2" />
            <input 
              type="text"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleExecute()}
              placeholder="What can I help you build today?"
              className="command-input"
            />
            <button 
              onClick={handleExecute}
              disabled={!goal || (status !== 'IDLE' && status !== 'COMPLETE' && status !== 'FAIL')}
              className="w-10 h-10 bg-[#111827] text-white rounded-full flex items-center justify-center hover:bg-black transition-all disabled:opacity-30 shadow-lg"
            >
              <ArrowUp className="w-5 h-5" />
            </button>
          </div>
        </div>
      </main>

      {/* Timeline - Execution Plan */}
      <aside className={`manus-timeline ${isTimelineOpen ? 'active' : ''}`}>
        <div className="glass-panel rounded-3xl p-6 flex flex-col h-full">
          <div className="flex items-center gap-2 mb-8">
            <ListChecks className="w-4 h-4 text-manus-accent" />
            <h2 className="font-semibold text-sm tracking-tight">Execution Plan</h2>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {plan.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-xs text-gray-400">Plan will appear once task starts</p>
              </div>
            ) : (
              plan.map((step, i) => (
                <div key={i} className="timeline-item">
                  <div className={`timeline-dot ${getStepStatusColor(step.status)}`} />
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[8px] font-bold text-gray-500">
                      {step.agent === 'software_engineer' ? 'S' : step.agent === 'research_agent' ? 'R' : 'M'}
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                      {step.agent.replace('_', ' ')}
                    </span>
                  </div>
                  <p className={`text-[13px] leading-snug ${step.status === 'COMPLETED' ? 'text-gray-400 line-through' : 'text-manus-text-primary font-medium'}`}>
                    {step.description}
                  </p>
                  {step.status === 'IN_PROGRESS' && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-manus-accent w-1/2 pulse-dot" />
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </aside>

      {/* Diagnostics Modal */}
      {isDiagnosticsOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="glass-panel max-w-lg w-full p-8 rounded-[32px] shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-manus-accent/10 rounded-2xl flex items-center justify-center">
                  <Activity className="w-6 h-6 text-manus-accent" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-manus-text-primary">System Health</h3>
                  <p className="text-xs text-manus-text-secondary">Real-time configuration check</p>
                </div>
              </div>
              <button 
                onClick={() => setIsDiagnosticsOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-manus-text-secondary" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Backend Connection */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-3">
                  <Server className="w-5 h-5 text-manus-text-secondary" />
                  <span className="font-medium text-manus-text-primary">Backend API</span>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${diagnostics?.error ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                  <div className={`w-2 h-2 rounded-full ${diagnostics?.error ? 'bg-red-500' : 'bg-green-500'} animate-pulse`} />
                  {diagnostics?.error ? 'Offline' : 'Online'}
                </div>
              </div>

              {diagnostics && !diagnostics.error && (
                <>
                  {/* API Keys */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-manus-text-secondary uppercase tracking-wider px-1">Environment Variables</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(diagnostics.environment).map(([key, exists]) => (
                        <div key={key} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl">
                          <span className="text-xs font-mono text-manus-text-secondary">{key}</span>
                          {exists ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Services */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-manus-text-secondary uppercase tracking-wider px-1">Cloud Services</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl">
                        <div className="flex items-center gap-2">
                          <Database className="w-4 h-4 text-manus-text-secondary" />
                          <span className="text-sm text-manus-text-primary">Firestore Database</span>
                        </div>
                        {diagnostics.services.firestore ? (
                          <span className="text-xs font-bold text-green-600">Connected</span>
                        ) : (
                          <span className="text-xs font-bold text-red-600">Error</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl">
                        <div className="flex items-center gap-2">
                          <Box className="w-4 h-4 text-manus-text-secondary" />
                          <span className="text-sm text-manus-text-primary">E2B Sandbox Environment</span>
                        </div>
                        {diagnostics.services.sandbox ? (
                          <span className="text-xs font-bold text-green-600">Ready</span>
                        ) : (
                          <span className="text-xs font-bold text-red-600">Missing Key</span>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {diagnostics?.error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl">
                  <p className="text-sm text-red-600 font-medium mb-1">Connection Error</p>
                  <p className="text-xs text-red-500 leading-relaxed">
                    The frontend cannot reach the backend at <code className="bg-red-100 px-1 rounded">{API_URL}</code>. 
                    Check your <code className="bg-red-100 px-1 rounded">VITE_API_URL</code> and ensure the backend is running.
                  </p>
                </div>
              )}
            </div>

            <button 
              onClick={checkDiagnostics}
              disabled={isCheckingDiagnostics}
              className="w-full mt-8 py-4 bg-manus-accent text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
            >
              {isCheckingDiagnostics ? 'Checking...' : 'Refresh Status'}
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {pendingAction && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="glass-panel max-w-md w-full p-8 rounded-[32px] shadow-2xl animate-fade-in-up">
            <div className="w-16 h-16 bg-manus-accent/10 rounded-full flex items-center justify-center mb-6">
              <AlertCircle className="w-8 h-8 text-manus-accent" />
            </div>
            <h3 className="text-xl font-bold text-manus-text-primary mb-2">Confirm Action</h3>
            <p className="text-sm text-manus-text-secondary mb-6 leading-relaxed">
              Awais Codex wants to execute a sensitive action: 
              <code className="block mt-2 p-3 bg-gray-100 rounded-xl text-manus-text-primary font-mono text-xs">
                {pendingAction.name}({JSON.stringify(pendingAction.params)})
              </code>
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => handleConfirm(false)}
                className="flex-1 py-3 px-4 bg-gray-100 text-manus-text-primary rounded-2xl font-semibold hover:bg-gray-200 transition-all"
              >
                Reject
              </button>
              <button 
                onClick={() => handleConfirm(true)}
                className="flex-1 py-3 px-4 bg-manus-accent text-white rounded-2xl font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Toast */}
      {error && (
        <div className="fixed top-6 right-6 z-[1000] toast-enter">
          <div className="glass-panel border-l-4 border-l-red-500 p-4 rounded-2xl flex items-start gap-4 max-w-md shadow-2xl">
            <div className="w-8 h-8 bg-red-50 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-red-900 mb-1">Execution Error</h4>
              <p className="text-xs text-red-700 line-clamp-3 leading-relaxed">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
