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
  const [agent, setAgent] = useState('MasterAgent');
  const [logs, setLogs] = useState([]);
  const logsEndRef = useRef(null);

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
    setStatus('RUNNING');
    setLogs([{ type: 'info', text: `Initializing task: ${goal}`, timestamp: Date.now() }]);

    try {
      const res = await fetch(`${API_URL}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': SYNOD_API_KEY },
        body: JSON.stringify({ goal })
      });
      
      if (!res.ok) throw new Error('Failed to create task');
      
      const data = await res.json();
      setTaskId(data.task_id);
    } catch (err) {
      console.error('Execution error:', err);
      setStatus('FAIL');
      setLogs(prev => [...prev, { type: 'error', text: `Execution failed: ${err.message}`, timestamp: Date.now() }]);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Sidebar - History */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <h1 className="text-lg font-semibold tracking-tight">Awais Codex</h1>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {tasks.map((h) => (
            <div 
              key={h.task_id}
              onClick={() => setTaskId(h.task_id)}
              className={`p-3 rounded-lg cursor-pointer transition-colors ${
                taskId === h.task_id ? 'bg-gray-100' : 'hover:bg-gray-50'
              }`}
            >
              <p className="text-sm font-medium truncate">{h.goal}</p>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Stage */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 border-b border-gray-200 flex items-center justify-between px-6 bg-white">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-sm font-medium text-gray-600">{status || 'Ready'}</span>
            <span className="text-xs text-gray-400 px-2 py-0.5 bg-gray-100 rounded-full">{agent}</span>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {logs.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <Brain className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg font-medium">How can I help you build today?</p>
            </div>
          )}
          {logs.map((log, i) => (
            <div key={i} className="flex gap-4 max-w-3xl mx-auto">
              <div className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">A</div>
              <div className="flex-1 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                <p className="text-sm text-gray-800 leading-relaxed">{log.text}</p>
              </div>
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-6 bg-white border-t border-gray-200">
          <div className="relative">
            <input
              type="text"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="What should I build next?"
              className="w-full pl-4 pr-12 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900"
              onKeyDown={(e) => e.key === 'Enter' && handleExecute()}
            />
            <button 
              onClick={handleExecute}
              className="absolute right-2 top-2 p-1.5 bg-gray-900 text-white rounded-md"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
