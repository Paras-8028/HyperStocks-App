import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { LivingSpaceBackground } from "@/components/orbital/LivingSpaceBackground";
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
    title: "HyperStocks | AI-Powered Stock Intelligence",
    description: "Next-generation financial intelligence platform powered by real-time market telemetry and Gemini AI.",
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
                    colorPrimary: '#7C5CFF',
                    colorBackground: '#050816',
                    colorForeground: '#F4F7FF',
                    colorMutedForeground: '#94A3B8',
                    colorNeutral: '#0D1424',
                    borderRadius: '0.75rem',
                },
                elements: {
                    card: 'border border-[rgba(148,163,184,0.14)] bg-[#0D1424]/95 shadow-2xl backdrop-blur-xl',
                    formButtonPrimary: 'bg-gradient-to-r from-[#7C5CFF] to-[#35D6FF] hover:opacity-95 text-[#050816] font-bold shadow-lg shadow-[#7C5CFF]/25 transition-all',
                    footerActionLink: 'text-[#35D6FF] hover:text-[#7C5CFF] font-medium',
                    headerTitle: 'text-[#F4F7FF] font-bold tracking-tight',
                    headerSubtitle: 'text-[#94A3B8] text-sm',
                    socialButtonsBlockButton: 'border border-[rgba(148,163,184,0.14)] bg-[#111B2E]/90 hover:bg-[#17243B] text-[#F4F7FF] transition-colors',
                    formFieldInput: 'border-[rgba(148,163,184,0.18)] bg-[#080D1B]/90 text-[#F4F7FF] focus:border-[#7C5CFF] focus:ring-1 focus:ring-[#7C5CFF]',
                    dividerLine: 'bg-[rgba(148,163,184,0.14)]',
                    dividerText: 'text-[#94A3B8] text-xs uppercase tracking-wider',
                },
            }}
        >
            <html lang="en" className="dark">
                <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#050816] text-[#F4F7FF] min-h-screen relative selection:bg-[#7C5CFF]/30 selection:text-[#35D6FF]`}>
                    <LivingSpaceBackground />
                    <div className="relative z-10 flex min-h-screen flex-col">
                        {children}
                    </div>
                    <Toaster
                        theme="dark"
                        toastOptions={{
                            className: 'border border-[rgba(148,163,184,0.16)] bg-[#0D1424] text-[#F4F7FF] shadow-2xl backdrop-blur-xl',
                        }}
                    />
                </body>
            </html>
        </ClerkProvider>
    );
}
