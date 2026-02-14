"use client";

import React, { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Delete, CornerDownLeft, Hash, FunctionSquare, Layout } from 'lucide-react';

interface ScientificKeyboardProps {
     onInsert: (char: string) => void;
     onClose: () => void;
     onBackspace: () => void;
     visible: boolean;
}

const TABS = {
     BASIC: 'basic',
     LATIN: 'latin',
     CYRILLIC: 'cyrillic',
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
     [TABS.LATIN]: [
          { label: 'A', value: 'A' }, { label: 'B', value: 'B' }, { label: 'C', value: 'C' }, { label: 'D', value: 'D' },
          { label: 'E', value: 'E' }, { label: 'F', value: 'F' }, { label: 'G', value: 'G' }, { label: 'H', value: 'H' },
          { label: 'I', value: 'I' }, { label: 'J', value: 'J' }, { label: 'K', value: 'K' }, { label: 'L', value: 'L' },
          { label: 'M', value: 'M' }, { label: 'N', value: 'N' }, { label: 'O', value: 'O' }, { label: 'P', value: 'P' },
          { label: 'Q', value: 'Q' }, { label: 'R', value: 'R' }, { label: 'S', value: 'S' }, { label: 'T', value: 'T' },
          { label: 'U', value: 'U' }, { label: 'V', value: 'V' }, { label: 'W', value: 'W' }, { label: 'X', value: 'X' },
          { label: 'Y', value: 'Y' }, { label: 'Z', value: 'Z' }, { label: "'", value: "'" }, { label: '.', value: '.' },
     ],
     [TABS.CYRILLIC]: [
          { label: 'А', value: 'А' }, { label: 'Б', value: 'Б' }, { label: 'В', value: 'В' }, { label: 'Г', value: 'Г' },
          { label: 'Д', value: 'Д' }, { label: 'Е', value: 'Е' }, { label: 'Ё', value: 'Ё' }, { label: 'Ж', value: 'Ж' },
          { label: 'З', value: 'З' }, { label: 'И', value: 'И' }, { label: 'Й', value: 'Й' }, { label: 'К', value: 'К' },
          { label: 'Л', value: 'Л' }, { label: 'М', value: 'М' }, { label: 'Н', value: 'Н' }, { label: 'О', value: 'О' },
          { label: 'П', value: 'П' }, { label: 'Р', value: 'Р' }, { label: 'С', value: 'С' }, { label: 'Т', value: 'Т' },
          { label: 'У', value: 'У' }, { label: 'Ф', value: 'Ф' }, { label: 'Х', value: 'Х' }, { label: 'Ц', value: 'Ц' },
          { label: 'Ч', value: 'Ч' }, { label: 'Ш', value: 'Ш' }, { label: 'Ъ', value: 'Ъ' }, { label: 'Ь', value: 'Ь' },
          { label: 'Э', value: 'Э' }, { label: 'Ю', value: 'Ю' }, { label: 'Я', value: 'Я' }, { label: 'Ў', value: 'Ў' },
          { label: 'Қ', value: 'Қ' }, { label: 'Ғ', value: 'Ғ' }, { label: 'Ҳ', value: 'Ҳ' }, { label: '!', value: '!' },
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

function ScientificKeyboard({ onInsert, onClose, onBackspace, visible }: ScientificKeyboardProps) {
     const [activeTab, setActiveTab] = useState(TABS.BASIC);

     if (!visible) return null;

     return (
          <motion.div
               initial={{ y: 300, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               exit={{ y: 300, opacity: 0 }}
               className="fixed bottom-0 left-0 right-0 z-[100] bg-slate-900/95 backdrop-blur-2xl shadow-[0_-20px_60px_rgba(0,0,0,0.5)] border-t border-white/10 p-3 pb-6 md:p-4 md:pb-8"
          >
               <div className="max-w-2xl mx-auto">
                    {/* Header & Tabs */}
                    <div className="flex flex-col gap-3 mb-4">
                         <div className="flex items-center justify-between mb-1 px-1">
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                   <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                   Simvollar va Formulalar
                              </span>
                              <button
                                   onClick={onClose}
                                   className="p-1 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white"
                              >
                                   <X size={20} />
                              </button>
                         </div>
                         <div className="flex flex-wrap justify-between items-center bg-white/5 p-1 rounded-2xl gap-1 border border-white/5">
                              {[
                                   { id: TABS.BASIC, label: '123', icon: <Hash size={12} /> },
                                   { id: TABS.LATIN, label: 'ABC', icon: null },
                                   { id: TABS.CYRILLIC, label: 'АБВ', icon: null },
                                   { id: TABS.FUNCTIONS, label: 'f(x)', icon: <FunctionSquare size={12} /> },
                                   { id: TABS.SYMBOLS, label: 'Ω', icon: <Layout size={12} /> }
                              ].map((tab) => (
                                   <button
                                        key={tab.id}
                                        onMouseDown={(e) => e.preventDefault()}
                                        onTouchStart={(e) => e.preventDefault()}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex-1 min-w-[60px] flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black transition-all ${activeTab === tab.id ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-[1.02]' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                                   >
                                        {tab.icon} {tab.label}
                                   </button>
                              ))}
                         </div>
                    </div>

                    {/* Keys Grid */}
                    <AnimatePresence mode="wait">
                         <motion.div
                              key={activeTab}
                              initial={{ opacity: 0, scale: 0.98 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.98 }}
                              transition={{ duration: 0.15 }}
                              className="grid grid-cols-4 md:grid-cols-6 gap-2 md:gap-3"
                         >
                              {KEYS[activeTab as keyof typeof KEYS].map((key) => (
                                   <button
                                        key={key.label}
                                        onMouseDown={(e) => e.preventDefault()}
                                        onTouchStart={(e) => e.preventDefault()}
                                        onClick={() => onInsert(key.value)}
                                        className={`h-11 md:h-14 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl font-black text-white transition-all active:scale-90 text-sm md:text-lg flex items-center justify-center shadow-sm hover:shadow-md ${key.colSpan === 2 ? 'col-span-2' : ''}`}
                                   >
                                        {key.label}
                                   </button>
                              ))}

                              {/* Special Buttons Row - visible in all tabs or specificly handled */}
                              <button
                                   onMouseDown={(e) => e.preventDefault()}
                                   onTouchStart={(e) => e.preventDefault()}
                                   onClick={onBackspace}
                                   className="h-11 md:h-14 bg-rose-500/10 border border-rose-500/20 rounded-2xl font-black text-rose-400 hover:bg-rose-500/20 transition-all flex items-center justify-center gap-2 active:scale-95"
                                   title="Backspace"
                              >
                                   <Delete size={22} />
                              </button>

                              <button
                                   onMouseDown={(e) => e.preventDefault()}
                                   onTouchStart={(e) => e.preventDefault()}
                                   onClick={onClose}
                                   className="h-11 md:h-14 bg-primary text-white shadow-xl shadow-primary/20 rounded-2xl font-black transition-all col-span-2 flex items-center justify-center gap-2 uppercase tracking-widest text-xs active:scale-95 hover:bg-primary-dark"
                              >
                                   <CornerDownLeft size={18} /> OK
                              </button>
                         </motion.div>
                    </AnimatePresence>
               </div>
          </motion.div>
     );
}

export default memo(ScientificKeyboard);
