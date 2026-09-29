import React, { useEffect, useRef } from 'react';

export const AudioVisualizer = ({ isRecording, audioLevel = 0, isLiveStream = false }) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const phaseRef = useRef(0);

  // Dynamically sync canvas internal resolution with container bounding box
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const updateDimensions = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Background subtle grid
      ctx.strokeStyle = '#f1ede1';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < width; x += 30) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y < height; y += 20) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // Center baseline
      ctx.strokeStyle = '#e4dcce';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      if (isRecording) {
        phaseRef.current += 0.08;

        // Draw dynamic emerald waveform
        const waveGradient = ctx.createLinearGradient(0, 0, width, 0);
        waveGradient.addColorStop(0, '#008751');
        waveGradient.addColorStop(0.5, '#22c55e');
        waveGradient.addColorStop(1, '#e5a93c'); // Warm gold peak

        ctx.strokeStyle = waveGradient;
        ctx.lineWidth = 2.5;
        ctx.beginPath();

        const amplitude = Math.max(12, audioLevel * (height / 2.2));
        const numPoints = 80;

        for (let i = 0; i <= numPoints; i++) {
          const x = (i / numPoints) * width;
          const envelope = Math.sin((i / numPoints) * Math.PI); // Taper edges
          const y = height / 2 + Math.sin(i * 0.3 + phaseRef.current) * amplitude * envelope;
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();

        // Secondary glow harmonic
        ctx.strokeStyle = 'rgba(229, 169, 60, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i <= numPoints; i++) {
          const x = (i / numPoints) * width;
          const envelope = Math.sin((i / numPoints) * Math.PI);
          const y = height / 2 + Math.cos(i * 0.25 - phaseRef.current * 0.8) * (amplitude * 0.6) * envelope;
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();

        // Spectrogram frequency bars at the bottom
        const barCount = 36;
        const barWidth = width / barCount - 2;
        for (let b = 0; b < barCount; b++) {
          const barHeight = Math.abs(Math.sin(b * 0.4 + phaseRef.current)) * (audioLevel * (height * 0.45));
          const barGradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
          barGradient.addColorStop(0, 'rgba(0, 135, 81, 0.2)');
          barGradient.addColorStop(1, 'rgba(229, 169, 60, 0.6)');
          ctx.fillStyle = barGradient;
          ctx.fillRect(b * (barWidth + 2), height - barHeight, barWidth, barHeight);
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isRecording, audioLevel]);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-28 sm:h-32 bg-cream-50 rounded-xl border border-federal-100 overflow-hidden shadow-inner flex flex-col justify-between p-3"
    >
      <div className="flex justify-between items-center z-10 pointer-events-none gap-2">
        <span className="text-[11px] sm:text-xs font-mono text-federal-700 font-semibold tracking-wider uppercase flex items-center gap-1.5 truncate">
          <span className={`w-2 h-2 rounded-full shrink-0 ${isRecording ? 'bg-red-500 animate-ping' : 'bg-slate-300'}`} />
          <span className="truncate">{isLiveStream ? "Sovereign Live Stream" : "Oscilloscope Waveform"}</span>
        </span>
        <span className="text-[10px] sm:text-xs font-mono text-slate-500 shrink-0">16kHz Mono</span>
      </div>

      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      <div className="flex justify-between items-end z-10 pointer-events-none text-[10px] sm:text-[11px] font-mono text-slate-400">
        <span>0.00s</span>
        <span className="truncate text-right ml-2">{isRecording ? "Live Audio Active" : "Waiting for audio input..."}</span>
      </div>
    </div>
  );
};
