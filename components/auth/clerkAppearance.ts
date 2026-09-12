import { dark } from '@clerk/themes';

/**
 * Institutional HyperStocks Clerk Theme Customization
 * Ensures complete visual harmony with the HyperStocks dark, AI-native design system.
 */
export const clerkAuthAppearance = {
    baseTheme: dark,
    variables: {
        colorPrimary: '#10b981',
        colorBackground: 'transparent',
        colorForeground: '#f3f4f6',
        colorMutedForeground: '#9ca3af',
        colorNeutral: '#1f2937',
        colorInputBackground: '#111827',
        colorInputText: '#f9fafb',
        borderRadius: '0.75rem',
        fontFamily: 'var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif',
        fontSize: '0.875rem',
    },
    elements: {
        rootBox: 'w-full flex justify-center',
        cardBox: 'w-full shadow-none bg-transparent',
        card: 'w-full bg-transparent shadow-none border-0 p-0',
        header: 'text-left pb-4',
        headerTitle: 'text-xl sm:text-2xl font-bold text-gray-100 tracking-tight',
        headerSubtitle: 'text-xs sm:text-sm text-gray-400 mt-1 leading-relaxed',
        socialButtonsBlockButton:
            'border border-gray-800/90 bg-gray-900/80 hover:bg-gray-800 hover:border-gray-700 text-gray-200 font-medium py-2.5 px-4 rounded-xl transition-all duration-200 shadow-sm text-xs',
        socialButtonsBlockButtonText: 'text-xs font-semibold text-gray-200',
        socialButtonsProviderIcon: 'w-4 h-4 mr-2',
        dividerRow: 'my-4',
        dividerLine: 'bg-gray-800/80',
        dividerText: 'text-[11px] font-semibold text-gray-500 uppercase tracking-widest px-3 bg-transparent',
        form: 'gap-3.5',
        formFieldLabel: 'text-xs font-semibold text-gray-300 mb-1.5',
        formFieldInput:
            'bg-gray-900/90 border border-gray-800/90 text-gray-100 placeholder:text-gray-600 rounded-xl px-3.5 py-2.5 text-xs focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/30 transition-all duration-150',
        formFieldAction: 'text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors',
        formButtonPrimary:
            'bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-emerald-500/20 transition-all duration-200 text-xs tracking-wide cursor-pointer hover:shadow-emerald-500/30',
        footer: 'pt-4 mt-2 border-t border-gray-800/60',
        footerAction: 'justify-center text-xs text-gray-400',
        footerActionText: 'text-xs text-gray-400',
        footerActionLink: 'text-emerald-400 hover:text-emerald-300 font-semibold transition-colors ml-1',
        identityPreview: 'border border-gray-800 bg-gray-900/80 rounded-xl p-2.5',
        identityPreviewText: 'text-gray-200 font-medium text-xs',
        identityPreviewEditButton: 'text-emerald-400 hover:text-emerald-300 text-xs font-semibold',
        otpCodeFieldInput:
            'border border-gray-800 bg-gray-900 text-gray-100 rounded-xl focus:border-emerald-500 text-base font-mono',
        formResendCodeLink: 'text-emerald-400 hover:text-emerald-300 text-xs font-medium',
        alert: 'border border-rose-500/30 bg-rose-500/10 text-rose-300 rounded-xl text-xs p-3',
        alertText: 'text-rose-300 text-xs font-medium',
        formFieldErrorText: 'text-rose-400 text-[11px] font-medium mt-1',
        formFieldSuccessText: 'text-emerald-400 text-[11px] font-medium mt-1',
    },
};
