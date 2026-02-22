import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { Platform } from 'react-native';

const DB_NAME = 'villageapp.db';

class BackupService {
    async exportBackup(): Promise<boolean> {
        try {
            // Source DB path depends on platform
            let sourcePath = '';
            if (Platform.OS === 'android') {
                sourcePath = `${RNFS.DocumentDirectoryPath}/../databases/${DB_NAME}`;
            } else {
                sourcePath = `${RNFS.LibraryDirectoryPath}/LocalDatabase/${DB_NAME}`;
            }

            // Check if DB exists
            const exists = await RNFS.exists(sourcePath);
            if (!exists) {
                console.error('BackupService: Database file not found.');
                return false;
            }

            // Create a temp file to share
            const tempFileName = `chat_backup_${Date.now()}.db`;
            const destPath = `${RNFS.CachesDirectoryPath}/${tempFileName}`;

            // Copy DB to temp path
            await RNFS.copyFile(sourcePath, destPath);

            // Share the file so user can save it to Drive/Files
            const shareOptions = {
                title: 'Export Chat Backup',
                url: `file://${destPath}`,
                type: 'application/x-sqlite3',
                failOnCancel: false,
            };

            await Share.open(shareOptions);

            // Clean up temp file
            await RNFS.unlink(destPath);
            return true;
        } catch (error) {
            console.error('BackupService Export Error:', error);
            return false;
        }
    }

    async importBackup(filePath: string): Promise<boolean> {
        try {
            // Destination DB path
            let destPath = '';
            if (Platform.OS === 'android') {
                destPath = `${RNFS.DocumentDirectoryPath}/../databases/${DB_NAME}`;
            } else {
                destPath = `${RNFS.LibraryDirectoryPath}/LocalDatabase/${DB_NAME}`;
            }

            // In a real scenario, we should validate the DB schema before overwriting,
            // but for simplicity, we directly copy the file.

            // Delete existing DB if it exists
            const exists = await RNFS.exists(destPath);
            if (exists) {
                await RNFS.unlink(destPath);
            }

            // Copy chosen file to DB location
            // filePath might come as content:// URI on Android.
            // RNFS.copyFile generally handles file:// and sometimes content:// 
            // depending on the Picker used.
            const cleanPath = filePath.replace('file://', '');
            await RNFS.copyFile(cleanPath, destPath);

            return true;
        } catch (error) {
            console.error('BackupService Import Error:', error);
            return false;
        }
    }
}

export default new BackupService();
