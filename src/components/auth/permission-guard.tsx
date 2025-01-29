'use client';

import { useAuth } from '@/hooks/use-auth';
import { Permission } from '@/lib/auth/roles';
import { ReactNode } from 'react';

interface PermissionGuardProps {
    /**
     * Required permissions (all must be present)
     */
    permissions?: Permission[];

    /**
     * Alternative permissions (any one must be present)
     */
    anyPermissions?: Permission[];

    /**
     * Content to render when user has permission
     */
    children: ReactNode;

    /**
     * Content to render when user doesn't have permission
     */
    fallback?: ReactNode;
}

/**
 * Component for protecting content based on user permissions
 */
export function PermissionGuard({
    permissions = [],
    anyPermissions = [],
    children,
    fallback,
}: PermissionGuardProps) {
    const { hasPermissions, hasAnyPermission } = useAuth();

    const hasAccess =
        (permissions.length === 0 || hasPermissions(permissions)) &&
        (anyPermissions.length === 0 || hasAnyPermission(anyPermissions));

    if (!hasAccess) {
        return fallback || null;
    }

    return <>{children}</>;
}

/**
 * Component for protecting content that requires admin access
 */
export function AdminGuard({
    children,
    fallback,
}: {
    children: ReactNode;
    fallback?: ReactNode;
}) {
    const { isAdmin } = useAuth();

    if (!isAdmin()) {
        return fallback || null;
    }

    return <>{children}</>;
}

/**
 * Component for protecting content that requires moderator access
 */
export function ModeratorGuard({
    children,
    fallback,
}: {
    children: ReactNode;
    fallback?: ReactNode;
}) {
    const { isModerator, isAdmin } = useAuth();

    if (!isModerator() && !isAdmin()) {
        return fallback || null;
    }

    return <>{children}</>;
}
