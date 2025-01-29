export interface Pet {
  id: string;
  name: string;
  owner: string;
  attributes: {
    health: number;
    happiness: number;
    experience: number;
  };
  metadata: {
    image: string;
    description: string;
  };
} 