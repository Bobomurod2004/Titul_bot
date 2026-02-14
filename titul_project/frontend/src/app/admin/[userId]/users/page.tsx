"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, User, Shield, Wallet, Calendar, ArrowLeft, Edit2, X, Check, Filter, Download, Info, ChevronDown } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-hot-toast";

interface UserData {
     id: number;
     telegram_id: number;
     full_name: string;
     role: string;
     balance: string;
     created_at: string;
}

export default function UserManagement() {
     const { userId } = useParams();
     const router = useRouter();
     const [users, setUsers] = useState<UserData[]>([]);
     const [loading, setLoading] = useState(true);
     const [search, setSearch] = useState("");
     const [roleFilter, setRoleFilter] = useState("");
     const [balanceFilter, setBalanceFilter] = useState("");
     const [showFilters, setShowFilters] = useState(false);
     const [editingUser, setEditingUser] = useState<UserData | null>(null);
     const [newRole, setNewRole] = useState("");
     const [newBalance, setNewBalance] = useState("");
     const [currentAdmin, setCurrentAdmin] = useState<UserData | null>(null);

     const fetchCurrentAdmin = async () => {
          try {
               const res = await api.get(`/users/${userId}/`);
               setCurrentAdmin(res.data);
          } catch (err) {
               console.error("Admin ma'lumotlarini olishda xatolik");
          }
     };

     const fetchUsers = async () => {
          setLoading(true);
          try {
               const params: any = { search };
               if (roleFilter) params.role = roleFilter;
               if (balanceFilter === "positive") params.min_balance = 1;
               if (balanceFilter === "zero") params.max_balance = 0;

               const res = await api.get("/admin/users/", {
                    params,
                    headers: { 'X-Telegram-Id': String(userId) }
               });
               setUsers(res.data.results || res.data);
          } catch (err: any) {
               toast.error("Foydalanuvchilarni yuklashda xatolik!");
          } finally {
               setLoading(false);
          }
     };

     useEffect(() => {
          fetchCurrentAdmin();
     }, [userId]);

     useEffect(() => {
          const timer = setTimeout(() => {
               fetchUsers();
          }, 300);
          return () => clearTimeout(timer);
     }, [search, roleFilter, balanceFilter, userId]);

     const handleUpdateUser = async () => {
          if (!editingUser) return;
          try {
               await api.patch(`/admin/users/${editingUser.telegram_id}/`,
                    {
                         role: newRole,
                         balance: newBalance
                    },
                    { headers: { 'X-Telegram-Id': String(userId) } }
               );
               toast.success("Ma'mulotlar muvaffaqiyatli yangilandi!");
               setEditingUser(null);
               fetchUsers();
          } catch (err) {
               toast.error("Ma'lumotlarni o'zgartirishda xatolik!");
          }
     };

     const exportToCSV = () => {
          const headers = ["ID", "Telegram ID", "Ism", "Rol", "Balans", "Ro'yxatdan o'tgan sana"];
          const rows = users.map(u => [
               u.id,
               u.telegram_id,
               u.full_name,
               u.role,
               u.balance,
               new Date(u.created_at).toLocaleDateString()
          ]);

          let csvContent = "data:text/csv;charset=utf-8,"
               + headers.join(",") + "\n"
               + rows.map(e => e.join(",")).join("\n");

          const encodedUri = encodeURI(csvContent);
          const link = document.createElement("a");
          link.setAttribute("href", encodedUri);
          link.setAttribute("download", `users_export_${new Date().toISOString().split('T')[0]}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          toast.success("CSV fayl yuklab olindi!");
     };

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
                              <h1 className="text-4xl font-black text-slate-900 font-display tracking-tight">👥 Foydalanuvchilar</h1>
                              <p className="text-slate-500 font-medium">Tizim foydalanuvchilarini boshqarish va tahlil qilish</p>
                         </div>
                         <div className="flex items-center gap-3">
                              <button
                                   onClick={() => setShowFilters(!showFilters)}
                                   className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold transition-all border-2 ${showFilters ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200'
                                        }`}
                              >
                                   <Filter size={18} /> Filtrlar
                              </button>
                              <button
                                   onClick={exportToCSV}
                                   className="flex items-center gap-2 px-5 py-3 bg-white border-2 border-slate-100 text-slate-600 hover:border-slate-200 rounded-2xl font-bold transition-all"
                              >
                                   <Download size={18} /> CSV Export
                              </button>
                         </div>
                    </div>

                    {/* Filters Section */}
                    <AnimatePresence>
                         {showFilters && (
                              <motion.div
                                   initial={{ height: 0, opacity: 0 }}
                                   animate={{ height: "auto", opacity: 1 }}
                                   exit={{ height: 0, opacity: 0 }}
                                   className="overflow-hidden mb-8"
                              >
                                   <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div>
                                             <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Rol bo'yicha</label>
                                             <select
                                                  value={roleFilter}
                                                  onChange={(e) => setRoleFilter(e.target.value)}
                                                  className="w-full bg-slate-50 border-2 border-slate-50 p-3 rounded-xl font-bold focus:border-primary outline-none transition-all cursor-pointer"
                                             >
                                                  <option value="">Barchasi</option>
                                                  <option value="user">Foydalanuvchi</option>
                                                  <option value="teacher">O'qituvchi</option>
                                                  <option value="admin">Admin</option>
                                                  <option value="superadmin">Super Admin</option>
                                             </select>
                                        </div>
                                        <div>
                                             <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Balans bo'yicha</label>
                                             <select
                                                  value={balanceFilter}
                                                  onChange={(e) => setBalanceFilter(e.target.value)}
                                                  className="w-full bg-slate-50 border-2 border-slate-50 p-3 rounded-xl font-bold focus:border-primary outline-none transition-all cursor-pointer"
                                             >
                                                  <option value="">Barchasi</option>
                                                  <option value="positive">Balansi bor</option>
                                                  <option value="zero">Balansi nol</option>
                                             </select>
                                        </div>
                                        <div>
                                             <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block tracking-widest">Tozalash</label>
                                             <button
                                                  onClick={() => { setRoleFilter(""); setBalanceFilter(""); setSearch(""); }}
                                                  className="w-full bg-slate-100/50 hover:bg-slate-100 p-3 rounded-xl font-bold text-slate-500 transition-all"
                                             >
                                                  Filtrlarni o'chirish
                                             </button>
                                        </div>
                                   </div>
                              </motion.div>
                         )}
                    </AnimatePresence>

                    {/* Table Section */}
                    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                         <div className="p-8 border-b border-slate-50 bg-slate-50/20">
                              <div className="relative max-w-md">
                                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                                   <input
                                        type="text"
                                        placeholder="Ism yoki Telegram ID bo'yicha qidirish..."
                                        className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-100 focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all font-medium placeholder:text-slate-300"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                   />
                              </div>
                         </div>

                         <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse">
                                   <thead>
                                        <tr className="bg-slate-50/50 text-slate-400 text-[10px] uppercase tracking-[0.2em] font-black">
                                             <th className="px-8 py-6">Foydalanuvchi</th>
                                             <th className="px-8 py-6">Status / Rol</th>
                                             <th className="px-8 py-6">Moliyaviy hamyon</th>
                                             <th className="px-8 py-6">Tizimda</th>
                                             <th className="px-8 py-6 text-right">Boshqaruv</th>
                                        </tr>
                                   </thead>
                                   <tbody className="divide-y divide-slate-50">
                                        {loading && users.length === 0 ? (
                                             <tr>
                                                  <td colSpan={5} className="px-8 py-20 text-center">
                                                       <div className="flex flex-col items-center gap-3">
                                                            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                                                            <p className="text-slate-400 font-bold italic">Ma'lumotlar yuklanmoqda...</p>
                                                       </div>
                                                  </td>
                                             </tr>
                                        ) : users.length === 0 ? (
                                             <tr>
                                                  <td colSpan={5} className="px-8 py-20 text-center">
                                                       <div className="flex flex-col items-center gap-4 text-slate-300">
                                                            <Info size={48} strokeWidth={1} />
                                                            <p className="text-lg font-bold">Hech qanday foydalanuvchi topilmadi</p>
                                                       </div>
                                                  </td>
                                             </tr>
                                        ) : (
                                             users.map((user) => (
                                                  <tr key={user.id} className="hover:bg-slate-50/80 transition-all group">
                                                       <td className="px-8 py-5">
                                                            <div className="flex items-center gap-4">
                                                                 <div className="w-12 h-12 bg-white border border-slate-100 shadow-sm rounded-2xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                                                      <User size={24} />
                                                                 </div>
                                                                 <div>
                                                                      <p className="font-bold text-slate-900 group-hover:text-primary transition-colors">{user.full_name}</p>
                                                                      <p className="text-xs text-slate-400 font-mono tracking-tighter">@{user.telegram_id}</p>
                                                                 </div>
                                                            </div>
                                                       </td>
                                                       <td className="px-8 py-5">
                                                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${user.role === 'superadmin' ? 'bg-rose-100 text-rose-600' :
                                                                      user.role === 'admin' ? 'bg-indigo-100 text-indigo-600' :
                                                                           user.role === 'teacher' ? 'bg-emerald-100 text-emerald-600' :
                                                                                'bg-slate-100 text-slate-600'
                                                                 }`}>
                                                                 <Shield size={12} />
                                                                 {user.role}
                                                            </div>
                                                       </td>
                                                       <td className="px-8 py-5">
                                                            <div className="flex items-center gap-2">
                                                                 <Wallet size={16} className="text-slate-300" />
                                                                 <span className="font-black text-slate-700">{parseFloat(user.balance).toLocaleString()}</span>
                                                                 <span className="text-[10px] font-bold text-slate-400">UZS</span>
                                                            </div>
                                                       </td>
                                                       <td className="px-8 py-5">
                                                            <div className="flex items-center gap-2 text-slate-400">
                                                                 <Calendar size={16} />
                                                                 <span className="text-xs font-medium">{new Date(user.created_at).toLocaleDateString('uz-UZ')}</span>
                                                            </div>
                                                       </td>
                                                       <td className="px-8 py-5 text-right">
                                                            <button
                                                                 onClick={() => {
                                                                      setEditingUser(user);
                                                                      setNewRole(user.role);
                                                                      setNewBalance(user.balance);
                                                                 }}
                                                                 className="w-10 h-10 flex items-center justify-center bg-white border border-slate-100 shadow-sm rounded-xl text-slate-400 hover:text-primary hover:border-primary/30 transition-all hover:scale-110"
                                                            >
                                                                 <Edit2 size={16} />
                                                            </button>
                                                       </td>
                                                  </tr>
                                             ))
                                        )}
                                   </tbody>
                              </table>
                         </div>
                    </div>
               </div>

               {/* Edit Modal */}
               <AnimatePresence>
                    {editingUser && (
                         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
                              <motion.div
                                   initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                   animate={{ scale: 1, opacity: 1, y: 0 }}
                                   exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                   className="bg-white w-full max-w-lg rounded-[3rem] shadow-[0_20px_100px_rgba(0,0,0,0.15)] overflow-hidden"
                              >
                                   <div className="p-10 border-b border-slate-50 flex items-center justify-between pb-8">
                                        <div className="flex items-center gap-4">
                                             <div className="w-14 h-14 bg-primary/10 rounded-[1.5rem] flex items-center justify-center text-primary">
                                                  <User size={28} />
                                             </div>
                                             <div>
                                                  <h2 className="text-2xl font-black font-display tracking-tight">Tahrirlash</h2>
                                                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{editingUser.full_name}</p>
                                             </div>
                                        </div>
                                        <button onClick={() => setEditingUser(null)} className="w-12 h-12 flex items-center justify-center bg-slate-50 hover:bg-slate-100 rounded-2xl text-slate-400 transition-all">
                                             <X size={20} />
                                        </button>
                                   </div>

                                   <div className="p-10 space-y-8">
                                        <div className="space-y-3">
                                             <label className="text-[10px] font-black font-display text-slate-400 uppercase tracking-[0.2em] px-1">Moliyaviy Balans</label>
                                             <div className="relative">
                                                  <Wallet className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                                                  <input
                                                       type="number"
                                                       value={newBalance}
                                                       onChange={(e) => setNewBalance(e.target.value)}
                                                       className="w-full pl-14 pr-6 py-5 rounded-[1.5rem] border-2 border-slate-50 bg-slate-50/50 focus:bg-white focus:border-primary focus:ring-8 focus:ring-primary/5 outline-none transition-all font-black text-xl text-slate-900"
                                                       placeholder="0.00"
                                                  />
                                             </div>
                                        </div>

                                        <div className="space-y-4">
                                             <label className="text-[10px] font-black font-display text-slate-400 uppercase tracking-[0.2em] px-1">Tizimdagi Rol</label>
                                             <div className="grid grid-cols-2 gap-3">
                                                  {['user', 'teacher', 'admin', 'superadmin'].map((role) => (
                                                       <button
                                                            key={role}
                                                            disabled={currentAdmin?.role !== 'superadmin'}
                                                            onClick={() => setNewRole(role)}
                                                            className={`p-5 rounded-[1.5rem] border-2 font-black text-xs uppercase tracking-widest transition-all ${newRole === role
                                                                 ? 'border-primary bg-primary text-white shadow-lg shadow-primary/20'
                                                                 : 'border-slate-50 bg-slate-50/30 text-slate-400 hover:border-slate-100 hover:bg-white'
                                                                 } ${currentAdmin?.role !== 'superadmin' ? 'opacity-40 cursor-not-allowed' : ''}`}
                                                       >
                                                            {role === 'superadmin' ? 'Super' : role}
                                                       </button>
                                                  ))}
                                             </div>
                                             {currentAdmin?.role !== 'superadmin' && (
                                                  <div className="flex items-center gap-2 p-4 bg-rose-50 rounded-2xl border border-rose-100 text-rose-500">
                                                       <Shield size={16} />
                                                       <p className="text-[10px] font-bold uppercase tracking-wider">Faqat Superadmin rollarni o'zgartira oladi</p>
                                                  </div>
                                             )}
                                        </div>

                                        <div className="flex gap-4 pt-4">
                                             <button
                                                  onClick={() => setEditingUser(null)}
                                                  className="flex-1 py-5 rounded-[1.5rem] font-black text-slate-400 bg-slate-50 hover:bg-slate-100 transition-all uppercase tracking-widest text-xs"
                                             >
                                                  Bekor qilish
                                             </button>
                                             <button
                                                  onClick={handleUpdateUser}
                                                  className="flex-[2] btn-primary py-5 rounded-[1.5rem] shadow-xl shadow-primary/20 flex items-center justify-center gap-3 active:scale-95"
                                             >
                                                  <Check size={20} strokeWidth={3} />
                                                  <span>Tasdiqlash</span>
                                             </button>
                                        </div>
                                   </div>
                              </motion.div>
                         </div>
                    )}
               </AnimatePresence>
          </div>
     );
}
