"use client";

import { motion } from "framer-motion";
import { Bot, GraduationCap, LayoutPanelLeft, ArrowRight, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
     return (
          <div className="bg-white">
               {/* Hero Section */}
               <section className="relative overflow-hidden pt-20 pb-20 md:pt-32 md:pb-32">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/5 rounded-full blur-3xl -z-10"></div>

                    <div className="max-w-7xl mx-auto px-4 text-center">
                         <motion.div
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full font-bold text-sm mb-8"
                         >
                              <Bot size={18} />
                              Yangi Avlod Test Platformasi
                         </motion.div>

                         <motion.h1
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="text-5xl md:text-7xl font-bold font-display text-gray-900 mb-6 leading-tight"
                         >
                              Professional <span className="text-primary italic">Titul</span> Testlar <br className="hidden md:block" /> Soniya Ichida.
                         </motion.h1>

                         <motion.p
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.1 }}
                              className="text-xl text-gray-500 max-w-2xl mx-auto mb-10"
                         >
                              O'qituvchilar uchun qulay boshqaruv va abiturentlar uchun real DTM uslubidagi topshirish interfeysi. Hammasi bir joyda.
                         </motion.p>

                         <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.2 }}
                              className="flex flex-wrap justify-center gap-4"
                         >
                              <Link href="https://t.me/Rash_testi_bot" className="btn-primary px-8 py-4 text-lg">
                                   Botni Ishga Tushirish <ArrowRight />
                              </Link>
                              <Link href="/submit" className="bg-white border-2 border-gray-100 hover:border-gray-200 text-gray-600 font-bold py-4 px-8 rounded-2xl transition-all shadow-sm">
                                   Test Topshirish
                              </Link>
                         </motion.div>
                    </div>
               </section>

               {/* Features */}
               <section className="py-24 bg-gray-50/50">
                    <div className="max-w-7xl mx-auto px-4">
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                              <FeatureCard
                                   icon={<GraduationCap className="text-primary" size={32} />}
                                   title="DTM Uslubida"
                                   desc="Abiturentlar uchun xuddi titul qog'ozi kabi qulay va tushunarli interfeys."
                              />
                              <FeatureCard
                                   icon={<LayoutPanelLeft className="text-primary" size={32} />}
                                   title="Yozma Savollar"
                                   desc="Faqat variantli emas, balki yozma javob talab qiluvchi savollarni ham qo'shish imkoni."
                              />
                              <FeatureCard
                                   icon={<CheckCircle className="text-primary" size={32} />}
                                   title="Tezkor PDF"
                                   desc="Test yakunlangach barcha natijalarni jamlangan professional PDF formatida yuklab oling."
                              />
                         </div>
                    </div>
               </section>

               {/* Footer */}
               <footer className="py-12 border-t border-gray-100">
                    <div className="max-w-7xl mx-auto px-4 text-center">
                         <p className="text-gray-400 font-medium">© 2026 Titul Test Bot. Barcha huquqlar himoyalangan.</p>
                    </div>
               </footer>
          </div>
     );
}

function FeatureCard({ icon, title, desc }: { icon: any, title: string, desc: string }) {
     return (
          <motion.div
               whileHover={{ y: -10 }}
               className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all"
          >
               <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center mb-6">
                    {icon}
               </div>
               <h3 className="text-2xl font-bold mb-4 font-display">{title}</h3>
               <p className="text-gray-500 leading-relaxed font-medium">
                    {desc}
               </p>
          </motion.div>
     );
}
