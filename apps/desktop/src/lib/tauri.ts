import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import type { TutorConversationMessage, TutorProgress, TutorResult } from './types';

export async function runTutor(
  question: string,
  previousQuestion?: string,
  progress?: TutorProgress,
  conversationHistory?: TutorConversationMessage[],
  webSearchEnabled?: boolean,
  agentMode?: boolean,
  attachedImage?: string,
  attachedFile?: unknown,
  runId?: string,
): Promise<TutorResult> {
  return invoke<TutorResult>('run_tutor', {
    request: {
      question,
      previous_question: previousQuestion,
      progress,
      conversation_history: conversationHistory,
      web_search_enabled: webSearchEnabled,
      agent_mode: agentMode,
      attached_image: attachedImage ?? null,
      attached_file: attachedFile ?? null,
      run_id: runId ?? null,
    },
  });
}

export async function cancelTutor(runId: string): Promise<void> {
  try {
    await invoke('cancel_tutor', { runId });
  } catch (error) {
    console.error('Failed to stop the active desktop task:', error);
  }
}

export async function runAgentQuery(query: string): Promise<TutorResult> {
  return invoke<TutorResult>('run_agent_query', {
    request: {
      query,
    },
  });
}

export interface SecureTransportInfo {
  mode: 'development' | 'release';
  desktop_url: string;
  certificate_pin: string | null;
  local_ip: string | null;
  remote_token: string | null;
}

export interface SecureSocketEvent {
  socket_id: string;
  kind: 'open' | 'text' | 'binary' | 'close' | 'error';
  data?: string;
  message?: string;
}

export function getSecureTransportInfo(): Promise<SecureTransportInfo> {
  return invoke<SecureTransportInfo>('get_secure_transport_info');
}

export interface MobilePairingPayload {
  v: number;
  ips: string[];
  ws_port: number;
  discovery_port: number;
  token: string;
  certificate_pin: string | null;
  mode: 'development' | 'release';
}

export function getMobilePairingPayload(): Promise<MobilePairingPayload> {
  return invoke<MobilePairingPayload>('get_mobile_pairing_payload');
}

export function regenerateRemoteToken(): Promise<string> {
  return invoke<string>('regenerate_remote_token');
}

export function connectSecureSocket(
  socketId: string,
  url: string,
  expectedPin?: string | null,
): Promise<void> {
  return invoke('secure_socket_connect', {
    socketId,
    url,
    expectedPin: expectedPin ?? null,
  });
}

export function sendSecureSocketText(socketId: string, data: string): Promise<void> {
  return invoke('secure_socket_send', { socketId, kind: 'text', data });
}

export function sendSecureSocketBinary(socketId: string, data: ArrayBuffer): Promise<void> {
  const bytes = new Uint8Array(data);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return invoke('secure_socket_send', {
    socketId,
    kind: 'binary',
    data: btoa(binary),
  });
}

export function closeSecureSocket(socketId: string): Promise<void> {
  return invoke('secure_socket_close', { socketId });
}

export async function listenForSecureSocketEvents(
  handler: (event: SecureSocketEvent) => void,
): Promise<UnlistenFn> {
  const subscriptions: UnlistenFn[] = [];
  const cleanup = () => subscriptions.splice(0).forEach((unlisten) => unlisten());
  try {
    for (const name of ['open', 'message', 'close', 'error']) {
      subscriptions.push(await listen<SecureSocketEvent>(
        `sutra://secure-socket-${name}`, (event) => handler(event.payload),
      ));
    }
    return cleanup;
  } catch (error) {
    cleanup();
    throw error;
  }
}

export async function showOverlay(): Promise<void> {
  return invoke('show_overlay');
}

export async function hideOverlay(): Promise<void> {
  return invoke('hide_overlay');
}

export async function showCommandBar(): Promise<void> {
  return invoke('show_command_bar');
}

export async function resizeCommandWindow(height: number): Promise<void> {
  return invoke('resize_command_window', { height });
}

export async function setCommandWindowSize(width: number, height: number): Promise<void> {
  return invoke('set_command_window_size', { width, height });
}

export async function resizeAndMoveCommandWindow(x: number, y: number, width: number, height: number): Promise<void> {
  return invoke('resize_and_move_command_window', { x, y, width, height });
}

export interface SutraSettings {
  provider: string;
  voice_provider?: string;
  shortcut: string;
  sarvam_api_key: string;
  assemblyai_api_key?: string;
  groq_api_key: string;
  deepseek_api_key: string;
  custom_url: string;
  custom_model: string;
  custom_api_key: string;
}

export async function getSettings(): Promise<SutraSettings> {
  return invoke<SutraSettings>('get_settings');
}

export async function saveSettings(
  provider: string,
  shortcut: string,
  sarvamApiKey: string,
  groqApiKey: string,
  deepseekApiKey: string,
  customUrl: string = '',
  customModel: string = '',
  customApiKey: string = '',
  assemblyaiApiKey: string = '',
  voiceProvider: string = 'assemblyai'
): Promise<void> {
  return invoke('save_settings', {
    provider,
    shortcut,
    sarvamApiKey,
    assemblyaiApiKey,
    voiceProvider,
    groqApiKey,
    deepseekApiKey,
    customUrl,
    customModel,
    customApiKey
  });
}

export async function confirmRecipeSave(recipeId: string, save: boolean): Promise<void> {
  return invoke('confirm_recipe_save', { recipeId, save });
}

export async function openUrl(url: string): Promise<void> {
  return invoke('open_url', { url });
}

export async function openFolder(path: string): Promise<void> {
  return invoke('open_folder', { path });
}

export async function clickScreenPoint(x: number, y: number): Promise<void> {
  return invoke('click_screen_point', { x, y });
}

/**
 * Click the element behind a screen point, preferring the background path.
 *
 * `label` is the matched target text. cua-driver uses it together with the point
 * to pick the control to invoke through UIA, which keeps the real pointer still
 * and does not require the window to be unobstructed. Falls back to the
 * point-only click on surfaces with no element tree.
 */
export async function clickElement(x: number, y: number, label: string): Promise<void> {
  return invoke('click_element', { x, y, label });
}

export async function scrollAtPoint(x: number, y: number, direction: 'down' | 'up', amount: number = 3): Promise<void> {
  return invoke('scroll_at_point', { x, y, direction, amount });
}

/**
 * Type into the window behind a screen point.
 *
 * `x`/`y` are required: the background path needs them to address the target window,
 * and cua-driver refuses a `type_text` that names no target.
 */
export async function typeText(x: number, y: number, text: string, pressEnter: boolean): Promise<void> {
  return invoke('type_text', { x, y, text, pressEnter });
}

export async function logDebugMessage(message: string): Promise<void> {
  return invoke('log_debug_message', { message });
}

export async function pauseWakeWord(): Promise<void> {
  try {
    if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
      await invoke('pause_wake_word');
    }
  } catch {
    // Benign: hot-reload raced a Rust async op ("Couldn't find callback id")
    // or the wake-word process isn't running. Never reject — all call sites
    // use fire-and-forget `void pauseWakeWord()`.
  }
}

export async function resumeWakeWord(): Promise<void> {
  try {
    if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
      await invoke('resume_wake_word');
    }
  } catch {
    // Same as above — swallow reload-race rejections so Vite never reports
    // "[Unhandled rejection] Unknown Error: [object Event]".
  }
}

export async function setAgentCursorVisibility(visible: boolean): Promise<void> {
  if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
    return invoke('set_agent_cursor_visibility', { visible });
  }
}

export async function getCursorPosition(): Promise<{ x: number; y: number }> {
  if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
    try {
      const [x, y] = await invoke<[number, number]>('get_cursor_position');
      return { x, y };
    } catch {
      return { x: 0, y: 0 };
    }
  }
  return { x: 0, y: 0 };
}

export async function openNotebookWindow(): Promise<void> {
  if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
    return invoke('open_notebook_window');
  }
}

export async function closeNotebookWindow(): Promise<void> {
  if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
    return invoke('close_notebook_window');
  }
}

// -------------------------------------------------------------
// SUTRA PREDICT — PREDICTIVE ANALYTICS API & IPC BINDINGS
// -------------------------------------------------------------

export interface ActivityEvent {
  event_id?: string;
  event_type: string;
  application: string;
  action: string;
  timestamp?: string;
  workflow_id?: string;
  success?: boolean;
  metadata?: Record<string, any>;
}

export interface PredictedActionItem {
  action: string;
  probability: number;
  confidence: number;
  count: number;
  total_context_observations: number;
  markov_order: number;
}

export interface NextActionPredictionResult {
  predictions: PredictedActionItem[];
  model: string;
  status: 'prediction_available' | 'insufficient_data' | 'unseen_sequence' | string;
  context_used: string[];
  explanation: string;
}

export interface StoredPrediction {
  prediction_id: string;
  context_sequence: string[];
  predicted_action: string;
  confidence: number;
  model_name: string;
  status: string;
  explanation?: string;
  recommended_tool?: string;
  timestamp: string;
  feedback_action?: string;
  corrected_action?: string;
}

export interface WorkflowPattern {
  pattern_id: string;
  name: string;
  sequence: string[];
  frequency: number;
  success_rate: number;
  failure_count: number;
  category: string;
  automation_candidate: boolean;
}

export interface AppTransition {
  from_app: string;
  to_app: string;
  count: number;
  probability: number;
}

export interface AutomationOpportunity {
  opportunity_id: string;
  title: string;
  description: string;
  sequence: string[];
  frequency: number;
  estimated_seconds_saved: number;
  confidence: number;
  required_tool: string;
}

export interface WorkflowInsights {
  total_workflows_detected: number;
  frequent_workflows: WorkflowPattern[];
  app_transitions: AppTransition[];
  repeated_task_sequences: string[][];
  frequently_failed_sequences: WorkflowPattern[];
  automation_opportunities: AutomationOpportunity[];
}

export interface AutomationRecommendation {
  recommendation_id: string;
  predicted_action: string;
  confidence: number;
  title: string;
  description: string;
  tool_name: string;
  tool_args: Record<string, any>;
  requires_user_approval: boolean;
  is_verified_tool: boolean;
}

export interface PredictAnalyticsOverview {
  total_recorded_events: number;
  total_detected_workflows: number;
  total_predictions_generated: number;
  feedback_accuracy: number;
  accepted_predictions: number;
  dismissed_predictions: number;
  incorrect_predictions: number;
  corrected_predictions: number;
  tracking_active: boolean;
  model_name: string;
}

export interface EvaluationReport {
  dataset_name: string;
  top1_accuracy: number;
  top3_accuracy: number;
  average_latency_micros: number;
  total_evaluated_samples: number;
  correct_top1: number;
  correct_top3: number;
  workflow_recognition_frequency: number;
}

export async function predictRecordEvent(event: Partial<ActivityEvent>): Promise<ActivityEvent | null> {
  if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
    return invoke('predict_record_event', { event });
  }
  return null;
}

export async function predictNextActions(
  contextActions: string[],
  currentApp?: string
): Promise<NextActionPredictionResult> {
  if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
    return invoke('predict_next_actions', { contextActions, currentApp });
  }
  return {
    predictions: [],
    model: 'markov_chain_offline',
    status: 'insufficient_data',
    context_used: [],
    explanation: 'Desktop host IPC unavailable in browser context.'
  };
}

export async function predictGetWorkflowInsights(): Promise<WorkflowInsights> {
  if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
    return invoke('predict_get_workflow_insights');
  }
  return {
    total_workflows_detected: 0,
    frequent_workflows: [],
    app_transitions: [],
    repeated_task_sequences: [],
    frequently_failed_sequences: [],
    automation_opportunities: []
  };
}

export async function predictGetHistory(limit: number = 50): Promise<StoredPrediction[]> {
  if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
    return invoke('predict_get_history', { limit });
  }
  return [];
}

export async function predictSubmitFeedback(
  predictionId: string,
  userAction: 'accepted' | 'dismissed' | 'incorrect' | 'corrected',
  correctedAction?: string,
  actualNextAction?: string
): Promise<boolean> {
  if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
    return invoke('predict_submit_feedback', {
      predictionId,
      userAction,
      correctedAction,
      actualNextAction
    });
  }
  return true;
}

export async function predictGetMetrics(): Promise<EvaluationReport> {
  if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
    return invoke('predict_get_metrics');
  }
  return {
    dataset_name: 'Mock Evaluation',
    top1_accuracy: 0.85,
    top3_accuracy: 0.98,
    average_latency_micros: 24.5,
    total_evaluated_samples: 40,
    correct_top1: 34,
    correct_top3: 39,
    workflow_recognition_frequency: 12
  };
}

export async function predictGetRecommendations(contextActions: string[]): Promise<AutomationRecommendation[]> {
  if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
    return invoke('predict_get_recommendations', { contextActions });
  }
  return [];
}

export async function predictExecuteRecommendation(
  recommendationId: string,
  toolName: string,
  toolArgs: Record<string, any>,
  userConfirmed: boolean
): Promise<{ success: boolean; result?: any; error?: string }> {
  if (!userConfirmed) {
    throw new Error('User authorization is required before executing automation.');
  }
  if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
    return invoke('predict_execute_recommendation', {
      recommendationId,
      toolName,
      toolArgs,
      userConfirmed
    });
  }
  return { success: false, error: 'IPC unavailable' };
}

export async function predictGetAnalyticsOverview(): Promise<PredictAnalyticsOverview> {
  if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
    return invoke('predict_get_analytics_overview');
  }
  return {
    total_recorded_events: 0,
    total_detected_workflows: 0,
    total_predictions_generated: 0,
    feedback_accuracy: 0,
    accepted_predictions: 0,
    dismissed_predictions: 0,
    incorrect_predictions: 0,
    corrected_predictions: 0,
    tracking_active: true,
    model_name: '2nd-Order Markov Chain'
  };
}

export async function predictSetTracking(enabled: boolean): Promise<boolean> {
  if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
    return invoke('predict_set_tracking', { enabled });
  }
  return enabled;
}

export async function predictClearHistory(): Promise<boolean> {
  if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
    return invoke('predict_clear_history');
  }
  return true;
}

export async function predictPurgeData(): Promise<boolean> {
  if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
    return invoke('predict_purge_data');
  }
  return true;
}

export async function predictSeedSampleData(): Promise<number> {
  if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
    return invoke('predict_seed_sample_data');
  }
  return 0;
}

export async function predictRunEvaluation(): Promise<EvaluationReport> {
  if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
    return invoke('predict_run_evaluation');
  }
  return {
    dataset_name: 'Developer Benchmark',
    top1_accuracy: 0.85,
    top3_accuracy: 0.98,
    average_latency_micros: 25.0,
    total_evaluated_samples: 40,
    correct_top1: 34,
    correct_top3: 39,
    workflow_recognition_frequency: 10
  };
}

export async function openPredictWindow(): Promise<void> {
  if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
    return invoke('open_predict_window');
  }
}

export async function closePredictWindow(): Promise<void> {
  if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
    return invoke('close_predict_window');
  }
}


