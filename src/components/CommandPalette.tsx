import React, { useState, useEffect } from 'react';
import { Search, Terminal, Settings, Activity, Layout, X, Brain, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

export default function CommandPalette({ isOpen, setIsOpen, setGoal, handleExecute, setStatus, setTaskId, setLogs, setPlan, setScreenshot }: { 
  isOpen: boolean, 
  setIsOpen: (v: boolean) => void,
  setGoal: (v: string) => void,
  handleExecute: () => void,
  setStatus: (v: string) => void,
  setTaskId: (v: string | null) => void,
  setLogs: (v: any[]) => void,
  setPlan: (v: any[]) => void,
  setScreenshot: (v: string | null) => void
}) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(!isOpen);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setIsOpen]);

  const commands = [
    { id: 'new-task', label: 'Start New Task', icon: Play, action: () => { 
      setTaskId(null); setGoal(''); setLogs([]); setPlan([]); setScreenshot(null); setStatus('IDLE'); 
      setIsOpen(false); 
      setTimeout(() => document.getElementById('main-input')?.focus(), 100); 
    } },
    { id: 'settings', label: 'Open Settings', icon: Settings, action: () => { navigate('/settings/account'); setIsOpen(false); } },
    { id: 'diagnostics', label: 'Run Diagnostics', icon: Activity, action: () => { navigate('/settings/diagnostics'); setIsOpen(false); } },
    { id: 'integrations', label: 'Manage API Keys', icon: Terminal, action: () => { navigate('/settings/integrations'); setIsOpen(false); } },
  ];

  const filteredCommands = commands.filter(c => c.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[3000] flex items-start justify-center pt-[20vh] px-4 bg-gray-900/40 backdrop-blur-sm" 
          onClick={() => setIsOpen(false)}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center px-4 py-3 border-b border-gray-100">
              <Search className="w-5 h-5 text-gray-400 mr-3" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type a command or search..."
                className="flex-1 bg-transparent border-none focus:outline-none text-gray-900 placeholder-gray-400 text-base"
              />
              <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-500 text-[10px] font-bold rounded border border-gray-200">
                ESC
              </kbd>
            </div>
            <div className="max-h-72 overflow-y-auto p-2">
              {filteredCommands.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">No commands found.</div>
              ) : (
                filteredCommands.map((cmd, i) => (
                  <button
                    key={cmd.id}
                    onClick={cmd.action}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 text-left transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-white group-hover:shadow-sm transition-all">
                      <cmd.icon className="w-4 h-4 text-gray-500 group-hover:text-blue-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{cmd.label}</span>
                  </button>
                ))
              )}
            </div>
            <div className="bg-gray-50 px-4 py-2.5 border-t border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Brain className="w-3.5 h-3.5" /> Awais Codex Command Palette
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
