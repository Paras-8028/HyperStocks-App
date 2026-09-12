import React from 'react';

export function AuthBackground() {
    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none -z-10 bg-gray-950">
            {/* Subtle Financial Coordinate Grid */}
            <div
                className="absolute inset-0 opacity-[0.035]"
                style={{
                    backgroundImage: `
                        linear-gradient(to right, rgba(255, 255, 255, 0.2) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(255, 255, 255, 0.2) 1px, transparent 1px)
                    `,
                    backgroundSize: '48px 48px',
                }}
            />

            {/* Ambient Radial Financial Glows */}
            <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[140px]" />
            <div className="absolute top-1/2 -right-40 w-[500px] h-[500px] bg-emerald-600/5 rounded-full blur-[160px]" />
            <div className="absolute -bottom-40 left-1/3 w-[600px] h-[600px] bg-emerald-400/5 rounded-full blur-[140px]" />

            {/* Faint Abstract Financial Trend Curves */}
            <svg
                className="absolute top-1/4 left-0 w-full h-80 opacity-[0.05] stroke-emerald-400"
                fill="none"
                viewBox="0 0 1440 320"
                preserveAspectRatio="none"
            >
                <path
                    d="M0,192L60,186.7C120,181,240,171,360,181.3C480,192,600,224,720,208C840,192,960,128,1080,122.7C1200,117,1320,171,1380,197.3L1440,224"
                    strokeWidth="1.5"
                    strokeDasharray="4 6"
                />
                <path
                    d="M0,256L60,240C120,224,240,192,360,170.7C480,149,600,139,720,160C840,181,960,235,1080,240C1200,245,1320,203,1380,181.3L1440,160"
                    strokeWidth="1.2"
                />
            </svg>
        </div>
    );
}
