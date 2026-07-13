import React, { useState, useCallback } from 'react';
import imageCompression from 'browser-image-compression';
import { UploadCloud, FileImage, Download, ChevronRight, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
  const [file, setFile] = useState(null);
  const [compressedFile, setCompressedFile] = useState(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileSelect = async (selectedFile) => {
    if (!selectedFile) return;
    
    // Check if it's an image
    if (!selectedFile.type.startsWith('image/')) {
      alert("Please upload an image file (JPEG, PNG, WebP). Video support coming soon!");
      return;
    }

    setFile(selectedFile);
    setCompressedFile(null);
    await compressImage(selectedFile);
  };

  const compressImage = async (imageFile) => {
    setIsCompressing(true);
    
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      onProgress: (p) => console.log(p)
    };

    try {
      const compressed = await imageCompression(imageFile, options);
      setCompressedFile(compressed);
    } catch (error) {
      console.error(error);
      alert("Compression failed. Please try another image.");
    } finally {
      setIsCompressing(false);
    }
  };

  const handleDownload = () => {
    if (!compressedFile) return;
    const url = URL.createObjectURL(compressedFile);
    const link = document.createElement('a');
    link.href = url;
    link.download = `compressed_${file.name}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container">
      <header className="header">
        <h1>Media Compressor Pro</h1>
        <p>Compress images instantly in your browser. Zero quality loss, absolute privacy.</p>
      </header>

      <AnimatePresence mode="wait">
        {!file ? (
          <motion.div 
            key="upload"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`dropzone ${isDragging ? 'active' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-input').click()}
          >
            <div className="dropzone-content">
              <div className="icon-container">
                <UploadCloud size={40} />
              </div>
              <h2>Drag & Drop your media here</h2>
              <p>Supports JPEG, PNG, WebP (Video support in beta)</p>
              
              <input 
                id="file-input" 
                type="file" 
                accept="image/*" 
                onChange={(e) => handleFileSelect(e.target.files[0])} 
                style={{display: 'none'}} 
              />
              <button className="btn-upload">Browse Files</button>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="result"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="preview-card"
          >
            <div style={{display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem'}}>
              <FileImage size={32} color="var(--primary)" />
              <div>
                <h3 style={{fontSize: '1.2rem', marginBottom: '0.2rem'}}>{file.name}</h3>
                <p style={{margin: 0, fontSize: '0.9rem'}}>Original Size: {formatBytes(file.size)}</p>
              </div>
            </div>

            {isCompressing ? (
              <div style={{textAlign: 'center', padding: '3rem 0'}}>
                <RefreshCw size={40} color="var(--primary)" className="spin" style={{animation: 'spin 1s linear infinite', marginBottom: '1rem'}} />
                <h2>Compressing Magic...</h2>
              </div>
            ) : compressedFile && (
              <motion.div initial={{opacity: 0, y: 20}} animate={{opacity: 1, y: 0}}>
                <div className="stats-grid">
                  <div className="stat-box">
                    <div className="stat-label">Original</div>
                    <div className="stat-value">{formatBytes(file.size)}</div>
                  </div>
                  <div className="stat-box" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none'}}>
                    <ChevronRight size={48} color="var(--text-muted)" />
                  </div>
                  <div className="stat-box">
                    <div className="stat-label">Compressed</div>
                    <div className="stat-value success">{formatBytes(compressedFile.size)}</div>
                  </div>
                </div>

                <div style={{textAlign: 'center', marginTop: '1.5rem', fontSize: '1.2rem'}}>
                  Saved <strong style={{color: 'var(--success)'}}>{Math.round((1 - compressedFile.size / file.size) * 100)}%</strong> of space!
                </div>

                <button className="download-btn" onClick={handleDownload}>
                  <Download size={24} style={{marginRight: '0.5rem', display: 'inline-block', verticalAlign: 'middle'}}/>
                  Download Compressed File
                </button>

                <div style={{textAlign: 'center', marginTop: '1rem'}}>
                  <button 
                    onClick={() => { setFile(null); setCompressedFile(null); }}
                    style={{background: 'transparent', color: 'var(--text-muted)', fontSize: '1rem', padding: '0.5rem'}}
                  >
                    Compress Another File
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
}

export default App;
