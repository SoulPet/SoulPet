import { Permission, RoleService, UserRole } from '@/lib/auth/roles';
import { useWallet } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';

interface User {
    address: string;
    role: UserRole;
    permissions: Permission[];
}

const roleService = new RoleService();

/**
 * Hook for managing user authentication and permissions
 */
export function useAuth() {
    const wallet = useWallet();
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (wallet.publicKey) {
            loadUser();
        } else {
            setUser(null);
            setIsLoading(false);
        }
    }, [wallet.publicKey]);

    const loadUser = async () => {
        if (!wallet.publicKey) return;

        try {
            setIsLoading(true);
            // TODO: Load user role from backend
            // For now, we'll use a default role
            const role = UserRole.USER;
            const permissions = roleService.getPermissions(role);

            setUser({
                address: wallet.publicKey.toString(),
                role,
                permissions,
            });
        } catch (error) {
            console.error('Failed to load user:', error);
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    const hasPermission = (permission: Permission): boolean => {
        if (!user) return false;
        return roleService.hasPermission(user.role, permission);
    };

    const hasPermissions = (permissions: Permission[]): boolean => {
        if (!user) return false;
        return roleService.hasPermissions(user.role, permissions);
    };

    const hasAnyPermission = (permissions: Permission[]): boolean => {
        if (!user) return false;
        return roleService.hasAnyPermission(user.role, permissions);
    };

    const isAdmin = (): boolean => {
        return user?.role === UserRole.ADMIN;
    };

    const isModerator = (): boolean => {
        return user?.role === UserRole.MODERATOR;
    };

    return {
        user,
        isLoading,
        isAuthenticated: !!user,
        hasPermission,
        hasPermissions,
        hasAnyPermission,
        isAdmin,
        isModerator,
    };
}
