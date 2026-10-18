'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { DEFAULT_USER_PREFERENCES, UserPreferences } from '@/types/personalization';

interface PersonalizationContextType {
    preferences: UserPreferences;
    updatePreferences: (prefs: Partial<UserPreferences>) => Promise<boolean>;
    isOnboardingOpen: boolean;
    openOnboarding: () => void;
    closeOnboarding: () => void;
    isLoading: boolean;
    isPersonalized: boolean;
}

const PersonalizationReactContext = createContext<PersonalizationContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'hyperstocks_user_preferences';

export function PersonalizationProvider({
    children,
    initialPreferences,
}: {
    children: React.ReactNode;
    initialPreferences?: UserPreferences;
}) {
    const [preferences, setPreferences] = useState<UserPreferences>(
        initialPreferences || DEFAULT_USER_PREFERENCES
    );
    const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Sync with local storage or fetch from server on client mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                setPreferences((prev) => ({ ...prev, ...parsed }));
            } else if (!initialPreferences?.onboardingCompleted) {
                // Fetch from server
                fetch('/api/personalization/preferences')
                    .then((r) => r.json())
                    .then((res) => {
                        if (res.success && res.data) {
                            setPreferences(res.data);
                            if (!res.data.onboardingCompleted) {
                                // Auto-prompt onboarding once after a short delay for new users
                                const hasPrompted = sessionStorage.getItem('hyperstocks_onboarding_prompted');
                                if (!hasPrompted) {
                                    sessionStorage.setItem('hyperstocks_onboarding_prompted', 'true');
                                    setIsOnboardingOpen(true);
                                }
                            }
                        }
                    })
                    .catch(() => {});
            }
        } catch (e) {
            console.error('Error hydrating preferences:', e);
        }
    }, [initialPreferences]);

    const updatePreferences = useCallback(
        async (partial: Partial<UserPreferences>): Promise<boolean> => {
            setIsLoading(true);
            const updated: UserPreferences = {
                ...preferences,
                ...partial,
                onboardingCompleted: true,
                lastUpdated: new Date().toISOString(),
            };

            // Optimistic UI update
            setPreferences(updated);
            try {
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
            } catch {}

            try {
                const res = await fetch('/api/personalization/preferences', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updated),
                });
                const data = await res.json();
                if (data.success && data.data) {
                    setPreferences(data.data);
                    try {
                        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data.data));
                    } catch {}
                    return true;
                }
            } catch (err) {
                console.error('Failed to sync preferences to server:', err);
            } finally {
                setIsLoading(false);
            }
            return true;
        },
        [preferences]
    );

    const openOnboarding = () => setIsOnboardingOpen(true);
    const closeOnboarding = () => setIsOnboardingOpen(false);

    const isPersonalized = Boolean(preferences.onboardingCompleted);

    return (
        <PersonalizationReactContext.Provider
            value={{
                preferences,
                updatePreferences,
                isOnboardingOpen,
                openOnboarding,
                closeOnboarding,
                isLoading,
                isPersonalized,
            }}
        >
            {children}
        </PersonalizationReactContext.Provider>
    );
}

export function usePersonalization(): PersonalizationContextType {
    const context = useContext(PersonalizationReactContext);
    if (!context) {
        throw new Error('usePersonalization must be used within a PersonalizationProvider');
    }
    return context;
}
