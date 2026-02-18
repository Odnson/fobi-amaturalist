import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faComments, faArrowLeft, faUsers, faLightbulb, faQuestion } from '@fortawesome/free-solid-svg-icons';

const Forum = () => {
    return (
        <div className="min-h-screen bg-[#121212] flex items-center justify-center p-4">
            <div className="max-w-lg w-full text-center">
                {/* Icon */}
                <div className="mb-8">
                    <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-[#1e1e1e] border border-[#333] mb-4">
                        <FontAwesomeIcon icon={faComments} className="text-4xl text-blue-500" />
                    </div>
                </div>

                {/* Title */}
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
                    Forum Komunitas
                </h1>

                {/* Coming Soon Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-full mb-6">
                    <FontAwesomeIcon icon={faComments} className="text-blue-500" />
                    <span className="text-blue-500 font-medium">Coming Soon</span>
                </div>

                {/* Description */}
                <p className="text-gray-400 text-lg mb-8 max-w-md mx-auto">
                    Forum Komunitas sedang dalam pengembangan. Segera Anda dapat berdiskusi dengan sesama pengamat dan peneliti biodiversitas Indonesia!
                </p>

                {/* Features Preview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 hidden">
                    <div className="bg-[#1e1e1e] border border-[#333] rounded-lg p-4">
                        <FontAwesomeIcon icon={faUsers} className="text-2xl text-blue-500 mb-2" />
                        <h3 className="text-white font-medium mb-1">Diskusi</h3>
                        <p className="text-gray-500 text-sm">Berbagi pengalaman dengan komunitas</p>
                    </div>
                    <div className="bg-[#1e1e1e] border border-[#333] rounded-lg p-4">
                        <FontAwesomeIcon icon={faQuestion} className="text-2xl text-blue-400 mb-2" />
                        <h3 className="text-white font-medium mb-1">Tanya Jawab</h3>
                        <p className="text-gray-500 text-sm">Ajukan pertanyaan ke ahli</p>
                    </div>
                    <div className="bg-[#1e1e1e] border border-[#333] rounded-lg p-4">
                        <FontAwesomeIcon icon={faLightbulb} className="text-2xl text-blue-300 mb-2" />
                        <h3 className="text-white font-medium mb-1">Tips & Trik</h3>
                        <p className="text-gray-500 text-sm">Pelajari teknik pengamatan</p>
                    </div>
                </div>

                {/* Back Button */}
                <Link 
                    to="/"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#1a73e8] text-white rounded-lg hover:bg-[#0d47a1] transition-colors"
                >
                    <FontAwesomeIcon icon={faArrowLeft} />
                    Kembali ke Beranda
                </Link>
            </div>
        </div>
    );
};

export default Forum;
