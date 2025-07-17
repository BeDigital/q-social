import { AppDataSource } from '../database/ormconfig';
import { DataProtectionService } from './dataProtectionService';
import { logger } from '../config/monitoring';

interface Secret {
  id: number;
  name: string;
  value: string;
  version: number;
  active: boolean;
  created_at: Date;
  expires_at: Date;
}

export class SecretRotationService {
  private static readonly secretRepository = AppDataSource.getRepository('secrets');
  private static readonly ROTATION_INTERVAL = 30 * 24 * 60 * 60 * 1000; // 30 days

  static async rotateSecret(name: string): Promise<void> {
    try {
      // Generate new secret
      const newValue = await DataProtectionService.generateSecureToken(32);
      const currentDate = new Date();
      const expiryDate = new Date(currentDate.getTime() + this.ROTATION_INTERVAL);

      // Get current active secret
      const currentSecret = await this.secretRepository.findOne({
        where: { name, active: true }
      });

      // Begin transaction
      await AppDataSource.transaction(async transactionalEntityManager => {
        // Deactivate current secret
        if (currentSecret) {
          await transactionalEntityManager.update('secrets', 
            { id: currentSecret.id },
            { active: false }
          );
        }

        // Insert new secret
        await transactionalEntityManager.insert('secrets', {
          name,
          value: await DataProtectionService.encrypt(newValue),
          version: currentSecret ? currentSecret.version + 1 : 1,
          active: true,
          created_at: currentDate,
          expires_at: expiryDate
        });
      });

      logger.info(`Secret ${name} rotated successfully`, {
        version: currentSecret ? currentSecret.version + 1 : 1,
        expiresAt: expiryDate
      });

      // Trigger application reload if needed
      if (this.shouldReloadApp(name)) {
        await this.reloadApplication();
      }
    } catch (error) {
      logger.error(`Failed to rotate secret ${name}`, { error });
      throw error;
    }
  }

  static async getActiveSecret(name: string): Promise<string> {
    const secret = await this.secretRepository.findOne({
      where: { name, active: true }
    });

    if (!secret) {
      throw new Error(`No active secret found for ${name}`);
    }

    return DataProtectionService.decrypt(secret.value);
  }

  private static shouldReloadApp(secretName: string): boolean {
    const reloadTriggeringSecrets = ['JWT_SECRET', 'ENCRYPTION_KEY'];
    return reloadTriggeringSecrets.includes(secretName);
  }

  private static async reloadApplication(): Promise<void> {
    logger.info('Initiating graceful application reload');
    // Implement graceful reload logic here
  }

  static async checkAndRotateExpiredSecrets(): Promise<void> {
    try {
      const expiredSecrets = await this.secretRepository.find({
        where: {
          active: true,
          expires_at: { $lt: new Date() }
        }
      });

      for (const secret of expiredSecrets) {
        await this.rotateSecret(secret.name);
      }
    } catch (error) {
      logger.error('Failed to check and rotate expired secrets', { error });
      throw error;
    }
  }

  static async setupRotationSchedule(): Promise<void> {
    // Check for expired secrets every hour
    setInterval(
      () => this.checkAndRotateExpiredSecrets(),
      60 * 60 * 1000
    );
  }
}
