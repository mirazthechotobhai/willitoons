import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, Trash2, X, Lock, CheckCircle2, Eye, EyeOff } from 'lucide-react';

export const ASSET_DELETE_SECURITY_CODE = '686800';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  itemName?: string;
  itemType?: string;
  description?: string;
  expectedCode?: string;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Security Verification: Delete Asset',
  itemName,
  itemType = 'asset',
  description,
  expectedCode = ASSET_DELETE_SECURITY_CODE,
}) => {
  const [inputCode, setInputCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [hasError, setHasError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setInputCode('');
      setShowCode(false);
      setHasError(false);
      // Autofocus input
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isCodeCorrect = inputCode.trim() === expectedCode;

  const handleConfirm = () => {
    if (isCodeCorrect) {
      onConfirm();
      onClose();
    } else {
      setHasError(true);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-[#181d28] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-200 animate-in zoom-in-95 duration-200 select-none"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Top Header with Security Badge */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-700/60 bg-red-950/40">
          <div className="flex items-center space-x-2.5 text-red-400">
            <div className="p-1.5 bg-red-900/50 border border-red-700/60 rounded-lg shrink-0">
              <ShieldAlert className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">
                {title}
              </h3>
              <p className="text-[11px] text-red-300/80">Protected Owner Authorization Required</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/50 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {/* Target Item Info */}
          {itemName && (
            <div className="p-2.5 bg-slate-900/70 border border-slate-800 rounded-xl flex items-center justify-between">
              <div className="truncate mr-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                  Target {itemType}
                </span>
                <span className="text-xs font-bold text-white truncate block">
                  {itemName}
                </span>
              </div>
              <span className="text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 shrink-0">
                Permanent Deletion
              </span>
            </div>
          )}

          {/* Explanation without exposing code */}
          <div className="text-xs text-slate-300 leading-relaxed space-y-1.5">
            <p>
              {description || (
                <>
                  This action cannot be undone. To protect your{' '}
                  <span className="font-semibold text-white">{itemType}</span> from being deleted by unauthorized users, please enter your secret security passcode.
                </>
              )}
            </p>
          </div>

          {/* Code Input Field with Hidden / Secret Masking */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Enter Secret Passcode</span>
              </span>
              {isCodeCorrect && (
                <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Passcode Verified
                </span>
              )}
            </label>

            <div className="relative">
              <input
                ref={inputRef}
                type={showCode ? 'text' : 'password'}
                value={inputCode}
                onChange={e => {
                  setInputCode(e.target.value);
                  if (hasError) setHasError(false);
                }}
                placeholder="••••••"
                className={`w-full px-3.5 py-2.5 pr-10 text-sm font-mono tracking-widest rounded-xl bg-slate-900 border text-white placeholder-slate-500 focus:outline-none transition-all ${
                  isCodeCorrect
                    ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                    : hasError
                    ? 'border-red-500 ring-2 ring-red-500/30'
                    : 'border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                }`}
                autoComplete="off"
                spellCheck={false}
              />

              <button
                type="button"
                onClick={() => setShowCode(!showCode)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition cursor-pointer p-1"
                title={showCode ? "Hide passcode" : "Show passcode"}
              >
                {showCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {hasError && !isCodeCorrect && (
              <p className="text-[11px] text-red-400 font-medium animate-in fade-in duration-150">
                Incorrect security passcode. Authorization denied.
              </p>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end space-x-2.5 px-5 py-3.5 border-t border-slate-700/60 bg-slate-900/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isCodeCorrect}
            className={`flex items-center space-x-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all shadow-md ${
              isCodeCorrect
                ? 'bg-red-600 hover:bg-red-500 text-white cursor-pointer active:scale-95 shadow-red-600/30'
                : 'bg-red-950/40 text-red-400/40 border border-red-900/30 cursor-not-allowed'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Confirm & Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
};
