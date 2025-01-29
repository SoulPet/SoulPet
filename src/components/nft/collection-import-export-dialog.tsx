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
import { Label } from '@/components/ui/label';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

interface NFTCollection {
    id: string;
    name: string;
    description: string;
    nfts: string[];
    createdAt: number;
    updatedAt: number;
}

interface CollectionImportExportDialogProps {
    collections: NFTCollection[];
    onImport: (collections: NFTCollection[]) => void;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CollectionImportExportDialog({
    collections,
    onImport,
    open,
    onOpenChange,
}: CollectionImportExportDialogProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [importError, setImportError] = useState<string>('');

    const handleExport = () => {
        try {
            const data = JSON.stringify(collections, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'nft-collections.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast.success('Collections exported successfully');
        } catch (error) {
            console.error('Export failed:', error);
            toast.error('Export failed');
        }
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);
                // Validate imported data
                if (
                    !Array.isArray(data) ||
                    !data.every(
                        (item) =>
                            typeof item === 'object' &&
                            typeof item.id === 'string' &&
                            typeof item.name === 'string' &&
                            Array.isArray(item.nfts)
                    )
                ) {
                    throw new Error('Invalid format');
                }

                onImport(data);
                toast.success('Collections imported successfully');
                setImportError('');
            } catch (error) {
                console.error('Import failed:', error);
                setImportError('Import failed: Invalid file format');
            }
        };
        reader.readAsText(file);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Import/Export Collections</DialogTitle>
                    <DialogDescription>
                        Export your collection data or import collections from a file.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Export Collections</Label>
                        <Button variant="outline" className="w-full" onClick={handleExport}>
                            Export as JSON File
                        </Button>
                    </div>
                    <div className="space-y-2">
                        <Label>Import Collections</Label>
                        <Input
                            ref={fileInputRef}
                            type="file"
                            accept=".json"
                            onChange={handleImport}
                        />
                        {importError && (
                            <p className="text-sm text-destructive">{importError}</p>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
