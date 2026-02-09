"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Delete, Command, CornerDownLeft, Hash, FunctionSquare, Layout } from 'lucide-react';

interface ScientificKeyboardProps {
     onInsert: (char: string) => void;
     onClose: () => void;
     onBackspace: () => void;
     visible: boolean;
}

const TABS = {
     BASIC: 'basic',
     FUNCTIONS: 'functions',
     SYMBOLS: 'symbols'
};

const KEYS = {
     [TABS.BASIC]: [
          { label: '1', value: '1' }, { label: '2', value: '2' }, { label: '3', value: '3' }, { label: '+', value: '+' },
          { label: '4', value: '4' }, { label: '5', value: '5' }, { label: '6', value: '6' }, { label: '-', value: '-' },
          { label: '7', value: '7' }, { label: '8', value: '8' }, { label: '9', value: '9' }, { label: '*', value: '*' },
          { label: '.', value: '.' }, { label: '0', value: '0' }, { label: '=', value: '=' }, { label: '/', value: '/' },
          { label: '(', value: '(' }, { label: ')', value: ')' }, { label: 'Space', value: ' ', colSpan: 2 },
     ],
     [TABS.FUNCTIONS]: [
          { label: '√', value: '√' }, { label: 'x²', value: '²' }, { label: 'x³', value: '³' }, { label: 'xⁿ', value: 'ⁿ' },
          { label: 'sin', value: 'sin(' }, { label: 'cos', value: 'cos(' }, { label: 'tg', value: 'tg(' }, { label: 'ctg', value: 'ctg(' },
          { label: 'lg', value: 'lg(' }, { label: 'ln', value: 'ln(' }, { label: 'log', value: 'log(' }, { label: 'π', value: 'π' },
          { label: '∞', value: '∞' }, { label: 'Σ', value: 'Σ' }, { label: 'Δ', value: 'Δ' }, { label: 'x', value: 'x' },
          { label: 'y', value: 'y' }, { label: 'z', value: 'z' }, { label: '|x|', value: '|' }, { label: '!', value: '!' },
     ],
     [TABS.SYMBOLS]: [
          { label: 'α', value: 'α' }, { label: 'β', value: 'β' }, { label: 'γ', value: 'γ' }, { label: 'δ', value: 'δ' },
          { label: 'θ', value: 'θ' }, { label: 'λ', value: 'λ' }, { label: 'μ', value: 'μ' }, { label: 'Ω', value: 'Ω' },
          { label: '±', value: '±' }, { label: '≠', value: '≠' }, { label: '≈', value: '≈' }, { label: '≤', value: '≤' },
          { label: '≥', value: '≥' }, { label: '→', value: '→' }, { label: '↑', value: '↑' }, { label: '↓', value: '↓' },
          { label: '∈', value: '∈' }, { label: '∀', value: '∀' }, { label: '∃', value: '∃' }, { label: '∂', value: '∂' },
     ]
};

export default function ScientificKeyboard({ onInsert, onClose, onBackspace, visible }: ScientificKeyboardProps) {
     const [activeTab, setActiveTab] = useState(TABS.BASIC);

     if (!visible) return null;

     return (
          <motion.div
               initial={{ y: 300, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               exit={{ y: 300, opacity: 0 }}
               className="fixed bottom-0 left-0 right-0 z-[100] bg-slate-900/95 backdrop-blur-2xl shadow-[0_-20px_60px_rgba(0,0,0,0.3)] border-t border-white/10 p-3 pb-6 md:p-4 md:pb-6"
          >
               <div className="max-w-xl mx-auto">
                    {/* Header & Tabs */}
                    <div className="flex flex-col gap-3 mb-4">
                         <div className="flex justify-between items-center bg-white/5 p-1 rounded-2xl">
                              <button
                                   onClick={() => setActiveTab(TABS.BASIC)}
                                   className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-black transition-all ${activeTab === TABS.BASIC ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:text-white'}`}
                              >
                                   <Hash size={14} /> Raqamlar
                              </button>
                              <button
                                   onClick={() => setActiveTab(TABS.FUNCTIONS)}
                                   className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-black transition-all ${activeTab === TABS.FUNCTIONS ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:text-white'}`}
                              >
                                   <FunctionSquare size={14} /> Funksiyalar
                              </button>
                              <button
                                   onClick={() => setActiveTab(TABS.SYMBOLS)}
                                   className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-black transition-all ${activeTab === TABS.SYMBOLS ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:text-white'}`}
                              >
                                   <Layout size={14} /> Belgilar
                              </button>
                         </div>
                    </div>

                    {/* Keys Grid */}
                    <AnimatePresence mode="wait">
                         <motion.div
                              key={activeTab}
                              initial={{ opacity: 0, x: 10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -10 }}
                              className="grid grid-cols-4 gap-2 md:gap-3"
                         >
                              {KEYS[activeTab as keyof typeof KEYS].map((key) => (
                                   <button
                                        key={key.label}
                                        onClick={() => onInsert(key.value)}
                                        className={`h-11 md:h-12 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl font-black text-white transition-all active:scale-90 text-sm md:text-base flex items-center justify-center ${key.colSpan === 2 ? 'col-span-2' : ''}`}
                                   >
                                        {key.label}
                                   </button>
                              ))}

                              {/* Special Buttons Row */}
                              <button
                                   onClick={onBackspace}
                                   className="h-11 md:h-12 bg-rose-500/20 border border-rose-500/30 rounded-2xl font-black text-rose-400 hover:bg-rose-500/30 transition-all flex items-center justify-center gap-2 text-xs uppercase"
                              >
                                   <Delete size={20} />
                              </button>

                              <button
                                   onClick={onClose}
                                   className="h-11 md:h-12 bg-primary text-white shadow-xl shadow-primary/20 rounded-2xl font-black transition-all col-span-2 flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
                              >
                                   <CornerDownLeft size={18} /> OK
                              </button>
                         </motion.div>
                    </AnimatePresence>
               </div>
          </motion.div>
     );
}
