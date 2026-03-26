import React, { useState, useRef } from 'react';
import { FileText, X, AlertCircle, Loader2, Upload } from 'lucide-react';

interface PdfUploadProps {
  onUpload: (url: string) => void;
  label?: string;
  folder?: string;
  customName?: string;
}

export default function PdfUpload({ onUpload, label, folder = 'profiles', customName }: PdfUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (file.type !== 'application/pdf') {
      setError('PDFファイルを選択してください。');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('ファイルサイズは10MB以下にしてください。');
      return;
    }

    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);
      if (customName) {
        formData.append('customName', customName);
      }

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Upload failed');
      }

      const data = await response.json();
      onUpload(data.url);
      setProgress(100);
      
    } catch (err: any) {
      console.error('PDF Upload Error:', err);
      setError(`アップロードに失敗しました: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-2">
      {label && <label className="text-[10px] tracking-widest text-brand-gray uppercase block">{label}</label>}
      
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-none p-8 transition-all cursor-pointer
          flex flex-col items-center justify-center text-center min-h-[150px]
          ${isDragging ? 'border-brand-black bg-brand-black/5' : 'border-brand-black/10 hover:border-brand-black/30'}
          ${uploading ? 'cursor-wait opacity-70' : ''}
        `}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={onFileSelect}
          className="hidden"
          accept="application/pdf"
        />

        {uploading ? (
          <div className="space-y-4 flex flex-col items-center">
            <Loader2 size={32} className="animate-spin text-brand-black" />
            <div className="flex flex-col items-center space-y-1">
              <p className="text-[10px] tracking-widest uppercase animate-pulse">Uploading...</p>
              <p className="text-[10px] text-brand-gray font-mono">{progress}%</p>
            </div>
          </div>
        ) : (
          <>
            <FileText size={24} className="mb-4 text-brand-gray" />
            <p className="text-xs tracking-widest uppercase mb-2">Upload PDF Profile</p>
            <p className="text-[10px] text-brand-gray tracking-widest uppercase">Max 10MB</p>
          </>
        )}

        {error && (
          <div className="mt-4 p-2 bg-red-50 flex items-center text-red-500 text-[10px] tracking-widest uppercase">
            <AlertCircle size={12} className="mr-2 flex-shrink-0" /> {error}
          </div>
        )}
      </div>
    </div>
  );
}
