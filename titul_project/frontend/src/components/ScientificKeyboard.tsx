"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Delete, Command, CornerDownLeft } from 'lucide-react';

interface ScientificKeyboardProps {
     onInsert: (char: string) => void;
     onClose: () => void;
     onBackspace: () => void;
     visible: boolean;
}

const KEYS = [
     { label: '√', value: '√' },
     { label: '²', value: '²' },
     { label: '³', value: '³' },
     { label: 'ⁿ', value: 'ⁿ' },
     { label: 'π', value: 'π' },
     { label: '∞', value: '∞' },
     { label: 'Σ', value: 'Σ' },
     { label: 'Δ', value: 'Δ' },
     { label: 'Ω', value: 'Ω' },
     { label: 'μ', value: 'μ' },
     { label: 'α', value: 'α' },
     { label: 'β', value: 'β' },
     { label: 'γ', value: 'γ' },
     { label: 'θ', value: 'θ' },
     { label: 'λ', value: 'λ' },
     { label: 'sin', value: 'sin(' },
     { label: 'cos', value: 'cos(' },
     { label: 'tg', value: 'tg(' },
     { label: 'ctg', value: 'ctg(' },
     { label: 'lg', value: 'lg(' },
     { label: 'ln', value: 'ln(' },
     { label: 'log', value: 'log(' },
     { label: '±', value: '±' },
     { label: '≠', value: '≠' },
     { label: '≈', value: '≈' },
     { label: '≤', value: '≤' },
     { label: '≥', value: '≥' },
     { label: '→', value: '→' },
     { label: '↑', value: '↑' },
     { label: '↓', value: '↓' },
];

export default function ScientificKeyboard({ onInsert, onClose, onBackspace, visible }: ScientificKeyboardProps) {
     if (!visible) return null;

     return (
          <motion.div
               initial={{ y: 100, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               exit={{ y: 100, opacity: 0 }}
               className="fixed bottom-0 left-0 right-0 z-[100] bg-white/80 backdrop-blur-xl shadow-[0_-20px_50px_rgba(0,0,0,0.1)] border-t border-white/20 p-4 md:p-6"
          >
               <div className="max-w-4xl mx-auto">
                    <div className="flex justify-between items-center mb-6">
                         <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-primary shadow-lg shadow-primary/20 rounded-2xl flex items-center justify-center text-white">
                                   <Command size={20} />
                              </div>
                              <div>
                                   <span className="block font-black text-slate-900 uppercase tracking-[0.2em] text-[10px]">Premium Keyboard</span>
                                   <span className="text-xs text-slate-400 font-bold">Ilmiy Formula Paneli</span>
                              </div>
                         </div>
                         <button
                              onClick={onClose}
                              className="w-10 h-10 bg-slate-50 hover:bg-slate-100 rounded-xl flex items-center justify-center transition-all group"
                         >
                              <X size={20} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
                         </button>
                    </div>

                    <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
                         {KEYS.map((key) => (
                              <button
                                   key={key.label}
                                   onClick={() => onInsert(key.value)}
                                   className="h-10 md:h-12 bg-white border border-slate-100 rounded-2xl font-black text-slate-700 hover:bg-primary/5 hover:border-primary/20 hover:text-primary transition-all active:scale-90 text-sm md:text-base shadow-sm"
                              >
                                   {key.label}
                              </button>
                         ))}

                         <button
                              onClick={onBackspace}
                              className="h-10 md:h-12 bg-red-50 border border-red-100 rounded-2xl font-black text-red-500 hover:bg-red-100 transition-all col-span-2 flex items-center justify-center gap-2 text-[10px] md:text-xs uppercase"
                         >
                              <Delete size={18} /> O'chirish
                         </button>

                         <button
                              onClick={onClose}
                              className="h-10 md:h-12 bg-slate-900 shadow-xl shadow-slate-200 rounded-2xl font-black text-white hover:bg-black transition-all col-span-2 flex items-center justify-center gap-2 uppercase tracking-widest text-[9px] md:text-[10px]"
                         >
                              <CornerDownLeft size={16} /> Tasdiqlash
                         </button>
                    </div>
               </div>
          </motion.div>
     );
}
