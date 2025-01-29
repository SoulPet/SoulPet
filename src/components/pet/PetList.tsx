import { FC } from 'react';
import { PetCard } from './PetCard';
import { Loading } from '../common/Loading';
import { usePetStore } from '@/stores/petStore';

export const PetList: FC = () => {
  const { pets, loading, selectPet } = usePetStore();

  if (loading) {
    return <Loading size="lg" />;
  }

  if (!pets.length) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No pets found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {pets.map((pet) => (
        <PetCard key={pet.id} pet={pet} onSelect={selectPet} />
      ))}
    </div>
  );
}; 