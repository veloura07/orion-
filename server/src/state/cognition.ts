import { eventBus } from '../events/bus.js';
import { worldModel, WorldState } from './world.js';

export interface Goal {
  id: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'abandoned';
}

export interface AgentStatus {
  name: string;
  status: 'idle' | 'started' | 'thinking' | 'complete' | 'error';
  lastAction: string;
}

export interface CognitiveRuntime {
  worldState: WorldState;
  activeGoals: Goal[];
  activeAgents: AgentStatus[];
  predictionState: {
    predictedNextActions: string[];
    confidence: number; // 0.0 to 1.0
  };
  emotionalState: {
    sentiment: string;
    energy: number;
  };
  executionQueue: string[];
  trustScore: number; // 0 to 100
}

export class CognitiveRuntimeStore {
  private static instance: CognitiveRuntimeStore;
  private state: CognitiveRuntime;

  private constructor() {
    this.state = {
      worldState: worldModel.getState(),
      activeGoals: [
        { id: 'g1', description: 'Monitor system performance & maintain RAG stability', status: 'active' }
      ],
      activeAgents: [
        { name: 'Sentinel', status: 'idle', lastAction: 'Idle.' },
        { name: 'Architect', status: 'idle', lastAction: 'Idle.' },
        { name: 'Researcher', status: 'idle', lastAction: 'Idle.' },
        { name: 'Coding', status: 'idle', lastAction: 'Idle.' },
        { name: 'Optimizer', status: 'idle', lastAction: 'Idle.' },
        { name: 'Creative', status: 'idle', lastAction: 'Idle.' },
        { name: 'Curator', status: 'idle', lastAction: 'Idle.' },
        { name: 'Deployment', status: 'idle', lastAction: 'Idle.' }
      ],
      predictionState: {
        predictedNextActions: ['View memory visualizer', 'Run system build checks'],
        confidence: 0.92
      },
      emotionalState: {
        sentiment: 'neutral',
        energy: 0.8
      },
      executionQueue: [],
      trustScore: 98 // highly confident safe state initially
    };

    // Keep worldState reference in sync
    eventBus.subscribe('WORLD_STATE_CHANGED', (ws) => {
      this.update((s) => {
        s.worldState = ws;
      });
    });
  }

  public static getInstance(): CognitiveRuntimeStore {
    if (!CognitiveRuntimeStore.instance) {
      CognitiveRuntimeStore.instance = new CognitiveRuntimeStore();
    }
    return CognitiveRuntimeStore.instance;
  }

  public getState(): CognitiveRuntime {
    return { ...this.state };
  }

  public update(updater: (state: CognitiveRuntime) => void): void {
    updater(this.state);
    eventBus.publish('COGNITIVE_STATE_CHANGED', this.state);
  }

  public updateAgent(name: string, status: AgentStatus['status'], lastAction: string): void {
    this.update((state) => {
      const idx = state.activeAgents.findIndex((a) => a.name === name);
      if (idx !== -1) {
        state.activeAgents[idx] = { name, status, lastAction };
      }
    });
  }

  public updateTrust(score: number): void {
    this.update((state) => {
      state.trustScore = Math.min(Math.max(score, 0), 100);
    });
  }

  public updatePredictions(actions: string[], confidence: number): void {
    this.update((state) => {
      state.predictionState = { predictedNextActions: actions, confidence };
    });
  }
}

export const cognitiveRuntime = CognitiveRuntimeStore.getInstance();
export default cognitiveRuntime;
