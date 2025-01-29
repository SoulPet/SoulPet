import { FC } from 'react';
import type { Pet } from '@/types/pet';
import { Button } from '../common/Button';

interface PetCardProps {
  pet: Pet;
  onSelect?: (pet: Pet) => void;
}

export const PetCard: FC<PetCardProps> = ({ pet, onSelect }) => {
  return (
    <div className="p-4 border rounded-lg">
      <img
        src={pet.metadata.image}
        alt={pet.name}
        className="w-full h-48 object-cover rounded-lg"
      />
      <h3 className="mt-2 text-lg font-bold">{pet.name}</h3>
      <div className="mt-2 space-y-1">
        <div>Health: {pet.attributes.health}</div>
        <div>Happiness: {pet.attributes.happiness}</div>
        <div>Experience: {pet.attributes.experience}</div>
      </div>
      {onSelect && (
        <Button onClick={() => onSelect(pet)} className="mt-4">
          Select
        </Button>
      )}
    </div>
  );
}; 