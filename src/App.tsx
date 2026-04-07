import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, CheckCircle2, Circle, Terminal, Brain, Eye, Activity, 
  AlertCircle, Box, GitBranch, Database, ChevronDown, Monitor, 
  Layout, MessageSquare, List, ExternalLink, Copy, Menu, X,
  Check, AlertTriangle, Send, History, Cpu, Globe, Search,
  Settings, Clock, ChevronLeft, ChevronRight, ListChecks,
  Terminal as TerminalIcon, ArrowUp, Zap, Server, XCircle,
  LogIn, User as UserIcon
} from 'lucide-react';
import { 
  auth, db, rtdb, googleProvider, signInWithPopup, onAuthStateChanged,
  doc, onSnapshot, ref, onValue, User
} from './firebase';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import SettingsLayout from './components/SettingsLayout';
import AccountSettings from './components/settings/AccountSettings';
import SubscriptionSettings from './components/settings/SubscriptionSettings';
import IntegrationsSettings from './components/settings/IntegrationsSettings';
import NotificationsSettings from './components/settings/NotificationsSettings';
import SecuritySettings from './components/settings/SecuritySettings';
import TeamSettings from './components/settings/TeamSettings';
import PreferencesSettings from './components/settings/PreferencesSettings';
import DiagnosticsSettings from './components/settings/DiagnosticsSettings';

const API_URL = import.meta.env.VITE_API_URL || '';
const SYNOD_API_KEY = import.meta.env.VITE_SYNOD_API_KEY || '';

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [goal, setGoal] = useState('');
  const [taskId, setTaskId] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [status, setStatus] = useState('IDLE');
  const [agent, setAgent] = useState('MasterAgent');
  const [logs, setLogs] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [pendingAction, setPendingAction] = useState(null);
  const [diagnostics, setDiagnostics] = useState(null);
  const [isCheckingDiagnostics, setIsCheckingDiagnostics] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState(null);
  const logsEndRef = useRef(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
    });
    return () => unsub();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setError(err.message);
    }
  };

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

  useEffect(() => {
    const fetchTasks = async () => {
      if (!user) {
        setTasks([]);
        return;
      }
      try {
        const res = await fetch(`${API_URL}/api/tasks?uid=${user.uid}`, {
          headers: { 'X-API-Key': SYNOD_API_KEY }
        });
        const data = await res.json();
        setTasks(data.tasks || []);
      } catch (err) {
        console.error('Failed to fetch tasks', err);
      }
    };
    if (isAuthReady) fetchTasks();
  }, [user, isAuthReady]);

  useEffect(() => {
    checkDiagnostics();
  }, []);

  useEffect(() => {
    if (logsEndRef.current) logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
    if (!taskId) return;

    const unsubTask = onSnapshot(doc(db, 'tasks', taskId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setStatus(data.status === 'COMPLETE' || data.status === 'FAIL' ? data.status : 'RUNNING');
        if (data.current_agent) setAgent(data.current_agent);
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
      }
    });

    return () => {
      unsubTask();
      unsubLogs();
    };
  }, [taskId]);

  const handleExecute = async () => {
    if (!goal.trim()) return;
    if (!user) {
      setError('Please sign in to execute tasks.');
      return;
    }
    setStatus('RUNNING');
    setLogs([{ type: 'info', text: `Initializing task: ${goal}`, timestamp: Date.now() }]);

    try {
      const res = await fetch(`${API_URL}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': SYNOD_API_KEY },
        body: JSON.stringify({ goal, uid: user.uid })
      });
      
      if (!res.ok) throw new Error('Failed to create task');
      
      const data = await res.json();
      setTaskId(data.task_id);
      navigate('/');
    } catch (err) {
      console.error('Execution error:', err);
      setStatus('FAIL');
      setLogs(prev => [...prev, { type: 'error', text: `Execution failed: ${err.message}`, timestamp: Date.now() }]);
    }
  };

  return (
    <Routes>
      <Route path="/" element={
        <div className="flex h-screen bg-gray-50 text-gray-900 font-sans">
          {/* Sidebar - History */}
          <aside className={`${sidebarOpen ? 'w-64' : 'w-0'} bg-white/70 backdrop-blur-md border-r border-gray-200/50 flex flex-col transition-all duration-300 overflow-hidden`}>
            <div className="p-6 border-b border-gray-100/50 whitespace-nowrap">
              <h1 className="text-xl font-bold tracking-tight text-gray-900">Awais Codex</h1>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {tasks.map((h) => (
                <div 
                  key={h.task_id}
                  onClick={() => { setTaskId(h.task_id); }}
                  className={`p-3 rounded-md cursor-pointer transition-all ${
                    taskId === h.task_id ? 'bg-gray-900 text-white' : 'hover:bg-gray-100/50 text-gray-700'
                  }`}
                >
                  <p className="text-sm font-medium truncate">{h.goal}</p>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-gray-100/50">
              {user ? (
                <button onClick={() => navigate('/settings/account')} className="w-full flex items-center gap-3 p-3 rounded-md hover:bg-gray-100/50 text-gray-700 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-bold overflow-hidden">
                    {user.photoURL ? <img src={user.photoURL} alt="" className="w-full h-full object-cover" /> : user.email?.[0].toUpperCase()}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-bold truncate">{user.displayName || 'User'}</p>
                    <p className="text-[10px] text-gray-400 font-medium truncate">{user.email}</p>
                  </div>
                  <Settings className="w-4 h-4 text-gray-400" />
                </button>
              ) : (
                <button onClick={handleLogin} className="w-full flex items-center gap-3 p-3 rounded-md bg-gray-900 text-white hover:bg-black transition-colors">
                  <LogIn className="w-5 h-5" />
                  <span className="text-sm font-medium">Sign In</span>
                </button>
              )}
            </div>
          </aside>

          {/* Main Stage */}
          <main className="flex-1 flex flex-col">
            {/* Header */}
            <header className="h-16 border-b border-gray-200/50 flex items-center justify-between px-6 bg-white/70 backdrop-blur-md sticky top-0 z-20">
              <div className="flex items-center gap-4">
                <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-gray-100 rounded-md transition-colors">
                  <Menu className="w-5 h-5 text-gray-600" />
                </button>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-100">
                    <div className={`w-2 h-2 rounded-full ${status === 'RUNNING' ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`} />
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">{status || 'Ready'}</span>
                </div>
                <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">{agent}</span>
              </div>
            </header>
            {/* Chat Area */}
            <div 
              className="flex-1 overflow-y-auto p-8 space-y-8 bg-white relative"
              onClick={() => { if (sidebarOpen) setSidebarOpen(false); }}
            >
              {logs.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <Brain className="w-20 h-20 mb-6 opacity-10" />
                  <p className="text-xl font-medium text-gray-400">Awais Codex is ready.</p>
                  <p className="text-sm text-gray-400">What would you like to build?</p>
                </div>
              )}
              {logs.map((log, i) => (
                <div key={i} className={`flex gap-5 max-w-3xl mx-auto ${log.type === 'error' ? 'bg-red-50/50 p-5 rounded-2xl border border-red-100' : ''}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-sm ${log.type === 'error' ? 'bg-red-500 text-white' : 'bg-gray-900 text-white'}`}>
                    {log.type === 'error' ? '!' : 'A'}
                  </div>
                  <div className="flex-1 pt-1">
                    <p className={`text-base leading-relaxed ${log.type === 'error' ? 'text-red-800' : 'text-gray-800'}`}>{log.text}</p>
                  </div>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
            {/* Input Area */}
            <div className="p-6 bg-white border-t border-gray-100">
              <div className="relative max-w-3xl mx-auto">
                <input
                  type="text"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="Describe your next task..."
                  className="w-full pl-6 pr-16 py-4 rounded-2xl border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                  onKeyDown={(e) => e.key === 'Enter' && handleExecute()}
                />
                <button 
                  onClick={handleExecute}
                  className="absolute right-2 top-2 p-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-all shadow-md"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </main>
          
          {/* Confirmation Modal */}
          {pendingAction && (
            <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <div className="glass-panel max-w-md w-full p-8 rounded-[32px] shadow-2xl animate-fade-in-up">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Confirm Action</h3>
                <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                  Execute: <code className="p-2 bg-gray-100 rounded text-xs">{pendingAction.name}</code>
                </p>
                <div className="flex gap-3">
                  <button onClick={() => handleConfirm(false)} className="flex-1 py-3 px-4 bg-gray-100 text-gray-900 rounded-2xl font-semibold hover:bg-gray-200">Reject</button>
                  <button onClick={() => handleConfirm(true)} className="flex-1 py-3 px-4 bg-gray-900 text-white rounded-2xl font-semibold hover:bg-black">Approve</button>
                </div>
              </div>
            </div>
          )}

          {/* Error Toast */}
          {error && (
            <div className="fixed top-6 right-6 z-[1000]">
              <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-start gap-4 shadow-2xl">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-red-900 mb-1">Execution Error</h4>
                  <p className="text-xs text-red-700">{error}</p>
                </div>
                <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
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
            <Route path="subscription" element={<SubscriptionSettings user={user} />} />
            <Route path="integrations" element={<IntegrationsSettings user={user} diagnostics={diagnostics} copyToClipboard={copyToClipboard} copied={copied} />} />
            <Route path="notifications" element={<NotificationsSettings user={user} />} />
            <Route path="security" element={<SecuritySettings user={user} />} />
            <Route path="team" element={<TeamSettings user={user} />} />
            <Route path="preferences" element={<PreferencesSettings user={user} clearHistory={clearHistory} />} />
            <Route path="diagnostics" element={<DiagnosticsSettings user={user} diagnostics={diagnostics} checkDiagnostics={checkDiagnostics} />} />
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
