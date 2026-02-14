"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Save, CreditCard, DollarSign, BookOpen, AlertCircle, Bot, Globe, Plus, Trash, RefreshCw } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-hot-toast";

interface MandatoryChannel {
     name: string;
     link: string;
}

interface Settings {
     card_number: string;
     price_per_question: number;
     price_per_test: number;
     payment_instruction: string;
     bot_link: string;
     support_link: string;
     mandatory_channels: MandatoryChannel[];
}

export default function AdminSettings() {
     const params = useParams();
     const router = useRouter();
     const userId = params.userId;

     const [settings, setSettings] = useState<Settings>({
          card_number: "",
          price_per_question: 100,
          price_per_test: 1000,
          payment_instruction: "",
          bot_link: "",
          support_link: "",
          mandatory_channels: []
     });
     const [loading, setLoading] = useState(true);
     const [saving, setSaving] = useState(false);
     const [isSuperAdmin, setIsSuperAdmin] = useState(false);
     const [newChannel, setNewChannel] = useState<MandatoryChannel>({ name: "", link: "" });

     useEffect(() => {
          const fetchData = async () => {
               try {
                    const [settingsRes, userRes] = await Promise.all([
                         api.get("/admin/settings/", { headers: { 'X-Telegram-Id': String(userId) } }),
                         api.get(`/users/${userId}/`)
                    ]);
                    setSettings(settingsRes.data);
                    setIsSuperAdmin(userRes.data.role === 'superadmin');
               } catch (err: any) {
                    toast.error("Ma'lumotlarni yuklashda xatolik!");
               } finally {
                    setLoading(false);
               }
          };
          fetchData();
     }, [userId]);

     const handleSave = async () => {
          setSaving(true);
          try {
               await api.patch("/admin/settings/", settings, {
                    headers: { 'X-Telegram-Id': String(userId) }
               });
               toast.success("Sozlamalar saqlandi!");
          } catch (err: any) {
               const errorMsg = err.response?.data?.detail || "Saqlashda xatolik! Faqat Superadmin o'zgartira oladi.";
               toast.error(errorMsg);
          } finally {
               setSaving(false);
          }
     };

     const addChannel = () => {
          if (!newChannel.name || !newChannel.link) {
               toast.error("Kanal nomi va ssilkasi kiritilishi shart!");
               return;
          }
          setSettings({
               ...settings,
               mandatory_channels: [...(settings.mandatory_channels || []), newChannel]
          });
          setNewChannel({ name: "", link: "" });
     };

     const removeChannel = (index: number) => {
          const newList = [...(settings.mandatory_channels || [])];
          newList.splice(index, 1);
          setSettings({ ...settings, mandatory_channels: newList });
     };

     if (loading) return (
          <div className="min-h-screen flex items-center justify-center bg-slate-50">
               <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
     );

     return (
          <div className="min-h-screen bg-slate-50 p-4 md:p-8">
               <div className="max-w-3xl mx-auto">
                    <button
                         onClick={() => router.back()}
                         className="flex items-center gap-2 text-slate-500 hover:text-primary mb-6 font-medium transition-colors"
                    >
                         <ArrowLeft size={18} /> Orqaga qaytish
                    </button>

                    <div className="mb-8">
                         <h1 className="text-3xl font-black text-slate-900 font-display">⚙️ Tizim sozlamalari</h1>
                         <p className="text-slate-500">To'lov ma'lumotlari va narxlarni boshqarish</p>
                    </div>

                    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                         <div className="p-8 space-y-8">
                              {/* Status Alert */}
                              <div className={`${isSuperAdmin ? 'bg-amber-50 border-amber-100' : 'bg-rose-50 border-rose-100'} p-4 rounded-2xl flex gap-3`}>
                                   <AlertCircle className={isSuperAdmin ? 'text-amber-600' : 'text-rose-600'} size={20} />
                                   <p className={`text-sm ${isSuperAdmin ? 'text-amber-800' : 'text-rose-800'}`}>
                                        {isSuperAdmin ? (
                                             <><b>Muhim:</b> Ushbu sozlamalarni o'zgartirish barcha foydalanuvchilar uchun amal qiladi.</>
                                        ) : (
                                             <><b>Ruxsat yo'q:</b> Sizda ushbu sozalamalarni o'zgartirish huquqi yo'q. Faqat Superadmin o'zgartira oladi.</>
                                        )}
                                   </p>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                   {/* Card Number */}
                                   <div className="space-y-3">
                                        <label className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-wider">
                                             <CreditCard size={16} /> Karta raqami
                                        </label>
                                        <input
                                             type="text"
                                             value={settings.card_number}
                                             disabled={!isSuperAdmin}
                                             onChange={(e) => setSettings({ ...settings, card_number: e.target.value })}
                                             className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 focus:border-primary focus:ring-0 transition-all outline-none font-medium disabled:opacity-50"
                                             placeholder="0000 0000 0000 0000"
                                        />
                                   </div>

                                   {/* Bot Link */}
                                   <div className="space-y-3">
                                        <label className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-wider">
                                             <Bot size={16} /> Telegram Bot Manzili
                                        </label>
                                        <input
                                             type="url"
                                             value={settings.bot_link}
                                             disabled={!isSuperAdmin}
                                             onChange={(e) => setSettings({ ...settings, bot_link: e.target.value })}
                                             className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 focus:border-primary focus:ring-0 transition-all outline-none font-medium disabled:opacity-50"
                                             placeholder="https://t.me/your_bot"
                                        />
                                   </div>

                                   {/* Support/Admin Link */}
                                   <div className="space-y-3">
                                        <label className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-wider">
                                             <Globe size={16} /> Yordam/Admin ssilkasi
                                        </label>
                                        <input
                                             type="url"
                                             value={settings.support_link}
                                             disabled={!isSuperAdmin}
                                             onChange={(e) => setSettings({ ...settings, support_link: e.target.value })}
                                             className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 focus:border-primary focus:ring-0 transition-all outline-none font-medium disabled:opacity-50"
                                             placeholder="https://t.me/admin_username"
                                        />
                                   </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                   {/* Price per test */}
                                   <div className="space-y-3">
                                        <label className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-wider">
                                             <DollarSign size={16} /> Bir test narxi (so'm)
                                        </label>
                                        <input
                                             type="number"
                                             value={settings.price_per_test}
                                             disabled={!isSuperAdmin}
                                             onChange={(e) => setSettings({ ...settings, price_per_test: Number(e.target.value) })}
                                             className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 focus:border-primary focus:ring-0 transition-all outline-none font-medium disabled:opacity-50"
                                             placeholder="1000"
                                        />
                                   </div>

                                   {/* Price per question (Legacy/Optional) */}
                                   <div className="space-y-3 opacity-60">
                                        <label className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-wider">
                                             <BookOpen size={16} /> Bir savol narxi (so'm)
                                        </label>
                                        <input
                                             type="number"
                                             value={settings.price_per_question}
                                             disabled={!isSuperAdmin}
                                             onChange={(e) => setSettings({ ...settings, price_per_question: Number(e.target.value) })}
                                             className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 focus:border-primary focus:ring-0 transition-all outline-none font-medium disabled:opacity-50"
                                             placeholder="100"
                                        />
                                   </div>
                              </div>

                              {/* Payment Instruction */}
                              <div className="space-y-3">
                                   <label className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-wider">
                                        <BookOpen size={16} /> To'lov ko'rsatmasi
                                   </label>
                                   <textarea
                                        value={settings.payment_instruction}
                                        disabled={!isSuperAdmin}
                                        onChange={(e) => setSettings({ ...settings, payment_instruction: e.target.value })}
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 focus:border-primary focus:ring-0 transition-all outline-none font-medium min-h-[120px] disabled:opacity-50"
                                        placeholder="To'lovni amalga oshiring va chekni yuboring."
                                   />
                              </div>

                              {/* Mandatory Channels List */}
                              <div className="space-y-6 pt-6 border-t border-slate-100">
                                   <h3 className="text-xl font-black text-slate-800 font-display flex items-center gap-2">
                                        📢 Majburiy obuna kanallari ({(settings.mandatory_channels || []).length})
                                   </h3>

                                   {(settings.mandatory_channels || []).length > 0 && (
                                        <div className="space-y-3">
                                             {settings.mandatory_channels.map((ch: MandatoryChannel, idx: number) => (
                                                  <div key={idx} className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                                       <div className="flex-1 text-left">
                                                            <p className="font-bold text-slate-900">{ch.name}</p>
                                                            <p className="text-sm text-slate-500 font-mono truncate">{ch.link}</p>
                                                       </div>
                                                       {isSuperAdmin && (
                                                            <button
                                                                 onClick={() => removeChannel(idx)}
                                                                 className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                                                            >
                                                                 <Trash size={18} />
                                                            </button>
                                                       )}
                                                  </div>
                                             ))}
                                        </div>
                                   )}

                                   {isSuperAdmin && (
                                        <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-dashed border-slate-200 space-y-4">
                                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                  <div className="space-y-2 text-left">
                                                       <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Kanal nomi</label>
                                                       <input
                                                            type="text"
                                                            value={newChannel.name}
                                                            onChange={(e) => setNewChannel({ ...newChannel, name: e.target.value })}
                                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-primary transition-all font-medium"
                                                            placeholder="Masalan: Rasmiy Kanal"
                                                       />
                                                  </div>
                                                  <div className="space-y-2 text-left">
                                                       <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Kanal ssilkasi</label>
                                                       <input
                                                            type="url"
                                                            value={newChannel.link}
                                                            onChange={(e) => setNewChannel({ ...newChannel, link: e.target.value })}
                                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-primary transition-all font-medium"
                                                            placeholder="https://t.me/example"
                                                       />
                                                  </div>
                                             </div>
                                             <button
                                                  onClick={addChannel}
                                                  className="w-full flex items-center justify-center gap-2 py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 font-bold rounded-xl transition-all shadow-sm"
                                             >
                                                  <Plus size={18} /> Ro'yxatga qo'shish
                                             </button>
                                        </div>
                                   )}
                              </div>
                         </div>

                         {isSuperAdmin && (
                              <div className="bg-slate-50 p-8 flex justify-end">
                                   <button
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="btn-primary flex items-center gap-2 px-10 py-4 text-lg"
                                   >
                                        {saving ? (
                                             <RefreshCw className="animate-spin" size={20} />
                                        ) : (
                                             <Save size={20} />
                                        )}
                                        Saqlash
                                   </button>
                              </div>
                         )}
                    </div>
               </div>
          </div>
     );
}
