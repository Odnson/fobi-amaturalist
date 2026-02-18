import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    Alert,
    Divider
} from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledDialog = styled(Dialog)(({ theme }) => ({
    '& .MuiDialog-paper': {
        backgroundColor: '#1e1e1e',
        borderRadius: 8,
        border: '1px solid #333',
        maxWidth: 420,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    },
    '& .MuiDialogTitle-root': {
        backgroundColor: '#2a2a2a',
        borderBottom: '1px solid #333',
        padding: '16px 20px',
    },
    '& .MuiDialogContent-root': {
        backgroundColor: '#1e1e1e',
        padding: '20px',
    },
    '& .MuiDialogActions-root': {
        backgroundColor: '#1e1e1e',
        borderTop: '1px solid #333',
        padding: '12px 20px',
    },
}));

const ConfidenceButton = styled(Button)(({ theme, variant }) => ({
    padding: '12px 16px',
    borderRadius: 6,
    textTransform: 'none',
    fontSize: '0.9rem',
    fontWeight: 500,
    minHeight: 44,
    justifyContent: 'flex-start',
    ...(variant === 'doubtful' && {
        backgroundColor: '#2d2416',
        color: '#fbbf24',
        border: '1px solid #451a03',
        '&:hover': {
            backgroundColor: '#451a03',
        },
    }),
    ...(variant === 'certain' && {
        backgroundColor: '#1e3a8a',
        color: '#93c5fd',
        border: '1px solid #1d4ed8',
        '&:hover': {
            backgroundColor: '#1d4ed8',
        },
    }),
}));

const IdentificationConfirmationModal = ({
    open,
    onClose,
    onConfirm,
    existingIdentification,
    newIdentification,
    reason,
    warning
}) => {
    const handleConfidenceSelection = (confidenceLevel) => {
        onConfirm(confidenceLevel);
        onClose();
    };

    if (!existingIdentification || !newIdentification) {
        return null;
    }

    // Determine if this is a higher-rank proposal
    const isHigherRankProposal = reason === 'higher_rank_proposal';

    return (
        <StyledDialog open={open} onClose={onClose}>
            <DialogTitle>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#e5e5e5' }}>
                    {isHigherRankProposal ? 'Konfirmasi Proposal Rank Lebih Tinggi' : 'Konfirmasi Identifikasi'}
                </Typography>
            </DialogTitle>

            <DialogContent>
                <Alert
                    severity="warning"
                    sx={{
                        mb: 2,
                        backgroundColor: '#2d1b00',
                        border: '1px solid #92400e',
                        '& .MuiAlert-icon': { color: '#fbbf24' },
                        '& .MuiAlert-message': { color: '#fcd34d' }
                    }}
                >
                    {warning || 'Status kualitas observasi dapat terpengaruh'}
                </Alert>

                <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ color: '#9ca3af', mb: 0.5 }}>
                        Identifikasi saat ini:
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500, color: '#e5e5e5', fontStyle: 'italic' }}>
                        {existingIdentification.scientific_name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#6b7280' }}>
                        {existingIdentification.rank}
                    </Typography>
                </Box>

                <Divider sx={{ my: 2, borderColor: '#374151' }} />

                <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ color: '#9ca3af', mb: 0.5 }}>
                        {isHigherRankProposal ? 'Proposal Anda:' : 'Usulan Anda:'}
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500, color: '#e5e5e5', fontStyle: 'italic' }}>
                        {newIdentification.scientific_name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#6b7280' }}>
                        {newIdentification.rank}
                    </Typography>
                </Box>

                {isHigherRankProposal && (
                    <Box sx={{ mb: 2, p: 2, backgroundColor: '#1f2937', borderRadius: 1, border: '1px solid #374151' }}>
                        <Typography variant="body2" sx={{ color: '#fbbf24', fontWeight: 500 }}>
                            ⚠️ Proposal Rank Lebih Tinggi
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#9ca3af', display: 'block', mt: 1 }}>
                            Anda mengusulkan taksa dengan rank yang lebih tinggi dari identifikasi saat ini.
                            Hal ini dapat mengubah status kualitas observasi dari Research Grade menjadi Confirmed ID.
                        </Typography>
                    </Box>
                )}

                <Typography variant="body2" sx={{ color: '#9ca3af', mb: 2 }}>
                    Tingkat keyakinan:
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <ConfidenceButton
                        variant="doubtful"
                        fullWidth
                        onClick={() => handleConfidenceSelection(0)}
                    >
                        <Box sx={{ textAlign: 'left', width: '100%' }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                🤔 Ragu-ragu
                            </Typography>
                            <Typography variant="caption" sx={{ opacity: 0.8 }}>
                                {isHigherRankProposal ? 'Proposal akan tetap dibuat' : 'Tidak mempengaruhi status'}
                            </Typography>
                        </Box>
                    </ConfidenceButton>

                    <ConfidenceButton
                        variant="certain"
                        fullWidth
                        onClick={() => handleConfidenceSelection(1)}
                    >
                        <Box sx={{ textAlign: 'left', width: '100%' }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                ✅ Yakin
                            </Typography>
                            <Typography variant="caption" sx={{ opacity: 0.8 }}>
                                {isHigherRankProposal ? 'Proposal akan dibuat dengan keyakinan penuh' : 'Dapat mengubah status observasi'}
                            </Typography>
                        </Box>
                    </ConfidenceButton>
                </Box>
            </DialogContent>

            <DialogActions>
                <Button
                    onClick={onClose}
                    sx={{
                        textTransform: 'none',
                        color: '#9ca3af',
                        '&:hover': { backgroundColor: '#374151' }
                    }}
                >
                    Batal
                </Button>
            </DialogActions>
        </StyledDialog>
    );
};

export default IdentificationConfirmationModal;
