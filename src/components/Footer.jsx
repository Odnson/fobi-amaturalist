import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faGlobe } from '@fortawesome/free-solid-svg-icons';
import { faGithub, faInstagram, faTwitter, faGooglePlay } from '@fortawesome/free-brands-svg-icons';

import burungnesiaIcon from '../assets/icon/icon.png';
import kupunesiaIcon from '../assets/icon/kupnes.png';
import akarIcon from '../assets/icon/akar.png';
import amaturalistIcon from '../assets/icon/FOBI.png';
export const FooterBottom = () => {
    const currentYear = new Date().getFullYear();
    
    return (
        <div className="hidden md:flex fixed bottom-0 left-0 right-0 z-[900] bg-[#0a0a0a] border-t border-[#222] px-4 py-3 items-center justify-between">
            <p className="text-gray-600 text-sm">
                © {currentYear} Amaturalist. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
                <Link to="/privacy" className="text-gray-600 hover:text-gray-400 text-sm transition-colors">
                    Kebijakan Privasi
                </Link>
                <Link to="/terms" className="text-gray-600 hover:text-gray-400 text-sm transition-colors">
                    Syarat & Ketentuan
                </Link>
            </div>
        </div>
    );
};
const Footer = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="hidden md:block bg-[#0a0a0a] border-t border-[#222] mt-auto">
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Brand */}
                    <div className="col-span-1 md:col-span-2">
                        <div className="mb-3">
                            <img src={amaturalistIcon} alt="Amaturalist" className="w-auto h-10" />
                        </div>
                        <p className="text-gray-500 text-sm mb-4 max-w-md">
                            Platform citizen science untuk dokumentasi dan konservasi keanekaragaman hayati Indonesia.
                        </p>
                        <div className="flex items-center gap-4">
                            <a href="https://www.instagram.com/burungnesia.id/" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-blue-500 transition-colors">
                                <FontAwesomeIcon icon={faInstagram} className="text-lg" />
                            </a>
                            {/* <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-blue-500 transition-colors">
                                <FontAwesomeIcon icon={faTwitter} className="text-lg" />
                            </a> */}
                            <a href="https://github.com/Odnson/fobi-amaturalist" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-blue-500 transition-colors">
                                <FontAwesomeIcon icon={faGithub} className="text-lg" />
                            </a>
                        </div>
                    </div>

                    {/* Links */}
                    <div>
                        <h4 className="text-white font-medium mb-3">Navigasi</h4>
                        <ul className="space-y-2">
                            <li>
                                <Link to="/explore" className="text-gray-500 hover:text-blue-500 text-sm transition-colors">
                                    Jelajahi
                                </Link>
                            </li>
                            <li>
                                <Link to="/bantu-ident" className="text-gray-500 hover:text-blue-500 text-sm transition-colors">
                                    Bantu Ident
                                </Link>
                            </li>
                            <li>
                                <Link to="/about" className="text-gray-500 hover:text-blue-500 text-sm transition-colors">
                                    Tentang Kami
                                </Link>
                            </li>
                            <li>
                                <Link to="/help" className="text-gray-500 hover:text-blue-500 text-sm transition-colors">
                                    Bantuan
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Download Apps */}
                    <div>
                        <h4 className="text-white font-medium mb-3">Download Aplikasi</h4>
                        <div className="flex items-center gap-4">
                            <a 
                                href="https://play.google.com/store/apps/details?id=com.sikebo.burungnesia.citizenScience2&hl=id" 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="flex flex-col items-center gap-1 text-gray-500 hover:text-blue-500 text-xs transition-colors"
                                title="Burungnesia"
                            >
                                <img src={burungnesiaIcon} alt="Burungnesia" className="w-8 h-8 rounded" />
                                <span>Burungnesia</span>
                            </a>
                            <a 
                                href="https://play.google.com/store/apps/details?id=org.kupunesia&hl=id" 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="flex flex-col items-center gap-1 text-gray-500 hover:text-blue-500 text-xs transition-colors"
                                title="Kupunesia"
                            >
                                <img src={kupunesiaIcon} alt="Kupunesia" className="w-8 h-8 rounded" />
                                <span>Kupunesia</span>
                            </a>
                            <a 
                                href="https://play.google.com/store/apps/details?id=com.pasarnesia.app&hl=id" 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="flex flex-col items-center gap-1 text-gray-500 hover:text-blue-500 text-xs transition-colors"
                                title="Amatisangkar"
                            >
                                <img src={akarIcon} alt="Amatisangkar" className="w-8 h-8 rounded" />
                                <span>Amatisangkar</span>
                            </a>
                        </div>
                    </div>
                </div>

                {/* Bottom */}
                <div className="border-t border-[#222] mt-8 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-gray-600 text-sm">
                        © {currentYear} Amaturalist. All rights reserved.
                    </p>
                    <div className="flex items-center gap-6">
                        <Link to="/privacy" className="text-gray-600 hover:text-gray-400 text-sm transition-colors">
                            Kebijakan Privasi
                        </Link>
                        <Link to="/terms" className="text-gray-600 hover:text-gray-400 text-sm transition-colors">
                            Syarat & Ketentuan
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
