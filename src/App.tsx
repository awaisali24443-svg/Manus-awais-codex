import React, { useState, useEffect, useRef } from 'react';
import { Play, CheckCircle2, Circle, Terminal, Brain, Eye, Activity, AlertCircle } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import { getDatabase, ref, onValue } from 'firebase/database';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const SYNOD_API_KEY = import.meta.env.VITE_SYNOD_API_KEY || '';

// Initialize Firebase (using env vars)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const rtdb = getDatabase(app);

export default function App() {
  const [goal, setGoal] = useState('');
  const [taskId, setTaskId] = useState(null);
  const [status, setStatus] = useState('IDLE');
  const [state, setState] = useState('IDLE');
  const [agent, setAgent] = useState('MasterAgent');
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  const [plan, setPlan] = useState([]);
  const [monologue, setMonologue] = useState({ observations: [], thoughts: [], actions: [] });
  const [error, setError] = useState(null);

  const logsEndRef = useRef(null);
  const terminalEndRef = useRef(null);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  useEffect(() => {
    if (!taskId) return;

    // Firestore listener for Task State
    const unsubTask = onSnapshot(doc(db, 'tasks', taskId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setStatus(data.status === 'COMPLETE' || data.status === 'FAIL' ? data.status : 'RUNNING');
        setState(data.status || 'IDLE');
        setPlan(data.plan || []);
        setProgress(data.status === 'COMPLETE' ? 100 : (data.status === 'FAIL' ? 0 : 50));
        if (data.monologue) {
          setMonologue(data.monologue);
        }
      }
    });

    // RTDB listener for high-frequency logs
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
    setError(null);
    setStatus('RUNNING');
    setState('ANALYZE');
    setProgress(5);
    setLogs([{ type: 'info', text: `Initializing task: ${goal}`, timestamp: Date.now() }]);
    setPlan([]);
    setMonologue({ observations: [], thoughts: [], actions: [] });

    try {
      const res = await fetch(`${API_URL}/api/tasks`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-API-Key': SYNOD_API_KEY
        },
        body: JSON.stringify({ goal })
      });
      if (!res.ok) throw new Error('Failed to create task');
      const data = await res.json();
      setTaskId(data.task_id);
    } catch (err) {
      setError(err.message);
      setStatus('FAIL');
      setState('FAIL');
      setLogs(prev => [...prev, { type: 'error', text: `Execution failed: ${err.message}`, timestamp: Date.now() }]);
    }
  };

  const getStatusColor = (s) => {
    switch(s) {
      case 'RUNNING': return 'text-blue-400';
      case 'COMPLETE': return 'text-green-400';
      case 'FAIL': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getLogColor = (type, text) => {
    if (type === 'error' || text.toLowerCase().includes('error') || text.toLowerCase().includes('fail')) return 'text-red-400';
    if (type === 'success' || text.toLowerCase().includes('success') || text.toLowerCase().includes('complete')) return 'text-green-400';
    if (text.toLowerCase().includes('executing') || text.toLowerCase().includes('running')) return 'text-yellow-400';
    if (text.toLowerCase().includes('agent')) return 'text-blue-400';
    return 'text-gray-300';
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-200 font-sans p-4 md:p-6 flex flex-col gap-6">
      
      {/* Header */}
      <header className="flex justify-between items-center border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <Brain className="w-8 h-8 text-[#00d4ff] drop-shadow-[0_0_8px_rgba(0,212,255,0.8)]" />
          <h1 className="text-2xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-[#00d4ff] to-[#8b5cf6] drop-shadow-[0_0_4px_rgba(139,92,246,0.5)]">
            Awais Codex
          </h1>
        </div>
        <div className="flex items-center gap-2 bg-white/5 px-4 py-1.5 rounded-full border border-white/10">
          <div className={`w-2.5 h-2.5 rounded-full ${status === 'RUNNING' ? 'bg-[#00d4ff] animate-pulse' : status === 'COMPLETE' ? 'bg-green-500' : status === 'FAIL' ? 'bg-red-500' : 'bg-gray-500'}`}></div>
          <span className={`text-sm font-medium tracking-wide ${getStatusColor(status)}`}>{status}</span>
        </div>
      </header>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5" />
          <p>{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        
        {/* Left Column: Input & Plan */}
        <div className="flex flex-col gap-6 lg:col-span-1">
          
          {/* Task Input Panel */}
          <section className="glass-card p-5 rounded-xl flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-[#00d4ff] flex items-center gap-2">
              <Terminal className="w-5 h-5" /> Directive
            </h2>
            <textarea
              className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm focus:outline-none focus:border-[#8b5cf6] focus:ring-1 focus:ring-[#8b5cf6] transition-all resize-none h-32 placeholder-gray-600"
              placeholder="Enter objective for the autonomous system..."
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              disabled={status === 'RUNNING'}
            />
            <button
              onClick={handleExecute}
              disabled={status === 'RUNNING' || !goal.trim()}
              className="w-full py-3 rounded-lg bg-gradient-to-r from-[#00d4ff]/20 to-[#8b5cf6]/20 border border-[#8b5cf6]/50 text-white font-medium flex items-center justify-center gap-2 hover:from-[#00d4ff]/30 hover:to-[#8b5cf6]/30 hover:shadow-[0_0_15px_rgba(139,92,246,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-4 h-4" /> Execute
            </button>
          </section>

          {/* Plan Viewer */}
          <section className="glass-card p-5 rounded-xl flex-1 flex flex-col min-h-[300px]">
            <h2 className="text-lg font-semibold text-[#8b5cf6] mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" /> Execution Plan
            </h2>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
              {plan.length === 0 ? (
                <p className="text-gray-500 text-sm italic text-center mt-10">Awaiting task decomposition...</p>
              ) : (
                plan.map((step, idx) => (
                  <div key={idx} className={`p-3 rounded-lg border ${step.status === 'COMPLETED' ? 'bg-green-500/5 border-green-500/20' : step.status === 'IN_PROGRESS' ? 'bg-[#00d4ff]/5 border-[#00d4ff]/30' : 'bg-black/20 border-white/5'}`}>
                    <div className="flex items-start gap-3">
                      {step.status === 'COMPLETED' ? (
                        <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                      ) : step.status === 'IN_PROGRESS' ? (
                        <Activity className="w-5 h-5 text-[#00d4ff] shrink-0 mt-0.5 animate-pulse" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className={`text-sm ${step.status === 'COMPLETED' ? 'text-gray-400 line-through' : 'text-gray-200'}`}>{step.description}</p>
                        <div className="flex gap-2 mt-2">
                          <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-gray-400 border border-white/10">{step.agent}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-gray-400 border border-white/10">{step.tool}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Console & Logs */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          
          {/* Agent Console */}
          <section className="glass-card p-5 rounded-xl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#00d4ff]" /> System State
                </h2>
                <p className="text-sm text-gray-400 mt-1">Current Phase: <span className="text-[#00d4ff] font-mono">{state}</span></p>
              </div>
              <div className="bg-black/40 border border-[#8b5cf6]/30 px-4 py-2 rounded-lg">
                <span className="text-xs text-gray-500 block mb-1">Active Agent</span>
                <span className="text-sm font-mono text-[#8b5cf6]">{agent}</span>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-black/50 rounded-full h-2.5 border border-white/5 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-[#00d4ff] to-[#8b5cf6] h-2.5 rounded-full transition-all duration-500 ease-out relative"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute top-0 left-0 right-0 bottom-0 bg-white/20 animate-[shimmer_2s_infinite]"></div>
              </div>
            </div>
          </section>

          {/* Internal Monologue Viewer */}
          <section className="glass-card p-5 rounded-xl flex-1 flex flex-col min-h-[200px]">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5 text-[#8b5cf6]" /> Internal Monologue
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 overflow-hidden">
              
              {/* Observations */}
              <div className="flex flex-col bg-black/30 rounded-lg border border-white/5 overflow-hidden">
                <div className="bg-white/5 px-3 py-2 border-b border-white/5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Observations</div>
                <div className="p-3 overflow-y-auto custom-scrollbar flex-1 space-y-2">
                  {monologue.observations.map((obs, i) => (
                    <p key={i} className="text-xs text-gray-300 bg-white/5 p-2 rounded">{obs}</p>
                  ))}
                </div>
              </div>

              {/* Thoughts */}
              <div className="flex flex-col bg-black/30 rounded-lg border border-white/5 overflow-hidden">
                <div className="bg-[#8b5cf6]/10 px-3 py-2 border-b border-[#8b5cf6]/20 text-xs font-semibold text-[#8b5cf6] uppercase tracking-wider">Thoughts</div>
                <div className="p-3 overflow-y-auto custom-scrollbar flex-1 space-y-2">
                  {monologue.thoughts.map((thought, i) => (
                    <p key={i} className="text-xs text-gray-300 bg-[#8b5cf6]/5 p-2 rounded border border-[#8b5cf6]/10">{thought}</p>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col bg-black/30 rounded-lg border border-white/5 overflow-hidden">
                <div className="bg-[#00d4ff]/10 px-3 py-2 border-b border-[#00d4ff]/20 text-xs font-semibold text-[#00d4ff] uppercase tracking-wider">Actions</div>
                <div className="p-3 overflow-y-auto custom-scrollbar flex-1 space-y-2">
                  {monologue.actions.map((action, i) => (
                    <p key={i} className="text-xs text-gray-300 bg-[#00d4ff]/5 p-2 rounded border border-[#00d4ff]/10 font-mono">
                      {typeof action === 'object' 
                        ? `[${action.tool}] ${action.result}` 
                        : String(action)}
                    </p>
                  ))}
                </div>
              </div>

            </div>
          </section>

          {/* Agent Screen Panel (Terminal) */}
          <section className="glass-card p-0 rounded-xl overflow-hidden flex flex-col h-64">
            <div className="bg-black/60 px-4 py-2 border-b border-white/10 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-mono text-gray-400">Agent Screen (Live)</span>
              {status === 'RUNNING' && <span className="w-2 h-2 bg-[#00d4ff] rounded-full animate-pulse ml-2"></span>}
            </div>
            <div className="p-4 overflow-y-auto custom-scrollbar flex-1 bg-[#050508] font-mono text-sm">
              {logs.length === 0 ? (
                <p className="text-gray-600">Waiting for system initialization...</p>
              ) : (
                logs.map((log, idx) => (
                  <div key={idx} className="mb-1 flex gap-3">
                    <span className="text-gray-600 shrink-0">[{new Date(log.timestamp || Date.now()).toLocaleTimeString()}]</span>
                    <span className={`${getLogColor(log.type, log.text)} break-all`}>{log.text}</span>
                  </div>
                ))
              )}
              {status === 'RUNNING' && (
                <div className="flex gap-3 mt-1">
                  <span className="text-gray-600 shrink-0">[{new Date().toLocaleTimeString()}]</span>
                  <span className="text-gray-400 animate-pulse">_</span>
                </div>
              )}
              <div ref={terminalEndRef} />
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
