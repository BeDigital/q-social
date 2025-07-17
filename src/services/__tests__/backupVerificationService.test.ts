import { BackupVerificationService } from '../backupVerificationService';
import { promises as fs } from 'fs';
import { Database } from 'sqlite3';
import { logger } from '../../config/monitoring';

jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    readFile: jest.fn(),
    copyFile: jest.fn(),
    stat: jest.fn(),
    rm: jest.fn(),
  },
}));
jest.mock('sqlite3');
jest.mock('../../config/monitoring');

describe('BackupVerificationService', () => {
  const mockBackupPath = '/opt/backups/test.sqlite';
  const mockVerificationDir = '/tmp/backup_verification';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('verifyBackup', () => {
    it('should verify backup successfully', async () => {
      // Arrange
      const mockIntegrityCheck = jest.spyOn(BackupVerificationService as any, 'verifyFileIntegrity')
        .mockResolvedValue(true);
      const mockStructureCheck = jest.spyOn(BackupVerificationService as any, 'verifyDatabaseStructure')
        .mockResolvedValue(true);
      const mockDataCheck = jest.spyOn(BackupVerificationService as any, 'verifyDataConsistency')
        .mockResolvedValue(true);
      const mockRestorationCheck = jest.spyOn(BackupVerificationService as any, 'verifySampleRestoration')
        .mockResolvedValue(true);

      // Act
      const result = await BackupVerificationService.verifyBackup(mockBackupPath);

      // Assert
      expect(result).toBe(true);
      expect(mockIntegrityCheck).toHaveBeenCalled();
      expect(mockStructureCheck).toHaveBeenCalled();
      expect(mockDataCheck).toHaveBeenCalled();
      expect(mockRestorationCheck).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        'Backup verification completed successfully',
        expect.any(Object)
      );
    });

    it('should handle verification failure', async () => {
      // Arrange
      jest.spyOn(BackupVerificationService as any, 'verifyFileIntegrity')
        .mockResolvedValue(false);

      // Act
      const result = await BackupVerificationService.verifyBackup(mockBackupPath);

      // Assert
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        'Backup verification failed',
        expect.any(Object)
      );
    });

    it('should clean up verification directory', async () => {
      // Act
      await BackupVerificationService.verifyBackup(mockBackupPath);

      // Assert
      expect(fs.rm).toHaveBeenCalledWith(
        mockVerificationDir,
        { recursive: true, force: true }
      );
    });
  });

  describe('verifyFileIntegrity', () => {
    it('should verify file checksum successfully', async () => {
      // Arrange
      const mockChecksum = 'test-checksum';
      (fs.readFile as jest.Mock).mockResolvedValue(mockChecksum);

      // Act
      const result = await (BackupVerificationService as any).verifyFileIntegrity(mockBackupPath);

      // Assert
      expect(result).toBe(true);
    });

    it('should handle missing checksum file', async () => {
      // Arrange
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));

      // Act & Assert
      await expect((BackupVerificationService as any).verifyFileIntegrity(mockBackupPath))
        .rejects.toThrow('Backup checksum file not found');
    });
  });

  describe('verifyDatabaseStructure', () => {
    it('should verify database structure successfully', async () => {
      // Arrange
      const mockDb = {
        all: jest.fn((query, callback) => callback(null, [
          { name: 'users' },
          { name: 'posts' },
          { name: 'comments' },
        ])),
        close: jest.fn(),
      };
      (Database as jest.Mock).mockImplementation(() => mockDb);

      // Act
      const result = await (BackupVerificationService as any).verifyDatabaseStructure(mockBackupPath);

      // Assert
      expect(result).toBe(true);
      expect(mockDb.all).toHaveBeenCalledWith(
        expect.stringContaining('sqlite_master'),
        expect.any(Function)
      );
    });

    it('should detect missing required tables', async () => {
      // Arrange
      const mockDb = {
        all: jest.fn((query, callback) => callback(null, [{ name: 'users' }])),
        close: jest.fn(),
      };
      (Database as jest.Mock).mockImplementation(() => mockDb);

      // Act & Assert
      await expect((BackupVerificationService as any).verifyDatabaseStructure(mockBackupPath))
        .rejects.toThrow('Missing required tables');
    });
  });

  describe('verifyDataConsistency', () => {
    it('should verify data consistency successfully', async () => {
      // Arrange
      const mockDb = {
        all: jest.fn()
          .mockImplementationOnce((query, callback) => callback(null, [])) // Foreign key check
          .mockImplementationOnce((query, callback) => callback(null, [{ name: 'idx_1' }])) // Index check
          .mockImplementationOnce((query, callback) => callback(null, [{ count: 1 }])), // Table count
        close: jest.fn(),
      };
      (Database as jest.Mock).mockImplementation(() => mockDb);

      // Act
      const result = await (BackupVerificationService as any).verifyDataConsistency(mockBackupPath);

      // Assert
      expect(result).toBe(true);
    });

    it('should detect foreign key violations', async () => {
      // Arrange
      const mockDb = {
        all: jest.fn()
          .mockImplementationOnce((query, callback) => callback(null, [{ violation: true }])),
        close: jest.fn(),
      };
      (Database as jest.Mock).mockImplementation(() => mockDb);

      // Act & Assert
      await expect((BackupVerificationService as any).verifyDataConsistency(mockBackupPath))
        .rejects.toThrow('Foreign key constraints violated');
    });
  });

  describe('verifySampleRestoration', () => {
    it('should verify sample restoration successfully', async () => {
      // Arrange
      const mockDb = {
        all: jest.fn((query, callback) => callback(null, [{ id: 1 }])),
        close: jest.fn(),
      };
      (Database as jest.Mock).mockImplementation(() => mockDb);

      // Act
      const result = await (BackupVerificationService as any).verifySampleRestoration(mockBackupPath);

      // Assert
      expect(result).toBe(true);
      expect(fs.copyFile).toHaveBeenCalledWith(
        mockBackupPath,
        expect.stringContaining('test.sqlite')
      );
    });

    it('should handle restoration failure', async () => {
      // Arrange
      (fs.copyFile as jest.Mock).mockRejectedValue(new Error('Copy failed'));

      // Act
      const result = await (BackupVerificationService as any).verifySampleRestoration(mockBackupPath);

      // Assert
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        'Sample restoration failed',
        expect.any(Object)
      );
    });
  });

  describe('generateBackupReport', () => {
    it('should generate comprehensive backup report', async () => {
      // Arrange
      const mockStats = {
        size: 1024,
        birthtime: new Date(),
        mtime: new Date(),
      };
      (fs.stat as jest.Mock).mockResolvedValue(mockStats);
      jest.spyOn(BackupVerificationService, 'verifyBackup').mockResolvedValue(true);

      // Act
      const report = await BackupVerificationService.generateBackupReport(mockBackupPath);

      // Assert
      expect(report).toEqual({
        path: mockBackupPath,
        size: mockStats.size,
        created: mockStats.birthtime,
        modified: mockStats.mtime,
        hash: expect.any(String),
        verified: true,
      });
    });

    it('should include verification failure in report', async () => {
      // Arrange
      jest.spyOn(BackupVerificationService, 'verifyBackup').mockResolvedValue(false);

      // Act
      const report = await BackupVerificationService.generateBackupReport(mockBackupPath);

      // Assert
      expect(report.verified).toBe(false);
    });
  });
});
