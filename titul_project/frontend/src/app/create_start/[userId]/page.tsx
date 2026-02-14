"use client";

import { useState, useEffect, useRef, useCallback, memo } from "react";
import { useSearchParams, useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Plus, CheckCircle2, AlertCircle, Info, Send, Save, CreditCard, Layout, Hash, FunctionSquare, CornerDownLeft, X, MoveRight, ChevronRight, ChevronLeft, Trash, User, Timer, ArrowRight, ArrowLeft, AlertTriangle, XCircle, Edit3, Clock, ChevronDown } from "lucide-react";
import api from "@/lib/api";
import ScientificKeyboard from "@/components/ScientificKeyboard";
import { ChoiceQuestionRow, ManualQuestionRow, WritingQuestionCard } from "./QuestionComponents";
import { toast } from "react-hot-toast";

const SUBJECTS = ["Matematika", "Tarix", "Ona tili va adabiyot", "Kimyo", "Biologiya", "Fizika", "Geografiya", "Rus tili", "Qoraqalpoq tili"];

export default function CreateTestPage() {
     const searchParams = useSearchParams();
     const router = useRouter();
     const { userId } = useParams();
     const creatorNameParam = searchParams.get("name") || "";
     const telegramId = userId;
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
     const [focusedAlt, setFocusedAlt] = useState<{ qIndex: number; pIndex: number; aIndex: number } | null>(null);
     const [focusedPoints, setFocusedPoints] = useState<{ qIndex: number } | null>(null);
     const [keyboardVisible, setKeyboardVisible] = useState(false);
     const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

     // Scroll focused input into view when keyboard opens
     useEffect(() => {
          if (keyboardVisible && (focusedAlt || focusedPoints)) {
               const key = focusedAlt
                    ? `${focusedAlt.qIndex}-${focusedAlt.pIndex}-${focusedAlt.aIndex}`
                    : `${focusedPoints?.qIndex}-points`;

               const timer = setTimeout(() => {
                    const el = inputRefs.current[key];
                    if (el) {
                         el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
               }, 300); // Wait for keyboard animation
               return () => clearTimeout(timer);
          }
     }, [keyboardVisible, focusedAlt, focusedPoints]);

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
     const [showTips, setShowTips] = useState(true);

     const showToast = (message: string, type: "success" | "error" | "warning" = "success") => {
          if (type === "success") toast.success(message);
          else if (type === "error") toast.error(message);
          else toast(message, { icon: "⚠️" });
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

     const [userData, setUserData] = useState<any>(null);
     const [pricePerQuestion, setPricePerQuestion] = useState(100);
     const [pricePerTest, setPricePerTest] = useState(1000);

     useEffect(() => {
          const fetchData = async () => {
               try {
                    const [userRes, settingsRes] = await Promise.all([
                         api.get(`/users/${telegramId}/`),
                         api.get("/admin/settings/")
                    ]);
                    setUserData(userRes.data);
                    setPricePerQuestion(Number(settingsRes.data.price_per_question) || 100);
                    setPricePerTest(Number(settingsRes.data.price_per_test) || 1000);
               } catch (err) {
                    console.error("Fetch initial data error", err);
               }
          };
          fetchData();
     }, [telegramId]);

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
                              const localDate = new Date(test.expires_at);
                              const offset = localDate.getTimezoneOffset() * 60000;
                              const localISOTime = new Date(localDate.getTime() - offset).toISOString().slice(0, 16);
                              setExpiresAt(localISOTime);
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
     const addPart = useCallback((qIndex: number) => {
          setQuestions(prev => {
               const newQs = [...prev];
               const q = { ...newQs[qIndex] };
               q.parts = [...q.parts, { alternatives: [""] }];
               newQs[qIndex] = q;
               return newQs;
          });
     }, []);

     const removePart = useCallback((qIndex: number, pIndex: number) => {
          setQuestions(prev => {
               const newQs = [...prev];
               const q = { ...newQs[qIndex] };
               if (q.parts.length > 1) {
                    q.parts = q.parts.filter((_: any, i: number) => i !== pIndex);
                    newQs[qIndex] = q;
                    return newQs;
               }
               return prev;
          });
     }, []);

     const addAlternative = useCallback((qIndex: number, pIndex: number) => {
          setQuestions(prev => {
               const newQs = [...prev];
               const q = { ...newQs[qIndex] };
               const newParts = [...q.parts];
               const p = { ...newParts[pIndex] };
               p.alternatives = [...p.alternatives, ""];
               newParts[pIndex] = p;
               q.parts = newParts;
               newQs[qIndex] = q;
               return newQs;
          });
     }, []);

     const removeAlternative = useCallback((qIndex: number, pIndex: number, aIndex: number) => {
          setQuestions(prev => {
               const newQs = [...prev];
               const q = { ...newQs[qIndex] };
               const newParts = [...q.parts];
               const p = { ...newParts[pIndex] };
               if (p.alternatives.length > 1) {
                    p.alternatives = p.alternatives.filter((_: string, i: number) => i !== aIndex);
                    newParts[pIndex] = p;
                    q.parts = newParts;
                    newQs[qIndex] = q;
                    return newQs;
               }
               return prev;
          });
     }, []);

     const updateAlternative = useCallback((qIndex: number, pIndex: number, aIndex: number, value: string) => {
          setQuestions(prev => {
               const newQs = [...prev];
               const q = { ...newQs[qIndex] };
               const newParts = [...q.parts];
               const p = { ...newParts[pIndex] };
               const newAlts = [...p.alternatives];
               newAlts[aIndex] = value;
               p.alternatives = newAlts;
               newParts[pIndex] = p;
               q.parts = newParts;
               newQs[qIndex] = q;
               return newQs;
          });
     }, []);

     const insertChar = useCallback((char: string) => {
          if (!focusedAlt && !focusedPoints) return;

          const key = focusedAlt
               ? `${focusedAlt.qIndex}-${focusedAlt.pIndex}-${focusedAlt.aIndex}`
               : `${focusedPoints?.qIndex}-points`;

          const input = inputRefs.current[key];
          if (!input) return;

          const start = input.selectionStart || 0;
          const end = input.selectionEnd || 0;

          setQuestions(prevQs => {
               const newQs = [...prevQs];
               if (focusedAlt) {
                    const { qIndex, pIndex, aIndex } = focusedAlt;
                    const q = { ...newQs[qIndex] };
                    const newParts = [...q.parts];
                    const p = { ...newParts[pIndex] };
                    const newAlts = [...p.alternatives];

                    const currentVal = newAlts[aIndex] || "";
                    newAlts[aIndex] = currentVal.substring(0, start) + char + currentVal.substring(end);

                    p.alternatives = newAlts;
                    newParts[pIndex] = p;
                    q.parts = newParts;
                    newQs[qIndex] = q;
               } else if (focusedPoints) {
                    const { qIndex } = focusedPoints;
                    const q = { ...newQs[qIndex] };
                    const currentVal = q.points.toString();
                    const newVal = currentVal.substring(0, start) + char + currentVal.substring(end);
                    q.points = newVal;
                    newQs[qIndex] = q;
               }
               return newQs;
          });

          // Restore focus and move cursor
          setTimeout(() => {
               input.focus();
               input.setSelectionRange(start + char.length, start + char.length);
          }, 0);
     }, [focusedAlt, focusedPoints]);

     const handleBackspace = useCallback(() => {
          if (!focusedAlt && !focusedPoints) return;

          const key = focusedAlt
               ? `${focusedAlt.qIndex}-${focusedAlt.pIndex}-${focusedAlt.aIndex}`
               : `${focusedPoints?.qIndex}-points`;

          const input = inputRefs.current[key];
          if (!input) return;

          const start = input.selectionStart || 0;
          const end = input.selectionEnd || 0;
          if (start === 0 && start === end) return;

          setQuestions(prevQs => {
               const newQs = [...prevQs];
               if (focusedAlt) {
                    const { qIndex, pIndex, aIndex } = focusedAlt;
                    const q = { ...newQs[qIndex] };
                    const newParts = [...q.parts];
                    const p = { ...newParts[pIndex] };
                    const newAlts = [...p.alternatives];

                    const currentVal = newAlts[aIndex] || "";
                    if (start === end) {
                         newAlts[aIndex] = currentVal.substring(0, start - 1) + currentVal.substring(end);
                    } else {
                         newAlts[aIndex] = currentVal.substring(0, start) + currentVal.substring(end);
                    }

                    p.alternatives = newAlts;
                    newParts[pIndex] = p;
                    q.parts = newParts;
                    newQs[qIndex] = q;
               } else if (focusedPoints) {
                    const { qIndex } = focusedPoints;
                    const q = { ...newQs[qIndex] };
                    const currentVal = q.points.toString();
                    let newVal = "";
                    if (start === end) {
                         newVal = currentVal.substring(0, start - 1) + currentVal.substring(end);
                    } else {
                         newVal = currentVal.substring(0, start) + currentVal.substring(end);
                    }
                    q.points = newVal;
                    newQs[qIndex] = q;
               }
               return newQs;
          });

          // Restore focus and move cursor back
          setTimeout(() => {
               input.focus();
               const newPos = start === end ? Math.max(0, start - 1) : start;
               input.setSelectionRange(newPos, newPos);
          }, 0);
     }, [focusedAlt, focusedPoints]);

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

     const handleChoice = useCallback((qIndex: number, choice: string) => {
          setQuestions(prev => {
               const newQuestions = [...prev];
               newQuestions[qIndex] = { ...newQuestions[qIndex], correct_answer: choice };
               return newQuestions;
          });
     }, []);

     const addWritingQuestion = () => {
          const nextNum = questions.length + 1;
          const isLanguage = ["Ona tili va adabiyot", "Rus tili", "Qoraqalpoq tili"].includes(subject);
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

     const updatePoints = useCallback((qIndex: number, value: string) => {
          setQuestions(prev => {
               const newQs = [...prev];
               newQs[qIndex] = { ...newQs[qIndex], points: parseFloat(value) || 0 };
               return newQs;
          });
     }, []);

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
                    expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
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
                         onClick={() => router.push(`/my_tests/${telegramId}`)}
                         className="btn-primary w-full"
                    >
                         Testlarim Sahifasiga O'tish
                    </button>
               </motion.div>
          </div>
     );

     return (
          <div className="max-w-5xl mx-auto px-4 py-8 md:py-16">
               <AnimatePresence>
                    {showTips && (
                         <motion.div
                              initial={{ opacity: 0, y: -20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className="mb-10 bg-gradient-to-br from-indigo-500 to-primary p-1 rounded-[2.5rem] shadow-xl shadow-primary/20"
                         >
                              <div className="bg-white/95 backdrop-blur-sm rounded-[2.4rem] p-6 md:p-8 relative overflow-hidden">
                                   {/* Decorative background element */}
                                   <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 pointer-events-none" />

                                   <button
                                        onClick={() => setShowTips(false)}
                                        className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all z-10"
                                   >
                                        <X size={20} />
                                   </button>

                                   <div className="flex flex-col md:flex-row gap-6 items-start relative z-10">
                                        <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-primary/30">
                                             <AlertTriangle size={28} />
                                        </div>

                                        <div className="flex-grow">
                                             <h3 className="text-xl font-black text-slate-800 mb-4 flex items-center gap-2">
                                                  Muhim Eslatmalar & Maslahatlar
                                             </h3>

                                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                  <div className="space-y-3">
                                                       <div className="flex gap-3 text-sm text-slate-600 font-medium leading-relaxed italic">
                                                            <div className="w-1.5 h-1.5 bg-primary/40 rounded-full mt-2 shrink-0" />
                                                            Bepul testlar limiti: Har bir foydalanuvchi uchun 5 ta bepul test yaratish imkoniyati mavjud.
                                                       </div>
                                                       <div className="flex gap-3 text-sm text-slate-600 font-medium leading-relaxed italic">
                                                            <div className="w-1.5 h-1.5 bg-primary/40 rounded-full mt-2 shrink-0" />
                                                            Vaqtni belgilash: Test tugash vaqtini 1 haftadan uzoqroq qilib belgilab bo'lmaydi.
                                                       </div>
                                                  </div>
                                                  <div className="space-y-3">
                                                       <div className="flex gap-3 text-sm text-slate-600 font-medium leading-relaxed italic">
                                                            <div className="w-1.5 h-1.5 bg-primary/40 rounded-full mt-2 shrink-0" />
                                                            Savollar: Yozma savollar uchun bir nechta to'g'ri variantlarni (alternativlar) kiritishingiz mumkin.
                                                       </div>
                                                       <div className="flex gap-3 text-sm text-slate-600 font-medium leading-relaxed italic">
                                                            <div className="w-1.5 h-1.5 bg-primary/40 rounded-full mt-2 shrink-0" />
                                                            Ballash: Har bir savol uchun individual ball belgilash imkoniyati mavjud (step 2).
                                                       </div>
                                                  </div>
                                             </div>
                                        </div>
                                   </div>
                              </div>
                         </motion.div>
                    )}
               </AnimatePresence>

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
                                        <div className="flex-grow">
                                             <h2 className="text-3xl font-black font-display text-slate-900">{isEdit ? 'Testni Tahrirlash' : 'Tuzuvchi Ma\'lumotlari'}</h2>
                                             <p className="text-slate-400 font-medium italic">
                                                  {isEdit ? 'Mavjud test ma\'lumotlarini yangilang' : 'Imtihon varog\'i profili uchun'}
                                             </p>
                                        </div>

                                        {!isEdit && userData && (
                                             <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-end">
                                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Bepul testlar</span>
                                                  <div className="flex gap-1">
                                                       {[1, 2, 3, 4, 5].map(i => (
                                                            <div
                                                                 key={i}
                                                                 className={`w-3 h-3 rounded-full ${i <= (userData.free_tests_used || 0) ? 'bg-slate-300' : 'bg-primary'}`}
                                                                 title={i <= (userData.free_tests_used || 0) ? 'Ishlatilgan' : 'Mavjud'}
                                                            />
                                                       ))}
                                                  </div>
                                                  <span className="text-[11px] font-bold text-slate-500 mt-2">
                                                       {5 - (userData.free_tests_used || 0)} ta qoldi
                                                  </span>
                                             </div>
                                        )}
                                   </div>

                                   {!isEdit && userData && userData.free_tests_used >= 5 && (
                                        <div className="bg-primary/5 border border-primary/10 p-5 rounded-3xl mb-8 flex items-start gap-4">
                                             <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0 mt-1">
                                                  <CreditCard size={20} />
                                             </div>
                                             <div>
                                                  <p className="text-slate-900 font-bold mb-1">Pullik test yaratish</p>
                                                  <p className="text-sm text-slate-500 leading-relaxed">
                                                       Siz barcha bepul testlaringizdan foydalanib bo'ldingiz. Ushbu test uchun <b>{pricePerTest.toLocaleString('ru-RU')} so'm</b> hisobingizdan yechiladi.
                                                       Hozirgi balans: <b>{userData.balance.toLocaleString('ru-RU')} so'm</b>
                                                  </p>
                                             </div>
                                        </div>
                                   )}

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
                                                       className="select-premium !border-primary/20 !bg-primary/[0.02] disabled:opacity-40"
                                                       value={submissionMode}
                                                       onChange={(e) => setSubmissionMode(e.target.value)}
                                                       disabled={isEdit}
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
                                             q.question_type === "choice" ? (
                                                  <ChoiceQuestionRow
                                                       key={`choice-${idx}`}
                                                       idx={idx}
                                                       q={q}
                                                       handleChoice={handleChoice}
                                                  />
                                             ) : q.question_type === "manual" ? (
                                                  <ManualQuestionRow
                                                       key={`manual-${q.question_number}`}
                                                       idx={idx}
                                                       q={q}
                                                       subject={subject}
                                                       inputRefs={inputRefs}
                                                       setKeyboardVisible={setKeyboardVisible}
                                                       setFocusedPoints={setFocusedPoints}
                                                       updatePoints={updatePoints}
                                                  />
                                             ) : null
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
                                        {questions.filter(q => q.question_type === "writing").map((q) => {
                                             const idx = questions.indexOf(q);
                                             return (
                                                  <WritingQuestionCard
                                                       key={`writing-${q.question_number}`}
                                                       idx={idx}
                                                       q={q}
                                                       inputRefs={inputRefs}
                                                       setFocusedAlt={setFocusedAlt}
                                                       setFocusedPoints={setFocusedPoints}
                                                       setKeyboardVisible={setKeyboardVisible}
                                                       updateAlternative={updateAlternative}
                                                       removeAlternative={removeAlternative}
                                                       addAlternative={addAlternative}
                                                       addPart={addPart}
                                                       removePart={removePart}
                                                       updatePoints={updatePoints}
                                                  />
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

               <ScientificKeyboard
                    visible={keyboardVisible}
                    onClose={() => setKeyboardVisible(false)}
                    onInsert={insertChar}
                    onBackspace={handleBackspace}
               />

               {/* Content Push Spacer */}
               <div className={`transition-all duration-300 ${keyboardVisible ? 'h-[400px]' : 'h-0'}`} />
          </div >
     );
}
