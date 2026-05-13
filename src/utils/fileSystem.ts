/**
 * Utility for the File System Access API (Pro Mode)
 * Allows direct reading and writing to the user's local disk.
 */

const HANDLE_DB_NAME = 'PDFMaster_Handles';
const HANDLE_STORE_NAME = 'handles';

function openHandleDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(HANDLE_DB_NAME, 1);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(HANDLE_STORE_NAME)) {
        db.createObjectStore(HANDLE_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function storeHandle(projectId: string, handle: FileSystemFileHandle) {
  try {
    const db = await openHandleDB();
    const tx = db.transaction(HANDLE_STORE_NAME, 'readwrite');
    tx.objectStore(HANDLE_STORE_NAME).put(handle, projectId);
    return new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  } catch (e) {
    console.error('[FileSystem] storeHandle failed:', e);
  }
}

export async function getStoredHandle(projectId: string): Promise<FileSystemFileHandle | null> {
  try {
    const db = await openHandleDB();
    const tx = db.transaction(HANDLE_STORE_NAME, 'readonly');
    const request = tx.objectStore(HANDLE_STORE_NAME).get(projectId);
    return new Promise((resolve, reject) => {
      request.onsuccess = () => { db.close(); resolve(request.result || null); };
      request.onerror = () => { db.close(); reject(request.error); };
    });
  } catch (e) {
    console.error('[FileSystem] getStoredHandle failed:', e);
    return null;
  }
}

export const isFileSystemApiSupported = () => {
  return 'showOpenFilePicker' in window && 'showSaveFilePicker' in window;
};

export async function verifyPermission(fileHandle: FileSystemFileHandle, withWrite = false) {
  const opts: any = {};
  if (withWrite) {
    opts.mode = 'readwrite';
  }

  // Check if we already have permission, if so, return true.
  if ((await fileHandle.queryPermission(opts)) === 'granted') {
    return true;
  }

  // Request permission to the file, if the user grants it, return true.
  if ((await fileHandle.requestPermission(opts)) === 'granted') {
    return true;
  }

  // The user did not grant permission, return false.
  return false;
}

export async function saveFileDirectly(fileHandle: FileSystemFileHandle, content: Blob | ArrayBuffer) {
  try {
    // Verify permission before writing
    const hasPermission = await verifyPermission(fileHandle, true);
    if (!hasPermission) return false;

    // Create a FileSystemWritableFileStream to write to.
    const writable = await fileHandle.createWritable();
    
    // Write the contents of the file to the stream.
    await writable.write(content);
    
    // Close the file and write the contents to disk.
    await writable.close();
    return true;
  } catch (error) {
    console.error('[FileSystem] Save failed:', error);
    return false;
  }
}

export async function getFileFromHandle(fileHandle: FileSystemFileHandle) {
  try {
    const hasPermission = await verifyPermission(fileHandle, false);
    if (!hasPermission) return null;
    return await fileHandle.getFile();
  } catch (error) {
    console.error('[FileSystem] Read failed:', error);
    return null;
  }
}
