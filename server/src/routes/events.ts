import { Router, Request, Response } from 'express';
import { eventBus } from '../events/bus.js';
import { worldModel } from '../state/world.js';
import { cognitiveRuntime } from '../state/cognition.js';
import { predictiveEngine } from '../state/predictor.js';

const router = Router();

// Stream of system state, cognitive metrics, and telemetry events
router.get('/events/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Send initial states
  res.write(`data: ${JSON.stringify({ type: 'world_state', data: worldModel.getState() })}\n\n`);
  res.write(`data: ${JSON.stringify({ type: 'cognitive_state', data: cognitiveRuntime.getState() })}\n\n`);

  // Subscribe to changes on the event bus
  const unsubscribeWorld = eventBus.subscribe('WORLD_STATE_CHANGED', (state) => {
    res.write(`data: ${JSON.stringify({ type: 'world_state', data: state })}\n\n`);
  });

  const unsubscribeCognition = eventBus.subscribe('COGNITIVE_STATE_CHANGED', (state) => {
    res.write(`data: ${JSON.stringify({ type: 'cognitive_state', data: state })}\n\n`);
  });

  // Keep-alive heartbeat interval every 20 seconds
  const heartbeat = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: 'ping' })}\n\n`);
  }, 20000);

  req.on('close', () => {
    unsubscribeWorld();
    unsubscribeCognition();
    clearInterval(heartbeat);
    res.end();
  });
});

// Endpoint to publish event updates from the client
router.post('/events/publish', (req: Request, res: Response) => {
  const { event, data } = req.body as { event: string; data: any };
  if (!event) {
    return res.status(400).json({ error: 'event parameter is required' });
  }

  // Record action timeline
  predictiveEngine.recordEvent(event, `Client update: ${JSON.stringify(data || {})}`);

  // Inject logical triggers based on event inputs
  if (event === 'TASK_COMPLETED' && data?.id) {
    worldModel.update((state) => {
      const task = state.tasks.find((t) => t.id === data.id);
      if (task) task.completed = true;
    });
  } else if (event === 'SCREEN_CHANGED' || event === 'USER_FOCUS_CHANGED') {
    worldModel.updateTelemetry({ cpuLoad: Math.min(worldModel.getState().telemetry.cpuLoad + 15, 95) });
  }

  // Publish to central event bus
  eventBus.publish(event, data);

  res.json({ success: true });
});

export default router;
