import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  uploadedAt: Date;
  data: any[]; // Array of row objects
  columns: string[];
}

interface FileContextType {
  files: UploadedFile[];
  addFile: (file: UploadedFile) => void;
  removeFile: (fileId: string) => void;
  getFile: (fileId: string) => UploadedFile | undefined;
  currentFileId: string | null;
  setCurrentFileId: (fileId: string | null) => void;
}

const FileContext = createContext<FileContextType | undefined>(undefined);

export function FileProvider({ children }: { children: ReactNode }) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [currentFileId, setCurrentFileId] = useState<string | null>(null);

  const addFile = useCallback((file: UploadedFile) => {
    setFiles((prev) => [...prev, file]);
    setCurrentFileId(file.id);
  }, []);

  const removeFile = useCallback((fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    if (currentFileId === fileId) {
      setCurrentFileId(null);
    }
  }, [currentFileId]);

  const getFile = useCallback((fileId: string) => {
    return files.find((f) => f.id === fileId);
  }, [files]);

  return (
    <FileContext.Provider value={{ files, addFile, removeFile, getFile, currentFileId, setCurrentFileId }}>
      {children}
    </FileContext.Provider>
  );
}

export function useFiles() {
  const context = useContext(FileContext);
  if (!context) {
    throw new Error('useFiles must be used within FileProvider');
  }
  return context;
}