import { eventBus } from '../events/bus.js';

export interface WorldState {
  user: {
    name: string;
    role: string;
  };
  workspace: {
    projectPath: string;
  };
  activeFiles: string[];
  tasks: { id: string; title: string; completed: boolean }[];
  goals: { id: string; description: string; status: string }[];
  emotionalState: {
    sentiment: string;
    energy: number; // 0.0 to 1.0
  };
  telemetry: {
    cpuLoad: number;
    memoryUsage: number; // in MB
    queryCount: number;
  };
}

export class WorldModelStore {
  private static instance: WorldModelStore;
  private state: WorldState;

  private constructor() {
    this.state = {
      user: {
        name: 'Namir',
        role: 'Orion Administrator',
      },
      workspace: {
        projectPath: 'project nexus',
      },
      activeFiles: ['App.tsx', 'index.css', 'chat.ts'],
      tasks: [
        { id: 't1', title: 'Scaffold Phase V2 World Model', completed: true },
        { id: 't2', title: 'Integrate Event Bus SSE channels', completed: true },
        { id: 't3', title: 'Verify telemetry updates in Cockpit panel', completed: false },
      ],
      goals: [
        { id: 'g1', description: 'Establish sovereign ambient OS capabilities', status: 'active' },
      ],
      emotionalState: {
        sentiment: 'calm',
        energy: 0.85,
      },
      telemetry: {
        cpuLoad: 12,
        memoryUsage: 148,
        queryCount: 0,
      },
    };

    // Periodically fluctuate telemetry metrics slightly to mimic real system activities
    setInterval(() => {
      this.updateTelemetry({
        cpuLoad: Math.min(Math.max(Math.floor(this.state.telemetry.cpuLoad + (Math.random() - 0.5) * 6), 5), 85),
        memoryUsage: Math.min(Math.max(this.state.telemetry.memoryUsage + Math.floor((Math.random() - 0.5) * 4), 120), 320),
      });
    }, 4000);
  }

  public static getInstance(): WorldModelStore {
    if (!WorldModelStore.instance) {
      WorldModelStore.instance = new WorldModelStore();
    }
    return WorldModelStore.instance;
  }

  public getState(): WorldState {
    return { ...this.state };
  }

  public update(updater: (state: WorldState) => void): void {
    updater(this.state);
    eventBus.publish('WORLD_STATE_CHANGED', this.state);
  }

  public updateTelemetry(metrics: Partial<WorldState['telemetry']>): void {
    this.update((state) => {
      state.telemetry = {
        ...state.telemetry,
        ...metrics,
      };
    });
  }

  public incrementQueries(): void {
    this.update((state) => {
      state.telemetry.queryCount += 1;
    });
  }

  public updateEmotionalState(sentiment: string, energy: number): void {
    this.update((state) => {
      state.emotionalState = { sentiment, energy };
    });
  }
}

export const worldModel = WorldModelStore.getInstance();
export default worldModel;
