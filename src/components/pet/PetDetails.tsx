'use client';

import { type Pet } from '@/types';
import Image from 'next/image';
import { useCallback } from 'react';

interface Props {
    pet: Pet;
    onAdopt?: (pet: Pet) => Promise<void>;
}

export default function PetDetails({ pet, onAdopt }: Props): JSX.Element {
    const handleAdopt = useCallback(async () => {
        if (onAdopt) {
            await onAdopt(pet);
        }
    }, [onAdopt, pet]);

    return (
        <div className="flex flex-col gap-4 p-4 bg-white rounded-lg shadow">
            <div className="relative w-full aspect-square">
                <Image
                    src={pet.imageUrl}
                    alt={pet.name}
                    fill
                    className="object-cover rounded-lg"
                />
            </div>
            <div className="space-y-2">
                <h2 className="text-2xl font-bold">{pet.name}</h2>
                <p className="text-gray-600">{pet.description}</p>
                <div className="flex flex-wrap gap-2">
                    {Object.entries(pet.attributes).map(([key, value]) => (
                        <span
                            key={key}
                            className="px-2 py-1 text-sm bg-gray-100 rounded-full"
                        >
                            {key}: {value}
                        </span>
                    ))}
                </div>
            </div>
            {onAdopt && (
                <button
                    onClick={handleAdopt}
                    className="px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600"
                >
                    Adopt
                </button>
            )}
        </div>
    );
} 