import React from 'react';
import PropTypes from 'prop-types';

const LicenseLogo = ({ license, size = 'small', className = '' }) => {
    const licenseConfig = {
        'CC BY': {
            logo: 'https://licensebuttons.net/l/by/4.0/88x31.png',
            alt: 'Creative Commons Attribution 4.0',
            title: 'Creative Commons Attribution 4.0 International License'
        },
        'CC BY-SA': {
            logo: 'https://licensebuttons.net/l/by-sa/4.0/88x31.png',
            alt: 'Creative Commons Attribution-ShareAlike 4.0',
            title: 'Creative Commons Attribution-ShareAlike 4.0 International License'
        },
        'CC BY-NC': {
            logo: 'https://licensebuttons.net/l/by-nc/4.0/88x31.png',
            alt: 'Creative Commons Attribution-NonCommercial 4.0',
            title: 'Creative Commons Attribution-NonCommercial 4.0 International License'
        },
        'CC BY-NC-SA': {
            logo: 'https://licensebuttons.net/l/by-nc-sa/4.0/88x31.png',
            alt: 'Creative Commons Attribution-NonCommercial-ShareAlike 4.0',
            title: 'Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License'
        },
        'CC BY-ND': {
            logo: 'https://licensebuttons.net/l/by-nd/4.0/88x31.png',
            alt: 'Creative Commons Attribution-NoDerivatives 4.0',
            title: 'Creative Commons Attribution-NoDerivatives 4.0 International License'
        },
        'CC BY-NC-ND': {
            logo: 'https://licensebuttons.net/l/by-nc-nd/4.0/88x31.png',
            alt: 'Creative Commons Attribution-NonCommercial-NoDerivatives 4.0',
            title: 'Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International License'
        },
        'CC0': {
            logo: 'https://licensebuttons.net/p/zero/1.0/88x31.png',
            alt: 'Creative Commons Zero v1.0 Universal',
            title: 'Creative Commons Zero v1.0 Universal (CC0 1.0) Public Domain Dedication'
        },
        'All Rights Reserved': {
            logo: null, // No standard logo for All Rights Reserved
            alt: 'All Rights Reserved',
            title: 'All Rights Reserved'
        }
    };
    const sizeConfig = {
        'small': { width: '44px', height: '15px' },
        'medium': { width: '88px', height: '31px' },
        'large': { width: '132px', height: '46px' }
    };

    const config = licenseConfig[license];
    const sizeStyle = sizeConfig[size] || sizeConfig['small'];

    if (!config) {
        return (
            <span className={`text-xs text-gray-500 ${className}`} title="Unknown License">
                {license || 'Unknown License'}
            </span>
        );
    }
    if (!config.logo) {
        return (
            <span 
                className={`text-xs text-gray-600 font-medium ${className}`} 
                title={config.title}
            >
                © All Rights Reserved
            </span>
        );
    }

    return (
        <img
            src={config.logo}
            alt={config.alt}
            title={config.title}
            className={`inline-block ${className}`}
            style={sizeStyle}
            loading="lazy"
        />
    );
};

LicenseLogo.propTypes = {
    license: PropTypes.string.isRequired,
    size: PropTypes.oneOf(['small', 'medium', 'large']),
    className: PropTypes.string
};

export default LicenseLogo;
