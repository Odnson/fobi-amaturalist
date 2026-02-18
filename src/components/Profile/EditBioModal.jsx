import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faSave, faSpinner } from '@fortawesome/free-solid-svg-icons';
import DOMPurify from 'dompurify';

const EditBioModal = ({ isOpen, onClose, currentBio, onSave }) => {
    const [bio, setBio] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen) {
            setBio(currentBio || '');
            setError(null);
        }
    }, [isOpen, currentBio]);

    const modules = {
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            [{ 'color': [] }, { 'background': [] }],
            ['clean']
        ],
    };

    const formats = [
        'header',
        'bold', 'italic', 'underline', 'strike',
        'list', 'bullet',
        'color', 'background'
    ];
    const processLinks = (html) => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        const links = tempDiv.querySelectorAll('a');
        links.forEach(link => {
            let href = link.getAttribute('href');
            if (href && !href.startsWith('http://') && !href.startsWith('https://') && !href.startsWith('mailto:')) {
                href = 'https://' + href;
                link.setAttribute('href', href);
            }
            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener noreferrer');
        });
        
        return tempDiv.innerHTML;
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);

        try {
            const token = localStorage.getItem('jwt_token');
            const processedBio = processLinks(bio);
            const sanitizedBio = DOMPurify.sanitize(processedBio, {
                ADD_ATTR: ['target', 'rel']
            });
            
            const response = await fetch(`${import.meta.env.VITE_API_URL}/profile/update-bio`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ bio: sanitizedBio })
            });

            const data = await response.json();

            if (data.success) {
                onSave(sanitizedBio);
                onClose();
            } else {
                setError(data.message || 'Gagal menyimpan bio');
            }
        } catch (err) {
            console.error('Error saving bio:', err);
            setError('Terjadi kesalahan saat menyimpan bio');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />
            
            {/* Modal */}
            <div className="relative bg-[#1a1a1a] rounded-2xl w-full max-w-4xl mx-4 border border-[#333] shadow-2xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-[#333]">
                    <h2 className="text-xl font-bold text-white">Edit Bio</h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-white hover:bg-[#333] rounded-lg transition-colors"
                    >
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 overflow-y-auto overflow-x-visible">
                    <p className="text-gray-400 text-sm mb-4">
                        Ceritakan tentang diri Anda, latar belakang, dan minat Anda dalam observasi alam.
                    </p>

                    {error && (
                        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="bio-editor">
                        <ReactQuill
                            theme="snow"
                            value={bio}
                            onChange={setBio}
                            modules={modules}
                            formats={formats}
                            placeholder="Tulis bio Anda di sini..."
                            className="bg-[#252525] rounded-lg"
                        />
                    </div>

                    <p className="text-gray-500 text-xs mt-3">
                        Tips: Bio yang baik mencakup latar belakang, keahlian, dan minat Anda dalam bidang observasi alam.
                    </p>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-[#333]">
                    <button
                        onClick={onClose}
                        disabled={saving}
                        className="px-5 py-2.5 bg-[#333] text-gray-300 rounded-lg hover:bg-[#444] transition-colors disabled:opacity-50"
                    >
                        Batal
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-5 py-2.5 bg-[#3B82F6] text-white rounded-lg hover:bg-[#2563EB] transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {saving ? (
                            <>
                                <FontAwesomeIcon icon={faSpinner} spin />
                                <span>Menyimpan...</span>
                            </>
                        ) : (
                            <>
                                <FontAwesomeIcon icon={faSave} />
                                <span>Simpan</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Custom styles for Quill editor */}
            <style>{`
                .bio-editor .ql-toolbar {
                    background: #333;
                    border: 1px solid #444;
                    border-radius: 8px 8px 0 0;
                }
                .bio-editor .ql-toolbar .ql-stroke {
                    stroke: #9ca3af;
                }
                .bio-editor .ql-toolbar .ql-fill {
                    fill: #9ca3af;
                }
                .bio-editor .ql-toolbar .ql-picker {
                    color: #9ca3af;
                }
                .bio-editor .ql-toolbar button:hover .ql-stroke,
                .bio-editor .ql-toolbar button.ql-active .ql-stroke {
                    stroke: #3B82F6;
                }
                .bio-editor .ql-toolbar button:hover .ql-fill,
                .bio-editor .ql-toolbar button.ql-active .ql-fill {
                    fill: #3B82F6;
                }
                .bio-editor .ql-container {
                    background: #252525;
                    border: 1px solid #444;
                    border-top: none;
                    border-radius: 0 0 8px 8px;
                    min-height: 350px;
                    max-height: 450px;
                    overflow-y: auto;
                }
                .bio-editor .ql-editor {
                    color: #e5e7eb;
                    font-size: 14px;
                    line-height: 1.6;
                }
                .bio-editor .ql-editor.ql-blank::before {
                    color: #6b7280;
                    font-style: italic;
                }
                .bio-editor .ql-editor a {
                    color: #60A5FA;
                }
                .bio-editor .ql-picker-options {
                    background: #333;
                    border-color: #444;
                }
                .bio-editor .ql-picker-item {
                    color: #9ca3af;
                }
                .bio-editor .ql-picker-item:hover {
                    color: #3B82F6;
                }
                .bio-editor .ql-tooltip {
                    z-index: 9999 !important;
                    background: #333 !important;
                    border: 1px solid #444 !important;
                    color: #e5e7eb !important;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5) !important;
                    border-radius: 8px !important;
                    padding: 8px 12px !important;
                    position: fixed !important;
                    left: 50% !important;
                    top: 50% !important;
                    transform: translate(-50%, -50%) !important;
                }
                .bio-editor .ql-tooltip input[type="text"] {
                    background: #252525 !important;
                    border: 1px solid #555 !important;
                    color: #e5e7eb !important;
                    border-radius: 4px !important;
                    padding: 6px 10px !important;
                    width: 200px !important;
                }
                .bio-editor .ql-tooltip input[type="text"]:focus {
                    border-color: #3B82F6 !important;
                    outline: none !important;
                }
                .bio-editor .ql-tooltip a.ql-action,
                .bio-editor .ql-tooltip a.ql-remove {
                    color: #60A5FA !important;
                }
                .bio-editor .ql-tooltip a.ql-action:hover,
                .bio-editor .ql-tooltip a.ql-remove:hover {
                    color: #93C5FD !important;
                }
                .bio-editor .ql-tooltip::before {
                    color: #9ca3af !important;
                }
            `}</style>
        </div>
    );
};

export default EditBioModal;
