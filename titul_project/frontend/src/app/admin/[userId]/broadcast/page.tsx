"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Megaphone, Send, ArrowLeft, CheckCircle2, AlertCircle, Loader2, Users, Target, Activity, Image as ImageIcon, File as FileIcon, Trash2, History, Clock, Edit3, X, Zap } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-hot-toast";

interface BroadcastStatus {
     id: number;
     message: string;
     status: 'pending' | 'processing' | 'completed' | 'failed';
     total_users: number;
     success_count: number;
     fail_count: number;
     target_roles: string[];
     has_image: boolean;
     has_file: boolean;
     created_at: string;
}

const ROLES = [
     { id: 'all', label: 'Barchaga' },
     { id: 'teacher', label: 'O\'qituvchilar' },
     { id: 'student', label: 'Talabalar' },
     { id: 'user', label: 'Oddiy foydalanuvchilar' },
     { id: 'admin', label: 'Adminlar' },
];

export default function AdminBroadcast() {
     const { userId } = useParams();
     const router = useRouter();

     // Form State
     const [message, setMessage] = useState("");
     const [targetRoles, setTargetRoles] = useState<string[]>(['all']);
     const [image, setImage] = useState<File | null>(null);
     const [file, setFile] = useState<File | null>(null);

     // UI & Data State
     const [submitting, setSubmitting] = useState(false);
     const [history, setHistory] = useState<BroadcastStatus[]>([]);
     const [editMode, setEditMode] = useState<number | null>(null);

     const pollingInterval = useRef<NodeJS.Timeout | null>(null);

     useEffect(() => {
          fetchHistory();
          // Tarixni muntazam yangilab turish (10 sekundda bir)
          const historyPoller = setInterval(fetchHistory, 10000);
          return () => clearInterval(historyPoller);
     }, [userId]);

     const fetchHistory = async () => {
          try {
               const res = await api.get("/admin/broadcast/history/", {
                    headers: { 'X-Telegram-Id': String(userId) }
               });
               setHistory(res.data.results || res.data || []);
          } catch (err) {
               console.error("History yuklashda xatolik");
          }
     };

     const toggleRole = (roleId: string) => {
          if (editMode) return;
          if (roleId === 'all') {
               setTargetRoles(['all']);
               return;
          }
          setTargetRoles(prev => {
               const next = prev.filter(r => r !== 'all');
               if (next.includes(roleId)) {
                    const updated = next.filter(r => r !== roleId);
                    return updated.length === 0 ? ['all'] : updated;
               } else {
                    return [...next, roleId];
               }
          });
     };

     const handleSendOrUpdate = async () => {
          if (!message.trim()) {
               toast.error("Xabar matnini kiriting!");
               return;
          }

          setSubmitting(true);

          if (editMode) {
               const formData = new FormData();
               formData.append('message', message);
               if (image) formData.append('image', image);
               if (file) formData.append('file', file);

               try {
                    // Fire and forget: UI'ni darhol tozalash
                    const broadcastId = editMode;
                    setEditMode(null);
                    setMessage("");
                    setImage(null);
                    setFile(null);
                    setSubmitting(false);
                    toast.success("Tahrirlash boshlandi (fonda)!");

                    await api.patch(`/admin/broadcast/${broadcastId}/`, formData, {
                         headers: {
                              'X-Telegram-Id': String(userId),
                              'Content-Type': 'multipart/form-data'
                         }
                    });
                    fetchHistory();
               } catch (err: any) {
                    toast.error("Tahrirlashda xatolik yuz berdi");
                    setSubmitting(false);
               }
               return;
          }

          // Yangi xabar: Fire and forget
          const formData = new FormData();
          formData.append('message', message);
          formData.append('target_roles', JSON.stringify(targetRoles));
          if (image) formData.append('image', image);
          if (file) formData.append('file', file);

          try {
               // UI'ni darhol tozalash
               setMessage("");
               setImage(null);
               setFile(null);
               setTargetRoles(['all']);
               setSubmitting(false);
               toast.success("Xabar yuborish boshlandi (fonda)!");

               await api.post("/admin/broadcast/", formData, {
                    headers: {
                         'X-Telegram-Id': String(userId),
                         'Content-Type': 'multipart/form-data'
                    }
               });
               fetchHistory();
          } catch (err: any) {
               toast.error("Yuborishda xatolik yuz berdi");
               setSubmitting(false);
          }
     };

     const handleDelete = async (id: number) => {
          if (!confirm("O'chirilsinmi?")) return;
          try {
               await api.delete(`/admin/broadcast/${id}/delete/`, {
                    headers: { 'X-Telegram-Id': String(userId) }
               });
               toast.success("O'chirildi");
               fetchHistory();
          } catch (err) {
               toast.error("Xatolik");
          }
     };

     const startEdit = (item: BroadcastStatus) => {
          setEditMode(item.id);
          setMessage(item.message);
          setTargetRoles(item.target_roles);
          setImage(null);
          setFile(null);
          window.scrollTo({ top: 0, behavior: 'smooth' });
     };

     return (
          <div className="min-h-screen bg-slate-50 p-4 md:p-8">
               <div className="max-w-7xl mx-auto space-y-12">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                         <div>
                              <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-primary mb-2 font-medium transition-colors">
                                   <ArrowLeft size={18} /> Orqaga
                              </button>
                              <h1 className="text-4xl font-black text-slate-900 font-display flex items-center gap-3">
                                   <Zap className="text-amber-500 fill-amber-500" /> Ultra Broadcast v4.0
                              </h1>
                              <p className="text-slate-500">Maksimal tezlik va to'liq tahrirlash imkoniyati</p>
                         </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                         {/* Left: Instant Form */}
                         <div className="space-y-6">
                              <div className={`bg-white rounded-[3rem] shadow-xl border-4 transition-all duration-500 p-10 space-y-8 ${editMode ? 'border-amber-400 bg-amber-50/20' : 'border-white'}`}>
                                   <div className="flex items-center justify-between">
                                        <h3 className="text-2xl font-black font-display flex items-center gap-3">
                                             {editMode ? <Edit3 size={24} className="text-amber-600" /> : <Send size={24} className="text-primary" />}
                                             {editMode ? "Tahrirlash" : "Yuborish"}
                                        </h3>
                                        {editMode && (
                                             <button onClick={() => setEditMode(null)} className="p-2 bg-rose-50 text-rose-500 rounded-full hover:bg-rose-100 transition-colors">
                                                  <X size={20} />
                                             </button>
                                        )}
                                   </div>

                                   <div className="space-y-8">
                                        <div className={editMode ? 'opacity-40 grayscale pointer-events-none' : ''}>
                                             <label className="block text-[10px] font-black text-slate-400 mb-4 uppercase tracking-[0.2em]">Auditoriya</label>
                                             <div className="flex flex-wrap gap-2">
                                                  {ROLES.map((role) => (
                                                       <button
                                                            key={role.id}
                                                            onClick={() => toggleRole(role.id)}
                                                            className={`px-4 py-2 rounded-2xl font-black text-xs transition-all ${targetRoles.includes(role.id) ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                                                       >
                                                            {role.label}
                                                       </button>
                                                  ))}
                                             </div>
                                        </div>

                                        <div>
                                             <label className="block text-[10px] font-black text-slate-400 mb-3 uppercase tracking-[0.2em]">Xabar mazmuni</label>
                                             <textarea
                                                  value={message}
                                                  onChange={(e) => setMessage(e.target.value)}
                                                  placeholder="Xabar..."
                                                  className="w-full h-56 p-6 rounded-[2rem] border-2 border-slate-50 bg-slate-50 focus:bg-white focus:border-primary focus:ring-8 focus:ring-primary/5 outline-none transition-all font-bold text-slate-700 resize-none"
                                             ></textarea>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                             <div className="space-y-3">
                                                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">📷 {editMode ? 'Yangi rasm' : 'Rasm'}</label>
                                                  <label className="flex items-center gap-4 p-5 rounded-3xl border-2 border-dashed border-slate-200 hover:border-primary hover:bg-primary/5 cursor-pointer transition-all group">
                                                       <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                                                            <ImageIcon size={20} className="text-slate-400 group-hover:text-primary" />
                                                       </div>
                                                       <span className="text-xs font-black text-slate-500 truncate">{image ? image.name : "Tanlash"}</span>
                                                       <input type="file" accept="image/*" className="hidden" onChange={(e) => setImage(e.target.files?.[0] || null)} />
                                                  </label>
                                             </div>
                                             <div className="space-y-3">
                                                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">📎 {editMode ? 'Yangi fayl' : 'Fayl'}</label>
                                                  <label className="flex items-center gap-4 p-5 rounded-3xl border-2 border-dashed border-slate-200 hover:border-primary hover:bg-primary/5 cursor-pointer transition-all group">
                                                       <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                                                            <FileIcon size={20} className="text-slate-400 group-hover:text-primary" />
                                                       </div>
                                                       <span className="text-xs font-black text-slate-500 truncate">{file ? file.name : "Tanlash"}</span>
                                                       <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                                                  </label>
                                             </div>
                                        </div>

                                        <button
                                             onClick={handleSendOrUpdate}
                                             disabled={submitting}
                                             className={`w-full py-6 rounded-[2.5rem] flex items-center justify-center gap-4 text-xl font-black transition-all shadow-2xl active:scale-[0.98] ${editMode
                                                  ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200'
                                                  : 'bg-primary hover:bg-primary/90 text-white shadow-primary/20'
                                                  }`}
                                        >
                                             {submitting ? <Loader2 className="animate-spin" size={28} /> : (editMode ? <CheckCircle2 size={28} /> : <Zap size={28} />)}
                                             {submitting ? "Ishlanmoqda..." : (editMode ? "Saqlash va Fondan yangilash" : "Darhol yuborish")}
                                        </button>
                                   </div>
                              </div>
                         </div>

                         {/* Right: History List (Instant Updates) */}
                         <div className="space-y-6">
                              <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 p-10 flex flex-col h-[850px]">
                                   <div className="flex items-center justify-between mb-8">
                                        <h3 className="text-2xl font-black font-display flex items-center gap-3 text-slate-400">
                                             <History size={24} /> Tarix
                                        </h3>
                                        <div className="flex items-center gap-2 p-1.5 bg-slate-50 rounded-2xl">
                                             <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                             <span className="text-[10px] font-black uppercase text-slate-400">Live Updates</span>
                                        </div>
                                   </div>

                                   <div className="flex-1 overflow-y-auto space-y-6 pr-4 custom-scrollbar">
                                        {history.length === 0 ? (
                                             <div className="h-full flex flex-col items-center justify-center text-slate-200 italic space-y-4">
                                                  <Megaphone size={80} strokeWidth={0.5} />
                                                  <p className="font-bold">Hali xabarlar yo'q</p>
                                             </div>
                                        ) : (
                                             history.map((item) => (
                                                  <motion.div
                                                       layout
                                                       initial={{ opacity: 0, x: 20 }}
                                                       animate={{ opacity: 1, x: 0 }}
                                                       key={item.id}
                                                       className="group p-6 rounded-[2.5rem] border-2 border-slate-100 hover:border-primary/20 hover:bg-primary/[0.02] transition-all relative"
                                                  >
                                                       <div className="flex items-center justify-between mb-4">
                                                            <div className="flex gap-2">
                                                                 <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full ${item.status === 'completed' ? 'bg-emerald-100 text-emerald-600' :
                                                                      item.status === 'processing' ? 'bg-primary/20 text-primary animate-pulse' :
                                                                           'bg-amber-100 text-amber-600'
                                                                      }`}>
                                                                      {item.status}
                                                                 </span>
                                                                 {item.has_image && <span className="bg-indigo-100 text-indigo-600 text-[9px] font-black uppercase px-2.5 py-1 rounded-full flex items-center gap-1"><ImageIcon size={10} /> Image</span>}
                                                                 {item.has_file && <span className="bg-sky-100 text-sky-600 text-[9px] font-black uppercase px-2.5 py-1 rounded-full flex items-center gap-1"><FileIcon size={10} /> File</span>}
                                                            </div>
                                                            <span className="text-[10px] font-bold text-slate-300">{new Date(item.created_at).toLocaleTimeString()}</span>
                                                       </div>

                                                       <p className="text-base font-bold text-slate-700 mb-6 leading-relaxed line-clamp-2">
                                                            {item.message}
                                                       </p>

                                                       <div className="flex items-center gap-8">
                                                            <div className="flex flex-col">
                                                                 <span className="text-[10px] font-black text-slate-400 uppercase">Yetkazildi</span>
                                                                 <span className="text-xl font-black text-slate-900">{item.success_count} / {item.total_users}</span>
                                                            </div>

                                                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                                 <div
                                                                      className="h-full bg-primary transition-all duration-1000"
                                                                      style={{ width: `${Math.round((item.success_count / item.total_users) * 100) || 0}%` }}
                                                                 />
                                                            </div>
                                                       </div>

                                                       <div className="absolute -top-3 -right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100">
                                                            <button onClick={() => startEdit(item)} className="p-3 bg-white text-amber-500 shadow-xl rounded-2xl hover:bg-amber-500 hover:text-white transition-all border border-amber-50">
                                                                 <Edit3 size={18} />
                                                            </button>
                                                            <button onClick={() => handleDelete(item.id)} className="p-3 bg-white text-rose-500 shadow-xl rounded-2xl hover:bg-rose-500 hover:text-white transition-all border border-rose-50">
                                                                 <Trash2 size={18} />
                                                            </button>
                                                       </div>
                                                  </motion.div>
                                             ))
                                        )}
                                   </div>
                              </div>
                         </div>
                    </div>
               </div>
          </div>
     );
}
