"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Download, CheckCircle, ExternalLink, LayoutDashboard, Search, Clock, Users, PlusCircle, Copy, Edit3, BarChart3, ArrowRight } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-hot-toast";

export default function MyTestsPage() {
     const router = useRouter();
     const { id: telegramId } = useParams();

     const [tests, setTests] = useState<any[]>([]);
     const [loading, setLoading] = useState(true);
     const [searchTerm, setSearchTerm] = useState("");
     const [copiedId, setCopiedId] = useState<string | null>(null);

     const fetchTests = async () => {
          try {
               const response = await api.get(`/tests/user/${telegramId}/`);
               setTests(response.data.results || response.data || []);
          } catch (err) {
               console.error(err);
               toast.error("Testlarni yuklashda xatolik yuz berdi");
          } finally {
               setLoading(false);
          }
     };

     useEffect(() => {
          if (telegramId) fetchTests();
     }, [telegramId]);

     const handleFinish = async (id: string) => {
          if (!confirm("Testni yakunlamoqchimisiz? Shundan so'ng hech kim javob yo'llay olmaydi.")) return;
          try {
               await api.post(`/tests/${id}/finish/`);
               toast.success("Test yakunlandi!");
               fetchTests();
          } catch (err) {
               toast.error("Xatolik yuz berdi!");
          }
     };

     const handleDownloadReport = async (id: string, code: string) => {
          try {
               const response = await api.get(`/submissions/${id}/report/`, { responseType: 'blob' });
               const url = window.URL.createObjectURL(new Blob([response.data]));
               const link = document.createElement('a');
               link.href = url;
               link.setAttribute('download', `natijalar_${code}.pdf`);
               document.body.appendChild(link);
               link.click();
          } catch (err) {
               toast.error("PDF yuklashda xatolik!");
          }
     };

     const handleCopyLink = async (code: string, id: string) => {
          try {
               // Faqat test kodini nusxalash (Foydalanuvchi so'roviga binoan)
               const textToCopy = code;

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

               setCopiedId(id);
               toast.success("Test kodi nusxalandi!");
               setTimeout(() => setCopiedId(null), 2000);
          } catch (err) {
               console.error('Copy error:', err);
               toast.error("Kod nusxalanmadi");
          }
     };

     if (loading) return (
          <div className="min-h-screen flex items-center justify-center bg-slate-50/50">
               <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-primary border-t-transparent animate-spin rounded-full"></div>
                    <p className="text-slate-400 font-bold animate-pulse">Testlar yuklanmoqda...</p>
               </div>
          </div>
     );

     const filteredTests = tests.filter(t =>
          t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.access_code.toLowerCase().includes(searchTerm.toLowerCase())
     );

     const activeTests = filteredTests.filter(t => t.is_active);
     const finishedTests = filteredTests.filter(t => !t.is_active);

     return (
          <div className="max-w-6xl mx-auto px-4 py-12 md:py-20">
               {/* Dashboard Header */}
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16">
                    <div className="flex items-center gap-6">
                         <div className="w-20 h-20 bg-primary/10 rounded-[2rem] flex items-center justify-center text-primary shadow-xl shadow-primary/5">
                              <LayoutDashboard size={36} />
                         </div>
                         <div>
                              <h1 className="text-4xl font-black font-display text-slate-900 tracking-tight">Profil & Testlar</h1>
                              <p className="text-slate-400 font-medium">O'qituvchi ID: <span className="text-slate-600 font-bold">{telegramId}</span></p>
                         </div>
                    </div>
                    <button
                         onClick={() => router.push(`/create_start/${telegramId}`)}
                         className="btn-primary group !rounded-[2rem] !py-4 px-10 shadow-lg shadow-primary/20"
                    >
                         <PlusCircle size={24} className="group-hover:rotate-90 transition-transform duration-500" />
                         Yangi Test Yaratish
                    </button>
               </div>

               {/* Search Bar */}
               <div className="mb-12 relative group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={24} />
                    <input
                         type="text"
                         placeholder="Test nomi, fan yoki kod bo'yicha qidirish..."
                         className="w-full bg-white/80 backdrop-blur-md border-2 border-slate-100 rounded-[2rem] py-5 pl-16 pr-8 text-lg font-medium outline-none focus:border-primary focus:ring-8 focus:ring-primary/5 transition-all shadow-sm"
                         value={searchTerm}
                         onChange={(e) => setSearchTerm(e.target.value)}
                    />
               </div>

               <div className="grid grid-cols-1 gap-16">
                    {/* Active Tests Section */}
                    <section>
                         <div className="flex items-center justify-between mb-8 px-2">
                              <div className="flex items-center gap-4">
                                   <div className="w-3 h-3 bg-secondary rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div>
                                   <h2 className="text-2xl font-black font-display text-slate-800 tracking-tight uppercase tracking-widest text-sm">Faol Jarayonlar</h2>
                                   <span className="bg-secondary/10 text-secondary px-4 py-1 rounded-full text-xs font-black">
                                        {activeTests.length} ta
                                   </span>
                              </div>
                              <div className="h-[2px] flex-grow mx-8 bg-slate-100 rounded-full hidden md:block opacity-50"></div>
                         </div>

                         <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                              <AnimatePresence mode="popLayout">
                                   {activeTests.map((test, idx) => (
                                        <motion.div
                                             key={test.id}
                                             layout
                                             initial={{ opacity: 0, y: 20 }}
                                             animate={{ opacity: 1, y: 0 }}
                                             exit={{ opacity: 0, scale: 0.9 }}
                                             transition={{ delay: idx * 0.05 }}
                                             className="titul-card !p-0 overflow-hidden group border-b-[6px] border-primary hover:shadow-2xl hover:shadow-primary/10 transition-all cursor-pointer relative"
                                             onClick={() => router.push(`/my_tests/${test.id}/${telegramId}`)}
                                        >
                                             <div className="p-8">
                                                  <div className="flex justify-between items-start mb-6">
                                                       <div className="bg-slate-50 text-slate-400 px-4 py-1.5 rounded-xl text-xs font-black tracking-widest border border-slate-100">
                                                            KOD: {test.access_code}
                                                       </div>
                                                       <span className="flex items-center gap-2 text-[10px] text-secondary font-black uppercase tracking-[0.2em] bg-secondary/5 px-3 py-1 rounded-full">
                                                            Online
                                                       </span>
                                                  </div>

                                                  <h3 className="text-2xl font-black text-slate-900 mb-2 truncate group-hover:text-primary transition-colors">{test.title}</h3>
                                                  <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-8">{test.subject}</p>

                                                  <div className="grid grid-cols-2 gap-4 mb-8">
                                                       <div className="bg-slate-50/50 p-4 rounded-3xl border border-slate-100/50">
                                                            <div className="flex items-center gap-2 text-slate-400 mb-1">
                                                                 <Clock size={14} />
                                                                 <span className="text-[10px] font-black uppercase">Yaratilgan</span>
                                                            </div>
                                                            <span className="text-sm font-black text-slate-700">{new Date(test.created_at).toLocaleDateString()}</span>
                                                       </div>
                                                       <div className="bg-amber-50/50 p-4 rounded-3xl border border-amber-100/50">
                                                            <div className="flex items-center gap-2 text-amber-600 mb-1 text-[10px] font-black uppercase">
                                                                 <Clock size={14} /> Tugash:
                                                            </div>
                                                            <span className="text-[10px] font-black text-amber-700">
                                                                 {test.expires_at ? new Date(test.expires_at).toLocaleString("uz-UZ", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }) : "Cheksiz"}
                                                            </span>
                                                       </div>
                                                       <div className="bg-primary/[0.03] p-4 rounded-3xl border border-primary/5">
                                                            <div className="flex items-center gap-2 text-primary/60 mb-1">
                                                                 <Users size={14} />
                                                                 <span className="text-[10px] font-black uppercase">Javoblar</span>
                                                            </div>
                                                            <span className="text-xl font-black text-primary font-display">{test.submissions_count || 0}</span>
                                                       </div>
                                                  </div>

                                                  <div className="grid grid-cols-1 gap-3" onClick={(e) => e.stopPropagation()}>
                                                       <div className="grid grid-cols-3 gap-2">
                                                            <button
                                                                 onClick={() => handleCopyLink(test.access_code, test.id)}
                                                                 className={`flex-grow btn-primary !py-3 !px-1 !text-[10px] !rounded-2xl transition-all ${copiedId === test.id ? '!bg-secondary shadow-lg shadow-secondary/20' : '!bg-slate-900 hover:!bg-slate-800'}`}
                                                            >
                                                                 {copiedId === test.id ? <CheckCircle size={14} /> : <Copy size={14} />}
                                                                 {copiedId === test.id ? 'Nusxalandi' : 'Kodni nusxalash'}
                                                            </button>
                                                            <button
                                                                 onClick={() => router.push(`/create_start/${telegramId}?editId=${test.id}`)}
                                                                 className="flex-grow btn-secondary !py-3 !px-1 !text-[10px] !rounded-2xl !bg-white border border-slate-200 !text-slate-600 hover:!bg-slate-50 !shadow-none"
                                                            >
                                                                 <Edit3 size={14} /> Tahrirlash
                                                            </button>
                                                            <button
                                                                 onClick={() => handleFinish(test.id)}
                                                                 className="flex-grow btn-secondary !py-3 !px-1 !text-[10px] !rounded-2xl !bg-orange-500 hover:!bg-orange-600 !shadow-none"
                                                            >
                                                                 <CheckCircle size={14} /> Yakunlash
                                                            </button>
                                                       </div>
                                                       <button
                                                            className="w-full flex items-center justify-center gap-2 py-3 text-xs font-black uppercase tracking-widest text-primary bg-primary/5 rounded-2xl border border-primary/10 hover:bg-primary/10 transition-all mt-1"
                                                            onClick={() => router.push(`/my_tests/${test.id}/${telegramId}`)}
                                                       >
                                                            <BarChart3 size={16} /> Batafsil Statistika <ArrowRight size={14} />
                                                       </button>
                                                  </div>
                                             </div>
                                        </motion.div>
                                   ))}
                              </AnimatePresence>
                              {activeTests.length === 0 && (
                                   <div className="col-span-full py-16 text-center bg-slate-50/30 rounded-[3rem] border-4 border-dashed border-slate-100">
                                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                                             <Search size={32} />
                                        </div>
                                        <p className="text-slate-400 font-bold italic tracking-wide">Faol testlar topilmadi.</p>
                                   </div>
                              )}
                         </div>
                    </section>

                    {/* Finished Tests Section */}
                    <section>
                         <div className="flex items-center justify-between mb-8 px-2">
                              <div className="flex items-center gap-4">
                                   <div className="w-3 h-3 bg-slate-300 rounded-full"></div>
                                   <h2 className="text-2xl font-black font-display text-slate-400 tracking-tight uppercase tracking-widest text-sm">Yakunlanganlar</h2>
                                   <span className="bg-slate-100 text-slate-400 px-4 py-1 rounded-full text-xs font-black">
                                        {finishedTests.length} ta
                                   </span>
                              </div>
                              <div className="h-[2px] flex-grow mx-8 bg-slate-100 rounded-full hidden md:block opacity-50"></div>
                         </div>

                         <div className="space-y-4">
                              <AnimatePresence mode="popLayout">
                                   {finishedTests.map((test, idx) => (
                                        <motion.div
                                             key={test.id}
                                             layout
                                             initial={{ opacity: 0, x: -20 }}
                                             animate={{ opacity: 1, x: 0 }}
                                             className="titul-card !p-6 flex flex-col sm:flex-row items-center justify-between gap-6 border-dashed border-2 hover:border-primary/20 hover:bg-white transition-all shadow-sm cursor-pointer"
                                             onClick={() => router.push(`/my_tests/${test.id}/${telegramId}`)}
                                        >
                                             <div className="flex items-center gap-6">
                                                  <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 shrink-0">
                                                       <FileText size={32} />
                                                  </div>
                                                  <div>
                                                       <h3 className="text-xl font-black text-slate-700">{test.title}</h3>
                                                       <div className="flex items-center gap-4 mt-1">
                                                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{test.subject}</span>
                                                            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                                            <span className="text-[10px] font-black uppercase text-primary tracking-widest">{test.access_code}</span>
                                                       </div>
                                                  </div>
                                             </div>

                                             <div className="flex items-center gap-4 w-full sm:w-auto" onClick={(e) => e.stopPropagation()}>
                                                  <div className="hidden md:flex items-center gap-4 mr-8 text-slate-400">
                                                       <div className="text-center px-4 border-r border-slate-100">
                                                            <p className="text-[10px] font-black uppercase mb-0.5 opacity-50">Sana</p>
                                                            <p className="font-bold text-xs">{new Date(test.created_at).toLocaleDateString()}</p>
                                                       </div>
                                                       <div className="text-center px-4">
                                                            <p className="text-[10px] font-black uppercase mb-0.5 opacity-50">Xulosa</p>
                                                            <p className="font-bold text-xs text-slate-600">{test.submissions_count || 0} ta javob</p>
                                                       </div>
                                                  </div>
                                                  <div className="flex gap-2 w-full sm:w-auto">
                                                       <button
                                                            onClick={() => router.push(`/my_tests/${test.id}/${telegramId}`)}
                                                            className="flex-grow sm:flex-grow-0 btn-secondary !py-4 !px-6 !rounded-2xl !bg-slate-100 !text-slate-600 hover:!bg-slate-200 shadow-none border-none"
                                                       >
                                                            <BarChart3 size={20} />
                                                       </button>
                                                       <button
                                                            onClick={() => handleDownloadReport(test.id, test.access_code)}
                                                            className="flex-grow sm:flex-grow-0 btn-secondary !py-4 !px-8 !rounded-2xl !bg-slate-900 hover:!bg-black shadow-xl shadow-slate-900/10"
                                                       >
                                                            <Download size={20} /> PDF Natijalar
                                                       </button>
                                                  </div>
                                             </div>
                                        </motion.div>
                                   ))}
                              </AnimatePresence>
                              {finishedTests.length === 0 && (
                                   <div className="bg-slate-50/50 border-2 border-dashed border-slate-100 rounded-[2.5rem] py-16 text-center">
                                        <p className="text-slate-300 font-bold italic">Hali yakunlangan testlar yo'q.</p>
                                   </div>
                              )}
                         </div>
                    </section>
               </div>

               {/* Retention Alert */}
               <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-20 p-8 bg-slate-900 rounded-[3rem] text-slate-100 flex flex-col md:flex-row items-center gap-8 shadow-2xl shadow-slate-900/40 relative overflow-hidden"
               >
                    <div className="absolute right-0 top-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                    <div className="bg-primary p-5 rounded-[1.5rem] shrink-0 shadow-lg shadow-primary/20">
                         <Clock size={32} />
                    </div>
                    <div>
                         <p className="text-2xl font-black font-display mb-1">Xavfsizlik & Saqlash Tartibi</p>
                         <p className="text-slate-400 text-sm font-medium leading-relaxed">
                              Yakunlangan testlar tizimda faqat <span className="text-white font-bold">5 kun</span> saqlanadi.
                              Natijalar yo'qolib ketmasligi uchun PDF hisobotni o'z vaqtida yuklab olishingizni so'raymiz.
                         </p>
                    </div>
               </motion.div>

               <p className="text-center text-slate-400 font-medium mt-16 pb-8">
                    © 2026 Titul Dashboard • <span className="text-primary tracking-widest font-black text-[10px] uppercase">Senior Management Console</span>
               </p>
          </div>
     );
}
