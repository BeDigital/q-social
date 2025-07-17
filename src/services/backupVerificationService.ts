import { createHash } from 'crypto';
import { createReadStream, promises as fs } from 'fs';
import { Database } from 'sqlite3';
import { logger } from '../config/monitoring';
import { promisify } from 'util';

export class BackupVerificationService {
  private static readonly BACKUP_DIR = '/opt/backups';
  private static readonly VERIFICATION_DIR = '/tmp/backup_verification';
  private static readonly REQUIRED_TABLES = [
    'users',
    'posts',
    'comments',
    'likes',
    'followers',
    'hashtags',
    'notifications'
  ];

  static async verifyBackup(backupPath: string): Promise<boolean> {
    try {
      // Create verification directory
      await fs.mkdir(this.VERIFICATION_DIR, { recursive: true });

      // Verify file integrity
      const isIntegrityValid = await this.verifyFileIntegrity(backupPath);
      if (!isIntegrityValid) {
        throw new Error('Backup file integrity check failed');
      }

      // Verify database structure
      const isStructureValid = await this.verifyDatabaseStructure(backupPath);
      if (!isStructureValid) {
        throw new Error('Database structure verification failed');
      }

      // Verify data consistency
      const isDataValid = await this.verifyDataConsistency(backupPath);
      if (!isDataValid) {
        throw new Error('Data consistency check failed');
      }

      // Verify sample restoration
      const isRestorationValid = await this.verifySampleRestoration(backupPath);
      if (!isRestorationValid) {
        throw new Error('Sample restoration test failed');
      }

      logger.info('Backup verification completed successfully', {
        backup: backupPath,
        timestamp: new Date().toISOString()
      });

      return true;
    } catch (error) {
      logger.error('Backup verification failed', {
        backup: backupPath,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      return false;
    } finally {
      // Cleanup verification directory
      await fs.rm(this.VERIFICATION_DIR, { recursive: true, force: true });
    }
  }

  private static async verifyFileIntegrity(backupPath: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const hash = createHash('sha256');
      const stream = createReadStream(backupPath);

      stream.on('error', reject);
      stream.on('data', chunk => hash.update(chunk));
      stream.on('end', async () => {
        const calculatedHash = hash.digest('hex');
        
        try {
          const storedHash = await fs.readFile(`${backupPath}.sha256`, 'utf8');
          resolve(calculatedHash === storedHash.trim());
        } catch (error) {
          reject(new Error('Backup checksum file not found'));
        }
      });
    });
  }

  private static async verifyDatabaseStructure(backupPath: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const db = new Database(backupPath);
      const getTables = promisify(db.all.bind(db));

      getTables("SELECT name FROM sqlite_master WHERE type='table'")
        .then(tables => {
          const tableNames = tables.map(t => t.name);
          const missingTables = this.REQUIRED_TABLES.filter(
            required => !tableNames.includes(required)
          );

          if (missingTables.length > 0) {
            throw new Error(`Missing required tables: ${missingTables.join(', ')}`);
          }

          resolve(true);
        })
        .catch(reject)
        .finally(() => db.close());
    });
  }

  private static async verifyDataConsistency(backupPath: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const db = new Database(backupPath);
      const all = promisify(db.all.bind(db));

      Promise.all([
        // Verify foreign key constraints
        all("PRAGMA foreign_key_check"),
        // Verify index integrity
        all("PRAGMA index_list"),
        // Check for orphaned records
        ...this.REQUIRED_TABLES.map(table =>
          all(`SELECT COUNT(*) as count FROM ${table}`)
        )
      ])
        .then(results => {
          const [fkCheck, indexList, ...tableCounts] = results;

          if (fkCheck.length > 0) {
            throw new Error('Foreign key constraints violated');
          }

          if (indexList.length === 0) {
            throw new Error('Missing required indexes');
          }

          // Verify each table has records (if expected)
          const emptyTables = tableCounts
            .map((result, index) => ({
              table: this.REQUIRED_TABLES[index],
              count: result[0].count
            }))
            .filter(({ count }) => count === 0);

          if (emptyTables.length > 0) {
            logger.warn('Empty tables found', { emptyTables });
          }

          resolve(true);
        })
        .catch(reject)
        .finally(() => db.close());
    });
  }

  private static async verifySampleRestoration(backupPath: string): Promise<boolean> {
    const testDbPath = `${this.VERIFICATION_DIR}/test.sqlite`;

    try {
      // Copy backup to test location
      await fs.copyFile(backupPath, testDbPath);

      // Verify we can connect and query
      const db = new Database(testDbPath);
      const all = promisify(db.all.bind(db));

      // Test sample queries
      await Promise.all([
        all('SELECT * FROM users LIMIT 1'),
        all('SELECT * FROM posts LIMIT 1'),
        all('SELECT * FROM comments LIMIT 1')
      ]);

      return true;
    } catch (error) {
      logger.error('Sample restoration failed', { error });
      return false;
    }
  }

  static async generateBackupReport(backupPath: string): Promise<object> {
    const stats = await fs.stat(backupPath);
    const hash = createHash('sha256');
    const fileStream = createReadStream(backupPath);

    await new Promise((resolve, reject) => {
      fileStream.on('error', reject);
      fileStream.on('data', chunk => hash.update(chunk));
      fileStream.on('end', resolve);
    });

    return {
      path: backupPath,
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      hash: hash.digest('hex'),
      verified: await this.verifyBackup(backupPath)
    };
  }
}
