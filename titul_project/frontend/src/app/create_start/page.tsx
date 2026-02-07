"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
     Plus, Send, BookOpen, AlertCircle, ChevronDown, CheckCircle2,
     User, Timer, ArrowRight, ArrowLeft, Info, AlertTriangle, XCircle, Edit3, Trash2
} from "lucide-react";
import api from "@/lib/api";

const SUBJECTS = ["Matematika", "Tarix", "Ona tili", "Ingliz tili", "Kimyo", "Biologiya", "Fizika", "Geografiya"];

export default function CreateTestPage() {
     const searchParams = useSearchParams();
     const router = useRouter();
     const creatorNameParam = searchParams.get("name") || "";
     const telegramId = searchParams.get("id");
     const editId = searchParams.get("editId");
     const isEdit = !!editId;

     // Step Management
     const [step, setStep] = useState(1);

     // Form State
     const [creatorName, setCreatorName] = useState(creatorNameParam);
     const [title, setTitle] = useState("");
     const [subject, setSubject] = useState(SUBJECTS[0]);
     const [expiresAt, setExpiresAt] = useState("");
     const [submissionMode, setSubmissionMode] = useState("single");

     // Questions state refined for parts and alternatives
     const [questions, setQuestions] = useState<any[]>(
          Array.from({ length: 35 }, (_, i) => ({
               question_number: i + 1,
               question_type: "choice",
               correct_answer: "",
               points: 1.0,
               parts: [{ alternatives: [""] }] // Default structure for writing
          }))
     );

     // UI State
     const [loading, setLoading] = useState(false);
     const [initialLoading, setInitialLoading] = useState(isEdit);
     const [error, setError] = useState("");
     const [showSuccess, setShowSuccess] = useState(false);
     const [accessCode, setAccessCode] = useState("");

     // Load initial data for edit mode
     useEffect(() => {
          if (isEdit) {
               const fetchTest = async () => {
                    try {
                         const res = await api.get(`/tests/${editId}/`);
                         const test = res.data;
                         setTitle(test.title);
                         setSubject(test.subject);
                         setCreatorName(test.creator_name || "");
                         if (test.expires_at) {
                              setExpiresAt(new Date(test.expires_at).toISOString().slice(0, 16));
                         }
                         setSubmissionMode(test.submission_mode || "single");

                         // Map existing questions to our state
                         const existingQs = test.questions || [];
                         const mappedQs = Array.from({ length: Math.max(35, existingQs.length) }, (_, i) => {
                              const found = existingQs.find((q: any) => q.question_number === i + 1);
                              if (found && found.question_type === 'writing') {
                                   try {
                                        const parsed = JSON.parse(found.correct_answer);
                                        return {
                                             ...found,
                                             parts: Array.isArray(parsed) ? parsed.map((p: any) => ({ alternatives: Array.isArray(p) ? p : [p] })) : [{ alternatives: [found.correct_answer] }]
                                        };
                                   } catch {
                                        return { ...found, parts: [{ alternatives: [found.correct_answer] }] };
                                   }
                              }
                              return found || {
                                   question_number: i + 1,
                                   question_type: i >= 35 ? "writing" : "choice",
                                   correct_answer: "",
                                   parts: [{ alternatives: [""] }]
                              };
                         });
                         setQuestions(mappedQs);
                         setAccessCode(test.access_code);
                    } catch (err) {
                         setError("Test ma'lumotlarini yuklashda xatolik yuz berdi.");
                    } finally {
                         setInitialLoading(false);
                    }
               };
               fetchTest();
          }
     }, [editId, isEdit]);

     // Actions for Nested Questions Logic
     const addPart = (qIndex: number) => {
          const newQs = [...questions];
          newQs[qIndex].parts.push({ alternatives: [""] });
          setQuestions(newQs);
     };

     const removePart = (qIndex: number, pIndex: number) => {
          const newQs = [...questions];
          if (newQs[qIndex].parts.length > 1) {
               newQs[qIndex].parts.splice(pIndex, 1);
               setQuestions(newQs);
          }
     };

     const addAlternative = (qIndex: number, pIndex: number) => {
          const newQs = [...questions];
          newQs[qIndex].parts[pIndex].alternatives.push("");
          setQuestions(newQs);
     };

     const removeAlternative = (qIndex: number, pIndex: number, aIndex: number) => {
          const newQs = [...questions];
          if (newQs[qIndex].parts[pIndex].alternatives.length > 1) {
               newQs[qIndex].parts[pIndex].alternatives.splice(aIndex, 1);
               setQuestions(newQs);
          }
     };

     const updateAlternative = (qIndex: number, pIndex: number, aIndex: number, value: string) => {
          const newQs = [...questions];
          newQs[qIndex].parts[pIndex].alternatives[aIndex] = value;
          setQuestions(newQs);
     };

     // Validation Helpers
     const getMinDateTime = () => {
          const now = new Date();
          now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
          return now.toISOString().slice(0, 16);
     };

     const getMaxDateTime = () => {
          const maxDate = new Date();
          maxDate.setDate(maxDate.getDate() + 7);
          maxDate.setMinutes(maxDate.getMinutes() - maxDate.getTimezoneOffset());
          return maxDate.toISOString().slice(0, 16);
     };
     const [announcements, setAnnouncements] = useState<any[]>([]);

     useEffect(() => {
          const fetchAnnouncements = async () => {
               try {
                    const res = await api.get("/announcements/");
                    setAnnouncements(res.data);
               } catch (err) {
                    console.error("Announcements load error", err);
               }
          };
          fetchAnnouncements();
     }, []);

     const handleChoice = (qIndex: number, choice: string) => {
          const newQuestions = [...questions];
          newQuestions[qIndex].correct_answer = choice;
          setQuestions(newQuestions);
     };

     const addWritingQuestion = () => {
          setQuestions([
               ...questions,
               {
                    question_number: questions.length + 1,
                    question_type: "writing",
                    correct_answer: "",
                    points: 2.0,
                    parts: [{ alternatives: [""] }]
               },
          ]);
     };

     const updatePoints = (qIndex: number, value: string) => {
          const newQs = [...questions];
          newQs[qIndex].points = parseFloat(value) || 0;
          setQuestions(newQs);
     };

     const validateStep1 = () => {
          if (!creatorName.trim()) {
               setError("Iltimos, tuzuvchi ism-familiyasini kiriting!");
               return false;
          }
          if (!title.trim()) {
               setError("Iltimos, test nomini kiriting!");
               return false;
          }
          setError("");
          return true;
     };

     const handleSaveTest = async () => {
          const hasAnswers = questions.some(q =>
               q.question_type === 'choice' ? q.correct_answer !== "" : q.parts.some((p: any) => p.alternatives.some((a: any) => a !== ""))
          );
          if (!hasAnswers) {
               setError("Kamida bitta savolga javob belgilang!");
               return;
          }

          if (expiresAt) {
               const expires = new Date(expiresAt);
               const now = new Date();
               const maxExpiry = new Date();
               maxExpiry.setDate(maxExpiry.getDate() + 7);

               if (expires <= now) {
                    setError("Tugash vaqti hozirgi vaqtdan keyin bo'lishi kerak!");
                    return;
               }
               if (expires > maxExpiry) {
                    setError("Test muddati 1 haftadan oshmasligi kerak!");
                    return;
               }
          }

          setLoading(true);
          setError("");
          try {
               const payload = {
                    creator_id: Number(telegramId),
                    creator_name: creatorName,
                    title,
                    subject,
                    submission_mode: submissionMode,
                    expires_at: expiresAt || null,
                    questions: questions.filter(q => {
                         if (q.question_type === 'choice') return q.correct_answer !== "";
                         return q.parts.some((p: any) => p.alternatives.some((a: any) => a !== ""));
                    }).map(q => {
                         let ans = q.correct_answer;
                         if (q.question_type === 'writing') {
                              ans = JSON.stringify(q.parts.map((p: any) => p.alternatives.filter((a: any) => a !== "")));
                         }
                         return {
                              question_number: q.question_number,
                              question_type: q.question_type,
                              correct_answer: ans,
                              points: q.points

                         }
                    }),
               };

               let response;
               if (isEdit) {
                    response = await api.put(`/tests/${editId}/`, payload);
               } else {
                    response = await api.post("/tests/", payload);
               }

               setAccessCode(response.data.access_code);
               setShowSuccess(true);
          } catch (err: any) {
               const errorData = err.response?.data;
               let errorMessage = "Xatolik yuz berdi";

               if (errorData) {
                    if (typeof errorData === 'string') errorMessage = errorData;
                    else if (errorData.detail) errorMessage = errorData.detail;
                    else errorMessage = JSON.stringify(errorData);
               }

               setError(errorMessage);
          } finally {
               setLoading(false);
          }
     };

     if (initialLoading) return (
          <div className="min-h-screen flex items-center justify-center bg-slate-50/50">
               <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-primary border-t-transparent animate-spin rounded-full"></div>
                    <p className="text-slate-400 font-bold animate-pulse">Ma'lumotlar yuklanmoqda...</p>
               </div>
          </div>
     );

     if (showSuccess) return (
          <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50/50">
               <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="titul-card max-w-md w-full text-center"
               >
                    <div className="flex justify-center mb-6">
                         <div className="w-20 h-20 bg-secondary/10 rounded-full flex items-center justify-center">
                              <CheckCircle2 className="text-secondary w-12 h-12" />
                         </div>
                    </div>
                    <h1 className="text-3xl font-bold mb-2">{isEdit ? 'Muvaffaqiyatli Saqlandi!' : 'Muvaffaqiyatli!'}</h1>
                    <p className="text-slate-500 mb-8">
                         {isEdit ? 'Test ma\'lumotlari yangilandi.' : 'Test yaratildi. Access kodni o\'quvchilarga tarqating:'}
                    </p>

                    <div className="bg-slate-50 rounded-3xl p-8 mb-8 border-2 border-dashed border-slate-200">
                         <span className="text-4xl font-black tracking-widest text-primary font-display">{accessCode}</span>
                    </div>

                    <button
                         onClick={() => router.push(`/my_tests?id=${telegramId}`)}
                         className="btn-primary w-full"
                    >
                         Testlarim Sahifasiga O'tish
                    </button>
               </motion.div>
          </div>
     );

     return (
          <div className="max-w-5xl mx-auto px-4 py-8 md:py-16">
               {/* Progress Bar */}
               <div className="flex items-center justify-between mb-12 max-w-2xl mx-auto">
                    {[1, 2, 3].map((s) => (
                         <div key={s} className="flex flex-col items-center gap-2 relative">
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold transition-all duration-300 ${step >= s ? 'bg-primary text-white shadow-btn-primary' : 'bg-white text-slate-300 border-2 border-slate-100'
                                   }`}>
                                   {step > s ? <CheckCircle2 size={24} /> : s}
                              </div>
                              <span className={`text-xs font-bold uppercase tracking-widest ${step >= s ? 'text-primary' : 'text-slate-300'}`}>
                                   {s === 1 ? 'Sozlash' : s === 2 ? 'Savollar' : 'Yakunlash'}
                              </span>
                              {s < 3 && (
                                   <div className={`hidden sm:block absolute left-16 top-6 w-24 h-1 rounded-full ${step > s ? 'bg-primary' : 'bg-slate-100'}`} />
                              )}
                         </div>
                    ))}
               </div>

               <AnimatePresence mode="wait">
                    {step === 1 && (
                         <motion.div
                              key="step1"
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              className="space-y-8"
                         >
                              {/* Announcements Section */}
                              {!isEdit && announcements.length > 0 && (
                                   <div className="space-y-4 mb-10">
                                        {announcements.map((ann) => (
                                             <div key={ann.id} className={`p-6 rounded-[2rem] border-2 flex gap-5 ${ann.type === 'danger' ? 'bg-red-50/50 border-red-100 text-red-900' :
                                                  ann.type === 'warning' ? 'bg-orange-50/50 border-orange-100 text-orange-900' :
                                                       'bg-blue-50/50 border-blue-100 text-blue-900'
                                                  }`}>
                                                  <div className="mt-1">
                                                       {ann.type === 'danger' ? <XCircle className="text-red-500" /> :
                                                            ann.type === 'warning' ? <AlertTriangle className="text-orange-500" /> :
                                                                 <Info className="text-blue-500" />}
                                                  </div>
                                                  <div>
                                                       <h4 className="font-black text-sm uppercase tracking-widest mb-2">{ann.title}</h4>
                                                       <p className="text-sm font-medium leading-relaxed opacity-80">{ann.content}</p>
                                                  </div>
                                             </div>
                                        ))}
                                   </div>
                              )}

                              <div className="titul-card">
                                   <div className="flex items-center gap-5 mb-10 pb-10 border-b-2 border-slate-50">
                                        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                                             {isEdit ? <Edit3 size={32} /> : <User size={32} />}
                                        </div>
                                        <div>
                                             <h2 className="text-3xl font-black font-display text-slate-900">{isEdit ? 'Testni Tahrirlash' : 'Tuzuvchi Ma\'lumotlari'}</h2>
                                             <p className="text-slate-400 font-medium italic">
                                                  {isEdit ? 'Mavjud test ma\'lumotlarini yangilang' : 'Imtihon varog\'i profili uchun'}
                                             </p>
                                        </div>
                                   </div>

                                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                             <label className="text-sm font-bold text-slate-500 ml-1 uppercase tracking-wider">Tuzuvchi Ism-familiyasi</label>
                                             <input
                                                  type="text"
                                                  placeholder="Eshmatov Toshmat"
                                                  className="input-premium"
                                                  value={creatorName}
                                                  onChange={(e) => setCreatorName(e.target.value)}
                                             />
                                        </div>
                                        <div className="space-y-3">
                                             <label className="text-sm font-bold text-slate-500 ml-1 uppercase tracking-wider">Test Nomi</label>
                                             <input
                                                  type="text"
                                                  placeholder="Masalan: Fizika 1-variant"
                                                  className="input-premium"
                                                  value={title}
                                                  onChange={(e) => setTitle(e.target.value)}
                                             />
                                        </div>
                                        <div className="space-y-3">
                                             <label className="text-sm font-bold text-slate-500 ml-1 uppercase tracking-wider">Imtihon Fani</label>
                                             <div className="relative">
                                                  <select
                                                       className="select-premium"
                                                       value={subject}
                                                       onChange={(e) => setSubject(e.target.value)}
                                                  >
                                                       {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                                                  </select>
                                                  <ChevronDown size={20} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                             </div>
                                        </div>
                                        <div className="space-y-3">
                                             <label className="text-sm font-bold text-slate-500 ml-1 uppercase tracking-wider">Test topshirish rejimi</label>
                                             <div className="relative">
                                                  <select
                                                       className="select-premium !border-primary/20 !bg-primary/[0.02]"
                                                       value={submissionMode}
                                                       onChange={(e) => setSubmissionMode(e.target.value)}
                                                  >
                                                       <option value="single">🔒 Faqat 1 marta topshirish mumkin</option>
                                                       <option value="multiple">♻️ Cheksiz topshirish mumkin</option>
                                                  </select>
                                                  <ChevronDown size={20} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                             </div>
                                        </div>
                                   </div>
                              </div>

                              <button
                                   onClick={() => validateStep1() && setStep(2)}
                                   className="btn-primary w-full py-6 text-xl shadow-lg"
                              >
                                   Keyingi Bosqich (Savollar)
                                   <ArrowRight />
                              </button>
                         </motion.div>
                    )}

                    {step === 2 && (
                         <motion.div
                              key="step2"
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -20 }}
                              className="space-y-12"
                         >
                              {/* Multiple Choice Section */}
                              <div>
                                   <div className="flex items-center gap-3 mb-8 ml-2">
                                        <div className="w-10 h-10 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 font-bold">1</div>
                                        <h2 className="text-2xl font-black font-display text-slate-800">Variantli Savollar (1-35)</h2>
                                   </div>

                                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                        {questions.map((q, idx) => (
                                             q.question_type === "choice" && (
                                                  <div
                                                       key={idx}
                                                       className={`question-row ${q.correct_answer ? 'active' : ''}`}
                                                  >
                                                       <div className="flex items-center gap-4">
                                                            <span className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center font-black text-slate-400 text-sm border border-slate-100">
                                                                 {q.question_number}
                                                            </span>
                                                       </div>
                                                       <div className="flex gap-2 sm:gap-4">
                                                            {["A", "B", "C", "D"].map((choice) => (
                                                                 <div
                                                                      key={choice}
                                                                      onClick={() => handleChoice(idx, choice)}
                                                                      className={`circle-check !w-12 !h-12 !text-lg ${q.correct_answer === choice ? 'active' : ''}`}
                                                                 >
                                                                      {choice}
                                                                 </div>
                                                            ))}
                                                       </div>
                                                  </div>
                                             )
                                        ))}
                                   </div>
                              </div>

                              {/* Writing Questions Section - NEW MULTIPART UI */}
                              <div>
                                   <div className="flex items-center justify-between mb-8 ml-2 px-2">
                                        <div className="flex items-center gap-3">
                                             <div className="w-10 h-10 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600 font-bold">2</div>
                                             <h2 className="text-2xl font-black font-display text-slate-800">Yozma Savollar</h2>
                                        </div>
                                        <button
                                             onClick={addWritingQuestion}
                                             className="flex items-center gap-2 bg-white border-2 border-slate-100 px-6 py-3 rounded-2xl font-bold text-slate-600 hover:border-primary hover:text-primary transition-all shadow-sm"
                                        >
                                             <Plus size={20} />
                                             Yangi Savol
                                        </button>
                                   </div>

                                   <div className="space-y-8">
                                        {questions.filter(q => q.question_type === "writing").map((q, qFilterIdx) => {
                                             const actualIdx = questions.indexOf(q);
                                             return (
                                                  <div key={actualIdx} className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm transition-all hover:border-primary/20">
                                                       <div className="flex items-center justify-between mb-8">
                                                            <div className="flex items-center gap-4">
                                                                 <div className="w-14 h-14 bg-primary/5 rounded-2xl flex items-center justify-center text-primary font-black text-xl">
                                                                      {q.question_number}
                                                                 </div>
                                                                 <div>
                                                                      <div className="flex flex-col gap-1">
                                                                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ball</span>
                                                                           <input
                                                                                type="number"
                                                                                step="0.1"
                                                                                className="w-20 h-10 bg-white border-2 border-slate-50 rounded-xl text-center text-sm font-black text-primary hover:border-primary/20 transition-all"
                                                                                value={q.points}
                                                                                onChange={(e) => updatePoints(actualIdx, e.target.value)}
                                                                           />
                                                                      </div>
                                                                      <span className="block font-black text-slate-800 uppercase tracking-widest text-xs">Yozma Javob Kaliti</span>

                                                                      <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">{q.parts.length} qismdan iborat</span>
                                                                 </div>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                 <button
                                                                      onClick={() => addPart(actualIdx)}
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
                                                                                     onClick={() => addAlternative(actualIdx, pIdx)}
                                                                                     className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg font-bold text-[10px] hover:bg-emerald-100 transition-all border border-emerald-100"
                                                                                >
                                                                                     <Plus size={12} /> Muqobil
                                                                                </button>
                                                                                {q.parts.length > 1 && (
                                                                                     <button
                                                                                          onClick={() => removePart(actualIdx, pIdx)}
                                                                                          className="p-1 text-red-300 hover:text-red-500 transition-colors"
                                                                                     >
                                                                                          <Trash2 size={16} />
                                                                                     </button>
                                                                                )}
                                                                           </div>
                                                                      </div>

                                                                      <div className="space-y-3">
                                                                           {part.alternatives.map((alt: string, aIdx: number) => (
                                                                                <div key={aIdx} className="flex gap-2 group">
                                                                                     <input
                                                                                          type="text"
                                                                                          placeholder={aIdx === 0 ? "Asosiy javob (masalan: 12.5)" : "Muqobil javob (masalan: 12,5)"}
                                                                                          className={`input-premium !py-3 !text-sm ${aIdx === 0 ? '!bg-white' : '!bg-emerald-50/30 !border-emerald-100'}`}
                                                                                          value={alt}
                                                                                          onChange={(e) => updateAlternative(actualIdx, pIdx, aIdx, e.target.value)}
                                                                                     />
                                                                                     {part.alternatives.length > 1 && (
                                                                                          <button
                                                                                               onClick={() => removeAlternative(actualIdx, pIdx, aIdx)}
                                                                                               className="p-2 text-slate-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                                                                          >
                                                                                               <XCircle size={18} />
                                                                                          </button>
                                                                                     )}
                                                                                </div>
                                                                           ))}
                                                                      </div>
                                                                 </div>
                                                            ))}
                                                       </div>
                                                  </div>
                                             );
                                        })}
                                   </div>
                              </div>

                              <div className="flex gap-4">
                                   <button onClick={() => setStep(1)} className="btn-secondary !bg-slate-200 !text-slate-600 !shadow-none py-6 flex-1">
                                        <ArrowLeft />
                                        Orqaga
                                   </button>
                                   <button onClick={() => setStep(3)} className="btn-primary py-6 flex-[2]">
                                        Keyingi Bosqich (Yakunlash)
                                        <ArrowRight />
                                   </button>
                              </div>
                         </motion.div>
                    )}

                    {step === 3 && (
                         <motion.div
                              key="step3"
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              className="space-y-8"
                         >
                              <div className="titul-card">
                                   <div className="flex items-center gap-5 mb-10 pb-10 border-b-2 border-slate-50">
                                        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                                             <Timer size={32} />
                                        </div>
                                        <div>
                                             <h2 className="text-3xl font-black font-display text-slate-900">Test Vaqti</h2>
                                             <p className="text-slate-400 font-medium">Test qachongacha faol bo'lishini belgilang</p>
                                        </div>
                                   </div>

                                   <div className="space-y-6">
                                        <div className="bg-slate-50/50 p-8 rounded-3xl border-2 border-slate-100">
                                             <label className="text-sm font-bold text-slate-500 uppercase tracking-wider block mb-4">Yakunlanish sanasi va vaqti</label>
                                             <input
                                                  type="datetime-local"
                                                  className="input-premium !bg-white"
                                                  value={expiresAt}
                                                  min={getMinDateTime()}
                                                  max={getMaxDateTime()}
                                                  onChange={(e) => setExpiresAt(e.target.value)}
                                             />
                                             <p className="mt-4 text-sm text-slate-400 font-medium italic">
                                                  {expiresAt ? 'Test ushbu vaqtda avtomatik yakunlanadi.' : 'Vaqt belgilanmasa, testni qo\'lda yakunlashingiz kerak bo\'ladi.'}
                                             </p>
                                        </div>

                                        <div className="bg-primary/5 p-8 rounded-3xl border-2 border-primary/10">
                                             <h4 className="font-black text-slate-800 mb-4 flex items-center gap-3">
                                                  <CheckCircle2 className="text-primary" />
                                                  Test qisqacha mazmuni:
                                             </h4>
                                             <ul className="space-y-3 text-slate-600 font-medium">
                                                  <li>• Fan: <span className="font-bold text-slate-900">{subject}</span></li>
                                                  <li>• Nom: <span className="font-bold text-slate-900">{title}</span></li>
                                                  <li>• Savollar: <span className="font-bold text-slate-900">{questions.filter(q => q.question_type === 'choice' ? q.correct_answer : q.parts.some((p: any) => p.alternatives.some((a: any) => a))).length} ta</span></li>
                                                  <li>• Tuzuvchi: <span className="font-bold text-slate-900">{creatorName}</span></li>
                                             </ul>
                                        </div>
                                   </div>
                              </div>

                              {error && (
                                   <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-red-50 text-red-600 p-6 rounded-2xl flex items-center gap-4 font-bold border-2 border-red-100"
                                   >
                                        <AlertCircle />
                                        {error}
                                   </motion.div>
                              )}

                              <div className="flex gap-4">
                                   <button onClick={() => setStep(2)} className="btn-secondary !bg-slate-200 !text-slate-600 !shadow-none py-6 flex-1">
                                        <ArrowLeft />
                                        Orqaga
                                   </button>
                                   <button
                                        onClick={handleSaveTest}
                                        disabled={loading}
                                        className="btn-primary py-6 flex-[2] relative overflow-hidden"
                                   >
                                        {loading ? (
                                             <div className="flex items-center gap-3">
                                                  <div className="w-6 h-6 border-4 border-white border-t-transparent animate-spin rounded-full"></div>
                                                  Saqlanmoqda...
                                             </div>
                                        ) : (
                                             <>
                                                  <Send />
                                                  {isEdit ? 'O\'zgarishlarni Saqlash' : 'Tasdiqlash va Yaratish'}
                                             </>
                                        )}
                                   </button>
                              </div>
                         </motion.div>
                    )}
               </AnimatePresence>

               <p className="text-center text-slate-400 font-medium mt-16 pb-12">
                    © 2026 Titul Test Platformasi. <span className="text-primary italic">Premium Edition</span>.
               </p>
          </div>
     );
}
