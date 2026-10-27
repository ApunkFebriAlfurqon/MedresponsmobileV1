import { Directory, File, Paths } from 'expo-file-system';
import { openDatabaseAsync } from 'expo-sqlite';
import { Platform } from 'react-native';

let databasePromise;

async function getDatabase() {
  if (!databasePromise) {
    databasePromise = (async () => {
      const database = await openDatabaseAsync('medrespons-camera-test.db');
      await database.execAsync(`
        CREATE TABLE IF NOT EXISTS captured_photos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          image_uri TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
      `);
      return database;
    })().catch((error) => {
      databasePromise = null;
      throw error;
    });
  }
  return databasePromise;
}

export async function listCapturedPhotos(userId) {
  const database = await getDatabase();
  return database.getAllAsync(
    'SELECT id, image_uri AS uri, created_at AS createdAt FROM captured_photos WHERE user_id = ? ORDER BY id DESC',
    userId,
  );
}

export async function saveCapturedPhoto(userId, sourceUri) {
  const database = await getDatabase();
  let savedUri = sourceUri;

  if (Platform.OS !== 'web') {
    const photoDirectory = new Directory(Paths.document, 'camera-test-photos');
    photoDirectory.create({ idempotent: true, intermediates: true });
    const destination = new File(photoDirectory, `photo-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`);
    await new File(sourceUri).copy(destination);
    savedUri = destination.uri;
  }

  try {
    await database.runAsync(
      'INSERT INTO captured_photos (user_id, image_uri, created_at) VALUES (?, ?, ?)',
      userId,
      savedUri,
      new Date().toISOString(),
    );
  } catch (error) {
    if (Platform.OS !== 'web') {
      const savedFile = new File(savedUri);
      if (savedFile.exists) savedFile.delete();
    }
    throw error;
  }
}

export async function deleteCapturedPhoto(photoId, userId) {
  const database = await getDatabase();
  const photo = await database.getFirstAsync(
    'SELECT image_uri AS uri FROM captured_photos WHERE id = ? AND user_id = ?',
    photoId,
    userId,
  );
  if (!photo) return;

  await database.runAsync('DELETE FROM captured_photos WHERE id = ? AND user_id = ?', photoId, userId);
  if (Platform.OS !== 'web') {
    const file = new File(photo.uri);
    if (file.exists) file.delete();
  }
}
