import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const DATA_DIR = path.resolve(__dirname, 'data');
const LEADERBOARD_FILE = path.join(DATA_DIR, 'leaderboard.json');

export interface LeaderboardRecord {
  id: string;
  name: string;
  tableNumber: string;
  score: number;
  character: 'dove' | 'couple';
  updatedAt: string;
}

const SEED_ENTRIES: LeaderboardRecord[] = [
  {
    id: 'seed-1',
    name: '伴郎团 Kevin',
    tableNumber: '主桌 VIP',
    score: 18,
    character: 'couple',
    updatedAt: '2026-12-19T08:15:00.000Z',
  },
  {
    id: 'seed-2',
    name: '伴娘 Chloe',
    tableNumber: 'Table 2',
    score: 14,
    character: 'dove',
    updatedAt: '2026-12-19T08:18:00.000Z',
  },
  {
    id: 'seed-3',
    name: 'S & J',
    tableNumber: 'Sweetheart',
    score: 12,
    character: 'couple',
    updatedAt: '2026-12-19T08:10:00.000Z',
  },
  {
    id: 'seed-4',
    name: 'Momo',
    tableNumber: 'Table 5',
    score: 9,
    character: 'dove',
    updatedAt: '2026-12-19T08:22:00.000Z',
  },
  {
    id: 'seed-5',
    name: 'Uncle Lin',
    tableNumber: 'Table 1',
    score: 6,
    character: 'dove',
    updatedAt: '2026-12-19T08:25:00.000Z',
  },
];

async function ensureLeaderboardFile(): Promise<LeaderboardRecord[]> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await fs.readFile(LEADERBOARD_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // Initialize seed data when file doesn't exist or is unreadable
  }
  await writeLeaderboardAtomic(SEED_ENTRIES);
  return SEED_ENTRIES;
}

async function writeLeaderboardAtomic(records: LeaderboardRecord[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tempPath = `${LEADERBOARD_FILE}.${Date.now()}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(records, null, 2), 'utf-8');
  await fs.rename(tempPath, LEADERBOARD_FILE);
}

function sortRecords(records: LeaderboardRecord[]): LeaderboardRecord[] {
  return [...records].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
  });
}

async function createServer() {
  const app = express();
  app.use(express.json({ limit: '64kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/leaderboard', async (_req, res) => {
    try {
      const records = await ensureLeaderboardFile();
      const sorted = sortRecords(records).slice(0, 10);
      res.json({ entries: sorted, totalPlayers: records.length });
    } catch (error) {
      console.error('Failed to read leaderboard:', error);
      res.status(500).json({ error: 'Unable to load leaderboard' });
    }
  });

  app.post('/api/leaderboard', async (req, res) => {
    try {
      const rawName = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
      const rawTable = typeof req.body?.tableNumber === 'string' ? req.body.tableNumber.trim() : '';
      const rawScore = Number(req.body?.score);
      const rawCharacter = req.body?.character === 'couple' ? 'couple' : 'dove';

      if (!rawName || rawName.length > 24) {
        res.status(400).json({ error: 'Please enter a valid nickname (1-24 characters).' });
        return;
      }

      if (!Number.isFinite(rawScore) || rawScore < 0 || rawScore > 9999) {
        res.status(400).json({ error: 'Invalid score value.' });
        return;
      }

      const cleanScore = Math.floor(rawScore);
      const cleanTable = rawTable.slice(0, 12);
      const records = await ensureLeaderboardFile();

      const normalizedKey = `${rawName.toLowerCase()}::${cleanTable.toLowerCase()}`;
      const existingIndex = records.findIndex(
        (entry) => `${entry.name.toLowerCase()}::${entry.tableNumber.toLowerCase()}` === normalizedKey,
      );

      let updatedEntry: LeaderboardRecord;
      if (existingIndex >= 0) {
        const existing = records[existingIndex];
        if (cleanScore > existing.score) {
          updatedEntry = {
            ...existing,
            name: rawName,
            tableNumber: cleanTable,
            score: cleanScore,
            character: rawCharacter,
            updatedAt: new Date().toISOString(),
          };
          records[existingIndex] = updatedEntry;
        } else {
          updatedEntry = existing;
        }
      } else {
        updatedEntry = {
          id: `guest-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: rawName,
          tableNumber: cleanTable,
          score: cleanScore,
          character: rawCharacter,
          updatedAt: new Date().toISOString(),
        };
        records.push(updatedEntry);
      }

      const sortedAll = sortRecords(records).slice(0, 100);
      await writeLeaderboardAtomic(sortedAll);

      const topTen = sortedAll.slice(0, 10);
      const rankIndex = sortedAll.findIndex((entry) => entry.id === updatedEntry.id);

      res.json({
        entries: topTen,
        playerRank: rankIndex >= 0 ? rankIndex + 1 : null,
        playerBest: updatedEntry.score,
        totalPlayers: sortedAll.length,
      });
    } catch (error) {
      console.error('Failed to save score:', error);
      res.status(500).json({ error: 'Unable to save score' });
    }
  });

  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`S & J Garden Wedding server running on http://0.0.0.0:${PORT}`);
  });
}

createServer().catch((err) => {
  console.error('Server startup error:', err);
  process.exit(1);
});
