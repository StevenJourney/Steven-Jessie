import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  MapPin,
  Minus,
  Plus,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import gardenMapImg from '../assets/images/wedding_garden_map_1794666771379.jpg';
import { WEDDING_STALLS, type StallInfo } from '../data/weddingData';
import { soundEngine } from '../utils/sound';
import { FloralWreathCrest, GardenRibbonBanner } from './FloralWreathCrest';

interface GardenMapTabProps {
  visitedStalls: string[];
  onToggleVisited: (stallId: string) => void;
}

interface CameraState {
  scale: number;
  x: number;
  y: number;
}

const PETAL_CONFIG = [
  { left: '12%', delay: '0s', duration: '9.5s', size: 10, color: '#F4B6BE' },
  { left: '26%', delay: '2.1s', duration: '11s', size: 12, color: '#F9D6DC' },
  { left: '41%', delay: '4.4s', duration: '10.2s', size: 9, color: '#F2A3AE' },
  { left: '58%', delay: '1.3s', duration: '12s', size: 11, color: '#FADCE1' },
  { left: '73%', delay: '3.6s', duration: '9.8s', size: 10, color: '#F4B6BE' },
  { left: '86%', delay: '5.5s', duration: '11.4s', size: 12, color: '#F8CED4' },
];

const FAIRY_BULBS = [
  { x: 14, y: 12, delay: '0s' },
  { x: 22, y: 15, delay: '0.4s' },
  { x: 30, y: 17, delay: '0.9s' },
  { x: 38, y: 15, delay: '0.2s' },
  { x: 46, y: 11, delay: '1.1s' },
  { x: 54, y: 11, delay: '0.6s' },
  { x: 62, y: 15, delay: '1.4s' },
  { x: 70, y: 17, delay: '0.3s' },
  { x: 78, y: 15, delay: '0.8s' },
  { x: 86, y: 12, delay: '1.2s' },
];

const MIN_SCALE = 1;
const MAX_SCALE = 2.4;

export const GardenMapTab: React.FC<GardenMapTabProps> = ({
  visitedStalls,
  onToggleVisited,
}) => {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  const [camera, setCamera] = useState<CameraState>({ scale: 1, x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [selectedStallId, setSelectedStallId] = useState<string | null>(null);
  const [mapImageLoaded, setMapImageLoaded] = useState(false);

  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const panOriginRef = useRef<{ startX: number; startY: number; camX: number; camY: number; moved: boolean }>({
    startX: 0,
    startY: 0,
    camX: 0,
    camY: 0,
    moved: false,
  });
  const pinchOriginRef = useRef<{ dist: number; scale: number } | null>(null);

  const selectedStall = useMemo(
    () => WEDDING_STALLS.find((s) => s.id === selectedStallId) ?? null,
    [selectedStallId],
  );

  const clampCamera = useCallback((nextScale: number, nextX: number, nextY: number): CameraState => {
    const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, nextScale));
    const viewport = viewportRef.current;
    const stage = stageRef.current;
    if (!viewport || !stage) {
      return { scale, x: nextX, y: nextY };
    }

    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    const sw = stage.offsetWidth * scale;
    const sh = stage.offsetHeight * scale;

    const maxOffsetX = Math.max(0, (sw - vw) / 2 + 24);
    const maxOffsetY = Math.max(0, (sh - vh) / 2 + 24);

    return {
      scale,
      x: Math.min(maxOffsetX, Math.max(-maxOffsetX, nextX)),
      y: Math.min(maxOffsetY, Math.max(-maxOffsetY, nextY)),
    };
  }, []);

  const focusStallOnMap = useCallback(
    (stall: StallInfo) => {
      const viewport = viewportRef.current;
      const stage = stageRef.current;
      if (!viewport || !stage) return;

      const isMobile = window.innerWidth < 1024;
      const targetScale = isMobile ? 1.55 : 1.45;
      const stageW = stage.offsetWidth;
      const stageH = stage.offsetHeight;

      const dxFromCenter = ((50 - stall.xPercent) / 100) * stageW * targetScale;
      // On mobile, nudge the stall upward slightly so the bottom sheet never covers it
      const mobileBottomClearance = isMobile ? -viewport.clientHeight * 0.14 : 0;
      const dyFromCenter = ((50 - stall.yPercent) / 100) * stageH * targetScale + mobileBottomClearance;

      setCamera(clampCamera(targetScale, dxFromCenter, dyFromCenter));
    },
    [clampCamera],
  );

  const handleSelectStall = useCallback(
    (stall: StallInfo) => {
      soundEngine.playClick();
      setSelectedStallId(stall.id);
      focusStallOnMap(stall);
    },
    [focusStallOnMap],
  );

  const handleResetView = useCallback(() => {
    soundEngine.playClick();
    setCamera({ scale: 1, x: 0, y: 0 });
  }, []);

  const handleZoomStep = useCallback(
    (delta: number) => {
      soundEngine.playClick();
      setCamera((prev) => clampCamera(prev.scale + delta, prev.x, prev.y));
    },
    [clampCamera],
  );

  // Wheel zoom inside map viewport
  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 0.16 : -0.16;
      setCamera((prev) => clampCamera(prev.scale + zoomFactor, prev.x, prev.y));
    };
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, [clampCamera]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Do not hijack clicks on interactive buttons inside the map
    if ((e.target as HTMLElement).closest('button')) return;

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 1) {
      setIsDragging(true);
      panOriginRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        camX: camera.x,
        camY: camera.y,
        moved: false,
      };
      pinchOriginRef.current = null;
    } else if (pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      pinchOriginRef.current = { dist, scale: camera.scale };
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 2 && pinchOriginRef.current) {
      const pts = Array.from(pointersRef.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const ratio = dist / Math.max(1, pinchOriginRef.current.dist);
      const nextScale = pinchOriginRef.current.scale * ratio;
      setCamera((prev) => clampCamera(nextScale, prev.x, prev.y));
      return;
    }

    if (pointersRef.current.size === 1 && isDragging) {
      const dx = e.clientX - panOriginRef.current.startX;
      const dy = e.clientY - panOriginRef.current.startY;
      if (Math.hypot(dx, dy) > 4) {
        panOriginRef.current.moved = true;
      }
      setCamera((prev) =>
        clampCamera(prev.scale, panOriginRef.current.camX + dx, panOriginRef.current.camY + dy),
      );
    }
  };

  const onPointerUpOrCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) {
      pinchOriginRef.current = null;
    }
    if (pointersRef.current.size === 0) {
      setIsDragging(false);
    }
  };

  const visitedCount = visitedStalls.length;
  const allVisited = visitedCount === WEDDING_STALLS.length;

  const currentIndex = selectedStall
    ? WEDDING_STALLS.findIndex((s) => s.id === selectedStall.id)
    : -1;

  const handleStepStall = (direction: -1 | 1) => {
    if (currentIndex < 0) return;
    const nextIdx = (currentIndex + direction + WEDDING_STALLS.length) % WEDDING_STALLS.length;
    handleSelectStall(WEDDING_STALLS[nextIdx]);
  };

  const handleStampClick = (stallId: string) => {
    const alreadyVisited = visitedStalls.includes(stallId);
    if (!alreadyVisited) {
      soundEngine.playStamp();
    } else {
      soundEngine.playClick();
    }
    onToggleVisited(stallId);
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-3 sm:px-6 pb-24 lg:pb-10 pt-3 sm:pt-5">
      {/* Garden Header: Romantic Ribbon Banner + Floral Wreath Crest */}
      <div className="flex items-center justify-between gap-3 mb-3 sm:mb-4">
        <div className="min-w-0">
          <GardenRibbonBanner />
          <p className="mt-1 pl-2 text-xs sm:text-sm text-[#6B6560]">
            轻触地图编号或拖动缩放探索花园 · Tap any numbered marker to explore &amp; stamp
          </p>
        </div>
        <FloralWreathCrest />
      </div>

      {/* Stamp Progress Bar & Quick Booth Selector */}
      <div className="mb-3 sm:mb-4 rounded-2xl bg-white/85 backdrop-blur-sm border border-[#EADFD2] px-3.5 py-2.5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 text-sm font-medium text-[#2C2A29]">
            <Compass className="w-4 h-4 text-[#D96B78] shrink-0" />
            <span>游园打卡进度</span>
            <span className="text-[#9E958D]" aria-hidden="true">
              ·
            </span>
            <span className="text-[#6B6560] text-xs sm:text-sm">
              Visited{' '}
              <strong className="font-semibold text-[#D96B78] tabular-nums">
                {visitedCount}/{WEDDING_STALLS.length}
              </strong>{' '}
              Stalls
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-28 sm:w-36 h-2 rounded-full bg-[#F3ECE3] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#F2B5BC] to-[#D96B78] transition-all duration-300"
                style={{ width: `${(visitedCount / WEDDING_STALLS.length) * 100}%` }}
              />
            </div>
            {allVisited && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#5F8D6B]">
                <Sparkles className="w-3.5 h-3.5" />
                集章完成!
              </span>
            )}
          </div>
        </div>

        {/* Scrollable Quick Jump Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {WEDDING_STALLS.map((stall) => {
            const isVisited = visitedStalls.includes(stall.id);
            const isSelected = selectedStallId === stall.id;
            return (
              <button
                key={stall.id}
                type="button"
                onClick={() => handleSelectStall(stall)}
                className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-[#D96B78] text-white border-[#D96B78] shadow-xs'
                    : isVisited
                    ? 'bg-[#EDF5EF] text-[#3F6B4B] border-[#C9DEC9] hover:bg-[#E1EFE4]'
                    : 'bg-[#FCF9F4] text-[#4A4540] border-[#E8DFD3] hover:bg-[#F5EFE6]'
                }`}
              >
                <span className="tabular-nums font-semibold">{stall.number}</span>
                <span>{stall.titleZh}</span>
                {isVisited && <Check className="w-3.5 h-3.5 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Interactive Garden Map + Desktop Side Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        <div
          className={`relative ${
            selectedStall ? 'lg:col-span-8' : 'lg:col-span-12'
          } rounded-3xl overflow-hidden border border-[#E6DACB] bg-[#EFE9DC] shadow-sm transition-all`}
        >
          {/* Pannable & Zoomable Viewport */}
          <div
            ref={viewportRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUpOrCancel}
            onPointerCancel={onPointerUpOrCancel}
            className={`relative w-full h-[58vh] min-h-[390px] sm:h-[64vh] lg:h-[68vh] max-h-[720px] flex items-center justify-center overflow-hidden touch-none select-none ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
          >
            {/* Transformed 4:3 Map Stage */}
            <div
              ref={stageRef}
              style={{
                transform: `translate3d(${camera.x}px, ${camera.y}px, 0) scale(${camera.scale})`,
                transition: isDragging ? 'none' : 'transform 380ms cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              className="relative w-full max-w-[960px] aspect-[4/3] shrink-0 origin-center"
            >
              {/* Generated Pastel Watercolor Venue Map */}
              <img
                src={gardenMapImg}
                alt="S & J 婚礼花园手绘水彩导览图 · Garden Wedding Venue Map"
                referrerPolicy="no-referrer"
                draggable={false}
                onLoad={() => setMapImageLoaded(true)}
                className="w-full h-full object-cover rounded-2xl pointer-events-none select-none"
              />

              {!mapImageLoaded && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#F4EFE4] text-[#6B6560]">
                  <Sparkles className="w-6 h-6 text-[#D96B78] mb-2" />
                  <span className="text-sm">正在展开花园水彩地图…</span>
                </div>
              )}

              {/* Animated Atmospheric Overlay Layer */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
                {/* 1. Shimmering Water Ripples over Top Pool */}
                <div
                  className="absolute left-1/2 -translate-x-1/2 top-[4%] w-[34%] h-[15%] flex items-center justify-center"
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 220 90" className="w-full h-full">
                    <ellipse
                      cx="110"
                      cy="42"
                      rx="72"
                      ry="18"
                      fill="none"
                      stroke="rgba(255,255,255,0.65)"
                      strokeWidth="1.4"
                      strokeDasharray="16 10"
                      className="animate-ripple"
                    />
                    <ellipse
                      cx="102"
                      cy="48"
                      rx="42"
                      ry="10"
                      fill="none"
                      stroke="rgba(255,255,255,0.5)"
                      strokeWidth="1.2"
                      strokeDasharray="10 8"
                      className="animate-ripple"
                      style={{ animationDelay: '1.2s' }}
                    />
                    <circle cx="82" cy="36" r="2.2" fill="#FFFFFF" className="animate-twinkle" />
                    <circle
                      cx="138"
                      cy="38"
                      r="2"
                      fill="#FFFFFF"
                      className="animate-twinkle"
                      style={{ animationDelay: '0.8s' }}
                    />
                  </svg>
                </div>

                {/* 2. Twinkling Fairy String Lights Draped Across Upper Garden */}
                <svg
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  className="absolute inset-0 w-full h-full"
                  aria-hidden="true"
                >
                  <path
                    d="M 10 10 Q 30 20 50 10 Q 70 20 90 10"
                    fill="none"
                    stroke="rgba(120, 95, 70, 0.35)"
                    strokeWidth="0.28"
                  />
                  {FAIRY_BULBS.map((bulb, i) => (
                    <g key={i} transform={`translate(${bulb.x}, ${bulb.y})`}>
                      <circle
                        r="1.4"
                        fill="rgba(255, 224, 130, 0.35)"
                        className="animate-twinkle"
                        style={{ animationDelay: bulb.delay }}
                      />
                      <circle
                        r="0.65"
                        fill="#FFF6CC"
                        className="animate-twinkle"
                        style={{ animationDelay: bulb.delay }}
                      />
                    </g>
                  ))}
                </svg>

                {/* 3. Swaying Botanical Leaf Sprigs near Perimeter */}
                <div className="absolute left-[4%] top-[14%] w-8 h-8 animate-sway opacity-75" aria-hidden="true">
                  <svg viewBox="0 0 40 40" className="w-full h-full">
                    <path d="M20 38 Q22 20 12 8" stroke="#5B8664" strokeWidth="1.6" fill="none" />
                    <ellipse cx="14" cy="14" rx="5" ry="2.5" transform="rotate(-35 14 14)" fill="#88B48E" />
                    <ellipse cx="22" cy="20" rx="5" ry="2.5" transform="rotate(25 22 20)" fill="#9EC7A3" />
                  </svg>
                </div>
                <div
                  className="absolute right-[5%] top-[15%] w-8 h-8 animate-sway opacity-75"
                  style={{ animationDelay: '1.6s' }}
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 40 40" className="w-full h-full">
                    <path d="M20 38 Q18 20 28 8" stroke="#5B8664" strokeWidth="1.6" fill="none" />
                    <ellipse cx="26" cy="14" rx="5" ry="2.5" transform="rotate(35 26 14)" fill="#88B48E" />
                    <ellipse cx="18" cy="20" rx="5" ry="2.5" transform="rotate(-25 18 20)" fill="#9EC7A3" />
                  </svg>
                </div>

                {/* 4. Cute Central Wooden Directional Signpost */}
                <div
                  className="absolute left-[49%] top-[53%] -translate-x-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 drop-shadow-sm"
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 64 64" className="w-full h-full">
                    {/* Post */}
                    <rect x="29" y="16" width="6" height="40" rx="2" fill="#9E734F" stroke="#5E412B" strokeWidth="1.4" />
                    {/* Top arrow right */}
                    <path
                      d="M 24 20 L 50 20 L 56 24.5 L 50 29 L 24 29 Z"
                      fill="#F4D7B6"
                      stroke="#6E4E34"
                      strokeWidth="1.3"
                    />
                    {/* Middle arrow left */}
                    <path
                      d="M 40 32 L 14 32 L 8 36.5 L 14 41 L 40 41 Z"
                      fill="#FADCE1"
                      stroke="#6E4E34"
                      strokeWidth="1.3"
                    />
                    {/* Little grass tuft */}
                    <path d="M 24 56 Q 32 52 40 56" fill="none" stroke="#628E68" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>

                {/* 5. Tiny Animated Wedding Guests Strolling Along Paths */}
                <div
                  className="absolute left-[38%] top-[60%] w-6 h-7 animate-stroll"
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 28 36" className="w-full h-full drop-shadow-xs">
                    <circle cx="14" cy="8" r="4.5" fill="#F8D9C6" stroke="#5C4A42" strokeWidth="1.1" />
                    <path d="M10 6 Q14 2 18 6" fill="#5A4338" />
                    <path d="M8 28 L11 14 L17 14 L20 28 Z" fill="#F5B8C0" stroke="#5C4A42" strokeWidth="1.1" />
                  </svg>
                </div>
                <div
                  className="absolute left-[61%] top-[36%] w-6 h-7 animate-stroll"
                  style={{ animationDelay: '2.4s', animationDirection: 'reverse' }}
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 28 36" className="w-full h-full drop-shadow-xs">
                    <circle cx="14" cy="8" r="4.5" fill="#F6D5C0" stroke="#5C4A42" strokeWidth="1.1" />
                    <path d="M10 5 Q14 2 18 5" fill="#3D332E" />
                    <rect x="10" y="14" width="8" height="14" rx="3" fill="#7D9B84" stroke="#5C4A42" strokeWidth="1.1" />
                  </svg>
                </div>

                {/* 6. Drifting Pastel Rose Petals */}
                {PETAL_CONFIG.map((petal, idx) => (
                  <span
                    key={idx}
                    className="absolute top-0 animate-petal"
                    style={{
                      left: petal.left,
                      animationDelay: petal.delay,
                      animationDuration: petal.duration,
                    }}
                    aria-hidden="true"
                  >
                    <svg width={petal.size} height={petal.size} viewBox="0 0 16 16">
                      <path
                        d="M8 1 C12 3 15 8 11 13 C8 16 3 13 2 8 C1 4 5 2 8 1 Z"
                        fill={petal.color}
                      />
                    </svg>
                  </span>
                ))}
              </div>

              {/* 8 Floating Interactive Stall Markers (Heart Island Inspired) */}
              {WEDDING_STALLS.map((stall, index) => {
                const isSelected = selectedStallId === stall.id;
                const isVisited = visitedStalls.includes(stall.id);

                return (
                  <div
                    key={stall.id}
                    style={{
                      left: `${stall.xPercent}%`,
                      top: `${stall.yPercent}%`,
                    }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-20"
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectStall(stall);
                      }}
                      style={{
                        animationDelay: `${index * 0.28}s`,
                      }}
                      aria-label={`${stall.number} ${stall.titleZh} ${stall.titleEn}`}
                      className={`animate-float-bob group relative min-h-[40px] sm:min-h-[44px] pl-1.5 pr-2.5 sm:pr-3 py-1 rounded-full bg-white/95 backdrop-blur-sm border transition-all duration-200 flex items-center gap-1.5 shadow-md hover:shadow-lg active:scale-95 cursor-pointer whitespace-nowrap ${
                        isSelected
                          ? 'ring-3 ring-[#D96B78]/45 border-[#D96B78] scale-110 z-30'
                          : isVisited
                          ? 'border-[#6FA37A] hover:scale-105'
                          : 'border-[#E9DCD0] hover:border-[#D96B78] hover:scale-105'
                      }`}
                    >
                      <span
                        style={{
                          backgroundColor: isVisited ? '#5F8D6B' : stall.accentBg,
                          color: stall.accentText,
                        }}
                        className="w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[11px] sm:text-xs font-bold tabular-nums shrink-0 shadow-xs"
                      >
                        {isVisited ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : stall.number}
                      </span>
                      <span className="text-[11px] sm:text-xs font-semibold text-[#2C2A29] tracking-tight">
                        {stall.titleZh}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Map Zoom Controls (Bottom Right, >= 44px hitboxes) */}
            <div className="absolute right-3 bottom-3 z-30 flex flex-col gap-1.5 bg-white/90 backdrop-blur-md p-1.5 rounded-2xl border border-[#E6DACB] shadow-md">
              <button
                type="button"
                onClick={() => handleZoomStep(0.28)}
                aria-label="Zoom in map"
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center text-[#2C2A29] hover:bg-[#F5EFE6] active:scale-95 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleZoomStep(-0.28)}
                aria-label="Zoom out map"
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center text-[#2C2A29] hover:bg-[#F5EFE6] active:scale-95 transition cursor-pointer"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleResetView}
                aria-label="Reset map zoom and pan"
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center text-[#6B6560] hover:bg-[#F5EFE6] active:scale-95 transition cursor-pointer border-t border-[#EFE6DA]"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Subtle Drag Hint on Default Zoom */}
            {camera.scale === 1 && !selectedStall && (
              <div className="pointer-events-none absolute left-3 bottom-3 z-20 rounded-xl bg-white/85 backdrop-blur-sm border border-[#E6DACB] px-3 py-1.5 text-[11px] font-medium text-[#5A544E] shadow-xs">
                拖动浏览 · 双指或滚轮缩放 · Drag &amp; Pinch to Explore
              </div>
            )}
          </div>
        </div>

        {/* Desktop Side Detail Drawer */}
        <AnimatePresence>
          {selectedStall && (
            <motion.aside
              key={selectedStall.id}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="hidden lg:flex lg:col-span-4 flex-col rounded-3xl bg-white border border-[#E6DACB] shadow-sm overflow-hidden"
            >
              <StallDetailContent
                stall={selectedStall}
                isVisited={visitedStalls.includes(selectedStall.id)}
                onToggleVisited={() => handleStampClick(selectedStall.id)}
                onClose={() => setSelectedStallId(null)}
                onPrev={() => handleStepStall(-1)}
                onNext={() => handleStepStall(1)}
              />
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile Bottom Sheet Detail Card */}
      <AnimatePresence>
        {selectedStall && (
          <div className="lg:hidden fixed inset-0 z-50 pointer-events-none flex items-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedStallId(null)}
              className="fixed inset-0 bg-black/30 backdrop-blur-[2px] pointer-events-auto"
            />
            <motion.div
              key={selectedStall.id}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 310 }}
              className="relative z-10 w-full max-h-[76vh] rounded-t-3xl bg-[#FFFDF9] border-t border-[#E6DACB] shadow-2xl pointer-events-auto flex flex-col overflow-hidden"
            >
              <div className="w-10 h-1.5 bg-[#DFD4C7] rounded-full mx-auto mt-2.5 mb-1 shrink-0" />
              <StallDetailContent
                stall={selectedStall}
                isVisited={visitedStalls.includes(selectedStall.id)}
                onToggleVisited={() => handleStampClick(selectedStall.id)}
                onClose={() => setSelectedStallId(null)}
                onPrev={() => handleStepStall(-1)}
                onNext={() => handleStepStall(1)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface StallDetailContentProps {
  stall: StallInfo;
  isVisited: boolean;
  onToggleVisited: () => void;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

const StallDetailContent: React.FC<StallDetailContentProps> = ({
  stall,
  isVisited,
  onToggleVisited,
  onClose,
  onPrev,
  onNext,
}) => {
  return (
    <div className="flex flex-col h-full overflow-y-auto p-5 sm:p-6">
      {/* Header Row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            style={{ backgroundColor: stall.accentBg }}
            className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold text-base tabular-nums shrink-0 shadow-xs"
          >
            {stall.number}
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-2xl font-bold text-[#2C2A29] leading-tight">
              {stall.titleZh}
            </h2>
            <p className="text-sm font-medium text-[#7A716A] truncate">{stall.titleEn}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close stall details"
          className="w-11 h-11 rounded-xl flex items-center justify-center text-[#6B6560] hover:bg-[#F4ECE1] transition shrink-0 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Unboxed Clean Metadata Line */}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs sm:text-sm text-[#6B6560]">
        <span className="inline-flex items-center gap-1 tabular-nums font-medium text-[#4A443F]">
          <Clock className="w-3.5 h-3.5 text-[#D96B78]" />
          {stall.timeRange}
        </span>
        <span aria-hidden="true">·</span>
        <span className="inline-flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5 text-[#5F8D6B]" />
          {stall.zoneZh} / {stall.zoneEn}
        </span>
      </div>

      {/* Divider */}
      <div className="my-4 border-t border-[#EFE7DC]" />

      {/* Description */}
      <div className="space-y-1.5 text-sm sm:text-[15px] leading-relaxed text-[#2C2A29]">
        <p>{stall.summaryZh}</p>
        <p className="text-xs sm:text-sm text-[#6B6560]">{stall.summaryEn}</p>
      </div>

      {/* Highlights */}
      <div className="mt-5">
        <h3 className="text-xs font-semibold tracking-wide text-[#7A716A] mb-2.5">
          现场亮点 · Highlights
        </h3>
        <ul className="space-y-2.5">
          {stall.highlights.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2.5 text-sm">
              <span
                style={{ backgroundColor: stall.accentBg }}
                className="w-1.5 h-1.5 rounded-full mt-2 shrink-0"
                aria-hidden="true"
              />
              <div>
                <p className="font-medium text-[#2C2A29] leading-snug">{item.zh}</p>
                <p className="text-xs text-[#6B6560] mt-0.5">{item.en}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Warm Tip Box */}
      <div className="mt-5 rounded-2xl bg-[#FCF6EC] border border-[#F0E1C8] p-3.5 text-xs sm:text-sm">
        <p className="font-semibold text-[#946427]">小贴士 · Tip</p>
        <p className="mt-1 text-[#4A4035]">{stall.tipZh}</p>
        <p className="mt-0.5 text-xs text-[#7B6D5C]">{stall.tipEn}</p>
      </div>

      {/* Footer Actions: Prev/Next + Stamp Check-in */}
      <div className="mt-6 pt-4 border-t border-[#EFE7DC] flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onPrev}
            aria-label="Previous stall"
            className="w-11 h-11 rounded-xl border border-[#E6DACB] bg-white hover:bg-[#F7F1E8] flex items-center justify-center text-[#2C2A29] transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onNext}
            aria-label="Next stall"
            className="w-11 h-11 rounded-xl border border-[#E6DACB] bg-white hover:bg-[#F7F1E8] flex items-center justify-center text-[#2C2A29] transition cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={onToggleVisited}
          className={`flex-1 min-h-[44px] px-4 py-2.5 rounded-xl font-semibold text-sm inline-flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer whitespace-nowrap ${
            isVisited
              ? 'bg-[#EDF5EF] text-[#356343] border border-[#BBD6C1] hover:bg-[#E2EFE5]'
              : 'bg-[#D96B78] text-white shadow-sm hover:bg-[#C95C69]'
          }`}
        >
          <Check className="w-4 h-4 shrink-0" />
          <span>{isVisited ? '已打卡盖章 · Stamped' : '打卡盖章 · Mark Visited'}</span>
        </button>
      </div>
    </div>
  );
};
