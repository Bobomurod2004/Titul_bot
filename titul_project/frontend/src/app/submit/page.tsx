"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { LogIn, User, Hash, AlertCircle, ArrowRight } from "lucide-react";
import api from "@/lib/api";

export default function SubmitLoginPage() {
     const router = useRouter();
     const searchParams = useSearchParams();
     const [name, setName] = useState("");
     const [code, setCode] = useState("");
     const [loading, setLoading] = useState(false);
     const [error, setError] = useState("");

     useEffect(() => {
          const urlCode = searchParams.get("code") || searchParams.get("id");
          if (urlCode) {
               setCode(urlCode.toUpperCase());
          }
     }, [searchParams]);

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
               const test = response.data;

               if (!test.is_active) {
                    setError("Ushbu test yakunlangan!");
                    setLoading(false);
                    return;
               }

               localStorage.setItem("student_name", name);
               const userId = searchParams.get("user_id") || "0";
               router.push(`/submit/${test.id}?user_id=${userId}`);
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

                    <p className="text-center text-slate-300 text-xs mt-10 font-medium tracking-widest uppercase">
                         Titul Test Platformasi • 2026 Premium
                    </p>
               </motion.div>
          </div>
     );
}
