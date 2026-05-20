import React, { useState, useEffect } from 'react';
import type { MemoryRecord } from '../types';

interface Props {
  onThemeChange: (theme: string) => void;
  currentTheme: string;
  memories: MemoryRecord[];
  onRefreshMemories: () => void;
}

export default function SettingsPanel({
  onThemeChange,
  currentTheme,
  memories,
  onRefreshMemories,
}: Props) {
  const [apiKey, setApiKey] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    const savedKey = localStorage.getItem('orion_custom_api_key') || '';
    setApiKey(savedKey);
  }, []);

  function saveKey() {
    if (apiKey.trim()) {
      localStorage.setItem('orion_custom_api_key', apiKey.trim());
      setStatusMsg('✓ API Key saved to local browser storage.');
    } else {
      localStorage.removeItem('orion_custom_api_key');
      setStatusMsg('✓ API Key cleared. Using server master key fallback.');
    }
    setTimeout(() => setStatusMsg(''), 4000);
  }

  function exportMemories() {
    const blob = new Blob([JSON.stringify(memories, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `orion_memories_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (!Array.isArray(data)) {
          alert('Invalid memory file format. Expected a JSON array.');
          return;
        }

        let importedCount = 0;
        for (const item of data) {
          if (item && item.content) {
            await fetch('/api/memories', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(apiKey ? { 'x-gemini-key': apiKey } : {}),
              },
              body: JSON.stringify({
                content: item.content,
                tags: item.tags || ['imported'],
              }),
            });
            importedCount++;
          }
        }
        onRefreshMemories();
        alert(`Successfully imported ${importedCount} memories!`);
      } catch (err) {
        console.error('Error importing memories:', err);
        alert('Failed to parse the memories file.');
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="settings-panel">
      <div className="settings-card">
        <h2 className="settings-title">Cognitive Settings</h2>

        <div className="settings-field">
          <label className="field-label">Custom Gemini API Key</label>
          <p className="field-desc">
            Your key stays inside this browser and is transmitted directly to the server to make requests.
            It is never shared or stored on the server disk.
          </p>
          <div className="input-group">
            <input
              type="password"
              className="settings-input"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Paste your AIzaSy... API key"
            />
            <button className="settings-save-btn" onClick={saveKey}>Save</button>
          </div>
          {statusMsg && <p className="settings-status">{statusMsg}</p>}
        </div>

        <div className="settings-field">
          <label className="field-label">Workspace Color Theme</label>
          <p className="field-desc">Select the glowing visual style of your Orion cockpit.</p>
          <div className="theme-options">
            {['slate', 'nimbus', 'monochrome'].map((t) => (
              <button
                key={t}
                className={`theme-btn theme-btn--${t} ${currentTheme === t ? 'active' : ''}`}
                onClick={() => onThemeChange(t)}
              >
                {t === 'slate' ? 'Slate Gold' : t === 'nimbus' ? 'Nimbus Gold' : 'Monochrome'}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-field">
          <label className="field-label">Context Memory Management</label>
          <p className="field-desc">Backup your memory bank or restore previous profiles.</p>
          <div className="backup-actions">
            <button className="backup-btn" onClick={exportMemories}>
              📥 Export Memories ({memories.length})
            </button>
            <label className="backup-btn backup-btn--upload">
              📤 Import Memories (.json)
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
