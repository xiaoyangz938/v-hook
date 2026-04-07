import React, { useEffect, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { AlertCircle, Video, Square } from 'lucide-react';
import { motion } from 'framer-motion';

type ScreenRecorderProps = {
  targetId: string;
};

export default function ScreenRecorder({ targetId }: ScreenRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const canvasStreamRef = useRef<MediaStream | null>(null);
  const renderCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const isRenderingRef = useRef(false);
  const isRecordingRef = useRef(false);
  const stopPromiseResolverRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      canvasStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const startCaptureLoop = (target: HTMLElement, renderCanvas: HTMLCanvasElement) => {
    const context = renderCanvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas context is unavailable.');
    }

    const renderFrame = async () => {
      if (!isRecordingRef.current || isRenderingRef.current) {
        animationFrameRef.current = requestAnimationFrame(renderFrame);
        return;
      }

      isRenderingRef.current = true;
      try {
        const frameCanvas = await html2canvas(target, {
          backgroundColor: '#ffffff',
          useCORS: true,
          scale: 1,
          logging: false,
          ignoreElements: (element) => element.hasAttribute('data-screen-recorder-ui'),
          windowWidth: target.scrollWidth,
          windowHeight: target.scrollHeight,
        });

        if (renderCanvas.width !== frameCanvas.width || renderCanvas.height !== frameCanvas.height) {
          renderCanvas.width = frameCanvas.width;
          renderCanvas.height = frameCanvas.height;
        }

        context.clearRect(0, 0, renderCanvas.width, renderCanvas.height);
        context.drawImage(frameCanvas, 0, 0);
      } catch (error) {
        console.error('Error rendering recording frame:', error);
      } finally {
        isRenderingRef.current = false;
        animationFrameRef.current = requestAnimationFrame(renderFrame);
      }
    };

    animationFrameRef.current = requestAnimationFrame(renderFrame);
  };

  const finalizeRecording = async (mimeType: string) => {
    const blob = new Blob(chunksRef.current, { type: mimeType });

    if (blob.size === 0) {
      throw new Error('No video data was captured. Please record for 2-3 seconds and try again.');
    }

    setIsProcessing(true);

    try {
      const response = await fetch('/api/recordings/transcode', {
        method: 'POST',
        headers: {
          'Content-Type': 'video/webm',
        },
        body: blob,
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || 'Recording conversion failed.');
      }

      const mp4Blob = await response.blob();
      const disposition = response.headers.get('Content-Disposition');
      const fileNameMatch = disposition?.match(/filename="?([^"]+)"?/i);
      const fileName = fileNameMatch?.[1] || `v-hook-recording-${new Date().toISOString().replace(/:/g, '-')}.mp4`;
      const url = URL.createObjectURL(mp4Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error converting recording:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Recording conversion failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const startRecording = async () => {
    try {
      setErrorMessage(null);
      const target = document.getElementById(targetId);
      if (!target) {
        throw new Error('Recording target was not found.');
      }

      const renderCanvas = document.createElement('canvas');
      renderCanvasRef.current = renderCanvas;

      const stream = renderCanvas.captureStream(12);
      canvasStreamRef.current = stream;

      let mimeType = 'video/webm';
      const preferredTypes = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];

      for (const type of preferredTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          break;
        }
      }

      const options = {
        mimeType,
        videoBitsPerSecond: 12000000,
      };

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stopPromiseResolverRef.current?.();
        stopPromiseResolverRef.current = null;

        if (animationFrameRef.current !== null) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        canvasStreamRef.current?.getTracks().forEach((track) => track.stop());
        canvasStreamRef.current = null;
        renderCanvasRef.current = null;
        try {
          await finalizeRecording(mimeType);
        } catch (error) {
          console.error('Error finalizing recording:', error);
          setErrorMessage(error instanceof Error ? error.message : 'Recording conversion failed.');
        } finally {
          setIsRecording(false);
          setIsProcessing(false);
          isRecordingRef.current = false;
        }
      };

      isRecordingRef.current = true;
      setIsRecording(true);
      startCaptureLoop(target, renderCanvas);
      mediaRecorder.start(1000);
    } catch (err) {
      console.error('Error starting embedded screen record:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Recording failed to start.');
      setIsRecording(false);
      setIsProcessing(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      isRecordingRef.current = false;
      setIsRecording(false);
      setIsProcessing(true);

      const mediaRecorder = mediaRecorderRef.current;
      const waitForStop = new Promise<void>((resolve) => {
        stopPromiseResolverRef.current = resolve;
      });

      try {
        mediaRecorder.requestData();
      } catch (error) {
        console.error('Error requesting final recording data:', error);
      }

      window.setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, 150);

      waitForStop.catch(() => undefined);
    }
  };

  return (
    <div data-screen-recorder-ui className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-3">
      {errorMessage && (
        <div className="max-w-xs rounded-2xl border border-red-200 bg-white/95 px-4 py-3 text-sm text-red-600 shadow-lg backdrop-blur">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        </div>
      )}
      {isRecording ? (
        <motion.button
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          onClick={stopRecording}
          className="flex items-center gap-2 px-4 py-3 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors relative overflow-hidden"
        >
          <motion.div 
            animate={{ opacity: [1, 0.5, 1] }} 
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="absolute inset-0 bg-red-400 mix-blend-multiply"
          />
          <Square className="w-5 h-5 fill-current relative z-10" />
          <span className="font-medium relative z-10">Stop Recording</span>
        </motion.button>
      ) : isProcessing ? (
        <div className="flex items-center gap-2 rounded-full border border-gray-700 bg-gray-900/90 px-4 py-3 text-white shadow-lg backdrop-blur-md">
          <span className="font-medium">Converting to MP4...</span>
        </div>
      ) : (
        <motion.button
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          onClick={startRecording}
          className="flex items-center gap-2 px-4 py-3 bg-gray-900/90 backdrop-blur-md text-white rounded-full shadow-lg hover:bg-black transition-colors border border-gray-700"
        >
          <Video className="w-5 h-5" />
          <span className="font-medium">Record This Site</span>
        </motion.button>
      )}
    </div>
  );
}
