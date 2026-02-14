"use client";

import React, { memo } from 'react';
import { Trash2, Plus } from 'lucide-react';

interface ChoiceQuestionRowProps {
     idx: number;
     q: any;
     handleChoice: (idx: number, choice: string) => void;
}

export const ChoiceQuestionRow = memo(({ idx, q, handleChoice }: ChoiceQuestionRowProps) => {
     return (
          <div
               className={`question-row !p-4 md:!p-5 flex-col sm:flex-row !items-start sm:!items-center gap-4 ${q.correct_answer ? 'active' : ''}`}
          >
               <div className="flex items-center justify-between w-full sm:w-auto">
                    <span className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center font-black text-slate-400 text-sm border border-slate-100">
                         {q.question_number}
                    </span>
                    {q.correct_answer && (
                         <div className="sm:hidden bg-primary/10 text-primary px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest">
                              Kalit: {q.correct_answer}
                         </div>
                    )}
               </div>
               <div className="grid grid-cols-6 sm:flex sm:flex-wrap gap-2 md:gap-3 w-full justify-center sm:justify-start">
                    {(q.question_number >= 33 && q.question_number <= 35)
                         ? ["A", "B", "C", "D", "E", "F"].map((choice) => (
                              <div
                                   key={choice}
                                   onClick={() => handleChoice(idx, choice)}
                                   className={`circle-check !w-8 !h-8 !text-xs sm:!w-10 sm:!h-10 sm:!text-sm ${q.correct_answer === choice ? '!bg-primary !text-white !border-primary active' : ''}`}
                              >
                                   {choice}
                              </div>
                         ))
                         : ["A", "B", "C", "D"].map((choice) => (
                              <div
                                   key={choice}
                                   onClick={() => handleChoice(idx, choice)}
                                   className={`circle-check !w-10 !h-10 !text-sm sm:!w-12 sm:!h-12 sm:!text-base ${q.correct_answer === choice ? '!bg-primary !text-white !border-primary active' : ''}`}
                              >
                                   {choice}
                              </div>
                         ))
                    }
               </div>
          </div>
     );
});

interface ManualQuestionRowProps {
     idx: number;
     q: any;
     subject: string;
     inputRefs: React.MutableRefObject<any>;
     setKeyboardVisible: (visible: boolean) => void;
     setFocusedPoints: (focused: any) => void;
     updatePoints: (idx: number, value: string) => void;
}

export const ManualQuestionRow = memo(({
     idx, q, subject, inputRefs,
     setKeyboardVisible, setFocusedPoints,
     updatePoints
}: ManualQuestionRowProps) => {
     return (
          <div className="bg-white p-6 rounded-3xl border-2 border-slate-100 flex items-center justify-between gap-4">
               <div className="flex items-center gap-4">
                    <span className="w-10 h-10 bg-secondary/5 rounded-xl flex items-center justify-center font-black text-secondary text-sm border border-secondary/10">
                         {q.question_number}
                    </span>
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                         {q.question_number === 45 && ["Ona tili va adabiyot", "Rus tili", "Qoraqalpoq tili"].includes(subject) ? "Esse/Ijodiy Ish Bali" : "Qo'lda kiritiladigan ball"}
                    </span>
               </div>
               <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400">MAX:</span>
                    <input
                         type="text"
                         ref={el => { if (el) inputRefs.current[`${idx}-points`] = el; }}
                         inputMode="none"
                         className="w-16 h-8 bg-slate-50 border border-slate-200 rounded-lg text-center text-xs font-black text-primary"
                         value={q.points}
                         onFocus={() => {
                              setKeyboardVisible(true);
                              setFocusedPoints({ qIndex: idx });
                         }}
                         onChange={(e) => updatePoints(idx, e.target.value)}
                    />
               </div>
          </div>
     );
});

interface WritingQuestionCardProps {
     idx: number;
     q: any;
     inputRefs: React.MutableRefObject<any>;
     setFocusedAlt: (focusedAlt: any) => void;
     setFocusedPoints: (focused: any) => void;
     setKeyboardVisible: (visible: boolean) => void;
     updateAlternative: (idx: number, pIdx: number, aIdx: number, value: string) => void;
     removeAlternative: (idx: number, pIdx: number, aIdx: number) => void;
     addAlternative: (idx: number, pIdx: number) => void;
     addPart: (idx: number) => void;
     removePart: (idx: number, pIdx: number) => void;
     updatePoints: (idx: number, value: string) => void;
}

export const WritingQuestionCard = memo(({
     idx, q, inputRefs,
     setFocusedAlt, setFocusedPoints, setKeyboardVisible,
     updateAlternative, removeAlternative, addAlternative,
     addPart, removePart, updatePoints
}: WritingQuestionCardProps) => {
     return (
          <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm transition-all hover:border-primary/20">
               <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                         <div className="w-14 h-14 bg-primary/5 rounded-2xl flex items-center justify-center text-primary font-black text-xl">
                              {q.question_number}
                         </div>
                         <div>
                              <div className="flex flex-col gap-1">
                                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ball</span>
                                   <input
                                        type="text"
                                        ref={el => { if (el) inputRefs.current[`${idx}-points`] = el; }}
                                        inputMode="none"
                                        className="w-20 h-10 bg-white border-2 border-slate-50 rounded-xl text-center text-sm font-black text-primary hover:border-primary/20 transition-all"
                                        value={q.points}
                                        onFocus={() => {
                                             setKeyboardVisible(true);
                                             setFocusedPoints({ qIndex: idx });
                                        }}
                                        onChange={(e) => updatePoints(idx, e.target.value)}
                                   />
                              </div>
                              <span className="block font-black text-slate-800 uppercase tracking-widest text-xs">Yozma Javob Kaliti</span>
                              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">{q.parts.length} qismdan iborat</span>
                         </div>
                    </div>
                    <div className="flex gap-2">
                         <button
                              onClick={() => addPart(idx)}
                              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-bold text-xs hover:bg-primary-dark transition-all shadow-md active:scale-95"
                         >
                              <Plus size={14} /> Qism qo'shish
                         </button>
                    </div>
               </div>

               <div className="space-y-6">
                    {q.parts.map((part: any, pIdx: number) => (
                         <div key={pIdx} className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                              <div className="flex items-center justify-between mb-4">
                                   <span className="font-black text-slate-500 uppercase tracking-widest text-[10px] flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-primary" /> {pIdx + 1}-qism
                                   </span>
                                   <div className="flex gap-2">
                                        <button
                                             onClick={() => addAlternative(idx, pIdx)}
                                             className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg font-bold text-[10px] hover:bg-emerald-100 transition-all border border-emerald-100"
                                        >
                                             <Plus size={10} /> Variant
                                        </button>
                                        {q.parts.length > 1 && (
                                             <button
                                                  onClick={() => removePart(idx, pIdx)}
                                                  className="p-1 text-red-400 hover:text-red-600 transition-colors"
                                             >
                                                  <Trash2 size={16} />
                                             </button>
                                        )}
                                   </div>
                              </div>

                              <div className="grid grid-cols-1 gap-4">
                                   <div className="space-y-3">
                                        {part.alternatives.map((alt: string, aIdx: number) => (
                                             <div key={aIdx} className="relative group/alt flex items-center gap-3">
                                                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 shrink-0">
                                                       {String.fromCharCode(65 + aIdx)}
                                                  </div>
                                                  <div className="relative flex-1">
                                                       <input
                                                            type="text"
                                                            ref={el => { inputRefs.current[`${idx}-${pIdx}-${aIdx}`] = el; }}
                                                            placeholder="To'g'ri javobni kiriting..."
                                                            inputMode="none"
                                                            className="w-full !py-4 !px-5 !rounded-2xl border-2 border-white bg-white focus:border-primary/40 outline-none transition-all text-base font-bold shadow-sm"
                                                            value={alt}
                                                            onFocus={() => {
                                                                 setFocusedAlt({ qIndex: idx, pIndex: pIdx, aIndex: aIdx });
                                                                 setKeyboardVisible(true);
                                                            }}
                                                            onChange={(e) => updateAlternative(idx, pIdx, aIdx, e.target.value)}
                                                       />
                                                       {part.alternatives.length > 1 && (
                                                            <button
                                                                 onClick={() => removeAlternative(idx, pIdx, aIdx)}
                                                                 className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover/alt:opacity-100 text-slate-300 hover:text-red-500 transition-all p-1"
                                                            >
                                                                 <Trash2 size={18} />
                                                            </button>
                                                       )}
                                                  </div>
                                             </div>
                                        ))}
                                   </div>
                              </div>
                         </div>
                    ))}
               </div>
          </div>
     );
});

WritingQuestionCard.displayName = "WritingQuestionCard";
ChoiceQuestionRow.displayName = "ChoiceQuestionRow";
ManualQuestionRow.displayName = "ManualQuestionRow";
