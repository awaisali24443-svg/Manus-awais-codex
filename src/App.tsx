import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, CheckCircle2, Circle, Terminal, Brain, Eye, Activity, 
  AlertCircle, Box, GitBranch, Database, ChevronDown, Monitor, 
  Layout, MessageSquare, List, ExternalLink, Copy, Menu, X,
  Check, AlertTriangle, Send, History, Cpu, Globe, Search,
  Settings, Clock, ChevronLeft, ChevronRight, ListChecks,
  Terminal as TerminalIcon, ArrowUp, Zap, Server, XCircle,
  LogIn, User as UserIcon, Loader2, Image as ImageIcon
} from 'lucide-react';
import { 
  db, rtdb, doc, onSnapshot, ref, onValue 
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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [pendingAction, setPendingAction] = useState(null);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState(null);
  const [isCheckingDiagnostics, setIsCheckingDiagnostics] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState(null);
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
      }
    };
    fetchTasks();
  }, [user.uid]);

  // Initial diagnostics check
  useEffect(() => {
    checkDiagnostics();
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    if (logsEndRef.current) logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Real-time task state and logs
  useEffect(() => {
    if (!taskId) return;

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
        const logsArray = Object.values(data).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        setLogs(logsArray.map(l => ({ 
          type: l.type || 'info', 
          text: l.content || l.message || '',
          timestamp: l.timestamp,
          agent: l.agent || 'system'
        })));
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

  const handleExecute = async () => {
    if (!goal.trim()) return;
    setStatus('RUNNING');
    setLogs([{ type: 'info', text: `Initializing task: ${goal}`, timestamp: Date.now(), agent: 'system' }]);
    setPlan([]);
    setScreenshot(null);

    try {
      const res = await fetch(`${API_URL}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': SYNOD_API_KEY },
        body: JSON.stringify({ goal, uid: user.uid })
      });
      
      if (!res.ok) throw new Error('Failed to create task');
      
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
      setLogs(prev => [...prev, { type: 'error', text: `Execution failed: ${err.message}`, timestamp: Date.now(), agent: 'system' }]);
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
        <div className="flex h-screen bg-[#FAFAFA] text-gray-900 font-sans overflow-hidden">
          
          {/* Panel 1: Sidebar (History & Navigation) */}
          <aside className={`${sidebarOpen ? 'w-64' : 'w-0'} flex-shrink-0 bg-white border-r border-gray-200 flex flex-col transition-all duration-300 overflow-hidden z-20`}>
            <div className="h-14 flex items-center px-4 border-b border-gray-100">
              <div className="flex items-center gap-2 text-gray-900">
                <Brain className="w-5 h-5 text-blue-600" />
                <span className="font-bold tracking-tight">Awais Codex</span>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2 mt-2">Recent Tasks</div>
              {tasks.map((h) => (
                <div 
                  key={h.task_id}
                  onClick={() => { setTaskId(h.task_id); }}
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
            
            <div className="p-3 border-t border-gray-100">
              <button onClick={() => navigate('/settings/integrations')} className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                  {user.displayName?.[0] || 'A'}
                </div>
                <div className="flex-1 text-left overflow-hidden">
                  <p className="text-sm font-bold truncate">{user.displayName}</p>
                  <p className="text-[10px] text-gray-400 font-medium truncate">Personal Edition</p>
                </div>
                <Settings className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </aside>

          {/* Panel 2: Main Chat / Interaction Area */}
          <main className="flex-1 flex flex-col min-w-0 bg-white relative z-10 shadow-[-10px_0_30px_rgba(0,0,0,0.02)]">
            <header className="h-14 border-b border-gray-100 flex items-center justify-between px-4 bg-white/80 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 hover:bg-gray-100 rounded-md transition-colors text-gray-500">
                  <Menu className="w-4.5 h-4.5" />
                </button>
                {taskId && (
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider border ${getStatusColor(status)}`}>
                    {status === 'RUNNING' && <Loader2 className="w-3 h-3 animate-spin" />}
                    {status === 'COMPLETE' && <CheckCircle2 className="w-3 h-3" />}
                    {status === 'FAIL' && <XCircle className="w-3 h-3" />}
                    {status === 'CONFIRM' && <AlertTriangle className="w-3 h-3" />}
                    {status}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setRightPanelOpen(!rightPanelOpen)} className={`p-1.5 rounded-md transition-colors ${rightPanelOpen ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100 text-gray-500'}`}>
                  <Layout className="w-4.5 h-4.5" />
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 sm:p-8">
              {!taskId ? (
                <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto text-center">
                  <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                    <Brain className="w-8 h-8 text-blue-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">What can I help you build?</h2>
                  <p className="text-gray-500 mb-8">Awais Codex is ready. Enter a task below to start the autonomous agent loop.</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                    {[
                      "Build a React weather dashboard using Tailwind",
                      "Write a Python script to scrape HackerNews",
                      "Create a full-stack Next.js app with Supabase",
                      "Analyze this dataset and generate a report"
                    ].map((prompt, i) => (
                      <button 
                        key={i}
                        onClick={() => setGoal(prompt)}
                        className="p-4 text-left border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/50 transition-all text-sm text-gray-600 font-medium"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="max-w-3xl mx-auto space-y-6 pb-20">
                  {/* Goal Header */}
                  <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Current Goal</h3>
                    <p className="text-lg font-medium text-gray-900">{tasks.find(t => t.task_id === taskId)?.goal || goal}</p>
                  </div>

                  {/* Plan Display */}
                  {plan.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                          <ListChecks className="w-4 h-4 text-blue-500" /> Execution Plan
                        </h3>
                      </div>
                      <div className="p-4 space-y-3">
                        {plan.map((step: any, i: number) => (
                          <div key={i} className="flex items-start gap-3">
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
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Main Chat Logs */}
                  <div className="space-y-6">
                    {logs.filter(l => l.type === 'message' || l.type === 'error' || l.type === 'result').map((log, i) => (
                      <div key={i} className={`flex gap-4 ${log.type === 'error' ? 'bg-red-50 p-4 rounded-xl border border-red-100' : ''}`}>
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
                          </div>
                          <div className={`text-sm leading-relaxed ${log.type === 'error' ? 'text-red-800' : 'text-gray-700'}`}>
                            {log.text}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={logsEndRef} />
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-100">
              <div className="relative max-w-3xl mx-auto flex items-center gap-2">
                <input
                  type="text"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="Ask Awais Codex to do something..."
                  className="flex-1 pl-4 pr-12 py-3.5 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && handleExecute()}
                  disabled={status === 'RUNNING' || status === 'CONFIRM'}
                />
                <button 
                  onClick={handleExecute}
                  disabled={!goal.trim() || status === 'RUNNING' || status === 'CONFIRM'}
                  className="absolute right-3 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-all"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
              </div>
            </div>
          </main>

          {/* Panel 3: Execution Timeline & Workspace (Right Sidebar) */}
          <aside className={`${rightPanelOpen ? 'w-80 sm:w-96' : 'w-0'} flex-shrink-0 bg-gray-50 border-l border-gray-200 flex flex-col transition-all duration-300 overflow-hidden z-20`}>
            <div className="h-14 flex items-center justify-between px-4 border-b border-gray-200 bg-white">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <TerminalIcon className="w-4 h-4 text-gray-500" /> Execution Details
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded border border-gray-200">
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
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" /> System Logs
                </h4>
                <div className="bg-[#0D1117] rounded-lg p-3 font-mono text-[10px] sm:text-xs text-gray-300 h-64 overflow-y-auto shadow-inner border border-gray-800">
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
                  <span className="font-bold text-gray-900">Args:</span> {JSON.stringify(pendingAction.args, null, 2)}
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
            <Route path="subscription" element={<SubscriptionSettings user={user} />} />
            <Route path="integrations" element={<IntegrationsSettings diagnostics={diagnostics} copyToClipboard={copyToClipboard} copied={copied} />} />
            <Route path="notifications" element={<NotificationsSettings user={user} />} />
            <Route path="security" element={<SecuritySettings user={user} />} />
            <Route path="team" element={<TeamSettings user={user} />} />
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
