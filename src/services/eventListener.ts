import { Connection, PublicKey } from '@solana/web3.js';
import { PetContractService } from './petContract';

/**
 * Event Listener Service
 * Monitors pet-related events on the Solana blockchain
 */
export class EventListenerService {
  private connection: Connection;
  private petContract: PetContractService;

  constructor(connection: Connection, programId: PublicKey) {
    this.connection = connection;
    this.petContract = new PetContractService(connection, programId);
  }

  /**
   * Start listening for pet creation events
   * @param callback - Event callback function
   * @returns Subscription ID
   */
  public async subscribePetCreation(
    callback: (petId: PublicKey) => void
  ): Promise<number> {
    return this.connection.onProgramAccountChange(
      this.petContract.programId,
      (accountInfo) => {
        // Handle account change event
        callback(accountInfo.accountId);
      }
    );
  }

  /**
   * Stop listening to a specific event
   * @param subscriptionId - ID of the subscription to cancel
   */
  public async unsubscribe(subscriptionId: number): Promise<void> {
    await this.connection.removeProgramAccountChangeListener(subscriptionId);
  }
}
