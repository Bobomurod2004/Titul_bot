"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Check, X, Clock, User, CreditCard, Image as ImageIcon, MessageCircle, ExternalLink, RefreshCw, AlertCircle, Loader2, History, TrendingUp, DollarSign, Wallet } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-hot-toast";

interface Receipt {
     id: number;
     user_name: string;
     receipt_image: string;
     amount: number | null;
     status: 'pending' | 'accepted' | 'rejected';
     admin_comment: string;
     created_at: string;
}

export default function AdminPayments() {
     const { userId } = useParams();
     const router = useRouter();
     const [receipts, setReceipts] = useState<Receipt[]>([]);
     const [stats, setStats] = useState<any>(null);
     const [loading, setLoading] = useState(true);
     const [verifying, setVerifying] = useState<number | null>(null);
     const [selectedImage, setSelectedImage] = useState<string | null>(null);
     const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');

     const fetchData = async () => {
          setLoading(true);
          try {
               const [receiptsRes, statsRes] = await Promise.all([
                    api.get("/admin/receipts/", { headers: { 'X-Telegram-Id': String(userId) } }),
                    api.get("/admin/stats/", { headers: { 'X-Telegram-Id': String(userId) } })
               ]);

               let allReceipts = [];
               if (receiptsRes.data.results && Array.isArray(receiptsRes.data.results)) {
                    allReceipts = receiptsRes.data.results;
               } else if (Array.isArray(receiptsRes.data)) {
                    allReceipts = receiptsRes.data;
               }

               setReceipts(allReceipts);
               setStats(statsRes.data);
          } catch (err: any) {
               toast.error("Ma'lumotlarni yuklashda xatolik!");
          } finally {
               setLoading(false);
          }
     };

     useEffect(() => {
          fetchData();
     }, [userId]);

     const [showVerifyModal, setShowVerifyModal] = useState(false);
     const [verifyingAction, setVerifyingAction] = useState<'accept' | 'reject' | null>(null);
     const [amountInput, setAmountInput] = useState("");
     const [commentInput, setCommentInput] = useState("");
     const [activeReceipt, setActiveReceipt] = useState<Receipt | null>(null);

     const handleVerify = async () => {
          if (!activeReceipt || !verifyingAction) return;

          if (verifyingAction === 'accept' && !amountInput) {
               toast.error("Summani kiriting!");
               return;
          }

          setVerifying(activeReceipt.id);
          try {
               await api.post(`/admin/receipts/${activeReceipt.id}/verify/`, {
                    action: verifyingAction,
                    amount: amountInput ? Number(amountInput) : null,
                    comment: commentInput || (verifyingAction === 'reject' ? "Rad etildi" : "")
               }, {
                    headers: { 'X-Telegram-Id': String(userId) }
               });
               toast.success(verifyingAction === 'accept' ? "To'lov tasdiqlandi!" : "To'lov rad etildi.");
               setShowVerifyModal(false);
               setAmountInput("");
               setCommentInput("");
               fetchData();
          } catch (err: any) {
               toast.error("Xatolik yuz berdi!");
          } finally {
               setVerifying(null);
          }
     };

     const filteredReceipts = receipts.filter(r =>
          activeTab === 'pending' ? r.status === 'pending' : r.status !== 'pending'
     );

     if (loading && receipts.length === 0) return (
          <div className="min-h-screen flex items-center justify-center bg-slate-50">
               <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full"
               />
          </div>
     );

     return (
          <div className="min-h-screen bg-slate-50 p-4 md:p-8 lg:p-12">
               <div className="max-w-7xl mx-auto">
                    {/* Header Section */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                         <div>
                              <button
                                   onClick={() => router.back()}
                                   className="flex items-center gap-2 text-slate-400 hover:text-primary mb-4 font-bold text-xs uppercase tracking-widest transition-all group"
                              >
                                   <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:bg-primary group-hover:text-white transition-all">
                                        <ArrowLeft size={14} />
                                   </div>
                                   Orqaga qaytish
                              </button>
                              <h1 className="text-4xl font-black text-slate-900 font-display tracking-tight">💰 To'lovlar</h1>
                              <p className="text-slate-500 font-medium">To'lov cheklarini tekshirish va tasdiqlash</p>
                         </div>
                         <div className="flex items-center gap-3">
                              <button
                                   onClick={fetchData}
                                   className="w-12 h-12 flex items-center justify-center bg-white border-2 border-slate-100 rounded-2xl hover:border-slate-200 transition-all text-slate-600"
                              >
                                   <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                              </button>
                         </div>
                    </div>

                    {/* Stats Header */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                         <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center gap-6">
                              <div className="w-16 h-16 bg-blue-50 rounded-[1.5rem] flex items-center justify-center text-blue-600 shadow-sm">
                                   <TrendingUp size={32} />
                              </div>
                              <div>
                                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Jami tushum</p>
                                   <p className="text-2xl font-black text-slate-900 font-display">{stats?.total_payments?.toLocaleString() || 0} UZS</p>
                              </div>
                         </div>
                         <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center gap-6">
                              <div className="w-16 h-16 bg-amber-50 rounded-[1.5rem] flex items-center justify-center text-amber-600 shadow-sm">
                                   <Clock size={32} />
                              </div>
                              <div>
                                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Kutilmoqda</p>
                                   <p className="text-2xl font-black text-slate-900 font-display">{stats?.pending_payments || 0} ta chek</p>
                              </div>
                         </div>
                         <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center gap-6">
                              <div className="w-16 h-16 bg-emerald-50 rounded-[1.5rem] flex items-center justify-center text-emerald-600 shadow-sm">
                                   <Check size={32} />
                              </div>
                              <div>
                                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Status</p>
                                   <p className="text-2xl font-black text-slate-900 font-display">Barqaror</p>
                              </div>
                         </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 p-1.5 bg-slate-200/50 rounded-2xl w-fit mb-8">
                         <button
                              onClick={() => setActiveTab('pending')}
                              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'pending' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                   }`}
                         >
                              <Clock size={18} /> Kutilayotgan ({receipts.filter(r => r.status === 'pending').length})
                         </button>
                         <button
                              onClick={() => setActiveTab('history')}
                              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'history' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                   }`}
                         >
                              <History size={18} /> Tarix ({receipts.filter(r => r.status !== 'pending').length})
                         </button>
                    </div>

                    {/* Content */}
                    {filteredReceipts.length === 0 ? (
                         <div className="bg-white rounded-[2.5rem] p-20 text-center border-2 border-dashed border-slate-200">
                              <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                   <CreditCard size={40} className="text-slate-300" />
                              </div>
                              <h3 className="text-2xl font-black text-slate-900 mb-2">Hozircha malumotlar yo'q</h3>
                              <p className="text-slate-400 font-medium">Foydalanuvchilar to'lov qilganda bu yerda ko'rinadi</p>
                         </div>
                    ) : (
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                              {filteredReceipts.map((receipt) => (
                                   <motion.div
                                        key={receipt.id}
                                        layout
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col group hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-500"
                                   >
                                        {/* Image Section */}
                                        <div
                                             className="relative aspect-[4/3] bg-slate-900 cursor-zoom-in overflow-hidden"
                                             onClick={() => setSelectedImage(receipt.receipt_image)}
                                        >
                                             <img
                                                  src={receipt.receipt_image}
                                                  alt="Chek"
                                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 group-hover:opacity-60"
                                             />
                                             <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                  <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white ring-8 ring-white/10">
                                                       <ExternalLink size={24} />
                                                  </div>
                                             </div>
                                             <div className={`absolute top-6 right-6 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest backdrop-blur-md shadow-lg ${receipt.status === 'pending' ? 'bg-amber-500/90 text-white' :
                                                       receipt.status === 'accepted' ? 'bg-emerald-500/90 text-white' :
                                                            'bg-rose-500/90 text-white'
                                                  }`}>
                                                  {receipt.status === 'pending' ? 'Kutilmoqda' :
                                                       receipt.status === 'accepted' ? 'Qabul qilingan' : 'Rad etilgan'}
                                             </div>
                                        </div>

                                        <div className="p-8 space-y-6 flex-grow">
                                             <div className="flex items-center gap-4">
                                                  <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-primary shadow-sm group-hover:scale-110 transition-transform">
                                                       <User size={20} />
                                                  </div>
                                                  <div>
                                                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Foydalanuvchi</p>
                                                       <p className="font-bold text-slate-900 text-lg leading-tight">{receipt.user_name}</p>
                                                  </div>
                                             </div>

                                             <div className="flex items-center gap-2 text-xs font-bold text-slate-400 bg-slate-50 w-fit px-4 py-2 rounded-full">
                                                  <Clock size={14} className="text-slate-300" />
                                                  {new Date(receipt.created_at).toLocaleString('uz-UZ', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                                             </div>

                                             {receipt.amount && (
                                                  <div className="p-5 bg-emerald-50 rounded-[2rem] border border-emerald-100 flex items-center justify-between group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300">
                                                       <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Summa:</span>
                                                       <span className="font-black text-xl font-display">{receipt.amount.toLocaleString()} UZS</span>
                                                  </div>
                                             )}

                                             {receipt.admin_comment && (
                                                  <div className="p-4 bg-slate-50 rounded-2xl text-sm italic text-slate-500 border border-slate-100 relative">
                                                       <MessageCircle size={14} className="absolute -top-2 -right-2 text-slate-200" />
                                                       "{receipt.admin_comment}"
                                                  </div>
                                             )}
                                        </div>

                                        {receipt.status === 'pending' && (
                                             <div className="p-8 pt-0 flex gap-4 mt-auto">
                                                  <button
                                                       onClick={() => { setActiveReceipt(receipt); setVerifyingAction('reject'); setShowVerifyModal(true); }}
                                                       disabled={verifying === receipt.id}
                                                       className="flex-1 bg-white hover:bg-rose-50 text-rose-500 border-2 border-slate-50 font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest"
                                                  >
                                                       Rad etish
                                                  </button>
                                                  <button
                                                       onClick={() => { setActiveReceipt(receipt); setVerifyingAction('accept'); setShowVerifyModal(true); }}
                                                       disabled={verifying === receipt.id}
                                                       className="flex-2 btn-primary flex-1 py-4 rounded-2xl"
                                                  >
                                                       <Check size={18} strokeWidth={3} />
                                                  </button>
                                             </div>
                                        )}
                                   </motion.div>
                              ))}
                         </div>
                    )}
               </div>

               {/* Reuse Verification Modal with enhanced styling */}
               <AnimatePresence>
                    {showVerifyModal && (
                         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
                              <motion.div
                                   initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                   animate={{ opacity: 1, scale: 1, y: 0 }}
                                   exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                   className="relative w-full max-w-lg bg-white rounded-[3rem] shadow-[0_20px_100px_rgba(0,0,0,0.15)] overflow-hidden"
                              >
                                   <div className={`p-10 ${verifyingAction === 'accept' ? 'bg-emerald-50' : 'bg-rose-50'} flex items-center justify-between`}>
                                        <div className="flex items-center gap-6">
                                             <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-lg ${verifyingAction === 'accept' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                                                  {verifyingAction === 'accept' ? <Check size={32} /> : <X size={32} />}
                                             </div>
                                             <div>
                                                  <h3 className="text-2xl font-black text-slate-900 font-display">
                                                       {verifyingAction === 'accept' ? "Tasdiqlash" : "Rad etish"}
                                                  </h3>
                                                  <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mt-1 opacity-60">
                                                       Kvitansiya #{activeReceipt?.id}
                                                  </p>
                                             </div>
                                        </div>
                                        <button onClick={() => setShowVerifyModal(false)} className="w-12 h-12 flex items-center justify-center bg-white rounded-2xl text-slate-400 hover:text-slate-600 shadow-sm transition-all">
                                             <X size={20} />
                                        </button>
                                   </div>

                                   <div className="p-10 space-y-8">
                                        {verifyingAction === 'accept' ? (
                                             <div className="space-y-4">
                                                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">
                                                       Tasdiqlangan summa
                                                  </label>
                                                  <div className="relative">
                                                       <Wallet className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={24} />
                                                       <input
                                                            type="number"
                                                            value={amountInput}
                                                            onChange={(e) => setAmountInput(e.target.value)}
                                                            placeholder="0.00"
                                                            className="w-full bg-slate-50 border-2 border-slate-50 rounded-[1.5rem] py-6 pl-16 pr-20 text-3xl font-black text-slate-900 focus:bg-white focus:border-primary focus:ring-8 focus:ring-primary/5 outline-none transition-all placeholder:text-slate-200"
                                                            autoFocus
                                                       />
                                                       <div className="absolute right-8 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">UZS</div>
                                                  </div>
                                             </div>
                                        ) : (
                                             <div className="flex items-start gap-5 p-6 bg-amber-50 rounded-[2rem] border border-amber-100">
                                                  <AlertCircle className="text-amber-500 shrink-0" size={24} />
                                                  <p className="font-bold text-amber-900 leading-relaxed text-sm">
                                                       To'lovni rad etsangiz, foydalanuvchiga bildirishnoma yuboriladi. Iltimos sababini ko'rsating.
                                                  </p>
                                             </div>
                                        )}

                                        <div className="space-y-4">
                                             <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">
                                                  Ma'muriy izoh
                                             </label>
                                             <textarea
                                                  value={commentInput}
                                                  onChange={(e) => setCommentInput(e.target.value)}
                                                  placeholder={verifyingAction === 'accept' ? "To'lov muvaffaqiyatli qabul qilindi!" : "Chek sifati yomon yoki ma'lumotlar mos kelmadi."}
                                                  className="w-full bg-slate-50 border-2 border-slate-50 rounded-[1.5rem] p-6 font-bold text-slate-700 focus:bg-white focus:border-primary outline-none transition-all resize-none h-32"
                                             />
                                        </div>

                                        <div className="flex gap-4 pt-4">
                                             <button
                                                  onClick={() => setShowVerifyModal(false)}
                                                  className="flex-1 py-5 rounded-[1.5rem] font-black text-slate-400 hover:bg-slate-50 transition-all uppercase tracking-widest text-xs"
                                             >
                                                  Bekor qilish
                                             </button>
                                             <button
                                                  onClick={handleVerify}
                                                  disabled={!!verifying}
                                                  className={`flex-[2] py-5 rounded-[2rem] font-black text-white shadow-2xl transition-all active:scale-[0.95] flex items-center justify-center gap-3 ${verifyingAction === 'accept' ? 'bg-emerald-500 shadow-emerald-200' : 'bg-rose-500 shadow-rose-200'
                                                       }`}
                                             >
                                                  {verifying ? <Loader2 className="animate-spin" size={20} /> : (verifyingAction === 'accept' ? <Check size={20} strokeWidth={3} /> : <X size={20} strokeWidth={3} />)}
                                                  <span className="uppercase tracking-[0.1em] text-sm">{verifying ? "Ishlanmoqda..." : "Tasdiqlash"}</span>
                                             </button>
                                        </div>
                                   </div>
                              </motion.div>
                         </div>
                    )}
               </AnimatePresence>

               {/* Enhanced Image Viewer */}
               <AnimatePresence>
                    {selectedImage && (
                         <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              onClick={() => setSelectedImage(null)}
                              className="fixed inset-0 z-[200] bg-slate-900/95 backdrop-blur-3xl flex items-center justify-center p-8 lg:p-16"
                         >
                              <div className="relative w-full h-full flex items-center justify-center">
                                   <motion.img
                                        initial={{ scale: 0.9, opacity: 0, rotate: -2 }}
                                        animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                        exit={{ scale: 0.9, opacity: 0, rotate: 2 }}
                                        src={selectedImage}
                                        alt="Check Full View"
                                        className="max-w-full max-h-full rounded-[2rem] shadow-[0_0_100px_rgba(255,255,255,0.1)] object-contain"
                                   />
                                   <button
                                        onClick={() => setSelectedImage(null)}
                                        className="absolute top-0 right-0 lg:-top-12 lg:-right-12 w-16 h-16 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full transition-all border border-white/10"
                                   >
                                        <X size={32} />
                                   </button>
                              </div>
                         </motion.div>
                    )}
               </AnimatePresence>
          </div>
     );
}
