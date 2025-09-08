import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface Prompts {
  opening: string;
  objection: string;
}

interface DebugLogEntry {
  timestamp: string;
  blockId: string;
  blockType: 'opening' | 'objection';
  inputText: string;
  prompt: string;
  rawResponse: string;
  parsedSuggestions: any;
  error?: string;
}

export function AdminPage() {
  const navigate = useNavigate();
  const [prompts, setPrompts] = useState<Prompts>({
    opening: '',
    objection: ''
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [debugLogs, setDebugLogs] = useState<DebugLogEntry[]>([]);
  const [testText, setTestText] = useState('The sky is green');
  const [testType, setTestType] = useState<'opening' | 'objection'>('opening');
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);
  const [activeTab, setActiveTab] = useState<'prompts' | 'debug' | 'test'>('prompts');

  useEffect(() => {
    fetchPrompts();
    fetchDebugLogs();
  }, []);

  const fetchDebugLogs = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/admin/debug-logs');
      if (response.ok) {
        const logs = await response.json();
        setDebugLogs(logs);
      }
    } catch (error) {
      console.error('Error loading debug logs:', error);
    }
  };

  const clearDebugLogs = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/admin/debug-logs', {
        method: 'DELETE',
      });
      if (response.ok) {
        setDebugLogs([]);
        setMessage('Debug logs cleared');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      setMessage('Error clearing logs: ' + error);
    }
  };

  const testAI = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const response = await fetch('http://localhost:3001/api/admin/test-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: testText,
          blockType: testType
        }),
      });

      const result = await response.json();
      setTestResult(result);
      
      // Refresh debug logs
      fetchDebugLogs();
    } catch (error) {
      setTestResult({ error: 'Failed to test AI: ' + error });
    } finally {
      setTesting(false);
    }
  };

  const fetchPrompts = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/admin/prompts');
      if (response.ok) {
        const data = await response.json();
        setPrompts(data);
      } else {
        setMessage('Failed to load prompts');
      }
    } catch (error) {
      setMessage('Error loading prompts: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const savePrompts = async () => {
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch('http://localhost:3001/api/admin/prompts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(prompts),
      });

      if (response.ok) {
        setMessage('Prompts saved successfully!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Failed to save prompts');
      }
    } catch (error) {
      setMessage('Error saving prompts: ' + error);
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = async () => {
    if (confirm('Are you sure you want to reset to default prompts?')) {
      setSaving(true);
      try {
        const response = await fetch('http://localhost:3001/api/admin/prompts/reset', {
          method: 'POST',
        });
        
        if (response.ok) {
          const data = await response.json();
          setPrompts(data);
          setMessage('Reset to default prompts');
          setTimeout(() => setMessage(''), 3000);
        } else {
          setMessage('Failed to reset prompts');
        }
      } catch (error) {
        setMessage('Error resetting prompts: ' + error);
      } finally {
        setSaving(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-8">Loading prompts...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">AI Check Admin</h1>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 text-sm font-medium sharp-corners"
            style={{
              backgroundColor: '#EFEFEF',
              color: '#111111',
              border: '2px solid rgba(0,0,0,0.3)'
            }}
          >
            Back to Debate
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b">
          {[
            { key: 'prompts', label: 'Edit Prompts' },
            { key: 'debug', label: 'Debug Logs' },
            { key: 'test', label: 'Test AI' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2 text-sm font-medium sharp-corners ${
                activeTab === tab.key ? 'border-b-2 border-blue-500' : ''
              }`}
              style={{
                backgroundColor: activeTab === tab.key ? '#E3F2FD' : 'transparent',
                color: activeTab === tab.key ? '#1976D2' : '#666',
                border: activeTab === tab.key ? 'none' : '1px solid #DDD'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {message && (
          <div 
            className="mb-4 p-3 rounded sharp-corners"
            style={{
              backgroundColor: message.includes('Error') || message.includes('Failed') ? '#FFE6E6' : '#E8F5E8',
              border: `2px solid ${message.includes('Error') || message.includes('Failed') ? '#FF4444' : '#4CAF50'}`,
              color: message.includes('Error') || message.includes('Failed') ? '#CC0000' : '#2E7D32'
            }}
          >
            {message}
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'prompts' && (
          <div className="space-y-6">
            <div>
              <label className="block text-lg font-medium mb-2">
                Opening Statement Prompt
              </label>
              <textarea
                value={prompts.opening}
                onChange={(e) => setPrompts({ ...prompts, opening: e.target.value })}
                className="w-full h-64 p-3 border-2 border-gray-300 sharp-corners font-mono text-sm"
                style={{ resize: 'vertical' }}
              />
            </div>

            <div>
              <label className="block text-lg font-medium mb-2">
                Objection Prompt
              </label>
              <textarea
                value={prompts.objection}
                onChange={(e) => setPrompts({ ...prompts, objection: e.target.value })}
                className="w-full h-64 p-3 border-2 border-gray-300 sharp-corners font-mono text-sm"
                style={{ resize: 'vertical' }}
              />
            </div>

            <div className="flex gap-4">
              <button
                onClick={savePrompts}
                disabled={saving}
                className="px-6 py-3 text-base font-medium sharp-corners disabled:opacity-50"
                style={{
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none'
                }}
              >
                {saving ? 'Saving...' : 'Save Prompts'}
              </button>

              <button
                onClick={resetToDefaults}
                disabled={saving}
                className="px-6 py-3 text-base font-medium sharp-corners disabled:opacity-50"
                style={{
                  backgroundColor: '#FF9500',
                  color: 'white',
                  border: 'none'
                }}
              >
                Reset to Defaults
              </button>
            </div>

            <div className="mt-8 p-4 bg-gray-50 rounded sharp-corners">
              <h3 className="font-medium mb-2">Instructions:</h3>
              <ul className="text-sm space-y-1 text-gray-600">
                <li>• Use {"${text}"} as a placeholder for the user's input text</li>
                <li>• The AI will receive exactly what you write here as the prompt</li>
                <li>• Make sure to specify the expected JSON format for responses</li>
                <li>• Changes take effect immediately after saving</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'test' && (
          <div className="space-y-6">
            <div>
              <label className="block text-lg font-medium mb-2">
                Test Text
              </label>
              <textarea
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                className="w-full h-24 p-3 border-2 border-gray-300 sharp-corners"
                placeholder="Enter text to test AI analysis..."
              />
            </div>

            <div>
              <label className="block text-lg font-medium mb-2">
                Block Type
              </label>
              <select
                value={testType}
                onChange={(e) => setTestType(e.target.value as 'opening' | 'objection')}
                className="px-3 py-2 border-2 border-gray-300 sharp-corners"
              >
                <option value="opening">Opening Statement</option>
                <option value="objection">Objection</option>
              </select>
            </div>

            <button
              onClick={testAI}
              disabled={testing || !testText.trim()}
              className="px-6 py-3 text-base font-medium sharp-corners disabled:opacity-50"
              style={{
                backgroundColor: '#2196F3',
                color: 'white',
                border: 'none'
              }}
            >
              {testing ? 'Testing...' : 'Test AI'}
            </button>

            {testResult && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium mb-2">Result:</h3>
                  <div className="p-4 bg-gray-100 rounded sharp-corners">
                    {testResult.error ? (
                      <div className="text-red-600">Error: {testResult.error}</div>
                    ) : (
                      <div>
                        <div className="mb-2"><strong>Suggestions:</strong></div>
                        <pre className="text-sm">{JSON.stringify(testResult.suggestions, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                </div>
                
                {testResult.debug && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Debug Info:</h3>
                    <div className="space-y-2">
                      <div>
                        <strong>Raw Response:</strong>
                        <pre className="mt-1 p-3 bg-gray-100 rounded text-sm overflow-x-auto">
                          {testResult.debug.rawResponse}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'debug' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-medium">Debug Logs</h2>
              <div className="flex gap-2">
                <button
                  onClick={fetchDebugLogs}
                  className="px-4 py-2 text-sm font-medium sharp-corners"
                  style={{
                    backgroundColor: '#EFEFEF',
                    color: '#111111',
                    border: '2px solid rgba(0,0,0,0.3)'
                  }}
                >
                  Refresh
                </button>
                <button
                  onClick={clearDebugLogs}
                  className="px-4 py-2 text-sm font-medium sharp-corners"
                  style={{
                    backgroundColor: '#F44336',
                    color: 'white',
                    border: 'none'
                  }}
                >
                  Clear Logs
                </button>
              </div>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {debugLogs.length === 0 ? (
                <p className="text-gray-600">No debug logs yet. Try using the AI Check feature.</p>
              ) : (
                debugLogs.map((log, index) => (
                  <div key={index} className="p-4 border rounded sharp-corners">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{log.blockType.toUpperCase()}</span>
                        <span className="text-sm text-gray-600">{log.blockId}</span>
                        {log.error && (
                          <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">ERROR</span>
                        )}
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div>
                        <strong>Input:</strong> "{log.inputText}"
                      </div>
                      {log.error ? (
                        <div className="text-red-600">
                          <strong>Error:</strong> {log.error}
                        </div>
                      ) : (
                        <>
                          <div>
                            <strong>Raw Response:</strong>
                            <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                              {log.rawResponse.substring(0, 200)}{log.rawResponse.length > 200 ? '...' : ''}
                            </pre>
                          </div>
                          <div>
                            <strong>Parsed Suggestions:</strong>
                            <pre className="mt-1 p-2 bg-gray-100 rounded text-xs">
                              {JSON.stringify(log.parsedSuggestions, null, 2)}
                            </pre>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}