import { SecretRotationService } from '../secretRotationService';
import { DataProtectionService } from '../dataProtectionService';
import { AppDataSource } from '../../database/ormconfig';
import { logger } from '../../config/monitoring';

jest.mock('../../database/ormconfig');
jest.mock('../dataProtectionService');
jest.mock('../../config/monitoring');

describe('SecretRotationService', () => {
  const mockSecretRepository = {
    findOne: jest.fn(),
    update: jest.fn(),
    insert: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockSecretRepository);
    (AppDataSource.transaction as jest.Mock).mockImplementation(cb => cb({ update: mockSecretRepository.update, insert: mockSecretRepository.insert }));
  });

  describe('rotateSecret', () => {
    it('should create new secret when no current secret exists', async () => {
      // Arrange
      const secretName = 'TEST_SECRET';
      mockSecretRepository.findOne.mockResolvedValue(null);
      (DataProtectionService.generateSecureToken as jest.Mock).mockResolvedValue('new-secret');
      (DataProtectionService.encrypt as jest.Mock).mockResolvedValue('encrypted-secret');

      // Act
      await SecretRotationService.rotateSecret(secretName);

      // Assert
      expect(mockSecretRepository.insert).toHaveBeenCalledWith(expect.objectContaining({
        name: secretName,
        value: 'encrypted-secret',
        version: 1,
        active: true,
      }));
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('rotated successfully'),
        expect.any(Object)
      );
    });

    it('should deactivate current secret and create new version', async () => {
      // Arrange
      const secretName = 'TEST_SECRET';
      const currentSecret = {
        id: 1,
        name: secretName,
        version: 1,
        active: true,
      };
      mockSecretRepository.findOne.mockResolvedValue(currentSecret);
      (DataProtectionService.generateSecureToken as jest.Mock).mockResolvedValue('new-secret');
      (DataProtectionService.encrypt as jest.Mock).mockResolvedValue('encrypted-secret');

      // Act
      await SecretRotationService.rotateSecret(secretName);

      // Assert
      expect(mockSecretRepository.update).toHaveBeenCalledWith(
        { id: currentSecret.id },
        { active: false }
      );
      expect(mockSecretRepository.insert).toHaveBeenCalledWith(expect.objectContaining({
        name: secretName,
        value: 'encrypted-secret',
        version: 2,
        active: true,
      }));
    });

    it('should handle rotation errors gracefully', async () => {
      // Arrange
      const secretName = 'TEST_SECRET';
      mockSecretRepository.findOne.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(SecretRotationService.rotateSecret(secretName)).rejects.toThrow();
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to rotate secret'),
        expect.any(Object)
      );
    });
  });

  describe('getActiveSecret', () => {
    it('should return decrypted active secret', async () => {
      // Arrange
      const secretName = 'TEST_SECRET';
      const encryptedSecret = 'encrypted-secret';
      const decryptedSecret = 'decrypted-secret';
      mockSecretRepository.findOne.mockResolvedValue({
        value: encryptedSecret,
        active: true,
      });
      (DataProtectionService.decrypt as jest.Mock).mockResolvedValue(decryptedSecret);

      // Act
      const result = await SecretRotationService.getActiveSecret(secretName);

      // Assert
      expect(result).toBe(decryptedSecret);
      expect(DataProtectionService.decrypt).toHaveBeenCalledWith(encryptedSecret);
    });

    it('should throw error when no active secret found', async () => {
      // Arrange
      const secretName = 'TEST_SECRET';
      mockSecretRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(SecretRotationService.getActiveSecret(secretName))
        .rejects.toThrow('No active secret found');
    });
  });

  describe('checkAndRotateExpiredSecrets', () => {
    it('should rotate all expired secrets', async () => {
      // Arrange
      const expiredSecrets = [
        { name: 'SECRET1', expires_at: new Date(Date.now() - 1000) },
        { name: 'SECRET2', expires_at: new Date(Date.now() - 1000) },
      ];
      mockSecretRepository.find.mockResolvedValue(expiredSecrets);
      const rotateSpy = jest.spyOn(SecretRotationService, 'rotateSecret');

      // Act
      await SecretRotationService.checkAndRotateExpiredSecrets();

      // Assert
      expect(rotateSpy).toHaveBeenCalledTimes(2);
      expiredSecrets.forEach(secret => {
        expect(rotateSpy).toHaveBeenCalledWith(secret.name);
      });
    });

    it('should handle errors during rotation check', async () => {
      // Arrange
      mockSecretRepository.find.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(SecretRotationService.checkAndRotateExpiredSecrets())
        .rejects.toThrow();
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to check and rotate expired secrets'),
        expect.any(Object)
      );
    });
  });

  describe('setupRotationSchedule', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should set up interval for checking expired secrets', () => {
      // Arrange
      const checkSpy = jest.spyOn(SecretRotationService, 'checkAndRotateExpiredSecrets');

      // Act
      SecretRotationService.setupRotationSchedule();
      jest.advanceTimersByTime(60 * 60 * 1000); // 1 hour

      // Assert
      expect(checkSpy).toHaveBeenCalled();
    });
  });
});
