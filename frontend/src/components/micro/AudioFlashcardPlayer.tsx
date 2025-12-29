'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  Settings,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import {
  useMicroAudio,
  useAudioEnabled,
  useAudioPlaying,
  useAudioRate,
  useAudioPitch,
  setAudioEnabled,
  setAudioPlaying,
  setAudioRate,
  setAudioPitch,
} from '@/stores/microStore';

interface AudioFlashcardPlayerProps {
  frontText: string;
  backText: string;
  autoPlay?: boolean;
  onPlayComplete?: () => void;
}

export default function AudioFlashcardPlayer({
  frontText,
  backText,
  autoPlay = false,
  onPlayComplete,
}: AudioFlashcardPlayerProps) {
  const audio = useMicroAudio();
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

  const [currentSide, 'front' | 'back'] = useState<'front' | 'back'>('front');
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Auto-play on mount if enabled
  useEffect(() => {
    if (autoPlay && audio.isEnabled) {
      handlePlay('front');
    }
    // Cleanup on unmount
    return () => {
      if (synthRef.current) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handlePlay = (side: 'front' | 'back') => {
    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported');
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const textToSpeak = side === 'front' ? frontText : backText;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);

    // Configure voice settings
    utterance.rate = audio.rate;
    utterance.pitch = audio.pitch;
    utterance.volume = 1.0;

    // Select a good voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (v) => v.lang === 'en-US' && v.name.includes('Google')
    ) || voices.find((v) => v.lang === 'en-US') || voices[0];

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    // Event handlers
    utterance.onstart = () => {
      setIsPlaying(true);
      setAudioPlaying(true, textToSpeak);
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setAudioPlaying(false);

      // Auto-play back side after front if configured
      if (side === 'front' && autoPlay) {
        setTimeout(() => handlePlay('back'), 500);
      } else if (side === 'back' && onPlayComplete) {
        onPlayComplete();
      }
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event.error);
      setIsPlaying(false);
      setAudioPlaying(false);
    };

    synthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setCurrentSide(side);
  };

  const handlePause = () => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setAudioPlaying(false);
    }
  };

  const handleReplay = () => {
    handlePlay(currentSide);
  };

  const handleToggleAudio = () => {
    const newState = !audio.isEnabled;
    setAudioEnabled(newState);

    if (!newState && isPlaying) {
      handlePause();
    }
  };

  const handleRateChange = (newRate: number) => {
    setAudioRate(newRate);
  };

  const handlePitchChange = (newPitch: number) => {
    setAudioPitch(newPitch);
  };

  return (
    <div className="space-y-4">
      {/* Audio Controls Bar */}
      <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 rounded-lg px-4 py-2">
        <div className="flex items-center gap-2">
          {/* Toggle Audio */}
          <button
            onClick={handleToggleAudio}
            className={`
              p-2 rounded-lg transition-colors
              ${
                audio.isEnabled
                  ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600'
              }
            `}
            title={audio.isEnabled ? 'Audio enabled' : 'Audio disabled'}
          >
            {audio.isEnabled ? (
              <Volume2 className="w-5 h-5" />
            ) : (
              <VolumeX className="w-5 h-5" />
            )}
          </button>

          {/* Play Controls */}
          {audio.isEnabled && (
            <>
              {!isPlaying ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePlay('front')}
                    className="p-2 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title="Play front"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handlePlay('back')}
                    className="p-2 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title="Play back"
                  >
                    <Play className="w-4 h-4 rotate-180" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={handlePause}
                  className="p-2 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  title="Pause"
                >
                  <Pause className="w-4 h-4" />
                </button>
              )}
            </>
          )}

          {/* Replay */}
          {audio.isEnabled && !isPlaying && synthRef.current && (
            <button
              onClick={handleReplay}
              className="p-2 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Replay"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Settings */}
        {audio.isEnabled && (
          <div className="relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Audio settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            {showSettings && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 z-10">
                {/* Rate Control */}
                <div className="mb-3">
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                    Speed: {audio.rate.toFixed(1)}x
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={audio.rate}
                    onChange={(e) => handleRateChange(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>Slow</span>
                    <span>Fast</span>
                  </div>
                </div>

                {/* Pitch Control */}
                <div>
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                    Pitch: {audio.pitch.toFixed(1)}
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={audio.pitch}
                    onChange={(e) => handlePitchChange(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>Low</span>
                    <span>High</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Now Playing Indicator */}
      {isPlaying && audio.currentText && (
        <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
          <span className="text-xs font-medium text-blue-800 dark:text-blue-200">
            Playing: {currentSide === 'front' ? 'Question' : 'Answer'}
          </span>
        </div>
      )}

      {/* Disabled Notice */}
      {!audio.isEnabled && (
        <div className="text-center text-xs text-gray-400 dark:text-gray-500">
          Audio is disabled. Click the speaker icon to enable text-to-speech.
        </div>
      )}
    </div>
  );
}

// SM-2 Rating Buttons for Micro Sessions
export function MicroReviewButtons({
  onReview,
  disabled = false,
}: {
  onReview: (quality: number) => void;
  disabled?: boolean;
}) {
  const buttons = [
    { quality: 0, label: 'Again', color: 'danger', description: '< 1 min' },
    { quality: 3, label: 'Hard', color: 'secondary', description: '6 min' },
    { quality: 4, label: 'Good', color: 'primary', description: '10 min' },
    { quality: 5, label: 'Easy', color: 'success', description: '1 day' },
  ] as const;

  return (
    <div className="grid grid-cols-4 gap-2">
      {buttons.map((btn) => (
        <Button
          key={btn.quality}
          variant={btn.color}
          size="sm"
          disabled={disabled}
          fullWidth
          onClick={() => onReview(btn.quality)}
          className="flex-col"
        >
          <span className="font-medium">{btn.label}</span>
          <span className="text-xs opacity-75">{btn.description}</span>
        </Button>
      ))}
    </div>
  );
}
