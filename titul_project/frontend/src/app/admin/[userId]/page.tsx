"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Users, FileText, CheckCircle, CreditCard, Activity, Clock, ArrowLeft, RefreshCw, Megaphone, Zap, TrendingUp, Bell, Search, LayoutDashboard, Settings, UserPlus, FileSpreadsheet } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-hot-toast";

interface Stats {
     total_users: number;
     total_tests: number;
     total_submissions: number;
     total_payments: number;
     active_tests: number;
     pending_payments: number;
     user_trend: number[];
     payment_trend: number[];
}

interface ActivityLog {
     id: number;
     event_type: string;
     event_type_display: string;
     user_name: string;
     description: string;
     metadata: any;
     created_at: string;
}

export default function AdminDashboard() {
     const { userId } = useParams();
     const router = useRouter();
     const [stats, setStats] = useState<Stats | null>(null);
     const [activities, setActivities] = useState<ActivityLog[]>([]);
     const [loading, setLoading] = useState(true);
     const [isRefreshing, setIsRefreshing] = useState(false);

     const fetchData = async () => {
          setIsRefreshing(true);
          try {
               const [statsRes, activityRes] = await Promise.all([
                    api.get("/admin/stats/", { headers: { 'X-Telegram-Id': String(userId) } }),
                    api.get("/admin/activity/", { headers: { 'X-Telegram-Id': String(userId) } })
               ]);
               setStats(statsRes.data);
               setActivities(activityRes.data.results || activityRes.data || []);
          } catch (err: any) {
               toast.error("Ma'lumotlarni yuklashda xatolik! Siz admin bo'lmasligingiz mumkin.");
               router.push("/");
          } finally {
               setLoading(false);
               setIsRefreshing(false);
          }
     };

     useEffect(() => {
          fetchData();
     }, [userId]);

     if (loading) return (
          <div className="min-h-screen flex items-center justify-center bg-slate-50">
               <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full"
               />
          </div>
     );

     return (
          <div className="min-h-screen bg-slate-50 flex">
               {/* Sidebar - Desktop Only for now */}
               <aside className="hidden lg:flex w-72 bg-white border-r border-slate-200 flex-col py-8 px-6 sticky top-0 h-screen">
                    <div className="flex items-center gap-3 mb-10 px-2">
                         <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
                              <Zap size={20} fill="currentColor" />
                         </div>
                         <h2 className="text-xl font-black font-display tracking-tight">Titul Admin</h2>
                    </div>

                    <nav className="space-y-2 flex-grow">
                         <NavItem icon={<LayoutDashboard size={20} />} label="Dashboard" active />
                         <NavItem icon={<Users size={20} />} label="Foydalanuvchilar" onClick={() => router.push(`/admin/${userId}/users`)} />
                         <NavItem icon={<Megaphone size={20} />} label="Xabar yuborish" onClick={() => router.push(`/admin/${userId}/broadcast`)} />
                         <NavItem icon={<CreditCard size={20} />} label="To'lovlar" onClick={() => router.push(`/admin/${userId}/payments`)} />
                         <NavItem icon={<Settings size={20} />} label="Sozlamalar" onClick={() => router.push(`/admin/${userId}/settings`)} />
                    </nav>

                    <div className="mt-auto px-2">
                         <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 italic text-xs text-slate-500">
                              Tizim versiyasi: v2.5.0 Premium
                         </div>
                    </div>
               </aside>

               <main className="flex-grow p-4 md:p-8 lg:p-12 overflow-x-hidden">
                    <div className="max-w-7xl mx-auto">
                         {/* Header */}
                         <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                              <div>
                                   <div className="flex items-center gap-2 text-slate-400 mb-2">
                                        <LayoutDashboard size={14} />
                                        <span className="text-xs font-bold uppercase tracking-[0.2em]">Bosh sahifa</span>
                                   </div>
                                   <h1 className="text-4xl font-black text-slate-900 font-display tracking-tight flex items-center gap-3">
                                        Xush kelibsiz, Admin 👋
                                   </h1>
                              </div>
                              <div className="flex items-center gap-3">
                                   <button
                                        onClick={fetchData}
                                        disabled={isRefreshing}
                                        className="w-12 h-12 flex items-center justify-center bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all text-slate-600 shadow-sm"
                                   >
                                        <RefreshCw size={20} className={isRefreshing ? "animate-spin" : ""} />
                                   </button>
                                   <button className="btn-primary px-6 py-3 shadow-xl">
                                        <FileSpreadsheet size={18} /> Hisobot yuborish
                                   </button>
                              </div>
                         </div>

                         {/* Quick Stats Grid */}
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                              <StatCard
                                   icon={<Users className="text-blue-600" />}
                                   label="Jami foydalanuvchilar"
                                   value={stats?.total_users || 0}
                                   color="bg-blue-50"
                                   trend={stats?.user_trend}
                              />
                              <StatCard
                                   icon={<FileText className="text-indigo-600" />}
                                   label="Jami testlar"
                                   value={stats?.total_tests || 0}
                                   color="bg-indigo-50"
                              />
                              <StatCard
                                   icon={<CheckCircle className="text-emerald-600" />}
                                   label="Topshirilgan testlar"
                                   value={stats?.total_submissions || 0}
                                   color="bg-emerald-50"
                              />
                              <StatCard
                                   icon={<CreditCard className="text-amber-600" />}
                                   label="Jami tushum"
                                   value={`${stats?.total_payments.toLocaleString() || 0} UZS`}
                                   color="bg-amber-50"
                                   trend={stats?.payment_trend}
                              />
                         </div>

                         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                              {/* Left Column: Activity Feed */}
                              <div className="lg:col-span-2 space-y-8">
                                   <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                                        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                                             <h3 className="text-xl font-bold font-display flex items-center gap-3">
                                                  <Activity size={20} className="text-primary" /> Oxirgi harakatlar
                                             </h3>
                                             <span className="text-[10px] font-black uppercase text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-100">Jonli yangilash</span>
                                        </div>
                                        <div className="divide-y divide-slate-50">
                                             {activities.length === 0 ? (
                                                  <div className="p-12 text-center text-slate-400 italic">Hozircha harakatlar yo'q</div>
                                             ) : (
                                                  activities.map((act) => (
                                                       <motion.div
                                                            key={act.id}
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            className="p-6 hover:bg-slate-50/50 transition-colors flex items-start gap-4 group"
                                                       >
                                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${act.event_type === 'user_registered' ? 'bg-blue-50 text-blue-600' :
                                                                      act.event_type === 'payment_verified' ? 'bg-emerald-50 text-emerald-600' :
                                                                           'bg-slate-100 text-slate-600'
                                                                 }`}>
                                                                 {act.event_type === 'user_registered' ? <UserPlus size={20} /> :
                                                                      act.event_type === 'payment_verified' ? <CreditCard size={20} /> :
                                                                           <Zap size={20} />}
                                                            </div>
                                                            <div className="flex-grow">
                                                                 <div className="flex items-center justify-between mb-1">
                                                                      <p className="font-bold text-slate-900">{act.description}</p>
                                                                      <span className="text-[10px] font-medium text-slate-400">{new Date(act.created_at).toLocaleTimeString()}</span>
                                                                 </div>
                                                                 <p className="text-xs text-slate-500 font-medium">{act.user_name || "Tizim"} • {act.event_type_display}</p>
                                                            </div>
                                                       </motion.div>
                                                  ))
                                             )}
                                        </div>
                                   </div>
                              </div>

                              {/* Right Column: Mini Stats & Quick Actions */}
                              <div className="space-y-8">
                                   <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
                                        <h3 className="text-xl font-bold font-display mb-6">Tezkor amallar</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                             <QuickAction icon={<Users className="text-blue-500" />} label="Foydalanuvchilar" onClick={() => router.push(`/admin/${userId}/users`)} />
                                             <QuickAction icon={<Megaphone className="text-rose-500" />} label="Broadcast" onClick={() => router.push(`/admin/${userId}/broadcast`)} />
                                             <QuickAction icon={<CreditCard className="text-emerald-500" />} label="To'lovlar" onClick={() => router.push(`/admin/${userId}/payments`)} />
                                             <QuickAction icon={<Settings className="text-slate-500" />} label="Sozlamalar" onClick={() => router.push(`/admin/${userId}/settings`)} />
                                        </div>
                                   </div>

                                   <div className="bg-primary rounded-[2.5rem] p-8 shadow-2xl shadow-primary/20 text-white relative overflow-hidden group">
                                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>
                                        <h3 className="text-xl font-bold font-display mb-2 relative z-10">Tizim holati</h3>
                                        <p className="text-white/60 text-sm mb-6 relative z-10">Barcha xizmatlar normal ishlamoqda.</p>
                                        <div className="flex items-center gap-4 relative z-10">
                                             <div className="flex-grow h-1 bg-white/20 rounded-full overflow-hidden">
                                                  <div className="h-full bg-white w-[98%] rounded-full"></div>
                                             </div>
                                             <span className="text-xs font-black">98% Sifat</span>
                                        </div>
                                   </div>
                              </div>
                         </div>
                    </div>
               </main>
          </div>
     );
}

function NavItem({ icon, label, active = false, onClick }: { icon: any, label: string, active?: boolean, onClick?: () => void }) {
     return (
          <button
               onClick={onClick}
               className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl font-bold transition-all ${active ? 'bg-primary text-white shadow-lg shadow-primary/10' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                    }`}
          >
               {icon}
               <span className="text-sm">{label}</span>
          </button>
     );
}

function StatCard({ icon, label, value, color, trend }: { icon: any, label: string, value: string | number, color: string, trend?: number[] }) {
     return (
          <motion.div
               whileHover={{ y: -5 }}
               className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col gap-4 overflow-hidden relative"
          >
               <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 ${color} rounded-2xl flex items-center justify-center`}>
                         {icon}
                    </div>
                    <div>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-0.5">{label}</p>
                         <p className="text-xl font-black text-slate-900 font-display">{value}</p>
                    </div>
               </div>

               {/* Mini Sparkline Chart */}
               {trend && trend.length > 0 && (
                    <div className="flex items-end gap-1 h-10 w-full mt-2">
                         {trend.map((val, i) => (
                              <motion.div
                                   key={i}
                                   initial={{ height: 0 }}
                                   animate={{ height: `${Math.max(10, (val / Math.max(...trend)) * 100)}%` }}
                                   className={`flex-1 rounded-t-sm ${color.replace('bg-', 'bg-').replace('50', '500')}`}
                                   style={{ opacity: 0.3 + (i / 10) }}
                              />
                         ))}
                    </div>
               )}
          </motion.div>
     );
}

function QuickAction({ icon, label, onClick }: { icon: any, label: string, onClick?: () => void }) {
     return (
          <button
               onClick={onClick}
               className="flex flex-col items-center justify-center gap-3 p-5 rounded-3xl bg-slate-50 hover:bg-white hover:shadow-md border border-slate-100 hover:border-slate-200 transition-all group"
          >
               <div className="w-10 h-10 rounded-2xl bg-white border border-slate-100 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                    {icon}
               </div>
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
          </button>
     );
}
