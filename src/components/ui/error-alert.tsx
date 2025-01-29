'use client';

import { Button } from '@/components/ui/button';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { AlertCircle, AlertTriangle, Ban, Info, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ErrorAlertProps {
    title?: string;
    message: string;
    type?: 'error' | 'warning' | 'info';
    action?: {
        label: string;
        onClick: () => void;
    };
    onClose?: () => void;
    autoClose?: boolean;
    autoCloseDelay?: number;
}

export function ErrorAlert({
    title,
    message,
    type = 'error',
    action,
    onClose,
    autoClose = false,
    autoCloseDelay = 5000,
}: ErrorAlertProps) {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        if (autoClose && isVisible) {
            const timer = setTimeout(() => {
                handleClose();
            }, autoCloseDelay);

            return () => clearTimeout(timer);
        }
    }, [autoClose, autoCloseDelay, isVisible]);

    const handleClose = () => {
        setIsVisible(false);
        onClose?.();
    };

    if (!isVisible) {
        return null;
    }

    const getIcon = () => {
        switch (type) {
            case 'error':
                return <Ban className="h-5 w-5 text-destructive" />;
            case 'warning':
                return <AlertTriangle className="h-5 w-5 text-warning" />;
            case 'info':
                return <Info className="h-5 w-5 text-info" />;
            default:
                return <AlertCircle className="h-5 w-5" />;
        }
    };

    const getBackgroundColor = () => {
        switch (type) {
            case 'error':
                return 'bg-destructive/10';
            case 'warning':
                return 'bg-warning/10';
            case 'info':
                return 'bg-info/10';
            default:
                return 'bg-muted';
        }
    };

    return (
        <div
            className={`relative rounded-lg ${getBackgroundColor()} p-4 ${type === 'error' ? 'border-destructive/50' : 'border-input'
                } border`}
        >
            <div className="flex items-start gap-3">
                {getIcon()}
                <div className="flex-1">
                    {title && (
                        <h3 className="mb-1 font-medium leading-none tracking-tight">
                            {title}
                        </h3>
                    )}
                    <p
                        className={`text-sm ${type === 'error' ? 'text-destructive' : 'text-muted-foreground'
                            }`}
                    >
                        {message}
                    </p>
                    {action && (
                        <div className="mt-3">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={action.onClick}
                                className="h-8 px-3 text-xs"
                            >
                                <RefreshCw className="mr-2 h-3 w-3" />
                                {action.label}
                            </Button>
                        </div>
                    )}
                </div>
                {onClose && (
                    <button
                        type="button"
                        className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                        onClick={handleClose}
                    >
                        <span className="sr-only">Close</span>
                        <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                    </button>
                )}
            </div>
        </div>
    );
}
