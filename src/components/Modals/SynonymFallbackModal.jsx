import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faFlag, faInfoCircle, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import TaxaFlagReport from '../TaxaFlagReport/TaxaFlagReport';

const SynonymFallbackModal = ({ 
    isOpen, 
    onClose, 
    synonymData = [], // Array of synonym fallback data
    onFlagTaxa = null 
}) => {
    const [showFlagModal, setShowFlagModal] = useState(false);
    const [selectedTaxaForFlag, setSelectedTaxaForFlag] = useState(null);

    if (!isOpen || !synonymData.length) return null;

    const handleFlagTaxa = (synonymItem) => {
        setSelectedTaxaForFlag({
            taxaId: synonymItem.synonymTaxaId,
            taxaName: synonymItem.synonymName,
            originalName: synonymItem.originalName
        });
        setShowFlagModal(true);
    };

    const handleCloseFlagModal = () => {
        setShowFlagModal(false);
        setSelectedTaxaForFlag(null);
    };

    return (
        <>
            {/* Main Synonym Fallback Modal */}
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 text-white">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                            <FontAwesomeIcon icon={faInfoCircle} className="text-blue-400" />
                            <h3 className="text-lg font-semibold">Synonym Fallback Digunakan</h3>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-white transition-colors"
                        >
                            <FontAwesomeIcon icon={faXmark} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="mb-6">
                        <div className="flex items-center space-x-2 mb-3">
                            <FontAwesomeIcon icon={faExclamationTriangle} className="text-yellow-400" />
                            <p className="text-sm text-gray-300">
                            Kami menemukan nama taksa ini bermasalah dalam struktur database kami. Kami akan menandai taksa ini untuk tindakan perbaikan. Selanjutnya observasi ini akan otomatis menjadi Synonym dari taksa ini. Kami akan beritahu anda jika kami sudah menyelesaikan masalah ini.
                            </p>
                        </div>

                        <div className="space-y-3 max-h-60 overflow-y-auto">
                            {synonymData.map((item, index) => (
                                <div key={index} className="bg-gray-700 rounded-lg p-3">
                                    <div className="text-sm">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-gray-300">Original:</span>
                                            <button
                                                onClick={() => handleFlagTaxa(item)}
                                                className="text-yellow-400 hover:text-yellow-300 transition-colors"
                                                title="Laporkan masalah dengan taxa ini"
                                            >
                                                <FontAwesomeIcon icon={faFlag} className="text-xs" />
                                            </button>
                                        </div>
                                        <div className="text-red-300 font-mono text-xs mb-2">
                                            "{item.originalName}"
                                        </div>
                                        <div className="text-gray-300 text-xs mb-1">Menggunakan synonym:</div>
                                        <div className="text-green-300 font-mono text-xs">
                                            "{item.synonymName}"
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end space-x-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        >
                            Mengerti
                        </button>
                    </div>
                </div>
            </div>

            {/* Taxa Flag Report Modal */}
            {showFlagModal && selectedTaxaForFlag && (
                <TaxaFlagReport
                    open={showFlagModal}
                    onClose={handleCloseFlagModal}
                    taxaId={selectedTaxaForFlag.taxaId}
                    taxaName={selectedTaxaForFlag.originalName} // Report the original name that caused the issue
                    flagType="synonym_issue" // Specific flag type for synonym issues
                />
            )}
        </>
    );
};

export default SynonymFallbackModal;
