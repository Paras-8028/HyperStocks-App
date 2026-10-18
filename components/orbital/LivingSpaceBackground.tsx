'use client';

import React, { useEffect, useRef } from 'react';

interface Star {
    x: number;
    y: number;
    radius: number;
    baseAlpha: number;
    alpha: number;
    twinkleSpeed: number;
    vx: number;
    vy: number;
    color: string;
}

export function LivingSpaceBackground() {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) return;

        let animationFrameId: number;
        let isVisible = true;
        let prefersReducedMotion = false;

        // Check reduced motion preference
        const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        prefersReducedMotion = motionQuery.matches;

        const handleMotionChange = (e: MediaQueryListEvent) => {
            prefersReducedMotion = e.matches;
            if (prefersReducedMotion) {
                renderSingleFrame();
            }
        };
        motionQuery.addEventListener('change', handleMotionChange);

        // Pause when tab is not visible
        const handleVisibilityChange = () => {
            isVisible = !document.hidden;
            if (isVisible && !prefersReducedMotion) {
                lastTime = performance.now();
                loop(lastTime);
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Resize handling
        let width = 0;
        let height = 0;

        const setSize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            ctx.scale(dpr, dpr);
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
        };

        setSize();

        // Create Starfield
        const starColors = ['#F4F7FF', '#C7D2FE', '#35D6FF', '#7C5CFF', '#E2E8F0'];
        const starCount = width < 768 ? 45 : 95;
        const stars: Star[] = [];

        for (let i = 0; i < starCount; i++) {
            const isBright = Math.random() < 0.15;
            stars.push({
                x: Math.random() * width,
                y: Math.random() * height,
                radius: isBright ? Math.random() * 1.5 + 1.0 : Math.random() * 0.9 + 0.4,
                baseAlpha: isBright ? 0.75 : Math.random() * 0.45 + 0.15,
                alpha: Math.random() * 0.7 + 0.2,
                twinkleSpeed: Math.random() * 0.015 + 0.005,
                vx: (Math.random() - 0.5) * 0.08,
                vy: (Math.random() - 0.5) * 0.08 - 0.02, // Gentle upward drift
                color: starColors[Math.floor(Math.random() * starColors.length)],
            });
        }

        let lastTime = performance.now();
        let orbitalAngle = 0;

        const renderSingleFrame = () => {
            if (!ctx) return;
            ctx.clearRect(0, 0, width, height);

            // 1. Subtle Deep Cosmic Nebulae
            const grad1 = ctx.createRadialGradient(
                width * 0.2,
                height * 0.25,
                40,
                width * 0.2,
                height * 0.25,
                width * 0.45
            );
            grad1.addColorStop(0, 'rgba(124, 92, 255, 0.045)');
            grad1.addColorStop(0.5, 'rgba(124, 92, 255, 0.015)');
            grad1.addColorStop(1, 'rgba(5, 8, 22, 0)');
            ctx.fillStyle = grad1;
            ctx.fillRect(0, 0, width, height);

            const grad2 = ctx.createRadialGradient(
                width * 0.8,
                height * 0.65,
                50,
                width * 0.8,
                height * 0.65,
                width * 0.5
            );
            grad2.addColorStop(0, 'rgba(53, 214, 255, 0.035)');
            grad2.addColorStop(0.6, 'rgba(53, 214, 255, 0.008)');
            grad2.addColorStop(1, 'rgba(5, 8, 22, 0)');
            ctx.fillStyle = grad2;
            ctx.fillRect(0, 0, width, height);

            // 2. Faint Concentric Celestial Orbital Geometry
            ctx.save();
            ctx.translate(width * 0.85, height * 0.2);
            ctx.rotate(orbitalAngle);
            ctx.strokeStyle = 'rgba(124, 92, 255, 0.04)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 12]);
            ctx.beginPath();
            ctx.arc(0, 0, 180, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(0, 0, 320, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();

            // 3. Render Stars
            for (let i = 0; i < stars.length; i++) {
                const s = stars[i];
                ctx.fillStyle = s.color;
                ctx.globalAlpha = Math.max(0.08, Math.min(0.9, s.alpha));
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
                ctx.fill();

                // Faint star glow on brighter stars
                if (s.radius > 1.2) {
                    ctx.fillStyle = s.color;
                    ctx.globalAlpha = s.alpha * 0.25;
                    ctx.beginPath();
                    ctx.arc(s.x, s.y, s.radius * 2.8, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            ctx.globalAlpha = 1.0;
        };

        const loop = (time: number) => {
            if (!isVisible || prefersReducedMotion) return;

            const delta = Math.min((time - lastTime) / 1000, 0.1);
            lastTime = time;

            // Slowly drift orbital angle
            orbitalAngle += delta * 0.015;

            // Update stars
            for (let i = 0; i < stars.length; i++) {
                const s = stars[i];
                s.x += s.vx * delta * 60;
                s.y += s.vy * delta * 60;

                // Screen wrap
                if (s.x < 0) s.x = width;
                if (s.x > width) s.x = 0;
                if (s.y < 0) s.y = height;
                if (s.y > height) s.y = 0;

                // Twinkle
                s.alpha += Math.sin(time * s.twinkleSpeed) * 0.008;
                if (s.alpha > s.baseAlpha * 1.4) s.alpha = s.baseAlpha * 1.4;
                if (s.alpha < s.baseAlpha * 0.6) s.alpha = s.baseAlpha * 0.6;
            }

            renderSingleFrame();

            animationFrameId = requestAnimationFrame(loop);
        };

        // Resize listener with debounce
        let resizeTimeout: NodeJS.Timeout;
        const handleResize = () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                setSize();
                renderSingleFrame();
            }, 150);
        };
        window.addEventListener('resize', handleResize);

        // Initial render
        renderSingleFrame();
        if (!prefersReducedMotion) {
            animationFrameId = requestAnimationFrame(loop);
        }

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', handleResize);
            motionQuery.removeEventListener('change', handleMotionChange);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            clearTimeout(resizeTimeout);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            aria-hidden="true"
            className="fixed inset-0 pointer-events-none z-0 h-full w-full opacity-90"
        />
    );
}
