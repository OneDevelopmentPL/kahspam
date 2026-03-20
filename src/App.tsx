import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Send, Zap, Activity, Info, CheckCircle2, XCircle, Shield, BrainCircuit } from 'lucide-react';

interface LogItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'status';
  timestamp: string;
}

const App: React.FC = () => {
  const [pin, setPin] = useState('');
  const [prefix, setPrefix] = useState('');
  const [count, setCount] = useState(1);
  const [quizLink, setQuizLink] = useState('');
  const [useBypass, setUseBypass] = useState(true);
  const [answerMode, setAnswerMode] = useState('none');
  const [isSending, setIsSending] = useState(false);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const addLog = (message: string, type: 'success' | 'error' | 'status' = 'status') => {
    const newLog: LogItem = {
      id: Math.random().toString(36).substr(2, 9),
      message,
      type,
      timestamp: new Date().toLocaleTimeString(),
    };
    setLogs(prev => [...prev, newLog]);
  };

  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin) {
      addLog('Błąd: PIN gry jest wymagany.', 'error');
      return;
    }

    setIsSending(true);
    addLog(`🚀 Rozpoczynanie wysyłania ${count} botów do PIN-u ${pin}...`, 'status');

    let botsRemaining = count;
    const batchSize = 25; // Higher batch size since we have a custom backend now
    let batchIndex = 1;

    // Default to localhost:3000 for local dev, or the full URL if deployed
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

    try {
      while (botsRemaining > 0) {
        const currentBatch = Math.min(botsRemaining, batchSize);
        addLog(`📦 Wysyłanie paczki #${batchIndex} (${currentBatch} botów)...`, 'status');
        
        try {
          const response = await axios.post(`${apiUrl}/api/joingame`, {
            pin,
            name: prefix,
            count: currentBatch,
            useBypass: useBypass,
            answerMode: answerMode,
            quizLink: quizLink
          });

          if (response.data.results) {
            response.data.results.forEach((r: any) => {
              if (r.success) {
                addLog(`✅ Bot ${r.name} dołączył!`, 'success');
              } else {
                addLog(`❌ Bot ${r.name} nie dołączył: ${r.error}`, 'error');
              }
            });
          }
        } catch (err: any) {
          addLog(`⚠️ Paczka #${batchIndex} nie powiodła się: Upewnij się, że serwer Backend (node server.js) jest włączony. | ${err.message}`, 'error');
          break; // Stop if the backend is down
        }

        botsRemaining -= currentBatch;
        batchIndex++;
        
        // Wait a small bit between batches
        if (botsRemaining > 0) {
          await new Promise(r => setTimeout(r, 1000));
        }
      }
      addLog('✨ Proces wysyłania zakończony.', 'status');
    } catch (err: any) {
      addLog(`🚨 Krytyczny błąd: ${err.message}`, 'error');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="container">
      <div className="floating-shapes">
        <div className="shape" style={{ top: '10%', left: '10%', width: '50px', height: '50px', backgroundColor: 'var(--kahoot-red)', clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}></div>
        <div className="shape" style={{ top: '30%', left: '80%', width: '60px', height: '60px', backgroundColor: 'var(--kahoot-blue)', clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}></div>
        <div className="shape" style={{ top: '70%', left: '20%', width: '40px', height: '40px', backgroundColor: 'var(--kahoot-yellow)', borderRadius: '50%' }}></div>
        <div className="shape" style={{ top: '80%', left: '70%', width: '50px', height: '50px', backgroundColor: 'var(--kahoot-green)', borderRadius: '10%' }}></div>
      </div>

      <div className="glass-card">
        <header>
          <h1>KahSpam</h1>
          <p className="subtitle">Wydajne narzędzie do wysyłania botów</p>
        </header>

        <form onSubmit={handleDeploy}>
          <div className="input-group">
            <label>
              <Zap size={14} style={{ marginRight: '4px' }} />
              PIN Gry
            </label>
            <input 
              type="text" 
              placeholder="000000" 
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              maxLength={8}
            />
          </div>

          <div className="input-group">
            <label>
              <Info size={14} style={{ marginRight: '4px' }} />
              Nazwa Bota
            </label>
            <input 
              type="text" 
              placeholder="Zostaw puste dla losowych imion" 
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              maxLength={15}
            />
          </div>

          <div className="input-group">
            <label>
              <Activity size={14} style={{ marginRight: '4px' }} />
              Ilość Botów (max 100)
            </label>
            <input 
              type="number" 
              min="1" 
              max="100" 
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value) || 0)}
            />
          </div>

          <div className="input-group">
            <label>
              <Info size={14} style={{ marginRight: '4px' }} />
              Link do Quizu (Opcjonalny)
            </label>
            <input 
              type="text" 
              placeholder="Wklej link (Tylko dla Zawsze Dobrze/Źle)" 
              value={quizLink}
              onChange={(e) => setQuizLink(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label>
              <BrainCircuit size={14} style={{ marginRight: '4px' }} />
              Tryb Odpowiadania (Auto-Answer)
            </label>
            <select 
              className="custom-select"
              value={answerMode} 
              onChange={(e) => setAnswerMode(e.target.value)}
            >
              <option value="none">🛑 Brak (Tylko w poczekalni)</option>
              <option value="random">🎲 Zawsze Losowo</option>
              <option value="always-right">✅ Zawsze Dobrze (O ile to możliwe)</option>
              <option value="always-wrong">❌ Zawsze Źle</option>
            </select>
          </div>

          <div className="input-group bypass-toggle" onClick={() => setUseBypass(!useBypass)}>
            <div className={`checkbox ${useBypass ? 'active' : ''}`}>
              {useBypass && <CheckCircle2 size={14} color="white" />}
            </div>
            <div className="toggle-text">
              <Shield size={14} />
              <span>Ominięcie filtra podwójnych nazw (Bypass)</span>
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={isSending}>
            {isSending ? (
              <>
                <div className="spinner"></div>
                WYSYŁANIE...
              </>
            ) : (
              <>
                <Send size={20} />
                WYŚLIJ BOTY
              </>
            )}
          </button>
        </form>

        <div className="logs" ref={scrollRef}>
          {logs.length === 0 ? (
            <div className="log-item" style={{ opacity: 0.5, textAlign: 'center' }}>
              Oczekiwanie na polecenie...
            </div>
          ) : (
            logs.map(log => (
              <div key={log.id} className={`log-item ${log.type}`}>
                <span style={{ fontSize: '0.7rem', opacity: 0.6, marginRight: '8px' }}>[{log.timestamp}]</span>
                {log.type === 'success' && <CheckCircle2 size={12} style={{ marginRight: '4px' }} />}
                {log.type === 'error' && <XCircle size={12} style={{ marginRight: '4px' }} />}
                {log.type === 'status' && <Zap size={12} style={{ marginRight: '4px' }} />}
                {log.message}
              </div>
            ))
          )}
        </div>
      </div>

      <style>{`
        .spinner {
          width: 20px;
          height: 20px;
          border: 3px solid rgba(255,255,255,0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .bypass-toggle {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          padding: 10px;
          background: rgba(0,0,0,0.2);
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.05);
          transition: all 0.2s;
        }
        .bypass-toggle:hover {
          background: rgba(0,0,0,0.3);
        }
        .checkbox {
          width: 20px;
          height: 20px;
          border-radius: 6px;
          border: 2px solid rgba(255,255,255,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .checkbox.active {
          background: #a855f7;
          border-color: #a855f7;
        }
        .toggle-text {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.85rem;
          color: var(--text-secondary);
        }
        .custom-select {
          width: 100%;
          padding: 1rem 1.25rem;
          background: rgba(0, 0, 0, 0.2);
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          color: white;
          font-size: 1.1rem;
          font-weight: 500;
          transition: all 0.2s ease;
          appearance: none;
          background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23FFFFFF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
          background-repeat: no-repeat;
          background-position: right 1rem top 50%;
          background-size: 0.65rem auto;
        }
        .custom-select:focus {
          outline: none;
          border-color: #a855f7;
          background-color: rgba(0, 0, 0, 0.3);
          box-shadow: 0 0 0 4px rgba(168, 85, 247, 0.15);
        }
        .custom-select option {
          background: var(--kahoot-dark);
          color: white;
          padding: 10px;
        }
      `}</style>
    </div>
  );
};

export default App;
