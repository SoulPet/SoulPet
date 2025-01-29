import { FC, useState } from 'react';
import { Button } from '../common';
import { usePetStore } from '@/stores/petStore';

export const CreatePetForm: FC = () => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { setPets } = usePetStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // TODO: Implement pet creation logic
      console.log('Creating pet:', name);
    } catch (error) {
      console.error('Failed to create pet:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Pet Name
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
          required
        />
      </div>
      <Button type="submit" loading={loading}>
        Create Pet
      </Button>
    </form>
  );
}; 