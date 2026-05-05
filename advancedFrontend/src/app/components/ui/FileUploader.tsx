import React, { useRef, useState } from 'react';
import { Upload, File, X } from 'lucide-react';
import { motion } from 'motion/react';

interface FileUploaderProps {
  onFileSelect: (file: File | null) => void;
  acceptedFormats?: string;
}

export function FileUploader({ onFileSelect, acceptedFormats = '.csv' }: FileUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (selectedFile: File) => {
    setFile(selectedFile);
    onFileSelect(selectedFile);
  };

  const removeFile = () => {
    setFile(null);
    onFileSelect(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="file"
        accept={acceptedFormats}
        onChange={handleChange}
        className="hidden"
        id="file-upload"
      />
      
      {!file ? (
        <motion.label
          htmlFor="file-upload"
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
            dragActive
              ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-purple-400 dark:hover:border-purple-500 bg-gray-50 dark:bg-gray-800/50'
          }`}
          whileHover={{ scale: 1.01 }}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <Upload className={`w-12 h-12 mb-4 ${
              dragActive ? 'text-purple-500' : 'text-gray-400'
            }`} />
            <p className="mb-2 text-sm text-gray-700 dark:text-gray-300">
              <span className="font-semibold">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              CSV files only
            </p>
          </div>
        </motion.label>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-4 border-2 border-green-500 dark:border-green-600 bg-green-50 dark:bg-green-950/20 rounded-xl"
        >
          <div className="flex items-center gap-3">
            <File className="w-8 h-8 text-green-600 dark:text-green-500" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{file.name}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {(file.size / 1024).toFixed(2)} KB
              </p>
            </div>
          </div>
          <button
            onClick={removeFile}
            className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/30 transition-colors"
          >
            <X className="w-5 h-5 text-red-600 dark:text-red-500" />
          </button>
        </motion.div>
      )}
    </div>
  );
}
