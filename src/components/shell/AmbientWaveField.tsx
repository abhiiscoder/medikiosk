/**
 * MEDiKIOSK — AmbientWaveField Component
 * Real live animated blue wavelength / energy-line background.
 *
 * Implements subtle, organic, continuous clinical-AI energy flow:
 * - Fluid harmonic wavelength curves flowing behind the sidebar and into the workspace
 * - Sweeping upper halo orbital arc framing the central clinical greeting
 * - High-DPI support, zero layout thrashing, 60fps performance
 * - Automatic adaptation to tablet/mobile and prefers-reduced-motion
 */

import React, { useEffect, useRef } from 'react';

interface WaveConfig {
  id: string;
  type: 'sidebar-flow' | 'halo-arc' | 'ambient-drift';
  baseX: number;
  baseY: number;
  freq1: number;
  freq2: number;
  amp1: number;
  amp2: number;
  speed1: number;
  speed2: number;
  phase1: number;
  phase2: number;
  strokeWidth: number;
  baseAlpha: number;
  colorStops: { stop: number; color: string }[];
}

export const AmbientWaveField: React.FC<{ className?: string }> = ({ className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const startTime = performance.now();
    let isReducedMotion = false;

    // Check prefers-reduced-motion
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      isReducedMotion = mediaQuery.matches;
    }

    // Handle high-DPI sizing
    const resizeCanvas = () => {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.parentElement ? canvas.parentElement.clientWidth : window.innerWidth;
      const height = canvas.parentElement ? canvas.parentElement.clientHeight : window.innerHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Dynamic wave definitions calibrated to match the reference composition
    const getWaves = (width: number, height: number): WaveConfig[] => {
      const isMobile = width < 768;
      const isTablet = width < 1024;

      if (isMobile) {
        return [
          {
            id: 'm1',
            type: 'sidebar-flow',
            baseX: 60,
            baseY: 0,
            freq1: 0.003,
            freq2: 0.0015,
            amp1: 30,
            amp2: 18,
            speed1: 0.0006,
            speed2: 0.0004,
            phase1: 0.2,
            phase2: 1.1,
            strokeWidth: 1.2,
            baseAlpha: 0.12,
            colorStops: [
              { stop: 0, color: 'rgba(24, 101, 242, 0)' },
              { stop: 0.5, color: 'rgba(24, 101, 242, 0.2)' },
              { stop: 1, color: 'rgba(56, 189, 248, 0)' }
            ]
          }
        ];
      }

      // Desktop & Tablet Waves
      const waves: WaveConfig[] = [
        // Wave 1: Primary sidebar-boundary ribbon (flowing from top sidebar, weaving across into workspace)
        {
          id: 'sb1',
          type: 'sidebar-flow',
          baseX: 180,
          baseY: 0,
          freq1: 0.0028,
          freq2: 0.0014,
          amp1: 75,
          amp2: 45,
          speed1: 0.0005,
          speed2: 0.0003,
          phase1: 0.5,
          phase2: 2.1,
          strokeWidth: 1.6,
          baseAlpha: 0.22,
          colorStops: [
            { stop: 0, color: 'rgba(10, 42, 90, 0.05)' },
            { stop: 0.35, color: 'rgba(24, 101, 242, 0.38)' },
            { stop: 0.65, color: 'rgba(56, 189, 248, 0.42)' },
            { stop: 1, color: 'rgba(14, 60, 160, 0.08)' }
          ]
        },
        // Wave 2: Secondary inner sidebar curve (flowing closer to nav items and Recent Cases)
        {
          id: 'sb2',
          type: 'sidebar-flow',
          baseX: 280,
          baseY: 0,
          freq1: 0.0022,
          freq2: 0.0035,
          amp1: 90,
          amp2: 35,
          speed1: 0.0004,
          speed2: 0.0006,
          phase1: 1.8,
          phase2: 0.7,
          strokeWidth: 1.4,
          baseAlpha: 0.18,
          colorStops: [
            { stop: 0, color: 'rgba(24, 101, 242, 0.08)' },
            { stop: 0.4, color: 'rgba(56, 189, 248, 0.32)' },
            { stop: 0.8, color: 'rgba(24, 101, 242, 0.25)' },
            { stop: 1, color: 'rgba(10, 30, 65, 0.05)' }
          ]
        },
        // Wave 3: Subtle outer boundary companion wave
        {
          id: 'sb3',
          type: 'sidebar-flow',
          baseX: 360,
          baseY: 0,
          freq1: 0.0018,
          freq2: 0.0025,
          amp1: 65,
          amp2: 40,
          speed1: 0.00035,
          speed2: 0.00045,
          phase1: 3.2,
          phase2: 1.4,
          strokeWidth: 1.2,
          baseAlpha: 0.14,
          colorStops: [
            { stop: 0, color: 'rgba(14, 60, 160, 0.02)' },
            { stop: 0.5, color: 'rgba(24, 101, 242, 0.25)' },
            { stop: 1, color: 'rgba(56, 189, 248, 0.02)' }
          ]
        },
        // Wave 4: Deep inner sidebar wave (behind Recent Cases)
        {
          id: 'sb4',
          type: 'sidebar-flow',
          baseX: 110,
          baseY: 0,
          freq1: 0.0032,
          freq2: 0.0019,
          amp1: 50,
          amp2: 30,
          speed1: 0.00042,
          speed2: 0.00028,
          phase1: 0.9,
          phase2: 2.8,
          strokeWidth: 1.3,
          baseAlpha: 0.15,
          colorStops: [
            { stop: 0, color: 'rgba(24, 101, 242, 0.03)' },
            { stop: 0.6, color: 'rgba(24, 101, 242, 0.28)' },
            { stop: 1, color: 'rgba(10, 42, 90, 0.05)' }
          ]
        },
        // Wave 5: Sweeping Upper Halo Orbital Arc (loops above and around "How can we help you today?")
        {
          id: 'halo1',
          type: 'halo-arc',
          baseX: width * 0.58,
          baseY: height * 0.32,
          freq1: 0.0015,
          freq2: 0.0022,
          amp1: 380,
          amp2: 180,
          speed1: 0.0003,
          speed2: 0.00025,
          phase1: 0.4,
          phase2: 1.6,
          strokeWidth: 1.8,
          baseAlpha: 0.24,
          colorStops: [
            { stop: 0, color: 'rgba(24, 101, 242, 0.02)' },
            { stop: 0.25, color: 'rgba(24, 101, 242, 0.35)' },
            { stop: 0.5, color: 'rgba(56, 189, 248, 0.48)' },
            { stop: 0.75, color: 'rgba(24, 101, 242, 0.32)' },
            { stop: 1, color: 'rgba(14, 60, 160, 0.02)' }
          ]
        },
        // Wave 6: Secondary Companion Halo Arc (slightly larger, softer outer orbital curve)
        {
          id: 'halo2',
          type: 'halo-arc',
          baseX: width * 0.58,
          baseY: height * 0.34,
          freq1: 0.0012,
          freq2: 0.0018,
          amp1: 430,
          amp2: 210,
          speed1: 0.00025,
          speed2: 0.00035,
          phase1: 2.1,
          phase2: 0.8,
          strokeWidth: 1.2,
          baseAlpha: 0.16,
          colorStops: [
            { stop: 0, color: 'rgba(10, 42, 90, 0.02)' },
            { stop: 0.5, color: 'rgba(56, 189, 248, 0.25)' },
            { stop: 1, color: 'rgba(24, 101, 242, 0.02)' }
          ]
        },
        // Wave 7: Lower Workspace Drift (soft wave arcing toward bottom right)
        {
          id: 'drift1',
          type: 'ambient-drift',
          baseX: 200,
          baseY: height * 0.65,
          freq1: 0.002,
          freq2: 0.0015,
          amp1: 50,
          amp2: 30,
          speed1: 0.0004,
          speed2: 0.0003,
          phase1: 1.2,
          phase2: 2.5,
          strokeWidth: 1.3,
          baseAlpha: 0.14,
          colorStops: [
            { stop: 0, color: 'rgba(24, 101, 242, 0.02)' },
            { stop: 0.4, color: 'rgba(24, 101, 242, 0.22)' },
            { stop: 0.8, color: 'rgba(56, 189, 248, 0.18)' },
            { stop: 1, color: 'rgba(10, 30, 65, 0.02)' }
          ]
        }
      ];

      return isTablet ? waves.slice(0, 4) : waves;
    };

    // Draw one frame of flowing waves
    const render = (currentTime: number) => {
      const width = canvas.parentElement ? canvas.parentElement.clientWidth : window.innerWidth;
      const height = canvas.parentElement ? canvas.parentElement.clientHeight : window.innerHeight;

      ctx.clearRect(0, 0, width, height);

      const t = currentTime - startTime;
      const waves = getWaves(width, height);

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      waves.forEach((wave) => {
        ctx.beginPath();
        ctx.lineWidth = wave.strokeWidth;

        // Subtle soft glow
        ctx.shadowColor = 'rgba(24, 101, 242, 0.35)';
        ctx.shadowBlur = 8;

        if (wave.type === 'sidebar-flow') {
          // Vertical flowing ribbon
          const steps = 60;
          const stepY = height / steps;

          // Compute linear gradient along Y
          const grad = ctx.createLinearGradient(wave.baseX, 0, wave.baseX, height);
          wave.colorStops.forEach((cs) => {
            grad.addColorStop(cs.stop, cs.color);
          });
          ctx.strokeStyle = grad;

          for (let i = 0; i <= steps; i++) {
            const y = i * stepY;
            const xOffset =
              Math.sin(y * wave.freq1 + wave.phase1 + t * wave.speed1) * wave.amp1 +
              Math.cos(y * wave.freq2 + wave.phase2 + t * wave.speed2) * wave.amp2;

            const x = wave.baseX + xOffset;

            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
        } else if (wave.type === 'halo-arc') {
          // Sweeping orbital arc around upper central workspace
          const radiusX = wave.amp1 + Math.sin(t * wave.speed1 + wave.phase1) * 20;
          const radiusY = wave.amp2 + Math.cos(t * wave.speed2 + wave.phase2) * 15;
          const centerX = wave.baseX + Math.cos(t * 0.0002) * 15;
          const centerY = wave.baseY + Math.sin(t * 0.00025) * 10;

          const grad = ctx.createLinearGradient(
            centerX - radiusX,
            centerY - radiusY,
            centerX + radiusX,
            centerY + radiusY
          );
          wave.colorStops.forEach((cs) => {
            grad.addColorStop(cs.stop, cs.color);
          });
          ctx.strokeStyle = grad;

          const steps = 70;
          const startAngle = Math.PI * 0.95;
          const endAngle = Math.PI * 2.05;
          const angleStep = (endAngle - startAngle) / steps;

          for (let i = 0; i <= steps; i++) {
            const angle = startAngle + i * angleStep;
            const mod = Math.sin(angle * 3 + t * wave.speed1) * 8;
            const x = centerX + (radiusX + mod) * Math.cos(angle);
            const y = centerY + (radiusY + mod) * Math.sin(angle);

            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
        } else if (wave.type === 'ambient-drift') {
          // Horizontal undulating drift wave across lower region
          const steps = 50;
          const stepX = (width - wave.baseX) / steps;

          const grad = ctx.createLinearGradient(wave.baseX, wave.baseY, width, wave.baseY);
          wave.colorStops.forEach((cs) => {
            grad.addColorStop(cs.stop, cs.color);
          });
          ctx.strokeStyle = grad;

          for (let i = 0; i <= steps; i++) {
            const x = wave.baseX + i * stepX;
            const yOffset =
              Math.sin(x * wave.freq1 + wave.phase1 + t * wave.speed1) * wave.amp1 +
              Math.cos(x * wave.freq2 + wave.phase2 + t * wave.speed2) * wave.amp2;
            const y = wave.baseY + yOffset;

            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
        }

        ctx.stroke();
      });

      ctx.restore();

      // If user does not prefer reduced motion, continue animation loop
      if (!isReducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    // Initial render
    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`ambient-wave-field ${className}`}
      aria-hidden="true"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1
      }}
    />
  );
};
