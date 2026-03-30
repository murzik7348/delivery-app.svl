import React, { useState, useEffect } from 'react';
import { logService } from '../api/logService';
import { Terminal, Trash2, AlertCircle, CheckCircle, ArrowRightCircle } from 'lucide-react';

export default function LogsPage() {
  const [logs, setLogs] = useState(logService.getLogs());

  useEffect(() => {
    return logService.subscribe(setLogs);
  }, []);

  const getLogIcon = (type) => {
    switch (type) {
      case 'error': return <AlertCircle className="w-5 h-5 text-danger" />;
      case 'response': return <CheckCircle className="w-5 h-5 text-success" />;
      case 'request': return <ArrowRightCircle className="w-5 h-5 text-primary" />;
      default: return <Terminal className="w-5 h-5 text-textSecondary" />;
    }
  };

  const getLogColor = (type, status) => {
    if (type === 'error' || (status >= 400)) return 'border-danger/30 bg-danger/5';
    if (type === 'response') return 'border-success/30 bg-success/5';
    return 'border-borderWhite bg-surfaceLighter';
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
            <Terminal className="w-8 h-8 mr-3 text-primary" />
            Діагностичні Логи
          </h1>
          <p className="text-textSecondary">Відстежуйте технічні деталі запитів до сервера у реальному часі.</p>
        </div>
        <button 
          onClick={() => logService.clearLogs()}
          className="px-4 py-2 flex items-center glass-button text-danger hover:bg-danger/10 border border-danger/20 rounded-xl transition-all"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Очистити
        </button>
      </div>

      <div className="space-y-4">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-surfaceLighter rounded-3xl border border-dashed border-borderWhite text-textSecondary">
            <Terminal className="w-12 h-12 mb-4 opacity-20" />
            <p>Логів поки що немає. Зробіть якусь дію в панелі.</p>
          </div>
        ) : (
          logs.map((log) => (
            <div 
              key={log.id} 
              className={`p-5 rounded-2xl border transition-all hover:shadow-lg ${getLogColor(log.type, log.status)}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center">
                  <div className="mr-4 p-2 bg-surface rounded-lg shadow-sm">
                    {getLogIcon(log.type)}
                  </div>
                  <div>
                    <div className="flex items-center space-x-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        log.type === 'error' ? 'bg-danger text-white' : 
                        log.type === 'response' ? 'bg-success text-white' : 'bg-primary text-white'
                      }`}>
                        {log.method || (log.type === 'response' ? 'RES' : log.type)}
                      </span>
                      <span className="text-white font-mono text-sm">{log.url}</span>
                    </div>
                    <p className="text-[11px] text-textSecondary mt-1">{new Date(log.timestamp).toLocaleTimeString()}</p>
                  </div>
                </div>
                {log.status && (
                  <span className={`text-lg font-bold ${log.status >= 400 ? 'text-danger' : 'text-success'}`}>
                    {log.status}
                  </span>
                )}
              </div>

              {log.data && (
                <div className="mt-4 p-4 bg-black/30 rounded-xl border border-white/5 font-mono text-xs overflow-x-auto">
                    <pre className="text-gray-300">
                        {JSON.stringify(log.data, null, 2)}
                    </pre>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
