import { create } from 'zustand';
import type { Pet } from '@/types/pet';

interface PetState {
  pets: Pet[];
  selectedPet: Pet | null;
  loading: boolean;
  setPets: (pets: Pet[]) => void;
  selectPet: (pet: Pet) => void;
  setLoading: (loading: boolean) => void;
}

export const usePetStore = create<PetState>((set) => ({
  pets: [],
  selectedPet: null,
  loading: false,
  setPets: (pets: Pet[]) => set({ pets }),
  selectPet: (pet: Pet) => set({ selectedPet: pet }),
  setLoading: (loading: boolean) => set({ loading }),
})); 