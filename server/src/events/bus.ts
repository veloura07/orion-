type EventCallback = (data: any) => void;

export class OrionEventBus {
  private static instance: OrionEventBus;
  private listeners: Map<string, Set<EventCallback>> = new Map();

  private constructor() {}

  public static getInstance(): OrionEventBus {
    if (!OrionEventBus.instance) {
      OrionEventBus.instance = new OrionEventBus();
    }
    return OrionEventBus.instance;
  }

  public subscribe(event: string, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      const set = this.listeners.get(event);
      if (set) {
        set.delete(callback);
        if (set.size === 0) {
          this.listeners.delete(event);
        }
      }
    };
  }

  public publish(event: string, data: any): void {
    const set = this.listeners.get(event);
    if (set) {
      set.forEach((cb) => {
        try {
          cb(data);
        } catch (err) {
          console.error(`Error in event callback for event ${event}:`, err);
        }
      });
    }

    // Wildcard listeners
    const wildcards = this.listeners.get('*');
    if (wildcards) {
      wildcards.forEach((cb) => {
        try {
          cb({ event, data });
        } catch (err) {
          console.error(`Error in wildcard callback for event ${event}:`, err);
        }
      });
    }
  }
}

export const eventBus = OrionEventBus.getInstance();
