import React, { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle, faTimes } from '@fortawesome/free-solid-svg-icons';

const ConfirmationModal = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    modalInfo,
    isSubmitting = false 
}) => {
    if (!modalInfo) return null;

    const handleChoice = (choice) => {
        onConfirm(choice);
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[9999]" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black bg-opacity-50" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-[#1e1e1e] p-6 text-left align-middle shadow-xl transition-all border border-[#444]">
                                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-white flex justify-between items-center mb-4">
                                    <div className="flex items-center">
                                        <FontAwesomeIcon 
                                            icon={faExclamationTriangle} 
                                            className="text-yellow-500 mr-3" 
                                        />
                                        Konfirmasi Identifikasi
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="text-gray-400 hover:text-white transition-colors"
                                        disabled={isSubmitting}
                                    >
                                        <FontAwesomeIcon icon={faTimes} />
                                    </button>
                                </Dialog.Title>

                                <div className="mt-2">
                                    <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4 mb-4">
                                        <p className="text-sm text-yellow-200">
                                            <strong>Spesies dengan ID lengkap ditemukan:</strong>
                                        </p>
                                        <p className="text-white font-medium mt-1">
                                            {modalInfo.species_with_research_grade?.scientific_name}
                                        </p>
                                        {modalInfo.species_with_research_grade?.common_name && (
                                            <p className="text-gray-300 text-sm">
                                                ({modalInfo.species_with_research_grade.common_name})
                                            </p>
                                        )}
                                    </div>

                                    <p className="text-gray-300 text-sm mb-6">
                                        Anda akan mengidentifikasi pada tingkat <strong>{modalInfo.proposed_rank}</strong> 
                                        dalam induk/keturunan yang sama dengan spesies yang sudah mencapai Kuorum. 
                                        Seberapa yakin Anda dengan identifikasi ini?
                                    </p>

                                    <div className="space-y-3">
                                        <button
                                            onClick={() => handleChoice('disagree')}
                                            disabled={isSubmitting}
                                            className="w-full px-4 py-3 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-left"
                                        >
                                            <div className="font-medium">🤔 Saya ragu-ragu</div>
                                            <div className="text-sm text-gray-300 mt-1">
                                                Identifikasi akan disimpan tetapi tidak mempengaruhi kuorum
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => handleChoice('agree')}
                                            disabled={isSubmitting}
                                            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-left"
                                        >
                                            <div className="font-medium">✅ Saya yakin</div>
                                            <div className="text-sm text-blue-200 mt-1">
                                                Identifikasi akan dihitung dalam kuorum dan dapat mempengaruhi grade
                                            </div>
                                        </button>
                                    </div>

                                    <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                                        <p className="text-xs text-blue-200">
                                            💡 <strong>Info:</strong> 
                                        </p>
                                    </div>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

export default ConfirmationModal;
