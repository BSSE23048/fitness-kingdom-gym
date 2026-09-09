import React, { useState } from 'react';
import { Upload, X, CheckCircle2, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { compressImageToWebP } from '../../utils/imageCompressor';

const ImageUploader = ({ onImageSelected, currentPhotoUrl }) => {
  const [previewUrl, setPreviewUrl] = useState(currentPhotoUrl || null);
  const [compressing, setCompressing] = useState(false);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setCompressing(true);

    try {
      // Execute client-side WebP compression (<80KB)
      const result = await compressImageToWebP(file, 80, 600);
      
      setPreviewUrl(result.dataUrl);
      setStats({
        originalKB: result.originalSizeKB,
        compressedKB: result.compressedSizeKB,
        quality: Math.round(result.qualityUsed * 100),
      });

      // Pass compressed File to parent component
      onImageSelected(result.compressedFile);
    } catch (err) {
      console.error(err);
      setError('Failed to compress image. Please select a valid photo.');
    } finally {
      setCompressing(false);
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    setStats(null);
    onImageSelected(null);
  };

  return (
    <div className="space-y-3">
      <label className="block text-xs font-semibold text-slate-700">Member Photo (Auto-WebP &lt; 80KB)</label>

      {previewUrl ? (
        <div className="flex items-center gap-4 p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
          <div className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-indigo-500/30 shadow-md shrink-0">
            <img src={previewUrl} alt="Member preview" className="w-full h-full object-cover" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Compressed WebP Ready</span>
            </div>

            {stats && (
              <div className="mt-1 text-[11px] text-slate-500 flex flex-wrap items-center gap-x-2">
                <span>Original: <strong className="text-slate-700">{stats.originalKB} KB</strong></span>
                <span>➔</span>
                <span className="text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  {stats.compressedKB} KB WebP ({stats.quality}% Q)
                </span>
              </div>
            )}

            <p className="text-[10px] text-slate-400 mt-0.5">Optimized for zero-cost Firebase Storage</p>
          </div>

          <button
            type="button"
            onClick={handleRemove}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
            title="Remove photo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="relative border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/30 rounded-2xl p-4 text-center transition-all group cursor-pointer">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={compressing}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />

          <div className="flex flex-col items-center justify-center gap-2">
            <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
              {compressing ? (
                <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <ImageIcon className="w-5 h-5" />
              )}
            </div>

            <div>
              <p className="text-xs font-bold text-slate-700">
                {compressing ? 'Compressing to WebP...' : 'Click or drop member photo'}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Auto-resizes & compresses to &lt; 80KB WebP format in browser
              </p>
            </div>

            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
              <CheckCircle2 className="w-3 h-3 text-indigo-500" /> Storage Optimized
            </span>
          </div>
        </div>
      )}

      {error && (
        <div className="text-[11px] text-rose-600 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
