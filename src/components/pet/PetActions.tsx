import { FC } from 'react';
import { usePetStore } from '@/stores/petStore';
import { Button } from '../common';

export const PetActions: FC = () => {
  const { selectedPet } = usePetStore();

  const handleFeed = async () => {
    try {
      // TODO: Implement feed logic
      console.log('Feeding pet:', selectedPet?.name);
    } catch (error) {
      console.error('Failed to feed pet:', error);
    }
  };

  const handlePlay = async () => {
    try {
      // TODO: Implement play logic
      console.log('Playing with pet:', selectedPet?.name);
    } catch (error) {
      console.error('Failed to play with pet:', error);
    }
  };

  const handleTrain = async () => {
    try {
      // TODO: Implement training logic
      console.log('Training pet:', selectedPet?.name);
    } catch (error) {
      console.error('Failed to train pet:', error);
    }
  };

  if (!selectedPet) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
      <div className="container mx-auto flex justify-center space-x-4">
        <Button onClick={handleFeed}>Feed</Button>
        <Button onClick={handlePlay}>Play</Button>
        <Button onClick={handleTrain}>Train</Button>
      </div>
    </div>
  );
}; 