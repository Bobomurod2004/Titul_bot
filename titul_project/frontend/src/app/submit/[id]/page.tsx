"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Clock, User, CheckCircle2, BookOpen, Trophy, Keyboard } from "lucide-react";
import api from "@/lib/api";
import ScientificKeyboard from "@/components/ScientificKeyboard";

export default function SubmitTestPage() {
     const { id } = useParams();
     const router = useRouter();
     const searchParams = useSearchParams();

     const [test, setTest] = useState<any>(null);
     const [studentName, setStudentName] = useState("");
     const [answers, setAnswers] = useState<any[]>([]);
     const [loading, setLoading] = useState(true);
     const [submitting, setSubmitting] = useState(false);
     const [result, setResult] = useState<any>(null);

     // Scientific Keyboard State
     const [focusedInput, setFocusedInput] = useState<{ qIndex: number; pIndex: number } | null>(null);
     const [keyboardVisible, setKeyboardVisible] = useState(false);
     const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

     const sub = test?.subject?.toLowerCase() || "";
     const isScientificSubject = sub.includes("matematika") ||
          sub.includes("fizika") ||
          sub.includes("algebra") ||
          sub.includes("geometriya") ||
          sub.includes("kimyo") ||
          sub.includes("math") ||
          sub.includes("physics");
     const hasWritingQuestions = test?.questions?.some((q: any) => q.question_type === "writing");

     useEffect(() => {
          const name = localStorage.getItem("student_name");
          if (!name) {
               router.push("/submit");
               return;
          }
          setStudentName(name);

          const fetchTest = async () => {
               try {
                    const response = await api.get(`/tests/${id}/id/`);
                    setTest(response.data);

                    const initialAnswers = response.data.questions.map((q: any) => {
                         let initialVal: any = "";
                         if (q.question_type === 'writing') {
                              try {
                                   const parsed = JSON.parse(q.correct_answer);
                                   if (Array.isArray(parsed)) {
                                        initialVal = Array(parsed.length).fill("");
                                   }
                              } catch {
                                   initialVal = "";
                              }
                         }
                         return {
                              question_number: q.question_number,
                              student_answer: initialVal
                         };
                    });
                    setAnswers(initialAnswers);
               } catch (err) {
                    alert("Xatolik: Test topilmadi!");
                    router.push("/submit");
               } finally {
                    setLoading(false);
               }
          };

          fetchTest();
     }, [id, router]);

     const handleChoice = (qIndex: number, choice: string) => {
          const newAnswers = [...answers];
          newAnswers[qIndex].student_answer = choice;
          setAnswers(newAnswers);
     };

     const handleWritingChange = (qIndex: number, pIndex: number, value: string) => {
          const newAnswers = [...answers];
          if (Array.isArray(newAnswers[qIndex].student_answer)) {
               newAnswers[qIndex].student_answer[pIndex] = value;
          } else {
               newAnswers[qIndex].student_answer = value;
          }
          setAnswers(newAnswers);
     };

     const insertChar = (char: string) => {
          if (!focusedInput) return;
          const { qIndex, pIndex } = focusedInput;
          const key = `${qIndex}-${pIndex}`;
          const input = inputRefs.current[key];
          if (!input) return;

          const start = input.selectionStart || 0;
          const end = input.selectionEnd || 0;
          const originalValue = Array.isArray(answers[qIndex].student_answer)
               ? answers[qIndex].student_answer[pIndex]
               : answers[qIndex].student_answer;

          const newValue = originalValue.substring(0, start) + char + originalValue.substring(end);

          handleWritingChange(qIndex, pIndex, newValue);

          // Restore focus and cursor position
          setTimeout(() => {
               input.focus();
               input.setSelectionRange(start + char.length, start + char.length);
          }, 0);
     };

     const handleBackspace = () => {
          if (!focusedInput) return;
          const { qIndex, pIndex } = focusedInput;
          const key = `${qIndex}-${pIndex}`;
          const input = inputRefs.current[key];
          if (!input) return;

          const start = input.selectionStart || 0;
          const end = input.selectionEnd || 0;
          const originalValue = Array.isArray(answers[qIndex].student_answer)
               ? answers[qIndex].student_answer[pIndex]
               : answers[qIndex].student_answer;

          if (start === end && start > 0) {
               const newValue = originalValue.substring(0, start - 1) + originalValue.substring(end);
               handleWritingChange(qIndex, pIndex, newValue);
               setTimeout(() => {
                    input.focus();
                    input.setSelectionRange(start - 1, start - 1);
               }, 0);
          } else if (start !== end) {
               const newValue = originalValue.substring(0, start) + originalValue.substring(end);
               handleWritingChange(qIndex, pIndex, newValue);
               setTimeout(() => {
                    input.focus();
                    input.setSelectionRange(start, start);
               }, 0);
          }
     };

     const handleSubmit = async () => {
          const unanswered = answers.filter(a => {
               if (Array.isArray(a.student_answer)) return a.student_answer.some((v: any) => v === "");
               return a.student_answer === "";
          }).length;

          if (unanswered > 0) {
               if (!confirm(`${unanswered} ta savolga to'liq javob bermadingiz. Baribir yuborasizmi?`)) return;
          }

          setSubmitting(true);
          try {
               const userId = searchParams.get("user_id") || searchParams.get("id");
               const payload = {
                    test_id: Number(id),
                    student_telegram_id: Number(userId) || 0,
                    student_name: studentName,
                    answers: answers.reduce((acc: any, curr) => {
                         acc[curr.question_number] = curr.student_answer;
                         return acc;
                    }, {})
               };
               const response = await api.post("/submissions/", payload);
               setResult(response.data);
               localStorage.removeItem("student_name");
               window.scrollTo({ top: 0, behavior: 'smooth' });
          } catch (err) {
               alert("Xatolik yuz berdi!");
          } finally {
               setSubmitting(false);
          }
     };

     if (loading) return (
          <div className="min-h-screen flex items-center justify-center bg-slate-50/50">
               <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-primary border-t-transparent animate-spin rounded-full"></div>
                    <p className="text-slate-400 font-bold animate-pulse">Test yuklanmoqda...</p>
               </div>
          </div>
     );

     if (result) return (
          <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50/50">
               <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="titul-card max-w-lg w-full text-center"
               >
                    <div className="flex justify-center mb-8">
                         <div className="w-24 h-24 bg-secondary/10 rounded-full flex items-center justify-center relative">
                              <CheckCircle2 className="text-secondary w-14 h-14" />
                              <motion.div
                                   initial={{ scale: 0 }}
                                   animate={{ scale: 1 }}
                                   transition={{ delay: 0.5, type: 'spring' }}
                                   className="absolute -top-2 -right-2 bg-yellow-400 p-2 rounded-lg shadow-lg"
                              >
                                   <Trophy size={20} className="text-white" />
                              </motion.div>
                         </div>
                    </div>

                    <h1 className="text-4xl font-black font-display mb-2 text-slate-800">Natijangiz</h1>
                    <p className="text-slate-500 font-medium mb-10">Tabriklaymiz, test muvaffaqiyatli topshirildi!</p>

                    <div className="bg-slate-50 rounded-[2.5rem] p-8 space-y-6 mb-10 border-2 border-slate-100">
                         <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                              <span className="text-slate-400 font-bold uppercase text-xs tracking-widest">Talaba:</span>
                              <span className="font-black text-slate-800">{result.student_name}</span>
                         </div>
                         {result.attempt_number > 1 && (
                              <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                                   <span className="text-slate-400 font-bold uppercase text-xs tracking-widest">Urinish:</span>
                                   <span className="font-black text-primary">{result.attempt_number}-urinish</span>
                              </div>
                         )}
                         <div className="flex justify-between items-center">
                              <span className="text-slate-400 font-bold uppercase text-xs tracking-widest">To'g'ri javoblar:</span>
                              <span className="text-3xl font-black text-primary font-display">{result.score} ta</span>
                         </div>
                         <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                              <span className="text-slate-400 font-bold uppercase text-xs tracking-widest">Daraja:</span>
                              <span className={`px-6 py-2 rounded-full font-black text-lg ${result.grade.includes('A') ? 'bg-secondary/10 text-secondary' :
                                   result.grade.includes('B') ? 'bg-primary/10 text-primary' : 'bg-orange-100 text-orange-600'
                                   }`}>
                                   {result.grade}
                              </span>
                         </div>
                    </div>

                    <button
                         onClick={() => router.push("/")}
                         className="btn-primary w-full py-5 text-xl"
                    >
                         Asosiy Sahifaga Qaytish
                    </button>
               </motion.div>
          </div>
     );

     return (
          <div className="max-w-5xl mx-auto px-4 py-12 md:py-20">
               {/* Exam Header */}
               <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="titul-card mb-12 border-l-[12px] border-primary flex flex-col md:flex-row items-center justify-between gap-8"
               >
                    <div className="flex items-center gap-6 text-center md:text-left">
                         <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary shrink-0 mx-auto">
                              <BookOpen size={36} />
                         </div>
                         <div>
                              <h1 className="text-3xl font-black font-display text-slate-900 leading-tight mb-2">{test.title}</h1>
                              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-slate-400 font-bold text-sm uppercase tracking-wider">
                                   <div className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-lg">
                                        <Clock size={16} className="text-primary" /> {test.subject}
                                   </div>
                                   <div className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-lg">
                                        <User size={16} className="text-primary" /> {studentName}
                                   </div>
                              </div>
                         </div>
                    </div>

                    <div className="bg-slate-900 text-white px-8 py-4 rounded-3xl text-center md:text-right shrink-0">
                         <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-1">Test Kodi</p>
                         <p className="text-3xl font-black font-display tracking-widest">{test.access_code}</p>
                    </div>
               </motion.div>

               {/* Keyboard Toggle Banner */}
               {hasWritingQuestions && (
                    <motion.div
                         initial={{ opacity: 0, scale: 0.95 }}
                         animate={{ opacity: 1, scale: 1 }}
                         className="mb-8 p-4 bg-primary/5 border-2 border-primary/10 rounded-[2rem] flex items-center justify-between gap-4"
                    >
                         <div className="flex items-center gap-4 ml-2">
                              <div className="w-10 h-10 bg-primary shadow-lg shadow-primary/20 rounded-xl flex items-center justify-center text-white">
                                   <Keyboard size={20} />
                              </div>
                              <div>
                                   <p className="text-sm font-black text-slate-800 uppercase tracking-widest">Formula Paneli</p>
                                   <p className="text-xs text-slate-400 font-bold">Maxsus belgi va formulalar uchun klaviatura</p>
                              </div>
                         </div>
                         <button
                              onClick={() => setKeyboardVisible(!keyboardVisible)}
                              className={`px-6 py-2 rounded-xl font-bold text-sm transition-all shadow-sm ${keyboardVisible ? 'bg-slate-900 text-white shadow-slate-200' : 'bg-white text-primary border-2 border-primary/20 hover:border-primary'
                                   }`}
                         >
                              {keyboardVisible ? 'Yopish' : 'Klaviaturani Ochish'}
                         </button>
                    </motion.div>
               )}

               {/* Questions Grid */}
               <div className="space-y-4 mb-20">
                    <div className="flex items-center gap-6 mb-8 ml-2">
                         <h2 className="text-2xl font-black font-display text-slate-800">Javoblar Varog'i</h2>
                         <div className="h-[2px] flex-grow bg-slate-100 rounded-full"></div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                         {test.questions.map((q: any, idx: number) => {
                              const isWriting = q.question_type === "writing";
                              const studentAns = answers[idx]?.student_answer;
                              const isAnswered = isWriting
                                   ? (Array.isArray(studentAns) ? studentAns.some((v: any) => v !== "") : !!studentAns)
                                   : !!studentAns;

                              return (
                                   <motion.div
                                        key={q.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.01 }}
                                        className={`question-row !py-6 transition-all ${isWriting ? 'flex-col !items-start gap-6 bg-slate-50/30' : ''} ${isAnswered ? 'active' : ''}`}
                                   >
                                        <div className="flex items-center gap-5 w-full">
                                             <div className="w-12 h-12 bg-white border-2 border-slate-100 rounded-2xl flex items-center justify-center font-black text-slate-400 text-lg shadow-sm">
                                                  {q.question_number}
                                             </div>
                                             {isWriting && (
                                                  <span className="font-black text-slate-500 uppercase tracking-widest text-[10px]">Yozma Javob</span>
                                             )}
                                        </div>

                                        <div className="flex gap-2 sm:gap-4 flex-grow justify-end w-full">
                                             {q.question_type === "choice" ? (
                                                  ["A", "B", "C", "D"].map((choice) => (
                                                       <div
                                                            key={choice}
                                                            onClick={() => handleChoice(idx, choice)}
                                                            className={`circle-check !w-14 !h-14 !text-xl ${answers[idx]?.student_answer === choice ? 'active' : ''}`}
                                                       >
                                                            {choice}
                                                       </div>
                                                  ))
                                             ) : (
                                                  <div className="w-full space-y-3">
                                                       {Array.isArray(answers[idx]?.student_answer) ? (
                                                            answers[idx].student_answer.map((partVal: string, pIdx: number) => (
                                                                 <div key={pIdx} className="relative group/input">
                                                                      <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-[10px] font-black text-slate-400">
                                                                           {pIdx + 1}
                                                                      </div>
                                                                      <input
                                                                           ref={el => { if (el) inputRefs.current[`${idx}-${pIdx}`] = el; }}
                                                                           type="text"
                                                                           placeholder="Javobingiz..."
                                                                           className="input-premium !py-4 !pl-16 !pr-12 !rounded-[1.25rem] !text-lg !bg-white"
                                                                           value={partVal}
                                                                           onFocus={() => {
                                                                                setFocusedInput({ qIndex: idx, pIndex: pIdx });
                                                                                if (isScientificSubject) {
                                                                                     setKeyboardVisible(true);
                                                                                }
                                                                           }}
                                                                           onChange={(e) => handleWritingChange(idx, pIdx, e.target.value)}
                                                                      />
                                                                      {isWriting && (
                                                                           <button
                                                                                onClick={() => {
                                                                                     setFocusedInput({ qIndex: idx, pIndex: pIdx });
                                                                                     setKeyboardVisible(true);
                                                                                }}
                                                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-primary transition-colors"
                                                                           >
                                                                                <Keyboard size={20} />
                                                                           </button>
                                                                      )}
                                                                 </div>
                                                            ))
                                                       ) : (
                                                            <div className="relative">
                                                                 <input
                                                                      ref={el => { if (el) inputRefs.current[`${idx}-0`] = el; }}
                                                                      type="text"
                                                                      placeholder="Javobingiz..."
                                                                      className="input-premium !py-4 !px-6 !rounded-[1.25rem] !text-lg !bg-white"
                                                                      value={answers[idx]?.student_answer}
                                                                      onFocus={() => {
                                                                           setFocusedInput({ qIndex: idx, pIndex: 0 });
                                                                           if (isScientificSubject) {
                                                                                setKeyboardVisible(true);
                                                                           }
                                                                      }}
                                                                      onChange={(e) => handleChoice(idx, e.target.value)}
                                                                 />
                                                                 {isWriting && (
                                                                      <button
                                                                           onClick={() => {
                                                                                setFocusedInput({ qIndex: idx, pIndex: 0 });
                                                                                setKeyboardVisible(true);
                                                                           }}
                                                                           className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-primary transition-colors"
                                                                      >
                                                                           <Keyboard size={20} />
                                                                      </button>
                                                                 )}
                                                            </div>
                                                       )}
                                                  </div>
                                             )}
                                        </div>
                                   </motion.div>
                              );
                         })}
                    </div>
               </div>

               {/* Sticky Footer Action */}
               <div className="sticky bottom-8 left-0 right-0 px-4 z-40">
                    <button
                         onClick={handleSubmit}
                         disabled={submitting}
                         className={`btn-primary w-full py-6 text-2xl group shadow-[0_20px_40px_rgba(79,70,229,0.3)] ${submitting ? 'opacity-70' : ''}`}
                    >
                         {submitting ? (
                              <div className="flex items-center gap-3">
                                   <div className="w-6 h-6 border-4 border-white border-t-transparent animate-spin rounded-full"></div>
                                   Yuborilmoqda...
                              </div>
                         ) : (
                              <>
                                   <Send size={28} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                   Javoblarni Tasdiqlash va Yuborish
                              </>
                         )}
                    </button>
               </div>

               {/* Scientific Keyboard Integration */}
               <AnimatePresence>
                    {keyboardVisible && (
                         <ScientificKeyboard
                              visible={keyboardVisible}
                              onClose={() => setKeyboardVisible(false)}
                              onInsert={insertChar}
                              onBackspace={handleBackspace}
                         />
                    )}
               </AnimatePresence>

               <p className="text-center text-slate-400 font-medium mt-12 pb-8">
                    © 2026 Titul Test Platformasi • <span className="text-secondary">Xavfsiz va Ishonchli</span>
               </p>
          </div>
     );
}
