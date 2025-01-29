'use client';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Copy } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface CollectionShareDialogProps {
    collectionId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CollectionShareDialog({
    collectionId,
    open,
    onOpenChange,
}: CollectionShareDialogProps) {
    const [copied, setCopied] = useState(false);
    const shareUrl = `${window.location.origin}/collections/${collectionId}`;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            toast.success('Link copied');
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy:', error);
            toast.error('Copy failed');
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Share Collection</DialogTitle>
                    <DialogDescription>
                        Share your collection with others using the link below.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                        <Input value={shareUrl} readOnly className="flex-1" />
                        <Button variant="outline" size="icon" onClick={handleCopy}>
                            <Copy className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
