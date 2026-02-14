"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { LogIn, User, Hash, AlertCircle, ArrowRight, Clock, Info } from "lucide-react";
import api from "@/lib/api";

export default function SubmitLoginPage() {
     const router = useRouter();
     const { id: userIdParam } = useParams();
     const userId = String(userIdParam).match(/^\d+$/) ? userIdParam : "0";

     const searchParams = useSearchParams();
     const [name, setName] = useState("");
     const [code, setCode] = useState("");
     const [loading, setLoading] = useState(false);
     const [error, setError] = useState("");
     const [test, setTest] = useState<any>(null);

     useEffect(() => {
          const urlCode = searchParams.get("code") || searchParams.get("id");
          if (urlCode && !code) setCode(urlCode);

          const fetchTestInfo = async () => {
               const activeCode = code || urlCode;
               if (activeCode && activeCode.length === 8) {
                    try {
                         const res = await api.get(`/tests/code/${activeCode}/`);
                         setTest(res.data);
                    } catch (err) {
                         setTest(null);
                    }
               } else {
                    setTest(null);
               }
          };
          fetchTestInfo();
     }, [code, searchParams]);



     const handleEnter = async (e: React.FormEvent) => {
          e.preventDefault();
          if (!name || !code) {
               setError("Iltimos, ismingizni va test kodini kiriting!");
               return;
          }

          setLoading(true);
          setError("");
          try {
               const response = await api.get(`/tests/code/${code}/`);
               const testData = response.data;
               setTest(testData);

               if (!testData.is_active) {
                    setError("Ushbu test yakunlangan!");
                    setLoading(false);
                    return;
               }

               localStorage.setItem("student_name", name);
               router.push(`/submit/${testData.id}/${userId}`);
          } catch (err: any) {
               setError(err.response?.status === 404 ? "Test kodi noto'g'ri!" : "Xatolik yuz berdi");
          } finally {
               setLoading(false);
          }
     };

     return (
          <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50/30">
               <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="titul-card max-w-lg w-full"
               >
                    <div className="text-center mb-10">
                         <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary mx-auto mb-6">
                              <LogIn size={40} />
                         </div>
                         <h1 className="text-4xl font-black font-display text-slate-900 mb-2 font-[Outfit]">Testga Kirish</h1>
                         <p className="text-slate-400 font-medium italic">Ismingiz va test kodini kiriting</p>
                         <AnimatePresence>
                              {test && (
                                   <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="mt-6 p-6 bg-slate-50 rounded-3xl border border-slate-100 w-full flex flex-col items-center gap-3"
                                   >
                                        <div className="flex flex-col items-center">
                                             <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">{test.subject}</span>
                                             <h2 className="text-xl font-black text-slate-900 text-center">{test.title}</h2>
                                        </div>

                                        <div className="w-full h-px bg-slate-200/50 my-1" />

                                        <div className="flex items-center gap-2 text-amber-600 font-bold text-sm">
                                             <Clock size={16} />
                                             <span>
                                                  Tugash vaqti: {test.expires_at ? new Date(test.expires_at).toLocaleString('uz-UZ', {
                                                       hour: '2-digit',
                                                       minute: '2-digit',
                                                       day: '2-digit',
                                                       month: '2-digit',
                                                       year: 'numeric'
                                                  }) : "Cheksiz"}
                                             </span>
                                        </div>
                                   </motion.div>
                              )}
                         </AnimatePresence>
                    </div>

                    {error && (
                         <motion.div
                              initial={{ x: -10, opacity: 0 }}
                              animate={{ x: 0, opacity: 1 }}
                              className="bg-red-50 border-l-4 border-red-500 text-red-600 p-4 rounded-xl mb-8 flex items-center gap-3 font-semibold"
                         >
                              <AlertCircle size={20} />
                              {error}
                         </motion.div>
                    )}

                    <form onSubmit={handleEnter} className="space-y-6">
                         <div className="space-y-2">
                              <label className="text-sm font-bold text-slate-500 ml-1 uppercase tracking-wider flex items-center gap-2">
                                   <User size={16} /> Ism va Familiyangiz
                              </label>
                              <input
                                   type="text"
                                   placeholder="Masalan: Sobir Jumayev"
                                   className="input-premium"
                                   value={name}
                                   onChange={(e) => setName(e.target.value)}
                              />
                         </div>

                         <div className="space-y-2">
                              <label className="text-sm font-bold text-slate-500 ml-1 uppercase tracking-wider flex items-center gap-2">
                                   <Hash size={16} /> Test Kodi (Access Code)
                              </label>
                              <input
                                   type="text"
                                   placeholder="AB12CD34"
                                   className="input-premium uppercase tracking-[0.2em] font-black text-center"
                                   value={code}
                                   onChange={(e) => setCode(e.target.value)}
                              />
                         </div>

                         <button
                              type="submit"
                              disabled={loading}
                              className={`btn-primary w-full py-5 text-xl mt-4 group ${loading ? 'opacity-70' : ''}`}
                         >
                              {loading ? (
                                   <div className="w-6 h-6 border-4 border-white border-t-transparent animate-spin rounded-full"></div>
                              ) : (
                                   <>
                                        Testni Boshlash <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                                   </>
                              )}
                         </button>
                    </form>

                    <div className="mt-10 p-6 bg-primary/5 rounded-[2rem] border-2 border-primary/10">
                         <div className="flex items-center gap-3 mb-3 text-primary">
                              <Info size={18} className="shrink-0" />
                              <span className="text-sm font-black uppercase tracking-wider">Eslatmalar</span>
                         </div>
                         <ul className="space-y-3">
                              <li className="flex gap-3 text-xs text-slate-500 font-medium leading-relaxed">
                                   <div className="w-1.5 h-1.5 bg-primary/40 rounded-full mt-1.5 shrink-0" />
                                   Ism va familiyangizni to'liq hamda to'g'ri kiriting.
                              </li>
                              <li className="flex gap-3 text-xs text-slate-500 font-medium leading-relaxed">
                                   <div className="w-1.5 h-1.5 bg-primary/40 rounded-full mt-1.5 shrink-0" />
                                   Test kodini ustozingizdan olganingizdek kiriting (8 ta belgi).
                              </li>
                              <li className="flex gap-3 text-xs text-slate-500 font-medium leading-relaxed">
                                   <div className="w-1.5 h-1.5 bg-primary/40 rounded-full mt-1.5 shrink-0" />
                                   Test jarayonida barqaror internet aloqasi mavjudligiga ishonch hosil qiling.
                              </li>
                         </ul>
                    </div>

                    <p className="text-center text-slate-300 text-xs mt-10 font-medium tracking-widest uppercase">
                         Titul Test Platformasi • 2026 Premium
                    </p>
               </motion.div>
          </div>
     );
}
