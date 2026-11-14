import React, { useState } from 'react';
import {
  Zap,
  Play,
  ShieldCheck,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import type { AutomationOpportunity, AutomationRecommendation } from '../lib/tauri';
import { predictExecuteRecommendation } from '../lib/tauri';

interface AutomationRecommendationsProps {
  opportunities: AutomationOpportunity[];
  recommendations: AutomationRecommendation[];
  onActionCompleted?: () => void;
}

export const AutomationRecommendations: React.FC<AutomationRecommendationsProps> = ({
  opportunities,
  recommendations,
  onActionCompleted
}) => {
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ id: string; text: string; success: boolean } | null>(null);

  const handleExecute = async (rec: AutomationRecommendation) => {
    const confirmed = window.confirm(
      `USER AUTHORIZATION REQUIRED:\n\nExecute tool: '${rec.tool_name}'\nTarget: ${rec.title}\n\nProceed with automated execution?`
    );
    if (!confirmed) return;

    setExecutingId(rec.recommendation_id);
    setStatusMessage(null);

    try {
      const res = await predictExecuteRecommendation(
        rec.recommendation_id,
        rec.tool_name,
        rec.tool_args,
        true
      );
      if (res.success) {
        setStatusMessage({
          id: rec.recommendation_id,
          text: `Executed ${rec.tool_name} successfully.`,
          success: true
        });
        onActionCompleted?.();
      } else {
        setStatusMessage({
          id: rec.recommendation_id,
          text: `Execution failed: ${res.error || 'Unknown error'}`,
          success: false
        });
      }
    } catch (err: any) {
      setStatusMessage({
        id: rec.recommendation_id,
        text: `Execution error: ${err?.message || err}`,
        success: false
      });
    } finally {
      setExecutingId(null);
    }
  };

  if (opportunities.length === 0 && recommendations.length === 0) {
    return (
      <div className="predict-card predict-empty-card">
        <Zap size={24} className="text-muted" />
        <div className="predict-empty-content">
          <h4>No Automation Opportunities Flagged Yet</h4>
          <p>
            When Sutra identifies multi-step task sequences repeated with high consistency, it will
            recommend 1-click automations verified against registered agent tools.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="predict-recommendations-container">
      {/* Active Executable Recommendations */}
      {recommendations.length > 0 && (
        <div className="predict-card">
          <div className="predict-card-header">
            <div className="predict-badge-group">
              <Zap size={14} className="text-accent" style={{ marginRight: 6 }} />
              <h4 className="predict-section-title">Executable Automation Recommendations</h4>
            </div>
            <span className="predict-count-badge">{recommendations.length} available</span>
          </div>

          <div className="predict-rec-list">
            {recommendations.map((rec) => (
              <div key={rec.recommendation_id} className="predict-rec-card">
                <div className="predict-rec-info">
                  <div className="predict-rec-top">
                    <span className="predict-rec-name">{rec.title}</span>
                    <span className="predict-verified-badge">
                      <ShieldCheck size={12} style={{ marginRight: 4 }} />
                      Verified: {rec.tool_name}
                    </span>
                  </div>
                  <p className="predict-rec-summary">{rec.description}</p>
                  <div className="predict-args-preview">
                    <code>{JSON.stringify(rec.tool_args)}</code>
                  </div>
                </div>

                <div className="predict-rec-action-col">
                  <button
                    type="button"
                    className="predict-btn predict-btn-accent"
                    onClick={() => handleExecute(rec)}
                    disabled={executingId === rec.recommendation_id}
                  >
                    {executingId === rec.recommendation_id ? (
                      <>
                        <Loader2 size={13} className="spin" style={{ marginRight: 6 }} />
                        Running...
                      </>
                    ) : (
                      <>
                        <Play size={13} style={{ marginRight: 6 }} />
                        Execute Tool
                      </>
                    )}
                  </button>
                  <span className="predict-auth-subtext">Requires user approval</span>
                </div>

                {statusMessage && statusMessage.id === rec.recommendation_id && (
                  <div
                    className={`predict-feedback-banner ${
                      statusMessage.success ? 'predict-banner-success' : 'predict-banner-error'
                    }`}
                  >
                    {statusMessage.success ? (
                      <CheckCircle size={13} style={{ marginRight: 6 }} />
                    ) : (
                      <AlertCircle size={13} style={{ marginRight: 6 }} />
                    )}
                    {statusMessage.text}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Discovered Opportunities */}
      {opportunities.length > 0 && (
        <div className="predict-card">
          <div className="predict-card-header">
            <div className="predict-badge-group">
              <Clock size={14} className="text-accent" style={{ marginRight: 6 }} />
              <h4 className="predict-section-title">Repetitive Workflow Candidates</h4>
            </div>
          </div>

          <div className="predict-opp-grid">
            {opportunities.map((opp) => (
              <div key={opp.opportunity_id} className="predict-opp-card">
                <div className="predict-opp-header">
                  <span className="predict-opp-title">{opp.title}</span>
                  <span className="predict-saved-badge">
                    ~{Math.round(opp.estimated_seconds_saved)}s saved
                  </span>
                </div>
                <p className="predict-opp-desc">{opp.description}</p>
                <div className="predict-opp-steps">
                  {opp.sequence.map((step, idx) => (
                    <span key={idx} className="predict-opp-pill">
                      {step}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
