import React, { useState, useCallback } from 'react';
import imageCompression from 'browser-image-compression';
import { UploadCloud, FileImage, Download, ChevronRight, RefreshCw, Film } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import confetti from 'canvas-confetti';

const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

function App() {
  const [file, setFile] = useState(null);
  const [compressedFile, setCompressedFile] = useState(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#8b5cf6', '#ec4899', '#10b981']
    });
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
    
    // Security check: Only allow images and videos
    if (!selectedFile.type.startsWith('image/') && !selectedFile.type.startsWith('video/')) {
      alert("Security Block: Please upload a valid image or video file.");
      return;
    }

    // Security check: 50MB file size limit for videos (client-side block to save bandwidth)
    if (selectedFile.type.startsWith('video/') && selectedFile.size > MAX_VIDEO_SIZE) {
      alert("File too large! Maximum video size is 50MB.");
      return;
    }

    setFile(selectedFile);
    setCompressedFile(null);
    setUploadProgress(0);
    
    if (selectedFile.type.startsWith('image/')) {
      await compressImage(selectedFile);
    } else {
      await compressVideo(selectedFile);
    }
  };

  const compressVideo = async (videoFile) => {
    setIsCompressing(true);
    setUploadProgress(0);
    const formData = new FormData();
    formData.append('file', videoFile);

    try {
      const response = await axios.post('/api/compress-video', formData, {
        responseType: 'blob',
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });

      const blob = response.data;
      blob.name = `compressed_${videoFile.name}`;
      setCompressedFile(blob);
      triggerConfetti();
    } catch (error) {
      console.error(error);
      const errorMsg = error.response?.data?.detail || error.message || 'Video compression failed.';
      alert(`Error: ${errorMsg}`);
      setFile(null);
    } finally {
      setIsCompressing(false);
    }
  };

  const compressImage = async (imageFile) => {
    setIsCompressing(true);
    
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      onProgress: (p) => setUploadProgress(p) // Reusing progress state for image worker
    };

    try {
      const compressed = await imageCompression(imageFile, options);
      setCompressedFile(compressed);
      triggerConfetti();
    } catch (error) {
      console.error(error);
      alert("Compression failed. Please try another image.");
      setFile(null);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleDownload = () => {
    if (!compressedFile) return;
    const url = URL.createObjectURL(compressedFile);
    const link = document.createElement('a');
    link.href = url;
    link.download = compressedFile.name || `compressed_${file.name}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container">
      <header className="header">
        <h1>Media Compressor Pro</h1>
        <p>Compress images & videos instantly. Bank-grade security with auto-cleanup.</p>
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
              <p>Supports Images (JPEG, PNG, WebP) & Videos (Max 50MB)</p>
              
              <input 
                id="file-input" 
                type="file" 
                accept="image/*,video/*" 
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
              {file.type.startsWith('video/') ? (
                 <Film size={32} color="var(--primary)" />
              ) : (
                 <FileImage size={32} color="var(--primary)" />
              )}
              <div>
                <h3 style={{fontSize: '1.2rem', marginBottom: '0.2rem'}}>{file.name}</h3>
                <p style={{margin: 0, fontSize: '0.9rem'}}>Original Size: {formatBytes(file.size)}</p>
              </div>
            </div>

            {isCompressing ? (
              <div style={{textAlign: 'center', padding: '3rem 0'}}>
                <RefreshCw size={40} color="var(--primary)" className="spin" style={{animation: 'spin 1s linear infinite', marginBottom: '1rem'}} />
                <h2>{file.type.startsWith('video/') ? (uploadProgress < 100 ? `Uploading Video... ${uploadProgress}%` : 'Compressing on Server... Please wait') : `Compressing Image... ${uploadProgress}%`}</h2>
                
                {/* Progress Bar Container */}
                <div style={{width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', marginTop: '1.5rem', overflow: 'hidden'}}>
                   <div style={{width: `${uploadProgress}%`, height: '100%', background: 'linear-gradient(90deg, var(--primary), var(--secondary))', transition: 'width 0.3s ease'}} />
                </div>
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
                  Saved <strong style={{color: 'var(--success)'}}>{Math.max(0, Math.round((1 - compressedFile.size / file.size) * 100))}%</strong> of space!
                </div>

                <button className="download-btn" onClick={handleDownload}>
                  <Download size={24} style={{marginRight: '0.5rem', display: 'inline-block', verticalAlign: 'middle'}}/>
                  Download Compressed File
                </button>

                <div style={{textAlign: 'center', marginTop: '1rem'}}>
                  <button 
                    onClick={() => { setFile(null); setCompressedFile(null); }}
                    style={{background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer', fontSize: '1rem', padding: '0.5rem'}}
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
