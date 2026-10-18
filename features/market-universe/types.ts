export type SectorType = 'Technology' | 'Financials' | 'Healthcare' | 'Consumer' | 'Energy' | 'Communication';

export interface UniverseNode {
    id: string;
    symbol: string;
    name: string;
    sector: SectorType;
    price: number;
    changePercent: number;
    change: number;
    marketCap?: number; // In millions
    volume?: string;
    peRatio?: number;
    x: number; // Normalized 0-100 coordinate
    y: number; // Normalized 0-100 coordinate
    radius: number;
    connections: string[]; // Target symbol IDs
    isPeerGrouped?: boolean;
}

export interface UniverseSectorInfo {
    name: SectorType;
    color: string;
    glowColor: string;
    centroid: { x: number; y: number };
    description: string;
}

export interface MarketUniverseData {
    nodes: UniverseNode[];
    sectors: UniverseSectorInfo[];
    lastUpdated: number;
    isDemoData?: boolean;
}
