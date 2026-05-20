import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';

interface Props {
  isActive: boolean;
  onInactive: () => void;
}

export interface ScreenCaptureHandle {
  captureFrame: () => string | null;
}

const ScreenCapture = forwardRef<ScreenCaptureHandle, Props>(({ isActive, onInactive }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    if (isActive) {
      void startCapture();
    } else {
      stopCapture();
    }
    return () => stopCapture();
  }, [isActive]);

  async function startCapture() {
    try {
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor',
        },
        audio: false,
      });

      mediaStream.getVideoTracks()[0].onended = () => {
        onInactive();
      };

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Error starting screen capture:', err);
      onInactive();
    }
  }

  function stopCapture() {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  useImperativeHandle(ref, () => ({
    captureFrame() {
      if (!videoRef.current || !stream) return null;
      try {
        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        const maxWidth = 1280;
        const scale = Math.min(1, maxWidth / video.videoWidth);
        canvas.width = video.videoWidth * scale;
        canvas.height = video.videoHeight * scale;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          return canvas.toDataURL('image/jpeg', 0.6);
        }
      } catch (err) {
        console.error('Error capturing screen frame:', err);
      }
      return null;
    },
  }));

  if (!isActive || !stream) return null;

  return (
    <div className="screen-preview-container">
      <div className="screen-preview-header">
        <span>Vision Active · Screen Feed</span>
        <button className="screen-preview-close" onClick={onInactive}>✕</button>
      </div>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="screen-preview-video"
      />
    </div>
  );
});

ScreenCapture.displayName = 'ScreenCapture';
export default ScreenCapture;
