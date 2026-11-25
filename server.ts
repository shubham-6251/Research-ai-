import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  formatGeminiError,
  generateQuestionBank,
  generateSpeechAudio,
  initializeTopicKnowledge,
  streamTopicExpertReply,
} from './server/gemini';
import type {
  KnowledgeLevel,
  ResearchMode,
  ResponseSpeed,
  TopicKnowledgeStructure,
} from './src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/api/topic/initialize', async (req, res) => {
    try {
      const rawTopic = typeof req.body?.topic === 'string' ? req.body.topic.trim() : '';
      const rawLevel = req.body?.level as KnowledgeLevel | undefined;
      const level: KnowledgeLevel =
        rawLevel === 'beginner' ||
        rawLevel === 'intermediate' ||
        rawLevel === 'advanced' ||
        rawLevel === 'adaptive'
          ? rawLevel
          : 'adaptive';

      if (!rawTopic) {
        res.status(400).json({ error: 'Please enter a topic to begin.' });
        return;
      }

      if (rawTopic.length > 300) {
        res.status(400).json({ error: 'Topic must be 300 characters or fewer.' });
        return;
      }

      const knowledgeMap = await initializeTopicKnowledge(rawTopic, level);
      res.json({ knowledgeMap });
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  app.post('/api/topic/chat', async (req, res) => {
    const topic = typeof req.body?.topic === 'string' ? req.body.topic.trim() : '';
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    const level: KnowledgeLevel = req.body?.level ?? 'adaptive';
    const searchGrounding = Boolean(req.body?.searchGrounding ?? true);
    const responseSpeed: ResponseSpeed =
      req.body?.responseSpeed === 'fast' ? 'fast' : 'standard';
    const rawMode = req.body?.activeMode;
    const activeMode: ResearchMode =
      rawMode === 'research' ||
      rawMode === 'learn' ||
      rawMode === 'summarize' ||
      rawMode === 'analyze'
        ? rawMode
        : 'qa';
    const knowledgeMap = req.body?.knowledgeMap as TopicKnowledgeStructure | undefined;
    const exploredItems = Array.isArray(req.body?.exploredItems) ? req.body.exploredItems : [];
    const history = Array.isArray(req.body?.history) ? req.body.history : [];

    if (!topic || !message || !knowledgeMap) {
      res.status(400).json({ error: 'Topic, knowledge map, and message are required.' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const sendEvent = (payload: Record<string, unknown>) => {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    try {
      const result = await streamTopicExpertReply({
        topic,
        level,
        searchGrounding,
        responseSpeed,
        activeMode,
        knowledgeMap,
        exploredItems,
        history,
        message,
        onChunk: (text) => {
          sendEvent({ type: 'chunk', text });
        },
        onFallback: (notice) => {
          sendEvent({
            type: 'fallback',
            searchGrounded: false,
            reason: notice.reason,
            noteLabel: notice.noteLabel,
            streamingMessage: notice.streamingMessage,
            completedMessage: notice.completedMessage,
          });
        },
      });

      sendEvent({
        type: 'done',
        sources: result.sources,
        modeLabel: result.modeLabel,
        command: result.command,
        searchGrounded: result.searchGrounded,
        responseSpeed: result.responseSpeed,
        searchFallback: result.searchFallback,
      });
      res.end();
    } catch (err) {
      const formatted = formatGeminiError(err);
      sendEvent({ type: 'error', error: formatted.message });
      res.end();
    }
  });

  app.post('/api/topic/tts', async (req, res) => {
    try {
      const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
      const voiceName = typeof req.body?.voiceName === 'string' ? req.body.voiceName : 'Kore';

      if (!text) {
        res.status(400).json({ error: 'Response text is required for speech synthesis.' });
        return;
      }

      const result = await generateSpeechAudio({ text, voiceName });
      res.json(result);
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  app.post('/api/topic/questions', async (req, res) => {
    try {
      const topic = typeof req.body?.topic === 'string' ? req.body.topic.trim() : '';
      const focus = typeof req.body?.focus === 'string' ? req.body.focus.trim() : topic;
      const rawLevel = req.body?.difficulty as KnowledgeLevel | undefined;
      const difficulty: KnowledgeLevel =
        rawLevel === 'beginner' ||
        rawLevel === 'intermediate' ||
        rawLevel === 'advanced' ||
        rawLevel === 'adaptive'
          ? rawLevel
          : 'adaptive';
      const knowledgeMap = req.body?.knowledgeMap as TopicKnowledgeStructure | undefined;

      if (!topic || !knowledgeMap) {
        res.status(400).json({ error: 'Topic and knowledge map are required.' });
        return;
      }

      const questionBank = await generateQuestionBank({
        topic,
        focus,
        difficulty,
        knowledgeMap,
      });
      res.json({ questionBank });
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
