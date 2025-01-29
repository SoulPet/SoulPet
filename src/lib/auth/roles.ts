/**
 * Available user roles in the system
 */
export enum UserRole {
    ADMIN = 'admin',
    MODERATOR = 'moderator',
    USER = 'user',
}

/**
 * Available permissions in the system
 */
export enum Permission {
    // User management
    MANAGE_USERS = 'manage_users',
    VIEW_USERS = 'view_users',

    // Content management
    MANAGE_CONTENT = 'manage_content',
    VIEW_CONTENT = 'view_content',

    // NFT management
    MINT_NFT = 'mint_nft',
    BURN_NFT = 'burn_nft',
    TRANSFER_NFT = 'transfer_nft',

    // Token management
    MINT_TOKEN = 'mint_token',
    BURN_TOKEN = 'burn_token',
    TRANSFER_TOKEN = 'transfer_token',

    // System management
    MANAGE_SYSTEM = 'manage_system',
    VIEW_SYSTEM = 'view_system',
}

/**
 * Role-permission mapping
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
    [UserRole.ADMIN]: Object.values(Permission),
    [UserRole.MODERATOR]: [
        Permission.VIEW_USERS,
        Permission.VIEW_CONTENT,
        Permission.MANAGE_CONTENT,
        Permission.VIEW_SYSTEM,
    ],
    [UserRole.USER]: [
        Permission.VIEW_CONTENT,
        Permission.MINT_NFT,
        Permission.TRANSFER_NFT,
        Permission.TRANSFER_TOKEN,
    ],
};

/**
 * Service for managing roles and permissions
 */
export class RoleService {
    /**
     * Check if a role has a specific permission
     */
    hasPermission(role: UserRole, permission: Permission): boolean {
        return ROLE_PERMISSIONS[role]?.includes(permission) || false;
    }

    /**
     * Get all permissions for a role
     */
    getPermissions(role: UserRole): Permission[] {
        return ROLE_PERMISSIONS[role] || [];
    }

    /**
     * Check if a role has all specified permissions
     */
    hasPermissions(role: UserRole, permissions: Permission[]): boolean {
        return permissions.every((permission) =>
            this.hasPermission(role, permission)
        );
    }

    /**
     * Check if a role has any of the specified permissions
     */
    hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
        return permissions.some((permission) =>
            this.hasPermission(role, permission)
        );
    }
}
