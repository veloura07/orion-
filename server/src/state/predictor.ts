import { eventBus } from '../events/bus.js';
import { cognitiveRuntime } from './cognition.js';

export interface TemporalEvent {
  timestamp: number;
  action: string;
  consequence: string;
  confidence: number;
}

export class PredictiveEngine {
  private static instance: PredictiveEngine;
  private eventHistory: TemporalEvent[] = [];

  private constructor() {
    // Monitor screen events and other triggers to build prediction mappings
    eventBus.subscribe('*', (payload: any) => {
      if (payload?.event) {
        this.recordEvent(payload.event, `Triggered backend flow for ${payload.event}`);
      }
    });
  }

  public static getInstance(): PredictiveEngine {
    if (!PredictiveEngine.instance) {
      PredictiveEngine.instance = new PredictiveEngine();
    }
    return PredictiveEngine.instance;
  }

  public recordEvent(action: string, consequence: string, confidence = 0.85): void {
    const event: TemporalEvent = {
      timestamp: Date.now(),
      action,
      consequence,
      confidence
    };
    this.eventHistory.push(event);
    if (this.eventHistory.length > 50) this.eventHistory.shift();

    this.evaluateBehaviorPatterns();
  }

  private evaluateBehaviorPatterns(): void {
    // Analyze recent events to forecast the next actions
    const recent = this.eventHistory.slice(-5);
    const actions = recent.map((e) => e.action);

    let predictions: string[] = [];
    let confidence = 0.75;

    // Pattern 1: User completes multiple searches -> suggest opening Memory Panel
    if (actions.filter((a) => a === 'WORLD_STATE_CHANGED').length >= 3) {
      predictions = ['Examine cognitive graph connections', 'Review recent memories list'];
      confidence = 0.88;
    } 
    // Pattern 2: User triggers screen captures -> suggest checking active vision analysis
    else if (actions.includes('SCREEN_CHANGED')) {
      predictions = ['Extract screen text content', 'Review vision analysis tags'];
      confidence = 0.94;
    }
    // Default prediction
    else {
      predictions = ['Open Telemetry dashboard', 'Optimize workspace build logs'];
      confidence = 0.82;
    }

    cognitiveRuntime.updatePredictions(predictions, confidence);
  }

  public getHistory(): TemporalEvent[] {
    return [...this.eventHistory];
  }
}

export const predictiveEngine = PredictiveEngine.getInstance();
export default predictiveEngine;
