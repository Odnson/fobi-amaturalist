import React from 'react';

const ConfidenceIndicator = ({ 
    percentage, 
    totalParticipants, 
    agreements, 
    isMostAgreed = false, 
    compact = false,
    showLabel = true 
}) => {
    const getPercentageColor = (percentage) => {
        if (percentage >= 80) return 'text-green-400';
        if (percentage >= 60) return 'text-yellow-400';
        return 'text-red-400';
    };

    const getProgressBarColor = (percentage) => {
        if (percentage >= 80) return 'bg-green-500';
        if (percentage >= 60) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    const getQuorumStatus = (agreements, totalParticipants) => {
        const quorumThreshold = Math.max(2, Math.ceil((2/3) * totalParticipants));
        return agreements >= quorumThreshold;
    };

    const hasQuorum = getQuorumStatus(agreements, totalParticipants);

    if (compact) {
        return (
            <div className="flex items-center gap-2">
                {showLabel && (
                    <span className="text-xs text-gray-400">Keyakinan:</span>
                )}
                <span className={`text-xs font-semibold ${getPercentageColor(percentage)}`}>
                    {percentage ? `${percentage}%` : '0%'}
                </span>
                <div className="w-12 bg-[#444] rounded-full h-1.5">
                    <div 
                        className={`h-1.5 rounded-full transition-all duration-300 ${getProgressBarColor(percentage)}`}
                        style={{ width: `${percentage || 0}%` }}
                    ></div>
                </div>
                <span className="text-xs text-gray-400">
                    ({agreements}/{totalParticipants})
                </span>
                {isMostAgreed && hasQuorum && (
                    <span className="text-xs bg-green-900/30 text-green-300 px-1.5 py-0.5 rounded border border-green-500/30">
                        Terdepan
                    </span>
                )}
            </div>
        );
    }

    return (
        <div className="bg-[#2c2c2c] border border-[#444] rounded-lg p-3 mt-2">
            <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-300">Tingkat Keyakinan Komunitas</h4>
                {hasQuorum && (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-900/30 text-green-300 border border-green-500/30">
                        Kuorum Tercapai
                    </span>
                )}
            </div>
            
            <div className="flex items-center space-x-4">
                <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-400">Persentase Keyakinan</span>
                        <span className={`text-sm font-semibold ${getPercentageColor(percentage)}`}>
                            {percentage ? `${percentage}%` : '0%'}
                        </span>
                    </div>
                    <div className="w-full bg-[#444] rounded-full h-2">
                        <div 
                            className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(percentage)}`}
                            style={{ width: `${percentage || 0}%` }}
                        ></div>
                    </div>
                </div>
                
                <div className="text-right">
                    <div className="text-xs text-gray-400">Partisipan</div>
                    <div className="text-sm font-medium text-white">{totalParticipants || 0}</div>
                </div>
                
                <div className="text-right">
                    <div className="text-xs text-gray-400">Setuju</div>
                    <div className="text-sm font-medium text-white">{agreements || 0}</div>
                </div>
            </div>
            
            {isMostAgreed && (
                <div className="mt-2 text-xs text-green-300 bg-green-900/20 px-2 py-1 rounded border border-green-500/30">
                    ✓ Identifikasi dengan dukungan terbanyak
                </div>
            )}
        </div>
    );
};

export default ConfidenceIndicator;
