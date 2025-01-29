'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NFTMetadata } from '@/lib/nft';
import { cn } from '@/lib/utils';
import { UploadCloud, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';

interface NFTBatchUploadProps {
    onUpload: (files: NFTMetadata[]) => Promise<void>;
}

interface FileWithPreview extends File {
    preview: string;
}

interface NFTUploadItem extends NFTMetadata {
    file: FileWithPreview;
}

export function NFTBatchUpload({ onUpload }: NFTBatchUploadProps) {
    const [items, setItems] = useState<NFTUploadItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const imageFiles = acceptedFiles.filter((file) =>
            file.type.startsWith('image/')
        );

        const newItems = imageFiles.map((file) => {
            const preview = URL.createObjectURL(file);
            const fileWithPreview = Object.assign(file, {
                preview,
            }) as FileWithPreview;

            return {
                name: file.name.replace(/\.[^/.]+$/, ''),
                description: '',
                image: fileWithPreview,
                attributes: [],
                file: fileWithPreview,
            };
        });

        setItems((prev) => [...prev, ...newItems]);
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
        },
    });

    const removeItem = (index: number) => {
        setItems((prev) => {
            const newItems = [...prev];
            URL.revokeObjectURL(newItems[index].file.preview);
            newItems.splice(index, 1);
            return newItems;
        });
    };

    const updateItem = (index: number, data: Partial<NFTUploadItem>) => {
        setItems((prev) => {
            const newItems = [...prev];
            newItems[index] = { ...newItems[index], ...data };
            return newItems;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (items.length === 0) return;

        try {
            setIsLoading(true);
            await onUpload(items);
            // Clean up preview URLs
            items.forEach((item) => URL.revokeObjectURL(item.file.preview));
            setItems([]);
        } catch (error) {
            console.error('Failed to upload NFTs:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        // Clean up preview URLs
        return () => {
            items.forEach((item) => {
                if (item.file.preview) {
                    URL.revokeObjectURL(item.file.preview);
                }
            });
        };
    }, [items]);

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            <div
                {...getRootProps()}
                className={cn(
                    'relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center',
                    isDragActive && 'border-primary/50 bg-primary/5'
                )}
            >
                <input {...getInputProps()} />
                <UploadCloud className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-lg font-medium">
                    Drag and drop image files here, or click to select files
                </p>
                <p className="text-sm text-muted-foreground">
                    Supports PNG, JPG, JPEG, GIF formats
                </p>
            </div>

            {items.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">
                            Files to Upload ({items.length})
                        </h3>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                items.forEach((item) => URL.revokeObjectURL(item.file.preview));
                                setItems([]);
                            }}
                        >
                            Clear List
                        </Button>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {items.map((item, index) => (
                            <Card key={index}>
                                <CardHeader className="relative">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-2 top-2"
                                        onClick={() => removeItem(index)}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                    <div className="aspect-square overflow-hidden rounded-lg">
                                        <img
                                            src={item.file.preview}
                                            alt={item.name}
                                            className="h-full w-full object-cover"
                                        />
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor={`name-${index}`}>Name</Label>
                                        <Input
                                            id={`name-${index}`}
                                            value={item.name}
                                            onChange={(e) =>
                                                updateItem(index, {
                                                    name: e.target.value,
                                                })
                                            }
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor={`description-${index}`}>Description</Label>
                                        <Input
                                            id={`description-${index}`}
                                            value={item.description}
                                            onChange={(e) =>
                                                updateItem(index, {
                                                    description: e.target.value,
                                                })
                                            }
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <div className="flex justify-end">
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? 'Uploading...' : `Upload ${items.length} NFTs`}
                        </Button>
                    </div>
                </div>
            )}
        </form>
    );
}
