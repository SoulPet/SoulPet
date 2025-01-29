import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface State {
    // Theme
    theme: 'light' | 'dark' | 'system';
    setTheme: (theme: 'light' | 'dark' | 'system') => void;

    // Wallet
    wallet: string | null;
    setWallet: (address: string | null) => void;

    // Notifications
    notifications: {
        id: string;
        type: 'info' | 'success' | 'warning' | 'error';
        message: string;
    }[];
    addNotification: (
        notification: Omit<State['notifications'][0], 'id'>
    ) => void;
    removeNotification: (id: string) => void;

    // Favorites
    favorites: {
        id: string;
        type: 'pet' | 'nft' | 'post';
        itemId: string;
    }[];
    addFavorite: (favorite: Omit<State['favorites'][0], 'id'>) => void;
    removeFavorite: (id: string) => void;
}

interface Actions {
    // Theme
    setTheme: (theme: State['theme']) => void;

    // Wallet
    setWallet: (address: string | null) => void;

    // Notifications
    addNotification: (
        notification: Omit<State['notifications'][0], 'id'>
    ) => void;
    removeNotification: (id: string) => void;

    // Favorites
    addFavorite: (favorite: Omit<State['favorites'][0], 'id'>) => void;
    removeFavorite: (id: string) => void;
}

export const useAppStore = create<State>()(
    persist(
        (set) => ({
            // Theme
            theme: 'system',
            setTheme: (theme) => set({ theme }),

            // Wallet
            wallet: null,
            setWallet: (address) => set({ wallet: address }),

            // Notifications
            notifications: [],
            addNotification: (notification) =>
                set((state) => ({
                    notifications: [
                        ...state.notifications,
                        { ...notification, id: Date.now().toString() },
                    ],
                })),
            removeNotification: (id) =>
                set((state) => ({
                    notifications: state.notifications.filter((n) => n.id !== id),
                })),

            // Favorites
            favorites: [],
            addFavorite: (favorite) =>
                set((state) => ({
                    favorites: [
                        ...state.favorites,
                        { ...favorite, id: Date.now().toString() },
                    ],
                })),
            removeFavorite: (id) =>
                set((state) => ({
                    favorites: state.favorites.filter((f) => f.id !== id),
                })),
        }),
        {
            name: 'app-storage',
        }
    )
);
