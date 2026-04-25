"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface Star {
  x: number;
  y: number;
  speed: number;
  size: number;
  caught: boolean;
  opacity: number;
}

export function StarCatcherGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameActive, setGameActive] = useState(false);
  const [highScore, setHighScore] = useState(0);
  const starsRef = useRef<Star[]>([]);
  const paddleXRef = useRef(0);
  const scoreRef = useRef(0);
  const animFrameRef = useRef<number>(0);
  const lastSpawnRef = useRef(0);
  const gameActiveRef = useRef(false);

  const CANVAS_W = 320;
  const CANVAS_H = 200;
  const PADDLE_W = 48;
  const PADDLE_H = 8;

  const startGame = useCallback(() => {
    starsRef.current = [];
    scoreRef.current = 0;
    lastSpawnRef.current = 0;
    setScore(0);
    setGameActive(true);
    gameActiveRef.current = true;
  }, []);

  const stopGame = useCallback(() => {
    setGameActive(false);
    gameActiveRef.current = false;
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setHighScore((prev) => Math.max(prev, scoreRef.current));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const handleMove = (clientX: number) => {
      const rect = canvas.getBoundingClientRect();
      paddleXRef.current = Math.max(
        0,
        Math.min(
          CANVAS_W - PADDLE_W,
          ((clientX - rect.left) / rect.width) * CANVAS_W - PADDLE_W / 2
        )
      );
    };

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      handleMove(e.touches[0].clientX);
    };

    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });

    let lastTime = 0;

    const loop = (time: number) => {
      if (!gameActiveRef.current) return;
      const dt = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;

      if (time - lastSpawnRef.current > 600) {
        lastSpawnRef.current = time;
        starsRef.current.push({
          x: Math.random() * (CANVAS_W - 12) + 6,
          y: -10,
          speed: 50 + Math.random() * 60 + scoreRef.current * 0.5,
          size: 4 + Math.random() * 4,
          caught: false,
          opacity: 1,
        });
      }

      const stars = starsRef.current;
      for (const star of stars) {
        if (star.caught) {
          star.opacity -= dt * 4;
          continue;
        }
        star.y += star.speed * dt;
        if (
          star.y + star.size >= CANVAS_H - PADDLE_H - 2 &&
          star.y <= CANVAS_H &&
          star.x >= paddleXRef.current - 4 &&
          star.x <= paddleXRef.current + PADDLE_W + 4
        ) {
          star.caught = true;
          scoreRef.current += 1;
          setScore(scoreRef.current);
        }
      }

      starsRef.current = stars.filter(
        (s) => s.y < CANVAS_H + 20 && s.opacity > 0
      );

      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      const bg = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      bg.addColorStop(0, "rgba(15, 10, 30, 0.9)");
      bg.addColorStop(1, "rgba(30, 15, 50, 0.9)");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
      for (let i = 0; i < 30; i++) {
        const sx = ((i * 73 + 17) % CANVAS_W);
        const sy = ((i * 47 + 23) % CANVAS_H);
        ctx.fillRect(sx, sy, 1, 1);
      }

      for (const star of starsRef.current) {
        ctx.save();
        ctx.globalAlpha = star.opacity;
        ctx.translate(star.x, star.y);
        ctx.fillStyle = star.caught ? "#34d399" : "#fbbf24";
        ctx.shadowColor = star.caught ? "#34d399" : "#fbbf24";
        ctx.shadowBlur = star.caught ? 12 : 6;

        const s = star.size;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI) / 4 - Math.PI / 2;
          const r = i % 2 === 0 ? s : s * 0.4;
          ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      const pGrad = ctx.createLinearGradient(
        paddleXRef.current,
        CANVAS_H - PADDLE_H - 2,
        paddleXRef.current + PADDLE_W,
        CANVAS_H - 2
      );
      pGrad.addColorStop(0, "#a78bfa");
      pGrad.addColorStop(1, "#7c3aed");
      ctx.fillStyle = pGrad;
      ctx.beginPath();
      ctx.roundRect(
        paddleXRef.current,
        CANVAS_H - PADDLE_H - 2,
        PADDLE_W,
        PADDLE_H,
        4
      );
      ctx.fill();

      ctx.fillStyle = "rgba(167, 139, 250, 0.15)";
      ctx.beginPath();
      ctx.ellipse(
        paddleXRef.current + PADDLE_W / 2,
        CANVAS_H - 1,
        PADDLE_W / 2 + 4,
        3,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();

      animFrameRef.current = requestAnimationFrame(loop);
    };

    if (gameActiveRef.current) {
      lastTime = performance.now();
      animFrameRef.current = requestAnimationFrame(loop);
    }

    return () => {
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("touchmove", onTouchMove);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameActive]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative rounded-2xl overflow-hidden border border-border/50 shadow-lg">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="block cursor-none"
          style={{ width: CANVAS_W, height: CANVAS_H }}
        />
        {!gameActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
            <p className="text-white/80 text-xs mb-1 font-medium tracking-wide">
              {scoreRef.current > 0
                ? `You caught ${scoreRef.current} stars!`
                : "Catch the falling stars"}
            </p>
            {highScore > 0 && (
              <p className="text-amber-400/80 text-[10px] mb-3">
                Best: {highScore}
              </p>
            )}
            <button
              onClick={startGame}
              className="px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-colors"
            >
              {scoreRef.current > 0 ? "Play Again" : "Play"}
            </button>
          </div>
        )}
      </div>
      {gameActive && (
        <div className="flex items-center gap-4">
          <span className="text-sm font-mono text-amber-500 font-semibold tabular-nums">
            {score} ★
          </span>
          <button
            onClick={stopGame}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Stop
          </button>
        </div>
      )}
    </div>
  );
}
