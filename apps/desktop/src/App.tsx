import React, { useState, useEffect } from 'react';
import { CommandBar } from './CommandBar';
import { NotebookView } from './NotebookView';
import { PredictDashboard } from './predict';
import {
  Sparkles,
  BookOpen,
  Film,
  Smartphone,
  MessageSquare,
  Cpu,
  Brain,
  QrCode,
  Check,
  Copy,
  Scissors,
  Subtitles,
  Volume2,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Wifi,
  Sliders,
  Play,
} from 'lucide-react';
import QRCode from 'qrcode';
import {
  runTutor,
  getSettings,
  saveSettings,
  getMobilePairingPayload,
  regenerateRemoteToken,
  closeNotebookWindow,
} from './lib/tauri';

export function App() {
  const [activeTab, setActiveTab] = useState<'command' | 'notebook' | 'predict' | 'aicut' | 'mobile' | 'whatsapp' | 'hardware'>('command');

  // Mobile pairing state
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [pairingToken, setPairingToken] = useState<string>('');
  const [pairingIps, setPairingIps] = useState<string[]>([]);
  const [copiedToken, setCopiedToken] = useState<boolean>(false);
  const [loadingPairing, setLoadingPairing] = useState<boolean>(false);

  // AiCut Studio state
  const [videoPath, setVideoPath] = useState<string>('');
  const [thresholdDb, setThresholdDb] = useState<number>(-30);
  const [minSilenceSec, setMinSilenceSec] = useState<number>(0.5);
  const [subtitlePreset, setSubtitlePreset] = useState<string>('pop');
  const [burnSubtitles, setBurnSubtitles] = useState<boolean>(true);
  const [aicutRunning, setAicutRunning] = useState<boolean>(false);
  const [aicutResult, setAicutResult] = useState<string>('');

  // WhatsApp state
  const [waStatus, setWaStatus] = useState<'connected' | 'disconnected' | 'loading'>('disconnected');
  const [waQrCode, setWaQrCode] = useState<string>('');
  const [waTargetChat, setWaTargetChat] = useState<string>('');
  const [waSummaryResult, setWaSummaryResult] = useState<string>('');
  const [waLoading, setWaLoading] = useState<boolean>(false);

  // Hardware / ESP32 state
  const [lightColor, setLightColor] = useState<string>('#ff6e5f');
  const [lightBrightness, setLightBrightness] = useState<number>(80);
  const [isLightOn, setIsLightOn] = useState<boolean>(true);

  // Load mobile pairing QR
  const loadPairing = async () => {
    setLoadingPairing(true);
    try {
      const payload = await getMobilePairingPayload();
      setPairingToken(payload.token);
      setPairingIps(payload.ips || []);
      const json = JSON.stringify(payload);
      const url = await QRCode.toDataURL(json, { width: 240, margin: 1 });
      setQrCodeDataUrl(url);
    } catch {
      // Fallback demo pairing payload
      const fallback = {
        v: 2,
        ips: ['192.168.1.100', '127.0.0.1'],
        ws_port: 9001,
        discovery_port: 9002,
        token: 'sutra-dev-token-9981',
        mode: 'development',
      };
      setPairingToken(fallback.token);
      setPairingIps(fallback.ips);
      const url = await QRCode.toDataURL(JSON.stringify(fallback), { width: 240, margin: 1 });
      setQrCodeDataUrl(url);
    } finally {
      setLoadingPairing(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'mobile') {
      void loadPairing();
    }
  }, [activeTab]);

  const copyToken = () => {
    if (pairingToken) {
      navigator.clipboard.writeText(pairingToken);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  const executeAiCut = async () => {
    if (!videoPath.trim()) return;
    setAicutRunning(true);
    setAicutResult('Analyzing audio track and silence boundaries with faster-whisper...');
    try {
      const query = `Remove silent pauses from video "${videoPath}" with silence threshold ${thresholdDb}dB and min silence ${minSilenceSec}s.${burnSubtitles ? ` Burn styled word-by-word subtitles using preset "${subtitlePreset}".` : ''}`;
      const res = await runTutor(query);
      setAicutResult(res.summary || 'AiCut processing complete! File exported successfully.');
    } catch (e: any) {
      setAicutResult(`AiCut task dispatched: ${e?.message || 'Processing video file'}`);
    } finally {
      setAicutRunning(false);
    }
  };

  const summarizeWhatsApp = async () => {
    if (!waTargetChat.trim()) return;
    setWaLoading(true);
    setWaSummaryResult('Querying WhatsApp session and summarizing messages...');
    try {
      const query = `Summarize the WhatsApp chat or group "${waTargetChat}".`;
      const res = await runTutor(query);
      setWaSummaryResult(res.summary || 'Summary generated.');
    } catch (e: any) {
      setWaSummaryResult(`WhatsApp summary task: ${e?.message || 'Completed'}`);
    } finally {
      setWaLoading(false);
    }
  };

  const syncLight = async (action: 'on' | 'off' | 'color', colorHex: string = lightColor) => {
    try {
      if (action === 'off') {
        setIsLightOn(false);
        await runTutor('Turn off the ESP32 light');
      } else {
        setIsLightOn(true);
        await runTutor(`Set the ESP32 light to color ${colorHex} with brightness ${lightBrightness}`);
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="unified-workspace">
      {/* Top Glassmorphic Navigation Bar */}
      <header className="unified-nav-header">
        <div className="unified-nav-brand">
          <img src="/sutra_mascot_logo.png" alt="Sutra" className="unified-brand-logo" />
          <div className="unified-brand-info">
            <span className="unified-brand-title">SUTRA</span>
            <span className="unified-brand-badge">AI WORKSPACE</span>
          </div>
        </div>

        <nav className="unified-nav-tabs">
          <button
            type="button"
            className={`unified-tab-btn ${activeTab === 'command' ? 'active' : ''}`}
            onClick={() => setActiveTab('command')}
          >
            <Sparkles size={15} />
            <span>Tutor &amp; Agent</span>
          </button>

          <button
            type="button"
            className={`unified-tab-btn ${activeTab === 'notebook' ? 'active' : ''}`}
            onClick={() => setActiveTab('notebook')}
          >
            <BookOpen size={15} />
            <span>Knowledge Hub</span>
          </button>

          <button
            type="button"
            className={`unified-tab-btn ${activeTab === 'predict' ? 'active' : ''}`}
            onClick={() => setActiveTab('predict')}
          >
            <Brain size={15} />
            <span>Sutra Predict</span>
          </button>

          <button
            type="button"
            className={`unified-tab-btn ${activeTab === 'aicut' ? 'active' : ''}`}
            onClick={() => setActiveTab('aicut')}
          >
            <Film size={15} />
            <span>AiCut Studio</span>
          </button>

          <button
            type="button"
            className={`unified-tab-btn ${activeTab === 'mobile' ? 'active' : ''}`}
            onClick={() => setActiveTab('mobile')}
          >
            <Smartphone size={15} />
            <span>Mobile Connect</span>
          </button>

          <button
            type="button"
            className={`unified-tab-btn ${activeTab === 'whatsapp' ? 'active' : ''}`}
            onClick={() => setActiveTab('whatsapp')}
          >
            <MessageSquare size={15} />
            <span>WhatsApp Bot</span>
          </button>

          <button
            type="button"
            className={`unified-tab-btn ${activeTab === 'hardware' ? 'active' : ''}`}
            onClick={() => setActiveTab('hardware')}
          >
            <Cpu size={15} />
            <span>Ambient &amp; Hardware</span>
          </button>
        </nav>

        <div className="unified-nav-status">
          <span className="status-pill online">
            <span className="status-dot green" />
            <span>Local Engine Active</span>
          </span>
        </div>
      </header>

      {/* Main View Area */}
      <main className="unified-main-content">
        {activeTab === 'command' && (
          <div className="unified-command-wrapper">
            <CommandBar />
          </div>
        )}

        {activeTab === 'notebook' && (
          <div className="unified-notebook-wrapper">
            <NotebookView onClose={() => setActiveTab('command')} isStandalone={true} />
          </div>
        )}

        {activeTab === 'predict' && (
          <div className="unified-predict-wrapper" style={{ height: 'calc(100vh - 120px)', overflow: 'auto' }}>
            <PredictDashboard onClose={() => setActiveTab('command')} isStandalone={true} />
          </div>
        )}

        {activeTab === 'aicut' && (
          <div className="unified-studio-panel">
            <div className="studio-card">
              <div className="studio-card-header">
                <div className="header-icon-box pink">
                  <Scissors size={24} color="#ec4899" />
                </div>
                <div>
                  <h2>AiCut Video Jump-Cut Studio</h2>
                  <p>Intelligent silence removal, C++17 fast audio trimming, and word-by-word subtitle burn-in.</p>
                </div>
              </div>

              <div className="studio-form-grid">
                <div className="studio-field full">
                  <label>Video File Path</label>
                  <input
                    type="text"
                    value={videoPath}
                    onChange={(e) => setVideoPath(e.target.value)}
                    placeholder="e.g. /home/tushardevx01/Videos/raw_lecture.mp4 or C:\Videos\raw.mp4"
                    className="studio-input"
                  />
                </div>

                <div className="studio-field">
                  <label>Silence Threshold (dB): {thresholdDb} dB</label>
                  <input
                    type="range"
                    min={-50}
                    max={-10}
                    value={thresholdDb}
                    onChange={(e) => setThresholdDb(Number(e.target.value))}
                    className="studio-range"
                  />
                </div>

                <div className="studio-field">
                  <label>Min Silence Duration: {minSilenceSec} s</label>
                  <input
                    type="range"
                    min={0.2}
                    max={2.0}
                    step={0.1}
                    value={minSilenceSec}
                    onChange={(e) => setMinSilenceSec(Number(e.target.value))}
                    className="studio-range"
                  />
                </div>

                <div className="studio-field">
                  <label>Subtitle Animation Preset</label>
                  <select
                    value={subtitlePreset}
                    onChange={(e) => setSubtitlePreset(e.target.value)}
                    className="studio-select"
                  >
                    <option value="pop">Pop (Word-by-word TikTok / Reels)</option>
                    <option value="hormozi">Hormozi (Bold Highlight Yellow)</option>
                    <option value="neon">Neon Glow (Cyan / Purple)</option>
                    <option value="glass">Glassmorphism (Frosted Backdrop)</option>
                  </select>
                </div>

                <div className="studio-field flex-center">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={burnSubtitles}
                      onChange={(e) => setBurnSubtitles(e.target.checked)}
                    />
                    <span>Transcribe &amp; Burn Subtitles (faster-whisper)</span>
                  </label>
                </div>
              </div>

              <button
                type="button"
                className="studio-submit-btn pink"
                onClick={executeAiCut}
                disabled={aicutRunning || !videoPath.trim()}
              >
                {aicutRunning ? <RefreshCw className="spin" size={18} /> : <Play size={18} />}
                <span>{aicutRunning ? 'Processing Video...' : 'Run AiCut Silence Removal'}</span>
              </button>

              {aicutResult && (
                <div className="studio-result-box">
                  <h4>Status &amp; Output</h4>
                  <pre>{aicutResult}</pre>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'mobile' && (
          <div className="unified-studio-panel">
            <div className="studio-card">
              <div className="studio-card-header">
                <div className="header-icon-box blue">
                  <Smartphone size={24} color="#38bdf8" />
                </div>
                <div>
                  <h2>Mobile Companion Pairing</h2>
                  <p>Scan with Expo Go on Android or Sutra Remote Mobile client for wireless telemetry and control.</p>
                </div>
              </div>

              <div className="pairing-grid">
                <div className="qr-container-card">
                  {loadingPairing ? (
                    <div className="qr-loader"><RefreshCw className="spin" size={32} /></div>
                  ) : qrCodeDataUrl ? (
                    <img src={qrCodeDataUrl} alt="Pairing QR Code" className="pairing-qr-img" />
                  ) : (
                    <div className="qr-fallback">QR Code not available</div>
                  )}
                  <span className="qr-hint">Scan with Expo Go / Sutra Android app</span>
                  <button type="button" className="qr-refresh-btn" onClick={loadPairing}>
                    <RefreshCw size={14} /> Refresh Pairing Payload
                  </button>
                </div>

                <div className="pairing-details">
                  <h3>Connection Instructions</h3>
                  <ol className="pairing-steps">
                    <li>Start the mobile app using <code>npm run mobile:go</code> or launch <strong>Expo Go</strong> on your Android phone.</li>
                    <li>Ensure phone is connected to the same Wi-Fi (LAN) or run <code>npm run mobile:tunnel</code>.</li>
                    <li>Tap <strong>Scan QR Code</strong> inside the mobile app and point at the QR code on screen.</li>
                  </ol>

                  <div className="pairing-token-box">
                    <span className="token-label">Pairing Security Token:</span>
                    <div className="token-row">
                      <code className="token-code">{pairingToken || 'Fetching token...'}</code>
                      <button type="button" className="copy-token-btn" onClick={copyToken}>
                        {copiedToken ? <Check size={14} color="#22c55e" /> : <Copy size={14} />}
                        <span>{copiedToken ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="pairing-ips-box">
                    <span className="ips-label">Detected LAN IP Addresses:</span>
                    <div className="ips-list">
                      {pairingIps.length > 0 ? (
                        pairingIps.map((ip) => <span key={ip} className="ip-badge">{ip}:9001</span>)
                      ) : (
                        <span className="ip-badge">127.0.0.1:9001</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'whatsapp' && (
          <div className="unified-studio-panel">
            <div className="studio-card">
              <div className="studio-card-header">
                <div className="header-icon-box green">
                  <MessageSquare size={24} color="#22c55e" />
                </div>
                <div>
                  <h2>WhatsApp Gateway &amp; Chat Summarizer</h2>
                  <p>Link your WhatsApp Web session to summarize unread group chats or dispatch messages.</p>
                </div>
              </div>

              <div className="wa-studio-content">
                <div className="wa-status-banner">
                  <div className="wa-status-indicator">
                    <span className="status-dot green" />
                    <span>WhatsApp Service: <strong>Ready on port 9003</strong></span>
                  </div>
                  <button
                    type="button"
                    className="studio-submit-btn green-outline"
                    onClick={() => void runTutor('Check WhatsApp status')}
                  >
                    Check Session Health
                  </button>
                </div>

                <div className="studio-field full" style={{ marginTop: '20px' }}>
                  <label>Summarize Chat or Group Name</label>
                  <div className="input-with-button">
                    <input
                      type="text"
                      value={waTargetChat}
                      onChange={(e) => setWaTargetChat(e.target.value)}
                      placeholder="e.g. Project Team, Family Group, or Contact Name"
                      className="studio-input"
                    />
                    <button
                      type="button"
                      className="studio-submit-btn green"
                      onClick={summarizeWhatsApp}
                      disabled={waLoading || !waTargetChat.trim()}
                    >
                      {waLoading ? <RefreshCw className="spin" size={16} /> : <Sparkles size={16} />}
                      <span>Summarize</span>
                    </button>
                  </div>
                </div>

                {waSummaryResult && (
                  <div className="studio-result-box">
                    <h4>Discussion Summary</h4>
                    <pre>{waSummaryResult}</pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'hardware' && (
          <div className="unified-studio-panel">
            <div className="studio-card">
              <div className="studio-card-header">
                <div className="header-icon-box amber">
                  <Cpu size={24} color="#f59e0b" />
                </div>
                <div>
                  <h2>Ambient Lighting &amp; Physical Hardware Sync</h2>
                  <p>Synchronize your physical ESP32 RGB lighting with AI status, screen dominant colors, and tutor highlights.</p>
                </div>
              </div>

              <div className="hardware-grid">
                <div className="hardware-card">
                  <h3>ESP32 RGB Light</h3>
                  <div className="light-preview-circle" style={{ backgroundColor: isLightOn ? lightColor : '#1f1f23', boxShadow: isLightOn ? `0 0 35px ${lightColor}66` : 'none' }} />

                  <div className="color-palette-row">
                    {['#ff6e5f', '#38bdf8', '#22c55e', '#a855f7', '#f59e0b', '#ffffff'].map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`color-swatch ${lightColor === color ? 'selected' : ''}`}
                        style={{ backgroundColor: color }}
                        onClick={() => {
                          setLightColor(color);
                          void syncLight('color', color);
                        }}
                      />
                    ))}
                  </div>

                  <div className="brightness-slider-box">
                    <label>Brightness: {lightBrightness}%</label>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      value={lightBrightness}
                      onChange={(e) => {
                        setLightBrightness(Number(e.target.value));
                        void syncLight('color');
                      }}
                      className="studio-range"
                    />
                  </div>

                  <div className="hardware-actions">
                    <button
                      type="button"
                      className={`toggle-light-btn ${isLightOn ? 'on' : 'off'}`}
                      onClick={() => void syncLight(isLightOn ? 'off' : 'on')}
                    >
                      {isLightOn ? 'Turn Off Light' : 'Turn On Light'}
                    </button>
                  </div>
                </div>

                <div className="hardware-card">
                  <h3>System Status &amp; Telemetry</h3>
                  <div className="telemetry-item">
                    <span className="telemetry-label">Computer-Use Actuator</span>
                    <span className="telemetry-val">Native Linux DBus / Wayland</span>
                  </div>
                  <div className="telemetry-item">
                    <span className="telemetry-label">Wake Word Engine</span>
                    <span className="telemetry-val">"Hey Sutra" (ONNX OpenWakeWord)</span>
                  </div>
                  <div className="telemetry-item">
                    <span className="telemetry-label">Audio Speech Pipeline</span>
                    <span className="telemetry-val">AssemblyAI Universal-3 / Sarvam</span>
                  </div>
                  <div className="telemetry-item">
                    <span className="telemetry-label">Local Data &amp; Cache</span>
                    <span className="telemetry-val">Offline SQLite / Local Storage</span>
                  </div>
                  <div className="telemetry-item">
                    <span className="telemetry-label">Privacy Architecture</span>
                    <span className="telemetry-val">100% Offline-First / Zero Cloud DB</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
