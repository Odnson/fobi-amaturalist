import React, { useState } from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

function TaxonomyDetail({ fauna, checklist }) {
    const [currentIndex, setCurrentIndex] = useState(0);

    if (!Array.isArray(fauna) || fauna.length === 0) {
        return (
            <div className="bg-[#2c2c2c] rounded-lg p-4 border border-[#444]">
                <h2 className="text-xl font-semibold mb-4">Detail Taksonomi</h2>
                <div className="text-[#b0b0b0]">Data taksonomi tidak tersedia</div>
            </div>
        );
    }

    const currentFauna = fauna[currentIndex];

    const handlePrevious = () => {
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
    };

    const handleNext = () => {
        setCurrentIndex((prev) => (prev < fauna.length - 1 ? prev + 1 : prev));
    };

    const formatDate = (date) => {
        if (!date) return '-';
        return format(new Date(date), 'dd MMMM yyyy', { locale: id });
    };

    const formatTime = (time) => {
        if (!time) return '-';
        return time.substring(0, 5);
    };

    return (
        <div className="bg-[#2c2c2c] rounded-lg p-4 border border-[#444]">
            <div className="flex items-center gap-3 mb-4">
                <h2 className="text-xl font-semibold">Detail Taksonomi</h2>
                {fauna.length > 1 && (
                    <div className="flex items-center gap-1 ml-2 bg-[#1e1e1e] rounded-lg px-2 py-1 border border-[#444]">
                        <button
                            onClick={handlePrevious}
                            disabled={currentIndex === 0}
                            className={`flex items-center justify-center w-8 h-8 rounded-md transition-all ${
                                currentIndex === 0
                                    ? 'text-[#555] cursor-not-allowed'
                                    : 'text-[#1a73e8] hover:bg-[#333] active:bg-[#444]'
                            }`}
                            title="Sebelumnya"
                        >
                            <ChevronLeftIcon className="w-5 h-5" />
                        </button>
                        <span className="text-sm text-[#e0e0e0] font-medium px-2 min-w-[50px] text-center">
                            {currentIndex + 1} / {fauna.length}
                        </span>
                        <button
                            onClick={handleNext}
                            disabled={currentIndex === fauna.length - 1}
                            className={`flex items-center justify-center w-8 h-8 rounded-md transition-all ${
                                currentIndex === fauna.length - 1
                                    ? 'text-[#555] cursor-not-allowed'
                                    : 'text-[#1a73e8] hover:bg-[#333] active:bg-[#444]'
                            }`}
                            title="Selanjutnya"
                        >
                            <ChevronRightIcon className="w-5 h-5" />
                        </button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div>
                        <div className="text-sm text-[#b0b0b0]">Tingkat Takson</div>
                        <div className="font-medium text-[#e0e0e0]">
                            <span className={`px-2 py-0.5 rounded text-xs ${
                                currentFauna?.taxon_rank === 'SPECIES' ? 'bg-green-600' :
                                currentFauna?.taxon_rank === 'GENUS' ? 'bg-blue-600' :
                                currentFauna?.taxon_rank === 'FAMILY' ? 'bg-purple-600' :
                                currentFauna?.taxon_rank === 'ORDER' ? 'bg-orange-600' :
                                'bg-gray-600'
                            }`}>
                                {currentFauna?.taxon_rank || 'SPECIES'}
                            </span>
                        </div>
                    </div>
                    <div>
                        <div className="text-sm text-[#b0b0b0]">Family</div>
                        <div className="font-medium text-[#e0e0e0]">{currentFauna?.family || '-'}</div>
                    </div>
                    {currentFauna?.genus && (
                        <div>
                            <div className="text-sm text-[#b0b0b0]">Genus</div>
                            <div className="font-medium italic text-[#e0e0e0]">{currentFauna.genus}</div>
                        </div>
                    )}
                    {currentFauna?.species && (
                        <div>
                            <div className="text-sm text-[#b0b0b0]">Species</div>
                            <div className="font-medium italic text-[#e0e0e0]">{currentFauna.species}</div>
                        </div>
                    )}
                    <div>
                        <div className="text-sm text-[#b0b0b0]">Nama Lokal</div>
                        <div className="font-medium text-[#e0e0e0]">
                            {currentFauna?.nama_lokal || currentFauna?.nama_spesies || '-'}
                        </div>
                    </div>
                    <div>
                        <div className="text-sm text-[#b0b0b0]">Nama Ilmiah</div>
                        <div className="font-medium italic text-[#e0e0e0]">
                            {currentFauna?.nama_ilmiah || currentFauna?.nama_latin || currentFauna?.scientific_name || '-'}
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <div className="text-sm text-[#b0b0b0]">Tanggal Pengamatan</div>
                        <div className="font-medium text-[#e0e0e0]">{formatDate(checklist?.tgl_pengamatan)}</div>
                    </div>
                    <div>
                        <div className="text-sm text-[#b0b0b0]">Waktu Mulai</div>
                        <div className="font-medium text-[#e0e0e0]">{formatTime(checklist?.start_time)}</div>
                    </div>
                    <div>
                        <div className="text-sm text-[#b0b0b0]">Waktu Selesai</div>
                        <div className="font-medium text-[#e0e0e0]">{formatTime(checklist?.end_time)}</div>
                    </div>
                </div>

                {currentFauna?.breeding !== undefined && (
                    <div className="md:col-span-2 space-y-4">
                        <div>
                            <div className="text-sm text-[#b0b0b0]">Status Breeding</div>
                            <div className="font-medium text-[#e0e0e0]">
                                {currentFauna.breeding === 1 ? 'Ya' : 'Tidak'}
                            </div>
                        </div>
                        {currentFauna?.breeding_type_name && (
                            <div>
                                <div className="text-sm text-[#b0b0b0]">Tipe Breeding</div>
                                <div className="font-medium text-[#e0e0e0]">{currentFauna.breeding_type_name}</div>
                            </div>
                        )}
                        {currentFauna?.breeding_note && (
                            <div>
                                <div className="text-sm text-[#b0b0b0]">Catatan Breeding</div>
                                <div className="font-medium text-[#e0e0e0]">{currentFauna.breeding_note}</div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default TaxonomyDetail;
