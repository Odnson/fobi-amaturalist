import React, { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faPause, faVolumeHigh } from '@fortawesome/free-solid-svg-icons';
import { getSourceLogo } from '../../utils/mapHelpers';
import defaultBirdLogo from '../../assets/icon/icon.png';
import defaultButterflyLogo from '../../assets/icon/kupnes.png';
import defaultFobiLogo from '../../assets/icon/ico.png';

const AudioPlayer = ({ audioUrl }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  const togglePlay = (e) => {
    e.stopPropagation();
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.addEventListener('ended', () => {
        setIsPlaying(false);
      });
    }
  }, []);

  return (
    <div className="absolute bottom-5 right-1" style={{zIndex: 4}}>
      <button
        onClick={togglePlay}
        className="bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full transition-colors"
      >
        <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} className="w-3 h-3" />
      </button>
      <audio ref={audioRef} src={audioUrl} className="hidden" />
    </div>
  );
};

export const MediaSlider = ({ images, spectrogram, audioUrl, type, isEager, mediaData, soundsData }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const mediaItems = [];
  if (images && Array.isArray(images)) {
    images.forEach((img, idx) => {
      const imageUrl = typeof img === 'string' ? img : img?.url || img?.images || img?.file_path;
      const mData = Array.isArray(mediaData) ? mediaData[idx] : null;
      if (imageUrl) {
        mediaItems.push({
          type: 'image',
          url: imageUrl,
          photographer: mData?.photographer || null,
          license: mData?.license || null,
        });
      }
    });
  }
  if (spectrogram) {
    const sData = Array.isArray(soundsData) ? soundsData[0] : null;
    mediaItems.push({
      type: 'spectrogram',
      url: spectrogram,
      audioUrl,
      photographer: sData?.photographer || null,
      license: sData?.license || null,
    });
  }
  if (mediaItems.length === 0) {
    let defaultLogo;
    switch (type) {
      case 'burungnesia':
      case 'burungnesia_fobi':
        defaultLogo = defaultBirdLogo;
        break;
      case 'kupunesia':
      case 'kupunesia_fobi':
        defaultLogo = defaultButterflyLogo;
        break;
      default:
        defaultLogo = defaultFobiLogo;
    }
    mediaItems.push({
      type: 'logo',
      url: defaultLogo
    });
  }

  const handleNext = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % mediaItems.length);
  };

  const handlePrev = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + mediaItems.length) % mediaItems.length);
  };

  const currentItem = mediaItems[currentIndex];

  return (
    <div className="relative w-full h-full bg-gray-100 rounded-lg overflow-hidden">
      {/* Main Media Display */}
      <div className="w-full h-full">
        <img
          src={currentItem.url}
          alt={currentItem.type === 'logo' ? 'Logo' : 'Media'}
          className={`w-full h-full ${currentItem.type === 'logo' ? 'object-contain p-2' : 'object-cover'}`}
          loading={isEager ? "eager" : "lazy"}
        />
        
        {/* Audio Player untuk Spectrogram */}
        {currentItem.type === 'spectrogram' && currentItem.audioUrl && (
          <AudioPlayer audioUrl={currentItem.audioUrl} />
        )}
      </div>

      {/* Overlay Photographer + License */}
      {currentItem.type !== 'logo' && currentItem.photographer && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 pt-3 pb-1 pointer-events-none" style={{zIndex: 2}}>
          <div className="flex items-center gap-1 text-[10px] text-white/90 leading-tight">
            <span className="font-medium truncate">&copy; {currentItem.photographer}</span>
            {currentItem.license && (
              <span className="opacity-70 shrink-0">| {currentItem.license}</span>
            )}
          </div>
        </div>
      )}

      {/* Navigation Dots - hanya tampil jika ada lebih dari 1 media */}
      {mediaItems.length > 1 && (
        <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex space-x-1" style={{zIndex: 3}}>
          {mediaItems.map((_, idx) => (
            <button
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(idx);
              }}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                idx === currentIndex ? 'bg-white' : 'bg-white/50'
              }`}
            />
          ))}
        </div>
      )}

      {/* Audio/Spectrogram Indicator */}
      {currentItem.type === 'spectrogram' && (
        <div className="absolute top-1 right-1 bg-black/50 p-1.5 rounded-full">
          <FontAwesomeIcon icon={faVolumeHigh} className="w-3 h-3 text-white" />
        </div>
      )}
    </div>
  );
};

export default MediaSlider; 