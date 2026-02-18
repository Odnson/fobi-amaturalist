import React, { useState, useRef, useEffect } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faCheck, faRotateRight, faRotateLeft, faExpand, faCloud, faDesktop } from '@fortawesome/free-solid-svg-icons';
import { cropImage } from '../../utils/api';
import { toast } from 'react-toastify';

function ImageCropModal({ isOpen, onClose, imageUrl, onSave }) {
    const [crop, setCrop] = useState();
    const [completedCrop, setCompletedCrop] = useState(null);
    const [rotation, setRotation] = useState(0);
    const [scale, setScale] = useState(1);
    const [aspect, setAspect] = useState(undefined);
    const [useServerCrop, setUseServerCrop] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    const imgRef = useRef(null);
    const previewCanvasRef = useRef(null);
    useEffect(() => {
        const checkIsMobile = () => {
            const userAgent = navigator.userAgent || navigator.vendor || window.opera;
            const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
            const isSmallScreen = window.innerWidth <= 768;
            const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

            return isMobileDevice || (isSmallScreen && isTouchDevice);
        };

        setIsMobile(checkIsMobile());

        const handleResize = () => {
            setIsMobile(checkIsMobile());
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    useEffect(() => {
        if (isOpen) {
            setCrop(undefined);
            setRotation(0);
            setScale(1);
            setIsProcessing(false);
        }
    }, [isOpen]);

    function centerAspectCrop(mediaWidth, mediaHeight, aspect) {
        const cropWidth = isMobile ? 80 : 90;

        return centerCrop(
            makeAspectCrop(
                {
                    unit: '%',
                    width: cropWidth,
                },
                aspect,
                mediaWidth,
                mediaHeight,
            ),
            mediaWidth,
            mediaHeight,
        );
    }

    function getMobileFriendlyCrop(mediaWidth, mediaHeight) {
        const cropSize = Math.min(mediaWidth, mediaHeight) * 0.7; // 70% of the smaller dimension
        const x = (mediaWidth - cropSize) / 2;
        const y = (mediaHeight - cropSize) / 2;

        return {
            unit: 'px',
            x: x,
            y: y,
            width: cropSize,
            height: cropSize,
        };
    }

    function onImageLoad(e) {
        const { width, height } = e.currentTarget;
        const friendlyCrop = getMobileFriendlyCrop(width, height);
        setCrop(friendlyCrop);
        setCompletedCrop(friendlyCrop);
    }

    const rotateLeft = () => {
        setRotation(prev => (prev - 90) % 360);
    };

    const rotateRight = () => {
        setRotation(prev => (prev + 90) % 360);
    };

    const toggleAspectRatio = () => {
        if (aspect) {
            setAspect(undefined);
        } else {
            setAspect(1);
        }
    };

    const toggleCropMethod = () => {
        setUseServerCrop(!useServerCrop);
    };

    const handleSave = async () => {
        try {
            if (!completedCrop || !previewCanvasRef.current || !imgRef.current) {
                return;
            }

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                throw new Error('No 2d context');
            }
            const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
            const scaleY = imgRef.current.naturalHeight / imgRef.current.height;
            const pixelRatio = window.devicePixelRatio;
            const cropWidth = completedCrop.width * scaleX;
            const cropHeight = completedCrop.height * scaleY;
            let targetWidth = cropWidth;
            let targetHeight = cropHeight;
            const maxDimension = 1000;

            if (cropWidth > maxDimension || cropHeight > maxDimension) {
                if (cropWidth > cropHeight) {
                    targetWidth = maxDimension;
                    targetHeight = (cropHeight / cropWidth) * maxDimension;
                } else {
                    targetHeight = maxDimension;
                    targetWidth = (cropWidth / cropHeight) * maxDimension;
                }
            }
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            ctx.drawImage(
                imgRef.current,
                completedCrop.x * scaleX,
                completedCrop.y * scaleY,
                cropWidth,
                cropHeight,
                0,
                0,
                targetWidth,
                targetHeight
            );
            const blob = await new Promise((resolve) => {
                canvas.toBlob(
                    (b) => resolve(b),
                    'image/jpeg',
                    0.8 // 80% quality
                );
            });

            if (!blob) {
                throw new Error('Canvas is empty');
            }
            const croppedFile = new File([blob], 'cropped-image.jpg', {
                type: 'image/jpeg',
                lastModified: new Date().getTime(),
            });

            if (useServerCrop) {
                try {
                    setIsProcessing(true);
                    const croppedServerFile = await cropImage(croppedFile);
                    onSave(croppedServerFile);
                } catch (error) {
                    console.error('Error cropping image on server:', error);
                    toast?.error && toast.error('Gagal memproses gambar di server. Menggunakan hasil crop lokal.');
                    onSave(croppedFile);
                } finally {
                    setIsProcessing(false);
                }
            } else {
                onSave(croppedFile);
            }
        } catch (error) {
            console.error('Error saving cropped image:', error);
            toast?.error && toast.error('Gagal menyimpan gambar yang dipotong');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
            <div className={`bg-[#1e1e1e] rounded-lg shadow-lg w-full max-h-[90vh] overflow-hidden flex flex-col ${
                isMobile
                    ? 'p-2 mx-2 max-w-[95vw]'
                    : 'p-4 max-w-4xl'
            }`}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className={`font-semibold text-white ${
                        isMobile ? 'text-lg' : 'text-xl'
                    }`}>Potong Gambar</h2>
                    <button
                        onClick={onClose}
                        className={`text-gray-400 hover:text-white ${
                            isMobile ? 'p-2' : ''
                        }`}
                    >
                        <FontAwesomeIcon icon={faXmark} className={isMobile ? 'h-5 w-5' : 'h-6 w-6'} />
                    </button>
                </div>

                <div className="flex-1 overflow-auto mb-4 flex justify-center">
                    <div className="relative">
                        <ReactCrop
                            crop={crop}
                            onChange={(c) => setCrop(c)}
                            onComplete={(c) => setCompletedCrop(c)}
                            aspect={isMobile ? 1 : aspect} // Force square aspect on mobile for easier handling
                            className={isMobile ? 'max-h-[50vh] touch-manipulation' : 'max-h-[60vh]'}
                            minWidth={isMobile ? 100 : 50} // Larger minimum size for mobile
                            minHeight={isMobile ? 100 : 50}
                            keepSelection={true} // Keep selection visible
                            disabled={isProcessing}
                            style={{
                                '--ReactCrop-selection-border-width': isMobile ? '3px' : '1px',
                                '--ReactCrop-handle-size': isMobile ? '20px' : '12px',
                            }}
                        >
                            <img
                                ref={imgRef}
                                alt="Crop me"
                                src={imageUrl}
                                style={{
                                    transform: `scale(${scale}) rotate(${rotation}deg)`,
                                    maxHeight: isMobile ? '50vh' : '60vh',
                                    maxWidth: '100%',
                                    touchAction: 'none' // Prevent default touch behaviors
                                }}
                                onLoad={onImageLoad}
                                draggable={false}
                            />
                        </ReactCrop>
                    </div>
                </div>

                {/* Mobile-specific instructions */}
                {isMobile && (
                    <div className="bg-[#2c2c2c] p-3 rounded mb-4 text-sm text-gray-300">
                        <div className="flex items-center mb-2">
                            <div className="w-2 h-2 bg-[#1a73e8] rounded-full mr-2"></div>
                            <span className="font-medium">Tips untuk Mobile:</span>
                        </div>
                        <ul className="text-xs space-y-1 ml-4">
                            <li>• Seret kotak biru untuk memindahkan area crop</li>
                            <li>• Tarik sudut kotak untuk mengubah ukuran</li>
                            <li>• Area crop otomatis berbentuk persegi</li>
                        </ul>
                    </div>
                )}

                <div className={`flex justify-center mb-4 ${
                    isMobile
                        ? 'flex-wrap gap-2 space-x-0'
                        : 'space-x-4'
                }`}>
                    <button
                        onClick={rotateLeft}
                        className={`bg-[#2c2c2c] hover:bg-[#3c3c3c] text-white rounded hidden ${
                            isMobile ? 'p-3 text-sm' : 'p-2'
                        }`}
                        title="Putar kiri"
                        disabled={isProcessing}
                    >
                        <FontAwesomeIcon icon={faRotateLeft} />
                        {isMobile && <span className="ml-2">Kiri</span>}
                    </button>
                    <button
                        onClick={rotateRight}
                        className={`bg-[#2c2c2c] hover:bg-[#3c3c3c] text-white rounded hidden ${
                            isMobile ? 'p-3 text-sm' : 'p-2'
                        }`}
                        title="Putar kanan"
                        disabled={isProcessing}
                    >
                        <FontAwesomeIcon icon={faRotateRight} />
                        {isMobile && <span className="ml-2">Kanan</span>}
                    </button>
                    {/* Hide aspect ratio toggle on mobile since we force square */}
                    {!isMobile && (
                        <button
                            onClick={toggleAspectRatio}
                            className={`${aspect ? 'bg-[#1a73e8]' : 'bg-[#2c2c2c]'} hover:bg-[#3c3c3c] text-white p-2 rounded`}
                            title="Toggle rasio aspek 1:1"
                            disabled={isProcessing}
                        >
                            <FontAwesomeIcon icon={faExpand} />
                        </button>
                    )}
                    <button
                        onClick={toggleCropMethod}
                        className={`${useServerCrop ? 'bg-[#1a73e8]' : 'bg-[#2c2c2c]'} hover:bg-[#3c3c3c] text-white rounded flex items-center ${
                            isMobile ? 'p-3 text-sm' : 'p-2'
                        }`}
                        title={useServerCrop ? "Proses di server" : "Proses di browser"}
                        disabled={isProcessing}
                    >
                        <FontAwesomeIcon icon={useServerCrop ? faCloud : faDesktop} className="mr-2" />
                        {useServerCrop ? "Server" : "Browser"}
                    </button>
                </div>

                <div className={`flex space-x-3 ${
                    isMobile ? 'justify-center' : 'justify-end'
                }`}>
                    <button
                        onClick={onClose}
                        className={`text-gray-300 hover:text-white border border-[#444] rounded hover:bg-[#2c2c2c] transition-colors ${
                            isMobile ? 'px-6 py-3 text-base flex-1' : 'px-4 py-2'
                        }`}
                        disabled={isProcessing}
                    >
                        Batal
                    </button>
                    <button
                        onClick={handleSave}
                        className={`bg-[#1a73e8] text-white rounded hover:bg-[#1565c0] transition-colors flex items-center justify-center ${
                            isMobile ? 'px-6 py-3 text-base flex-1' : 'px-4 py-2'
                        } ${isProcessing ? 'opacity-70 cursor-not-allowed' : ''}`}
                        disabled={isProcessing}
                    >
                        {isProcessing ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                                Memproses...
                            </>
                        ) : (
                            <>
                                <FontAwesomeIcon icon={faCheck} className="mr-2" />
                                Simpan
                            </>
                        )}
                    </button>
                </div>
                
                {/* Canvas tersembunyi untuk preview */}
                <canvas
                    ref={previewCanvasRef}
                    style={{
                        display: 'none',
                        width: completedCrop?.width ?? 0,
                        height: completedCrop?.height ?? 0,
                    }}
                />
            </div>
        </div>
    );
}

export default ImageCropModal; 