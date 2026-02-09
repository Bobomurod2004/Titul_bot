"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
     ArrowLeft, Users, Trophy, Target, Calendar,
     Download, Search, Filter, ChevronRight,
     CheckCircle2, XCircle, Clock, Hash,
     ExternalLink, Copy, HelpCircle, Edit3
} from "lucide-react";
import api from "@/lib/api";

export default function TestDetailPage() {
     const { id } = useParams();
     const searchParams = useSearchParams();
     const router = useRouter();
     const telegramId = searchParams.get("id");

     const [test, setTest] = useState<any>(null);
     const [submissions, setSubmissions] = useState<any[]>([]);
     const [loading, setLoading] = useState(true);
     const [searchTerm, setSearchTerm] = useState("");
     const [copied, setCopied] = useState(false);

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
               const link = `${window.location.origin}/submit?id=${test.access_code}`;

               // Try modern API first
               if (navigator.clipboard && window.isSecureContext) {
                    await navigator.clipboard.writeText(link);
               } else {
                    // Fallback for non-secure contexts
                    const textArea = document.createElement("textarea");
                    textArea.value = link;
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
               setTimeout(() => setCopied(false), 2000);
          } catch (err) {
               console.error('Copy error:', err);
               alert("Linkni nusxalab bo'lmadi. Brauzer cheklovi bo'lishi mumkin.");
          }
     };

     const handleDownloadReport = async () => {
          try {
               const response = await api.get(`/submissions/${id}/report/`, { responseType: 'blob' });
               const url = window.URL.createObjectURL(new Blob([response.data]));
               const link = document.createElement('a');
               link.href = url;
               link.setAttribute('download', `hisobot_${test.access_code}.pdf`);
               document.body.appendChild(link);
               link.click();
          } catch (err) {
               alert("PDF yuklashda xatolik!");
          }
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

     const filteredSubmissions = submissions.filter(s =>
          s.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.student_telegram_id.toString().includes(searchTerm)
     );

     return (
          <div className="max-w-7xl mx-auto px-4 py-12 md:py-20">
               {/* Header Nav */}
               <button
                    onClick={() => router.push(`/my_tests?id=${telegramId}`)}
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
                              onClick={() => router.push(`/create_start?id=${telegramId}&editId=${test.id}`)}
                              className="btn-secondary !bg-white !shadow-sm border border-slate-200 !py-4 hover:!bg-slate-50 !text-slate-600"
                         >
                              <Edit3 size={20} className="text-primary" /> Tahrirlash
                         </button>
                         <button
                              onClick={handleCopyLink}
                              className={`btn-secondary !bg-white !shadow-sm border border-slate-200 !py-4 transition-all !text-slate-600 ${copied ? '!text-secondary !border-secondary' : ''}`}
                         >
                              {copied ? <CheckCircle2 size={20} /> : <Copy size={20} className="text-primary" />}
                              {copied ? 'Link nusxalandi' : 'Linkni nusxalash'}
                         </button>
                         <button
                              onClick={handleDownloadReport}
                              className="btn-primary !bg-slate-900 hover:!bg-black !py-4 shadow-xl shadow-slate-900/10"
                         >
                              <Download size={20} /> PDF Natijalar
                         </button>
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
                         label="Savollar Soni"
                         value={test.questions?.length || 0}
                         sublabel="Test qamrovi"
                         color="slate"
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
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Telegram ID</th>
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
                                                  className="group hover:bg-slate-50/50 transition-colors"
                                             >
                                                  <td className="px-8 py-5 font-black text-slate-300 text-sm">{idx + 1}</td>
                                                  <td className="px-8 py-5">
                                                       <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-black text-xs uppercase">
                                                                 {sub.student_name.slice(0, 2)}
                                                            </div>
                                                            <span className="font-bold text-slate-700">{sub.student_name}</span>
                                                       </div>
                                                  </td>
                                                  <td className="px-8 py-5 font-medium text-slate-400 text-sm">@{sub.student_telegram_id}</td>
                                                  <td className="px-8 py-5 text-center">
                                                       <div className="inline-flex items-center gap-1.5 font-display font-black text-lg">
                                                            <span className="text-secondary">{parseFloat(sub.score).toFixed(1)}</span>
                                                            <span className="text-slate-200 text-sm">/</span>
                                                            <span className="text-slate-400 text-sm">{test.total_points || (test.questions?.length || 0)}</span>
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
          </div>
     );
}

function StatCard({ icon, label, value, sublabel, color }: any) {
     const colors: any = {
          primary: "bg-primary text-white shadow-primary/20",
          secondary: "bg-secondary text-white shadow-secondary/20",
          orange: "bg-orange-500 text-white shadow-orange-500/20",
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
