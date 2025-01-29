'use client';

import { CollectionImportExportDialog } from '@/components/nft/collection-import-export-dialog';
import { CollectionShareDialog } from '@/components/nft/collection-share-dialog';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NFTDisplay } from '@/lib/nft';
import { cn } from '@/lib/utils';
import {
    Download,
    Edit,
    FolderPlus,
    Grid2X2,
    List,
    Share2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';

interface NFTCollection {
    id: string;
    name: string;
    description: string;
    nfts: string[]; // NFT mint addresses
    createdAt: number;
    updatedAt: number;
}

interface NFTCollectionsProps {
    nfts: NFTDisplay[];
    onCollectionClick?: (collection: NFTCollection) => void;
    selectedNFTs?: string[];
}

export function NFTCollections({
    nfts,
    onCollectionClick,
    selectedNFTs,
}: NFTCollectionsProps) {
    const [collections, setCollections] = useState<NFTCollection[]>([]);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [selectedCollection, setSelectedCollection] =
        useState<NFTCollection | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [shareCollectionId, setShareCollectionId] = useState<string | null>(
        null
    );
    const [isImportExportDialogOpen, setIsImportExportDialogOpen] =
        useState(false);

    // Load collections from localStorage
    useEffect(() => {
        const savedCollections = localStorage.getItem('nft-collections');
        if (savedCollections) {
            setCollections(JSON.parse(savedCollections));
        }
    }, []);

    // Save collections to localStorage
    const saveCollections = (collections: NFTCollection[]) => {
        localStorage.setItem('nft-collections', JSON.stringify(collections));
        setCollections(collections);
    };

    const handleCreateCollection = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const name = formData.get('name') as string;
        const description = formData.get('description') as string;

        const newCollection: NFTCollection = {
            id: crypto.randomUUID(),
            name,
            description,
            nfts: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        saveCollections([...collections, newCollection]);
        setIsCreateDialogOpen(false);
    };

    const handleEditCollection = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedCollection) return;

        const formData = new FormData(e.currentTarget);
        const name = formData.get('name') as string;
        const description = formData.get('description') as string;

        const updatedCollections = collections.map((collection) =>
            collection.id === selectedCollection.id
                ? {
                    ...collection,
                    name,
                    description,
                    updatedAt: Date.now(),
                }
                : collection
        );

        saveCollections(updatedCollections);
        setIsEditDialogOpen(false);
        setSelectedCollection(null);
    };

    const handleDeleteCollection = (id: string) => {
        const updatedCollections = collections.filter(
            (collection) => collection.id !== id
        );
        saveCollections(updatedCollections);
    };

    const getNFTsInCollection = (collection: NFTCollection) => {
        return nfts.filter((nft) => collection.nfts.includes(nft.mintAddress));
    };

    const handleAddToCollection = (collection: NFTCollection) => {
        const updatedCollections = collections.map((c) => {
            if (c.id === collection.id) {
                return {
                    ...c,
                    nfts: [...new Set([...c.nfts, ...selectedNFTs])],
                    updatedAt: Date.now(),
                };
            }
            return c;
        });
        saveCollections(updatedCollections);
        toast.success('Added to collection');
    };

    const handleImport = (importedCollections: NFTCollection[]) => {
        // Merge imported collections, avoid duplicates
        const updatedCollections = [...collections];
        importedCollections.forEach((imported) => {
            const existingIndex = collections.findIndex((c) => c.id === imported.id);
            if (existingIndex === -1) {
                updatedCollections.push(imported);
            } else {
                updatedCollections[existingIndex] = {
                    ...imported,
                    nfts: [
                        ...new Set([...collections[existingIndex].nfts, ...imported.nfts]),
                    ],
                };
            }
        });
        saveCollections(updatedCollections);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold">My Collections</h2>
                    {selectedNFTs?.length ? (
                        <span className="text-sm text-muted-foreground">
                            Selected {selectedNFTs.length} NFTs
                        </span>
                    ) : null}
                    <div className="flex items-center gap-1 rounded-lg border p-1">
                        <Button
                            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                            size="icon"
                            onClick={() => setViewMode('grid')}
                        >
                            <Grid2X2 className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                            size="icon"
                            onClick={() => setViewMode('list')}
                        >
                            <List className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setIsImportExportDialogOpen(true)}
                    >
                        <Download className="mr-2 h-4 w-4" />
                        Import/Export
                    </Button>
                    {selectedNFTs?.length ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button>
                                    <FolderPlus className="mr-2 h-4 w-4" />
                                    Add to Collection
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {collections.length === 0 ? (
                                    <DropdownMenuItem className="text-muted-foreground" disabled>
                                        No collections available
                                    </DropdownMenuItem>
                                ) : (
                                    collections.map((collection) => (
                                        <DropdownMenuItem
                                            key={collection.id}
                                            onClick={() => handleAddToCollection(collection)}
                                        >
                                            {collection.name}
                                        </DropdownMenuItem>
                                    ))
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <Dialog
                            open={isCreateDialogOpen}
                            onOpenChange={setIsCreateDialogOpen}
                        >
                            <DialogTrigger asChild>
                                <Button>
                                    <FolderPlus className="mr-2 h-4 w-4" />
                                    Create Collection
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <form onSubmit={handleCreateCollection}>
                                    <DialogHeader>
                                        <DialogTitle>Create Collection</DialogTitle>
                                        <DialogDescription>
                                            Create a new collection to organize your NFTs.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="name">Name</Label>
                                            <Input
                                                id="name"
                                                name="name"
                                                placeholder="Enter collection name"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="description">Description</Label>
                                            <Input
                                                id="description"
                                                name="description"
                                                placeholder="Enter collection description"
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button type="submit">Create</Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
            </div>

            <div
                className={
                    viewMode === 'grid'
                        ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3'
                        : 'space-y-4'
                }
            >
                {collections.map((collection) => {
                    const collectionNFTs = getNFTsInCollection(collection);
                    return (
                        <Card
                            key={collection.id}
                            className={cn(
                                'group transition-colors hover:bg-accent/50',
                                viewMode === 'list' && 'flex items-center'
                            )}
                            onClick={() => onCollectionClick?.(collection)}
                        >
                            {viewMode === 'grid' ? (
                                <>
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <CardTitle>{collection.name}</CardTitle>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setShareCollectionId(collection.id);
                                                    }}
                                                >
                                                    <Share2 className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedCollection(collection);
                                                        setIsEditDialogOpen(true);
                                                    }}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                        <CardDescription>{collection.description}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-sm text-muted-foreground">
                                            {collectionNFTs.length} NFTs
                                        </div>
                                    </CardContent>
                                </>
                            ) : (
                                <div className="flex flex-1 items-center gap-4 p-4">
                                    <div className="flex-1">
                                        <h3 className="font-semibold">{collection.name}</h3>
                                        <p className="text-sm text-muted-foreground">
                                            {collection.description}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="text-sm text-muted-foreground">
                                            {collectionNFTs.length} NFTs
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShareCollectionId(collection.id);
                                                }}
                                            >
                                                <Share2 className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedCollection(collection);
                                                    setIsEditDialogOpen(true);
                                                }}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </Card>
                    );
                })}
            </div>

            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <form onSubmit={handleEditCollection}>
                        <DialogHeader>
                            <DialogTitle>Edit Collection</DialogTitle>
                            <DialogDescription>
                                Modify the name and description of the collection.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-name">Name</Label>
                                <Input
                                    id="edit-name"
                                    name="name"
                                    defaultValue={selectedCollection?.name}
                                    placeholder="Enter collection name"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-description">Description</Label>
                                <Input
                                    id="edit-description"
                                    name="description"
                                    defaultValue={selectedCollection?.description}
                                    placeholder="Enter collection description"
                                />
                            </div>
                        </div>
                        <DialogFooter className="flex justify-between">
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={() => {
                                    if (selectedCollection) {
                                        handleDeleteCollection(selectedCollection.id);
                                        setIsEditDialogOpen(false);
                                        setSelectedCollection(null);
                                    }
                                }}
                            >
                                Delete Collection
                            </Button>
                            <Button type="submit">Save</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <CollectionShareDialog
                collectionId={shareCollectionId || ''}
                open={!!shareCollectionId}
                onOpenChange={(open) => !open && setShareCollectionId(null)}
            />

            <CollectionImportExportDialog
                collections={collections}
                onImport={handleImport}
                open={isImportExportDialogOpen}
                onOpenChange={setIsImportExportDialogOpen}
            />
        </div>
    );
}
