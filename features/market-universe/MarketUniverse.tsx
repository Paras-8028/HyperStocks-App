'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { MarketUniverseData, UniverseNode, SectorType } from './types';
import {
    Activity,
    ArrowUpRight,
    Compass,
    Eye,
    Maximize2,
    Minimize2,
    RotateCcw,
    Search,
    Sparkles,
    TrendingDown,
    TrendingUp,
    X,
    ZoomIn,
    ZoomOut,
    Layers,
    Share2,
    Zap,
} from 'lucide-react';
import Link from 'next/link';

export function MarketUniverse({ className = '' }: { className?: string }) {
    const [data, setData] = useState<MarketUniverseData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeSector, setActiveSector] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedNode, setSelectedNode] = useState<UniverseNode | null>(null);
    const [hoveredNode, setHoveredNode] = useState<UniverseNode | null>(null);
    const [layoutMode, setLayoutMode] = useState<'constellation' | 'orbital' | 'cluster'>('constellation');
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const isDraggingRef = useRef(false);
    const dragStartRef = useRef({ mouseX: 0, mouseY: 0, panX: 0, panY: 0 });
    const animFrameRef = useRef<number | null>(null);
    const pulseOffsetRef = useRef(0);

    // Fetch Universe data from our API
    const fetchUniverseData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/market-universe');
            if (!res.ok) throw new Error('Failed to load market universe');
            const json = await res.json();
            if (json.success && json.data) {
                setData(json.data);
                setError(null);
            } else {
                throw new Error('Invalid data payload');
            }
        } catch (err: any) {
            setError(err.message || 'Error connecting to market telemetry');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUniverseData();
    }, [fetchUniverseData]);

    // Filter nodes by active sector and search
    const filteredNodes = useMemo(() => {
        if (!data) return [];
        return data.nodes.filter((node) => {
            const matchesSector = activeSector === 'all' || node.sector === activeSector;
            const matchesSearch =
                !searchQuery.trim() ||
                node.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
                node.name.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesSector && matchesSearch;
        });
    }, [data, activeSector, searchQuery]);

    // Statistics for the Universe HUD
    const universeStats = useMemo(() => {
        if (!data || data.nodes.length === 0) return { total: 0, advancing: 0, declining: 0, advancingRatio: 0, topGainer: null };
        const total = data.nodes.length;
        const advancing = data.nodes.filter((n) => n.changePercent >= 0).length;
        const declining = total - advancing;
        const advancingRatio = Math.round((advancing / total) * 100);
        const topGainer = [...data.nodes].sort((a, b) => b.changePercent - a.changePercent)[0] || null;
        return { total, advancing, declining, advancingRatio, topGainer };
    }, [data]);

    // Canvas Rendering Loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !data) return;

        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) return;

        let isDestroyed = false;

        const render = (timestamp: number) => {
            if (isDestroyed) return;

            const rect = canvas.getBoundingClientRect();
            const width = rect.width;
            const height = rect.height;

            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
                canvas.width = width * dpr;
                canvas.height = height * dpr;
                ctx.scale(dpr, dpr);
            }

            ctx.clearRect(0, 0, width, height);

            // Apply Pan & Zoom transformation
            ctx.save();
            ctx.translate(width / 2 + pan.x, height / 2 + pan.y);
            ctx.scale(zoom, zoom);
            ctx.translate(-width / 2, -height / 2);

            // Calculate coordinates based on layoutMode
            const nodePosMap = new Map<string, { x: number; y: number; r: number }>();
            filteredNodes.forEach((node, i) => {
                let nx = (node.x / 100) * width;
                let ny = (node.y / 100) * height;

                if (layoutMode === 'orbital') {
                    // Concentric celestial orbital layout
                    const ringIndex = node.sector === 'Technology' ? 1 : node.sector === 'Financials' ? 2 : node.sector === 'Healthcare' ? 3 : 4;
                    const ringRadius = 70 + ringIndex * 58;
                    const angle = (i * (Math.PI * 2)) / filteredNodes.length + timestamp * 0.00015;
                    nx = width / 2 + Math.cos(angle) * ringRadius;
                    ny = height / 2 + Math.sin(angle) * ringRadius;
                } else if (layoutMode === 'cluster') {
                    // Gravitational clusters by sector
                    const sector = data.sectors.find((s) => s.name === node.sector);
                    const cx = ((sector?.centroid.x ?? 50) / 100) * width;
                    const cy = ((sector?.centroid.y ?? 50) / 100) * height;
                    const jitterX = Math.sin(node.symbol.charCodeAt(0) * 11) * 36;
                    const jitterY = Math.cos(node.symbol.charCodeAt(1) * 17) * 36;
                    nx = cx + jitterX;
                    ny = cy + jitterY;
                }

                nodePosMap.set(node.symbol, { x: nx, y: ny, r: node.radius });
            });

            // 1. Draw Sector Halo Boundaries / Faint Gravitational Orbits
            if (layoutMode === 'orbital') {
                [128, 186, 244, 302].forEach((radius) => {
                    ctx.beginPath();
                    ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
                    ctx.strokeStyle = 'rgba(124, 92, 255, 0.08)';
                    ctx.setLineDash([3, 9]);
                    ctx.lineWidth = 1;
                    ctx.stroke();
                    ctx.setLineDash([]);
                });
            } else {
                data.sectors.forEach((sec) => {
                    if (activeSector === 'all' || activeSector === sec.name) {
                        const cx = (sec.centroid.x / 100) * width;
                        const cy = (sec.centroid.y / 100) * height;

                        const halo = ctx.createRadialGradient(cx, cy, 20, cx, cy, 140);
                        halo.addColorStop(0, sec.glowColor.replace('0.45', '0.06'));
                        halo.addColorStop(1, 'rgba(5, 8, 22, 0)');
                        ctx.fillStyle = halo;
                        ctx.beginPath();
                        ctx.arc(cx, cy, 140, 0, Math.PI * 2);
                        ctx.fill();
                    }
                });
            }

            // 2. Draw Constellation Connection Lines with Energy Pulses
            pulseOffsetRef.current = (timestamp * 0.001) % 1; // 0 to 1 loop

            filteredNodes.forEach((node) => {
                const p1 = nodePosMap.get(node.symbol);
                if (!p1) return;

                const isNodeActive = hoveredNode?.symbol === node.symbol || selectedNode?.symbol === node.symbol;

                node.connections.forEach((connSymbol) => {
                    const p2 = nodePosMap.get(connSymbol);
                    if (!p2) return;

                    const isConnectedActive =
                        isNodeActive ||
                        hoveredNode?.symbol === connSymbol ||
                        selectedNode?.symbol === connSymbol;

                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);

                    if (isConnectedActive) {
                        ctx.strokeStyle = 'rgba(53, 214, 255, 0.65)';
                        ctx.lineWidth = 1.6;
                        ctx.shadowColor = '#35D6FF';
                        ctx.shadowBlur = 8;
                    } else {
                        ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
                        ctx.lineWidth = 0.8;
                        ctx.shadowBlur = 0;
                    }
                    ctx.stroke();
                    ctx.shadowBlur = 0;

                    // Traveling Energy Pulse
                    if (isConnectedActive) {
                        const pulseT = pulseOffsetRef.current;
                        const px = p1.x + (p2.x - p1.x) * pulseT;
                        const py = p1.y + (p2.y - p1.y) * pulseT;

                        ctx.beginPath();
                        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
                        ctx.fillStyle = '#35D6FF';
                        ctx.shadowColor = '#35D6FF';
                        ctx.shadowBlur = 6;
                        ctx.fill();
                        ctx.shadowBlur = 0;
                    }
                });
            });

            // 3. Draw Celestial Company Stars (Nodes)
            filteredNodes.forEach((node) => {
                const pos = nodePosMap.get(node.symbol);
                if (!pos) return;

                const isHovered = hoveredNode?.symbol === node.symbol;
                const isSelected = selectedNode?.symbol === node.symbol;
                const isConnectedToHover =
                    hoveredNode &&
                    (hoveredNode.connections.includes(node.symbol) || node.connections.includes(hoveredNode.symbol));

                const isPositive = node.changePercent >= 0;
                const starColor = isPositive ? '#3DFFA0' : '#FF5470';
                const baseRadius = pos.r * 0.65;
                const radius = (isHovered || isSelected ? baseRadius * 1.35 : isConnectedToHover ? baseRadius * 1.15 : baseRadius);

                // Multi-tier radial glow aura
                const auraRadius = radius * (isHovered || isSelected ? 3.5 : 2.2);
                const glow = ctx.createRadialGradient(pos.x, pos.y, radius * 0.2, pos.x, pos.y, auraRadius);
                glow.addColorStop(0, starColor);
                glow.addColorStop(0.35, isPositive ? 'rgba(61, 255, 160, 0.35)' : 'rgba(255, 84, 112, 0.35)');
                glow.addColorStop(1, 'rgba(5, 8, 22, 0)');

                ctx.fillStyle = glow;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, auraRadius, 0, Math.PI * 2);
                ctx.fill();

                // Core luminous sphere
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
                ctx.fillStyle = isHovered || isSelected ? '#FFFFFF' : starColor;
                ctx.shadowColor = starColor;
                ctx.shadowBlur = isHovered || isSelected ? 16 : 8;
                ctx.fill();
                ctx.shadowBlur = 0;

                // Concentric targeted orbit ring if selected
                if (isSelected) {
                    ctx.beginPath();
                    ctx.arc(pos.x, pos.y, radius + 8, 0, Math.PI * 2);
                    ctx.strokeStyle = '#35D6FF';
                    ctx.lineWidth = 1.5;
                    ctx.setLineDash([3, 4]);
                    ctx.stroke();
                    ctx.setLineDash([]);
                }

                // Node Ticker Label
                ctx.font = `${isHovered || isSelected ? 'bold 11px' : '600 10px'} var(--font-geist-sans), sans-serif`;
                ctx.fillStyle = isHovered || isSelected ? '#F4F7FF' : '#CBD5E1';
                ctx.textAlign = 'center';
                ctx.fillText(node.symbol, pos.x, pos.y + radius + 13);
            });

            ctx.restore();

            animFrameRef.current = requestAnimationFrame(render);
        };

        animFrameRef.current = requestAnimationFrame(render);

        return () => {
            isDestroyed = true;
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        };
    }, [data, filteredNodes, hoveredNode, selectedNode, layoutMode, zoom, pan, activeSector]);

    // Pointer Interaction (Hover & Click detection)
    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas || !data) return;

        // If panning
        if (isDraggingRef.current) {
            setPan({
                x: dragStartRef.current.panX + (e.clientX - dragStartRef.current.mouseX),
                y: dragStartRef.current.panY + (e.clientY - dragStartRef.current.mouseY),
            });
            return;
        }

        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Un-transform coordinates
        const width = rect.width;
        const height = rect.height;
        const cx = width / 2;
        const cy = height / 2;

        const unX = (mouseX - cx - pan.x) / zoom + cx;
        const unY = (mouseY - cy - pan.y) / zoom + cy;

        // Find nearest node within hit-radius
        let found: UniverseNode | null = null;
        for (const node of filteredNodes) {
            let nx = (node.x / 100) * width;
            let ny = (node.y / 100) * height;

            if (layoutMode === 'orbital') {
                const i = filteredNodes.indexOf(node);
                const ringIndex = node.sector === 'Technology' ? 1 : node.sector === 'Financials' ? 2 : node.sector === 'Healthcare' ? 3 : 4;
                const ringRadius = 70 + ringIndex * 58;
                const angle = (i * (Math.PI * 2)) / filteredNodes.length;
                nx = width / 2 + Math.cos(angle) * ringRadius;
                ny = height / 2 + Math.sin(angle) * ringRadius;
            } else if (layoutMode === 'cluster') {
                const sector = data.sectors.find((s) => s.name === node.sector);
                const scx = ((sector?.centroid.x ?? 50) / 100) * width;
                const scy = ((sector?.centroid.y ?? 50) / 100) * height;
                const jitterX = Math.sin(node.symbol.charCodeAt(0) * 11) * 36;
                const jitterY = Math.cos(node.symbol.charCodeAt(1) * 17) * 36;
                nx = scx + jitterX;
                ny = scy + jitterY;
            }

            const dist = Math.hypot(unX - nx, unY - ny);
            if (dist < node.radius + 14) {
                found = node;
                break;
            }
        }

        setHoveredNode(found);
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        isDraggingRef.current = true;
        dragStartRef.current = {
            mouseX: e.clientX,
            mouseY: e.clientY,
            panX: pan.x,
            panY: pan.y,
        };
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const dragDist = Math.hypot(
            e.clientX - dragStartRef.current.mouseX,
            e.clientY - dragStartRef.current.mouseY
        );
        isDraggingRef.current = false;

        // If it was a quick click rather than a pan
        if (dragDist < 6) {
            if (hoveredNode) {
                setSelectedNode(hoveredNode);
            }
        }
    };

    const handleResetView = () => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
        setSelectedNode(null);
        setHoveredNode(null);
    };

    const handleZoomIn = () => setZoom((z) => Math.min(z * 1.25, 2.5));
    const handleZoomOut = () => setZoom((z) => Math.max(z / 1.25, 0.6));

    const sectorsList: Array<{ id: string; label: string }> = [
        { id: 'all', label: 'All Galaxies' },
        { id: 'Technology', label: 'Technology' },
        { id: 'Financials', label: 'Financials' },
        { id: 'Healthcare', label: 'Healthcare' },
        { id: 'Consumer', label: 'Consumer & EV' },
        { id: 'Energy', label: 'Energy' },
    ];

    return (
        <section
            ref={containerRef}
            className={`relative rounded-3xl border border-[rgba(148,163,184,0.16)] bg-[#080D1B]/85 backdrop-blur-2xl shadow-2xl overflow-hidden transition-all duration-300 ${className}`}
        >
            {/* Background Ambient Cosmic Nebulae */}
            <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-[#7C5CFF]/10 blur-[100px]" />
            <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-[#35D6FF]/10 blur-[100px]" />

            {/* Top Toolbar Header */}
            <div className="relative z-10 p-5 md:p-6 border-b border-[rgba(148,163,184,0.12)] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="flex h-2.5 w-2.5 rounded-full bg-[#35D6FF] shadow-[0_0_10px_#35D6FF] animate-pulse" />
                        <h2 className="text-xl md:text-2xl font-bold tracking-tight text-[#F4F7FF] flex items-center gap-2.5">
                            Market Universe
                            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full border border-[#7C5CFF]/30 bg-[#7C5CFF]/15 text-[#7C5CFF]">
                                CONSTELLATION TOPOLOGY
                            </span>
                        </h2>
                    </div>
                    <p className="text-xs text-[#94A3B8]">
                        Interactive company constellations. Node scale reflects market capitalization; luminescence reflects price performance.
                    </p>
                </div>

                {/* Telemetry Quick Bar */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[rgba(148,163,184,0.14)] bg-[#0D1424]">
                        <span className="text-[#94A3B8]">Universe Breadth:</span>
                        <span className="font-mono font-bold text-[#3DFFA0]">
                            {universeStats.advancingRatio}% Advancing
                        </span>
                    </div>

                    {universeStats.topGainer && (
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[rgba(148,163,184,0.14)] bg-[#0D1424]">
                            <span className="text-[#94A3B8]">Supernova:</span>
                            <span className="font-bold text-[#F4F7FF]">${universeStats.topGainer.symbol}</span>
                            <span className="font-mono text-[#3DFFA0] font-bold">
                                +{universeStats.topGainer.changePercent}%
                            </span>
                        </div>
                    )}

                    {data?.isDemoData && (
                        <span className="text-[10px] text-[#94A3B8] border border-[rgba(148,163,184,0.14)] px-2 py-1 rounded-lg">
                            Demonstration Telemetry
                        </span>
                    )}
                </div>
            </div>

            {/* Sub-toolbar: Sector Pills, Layout Switcher & Search */}
            <div className="relative z-10 px-5 py-3 border-b border-[rgba(148,163,184,0.08)] bg-[#050816]/50 flex flex-wrap items-center justify-between gap-3 text-xs">
                {/* Sector Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
                    {sectorsList.map((sec) => (
                        <button
                            key={sec.id}
                            onClick={() => setActiveSector(sec.id)}
                            className={`px-3 py-1.5 rounded-xl font-medium transition whitespace-nowrap ${
                                activeSector === sec.id
                                    ? 'bg-gradient-to-r from-[#7C5CFF] to-[#35D6FF] text-[#050816] font-bold shadow-md shadow-[#7C5CFF]/20'
                                    : 'text-[#94A3B8] hover:text-[#F4F7FF] hover:bg-[#111B2E]/60 border border-transparent'
                            }`}
                        >
                            {sec.label}
                        </button>
                    ))}
                </div>

                {/* Right controls: Layout switch & Search */}
                <div className="flex items-center gap-2 ml-auto">
                    {/* Layout switcher */}
                    <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0D1424] border border-[rgba(148,163,184,0.14)]">
                        <button
                            onClick={() => setLayoutMode('constellation')}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                                layoutMode === 'constellation'
                                    ? 'bg-[#111B2E] text-[#35D6FF] shadow'
                                    : 'text-[#94A3B8] hover:text-[#F4F7FF]'
                            }`}
                            title="Constellation network view"
                        >
                            Constellation
                        </button>
                        <button
                            onClick={() => setLayoutMode('orbital')}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                                layoutMode === 'orbital'
                                    ? 'bg-[#111B2E] text-[#35D6FF] shadow'
                                    : 'text-[#94A3B8] hover:text-[#F4F7FF]'
                            }`}
                            title="Orbital gravity rings view"
                        >
                            Gravity Rings
                        </button>
                        <button
                            onClick={() => setLayoutMode('cluster')}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                                layoutMode === 'cluster'
                                    ? 'bg-[#111B2E] text-[#35D6FF] shadow'
                                    : 'text-[#94A3B8] hover:text-[#F4F7FF]'
                            }`}
                            title="Sector clusters view"
                        >
                            Clusters
                        </button>
                    </div>

                    {/* Search in Universe */}
                    <div className="relative w-36 sm:w-44">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#94A3B8]" />
                        <input
                            type="text"
                            placeholder="Find star..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[#0D1424] border border-[rgba(148,163,184,0.14)] pl-8 pr-3 py-1.5 rounded-xl text-xs text-[#F4F7FF] placeholder-[#94A3B8]/60 focus:border-[#7C5CFF] focus:outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* Interactive Canvas Viewport */}
            <div className="relative h-[540px] md:h-[620px] w-full select-none overflow-hidden cursor-grab active:cursor-grabbing">
                {loading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3 z-20 bg-[#080D1B]/90">
                        <div className="relative h-12 w-12">
                            <span className="absolute inset-0 rounded-full border-2 border-t-[#35D6FF] border-r-[#7C5CFF] border-b-transparent border-l-transparent animate-spin" />
                            <span className="absolute inset-2 rounded-full border-2 border-t-[#3DFFA0] border-b-transparent border-l-transparent border-r-transparent animate-spin [animation-direction:reverse]" />
                        </div>
                        <span className="text-xs font-mono text-[#35D6FF] tracking-wider uppercase">
                            Aligning Planetary Telescopes...
                        </span>
                    </div>
                ) : error ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3 z-20 p-6 text-center">
                        <div className="text-sm text-[#FF5470]">{error}</div>
                        <button
                            onClick={fetchUniverseData}
                            className="orbital-btn-primary"
                        >
                            <RotateCcw className="h-4 w-4" /> Reconnect Universe
                        </button>
                    </div>
                ) : null}

                <canvas
                    ref={canvasRef}
                    onPointerMove={handlePointerMove}
                    onPointerDown={handlePointerDown}
                    onPointerUp={handlePointerUp}
                    className="absolute inset-0 h-full w-full touch-none"
                />

                {/* Zoom & View Controls Overlay */}
                <div className="absolute bottom-5 right-5 z-20 flex flex-col items-center gap-2 rounded-2xl bg-[#0D1424]/90 p-1.5 border border-[rgba(148,163,184,0.14)] backdrop-blur shadow-xl">
                    <button
                        onClick={handleZoomIn}
                        className="p-2 text-[#94A3B8] hover:text-[#F4F7FF] hover:bg-[#111B2E] rounded-xl transition"
                        title="Zoom In"
                    >
                        <ZoomIn className="h-4 w-4" />
                    </button>
                    <button
                        onClick={handleZoomOut}
                        className="p-2 text-[#94A3B8] hover:text-[#F4F7FF] hover:bg-[#111B2E] rounded-xl transition"
                        title="Zoom Out"
                    >
                        <ZoomOut className="h-4 w-4" />
                    </button>
                    <button
                        onClick={handleResetView}
                        className="p-2 text-[#94A3B8] hover:text-[#F4F7FF] hover:bg-[#111B2E] rounded-xl transition"
                        title="Reset Telescope View"
                    >
                        <RotateCcw className="h-4 w-4" />
                    </button>
                </div>

                {/* Floating HUD Tooltip when hovering over a star */}
                {hoveredNode && !selectedNode && (
                    <div
                        className="pointer-events-none absolute top-5 left-5 z-20 rounded-2xl border border-[rgba(53,214,255,0.4)] bg-[#0D1424]/95 p-3.5 backdrop-blur-xl shadow-2xl min-w-[210px] space-y-2 animate-in fade-in duration-150"
                    >
                        <div className="flex items-center justify-between border-b border-[rgba(148,163,184,0.14)] pb-2">
                            <div>
                                <span className="font-bold text-sm text-[#F4F7FF] flex items-center gap-1.5">
                                    ${hoveredNode.symbol}
                                    <span className="text-[10px] font-normal text-[#94A3B8]">
                                        {hoveredNode.sector}
                                    </span>
                                </span>
                                <div className="text-[11px] text-[#94A3B8] truncate max-w-[150px]">
                                    {hoveredNode.name}
                                </div>
                            </div>
                            <span
                                className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                                    hoveredNode.changePercent >= 0
                                        ? 'text-[#3DFFA0] bg-[#3DFFA0]/15'
                                        : 'text-[#FF5470] bg-[#FF5470]/15'
                                }`}
                            >
                                {hoveredNode.changePercent >= 0 ? '+' : ''}
                                {hoveredNode.changePercent}%
                            </span>
                        </div>

                        <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-[#94A3B8]">Current Price:</span>
                            <span className="font-bold text-[#F4F7FF]">${hoveredNode.price.toFixed(2)}</span>
                        </div>

                        {hoveredNode.connections.length > 0 && (
                            <div className="text-[10px] text-[#94A3B8] flex items-center gap-1">
                                <span>Connected Peers:</span>
                                <span className="text-[#35D6FF] font-mono">
                                    {hoveredNode.connections.slice(0, 3).join(', ')}
                                </span>
                            </div>
                        )}
                        <div className="text-[10px] text-[#7C5CFF] italic pt-1">
                            Click node to view company telemetry →
                        </div>
                    </div>
                )}

                {/* Selected Node: Detailed Company Telemetry Drawer */}
                {selectedNode && (
                    <div className="absolute top-4 right-4 z-30 w-80 sm:w-96 max-w-[calc(100%-2rem)] rounded-3xl border border-[#7C5CFF]/40 bg-[#0D1424]/95 p-5 backdrop-blur-2xl shadow-2xl space-y-4 animate-in slide-in-from-right-4 duration-250">
                        {/* Header */}
                        <div className="flex items-start justify-between border-b border-[rgba(148,163,184,0.14)] pb-3">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-xl font-black text-[#F4F7FF] tracking-tight">
                                        ${selectedNode.symbol}
                                    </span>
                                    <span
                                        className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                                            selectedNode.changePercent >= 0
                                                ? 'bg-[#3DFFA0]/15 border-[#3DFFA0]/30 text-[#3DFFA0]'
                                                : 'bg-[#FF5470]/15 border-[#FF5470]/30 text-[#FF5470]'
                                        }`}
                                    >
                                        {selectedNode.changePercent >= 0 ? '+' : ''}
                                        {selectedNode.changePercent}%
                                    </span>
                                </div>
                                <div className="text-xs text-[#94A3B8] font-medium">{selectedNode.name}</div>
                            </div>

                            <button
                                onClick={() => setSelectedNode(null)}
                                className="p-1 text-[#94A3B8] hover:text-[#F4F7FF] hover:bg-[#111B2E] rounded-xl transition"
                                title="Close Telemetry"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Price & Sector Grid */}
                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="p-3 rounded-2xl bg-[#111B2E]/70 border border-[rgba(148,163,184,0.1)] space-y-1">
                                <div className="text-[#94A3B8] text-[11px]">Last Traded Price</div>
                                <div className="text-lg font-bold font-mono text-[#F4F7FF]">
                                    ${selectedNode.price.toFixed(2)}
                                </div>
                            </div>
                            <div className="p-3 rounded-2xl bg-[#111B2E]/70 border border-[rgba(148,163,184,0.1)] space-y-1">
                                <div className="text-[#94A3B8] text-[11px]">Constellation Sector</div>
                                <div className="text-sm font-semibold text-[#35D6FF] truncate">
                                    {selectedNode.sector}
                                </div>
                            </div>
                        </div>

                        {/* Market Cap & Key Telemetry */}
                        {selectedNode.marketCap && (
                            <div className="flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-[#111B2E]/40 border border-[rgba(148,163,184,0.08)]">
                                <span className="text-[#94A3B8]">Est. Market Cap:</span>
                                <span className="font-mono font-bold text-[#F4F7FF]">
                                    ${(selectedNode.marketCap / 1000).toFixed(1)}B USD
                                </span>
                            </div>
                        )}

                        {/* Peer Network Connections */}
                        {selectedNode.connections.length > 0 && (
                            <div className="space-y-1.5 text-xs">
                                <div className="text-[#94A3B8] font-medium flex items-center gap-1.5">
                                    <Sparkles className="h-3.5 w-3.5 text-[#7C5CFF]" />
                                    Gravitationally Connected Peers:
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {selectedNode.connections.map((peerSym) => (
                                        <button
                                            key={peerSym}
                                            onClick={() => {
                                                const peer = data?.nodes.find((n) => n.symbol === peerSym);
                                                if (peer) setSelectedNode(peer);
                                            }}
                                            className="px-2.5 py-1 rounded-lg bg-[#111B2E] hover:bg-[#17243B] border border-[rgba(148,163,184,0.15)] hover:border-[#35D6FF]/40 text-[#CBD5E1] text-[11px] font-mono transition"
                                        >
                                            ${peerSym}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Direct Deep Space Action */}
                        <div className="pt-2 border-t border-[rgba(148,163,184,0.12)] flex items-center gap-2">
                            <Link
                                href={`/stocks/${selectedNode.symbol}`}
                                className="w-full orbital-btn-primary text-center justify-center"
                            >
                                Launch Deep Space Analysis
                                <ArrowUpRight className="h-3.5 w-3.5" />
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}
