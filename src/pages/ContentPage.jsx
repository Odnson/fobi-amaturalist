import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faExclamationTriangle, faInfoCircle, faQuestionCircle, faShieldAlt, faFileContract } from '@fortawesome/free-solid-svg-icons';
import { apiFetch } from '../utils/api';
import Footer from '../components/Footer';

const PAGE_CONFIG = {
    about: {
        slug: 'about',
        title: 'Tentang Kami',
        icon: faInfoCircle,
        defaultContent: `
            <div class="text-center py-12">
                <div class="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg class="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                </div>
                <h2 class="text-2xl font-bold text-white mb-4">Segera Hadir</h2>
                <p class="text-gray-400 max-w-md mx-auto">
                    Halaman Tentang Kami sedang dalam pengembangan. Konten akan segera tersedia.
                </p>
            </div>
        `
    },
    help: {
        slug: 'help',
        title: 'Bantuan',
        icon: faQuestionCircle,
        defaultContent: `
            <div class="text-center py-12">
                <div class="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg class="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                </div>
                <h2 class="text-2xl font-bold text-white mb-4">Segera Hadir</h2>
                <p class="text-gray-400 max-w-md mx-auto">
                    Halaman Bantuan sedang dalam pengembangan. Konten akan segera tersedia.
                </p>
            </div>
        `
    },
    privacy: {
        slug: 'privacy',
        title: 'Kebijakan Privasi',
        icon: faShieldAlt,
        defaultContent: `
            <div class="text-center py-12">
                <div class="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg class="w-10 h-10 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                    </svg>
                </div>
                <h2 class="text-2xl font-bold text-white mb-4">Segera Hadir</h2>
                <p class="text-gray-400 max-w-md mx-auto">
                    Halaman Kebijakan Privasi sedang dalam pengembangan. Konten akan segera tersedia.
                </p>
            </div>
        `
    },
    terms: {
        slug: 'terms',
        title: 'Syarat & Ketentuan',
        icon: faFileContract,
        defaultContent: `
            <div class="text-center py-12">
                <div class="w-20 h-20 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg class="w-10 h-10 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                </div>
                <h2 class="text-2xl font-bold text-white mb-4">Segera Hadir</h2>
                <p class="text-gray-400 max-w-md mx-auto">
                    Halaman Syarat & Ketentuan sedang dalam pengembangan. Konten akan segera tersedia.
                </p>
            </div>
        `
    }
};

const ContentPage = ({ pageType }) => {
    const [content, setContent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const config = PAGE_CONFIG[pageType] || PAGE_CONFIG.about;

    useEffect(() => {
        const fetchContent = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await apiFetch(`/pages/${config.slug}`);
                const data = await response.json();
                console.log('Page content response:', data);
                if (data && data.content && data.is_published) {
                    setContent(data.content);
                } else {
                    setContent(null);
                }
            } catch (err) {
                console.log('Content not found, using default:', err);
                setContent(null);
            } finally {
                setLoading(false);
            }
        };

        fetchContent();
    }, [config.slug]);

    return (
        <div className="min-h-screen bg-[#121212]">
            <div className="max-w-4xl mx-auto px-4 py-20">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <FontAwesomeIcon icon={config.icon} className="text-2xl text-blue-500" />
                        <h1 className="text-2xl md:text-3xl font-bold text-white">{config.title}</h1>
                    </div>
                    <div className="h-1 w-20 bg-blue-500 rounded"></div>
                </div>

                {/* Content */}
                <div className="bg-[#1e1e1e] rounded-lg border border-[#333] p-6 md:p-8">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <FontAwesomeIcon icon={faSpinner} className="text-3xl text-blue-500 animate-spin" />
                        </div>
                    ) : error ? (
                        <div className="text-center py-12">
                            <FontAwesomeIcon icon={faExclamationTriangle} className="text-3xl text-red-500 mb-4" />
                            <p className="text-gray-400">{error}</p>
                        </div>
                    ) : (
                        <div 
                            className="prose prose-invert prose-lg max-w-none
                                prose-headings:text-white prose-headings:font-bold
                                prose-p:text-gray-300 prose-p:leading-relaxed
                                prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
                                prose-strong:text-white
                                prose-ul:text-gray-300 prose-ol:text-gray-300
                                prose-li:marker:text-blue-500
                                prose-blockquote:border-blue-500 prose-blockquote:text-gray-400
                                prose-code:text-blue-400 prose-code:bg-[#2a2a2a] prose-code:px-1 prose-code:rounded
                                prose-pre:bg-[#2a2a2a] prose-pre:border prose-pre:border-[#444]
                                prose-img:rounded-lg prose-img:border prose-img:border-[#444]
                                prose-hr:border-[#444]"
                            dangerouslySetInnerHTML={{ __html: content || config.defaultContent }}
                        />
                    )}
                </div>

                {/* Last Updated */}
                {content && (
                    <div className="mt-4 text-right">
                        <span className="text-xs text-gray-500">
                            Terakhir diperbarui oleh Admin
                        </span>
                    </div>
                )}
            </div>

            {/* Footer */}
        </div>
    );
};

export default ContentPage;
