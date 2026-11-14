import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Award,
  Heart,
  Play,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Trophy,
  User,
  Volume2,
  VolumeX,
} from 'lucide-react';
import backdropImgSrc from '../assets/images/garden_game_backdrop_1794666770712.jpg';
import type { CharacterId, LeaderboardEntry } from '../data/weddingData';
import { soundEngine } from '../utils/sound';

type GamePhase = 'READY' | 'PLAYING' | 'GAME_OVER';
type ObstacleTheme = 'arch' | 'cake' | 'champagne';

interface PipePair {
  x: number;
  width: number;
  gapY: number;
  gapHeight: number;
  passed: boolean;
  theme: ObstacleTheme;
}

interface BonusItem {
  x: number;
  y: number;
  kind: 'ring' | 'heart';
  collected: boolean;
  bobOffset: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  life: number;
  color: string;
}

interface Petal {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vRot: number;
  size: number;
  color: string;
}

const LOGICAL_W = 420;
const LOGICAL_H = 560;
const GROUND_H = 68;
const PLAY_H = LOGICAL_H - GROUND_H;
const PLAYER_X = 108;
const PLAYER_RADIUS = 16;

const STORAGE_PROFILE_KEY = 'sj_wedding_player_profile';
const STORAGE_BEST_KEY = 'sj_wedding_personal_best';
const STORAGE_LOCAL_BOARD_KEY = 'sj_wedding_leaderboard_cache';

const DEFAULT_FALLBACK_BOARD: LeaderboardEntry[] = [
  {
    id: 'fallback-1',
    name: '伴郎团 Kevin',
    tableNumber: '主桌 VIP',
    score: 18,
    character: 'couple',
    updatedAt: '2026-12-19T08:15:00.000Z',
  },
  {
    id: 'fallback-2',
    name: '伴娘 Chloe',
    tableNumber: 'Table 2',
    score: 14,
    character: 'dove',
    updatedAt: '2026-12-19T08:18:00.000Z',
  },
  {
    id: 'fallback-3',
    name: 'S & J',
    tableNumber: 'Sweetheart',
    score: 12,
    character: 'couple',
    updatedAt: '2026-12-19T08:10:00.000Z',
  },
];

export const FlappyLoveTab: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bgImgRef = useRef<HTMLImageElement | null>(null);

  const [guestName, setGuestName] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PROFILE_KEY);
      if (saved) return JSON.parse(saved).name || '';
    } catch {
      // ignore
    }
    return '';
  });

  const [tableNumber, setTableNumber] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PROFILE_KEY);
      if (saved) return JSON.parse(saved).tableNumber || '';
    } catch {
      // ignore
    }
    return '';
  });

  const [character, setCharacter] = useState<CharacterId>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PROFILE_KEY);
      if (saved) {
        const c = JSON.parse(saved).character;
        if (c === 'dove' || c === 'couple') return c;
      }
    } catch {
      // ignore
    }
    return 'couple';
  });

  const [phase, setPhase] = useState<GamePhase>('READY');
  const [score, setScore] = useState<number>(0);
  const [personalBest, setPersonalBest] = useState<number>(() => {
    try {
      return Number(localStorage.getItem(STORAGE_BEST_KEY) || 0) || 0;
    } catch {
      return 0;
    }
  });
  const [muted, setMuted] = useState<boolean>(() => soundEngine.isMuted());

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingBoard, setLoadingBoard] = useState<boolean>(true);
  const [submittingScore, setSubmittingScore] = useState<boolean>(false);
  const [lastRank, setLastRank] = useState<number | null>(null);
  const [nameError, setNameError] = useState<string>('');
  const [showProfilePrompt, setShowProfilePrompt] = useState<boolean>(false);
  const [pendingSubmitScore, setPendingSubmitScore] = useState<number | null>(null);

  // Mutable simulation state inside ref for zero-jank 60fps loop
  const simRef = useRef({
    phase: 'READY' as GamePhase,
    character: character as CharacterId,
    playerY: PLAY_H * 0.45,
    playerVy: 0,
    wingPhase: 0,
    score: 0,
    scrollX: 0,
    pipes: [] as PipePair[],
    bonuses: [] as BonusItem[],
    particles: [] as Particle[],
    floatingTexts: [] as FloatingText[],
    petals: Array.from({ length: 14 }, (_, i) => ({
      x: (i * 37) % LOGICAL_W,
      y: (i * 49) % PLAY_H,
      vx: -18 - (i % 4) * 6,
      vy: 14 + (i % 3) * 7,
      rot: i * 0.5,
      vRot: 0.8 + (i % 3) * 0.4,
      size: 4 + (i % 3) * 1.5,
      color: i % 2 === 0 ? '#F4B6BE' : '#F9D6DC',
    })) as Petal[],
    nextPipeTimer: 0.4,
    obstacleIndex: 0,
  });

  useEffect(() => {
    simRef.current.character = character;
  }, [character]);

  // Save guest profile automatically
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_PROFILE_KEY,
        JSON.stringify({ name: guestName, tableNumber, character }),
      );
    } catch {
      // ignore
    }
  }, [guestName, tableNumber, character]);

  // Load watercolor backdrop image for canvas
  useEffect(() => {
    const img = new Image();
    img.src = backdropImgSrc;
    img.onload = () => {
      bgImgRef.current = img;
    };
  }, []);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch('/api/leaderboard');
      if (!res.ok) throw new Error('Leaderboard unavailable');
      const data = await res.json();
      if (Array.isArray(data.entries)) {
        setLeaderboard(data.entries);
        try {
          localStorage.setItem(STORAGE_LOCAL_BOARD_KEY, JSON.stringify(data.entries));
        } catch {
          // ignore
        }
      }
    } catch {
      try {
        const cached = localStorage.getItem(STORAGE_LOCAL_BOARD_KEY);
        if (cached) {
          setLeaderboard(JSON.parse(cached));
        } else {
          setLeaderboard(DEFAULT_FALLBACK_BOARD);
        }
      } catch {
        setLeaderboard(DEFAULT_FALLBACK_BOARD);
      }
    } finally {
      setLoadingBoard(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
    const timer = window.setInterval(fetchLeaderboard, 15000);
    return () => window.clearInterval(timer);
  }, [fetchLeaderboard]);

  const submitScoreToServer = useCallback(
    async (finalScore: number, playerName: string, table: string, charId: CharacterId) => {
      const trimmed = playerName.trim();
      if (!trimmed) return;
      setSubmittingScore(true);
      try {
        const res = await fetch('/api/leaderboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: trimmed.slice(0, 24),
            tableNumber: table.trim().slice(0, 12),
            score: finalScore,
            character: charId,
          }),
        });
        if (!res.ok) throw new Error('Save failed');
        const data = await res.json();
        if (Array.isArray(data.entries)) {
          setLeaderboard(data.entries);
          try {
            localStorage.setItem(STORAGE_LOCAL_BOARD_KEY, JSON.stringify(data.entries));
          } catch {
            // ignore
          }
        }
        if (typeof data.playerRank === 'number') {
          setLastRank(data.playerRank);
        }
      } catch {
        // Fallback local update
        setLeaderboard((prev) => {
          const next = [
            ...prev.filter((e) => e.name.toLowerCase() !== trimmed.toLowerCase()),
            {
              id: `local-${Date.now()}`,
              name: trimmed,
              tableNumber: table.trim(),
              score: finalScore,
              character: charId,
              updatedAt: new Date().toISOString(),
            },
          ]
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);
          try {
            localStorage.setItem(STORAGE_LOCAL_BOARD_KEY, JSON.stringify(next));
          } catch {
            // ignore
          }
          return next;
        });
      } finally {
        setSubmittingScore(false);
      }
    },
    [],
  );

  const resetSimulation = useCallback((nextPhase: GamePhase) => {
    const sim = simRef.current;
    sim.phase = nextPhase;
    sim.playerY = PLAY_H * 0.44;
    sim.playerVy = 0;
    sim.pipes = [];
    sim.bonuses = [];
    sim.particles = [];
    sim.floatingTexts = [];
    sim.score = 0;
    sim.nextPipeTimer = 0.35;
    sim.obstacleIndex = 0;
    setScore(0);
    setLastRank(null);
    setPhase(nextPhase);
  }, []);

  const handleGameOver = useCallback(
    (finalScore: number) => {
      soundEngine.playCrash();
      setPhase('GAME_OVER');

      setPersonalBest((prevBest) => {
        const nextBest = Math.max(prevBest, finalScore);
        try {
          localStorage.setItem(STORAGE_BEST_KEY, String(nextBest));
        } catch {
          // ignore
        }
        return nextBest;
      });

      if (guestName.trim()) {
        submitScoreToServer(finalScore, guestName, tableNumber, simRef.current.character);
      } else if (finalScore > 0) {
        setPendingSubmitScore(finalScore);
        setShowProfilePrompt(true);
      }
    },
    [guestName, tableNumber, submitScoreToServer],
  );

  const triggerFlap = useCallback(() => {
    const sim = simRef.current;
    if (sim.phase === 'GAME_OVER') return;

    if (sim.phase === 'READY') {
      resetSimulation('PLAYING');
    }

    simRef.current.playerVy = -305;
    soundEngine.playFlap();

    // Soft feather/petal puff on flap
    for (let i = 0; i < 4; i++) {
      simRef.current.particles.push({
        x: PLAYER_X - 10,
        y: simRef.current.playerY + 4,
        vx: -45 - Math.random() * 45,
        vy: 15 + (Math.random() - 0.5) * 45,
        life: 0.45,
        maxLife: 0.45,
        color: simRef.current.character === 'couple' ? '#F49AA5' : '#FFFFFF',
        size: 3 + Math.random() * 2,
      });
    }
  }, [resetSimulation]);

  // Keyboard support (Space / ArrowUp)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        if (simRef.current.phase === 'GAME_OVER') {
          resetSimulation('READY');
        } else {
          triggerFlap();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [triggerFlap, resetSimulation]);

  // Main 60fps Canvas Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = LOGICAL_W * dpr;
    canvas.height = LOGICAL_H * dpr;

    let animId = 0;
    let lastTime = performance.now();

    const themes: ObstacleTheme[] = ['arch', 'cake', 'champagne'];

    const spawnPipe = () => {
      const sim = simRef.current;
      const gapHeight = Math.max(122, 146 - Math.min(20, sim.score * 0.6));
      const minGapY = 92 + gapHeight / 2;
      const maxGapY = PLAY_H - 86 - gapHeight / 2;
      const gapY = minGapY + Math.random() * (maxGapY - minGapY);
      const theme = themes[sim.obstacleIndex % themes.length];
      sim.obstacleIndex += 1;

      const pipeX = LOGICAL_W + 44;
      sim.pipes.push({
        x: pipeX,
        width: 58,
        gapY,
        gapHeight,
        passed: false,
        theme,
      });

      // Spawn a collectible ring or heart in ~65% of gaps or between gaps
      if (Math.random() < 0.68) {
        const offsetY = (Math.random() - 0.5) * (gapHeight * 0.42);
        sim.bonuses.push({
          x: pipeX + 29,
          y: gapY + offsetY,
          kind: sim.obstacleIndex % 2 === 0 ? 'ring' : 'heart',
          collected: false,
          bobOffset: Math.random() * Math.PI * 2,
        });
      }
    };

    const tick = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.04); // Prevent physics jump on tab switch
      const sim = simRef.current;

      // Update ambient petals always
      for (const p of sim.petals) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vRot * dt;
        if (p.x < -20 || p.y > PLAY_H + 10) {
          p.x = LOGICAL_W + Math.random() * 40;
          p.y = -10 + Math.random() * (PLAY_H * 0.5);
        }
      }

      // Update particles & floating texts
      sim.particles = sim.particles.filter((pt) => {
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.life -= dt;
        return pt.life > 0;
      });
      sim.floatingTexts = sim.floatingTexts.filter((ft) => {
        ft.y -= 28 * dt;
        ft.life -= dt;
        return ft.life > 0;
      });

      sim.wingPhase += dt * 11;

      if (sim.phase === 'READY') {
        sim.scrollX = (sim.scrollX + 52 * dt) % LOGICAL_W;
        sim.playerY = PLAY_H * 0.44 + Math.sin(now * 0.004) * 9;
      } else if (sim.phase === 'PLAYING') {
        const speed = 138 + Math.min(48, sim.score * 1.4);
        sim.scrollX = (sim.scrollX + speed * dt) % LOGICAL_W;

        // Gravity & velocity
        sim.playerVy += 880 * dt;
        sim.playerY += sim.playerVy * dt;

        // Spawn obstacles
        sim.nextPipeTimer -= dt;
        if (sim.nextPipeTimer <= 0) {
          spawnPipe();
          sim.nextPipeTimer = Math.max(1.38, 1.75 - Math.min(0.32, sim.score * 0.01));
        }

        // Move pipes & check scoring + collisions
        for (const pipe of sim.pipes) {
          pipe.x -= speed * dt;

          if (!pipe.passed && pipe.x + pipe.width < PLAYER_X) {
            pipe.passed = true;
            sim.score += 1;
            setScore(sim.score);
            soundEngine.playPoint();
          }

          // Forgiving circle-vs-rect collision
          const hitRadius = PLAYER_RADIUS - 3;
          const topBottom = pipe.gapY - pipe.gapHeight / 2;
          const bottomTop = pipe.gapY + pipe.gapHeight / 2;

          if (
            PLAYER_X + hitRadius > pipe.x + 4 &&
            PLAYER_X - hitRadius < pipe.x + pipe.width - 4
          ) {
            if (sim.playerY - hitRadius < topBottom || sim.playerY + hitRadius > bottomTop) {
              sim.phase = 'GAME_OVER';
              handleGameOver(sim.score);
            }
          }
        }
        sim.pipes = sim.pipes.filter((p) => p.x + p.width > -40);

        // Move bonuses & check pickups
        for (const b of sim.bonuses) {
          b.x -= speed * dt;
          if (!b.collected) {
            const bobY = b.y + Math.sin(now * 0.005 + b.bobOffset) * 5;
            const dist = Math.hypot(PLAYER_X - b.x, sim.playerY - bobY);
            if (dist < PLAYER_RADIUS + 14) {
              b.collected = true;
              sim.score += 2;
              setScore(sim.score);
              soundEngine.playBonus();
              sim.floatingTexts.push({
                x: b.x,
                y: bobY - 12,
                text: '+2',
                life: 0.75,
                color: b.kind === 'ring' ? '#C88428' : '#D95367',
              });
              for (let i = 0; i < 10; i++) {
                const angle = (Math.PI * 2 * i) / 10;
                sim.particles.push({
                  x: b.x,
                  y: bobY,
                  vx: Math.cos(angle) * (50 + Math.random() * 45),
                  vy: Math.sin(angle) * (50 + Math.random() * 45),
                  life: 0.5,
                  maxLife: 0.5,
                  color: b.kind === 'ring' ? '#F3C76B' : '#F48A94',
                  size: 3.5,
                });
              }
            }
          }
        }
        sim.bonuses = sim.bonuses.filter((b) => !b.collected && b.x > -30);

        // Ceiling / ground collision
        if (sim.playerY - PLAYER_RADIUS < 0) {
          sim.playerY = PLAYER_RADIUS;
          sim.playerVy = 0;
        }
        if (sim.playerY + PLAYER_RADIUS >= PLAY_H) {
          sim.playerY = PLAY_H - PLAYER_RADIUS;
          if (sim.phase === 'PLAYING') {
            sim.phase = 'GAME_OVER';
            handleGameOver(sim.score);
          }
        }
      }

      // ================= RENDER FRAME =================
      ctx.save();
      ctx.scale(dpr, dpr);

      // 1. Pastel Sky & Watercolor Backdrop
      const skyGrad = ctx.createLinearGradient(0, 0, 0, PLAY_H);
      skyGrad.addColorStop(0, '#FDF5EC');
      skyGrad.addColorStop(0.55, '#F9EBE6');
      skyGrad.addColorStop(1, '#E6F0E3');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

      if (bgImgRef.current) {
        ctx.save();
        ctx.globalAlpha = 0.42;
        const imgW = LOGICAL_W * 1.35;
        const offsetX = -(sim.scrollX * 0.25) % imgW;
        ctx.drawImage(bgImgRef.current, offsetX, 30, imgW, PLAY_H - 30);
        ctx.drawImage(bgImgRef.current, offsetX + imgW, 30, imgW, PLAY_H - 30);
        ctx.restore();
      }

      // 2. Twinkling Top Fairy String Lights
      ctx.save();
      ctx.strokeStyle = 'rgba(130, 102, 78, 0.35)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(0, 18);
      ctx.quadraticCurveTo(LOGICAL_W * 0.25, 42, LOGICAL_W * 0.5, 20);
      ctx.quadraticCurveTo(LOGICAL_W * 0.75, 42, LOGICAL_W, 18);
      ctx.stroke();

      for (let i = 1; i < 10; i++) {
        const bx = (LOGICAL_W / 10) * i;
        const t = (i % 5) / 5;
        const by = 18 + Math.sin(t * Math.PI) * 18;
        const glow = 0.55 + 0.45 * Math.sin(now * 0.004 + i * 1.1);
        ctx.fillStyle = `rgba(255, 224, 130, ${0.35 * glow})`;
        ctx.beginPath();
        ctx.arc(bx, by, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFF6CC';
        ctx.beginPath();
        ctx.arc(bx, by, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // 3. Distant Rolling Meadow & Floral Arch Silhouettes
      drawRollingHills(ctx, sim.scrollX * 0.45, PLAY_H);

      // 4. Floating Rose Petals
      for (const p of sim.petals) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.62, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 5. Wedding Obstacles (Floral Arches, Cakes, Champagne Towers)
      for (const pipe of sim.pipes) {
        drawWeddingObstacle(ctx, pipe, PLAY_H);
      }

      // 6. Collectible Golden Rings & Pink Hearts
      for (const b of sim.bonuses) {
        const bobY = b.y + Math.sin(now * 0.005 + b.bobOffset) * 5;
        drawCollectible(ctx, b.x, bobY, b.kind, now);
      }

      // 7. Rolling Foreground Garden Lawn
      drawForegroundLawn(ctx, sim.scrollX, PLAY_H, GROUND_H, LOGICAL_W);

      // 8. Particles
      for (const pt of sim.particles) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 9. Player Character (White Dove OR Chibi Couple with Heart Balloon)
      const tilt =
        sim.phase === 'READY'
          ? 0
          : Math.max(-0.42, Math.min(0.6, sim.playerVy * 0.0014));
      drawPlayerCharacter(
        ctx,
        PLAYER_X,
        sim.playerY,
        tilt,
        sim.wingPhase,
        sim.character,
      );

      // 10. Floating "+2" Bonus Texts
      for (const ft of sim.floatingTexts) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, ft.life * 1.5);
        ctx.font = 'bold 17px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      }

      ctx.restore();
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [handleGameOver]);

  const handleToggleMute = () => {
    const next = soundEngine.toggleMute();
    setMuted(next);
  };

  const handleSaveGuestAndSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = guestName.trim();
    if (!trimmed) {
      setNameError('请输入你的昵称 / Please enter your nickname');
      return;
    }
    setNameError('');
    setShowProfilePrompt(false);
    if (pendingSubmitScore !== null) {
      submitScoreToServer(pendingSubmitScore, trimmed, tableNumber, character);
      setPendingSubmitScore(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-3 sm:px-6 pb-24 lg:pb-12 pt-3 sm:pt-5">
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#2C2A29]">
            婚礼小游戏 · Flappy Love
          </h1>
          <p className="text-xs sm:text-sm text-[#6B6560] mt-0.5">
            穿越浪漫花门与甜点塔，收集金戒指与爱心 (+2) 冲击婚礼排行榜！
          </p>
        </div>

        <button
          type="button"
          onClick={handleToggleMute}
          className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white border border-[#E6DACB] text-xs sm:text-sm font-medium text-[#2C2A29] inline-flex items-center gap-2 hover:bg-[#F7F1E8] transition cursor-pointer shrink-0"
        >
          {muted ? (
            <>
              <VolumeX className="w-4 h-4 text-[#9E958D]" />
              <span>音效关 · Muted</span>
            </>
          ) : (
            <>
              <Volume2 className="w-4 h-4 text-[#D96B78]" />
              <span>音效开 · Sound On</span>
            </>
          )}
        </button>
      </div>

      {/* Main Layout: Game Stage + Guest Controls & Live Top 10 Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left/Top Column: Game Setup Bar + 60fps Canvas */}
        <div className="lg:col-span-7 flex flex-col gap-3.5">
          {/* Guest Name, Table & Character Picker */}
          <div className="rounded-2xl bg-white border border-[#E6DACB] p-3.5 sm:p-4 shadow-xs">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
              <div className="sm:col-span-5">
                <label
                  htmlFor="guest-nickname"
                  className="block text-xs font-medium text-[#6B6560] mb-1"
                >
                  嘉宾昵称 · Nickname
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#9E958D] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="guest-nickname"
                    type="text"
                    maxLength={24}
                    value={guestName}
                    onChange={(e) => {
                      setGuestName(e.target.value);
                      if (nameError) setNameError('');
                    }}
                    placeholder="输入你的名字…"
                    className="w-full h-11 pl-9 pr-3 rounded-xl bg-[#FCF9F4] border border-[#E3D7C8] text-sm text-[#2C2A29] placeholder:text-[#A89E94] focus:outline-none focus:border-[#D96B78]"
                  />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label
                  htmlFor="guest-table"
                  className="block text-xs font-medium text-[#6B6560] mb-1"
                >
                  桌号 (选填) · Table
                </label>
                <input
                  id="guest-table"
                  type="text"
                  maxLength={12}
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  placeholder="如 Table 3"
                  className="w-full h-11 px-3 rounded-xl bg-[#FCF9F4] border border-[#E3D7C8] text-sm text-[#2C2A29] placeholder:text-[#A89E94] focus:outline-none focus:border-[#D96B78]"
                />
              </div>

              {/* Character Picker */}
              <div className="sm:col-span-4">
                <span className="block text-xs font-medium text-[#6B6560] mb-1">
                  选择角色 · Character
                </span>
                <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#F6EFE6] border border-[#E8DDD0]">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setCharacter('couple');
                    }}
                    className={`h-9 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap px-2 ${
                      character === 'couple'
                        ? 'bg-white text-[#D96B78] shadow-xs'
                        : 'text-[#6B6560] hover:text-[#2C2A29]'
                    }`}
                  >
                    Q版新人
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      setCharacter('dove');
                    }}
                    className={`h-9 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap px-2 ${
                      character === 'dove'
                        ? 'bg-white text-[#5F8D6B] shadow-xs'
                        : 'text-[#6B6560] hover:text-[#2C2A29]'
                    }`}
                  >
                    白鸽衔戒
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* HTML5 Canvas Stage */}
          <div className="relative mx-auto w-full max-w-[460px] rounded-3xl overflow-hidden border-2 border-[#E6DACB] bg-[#FDF5EC] shadow-md select-none">
            {/* Live HUD Bar Inside Canvas Top */}
            <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
              <div className="rounded-xl bg-white/88 backdrop-blur-sm border border-[#E6DACB] px-3 py-1.5 shadow-xs">
                <span className="text-[11px] text-[#6B6560] mr-1.5">得分 Score</span>
                <span className="text-lg font-bold text-[#2C2A29] tabular-nums">{score}</span>
              </div>

              <div className="rounded-xl bg-white/88 backdrop-blur-sm border border-[#E6DACB] px-3 py-1.5 shadow-xs">
                <span className="text-[11px] text-[#6B6560] mr-1.5">最高 Best</span>
                <span className="text-lg font-bold text-[#D96B78] tabular-nums">
                  {Math.max(personalBest, score)}
                </span>
              </div>
            </div>

            <canvas
              ref={canvasRef}
              onPointerDown={(e) => {
                e.preventDefault();
                if (phase !== 'GAME_OVER') {
                  triggerFlap();
                }
              }}
              className="block w-full aspect-[3/4] touch-none cursor-pointer"
            />

            {/* Ready Overlay */}
            {phase === 'READY' && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-end pb-20 px-6 text-center">
                <div className="rounded-2xl bg-white/92 backdrop-blur-sm border border-[#E6DACB] px-5 py-4 shadow-md max-w-xs">
                  <p className="font-display text-xl font-bold text-[#2C2A29]">
                    点击屏幕或按空格起飞
                  </p>
                  <p className="text-xs text-[#6B6560] mt-1">
                    Tap anywhere or press Spacebar to flap
                  </p>
                  <div className="mt-2.5 flex items-center justify-center gap-3 text-[11px] font-medium text-[#7A6B5D]">
                    <span>花门/蛋糕 +1</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#D96B78]">戒指/爱心 +2</span>
                  </div>
                </div>
              </div>
            )}

            {/* Game Over Overlay */}
            {phase === 'GAME_OVER' && (
              <div className="absolute inset-0 z-20 bg-black/25 backdrop-blur-[2px] flex items-center justify-center p-5">
                <div className="w-full max-w-xs rounded-3xl bg-[#FFFDF9] border border-[#E6DACB] p-5 shadow-xl text-center">
                  <div className="w-11 h-11 rounded-2xl bg-[#FCECEE] text-[#D96B78] flex items-center justify-center mx-auto">
                    <Heart className="w-5 h-5 fill-[#D96B78]" />
                  </div>
                  <h2 className="font-display text-2xl font-bold text-[#2C2A29] mt-2.5">
                    甜蜜降落！
                  </h2>
                  <p className="text-xs text-[#6B6560]">Sweet Landing</p>

                  <div className="mt-4 grid grid-cols-2 gap-2.5 rounded-2xl bg-[#F8F3EC] p-3">
                    <div>
                      <p className="text-[11px] text-[#6B6560]">本局得分 · Score</p>
                      <p className="text-2xl font-bold text-[#2C2A29] tabular-nums">{score}</p>
                    </div>
                    <div className="border-l border-[#E5DACD]">
                      <p className="text-[11px] text-[#6B6560]">个人最佳 · Best</p>
                      <p className="text-2xl font-bold text-[#D96B78] tabular-nums">
                        {personalBest}
                      </p>
                    </div>
                  </div>

                  {lastRank !== null && (
                    <p className="mt-2.5 text-xs font-medium text-[#5F8D6B]">
                      {submittingScore
                        ? '正在同步排行榜…'
                        : `当前婚礼榜单第 #${lastRank} 名 · Ranked #${lastRank}`}
                    </p>
                  )}

                  {!guestName.trim() && !showProfilePrompt && (
                    <button
                      type="button"
                      onClick={() => {
                        setPendingSubmitScore(score);
                        setShowProfilePrompt(true);
                      }}
                      className="mt-3 w-full min-h-[40px] px-3 py-2 rounded-xl border border-[#E5B8BE] bg-[#FCF3F4] text-xs font-semibold text-[#B94A58] hover:bg-[#F9E6E8] transition cursor-pointer"
                    >
                      填写昵称登记排行榜 · Save to Leaderboard
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick();
                      resetSimulation('READY');
                    }}
                    className="mt-4 w-full min-h-[46px] px-5 py-2.5 rounded-xl bg-[#D96B78] hover:bg-[#C95C69] text-white font-semibold text-sm inline-flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>再来一局 · Play Again</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right/Bottom Column: Celebratory Message + Live Top 10 Leaderboard */}
        <div className="lg:col-span-5 flex flex-col gap-3.5">
          {/* Celebratory Wedding Message Card */}
          <div className="rounded-2xl bg-gradient-to-br from-[#FFF5F6] to-[#FCF7EC] border border-[#F0D9DC] p-4 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-[#F0D9DC] flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-[#D96B78]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#2C2A29] leading-snug">
                  趁着等待晚宴的时间来一局吧！最高分将获得 S &amp; J 准备的特别惊喜礼物！
                </p>
                <p className="text-xs text-[#6B6560] mt-1">
                  Play while waiting for the banquet! Highest score wins a special gift from S &amp; J!
                </p>
              </div>
            </div>
          </div>

          {/* Live Top 10 Leaderboard */}
          <div className="rounded-3xl bg-white border border-[#E6DACB] p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between gap-2 mb-3.5">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-[#D4A359]" />
                <div>
                  <h2 className="font-display text-xl font-bold text-[#2C2A29] leading-none">
                    婚礼英雄榜 · Top 10
                  </h2>
                  <p className="text-[11px] text-[#7A716A] mt-0.5">
                    实时同步全场宾客最高分 · Live Guest High Scores
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setLoadingBoard(true);
                  fetchLeaderboard();
                }}
                aria-label="Refresh leaderboard"
                className="w-10 h-10 rounded-xl border border-[#E8DDD0] hover:bg-[#F7F1E8] flex items-center justify-center text-[#6B6560] transition cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${loadingBoard ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {loadingBoard && leaderboard.length === 0 ? (
              <div className="py-10 text-center text-sm text-[#7A716A]">
                正在加载宾客战绩…
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="py-10 text-center text-sm text-[#7A716A]">
                暂无成绩，快来完成第一局抢占榜首！
              </div>
            ) : (
              <div className="divide-y divide-[#F2ECE3]">
                {leaderboard.map((entry, idx) => {
                  const rank = idx + 1;
                  const isMe =
                    guestName.trim() !== '' &&
                    entry.name.toLowerCase() === guestName.trim().toLowerCase();

                  return (
                    <div
                      key={entry.id}
                      className={`flex items-center justify-between gap-3 py-2.5 px-2.5 rounded-xl transition ${
                        isMe ? 'bg-[#FDF4F5]' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <RankMedallion rank={rank} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-[#2C2A29] truncate">
                              {entry.name}
                            </span>
                            {isMe && (
                              <span className="text-[11px] font-semibold text-[#D96B78]">
                                (你)
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#7A716A] truncate">
                            {entry.tableNumber ? `${entry.tableNumber} · ` : ''}
                            {entry.character === 'couple' ? 'Q版新人' : '白鸽衔戒'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-base font-bold text-[#2C2A29] tabular-nums">
                          {entry.score}
                        </span>
                        <span className="ml-1 text-[11px] text-[#8D847C]">pts</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal to prompt Guest Name when they finish a run without having typed one */}
      {showProfilePrompt && (
        <div className="fixed inset-0 z-50 bg-black/35 backdrop-blur-[2px] flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveGuestAndSubmit}
            className="w-full max-w-sm rounded-3xl bg-[#FFFDF9] border border-[#E6DACB] p-5 shadow-2xl"
          >
            <div className="flex items-center gap-2.5 mb-2">
              <Award className="w-5 h-5 text-[#D4A359]" />
              <h3 className="font-display text-xl font-bold text-[#2C2A29]">
                保存你的成绩！
              </h3>
            </div>
            <p className="text-xs text-[#6B6560] mb-4">
              本局获得 <strong className="text-[#D96B78] tabular-nums">{pendingSubmitScore}</strong> 分！留下昵称即可登上全场宾客排行榜。
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#6B6560] mb-1">
                  嘉宾昵称 · Nickname *
                </label>
                <input
                  type="text"
                  maxLength={24}
                  autoFocus
                  value={guestName}
                  onChange={(e) => {
                    setGuestName(e.target.value);
                    if (nameError) setNameError('');
                  }}
                  placeholder="例如: 小林 / Alex"
                  className="w-full h-11 px-3 rounded-xl bg-white border border-[#E3D7C8] text-sm focus:outline-none focus:border-[#D96B78]"
                />
                {nameError && <p className="mt-1 text-xs text-[#C94454]">{nameError}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-[#6B6560] mb-1">
                  桌号 (选填) · Table Number
                </label>
                <input
                  type="text"
                  maxLength={12}
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  placeholder="例如: Table 6"
                  className="w-full h-11 px-3 rounded-xl bg-white border border-[#E3D7C8] text-sm focus:outline-none focus:border-[#D96B78]"
                />
              </div>
            </div>

            <div className="mt-5 flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowProfilePrompt(false);
                  setPendingSubmitScore(null);
                }}
                className="flex-1 min-h-[44px] rounded-xl border border-[#E3D7C8] text-sm font-medium text-[#6B6560] hover:bg-[#F5EFE6] cursor-pointer"
              >
                跳过 · Skip
              </button>
              <button
                type="submit"
                className="flex-1 min-h-[44px] rounded-xl bg-[#D96B78] text-white text-sm font-semibold hover:bg-[#C95C69] inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                <span>提交上榜</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

const RankMedallion: React.FC<{ rank: number }> = ({ rank }) => {
  if (rank === 1) {
    return (
      <span className="w-7 h-7 rounded-full bg-gradient-to-br from-[#F7DC88] to-[#D4A33A] text-white font-bold text-xs tabular-nums flex items-center justify-center shadow-xs shrink-0">
        1
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="w-7 h-7 rounded-full bg-gradient-to-br from-[#E2E6EB] to-[#A6B0BD] text-white font-bold text-xs tabular-nums flex items-center justify-center shadow-xs shrink-0">
        2
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="w-7 h-7 rounded-full bg-gradient-to-br from-[#EBB793] to-[#C07C51] text-white font-bold text-xs tabular-nums flex items-center justify-center shadow-xs shrink-0">
        3
      </span>
    );
  }
  return (
    <span className="w-7 h-7 rounded-full bg-[#F5EFE6] text-[#6B6560] font-semibold text-xs tabular-nums flex items-center justify-center shrink-0">
      {rank}
    </span>
  );
};

// ================= CANVAS DRAWING HELPERS =================

function drawRollingHills(ctx: CanvasRenderingContext2D, scroll: number, playH: number) {
  ctx.save();
  // Far sage hill
  ctx.fillStyle = '#D2E2CA';
  ctx.beginPath();
  ctx.moveTo(0, playH);
  for (let x = 0; x <= LOGICAL_W + 20; x += 20) {
    const y = playH - 68 + Math.sin((x + scroll * 0.5) * 0.018) * 14;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(LOGICAL_W, playH);
  ctx.closePath();
  ctx.fill();

  // Distant floral arch silhouette
  const archX = ((LOGICAL_W * 0.72 - scroll * 0.35) % (LOGICAL_W + 120) + (LOGICAL_W + 120)) % (LOGICAL_W + 120) - 60;
  const archBaseY = playH - 60;
  ctx.strokeStyle = 'rgba(130, 166, 127, 0.55)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(archX, archBaseY - 12, 22, Math.PI, 0);
  ctx.stroke();
  ctx.fillStyle = 'rgba(242, 181, 188, 0.7)';
  for (let a = Math.PI; a <= Math.PI * 2; a += 0.6) {
    ctx.beginPath();
    ctx.arc(archX + Math.cos(a) * 22, archBaseY - 12 + Math.sin(a) * 22, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawForegroundLawn(
  ctx: CanvasRenderingContext2D,
  scroll: number,
  playH: number,
  groundH: number,
  width: number,
) {
  ctx.save();
  ctx.fillStyle = '#9DC296';
  ctx.fillRect(0, playH, width, groundH);

  // Darker lawn lip
  ctx.fillStyle = '#73A06E';
  ctx.fillRect(0, playH, width, 9);

  // Scalloped grass & tiny flowers
  const step = 28;
  const offset = -(scroll % step);
  for (let x = offset - step; x < width + step; x += step) {
    ctx.fillStyle = '#B8D6B1';
    ctx.beginPath();
    ctx.arc(x + 14, playH + 22, 10, Math.PI, 0);
    ctx.fill();

    // Little daisy / rose dot
    ctx.fillStyle = '#FFF7EB';
    ctx.beginPath();
    ctx.arc(x + 8, playH + 34, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#F2A3AE';
    ctx.beginPath();
    ctx.arc(x + 22, playH + 44, 2.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawWeddingObstacle(ctx: CanvasRenderingContext2D, pipe: PipePair, playH: number) {
  const topH = pipe.gapY - pipe.gapHeight / 2;
  const botY = pipe.gapY + pipe.gapHeight / 2;
  const botH = playH - botY;

  if (pipe.theme === 'arch') {
    drawFloralColumn(ctx, pipe.x, 0, pipe.width, topH, true);
    drawFloralColumn(ctx, pipe.x, botY, pipe.width, botH, false);
  } else if (pipe.theme === 'cake') {
    drawTieredCakeColumn(ctx, pipe.x, 0, pipe.width, topH, true);
    drawTieredCakeColumn(ctx, pipe.x, botY, pipe.width, botH, false);
  } else {
    drawChampagneTowerColumn(ctx, pipe.x, 0, pipe.width, topH, true);
    drawChampagneTowerColumn(ctx, pipe.x, botY, pipe.width, botH, false);
  }
}

function drawFloralColumn(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  isTop: boolean,
) {
  ctx.save();
  // Ivory stone pillar with sage vine wrap
  ctx.fillStyle = '#FAF3E8';
  ctx.strokeStyle = '#C9B8A3';
  ctx.lineWidth = 2;
  ctx.fillRect(x + 6, y, w - 12, h);
  ctx.strokeRect(x + 6, y, w - 12, h);

  // Leafy vine zig-zag
  ctx.strokeStyle = '#6D9B74';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let py = y + 10; py < y + h - 8; py += 22) {
    ctx.moveTo(x + 12, py);
    ctx.lineTo(x + w - 12, py + 11);
  }
  ctx.stroke();

  // Blossom cap at gap edge
  const capY = isTop ? y + h - 18 : y;
  ctx.fillStyle = '#7AA881';
  ctx.beginPath();
  ctx.roundRect(x, capY, w, 18, 8);
  ctx.fill();

  const roseColors = ['#F29CA7', '#FAD5DA', '#E67E8A'];
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = roseColors[i];
    ctx.beginPath();
    ctx.arc(x + 12 + i * 17, capY + 9, 6.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawTieredCakeColumn(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  isTop: boolean,
) {
  ctx.save();
  // Pastel frosted cake body
  ctx.fillStyle = '#FFF5F6';
  ctx.strokeStyle = '#E5B8BE';
  ctx.lineWidth = 2;
  ctx.fillRect(x + 4, y, w - 8, h);
  ctx.strokeRect(x + 4, y, w - 8, h);

  // Strawberry cream stripes
  ctx.fillStyle = '#F7C9D0';
  for (let py = y + 18; py < y + h - 16; py += 26) {
    ctx.fillRect(x + 6, py, w - 12, 8);
  }

  // Scalloped frosting lip near gap
  const lipY = isTop ? y + h - 16 : y;
  ctx.fillStyle = '#F28F9C';
  ctx.beginPath();
  ctx.roundRect(x - 2, lipY, w + 4, 16, 7);
  ctx.fill();

  // Berry dots
  ctx.fillStyle = '#D94D62';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(x + 13 + i * 16, lipY + 8, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawChampagneTowerColumn(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  isTop: boolean,
) {
  ctx.save();
  // Soft golden glass column
  const grad = ctx.createLinearGradient(x, 0, x + w, 0);
  grad.addColorStop(0, '#FDF0D5');
  grad.addColorStop(0.5, '#FFF8EA');
  grad.addColorStop(1, '#F5DFB5');
  ctx.fillStyle = grad;
  ctx.strokeStyle = '#D4A862';
  ctx.lineWidth = 1.8;
  ctx.fillRect(x + 8, y, w - 16, h);
  ctx.strokeRect(x + 8, y, w - 16, h);

  // Coupe tier dividers
  ctx.strokeStyle = 'rgba(200, 152, 74, 0.55)';
  ctx.lineWidth = 1.5;
  for (let py = y + 20; py < y + h - 12; py += 22) {
    ctx.beginPath();
    ctx.moveTo(x + 8, py);
    ctx.lineTo(x + w - 8, py);
    ctx.stroke();
  }

  // Rim tray at gap opening
  const rimY = isTop ? y + h - 14 : y;
  ctx.fillStyle = '#E6BD74';
  ctx.beginPath();
  ctx.roundRect(x + 1, rimY, w - 2, 14, 6);
  ctx.fill();
  ctx.restore();
}

function drawCollectible(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  kind: 'ring' | 'heart',
  now: number,
) {
  ctx.save();
  ctx.translate(x, y);
  const pulse = 1 + 0.08 * Math.sin(now * 0.008);
  ctx.scale(pulse, pulse);

  // Soft aura
  ctx.fillStyle = kind === 'ring' ? 'rgba(246, 208, 118, 0.28)' : 'rgba(244, 138, 148, 0.28)';
  ctx.beginPath();
  ctx.arc(0, 0, 16, 0, Math.PI * 2);
  ctx.fill();

  if (kind === 'ring') {
    ctx.strokeStyle = '#D99B2E';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(0, 2, 8.5, 0, Math.PI * 2);
    ctx.stroke();
    // Diamond top
    ctx.fillStyle = '#C8EEFA';
    ctx.strokeStyle = '#7FBBD4';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(5, -7);
    ctx.lineTo(0, -3);
    ctx.lineTo(-5, -7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillStyle = '#EC6E7F';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.bezierCurveTo(-12, 0, -11, -11, 0, -4);
    ctx.bezierCurveTo(11, -11, 12, 0, 0, 8);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlayerCharacter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  tilt: number,
  wingPhase: number,
  charId: CharacterId,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);

  if (charId === 'dove') {
    // White Wedding Dove carrying a golden ring
    const flapY = Math.sin(wingPhase) * 6;

    // Tail feathers
    ctx.fillStyle = '#F2EFEA';
    ctx.strokeStyle = '#6E665F';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-12, 2);
    ctx.lineTo(-22, -4);
    ctx.lineTo(-20, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Body
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(0, 1, 15, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Head
    ctx.beginPath();
    ctx.arc(10, -5, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Wing
    ctx.fillStyle = '#FFF8F9';
    ctx.beginPath();
    ctx.ellipse(-2, -3 + flapY * 0.5, 9, 5.5, -0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Blush cheek & Eye
    ctx.fillStyle = '#F49AA5';
    ctx.beginPath();
    ctx.arc(10, -3, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2C2A29';
    ctx.beginPath();
    ctx.arc(12, -6, 1.6, 0, Math.PI * 2);
    ctx.fill();

    // Beak & Golden Ring
    ctx.fillStyle = '#F2B263';
    ctx.beginPath();
    ctx.moveTo(17, -6);
    ctx.lineTo(23, -4);
    ctx.lineTo(17, -2);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#D99B2E';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(23, 1, 4.5, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    // Chibi Bride & Groom floating with a heart balloon
    const bob = Math.sin(wingPhase * 0.7) * 1.5;

    // Balloon string
    ctx.strokeStyle = '#8F8278';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, -14 + bob);
    ctx.lineTo(0, 2);
    ctx.stroke();

    // Pink Heart Balloon above
    ctx.fillStyle = '#F28695';
    ctx.strokeStyle = '#C95666';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, -10 + bob);
    ctx.bezierCurveTo(-13, -19 + bob, -12, -30 + bob, 0, -23 + bob);
    ctx.bezierCurveTo(12, -30 + bob, 13, -19 + bob, 0, -10 + bob);
    ctx.fill();
    ctx.stroke();

    // Groom (left)
    ctx.fillStyle = '#53626F';
    ctx.beginPath();
    ctx.roundRect(-12, 4, 10, 12, 3);
    ctx.fill();
    ctx.fillStyle = '#FCE1CF';
    ctx.strokeStyle = '#5C4A42';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(-7, 1, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Groom hair
    ctx.fillStyle = '#3B302A';
    ctx.beginPath();
    ctx.arc(-7, -1, 5.4, Math.PI, 0);
    ctx.fill();

    // Bride (right)
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#C6B7AC';
    ctx.beginPath();
    ctx.moveTo(2, 4);
    ctx.lineTo(12, 4);
    ctx.lineTo(14, 16);
    ctx.lineTo(0, 16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#FCE1CF';
    ctx.strokeStyle = '#5C4A42';
    ctx.beginPath();
    ctx.arc(7, 1, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Bride hair + mini flower
    ctx.fillStyle = '#4A3830';
    ctx.beginPath();
    ctx.arc(7, -1, 5.4, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#F28695';
    ctx.beginPath();
    ctx.arc(11, -3, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
