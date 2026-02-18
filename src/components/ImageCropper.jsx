import React, { useState, useRef, useEffect } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheck,
  faXmark,
  faRotateRight,
  faRotateLeft,
  faArrowsAlt,
  faExpand,
  faCompress,
  faCircleInfo
} from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-hot-toast';

function ImageCropper({ image, onCropComplete, onCancel, aspectRatio = null }) {
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [scale, setScale] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [isFreeAspectRatio, setIsFreeAspectRatio] = useState(!aspectRatio);
  const imgRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const blobUrlRef = useRef("");
  function centerAspectCrop(mediaWidth, mediaHeight, aspect) {
    return centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 90,
        },
        aspect,
        mediaWidth,
        mediaHeight
      ),
      mediaWidth,
      mediaHeight
    );
  }
  const onImageLoad = (e) => {
    const { width, height } = e.currentTarget;
    const aspect = aspectRatio || width / height;
    
    setCrop(centerAspectCrop(width, height, aspect));
  };
  useEffect(() => {
    if (completedCrop?.width && completedCrop?.height && imgRef.current && previewCanvasRef.current) {
      const canvas = previewCanvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        return;
      }
      const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
      const scaleY = imgRef.current.naturalHeight / imgRef.current.height;
      
      canvas.width = completedCrop.width * scaleX;
      canvas.height = completedCrop.height * scaleY;
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(scale, scale);
      
      const cropX = completedCrop.x * scaleX;
      const cropY = completedCrop.y * scaleY;
      const cropWidth = completedCrop.width * scaleX;
      const cropHeight = completedCrop.height * scaleY;
      
      ctx.drawImage(
        imgRef.current,
        cropX, cropY, cropWidth, cropHeight,
        -cropWidth / 2, -cropHeight / 2, cropWidth, cropHeight
      );
      
      ctx.restore();
    }
  }, [completedCrop, rotation, scale]);
  const generateCroppedImage = async () => {
    if (!completedCrop || !previewCanvasRef.current) {
      toast.error('Silakan pilih area crop terlebih dahulu');
      return;
    }

    try {
      setLoading(true);
      const canvas = previewCanvasRef.current;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
      const blob = await new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.95);
      });
      
      if (!blob) {
        throw new Error('Gagal membuat gambar hasil crop');
      }
      const formData = new FormData();
      formData.append('image', blob, 'cropped-image.jpg');
      formData.append('x', Math.round(completedCrop.x));
      formData.append('y', Math.round(completedCrop.y));
      formData.append('width', Math.round(completedCrop.width));
      formData.append('height', Math.round(completedCrop.height));
      const response = await fetch(`${import.meta.env.VITE_API_URL}/crop-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
          'Accept': 'application/json',
        },
        body: formData,
        credentials: 'same-origin'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Gagal memotong gambar');
      }
      blobUrlRef.current = URL.createObjectURL(blob);
      onCropComplete({
        blob,
        blobUrl: blobUrlRef.current,
        imagePath: data.data.imagePath,
        dimensions: data.data.dimensions,
        url: data.data.url
      });
      
      toast.success('Gambar berhasil dipotong');
    } catch (error) {
      console.error('Error cropping image:', error);
      toast.error(`Gagal memotong gambar: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  const toggleAspectRatio = () => {
    setIsFreeAspectRatio(!isFreeAspectRatio);
    
    if (imgRef.current) {
      const { width, height } = imgRef.current;
      
      if (isFreeAspectRatio) {
        const aspect = aspectRatio || width / height;
        setCrop(centerAspectCrop(width, height, aspect));
      } else {
        setCrop({
          unit: '%',
          width: 80,
          height: 80,
          x: 10,
          y: 10
        });
      }
    }
  };
  const rotateImage = (angle) => {
    setRotation((prev) => (prev + angle) % 360);
  };
  const changeScale = (value) => {
    setScale(parseFloat(value));
  };
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
    };
  }, []);

  return (
    <div className="image-cropper bg-[#1e1e1e] text-[#e0e0e0] p-4 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Potong Gambar</h3>
        <div className="flex space-x-2">
          <button
            type="button"
            className="p-2 rounded-full hover:bg-[#333] text-gray-400"
            onClick={() => setShowInfo(!showInfo)}
          >
            <FontAwesomeIcon icon={faCircleInfo} />
          </button>
          <button
            type="button"
            className="p-2 rounded-full hover:bg-[#333] text-gray-400"
            onClick={onCancel}
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
      </div>

      {showInfo && (
        <div className="bg-[#2c2c2c] p-3 rounded-lg mb-4 text-sm">
          <p className="mb-2">Petunjuk:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Seret untuk memindahkan area crop</li>
            <li>Gunakan tombol rotasi untuk memutar gambar</li>
            <li>Gunakan slider untuk memperbesar/memperkecil gambar</li>
            <li>Klik tombol aspek rasio untuk beralih antara aspek rasio bebas dan tetap</li>
          </ul>
        </div>
      )}

      <div className="crop-container bg-[#2c2c2c] p-2 rounded-lg mb-4 overflow-hidden">
        <ReactCrop
          crop={crop}
          onChange={(c) => setCrop(c)}
          onComplete={(c) => setCompletedCrop(c)}
          aspect={isFreeAspectRatio ? undefined : (aspectRatio || undefined)}
          className="max-h-[60vh] mx-auto"
        >
          <img
            ref={imgRef}
            src={image}
            alt="Gambar untuk di-crop"
            style={{
              transform: `scale(${scale}) rotate(${rotation}deg)`,
              maxHeight: '60vh',
              maxWidth: '100%'
            }}
            onLoad={onImageLoad}
          />
        </ReactCrop>
      </div>

      <div className="controls space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex space-x-2">
            <button
              type="button"
              className="p-2 bg-[#2c2c2c] rounded hover:bg-[#333] text-gray-300"
              onClick={() => rotateImage(-90)}
              title="Rotasi kiri"
            >
              <FontAwesomeIcon icon={faRotateLeft} />
            </button>
            <button
              type="button"
              className="p-2 bg-[#2c2c2c] rounded hover:bg-[#333] text-gray-300"
              onClick={() => rotateImage(90)}
              title="Rotasi kanan"
            >
              <FontAwesomeIcon icon={faRotateRight} />
            </button>
            <button
              type="button"
              className="p-2 bg-[#2c2c2c] rounded hover:bg-[#333] text-gray-300"
              onClick={toggleAspectRatio}
              title={isFreeAspectRatio ? "Gunakan aspek rasio tetap" : "Gunakan aspek rasio bebas"}
            >
              <FontAwesomeIcon icon={isFreeAspectRatio ? faExpand : faCompress} />
            </button>
          </div>

          <div className="scale-control flex items-center space-x-2">
            <span className="text-sm">Zoom:</span>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={scale}
              onChange={(e) => changeScale(e.target.value)}
              className="w-24 accent-[#1a73e8]"
            />
          </div>
        </div>

        <div className="flex justify-between">
          <div className="preview-container">
            <canvas
              ref={previewCanvasRef}
              style={{
                display: 'none',
                width: completedCrop?.width ?? 0,
                height: completedCrop?.height ?? 0
              }}
            />
          </div>

          <div className="buttons flex space-x-2">
            <button
              type="button"
              className="px-4 py-2 bg-[#2c2c2c] text-gray-300 rounded hover:bg-[#333]"
              onClick={onCancel}
            >
              Batal
            </button>
            <button
              type="button"
              className="px-4 py-2 bg-[#1a73e8] text-white rounded hover:bg-[#1565c0] flex items-center space-x-2"
              onClick={generateCroppedImage}
              disabled={loading || !completedCrop?.width || !completedCrop?.height}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faCheck} />
                  <span>Terapkan</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ImageCropper; 