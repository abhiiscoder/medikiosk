/**
 * MEDiKIOSK — VoiceWaveform Component
 * Live real-time audio visualizer inside the glowing blue capsule.
 *
 * Displays two symmetrical clusters of vertical white bars mirroring vertically,
 * dynamically reacting to microphone frequency & volume data from VoiceService.
 */

import React, { useEffect, useRef } from 'react';
import { voiceService } from '../../../services/voice.service';

interface VoiceWaveformProps {
  isMuted?: boolean;
  isAISpeaking?: boolean;
  className?: string;
}

export const VoiceWaveform: React.FC<VoiceWaveformProps> = ({
  isMuted = false,
  isAISpeaking = false,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const freqBufferRef = useRef<Uint8Array>(new Uint8Array(64));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const barCount = 42; // Total vertical bars
    const clusterSize = 18; // Bars per left/right cluster
    const centerGap = 6; // Bars in the central dip

    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.clientWidth || 280;
      const height = canvas.clientHeight || 54;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let phase = 0;

    const render = () => {
      const width = canvas.clientWidth || 280;
      const height = canvas.clientHeight || 54;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Get real microphone frequency data
      voiceService.getFrequencyData(freqBufferRef.current);
      const freqData = freqBufferRef.current;

      phase += 0.04;

      // Draw bars
      const barWidth = 2.2;
      const totalWidth = width - 36;
      const spacing = totalWidth / barCount;
      const startX = 18;

      ctx.save();
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = 'rgba(56, 189, 248, 0.7)';
      ctx.shadowBlur = 6;

      for (let i = 0; i < barCount; i++) {
        const x = startX + i * spacing;

        // Determine cluster weighting
        let clusterWeight = 0.3;
        if (i < clusterSize) {
          // Left cluster envelope (parabolic bell)
          const norm = (i / clusterSize) * Math.PI;
          clusterWeight = Math.sin(norm);
        } else if (i >= barCount - clusterSize) {
          // Right cluster envelope
          const norm = ((i - (barCount - clusterSize)) / clusterSize) * Math.PI;
          clusterWeight = Math.sin(norm);
        } else {
          // Center dip
          clusterWeight = 0.2;
        }

        // Calculate bar amplitude
        let rawAmp = 0;

        if (isMuted) {
          rawAmp = 1.5; // Minimal flatline when muted
        } else if (isAISpeaking) {
          // AI speaking dynamic waveform
          rawAmp = Math.sin(phase * 2 + i * 0.3) * 12 + 14;
        } else {
          // Real microphone audio level
          const freqIndex = Math.floor((i / barCount) * 32);
          const val = freqData[freqIndex] || 0;
          const audioLevel = val / 255;

          // Resting gentle breathing animation when quiet
          const restingWave = Math.sin(phase + i * 0.25) * 2 + 3;

          // If real audio exists, scale dynamically
          rawAmp = restingWave + audioLevel * 30 * clusterWeight;
        }

        const maxHalfHeight = (height - 12) / 2;
        const halfHeight = Math.min(Math.max(rawAmp, 2), maxHalfHeight);

        // Draw symmetrical rounded bar (top and bottom from centerY)
        const barTop = centerY - halfHeight;
        const barHeight = halfHeight * 2;
        const radius = barWidth / 2;

        ctx.beginPath();
        ctx.roundRect(x, barTop, barWidth, barHeight, radius);
        ctx.fill();
      }

      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [isMuted, isAISpeaking]);

  return (
    <canvas
      ref={canvasRef}
      className={`mk-voice-waveform-canvas ${className}`}
      aria-hidden="true"
      style={{
        width: '100%',
        height: '100%',
        display: 'block'
      }}
    />
  );
};
