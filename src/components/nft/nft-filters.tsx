'use client'

import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { NFTDisplay } from '@/lib/nft'
import { ChevronDown, SortAsc, SortDesc } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

interface NFTFiltersProps {
    nfts: NFTDisplay[]
    onFilter: (filteredNFTs: NFTDisplay[]) => void
}

type SortField = 'name' | 'attributes'
type SortOrder = 'asc' | 'desc'

interface SortConfig {
    field: SortField
    order: SortOrder
}

const SORT_OPTIONS = [
    { label: 'Name (A-Z)', field: 'name' as SortField, order: 'asc' as SortOrder },
    { label: 'Name (Z-A)', field: 'name' as SortField, order: 'desc' as SortOrder },
    {
        label: 'Attributes (Ascending)',
        field: 'attributes' as SortField,
        order: 'asc' as SortOrder,
    },
    {
        label: 'Attributes (Descending)',
        field: 'attributes' as SortField,
        order: 'desc' as SortOrder,
    },
]

export function NFTFilters({ nfts, onFilter }: NFTFiltersProps) {
    const [search, setSearch] = useState('')
    const [sort, setSort] = useState<SortConfig>({
        field: 'name',
        order: 'asc',
    })

    const filteredNFTs = useMemo(() => {
        let result = [...nfts]

        // Apply search filter
        if (search) {
            const searchLower = search.toLowerCase()
            result = result.filter(
                (nft) =>
                    nft.name.toLowerCase().includes(searchLower) ||
                    nft.description.toLowerCase().includes(searchLower) ||
                    nft.attributes.some(
                        (attr) =>
                            attr.trait_type
                                .toLowerCase()
                                .includes(searchLower) ||
                            attr.value.toString().toLowerCase().includes(searchLower)
                    )
            )
        }

        // Apply sorting
        result.sort((a, b) => {
            if (sort.field === 'name') {
                return sort.order === 'asc'
                    ? a.name.localeCompare(b.name)
                    : b.name.localeCompare(a.name)
            } else {
                // Sort by number of attributes
                const aCount = a.attributes.length
                const bCount = b.attributes.length
                return sort.order === 'asc'
                    ? aCount - bCount
                    : bCount - aCount
            }
        })

        return result
    }, [nfts, search, sort])

    useEffect(() => {
        onFilter(filteredNFTs)
    }, [filteredNFTs, onFilter])

    return (
        <div className="flex items-center gap-4">
            <div className="flex-1">
                <Input
                    placeholder="Search by name, description, or attributes..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                        {sort.order === 'asc' ? (
                            <SortAsc className="mr-2 h-4 w-4" />
                        ) : (
                            <SortDesc className="mr-2 h-4 w-4" />
                        )}
                        Sort
                        <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {SORT_OPTIONS.map((option) => (
                        <DropdownMenuItem
                            key={`${option.field}-${option.order}`}
                            onClick={() =>
                                setSort({
                                    field: option.field,
                                    order: option.order,
                                })
                            }
                        >
                            {option.label}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )
} 