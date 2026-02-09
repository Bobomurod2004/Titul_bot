"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
     Plus, Send, BookOpen, AlertCircle, ChevronDown, CheckCircle2,
     User, Timer, ArrowRight, ArrowLeft, Info, AlertTriangle, XCircle, Edit3, Trash2, Clock
} from "lucide-react";
import api from "@/lib/api";

const SUBJECTS = ["Matematika", "Tarix", "Ona tili", "Ingliz tili", "Kimyo", "Biologiya", "Fizika", "Geografiya", "Rus tili", "Qoraqalpoq tili"];

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
     const [subType, setSubType] = useState<string | null>(null);

     // Questions state refined for parts and alternatives
     const [questions, setQuestions] = useState<any[]>([]);

     // Initialize questions based on subject
     useEffect(() => {
          if (isEdit) return;

          // Initialize with 35 choice questions
          const newQs = Array.from({ length: 35 }, (_, i) => ({
               question_number: i + 1,
               question_type: "choice",
               correct_answer: "",
               points: 1.0,
               parts: [{ alternatives: [""] }]
          }));
          setQuestions(newQs);
     }, [subject, subType, isEdit]);

     // UI State
     const [loading, setLoading] = useState(false);
     const [initialLoading, setInitialLoading] = useState(isEdit);
     const [showSuccess, setShowSuccess] = useState(false);
     const [accessCode, setAccessCode] = useState("");

     // Premium Toast State
     const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "warning" } | null>(null);

     const showToast = (message: string, type: "success" | "error" | "warning" = "success") => {
          setToast({ message, type });
          setTimeout(() => setToast(null), 4000);
     };

     const parseBackendError = (data: any): string => {
          if (!data) return "Xatolik yuz berdi";
          if (typeof data === 'string') return data;
          if (data.detail) return data.detail;

          // Recursive extraction of messages from nested objects (Django Rest Framework style)
          const errors: string[] = [];

          const extract = (obj: any, prefix = "") => {
               if (typeof obj === 'string') {
                    errors.push(`${prefix}${obj}`);
               } else if (Array.isArray(obj)) {
                    obj.forEach(val => extract(val, prefix));
               } else if (typeof obj === 'object') {
                    Object.entries(obj).forEach(([key, value]) => {
                         // Translate common keys or leave as is if they are numbers (question indexes)
                         let translatedKey = key;
                         if (key === "questions") translatedKey = "Savollar: ";
                         else if (key === "correct_answer") translatedKey = "Javob";
                         else if (key === "points") translatedKey = "Ball";
                         else if (key === "title") translatedKey = "Test nomi";
                         else if (!isNaN(Number(key))) translatedKey = `${Number(key) + 1}-savol: `; // Question index to number

                         const finalPrefix = translatedKey === key ? "" : translatedKey;
                         extract(value, prefix + finalPrefix);
                    });
               }
          };

          extract(data);
          return errors.length > 0 ? errors.join(" | ") : "Ma'lumotlarda xatolik aniqlandi";
     };

     // Load initial data for edit mode
     useEffect(() => {
          if (isEdit) {
               const fetchTest = async () => {
                    try {
                         const res = await api.get(`/tests/${editId}/`);
                         const test = res.data;
                         setTitle(test.title);
                         setSubject(test.subject);
                         setSubType(test.sub_type || null);
                         setCreatorName(test.creator_name || "");
                         if (test.expires_at) {
                              setExpiresAt(new Date(test.expires_at).toISOString().slice(0, 16));
                         }
                         setSubmissionMode(test.submission_mode || "single");

                         // Map existing questions to our state
                         const existingQs = test.questions || [];
                         const mappedQs = existingQs.map((q: any) => {
                              if (q.question_type === 'writing') {
                                   try {
                                        const parsed = JSON.parse(q.correct_answer);
                                        return {
                                             ...q,
                                             parts: Array.isArray(parsed) ? parsed.map((p: any) => ({ alternatives: Array.isArray(p) ? p : [p] })) : [{ alternatives: [q.correct_answer] }]
                                        };
                                   } catch {
                                        return { ...q, parts: [{ alternatives: [q.correct_answer] }] };
                                   }
                              }
                              return {
                                   ...q,
                                   parts: q.parts || [{ alternatives: [""] }]
                              };
                         });

                         // Ensure at least 35 questions if edited test had fewer
                         if (mappedQs.length < 35) {
                              const extraQs = Array.from({ length: 35 - mappedQs.length }, (_, i) => ({
                                   question_number: mappedQs.length + i + 1,
                                   question_type: "choice",
                                   correct_answer: "",
                                   points: 1.0,
                                   parts: [{ alternatives: [""] }]
                              }));
                              setQuestions([...mappedQs, ...extraQs]);
                         } else {
                              setQuestions(mappedQs);
                         }

                         setAccessCode(test.access_code);
                    } catch (err) {
                         showToast("Test ma'lumotlarini yuklashda xatolik yuz berdi.", "error");
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
          const nextNum = questions.length + 1;
          const isLanguage = ["Ona tili", "Rus tili", "Qoraqalpoq tili"].includes(subject);
          const isScience = ["Matematika", "Fizika", "Geografiya", "Tarix"].includes(subject);
          const isChemBio = ["Kimyo", "Biologiya"].includes(subject);

          let maxCount = 45;
          if (isChemBio) {
               maxCount = (subType === "tur2") ? 43 : 40;
          }

          if (nextNum > maxCount) {
               showToast(`Maksimal savollar soniga yetdingiz: ${maxCount}`, "warning");
               return;
          }

          let qType = "writing";
          let qPoints = 2.0;

          // SPECIAL RULES PER USER REQUEST:
          // 1. Math, Physics, History, Geo: 1-45 are all Writing
          if (isScience) {
               qType = "writing";
               qPoints = 2.0;
          }
          // 2. Language subjects: 36-44 Writing, 45 Manual
          else if (isLanguage) {
               if (nextNum === 45) {
                    qType = "manual";
                    qPoints = 10;
               } else {
                    qType = "writing";
                    qPoints = 2.0;
               }
          }
          // 3. Chemistry/Biology: Existing Tur1/Tur2 rules
          else if (isChemBio) {
               if (subType === "tur2" && nextNum >= 41) {
                    qType = "manual";
                    if (subject === "Kimyo") qPoints = 25;
                    else if (nextNum === 41) qPoints = 30;
                    else if (nextNum === 42) qPoints = 35;
                    else qPoints = 10;
               }
          }

          setQuestions([
               ...questions,
               {
                    question_number: nextNum,
                    question_type: qType,
                    correct_answer: "",
                    points: qPoints,
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
               showToast("Tuzuvchi ism-familiyasini kiriting!", "warning");
               return false;
          }
          if (!title.trim()) {
               showToast("Test nomini kiriting!", "warning");
               return false;
          }
          return true;
     };

     const handleSaveTest = async () => {
          // Detailed Client-Side Validation
          for (const q of questions) {
               if (q.question_type === 'choice') {
                    if (q.correct_answer === "" && q.question_number <= 35) {
                         showToast(`${q.question_number}-savol javobi belgilanmagan!`, "warning");
                         return;
                    }
               } else if (q.question_type === 'writing') {
                    const hasSomeAnswer = q.parts.some((p: any) => p.alternatives.some((a: any) => a.trim() !== ""));
                    if (!hasSomeAnswer) {
                         showToast(`${q.question_number}-savolga kalit kiritilmagan!`, "warning");
                         return;
                    }
               }
               // Manual scoring questions usually don't need required answers, but points must be valid
               if (isNaN(q.points) || q.points < 0) {
                    showToast(`${q.question_number}-savol bali noto'g'ri!`, "warning");
                    return;
               }
          }

          if (expiresAt) {
               const expires = new Date(expiresAt);
               const now = new Date();
               const maxExpiry = new Date();
               maxExpiry.setDate(maxExpiry.getDate() + 7);

               if (expires <= now) {
                    showToast("Tugash vaqti noto'g'ri!", "error");
                    return;
               }
               if (expires > maxExpiry) {
                    showToast("Muddat 1 haftadan oshmasligi kerak!", "warning");
                    return;
               }
          }

          setLoading(true);
          try {
               const payload = {
                    creator_id: Number(telegramId),
                    creator_name: creatorName,
                    title,
                    subject,
                    sub_type: subType,
                    submission_mode: submissionMode,
                    expires_at: expiresAt || null,
                    questions: questions.filter(q => {
                         if (q.question_type === 'choice') return q.correct_answer !== "";
                         if (q.question_type === 'manual') return true;
                         return q.parts.some((p: any) => p.alternatives.some((a: any) => a !== ""));
                    }).map(q => {
                         let ans = q.correct_answer;
                         if (q.question_type === 'writing') {
                              ans = JSON.stringify(q.parts.map((p: any) => p.alternatives.filter((a: any) => a !== "")));
                         } else if (q.question_type === 'manual') {
                              // Manual savollar qo'lda baholanadi, correct_answer kerak emas
                              ans = null;
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
               showToast(isEdit ? "O'zgarishlar saqlandi!" : "Test yaratildi!", "success");
          } catch (err: any) {
               const errorData = err.response?.data;
               const errorMessage = parseBackendError(errorData);
               showToast(errorMessage, "error");
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

                                        {(subject === "Kimyo" || subject === "Biologiya") && (
                                             <div className="space-y-3">
                                                  <label className="text-sm font-bold text-slate-500 ml-1 uppercase tracking-wider">Test Turi (Turni tanlang)</label>
                                                  <div className="relative">
                                                       <select
                                                            className="select-premium border-secondary/20"
                                                            value={subType || "tur1"}
                                                            onChange={(e) => setSubType(e.target.value)}
                                                       >
                                                            <option value="tur1">1-tur (faqat 1–40 savollar)</option>
                                                            <option value="tur2">2-tur (41–43 ball kiritish bilan)</option>
                                                       </select>
                                                       <ChevronDown size={20} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                                  </div>
                                             </div>
                                        )}

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
                                             <div className="space-y-3">
                                                  <label className="text-sm font-bold text-slate-500 ml-1 uppercase tracking-wider flex items-center gap-2">
                                                       <Clock size={16} className="text-amber-500" /> Test Tugash Vaqti (Ixtiyoriy)
                                                  </label>
                                                  <input
                                                       type="datetime-local"
                                                       className="input-premium border-amber-100 bg-amber-50/10 focus:border-amber-500 focus:ring-amber-500/10"
                                                       value={expiresAt}
                                                       onChange={(e) => setExpiresAt(e.target.value)}
                                                  />
                                                  <p className="text-[10px] text-slate-400 italic ml-1">Belgilangan vaqtdan keyin test avtomatik yakunlanadi.</p>
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
                                        <h2 className="text-2xl font-black font-display text-slate-800">Test Javoblari</h2>
                                   </div>

                                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                        {questions.map((q, idx) => (
                                             q.question_type === "choice" && (
                                                  <div
                                                       key={idx}
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
                                                                           className={`circle-check !w-8 !h-8 !text-xs sm:!w-10 sm:!h-10 sm:!text-sm ${q.correct_answer === choice ? 'active' : ''}`}
                                                                      >
                                                                           {choice}
                                                                      </div>
                                                                 ))
                                                                 : ["A", "B", "C", "D"].map((choice) => (
                                                                      <div
                                                                           key={choice}
                                                                           onClick={() => handleChoice(idx, choice)}
                                                                           className={`circle-check !w-10 !h-10 !text-sm sm:!w-12 sm:!h-12 sm:!text-base ${q.correct_answer === choice ? 'active' : ''}`}
                                                                      >
                                                                           {choice}
                                                                      </div>
                                                                 ))
                                                            }
                                                       </div>
                                                  </div>
                                             )
                                        ))}
                                        {questions.map((q, idx) => (
                                             q.question_type === "manual" && (
                                                  <div key={idx} className="bg-white p-6 rounded-3xl border-2 border-slate-100 flex items-center justify-between gap-4">
                                                       <div className="flex items-center gap-4">
                                                            <span className="w-10 h-10 bg-secondary/5 rounded-xl flex items-center justify-center font-black text-secondary text-sm border border-secondary/10">
                                                                 {q.question_number}
                                                            </span>
                                                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                                                                 {q.question_number === 45 && ["Ona tili", "Rus tili", "Qoraqalpoq tili"].includes(subject) ? "Esse Bali" : "Qo'lda kiritiladigan ball"}
                                                            </span>
                                                       </div>
                                                       <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-black text-slate-400">MAX:</span>
                                                            <input
                                                                 type="number"
                                                                 step="0.1"
                                                                 className="w-16 h-8 bg-slate-50 border border-slate-200 rounded-lg text-center text-xs font-black text-primary"
                                                                 value={q.points}
                                                                 onChange={(e) => updatePoints(idx, e.target.value)}
                                                            />
                                                       </div>
                                                  </div>
                                             )
                                        ))}
                                   </div>
                              </div>

                              {/* Writing Questions Section */}
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
                                                                                     <Plus size={14} /> Kalit qo'shish
                                                                                </button>
                                                                                {q.parts.length > 1 && (
                                                                                     <button
                                                                                          onClick={() => removePart(actualIdx, pIdx)}
                                                                                          className="p-1 text-red-400 hover:text-red-600 transition-colors"
                                                                                     >
                                                                                          <Trash2 size={16} />
                                                                                     </button>
                                                                                )}
                                                                           </div>
                                                                      </div>

                                                                      <div className="space-y-4">
                                                                           <div className="flex items-center justify-between px-1">
                                                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">To'g'ri javob variantlari (Kalitlar)</span>
                                                                           </div>

                                                                           <div className="flex flex-col gap-3">
                                                                                {part.alternatives.map((alt: string, aIdx: number) => (
                                                                                     <div key={aIdx} className="relative group/alt flex items-center gap-3">
                                                                                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 shrink-0">
                                                                                               {String.fromCharCode(65 + aIdx)}
                                                                                          </div>
                                                                                          <div className="relative flex-1">
                                                                                               <input
                                                                                                    type="text"
                                                                                                    placeholder="To'g'ri javobni kiriting..."
                                                                                                    className="w-full !py-4 !px-5 !rounded-2xl border-2 border-white bg-white focus:border-primary/40 outline-none transition-all text-base font-bold shadow-sm"
                                                                                                    value={alt}
                                                                                                    onChange={(e) => updateAlternative(actualIdx, pIdx, aIdx, e.target.value)}
                                                                                               />
                                                                                               {part.alternatives.length > 1 && (
                                                                                                    <button
                                                                                                         onClick={() => removeAlternative(actualIdx, pIdx, aIdx)}
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
                                        })}
                                   </div>
                              </div>

                              <div className="flex flex-col sm:flex-row gap-4 pt-10">
                                   <button
                                        onClick={() => setStep(1)}
                                        className="flex-1 py-5 px-8 rounded-2xl border-2 border-slate-100 font-bold text-slate-400 hover:bg-slate-50 transition-all flex items-center justify-center gap-3"
                                   >
                                        <ArrowLeft /> Orqaga
                                   </button>
                                   <button
                                        onClick={handleSaveTest}
                                        disabled={loading}
                                        className="flex-[2] btn-primary py-5 text-xl"
                                   >
                                        {loading ? 'Saqlanmoqda...' : isEdit ? 'O\'zgarishlarni Saqlash' : 'Testni Yakunlash va Saqlash'}
                                        <Send />
                                   </button>
                              </div>
                         </motion.div>
                    )}
               </AnimatePresence>

               <AnimatePresence>
                    {toast && (
                         <motion.div
                              initial={{ opacity: 0, y: 50, scale: 0.8 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                              className={`fixed bottom-10 left-1/2 -translate-x-1/2 px-8 py-4 rounded-[2rem] shadow-2xl z-[100] font-bold flex items-center gap-4 min-w-[320px] backdrop-blur-xl border-2 ${toast.type === "success" ? "bg-emerald-500/90 text-white border-emerald-400/50 shadow-emerald-500/20" :
                                   toast.type === "error" ? "bg-rose-500/90 text-white border-rose-400/50 shadow-rose-500/20" :
                                        "bg-amber-500/90 text-white border-amber-400/50 shadow-amber-500/20"
                                   }`}
                         >
                              <div className="bg-white/20 p-2 rounded-xl">
                                   {toast.type === "success" ? <CheckCircle2 size={24} /> :
                                        toast.type === "error" ? <XCircle size={24} /> :
                                             <AlertTriangle size={24} />}
                              </div>
                              <div className="flex-1">
                                   <p className="text-xs uppercase tracking-[0.2em] opacity-70 mb-0.5">{toast.type === "success" ? "Muvaffaqiyatli" : "Ogohlantirish"}</p>
                                   <p className="text-base leading-tight">{toast.message}</p>
                              </div>
                         </motion.div>
                    )}
               </AnimatePresence>
          </div>
     );
}
