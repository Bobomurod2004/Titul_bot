"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
     ArrowLeft, Users, Trophy, Target, Calendar,
     Download, Search, Filter, ChevronRight,
     CheckCircle2, XCircle, Clock, Hash,
     ExternalLink, Copy, HelpCircle, Edit3,
     Eye, AlertCircle, Check, X, User as UserIcon,
     MessageSquare, Info, Plus
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-hot-toast";

export default function TestDetailPage() {
     const { id, userId } = useParams();
     const router = useRouter();
     const telegramId = userId;

     const [test, setTest] = useState<any>(null);
     const [submissions, setSubmissions] = useState<any[]>([]);
     const [loading, setLoading] = useState(true);
     const [searchTerm, setSearchTerm] = useState("");
     const [copied, setCopied] = useState(false);

     // Analytics Deep Dive State
     const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
     const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
     const [isTimeModalOpen, setIsTimeModalOpen] = useState(false);
     const [updatingTime, setUpdatingTime] = useState(false);
     const [timeLeft, setTimeLeft] = useState<string>("");
     const [finishing, setFinishing] = useState(false);

     const processedSubmissions = useMemo(() => {
          if (!test || !submissions) return [];

          const groups: { [key: string]: any[] } = {};
          submissions.forEach(s => {
               // Composite key: ID + Name (normalized)
               const key = `${s.student_telegram_id}_${s.student_name.trim().toLowerCase()}`;
               if (!groups[key]) groups[key] = [];
               groups[key].push(s);
          });

          const results = Object.values(groups).map(subs => {
               const sorted = subs.sort((a, b) => a.attempt_number - b.attempt_number);
               const latest = sorted[sorted.length - 1];
               return {
                    ...latest,
                    attempts: sorted
               };
          });

          return results.sort((a, b) => {
               const aScore = test.is_calibrated ? parseFloat(a.scaled_score || 0) : parseFloat(a.score || 0);
               const bScore = test.is_calibrated ? parseFloat(b.scaled_score || 0) : parseFloat(b.score || 0);
               return bScore - aScore;
          });
     }, [submissions, test]);

     const maxAttempts = useMemo(() => {
          if (!test || test.submission_mode === 'single') return 1;
          let max = 0;
          processedSubmissions.forEach((s: any) => {
               if (s.attempts && s.attempts.length > max) max = s.attempts.length;
          });
          return max;
     }, [processedSubmissions, test]);

     useEffect(() => {
          if (!test?.is_active || !test?.expires_at) {
               setTimeLeft("");
               return;
          }

          const timer = setInterval(() => {
               const now = new Date().getTime();
               const target = new Date(test.expires_at).getTime();
               const diff = target - now;

               if (diff <= 0) {
                    setTimeLeft("Vaqt tugadi");
                    clearInterval(timer);
                    return;
               }

               const hours = Math.floor(diff / (1000 * 60 * 60));
               const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
               const seconds = Math.floor((diff % (1000 * 60)) / 1000);

               setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
          }, 1000);

          return () => clearInterval(timer);
     }, [test]);

     const fetchData = async () => {
          try {
               const [testRes, subRes] = await Promise.all([
                    api.get(`/tests/${id}/`),
                    api.get(`/submissions/test/${id}/`)
               ]);
               setTest(testRes.data);
               setSubmissions(subRes.data);
          } catch (err) {
               console.error(err);
               toast.error("Ma'lumotlarni yuklashda xatolik yuz berdi");
          } finally {
               setLoading(false);
          }
     };

     useEffect(() => {
          if (id) fetchData();
     }, [id]);

     const handleCopyLink = async () => {
          if (!test) return;
          try {
               // Faqat test kodini nusxalash (Foydalanuvchi so'roviga binoan)
               const textToCopy = test.access_code;

               // Try modern API first
               if (navigator.clipboard && window.isSecureContext) {
                    await navigator.clipboard.writeText(textToCopy);
               } else {
                    // Fallback for non-secure contexts
                    const textArea = document.createElement("textarea");
                    textArea.value = textToCopy;
                    textArea.style.position = "fixed";
                    textArea.style.left = "-999999px";
                    textArea.style.top = "-999999px";
                    document.body.appendChild(textArea);
                    textArea.focus();
                    textArea.select();
                    document.execCommand('copy');
                    textArea.remove();
               }

               setCopied(true);
               toast.success("Test kodi nusxalandi!");
               setTimeout(() => setCopied(false), 2000);
          } catch (err) {
               console.error('Copy error:', err);
               toast.error("Kod nusxalanmadi");
          }
     };

     const handleDownloadReport = async () => {
          try {
               const response = await api.get(`/tests/${id}/report/`, { responseType: 'blob' });
               const url = window.URL.createObjectURL(new Blob([response.data]));
               const link = document.createElement('a');
               link.href = url;
               link.setAttribute('download', `hisobot_${test.access_code}.pdf`);
               document.body.appendChild(link);
               link.click();
          } catch (err) {
               toast.error("PDF yuklashda xatolik!");
          }
     };

     const handleSendReport = async () => {
          if (!confirm("Test natijalarini botga yangidan yubormoqchimisiz?")) return;
          try {
               await api.post(`/tests/${test.id}/send_report/`);
               toast.success("Hisobot yuborish boshlandi. Botni tekshiring!");
          } catch (err) {
               toast.error("Hisobot yuborishda xatolik!");
          }
     };

     const handleUpdateTime = async (type: 'add' | 'set', value: any) => {
          setUpdatingTime(true);
          try {
               let newExpiresAt = new Date();

               if (type === 'add') {
                    const current = test.expires_at ? new Date(test.expires_at) : new Date();
                    const base = current > new Date() ? current : new Date();
                    newExpiresAt = new Date(base.getTime() + value * 60000);
               } else {
                    newExpiresAt = value;
               }

               await api.patch(`/tests/${test.id}/`, {
                    expires_at: newExpiresAt.toISOString()
               });

               await fetchData();
               setIsTimeModalOpen(false);
          } catch (err) {
               toast.error("Vaqtni yangilashda xatolik!");
          } finally {
               setUpdatingTime(false);
          }
     };

     const handleFinishTest = async () => {
          if (!confirm("Testni muddatidan oldin yakunlamoqchimisiz?")) return;
          setFinishing(true);
          try {
               await api.post(`/tests/${test.id}/finish/`);
               // Wait a bit for calibration to settle if needed, but the model handles it broad-sync for now
               await new Promise(r => setTimeout(r, 2000));
               await fetchData();
               setIsTimeModalOpen(false);
          } catch (err) {
               toast.error("Xatolik yuz berdi!");
          } finally {
               setFinishing(false);
          }
     };

     const openAnalysis = (submission: any) => {
          setSelectedSubmission(submission);
          setIsAnalysisOpen(true);
     };

     if (loading) return (
          <div className="min-h-screen flex items-center justify-center bg-slate-50/50">
               <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-primary border-t-transparent animate-spin rounded-full"></div>
                    <p className="text-slate-400 font-bold animate-pulse">Statistika yuklanmoqda...</p>
               </div>
          </div>
     );

     if (!test) return <div>Test topilmadi.</div>;


     const filteredSubmissions = processedSubmissions.filter((s: any) =>
          s.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.student_telegram_id.toString().includes(searchTerm)
     );

     return (
          <div className="max-w-7xl mx-auto px-4 py-12 md:py-20">
               {/* Header Nav */}
               <button
                    onClick={() => router.push(`/my_tests/${telegramId}`)}
                    className="flex items-center gap-2 text-slate-400 hover:text-primary font-bold mb-12 transition-colors group"
               >
                    <div className="p-2 bg-slate-100 rounded-xl group-hover:bg-primary/10 transition-colors">
                         <ArrowLeft size={20} />
                    </div>
                    Orqaga qaytish
               </button>

               {/* Main Header */}
               <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-16">
                    <div>
                         <div className="flex items-center gap-4 mb-4">
                              <span className="bg-primary/10 text-primary px-4 py-1.5 rounded-full text-xs font-black tracking-widest uppercase">
                                   {test.subject}
                              </span>
                              <span className={`px-4 py-1.5 rounded-full text-xs font-black tracking-widest uppercase ${test.is_active ? 'bg-secondary/10 text-secondary' : 'bg-slate-100 text-slate-400'}`}>
                                   {test.is_active ? 'Faol' : 'Yakunlangan'}
                              </span>
                         </div>
                         <h1 className="text-5xl font-black font-display text-slate-900 tracking-tight mb-4">{test.title}</h1>
                         <div className="flex flex-wrap gap-8 text-slate-400 font-bold">
                              <div className="flex items-center gap-2">
                                   <Hash size={18} className="text-primary" />
                                   Kod: <span className="text-slate-800">{test.access_code}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                   <Calendar size={18} className="text-primary" />
                                   Yaratildi: <span className="text-slate-800">{new Date(test.created_at).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                   <Clock size={18} className="text-amber-500" />
                                   Tugaydi: <span className="text-amber-600 font-black">
                                        {test.expires_at ? new Date(test.expires_at).toLocaleString('uz-UZ', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : "Cheksiz"}
                                   </span>
                              </div>
                              <div className="flex items-center gap-2">
                                   <HelpCircle size={18} className="text-primary" />
                                   Savollar: <span className="text-slate-800">{test.questions?.length || 0} ta</span>
                              </div>
                         </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                         <button
                              onClick={() => setIsTimeModalOpen(true)}
                              className="btn-secondary !bg-amber-500 !text-white hover:!bg-amber-600 shadow-lg shadow-amber-500/20 !py-4 border-none"
                         >
                              <Clock size={20} /> Vaqtni o'zgartirish
                         </button>
                         <button
                              onClick={() => router.push(`/create_start/${telegramId}?editId=${test.id}`)}
                              className="btn-secondary !bg-white !shadow-sm border border-slate-200 !py-4 hover:!bg-slate-50 !text-slate-600"
                         >
                              <Edit3 size={20} className="text-primary" /> Tahrirlash
                         </button>
                         <button
                              onClick={handleCopyLink}
                              className={`btn-secondary !bg-white !shadow-sm border border-slate-200 !py-4 transition-all !text-slate-600 ${copied ? '!text-secondary !border-secondary' : ''}`}
                         >
                              {copied ? <CheckCircle2 size={20} /> : <Copy size={20} className="text-primary" />}
                              {copied ? 'Kod nusxalandi' : 'Kodni nusxalash'}
                         </button>
                         <div className="flex flex-wrap gap-4">
                              <button
                                   onClick={handleSendReport}
                                   className="flex items-center gap-2 bg-secondary/10 text-secondary hover:bg-secondary/20 px-6 py-4 rounded-2xl font-black transition-all active:scale-95"
                              >
                                   <MessageSquare size={20} />
                                   Botga qayta yuborish
                              </button>
                              <button
                                   onClick={handleDownloadReport}
                                   className="flex items-center gap-2 bg-slate-900 text-white hover:bg-slate-800 px-6 py-4 rounded-2xl font-black transition-all active:scale-95 shadow-xl shadow-slate-200"
                              >
                                   <Download size={20} />
                                   PDF Natijalar
                              </button>
                         </div>
                    </div>
               </div>

               {/* Stats Grid */}
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
                    <StatCard
                         icon={<Users size={24} />}
                         label="Qatnashuvchilar"
                         value={test.submissions_count || 0}
                         sublabel="Jami talabalar"
                         color="primary"
                    />
                    <StatCard
                         icon={<Target size={24} />}
                         label="O'rtacha Ball"
                         value={test.average_score || 0}
                         sublabel="Umumiy samaradorlik"
                         color="secondary"
                    />
                    <StatCard
                         icon={<Trophy size={24} />}
                         label="Eng Yuqori Ball"
                         value={test.max_score || 0}
                         sublabel="Maksimal natija"
                         color="orange"
                    />
                    <StatCard
                         icon={<Clock size={24} />}
                         label="Qolgan Vaqt"
                         value={timeLeft || (test.is_active ? "Cheksiz" : "Yakunlangan")}
                         sublabel={test.is_active ? "Test yakunlanishiga" : "Test tugagan"}
                         color={test.is_active ? "amber" : "slate"}
                    />
               </div>

               {/* Participants Table */}
               <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
                    <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                         <div className="flex items-center gap-4">
                              <Users className="text-primary" />
                              <h2 className="text-2xl font-black font-display text-slate-800">Qatnashuvchilar Ro'yxati</h2>
                              <span className="bg-slate-100 text-slate-400 px-4 py-1 rounded-full text-xs font-black">
                                   {filteredSubmissions.length} ta
                              </span>
                         </div>
                         <div className="relative group min-w-[300px]">
                              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={20} />
                              <input
                                   type="text"
                                   placeholder="Ism yoki ID bo'yicha qidirish..."
                                   className="w-full bg-slate-50 border-none rounded-2xl py-3 pl-12 pr-4 text-sm font-bold outline-none ring-2 ring-transparent focus:ring-primary/10 focus:bg-white transition-all"
                                   value={searchTerm}
                                   onChange={(e) => setSearchTerm(e.target.value)}
                              />
                         </div>
                    </div>

                    <div className="overflow-x-auto">
                         <table className="w-full text-left border-collapse">
                              <thead>
                                   <tr className="bg-slate-50/50">
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">#</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">F.I.SH</th>
                                        {test.submission_mode === 'multiple' && Array.from({ length: maxAttempts }).map((_, i) => (
                                             <th key={i} className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">
                                                  {i + 1}-{test.is_points_based ? 'ball' : 'urinish'}
                                             </th>
                                        ))}
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Telegram ID</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">To'g'ri / Xato</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">To'plangan Ball</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Daraja</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Vaqt</th>
                                   </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                   <AnimatePresence mode="popLayout">
                                        {filteredSubmissions.map((sub, idx) => (
                                             <motion.tr
                                                  key={sub.id}
                                                  initial={{ opacity: 0 }}
                                                  animate={{ opacity: 1 }}
                                                  exit={{ opacity: 0 }}
                                                  onClick={() => openAnalysis(sub)}
                                                  className="group hover:bg-slate-50/50 transition-colors cursor-pointer"
                                             >
                                                  <td className="px-8 py-5 font-black text-slate-300 text-sm">{idx + 1}</td>
                                                  <td className="px-8 py-5">
                                                       <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-black text-xs uppercase">
                                                                 {sub.student_name.slice(0, 2)}
                                                            </div>
                                                            <span className="font-bold text-slate-700 group-hover:text-primary transition-colors">{sub.student_name}</span>
                                                       </div>
                                                  </td>
                                                  {test.submission_mode === 'multiple' && Array.from({ length: maxAttempts }).map((_, i) => {
                                                       const attempt = sub.attempts?.[i];
                                                       return (
                                                            <td key={i} className="px-8 py-5 text-center">
                                                                 {attempt ? (
                                                                      <div className="inline-flex items-center gap-1.5 font-bold text-xs">
                                                                           <span className="text-secondary">{test.is_points_based ? parseFloat(attempt.score).toFixed(1) : attempt.correct_count}</span>
                                                                           {!test.is_points_based && <span className="text-slate-200">|</span>}
                                                                           {!test.is_points_based && <span className="text-red-500">{attempt.wrong_count}</span>}
                                                                      </div>
                                                                 ) : (
                                                                      <span className="text-slate-200">-</span>
                                                                 )}
                                                            </td>
                                                       );
                                                  })}
                                                  <td className="px-8 py-5 font-medium text-slate-400 text-sm">{sub.student_telegram_id === 0 ? (
                                                       <span className="text-slate-300 italic">Veb-sayt</span>
                                                  ) : (
                                                       `@${sub.student_telegram_id}`
                                                  )}</td>
                                                  <td className="px-8 py-5 text-center">
                                                       <div className="inline-flex items-center gap-3 font-bold">
                                                            <div className="flex items-center gap-1 text-secondary">
                                                                 <Check size={14} strokeWidth={4} />
                                                                 <span>{sub.correct_count}</span>
                                                            </div>
                                                            <div className="w-[1px] h-3 bg-slate-200" />
                                                            <div className="flex items-center gap-1 text-red-500">
                                                                 <X size={14} strokeWidth={4} />
                                                                 <span>{sub.wrong_count}</span>
                                                            </div>
                                                       </div>
                                                  </td>
                                                  <td className="px-8 py-5 text-center">
                                                       <div className="inline-flex items-center gap-1.5 font-display font-black text-lg">
                                                            <span className="text-secondary">{test.is_calibrated ? parseFloat(sub.scaled_score || 0).toFixed(1) : parseFloat(sub.score).toFixed(1)}</span>
                                                            <span className="text-slate-200 text-sm">/</span>
                                                            <span className="text-slate-400 text-sm">{test.is_calibrated ? '100' : (test.total_points || (test.questions?.length || 0))}</span>
                                                       </div>
                                                  </td>
                                                  <td className="px-8 py-5 text-center">
                                                       <span className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest
                                                            ${sub.grade === 'A+' || sub.grade === 'A' ? 'bg-secondary/10 text-secondary' :
                                                                 sub.grade === 'B' || sub.grade === 'C' ? 'bg-orange-500/10 text-orange-500' :
                                                                      'bg-red-500/10 text-red-500'}`}>
                                                            {sub.grade}
                                                       </span>
                                                  </td>
                                                  <td className="px-8 py-5 text-right font-bold text-slate-400 text-xs uppercase tracking-tighter">
                                                       {new Date(sub.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                  </td>
                                             </motion.tr>
                                        ))}
                                   </AnimatePresence>
                              </tbody>
                         </table>

                         {filteredSubmissions.length === 0 && (
                              <div className="py-20 text-center">
                                   <p className="text-slate-400 font-bold italic">Hech qanday natija topilmadi.</p>
                              </div>
                         )}
                    </div>
               </div>

               {/* Mistake Analysis Modal */}
               <StudentAnalysisModal
                    isOpen={isAnalysisOpen}
                    onClose={() => setIsAnalysisOpen(false)}
                    submission={selectedSubmission}
                    test={test}
               />

               <TimeEditModal
                    isOpen={isTimeModalOpen}
                    onClose={() => setIsTimeModalOpen(false)}
                    test={test}
                    onUpdate={handleUpdateTime}
                    onFinish={handleFinishTest}
                    loading={updatingTime || finishing}
               />

               {/* Finishing Loader Overlay */}
               <AnimatePresence>
                    {finishing && (
                         <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/80 backdrop-blur-md"
                         >
                              <div className="flex flex-col items-center gap-6 p-10 bg-white rounded-[3rem] shadow-2xl max-w-sm text-center">
                                   <div className="relative">
                                        <div className="w-20 h-20 border-4 border-primary/20 rounded-full"></div>
                                        <div className="absolute top-0 left-0 w-20 h-20 border-4 border-primary border-t-transparent animate-spin rounded-full"></div>
                                   </div>
                                   <div>
                                        <h3 className="text-2xl font-black text-slate-800 mb-2">Natijalar Tayyorlanmoqda</h3>
                                        <p className="text-slate-500 font-bold leading-relaxed">
                                             Rasch modeli bo'yicha hisob-kitoblar va professional PDF hisobot yaratilmoqda. Iltimos, bir necha soniya kutib turing...
                                        </p>
                                   </div>
                              </div>
                         </motion.div>
                    )}
               </AnimatePresence>
          </div>
     );
}

function StudentAnalysisModal({ isOpen, onClose, submission, test }: any) {
     if (!submission || !test) return null;

     return (
          <AnimatePresence>
               {isOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                         <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              onClick={onClose}
                              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                         />

                         <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: 20 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: 20 }}
                              className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col"
                         >
                              {/* Modal Header */}
                              <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                                   <div className="flex items-center gap-6">
                                        <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-white shadow-xl shadow-primary/20">
                                             <UserIcon size={32} />
                                        </div>
                                        <div>
                                             <h3 className="text-2xl font-black font-display text-slate-900">{submission.student_name}</h3>
                                             <p className="text-slate-400 font-bold flex items-center gap-2">
                                                  <Hash size={16} className="text-primary" />
                                                  ID: {submission.student_telegram_id === 0 ? "Veb-saytdan mehmon" : submission.student_telegram_id}
                                             </p>
                                        </div>
                                   </div>
                                   <div className="flex items-center gap-4">
                                        <div className="text-right">
                                             <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Jami natija</div>
                                             <div className="text-3xl font-black font-display text-secondary">{parseFloat(submission.score).toFixed(1)} / {test.total_points}</div>
                                        </div>
                                        <button
                                             onClick={onClose}
                                             className="p-3 bg-white hover:bg-slate-100 rounded-2xl transition-colors border border-slate-100"
                                        >
                                             <X size={24} className="text-slate-400" />
                                        </button>
                                   </div>
                              </div>

                              {/* Quick Stats */}
                              <div className="grid grid-cols-3 gap-6 p-8 bg-slate-50/30">
                                   <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                                        <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary">
                                             <Check size={20} strokeWidth={3} />
                                        </div>
                                        <div>
                                             <div className="text-[10px] font-black text-slate-400 uppercase">To'g'ri</div>
                                             <div className="text-xl font-black text-slate-800">{submission.correct_count} ta</div>
                                        </div>
                                   </div>
                                   <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                                        <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center text-red-500">
                                             <X size={20} strokeWidth={3} />
                                        </div>
                                        <div>
                                             <div className="text-[10px] font-black text-slate-400 uppercase">Xato</div>
                                             <div className="text-xl font-black text-slate-800">{submission.wrong_count} ta</div>
                                        </div>
                                   </div>
                                   <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                                             <Trophy size={20} />
                                        </div>
                                        <div>
                                             <div className="text-[10px] font-black text-slate-400 uppercase">Daraja</div>
                                             <div className="text-xl font-black text-slate-800">{submission.grade}</div>
                                        </div>
                                   </div>
                              </div>

                              {/* Question List */}
                              <div className="flex-1 overflow-y-auto p-8 pt-0 custom-scrollbar">
                                   <div className="space-y-4">
                                        {test.questions.map((q: any) => {
                                             const studentAns = submission.answers[q.question_number.toString()];
                                             const isManual = q.question_type === 'manual';

                                             let isCorrect = false;
                                             if (q.question_type === 'choice') {
                                                  isCorrect = String(studentAns || "").toUpperCase() === String(q.correct_answer || "").toUpperCase();
                                             } else if (q.question_type === 'writing') {
                                                  try {
                                                       const correctParts = JSON.parse(q.correct_answer);
                                                       if (Array.isArray(correctParts)) {
                                                            const studentParts = Array.isArray(studentAns) ? studentAns : [studentAns];
                                                            let allPartsCorrect = true;
                                                            for (let i = 0; i < correctParts.length; i++) {
                                                                 const alternatives = correctParts[i];
                                                                 const partAns = String(studentParts[i] || "").trim().toLowerCase();
                                                                 if (!alternatives.some((alt: any) => String(alt).trim().toLowerCase() === partAns)) {
                                                                      allPartsCorrect = false;
                                                                      break;
                                                                 }
                                                            }
                                                            isCorrect = allPartsCorrect;
                                                       } else {
                                                            isCorrect = String(studentAns || "").trim().toLowerCase() === String(q.correct_answer || "").trim().toLowerCase();
                                                       }
                                                  } catch (e) {
                                                       isCorrect = String(studentAns || "").trim().toLowerCase() === String(q.correct_answer || "").trim().toLowerCase();
                                                  }
                                             } else if (isManual) {
                                                  const val = parseFloat(studentAns || 0);
                                                  isCorrect = val >= (q.points * 0.5); // 50% dan ko'p bo'lsa to'g'ri deb hisoblaymiz (visual uchun)
                                             }

                                             return (
                                                  <div
                                                       key={q.id}
                                                       className={`p-6 rounded-[2rem] border-2 transition-all ${isManual ? 'bg-amber-50/30 border-amber-100' :
                                                            isCorrect ? 'bg-secondary/5 border-secondary/10' : 'bg-red-50/30 border-red-100'
                                                            }`}
                                                  >
                                                       <div className="flex items-start justify-between gap-6">
                                                            <div className="flex gap-4">
                                                                 <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center font-black text-sm shadow-sm ${isManual ? 'bg-amber-500 text-white shadow-amber-500/20' :
                                                                      isCorrect ? 'bg-secondary text-white shadow-secondary/20' : 'bg-red-500 text-white shadow-red-500/20'
                                                                      }`}>
                                                                      {q.question_number}
                                                                 </div>
                                                                 <div>
                                                                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                                                           {q.question_type === 'choice' ? 'Test savoli' : q.question_type === 'writing' ? 'Yozma javob' : 'Insho / Qo\'lda baholash'}
                                                                      </div>

                                                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-3">
                                                                           <div>
                                                                                <div className="text-[10px] font-bold text-slate-300 uppercase mb-2">Talabaning javobi:</div>
                                                                                <div className={`font-black text-lg ${isManual ? 'text-amber-600' : isCorrect ? 'text-secondary' : 'text-red-500'}`}>
                                                                                     {isManual ? `${parseFloat(studentAns || 0).toFixed(1)} ball` : (studentAns || "Belgilanmagan")}
                                                                                </div>
                                                                           </div>

                                                                           {!isManual && (
                                                                                <div>
                                                                                     <div className="text-[10px] font-bold text-slate-300 uppercase mb-2">To'g'ri javob:</div>
                                                                                     <div className="font-black text-lg text-slate-700">
                                                                                          {q.correct_answer}
                                                                                     </div>
                                                                                </div>
                                                                           )}

                                                                           {isManual && (
                                                                                <div>
                                                                                     <div className="text-[10px] font-bold text-slate-300 uppercase mb-2">Maksimal ball:</div>
                                                                                     <div className="font-black text-lg text-slate-700">
                                                                                          {q.points} ball
                                                                                     </div>
                                                                                </div>
                                                                           )}
                                                                      </div>
                                                                 </div>
                                                            </div>

                                                            <div className="hidden sm:block">
                                                                 <div className={`p-2 rounded-xl ${isManual ? 'bg-amber-100 text-amber-500' :
                                                                      isCorrect ? 'bg-secondary/10 text-secondary' : 'bg-red-500/10 text-red-500'
                                                                      }`}>
                                                                      {isManual ? <Info size={20} /> : isCorrect ? <Check size={20} strokeWidth={3} /> : <X size={20} strokeWidth={3} />}
                                                                 </div>
                                                            </div>
                                                       </div>
                                                  </div>
                                             );
                                        })}
                                   </div>
                              </div>

                              {/* Footer Info */}
                              <div className="p-6 text-center text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em] border-t border-slate-50">
                                   Mistake analysis generated at {new Date().toLocaleTimeString()}
                              </div>
                         </motion.div>
                    </div>
               )}
          </AnimatePresence>
     );
}

function StatCard({ icon, label, value, sublabel, color }: any) {
     const colors: any = {
          primary: "bg-primary text-white shadow-primary/20",
          secondary: "bg-secondary text-white shadow-secondary/20",
          orange: "bg-orange-500 text-white shadow-orange-500/20",
          amber: "bg-amber-500 text-white shadow-amber-500/20",
          slate: "bg-slate-900 text-white shadow-slate-900/20"
     };

     return (
          <div className="titul-card !p-8 flex flex-col gap-6">
               <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${colors[color]}`}>
                    {icon}
               </div>
               <div>
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">{label}</h3>
                    <div className="flex items-baseline gap-2">
                         <span className="text-4xl font-black font-display text-slate-900">{value}</span>
                         <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter italic">{sublabel}</span>
                    </div>
               </div>
          </div>
     );
}

function TimeEditModal({ isOpen, onClose, test, onUpdate, onFinish, loading }: any) {
     if (!isOpen) return null;

     return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
               <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
               />

               <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    className="relative bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl"
               >
                    <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                         <div className="flex items-center gap-4">
                              <div className="p-3 bg-amber-100 rounded-2xl">
                                   <Clock className="text-amber-600" size={24} />
                              </div>
                              <div>
                                   <h3 className="text-xl font-black font-display text-slate-800">Vaqtni Boshqarish</h3>
                                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Test muddatini uzaytirish</p>
                              </div>
                         </div>
                         <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-xl transition-colors">
                              <X size={20} className="text-slate-400" />
                         </button>
                    </div>

                    <div className="p-8 space-y-8">
                         {/* Quick Add Section */}
                         <div>
                              <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 block">Tezkor qo'shish</label>
                              <div className="grid grid-cols-2 gap-3">
                                   {[
                                        { label: '+15 daqiqa', val: 15 },
                                        { label: '+30 daqiqa', val: 30 },
                                        { label: '+1 soat', val: 60 },
                                        { label: '+2 soat', val: 120 }
                                   ].map((opt) => (
                                        <button
                                             key={opt.val}
                                             disabled={loading}
                                             onClick={() => onUpdate('add', opt.val)}
                                             className="flex items-center justify-center gap-2 p-4 rounded-2xl bg-slate-50 hover:bg-primary/5 hover:text-primary border border-transparent hover:border-primary/20 transition-all font-bold text-slate-600 disabled:opacity-50"
                                        >
                                             <Plus size={16} /> {opt.label}
                                        </button>
                                   ))}
                              </div>
                         </div>

                         {/* Status Info */}
                         <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                              <div className="flex items-center justify-between mb-2">
                                   <span className="text-sm font-bold text-slate-400">Hozirgi holat:</span>
                                   <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${test.is_active ? 'bg-secondary/10 text-secondary' : 'bg-red-50 text-red-500'}`}>
                                        {test.is_active ? 'Faol' : 'Yakunlangan'}
                                   </span>
                              </div>
                              <div className="flex items-center justify-between">
                                   <span className="text-sm font-bold text-slate-400">Tugash vaqti:</span>
                                   <span className="text-slate-800 font-bold">
                                        {test.expires_at ? new Date(test.expires_at).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }) : 'Belgilanmagan'}
                                   </span>
                              </div>
                         </div>

                         {/* Actions */}
                         <div className="flex flex-col gap-3">
                              {test.is_active && (
                                   <button
                                        onClick={onFinish}
                                        disabled={loading}
                                        className="w-full flex items-center justify-center gap-2 p-5 rounded-[1.5rem] bg-red-50 text-red-500 hover:bg-red-100 transition-all font-black uppercase tracking-widest text-xs border border-red-100 disabled:opacity-50"
                                   >
                                        <X size={18} /> Testni yakunlash (Yopish)
                                   </button>
                              )}
                              {!test.is_active && (
                                   <div className="p-4 bg-amber-50 rounded-2xl flex items-start gap-3 border border-amber-100">
                                        <AlertCircle className="text-amber-500 flex-shrink-0" size={20} />
                                        <p className="text-xs font-bold text-amber-700 leading-relaxed">
                                             Vaqtni uzaytirish testni avtomatik ravishda qayta faollashtiradi va yangi o'quvchilarga topshirishga ruxsat beradi.
                                        </p>
                                   </div>
                              )}
                         </div>
                    </div>
               </motion.div>
          </div>
     );
}
