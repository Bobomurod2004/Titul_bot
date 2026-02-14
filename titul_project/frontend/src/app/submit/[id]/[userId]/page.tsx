"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
     CheckCircle2, AlertCircle, BookOpen, Timer, Trophy,
     ArrowRight, ArrowLeft, Clock, User, Keyboard, Star,
     ChevronDown, X, Info, Send, CornerDownLeft, Hash, FunctionSquare, Layout, Delete, XCircle
} from "lucide-react";
import api from "@/lib/api";
import ScientificKeyboard from "@/components/ScientificKeyboard";
import { ChoiceAnswerRow, WritingManualAnswerRow } from "./AnswerComponents";
import { toast } from "react-hot-toast";

export default function SubmitTestPage() {
     const { id, userId: userIdParam } = useParams();
     const userId = String(userIdParam).match(/^\d+$/) ? userIdParam : "0";
     const router = useRouter();
     const searchParams = useSearchParams();

     const [test, setTest] = useState<any>(null);
     const [studentName, setStudentName] = useState("");
     const [answers, setAnswers] = useState<any[]>([]);
     const [loading, setLoading] = useState(true);
     const [submitting, setSubmitting] = useState(false);
     const [result, setResult] = useState<any>(null);
     const [attemptStatus, setAttemptStatus] = useState<any>(null);
     const [statusLoading, setStatusLoading] = useState(true);
     const [timeLeft, setTimeLeft] = useState<string>("");

     // Scientific Keyboard State
     const [focusedInput, setFocusedInput] = useState<{ qIndex: number; pIndex: number; isPoints?: boolean } | null>(null);
     const [keyboardVisible, setKeyboardVisible] = useState(false);
     const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

     // Scroll focused input into view when keyboard opens
     useEffect(() => {
          if (keyboardVisible && focusedInput) {
               const { qIndex, pIndex } = focusedInput;
               const key = `${qIndex}-${pIndex}`;
               const timer = setTimeout(() => {
                    const el = inputRefs.current[key];
                    if (el) {
                         el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
               }, 300); // Wait for keyboard animation
               return () => clearTimeout(timer);
          }
     }, [keyboardVisible, focusedInput]);

     const sub = test?.subject?.toLowerCase() || "";
     const isScientificSubject = sub.includes("matematika") ||
          sub.includes("fizika") ||
          sub.includes("algebra") ||
          sub.includes("geometriya") ||
          sub.includes("kimyo") ||
          sub.includes("math") ||
          sub.includes("physics");
     const hasWritingQuestions = test?.questions?.some((q: any) => q.question_type === "writing");

     const [isMobile, setIsMobile] = useState(false);

     useEffect(() => {
          setIsMobile(window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
     }, []);

     useEffect(() => {
          const name = localStorage.getItem("student_name");
          if (!name) {
               router.push(`/submit/${userId}`);
               return;
          }
          setStudentName(name);

          const fetchTest = async () => {
               try {
                    const response = await api.get(`/tests/${id}/id/`);
                    setTest(response.data);

                    const initialAnswers = response.data.questions.map((q: any) => {
                         let initialVal: any = "";
                         if (q.question_type === 'writing' || q.question_type === 'manual') {
                              try {
                                   const parsed = q.correct_answer ? JSON.parse(q.correct_answer) : [];
                                   if (Array.isArray(parsed) && parsed.length > 0) {
                                        initialVal = Array(parsed.length).fill("");
                                   } else {
                                        initialVal = [""]; // Default to 1 part if empty or not array
                                   }
                              } catch {
                                   initialVal = [""]; // Default to 1 part for writing/manual
                              }
                         }
                         return {
                              question_number: q.question_number,
                              student_answer: initialVal
                         };
                    });
                    setAnswers(initialAnswers);
               } catch (err) {
                    toast.error("Xatolik: Test topilmadi!");
                    router.push(`/submit/${userId}`);
               } finally {
                    setLoading(false);
               }
          };

          const fetchStatus = async () => {
               try {
                    const name = localStorage.getItem("student_name");
                    const response = await api.get(`/tests/${id}/check_status/${userId}/?student_name=${name || ''}`);
                    setAttemptStatus(response.data);
               } catch (err) {
                    console.error("Status check error:", err);
               } finally {
                    setStatusLoading(false);
               }
          };

          fetchTest();
          fetchStatus();
     }, [id, router, userId]);

     // Timer Logic
     useEffect(() => {
          if (!test?.expires_at || result) return;

          const timer = setInterval(() => {
               const now = new Date().getTime();
               const expiry = new Date(test.expires_at).getTime();
               const diff = expiry - now;

               if (diff <= 0) {
                    setTimeLeft("Vaqt tugadi");
                    clearInterval(timer);
                    handleSubmit();
               } else {
                    const h = Math.floor(diff / (1000 * 60 * 60));
                    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    const s = Math.floor((diff % (1000 * 60)) / 1000);
                    setTimeLeft(`${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
               }
          }, 1000);

          return () => clearInterval(timer);
     }, [test?.expires_at, result]);

     const handleChoice = useCallback((qIdx: number, choice: string) => {
          console.log(`Choice selected: Q${qIdx} -> ${choice}`);
          setAnswers(prev => {
               const newAnswers = [...prev];
               newAnswers[qIdx] = {
                    ...newAnswers[qIdx],
                    student_answer: choice
               };
               return newAnswers;
          });
     }, []);

     const handleWritingInputChange = useCallback((qIdx: number, pIdx: number, val: string) => {
          setAnswers(prev => {
               const newAnswers = [...prev];
               const currentAns = newAnswers[qIdx].student_answer;
               if (Array.isArray(currentAns)) {
                    const newParts = [...currentAns];
                    newParts[pIdx] = val;
                    newAnswers[qIdx] = { ...newAnswers[qIdx], student_answer: newParts };
               } else {
                    newAnswers[qIdx] = { ...newAnswers[qIdx], student_answer: val };
               }
               return newAnswers;
          });
     }, []);

     const insertChar = useCallback((char: string) => {
          if (!focusedInput) return;
          const { qIndex, pIndex } = focusedInput;
          const inputKey = `${qIndex}-${pIndex}`;
          const input = inputRefs.current[inputKey] || inputRefs.current[`${qIndex}-0`];

          if (!input) return;

          const start = input.selectionStart || 0;
          const end = input.selectionEnd || 0;

          setAnswers(prevAnswers => {
               const newAnswers = [...prevAnswers];
               const currentAns = newAnswers[qIndex].student_answer;

               if (Array.isArray(currentAns)) {
                    const newParts = [...currentAns];
                    const val = newParts[pIndex] || "";
                    newParts[pIndex] = val.substring(0, start) + char + val.substring(end);
                    newAnswers[qIndex] = { ...newAnswers[qIndex], student_answer: newParts };
               } else {
                    const val = currentAns as string || "";
                    newAnswers[qIndex] = {
                         ...newAnswers[qIndex],
                         student_answer: val.substring(0, start) + char + val.substring(end)
                    };
               }
               return newAnswers;
          });

          // Restore focus and move cursor
          setTimeout(() => {
               input.focus();
               input.setSelectionRange(start + char.length, start + char.length);
          }, 0);
     }, [focusedInput]);

     const handleBackspace = useCallback(() => {
          if (!focusedInput) return;
          const { qIndex, pIndex } = focusedInput;
          const inputKey = `${qIndex}-${pIndex}`;
          const input = inputRefs.current[inputKey] || inputRefs.current[`${qIndex}-0`];

          if (!input) return;

          const start = input.selectionStart || 0;
          const end = input.selectionEnd || 0;

          if (start === 0 && start === end) return;

          setAnswers(prevAnswers => {
               const newAnswers = [...prevAnswers];
               const currentAns = newAnswers[qIndex].student_answer;

               if (Array.isArray(currentAns)) {
                    const newParts = [...currentAns];
                    const val = newParts[pIndex] || "";
                    if (start === end) {
                         newParts[pIndex] = val.substring(0, start - 1) + val.substring(end);
                    } else {
                         newParts[pIndex] = val.substring(0, start) + val.substring(end);
                    }
                    newAnswers[qIndex] = { ...newAnswers[qIndex], student_answer: newParts };
               } else {
                    const val = currentAns as string || "";
                    if (start === end) {
                         newAnswers[qIndex] = {
                              ...newAnswers[qIndex],
                              student_answer: val.substring(0, start - 1) + val.substring(end)
                         };
                    } else {
                         newAnswers[qIndex] = {
                              ...newAnswers[qIndex],
                              student_answer: val.substring(0, start) + val.substring(end)
                         };
                    }
               }
               return newAnswers;
          });

          // Restore focus and move cursor back
          setTimeout(() => {
               input.focus();
               const newPos = start === end ? Math.max(0, start - 1) : start;
               input.setSelectionRange(newPos, newPos);
          }, 0);
     }, [focusedInput]);

     const handleSubmit = async () => {
          const unanswered = answers.filter((a, idx) => {
               const q = test.questions[idx];
               if (q.question_type === 'manual') return false;
               if (Array.isArray(a.student_answer)) return a.student_answer.some((v: any) => v === "");
               return a.student_answer === "";
          }).length;

          if (unanswered > 0) {
               if (!confirm(`${unanswered} ta savolga to'liq javob bermadingiz. Baribir yuborasizmi?`)) return;
          }

          // Manual ballarni tekshirish
          for (let i = 0; i < test.questions.length; i++) {
               const q = test.questions[i];
               if (q.question_type === 'manual') {
                    const studentAns = answers[i]?.student_answer;
                    const val = Array.isArray(studentAns) ? parseFloat(studentAns[0]) : parseFloat(studentAns);
                    if (isNaN(val) || val < 0 || val > q.points) {
                         toast.error(`${q.question_number}-savol bali noto'g'ri kiritilgan! Ball 0 va ${q.points} orasida bo'lishi kerak.`);
                         return;
                    }
               }
          }

          setSubmitting(true);
          try {
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
               window.scrollTo({ top: 0, behavior: 'smooth' });
               toast.success("Javoblar muvaffaqiyatli yuborildi!");
          } catch (err: any) {
               let errorMsg = "Xatolik yuz berdi!";

               if (err.response?.data) {
                    const data = err.response.data;
                    if (typeof data === 'string') {
                         errorMsg = data;
                    } else if (data.detail) {
                         errorMsg = data.detail;
                    } else if (data.test_id) {
                         errorMsg = Array.isArray(data.test_id) ? data.test_id[0] : data.test_id;
                    } else if (typeof data === 'object') {
                         // Extract first error message from nested object
                         const firstKey = Object.keys(data)[0];
                         const firstVal = data[firstKey];
                         errorMsg = Array.isArray(firstVal) ? firstVal[0] : String(firstVal);
                    }
               }

               toast.error(errorMsg);
          } finally {
               setSubmitting(false);
               try {
                    const response = await api.get(`/tests/${id}/check_status/${userId}/`);
                    setAttemptStatus(response.data);
               } catch (e) { }
          }
     };

     if (loading || statusLoading) return (
          <div className="min-h-screen flex items-center justify-center bg-slate-50/50">
               <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-primary border-t-transparent animate-spin rounded-full"></div>
                    <p className="text-slate-400 font-bold animate-pulse">Test yuklanmoqda...</p>
               </div>
          </div>
     );

     return (
          <div className="max-w-5xl mx-auto px-4 py-8 md:py-20 lg:py-24">
               {/* Time's Up Overlay */}
               <AnimatePresence>
                    {timeLeft === "Vaqt tugadi" && !result && (
                         <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md"
                         >
                              <motion.div
                                   initial={{ scale: 0.9, y: 20 }}
                                   animate={{ scale: 1, y: 0 }}
                                   className="bg-white rounded-[2.5rem] p-8 md:p-12 max-w-lg w-full text-center shadow-2xl"
                              >
                                   <div className="w-20 h-20 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-amber-500">
                                        <Timer size={40} className="animate-pulse" />
                                   </div>
                                   <h2 className="text-3xl font-black font-display text-slate-800 mb-4">Vaqt Tugadi!</h2>
                                   <p className="text-slate-500 font-medium mb-8">
                                        Test uchun ajratilgan vaqt o'z nihoyasiga yetdi. Sizning javoblaringiz qabul qilinmadi yoki test yakunlandi.
                                   </p>
                                   <div className="space-y-4">
                                        <button
                                             onClick={() => router.push("/")}
                                             className="btn-primary w-full py-4 text-lg bg-slate-800 hover:bg-slate-900"
                                        >
                                             Bosh Sahifaga Qaytish
                                        </button>
                                   </div>
                              </motion.div>
                         </motion.div>
                    )}
               </AnimatePresence>

               {/* Attempt Status Messages */}
               {attemptStatus && !attemptStatus.can_submit && !result && (
                    <motion.div
                         initial={{ scale: 0.9, opacity: 0 }}
                         animate={{ scale: 1, opacity: 1 }}
                         className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-50/50 backdrop-blur-sm"
                    >
                         <div className="titul-card max-w-lg w-full text-center shadow-2xl">
                              <div className="flex justify-center mb-8">
                                   <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center">
                                        <XCircle className="text-red-500 w-14 h-14" />
                                   </div>
                              </div>
                              <h1 className="text-3xl font-black font-display mb-4 text-slate-800">Siz testni yechib bo'lgansiz</h1>
                              <p className="text-slate-500 font-medium mb-10">
                                   Ushbu test faqat bir marta topshirish uchun mo'ljallangan.
                                   Sizning natijangiz allaqachon qayd etilgan.
                              </p>
                              <button
                                   onClick={() => router.push("/")}
                                   className="btn-primary w-full py-5 text-xl bg-slate-800 hover:bg-slate-900"
                              >
                                   Asosiy Sahifaga Qaytish
                              </button>
                         </div>
                    </motion.div>
               )}

               {/* Result View */}
               {result && (
                    <motion.div
                         initial={{ scale: 0.9, opacity: 0 }}
                         animate={{ scale: 1, opacity: 1 }}
                         className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-50/50 backdrop-blur-sm overflow-y-auto"
                    >
                         <div className="titul-card max-w-lg w-full text-center mt-20 mb-20 shadow-2xl">
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

                              <div className="bg-slate-50 rounded-[2.5rem] p-8 space-y-6 mb-10 border-2 border-slate-100 text-left">
                                   <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                                        <span className="text-slate-400 font-bold uppercase text-xs tracking-widest">Talaba:</span>
                                        <span className="font-black text-slate-800">{result.student_name}</span>
                                   </div>
                                   {result.attempt_number && result.attempt_number > 0 && (
                                        <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                                             <span className="text-slate-400 font-bold uppercase text-xs tracking-widest">Urinish:</span>
                                             <span className="font-black text-primary">{result.attempt_number}-urinish</span>
                                        </div>
                                   )}
                                   <div className="flex justify-between items-center">
                                        <span className="text-slate-400 font-bold uppercase text-xs tracking-widest">Xom Ball (To'g'ri/Jami):</span>
                                        <span className="text-xl font-bold text-slate-700">{result.correct_count} / {test?.questions?.length || 0}</span>
                                   </div>
                                   {result.scaled_score !== undefined && result.scaled_score > 0 && (
                                        <div className="flex justify-between items-center bg-primary/5 p-4 rounded-2xl border border-primary/10">
                                             <div className="flex flex-col text-left">
                                                  <span className="text-primary font-bold uppercase text-[10px] tracking-widest">Rasch Balli (Professional):</span>
                                                  <span className="text-[10px] text-slate-400 font-medium">Qiyinchilik darajasi hisobga olingan</span>
                                             </div>
                                             <span className="text-3xl font-black text-primary font-display">{result.scaled_score} ball</span>
                                        </div>
                                   )}
                                   {!result.scaled_score && (
                                        <div className="flex justify-between items-center text-left">
                                             <span className="text-slate-400 font-bold uppercase text-xs tracking-widest">Umumiy ball:</span>
                                             <span className="text-3xl font-black text-primary font-display">{result.score} ball</span>
                                        </div>
                                   )}
                                   <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                                        <span className="text-slate-400 font-bold uppercase text-xs tracking-widest">Daraja:</span>
                                        <span className={`px-6 py-2 rounded-full font-black text-lg ${result.grade?.includes('A') ? 'bg-secondary/10 text-secondary' :
                                             result.grade?.includes('B') ? 'bg-primary/10 text-primary' : 'bg-orange-100 text-orange-600'
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
                         </div>
                    </motion.div>
               )}

               {/* Quick Start Guide */}
               {!result && (
                    <motion.div
                         initial={{ opacity: 0, y: -20 }}
                         animate={{ opacity: 1, y: 0 }}
                         className="mb-8 p-6 bg-blue-50/50 border-2 border-blue-100 rounded-[2rem] flex flex-col md:flex-row items-center gap-6"
                    >
                         <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-200">
                              <Info size={24} />
                         </div>
                         <div className="text-center md:text-left">
                              <h3 className="text-lg font-black text-slate-800 mb-1">Tezkor Yo'riqnoma</h3>
                              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                                   Barcha savollarga javob berganingizdan so'ng, sahifa pastidagi <b>"Javoblarni Yuborish"</b> tugmasini bosing.
                                   Vaqt tugashidan oldin yuborishni unutmang!
                              </p>
                         </div>
                    </motion.div>
               )}

               {/* Exam Header */}
               <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="titul-card mb-8 md:mb-12 border-l-[12px] border-primary flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8"
               >
                    <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 text-center sm:text-left">
                         <div className="w-16 h-16 md:w-20 md:h-20 bg-primary/10 rounded-2xl md:rounded-3xl flex items-center justify-center text-primary shrink-0">
                              <BookOpen size={window?.innerWidth < 768 ? 28 : 36} />
                         </div>
                         <div>
                              <h1 className="text-2xl md:text-3xl font-black font-display text-slate-900 leading-tight mb-2">{test.title}</h1>
                              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 md:gap-4 text-slate-400 font-bold text-xs md:text-sm uppercase tracking-wider">
                                   {attemptStatus && attemptStatus.submission_mode === 'multiple' && (
                                        <div className="flex items-center gap-2 bg-secondary/10 text-secondary px-3 py-1 rounded-lg border border-secondary/20">
                                             <Trophy size={16} /> {attemptStatus.existing_attempts_count + 1}-urinish
                                        </div>
                                   )}
                                   <div className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-lg">
                                        <Clock size={16} className="text-primary" /> {test.subject}
                                   </div>
                                   {test.expires_at && (
                                        <div className="flex items-center gap-2 bg-amber-50 text-amber-600 px-3 py-1 rounded-lg border border-amber-100">
                                             <Clock size={16} /> {timeLeft || 'Yuklanmoqda...'}
                                        </div>
                                   )}
                                   <div className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-lg">
                                        <User size={16} className="text-primary" /> {studentName}
                                   </div>
                              </div>
                         </div>
                    </div>

                    <div className="bg-slate-900 text-white px-6 md:px-8 py-3 md:py-4 rounded-2xl md:rounded-3xl text-center md:text-right shrink-0 w-full md:w-auto">
                         <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-1">Test Kodi</p>
                         <p className="text-2xl md:text-3xl font-black font-display tracking-widest">{test.access_code}</p>
                    </div>
               </motion.div>

               {/* Keyboard Toggle Banner */}
               {hasWritingQuestions && (
                    <motion.div
                         initial={{ opacity: 0, scale: 0.95 }}
                         animate={{ opacity: 1, scale: 1 }}
                         className="mb-8 p-4 bg-primary/5 border-2 border-primary/10 rounded-2xl md:rounded-[2rem] flex flex-col sm:flex-row items-center justify-between gap-4"
                    >
                         <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-primary shadow-lg shadow-primary/20 rounded-xl flex items-center justify-center text-white shrink-0">
                                   <Keyboard size={20} />
                              </div>
                              <div className="text-center sm:text-left">
                                   <p className="text-sm font-black text-slate-800 uppercase tracking-widest">Formula Paneli</p>
                                   <p className="text-[10px] md:text-xs text-slate-400 font-bold">Maxsus belgi va formulalar uchun klaviatura</p>
                              </div>
                         </div>
                         <button
                              onClick={() => setKeyboardVisible(!keyboardVisible)}
                              className={`w-full sm:w-auto px-6 py-2 rounded-xl font-bold text-sm transition-all shadow-sm ${keyboardVisible ? 'bg-slate-900 text-white shadow-slate-200' : 'bg-white text-primary border-2 border-primary/20 hover:border-primary'
                                   }`}
                         >
                              {keyboardVisible ? 'Yopish' : 'Klaviaturani Ochish'}
                         </button>
                    </motion.div>
               )}

               <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
                    {test.questions.map((q: any, idx: number) => {
                         if (q.question_type === "choice") {
                              return (
                                   <ChoiceAnswerRow
                                        key={q.id || `ans-${idx}`}
                                        idx={idx}
                                        q={q}
                                        studentAnswer={answers[idx]?.student_answer as string}
                                        handleChoice={handleChoice}
                                   />
                              );
                         } else {
                              return (
                                   <WritingManualAnswerRow
                                        key={q.id || `ans-${idx}`}
                                        idx={idx}
                                        q={q}
                                        studentAnswer={answers[idx]?.student_answer}
                                        inputRefs={inputRefs}
                                        setKeyboardVisible={setKeyboardVisible}
                                        setFocusedInput={setFocusedInput}
                                        handleWritingInputChange={handleWritingInputChange}
                                   />
                              );
                         }
                    })}
               </div>

               {/* Sticky Footer Action */}
               <div className="fixed bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent z-40">
                    <div className="max-w-5xl mx-auto">
                         <button
                              onClick={handleSubmit}
                              disabled={submitting}
                              className={`btn-primary w-full py-4 md:py-6 text-xl md:text-2xl group shadow-titul active:scale-[0.98] ${submitting ? 'opacity-70' : ''}`}
                         >
                              {submitting ? (
                                   <div className="flex items-center gap-3">
                                        <div className="w-6 h-6 border-4 border-white border-t-transparent animate-spin rounded-full"></div>
                                        Yuborilmoqda...
                                   </div>
                              ) : (
                                   <>
                                        <Send size={window?.innerWidth < 768 ? 24 : 28} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                        Javoblarni Yuborish
                                   </>
                              )}
                         </button>
                    </div>
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

               {/* Content Push Spacer */}
               <div className={`transition-all duration-300 ${keyboardVisible ? 'h-[400px]' : 'h-0'}`} />

               <p className="text-center text-slate-400 font-medium mt-12 pb-24">
                    © 2026 Titul Test Platformasi • <span className="text-secondary tracking-wide">Ishonchli Tizim</span>
               </p>
          </div>
     );
}
