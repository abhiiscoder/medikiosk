/**
 * MEDiKIOSK — MicrophoneWaveform Component
 * Wide horizontal live audio waveform matching Target Reference Image 1.
 *
 * Spans between the left '+' button and right Stop button, rendering a symmetrical
 * horizontal sequence of vertical white audio tick bars dynamically reacting to
 * actual microphone audio frequency levels.
 */

import React, { useEffect, useRef } from 'react';
import { voiceService } from '../../../services/voice.service';

interface MicrophoneWaveformProps {
  isRecording?: boolean;
  className?: string;
}

export const MicrophoneWaveform: React.FC<MicrophoneWaveformProps> = ({
  isRecording = true,
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
    const barCount = 54; // Number of horizontal tick bars
    const barWidth = 2.0;

    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.clientWidth || 560;
      const height = canvas.clientHeight || 52;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let phase = 0;

    const render = () => {
      const width = canvas.clientWidth || 560;
      const height = canvas.clientHeight || 52;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Fetch real microphone audio data
      voiceService.getFrequencyData(freqBufferRef.current);
      const freqData = freqBufferRef.current;

      phase += 0.05;

      const totalWidth = width - 40;
      const spacing = totalWidth / (barCount - 1);
      const startX = 20;

      ctx.save();
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = 'rgba(56, 189, 248, 0.5)';
      ctx.shadowBlur = 4;

      for (let i = 0; i < barCount; i++) {
        const x = startX + i * spacing;

        // Symmetric parabolic envelope: max at center (i = barCount / 2), tapering to 0 at edges
        const normPos = i / (barCount - 1); // 0 to 1
        const envelope = Math.sin(normPos * Math.PI); // 0 at edges, 1 at center

        // Extract frequency corresponding to bar position
        const freqIdx = Math.floor(normPos * 32);
        const audioByte = freqData[freqIdx] || 0;
        const audioAmp = audioByte / 255;

        // Baseline resting wave during silence
        const restingAmp = Math.sin(phase + i * 0.22) * 1.5 + 2.5;

        // Total half height: baseline + dynamic microphone amplitude shaped by envelope
        let halfHeight = restingAmp;
        if (isRecording) {
          halfHeight += audioAmp * 24 * envelope;
        }

        // Apply envelope dampening at edges so outermost ticks are small dots
        halfHeight = Math.max(1.2, halfHeight * (0.2 + 0.8 * Math.pow(envelope, 1.2)));

        const maxHalf = (height - 10) / 2;
        const finalHalf = Math.min(halfHeight, maxHalf);

        const barTop = centerY - finalHalf;
        const barHeight = finalHalf * 2;
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
  }, [isRecording]);

  return (
    <div className={`mk-mic-waveform-container ${className}`}>
      <canvas
        ref={canvasRef}
        className="mk-mic-waveform-canvas"
        aria-hidden="true"
        style={{
          width: '100%',
          height: '100%',
          display: 'block'
        }}
      />
    </div>
  );
};
