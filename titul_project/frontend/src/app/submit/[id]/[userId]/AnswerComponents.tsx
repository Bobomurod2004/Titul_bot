"use client";

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

interface ChoiceAnswerRowProps {
     idx: number;
     q: any;
     studentAnswer: string;
     handleChoice: (idx: number, choice: string) => void;
}

export const ChoiceAnswerRow = memo(({ idx, q, studentAnswer, handleChoice }: ChoiceAnswerRowProps) => {
     const isAF = (q.question_number >= 33 && q.question_number <= 35);
     const variants = isAF ? ["A", "B", "C", "D", "E", "F"] : ["A", "B", "C", "D"];
     const isAnswered = !!studentAnswer;

     return (
          <motion.div
               initial={{ opacity: 0, x: -10 }}
               animate={{ opacity: 1, x: 0 }}
               transition={{ delay: idx * 0.01 }}
               className={`question-row !p-4 md:!p-6 transition-all flex flex-col gap-4 ${isAnswered ? 'active' : ''}`}
          >
               <div className="flex items-center justify-between w-full">
                    <div className="w-10 h-10 bg-white border-2 border-slate-100 rounded-xl flex items-center justify-center font-black text-slate-400 text-base shadow-sm">
                         {q.question_number}
                    </div>
                    {isAnswered && (
                         <div className="bg-primary/10 text-primary px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest">
                              Belgilandi: {studentAnswer}
                         </div>
                    )}
               </div>
               <div className="grid grid-cols-4 sm:flex sm:flex-wrap gap-2 md:gap-3 justify-center w-full">
                    {variants.map((choice) => (
                         <div
                              key={choice}
                              onClick={() => handleChoice(idx, choice)}
                              className={`circle-check !w-10 !h-10 sm:!w-12 sm:!h-12 !text-base sm:!text-lg ${studentAnswer === choice ? '!bg-primary !text-white !border-primary active' : ''}`}
                         >
                              {choice}
                         </div>
                    ))}
               </div>
          </motion.div>
     );
});

interface WritingManualAnswerRowProps {
     idx: number;
     q: any;
     studentAnswer: any;
     inputRefs: React.MutableRefObject<any>;
     setKeyboardVisible: (visible: boolean) => void;
     setFocusedInput: (focused: any) => void;
     handleWritingInputChange: (idx: number, pIdx: number, val: string) => void;
}

export const WritingManualAnswerRow = memo(({
     idx, q, studentAnswer, inputRefs,
     setKeyboardVisible, setFocusedInput,
     handleWritingInputChange
}: WritingManualAnswerRowProps) => {
     const isWriting = q.question_type === "writing";
     const isManual = q.question_type === "manual";
     const isAnswered = isWriting
          ? (Array.isArray(studentAnswer) ? studentAnswer.some((v: any) => v !== "") : !!studentAnswer)
          : (isManual ? true : !!studentAnswer);

     return (
          <motion.div
               initial={{ opacity: 0, x: -10 }}
               animate={{ opacity: 1, x: 0 }}
               transition={{ delay: idx * 0.01 }}
               className={`question-row !p-4 md:!p-6 transition-all flex flex-col gap-4 ${isAnswered ? 'active' : ''}`}
          >
               <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-white border-2 border-slate-100 rounded-xl flex items-center justify-center font-black text-slate-400 text-base shadow-sm">
                              {q.question_number}
                         </div>
                         {isWriting && (
                              <span className="font-black text-slate-500 uppercase tracking-widest text-[9px] bg-slate-100 px-2 py-1 rounded-md">Yozma Javob</span>
                         )}
                         {isManual && (
                              <div className="flex items-center gap-1.5 bg-secondary/10 px-2 py-1 rounded-md">
                                   <Star size={12} className="text-secondary" />
                                   <span className="font-black text-secondary uppercase tracking-widest text-[9px]">MAX: {q.points}</span>
                              </div>
                         )}
                    </div>
               </div>

               <div className="w-full space-y-3">
                    {Array.isArray(studentAnswer) ? (
                         studentAnswer.map((partVal: string, pIdx: number) => (
                              <div key={pIdx} className="relative group/input w-full">
                                   <div className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-7 h-7 md:w-8 md:h-8 bg-slate-100 rounded-lg flex items-center justify-center text-[9px] md:text-[10px] font-black text-slate-400">
                                        {pIdx + 1}
                                   </div>
                                   <input
                                        ref={el => { if (el) inputRefs.current[`${idx}-${pIdx}`] = el; }}
                                        type={isManual ? "text" : "text"}
                                        step="0.1"
                                        min="0"
                                        max={isManual ? q.points : undefined}
                                        placeholder={isManual ? "Bali..." : "Javobni kiriting..."}
                                        inputMode="none"
                                        className="w-full !py-3 md:!py-4 !pl-12 md:!pl-14 !pr-4 md:!pr-5 !rounded-lg md:!rounded-xl border-2 border-slate-50 bg-slate-50 focus:bg-white focus:border-primary/30 outline-none transition-all text-xs md:text-sm font-bold"
                                        value={partVal}
                                        onFocus={() => {
                                             setKeyboardVisible(true);
                                             setFocusedInput({ qIndex: idx, pIndex: pIdx, isPoints: isManual });
                                        }}
                                        onChange={(e) => handleWritingInputChange(idx, pIdx, e.target.value)}
                                   />
                              </div>
                         ))
                    ) : (
                         <div className="relative group/input w-full">
                              <input
                                   ref={el => { if (el) inputRefs.current[`${idx}-0`] = el; }}
                                   type={isManual ? "text" : "text"}
                                   step="0.1"
                                   min="0"
                                   max={isManual ? q.points : undefined}
                                   placeholder={isManual ? "Bali..." : "Javobni kiriting..."}
                                   inputMode="none"
                                   className="w-full !py-3 md:!py-4 !px-4 md:!px-5 !rounded-lg md:!rounded-xl border-2 border-slate-50 bg-slate-50 focus:bg-white focus:border-primary/30 outline-none transition-all text-xs md:text-sm font-bold"
                                   value={studentAnswer}
                                   onFocus={() => {
                                        setKeyboardVisible(true);
                                        setFocusedInput({ qIndex: idx, pIndex: 0, isPoints: isManual });
                                   }}
                                   onChange={(e) => handleWritingInputChange(idx, 0, e.target.value)}
                              />
                         </div>
                    )}
               </div>
          </motion.div>
     );
});

ChoiceAnswerRow.displayName = "ChoiceAnswerRow";
WritingManualAnswerRow.displayName = "WritingManualAnswerRow";
