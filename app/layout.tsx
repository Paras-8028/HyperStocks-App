import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import "./globals.css";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "HyperStocks | AI Financial Intelligence Platform",
    description: "Personalized AI-powered stock intelligence, real-time market analysis, and predictive portfolio insights.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <ClerkProvider
            appearance={{
                theme: dark,
                variables: {
                    colorPrimary: '#10b981',
                    colorBackground: '#0b0f17',
                    colorForeground: '#f3f4f6',
                    colorMutedForeground: '#9ca3af',
                    colorNeutral: '#1f2937',
                    borderRadius: '0.75rem',
                },
                elements: {
                    card: 'border border-gray-800 bg-gray-950/95 shadow-2xl backdrop-blur-xl',
                    formButtonPrimary: 'bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-semibold shadow-lg shadow-emerald-500/20 transition-all',
                    footerActionLink: 'text-emerald-400 hover:text-emerald-300 font-medium',
                    headerTitle: 'text-gray-100 font-bold tracking-tight',
                    headerSubtitle: 'text-gray-400 text-sm',
                    socialButtonsBlockButton: 'border border-gray-800 bg-gray-900/90 hover:bg-gray-800 text-gray-200 transition-colors',
                    formFieldInput: 'border-gray-800 bg-gray-900/80 text-gray-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500',
                    dividerLine: 'bg-gray-800',
                    dividerText: 'text-gray-500 text-xs uppercase tracking-wider',
                },
            }}
        >
            <html lang="en" className="dark">
                <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
                    {children}
                    <Toaster />
                </body>
            </html>
        </ClerkProvider>
    );
}
