"use client";

import { useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Bot, GraduationCap, LayoutPanelLeft, ArrowRight, CheckCircle, Zap, Shield, Users, Globe, Play, Sparkles, Book, Pi, Beaker, FlaskConical, Languages, Map, History, Microscope, Lightbulb, Info, FileText, Keyboard } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";

export default function LandingPage() {
     const [stats, setStats] = useState({ total_users: 0, total_tests: 0, total_submissions: 0 });
     const [links, setLinks] = useState({ bot_link: "https://t.me/Kamunal_manitoring_bot", channel_link: "https://t.me/Titul_testlar" });
     const { scrollY } = useScroll();
     const y1 = useTransform(scrollY, [0, 500], [0, 200]);
     const y2 = useTransform(scrollY, [0, 500], [0, -150]);

     useEffect(() => {
          const fetchPublicStats = async () => {
               try {
                    const res = await api.get("/public-stats/");
                    setStats(res.data);
               } catch (err) {
                    // Fallback to zeros/defaults on error instead of fake data
                    setStats({ total_users: 0, total_tests: 0, total_submissions: 0 });
               }
          };

          const fetchLinks = async () => {
               try {
                    const res = await api.get("/admin/settings/");
                    const settings = res.data;
                    let channelUrl = "https://t.me/Titul_testlar";

                    // Prioritize mandatory_channels list
                    if (settings.mandatory_channels && settings.mandatory_channels.length > 0) {
                         channelUrl = settings.mandatory_channels[0].link;
                    } else if (settings.channel_link) {
                         channelUrl = settings.channel_link;
                    }

                    setLinks({
                         bot_link: settings.bot_link || "https://t.me/Kamunal_manitoring_bot",
                         channel_link: channelUrl
                    });
               } catch (err) {
                    console.error("Error fetching links:", err);
               }
          };

          fetchPublicStats();
          fetchLinks();
     }, []);

     return (
          <div className="bg-white overflow-x-hidden selection:bg-primary/30 selection:text-primary-dark">
               {/* Navbar - Simple & Clean */}
               <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6 py-4">
                    <div className="max-w-7xl mx-auto flex items-center justify-between">
                         <div className="flex items-center gap-2 group cursor-pointer">
                              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20 group-hover:rotate-12 transition-transform">
                                   <Zap size={20} fill="currentColor" />
                              </div>
                              <span className="text-xl font-black font-display tracking-tight text-slate-900">Titul Bot</span>
                         </div>
                         <div className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-500 uppercase tracking-widest">
                              <a href="#features" className="hover:text-primary transition-colors">Imkoniyatlar</a>
                              <a href="#how-it-works" className="hover:text-primary transition-colors">Qanday ishlaydi?</a>
                              <a href="#stats" className="hover:text-primary transition-colors">Statistika</a>
                         </div>
                         <Link href={links.bot_link} className="btn-primary px-6 py-2.5 text-sm shadow-xl shadow-primary/20">
                              Boshlash
                         </Link>
                    </div>
               </nav>

               {/* Hero Section */}
               <section className="relative pt-32 pb-20 md:pt-52 md:pb-40 bg-slate-50/30">
                    {/* Animated Background Elements */}
                    <motion.div style={{ y: y1 }} className="absolute top-20 right-[10%] w-64 h-64 bg-primary/10 rounded-full blur-3xl -z-10 animate-pulse" />
                    <motion.div style={{ y: y2 }} className="absolute bottom-40 left-[5%] w-96 h-96 bg-indigo-50/50 rounded-full blur-3xl -z-10" />

                    <div className="max-w-7xl mx-auto px-6 text-center">
                         <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="inline-flex items-center gap-3 bg-white border border-slate-100 text-primary px-6 py-2.5 rounded-full font-black text-[10px] uppercase tracking-[0.2em] mb-10 shadow-sm"
                         >
                              <Sparkles size={16} className="animate-spin-slow" />
                              Yangi Avlod Test Platformasi v2.5
                         </motion.div>

                         <motion.h1
                              initial={{ opacity: 0, y: 30 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.1 }}
                              className="text-6xl md:text-8xl font-black font-display text-slate-900 mb-8 leading-[1.05] tracking-tight"
                         >
                              Professional <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-600">Titul</span><br />
                              Testlar Soniya Ichida.
                         </motion.h1>

                         <motion.p
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.2 }}
                              className="text-xl md:text-2xl text-slate-500 max-w-3xl mx-auto mb-14 font-medium leading-relaxed"
                         >
                              O'qituvchilar uchun qulay boshqaruv va abiturentlar uchun real DTM uslubidagi topshirish interfeysi. Hammasi bir joyda, mutlaqo professional.
                         </motion.p>

                         <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.3 }}
                              className="flex flex-col sm:flex-row justify-center gap-6"
                         >
                              <Link href={links.bot_link} className="bg-primary hover:bg-primary-dark text-white px-10 py-5 text-lg font-black rounded-3xl transition-all shadow-2xl shadow-primary/30 flex items-center justify-center gap-3 active:scale-95">
                                   Telegram Botni Ochish <ArrowRight size={20} strokeWidth={3} />
                              </Link>
                              <Link href="/submit" className="bg-white border-2 border-slate-100 hover:border-primary hover:text-primary text-slate-600 px-10 py-5 text-lg font-black rounded-3xl transition-all shadow-sm flex items-center justify-center gap-3 hover:shadow-xl hover:shadow-slate-200/50">
                                   Test Topshirish <Zap size={20} />
                              </Link>
                         </motion.div>
                    </div>
               </section>

               {/* Live Stats Section */}
               <section id="stats" className="py-24 bg-white relative z-10">
                    <div className="max-w-7xl mx-auto px-6">
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                              <StatItem value={stats.total_users} label="Foydalanuvchilar" icon={<Users className="text-primary" size={32} />} />
                              <StatItem value={stats.total_tests} label="E'lon qilingan testlar" icon={<LayoutPanelLeft className="text-indigo-600" size={32} />} />
                              <StatItem value={stats.total_submissions} label="Topshirilgan natijalar" icon={<CheckCircle className="text-emerald-600" size={32} />} />
                         </div>
                    </div>
               </section>

               {/* Educational Subjects Grid */}
               <section id="subjects" className="py-32 bg-white relative">
                    <div className="max-w-7xl mx-auto px-6">
                         <div className="text-center mb-20">
                              <h2 className="text-[10px] font-black uppercase text-secondary tracking-[0.3em] mb-4">Mavjud Fanlar</h2>
                              <p className="text-4xl md:text-6xl font-black text-slate-900 font-display">Barcha Fanlar Uchun Birdek Qulay</p>
                              <p className="mt-6 text-slate-500 font-medium max-w-2xl mx-auto">Platformamiz barcha asosiy fanlar uchun moslashtirilgan. Har bir fan uchun maxsus kalkulyator va klaviaturalar mavjud.</p>
                         </div>

                         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                              <SubjectCard icon={<Pi size={28} />} name="Matematika" color="bg-blue-50 text-blue-600" />
                              <SubjectCard icon={<Microscope size={28} />} name="Fizika" color="bg-indigo-50 text-indigo-600" />
                              <SubjectCard icon={<Beaker size={28} />} name="Kimyo" color="bg-emerald-50 text-emerald-600" />
                              <SubjectCard icon={<FlaskConical size={28} />} name="Biologiya" color="bg-green-50 text-green-600" />
                              <SubjectCard icon={<History size={28} />} name="Tarix" color="bg-amber-50 text-amber-600" />
                              <SubjectCard icon={<Languages size={28} />} name="Ona tili" color="bg-purple-50 text-purple-600" />
                              <SubjectCard icon={<Languages size={28} />} name="Ingliz tili" color="bg-rose-50 text-rose-600" />
                              <SubjectCard icon={<Map size={28} />} name="Geografiya" color="bg-sky-50 text-sky-600" />
                              <SubjectCard icon={<Book size={28} />} name="Adabiyot" color="bg-orange-50 text-orange-600" />
                              <SubjectCard icon={<Sparkles size={28} />} name="Barcha fanlar" color="bg-slate-50 text-slate-600" />
                         </div>
                    </div>
               </section>

               {/* Teacher's Academy / Pro Tips */}
               <section className="py-32 bg-slate-900 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-1/2 h-full bg-primary/10 blur-[120px] rounded-full -mr-64 pointer-events-none" />

                    <div className="max-w-7xl mx-auto px-6 relative z-10">
                         <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                              <div>
                                   <div className="inline-flex items-center gap-3 bg-white/10 border border-white/10 text-white px-5 py-2 rounded-full font-black text-[10px] uppercase tracking-widest mb-8">
                                        <Lightbulb size={16} /> O'qituvchilar Akademiyasi
                                   </div>
                                   <h2 className="text-4xl md:text-6xl font-black font-display mb-8 leading-tight">Professional O'qituvchilar Tanlovi.</h2>
                                   <p className="text-white/60 text-xl font-medium mb-12 leading-relaxed">
                                        Test yaratish jarayonini san'at darajasiga ko'taring. Platformamiz o'qituvchilar uchun cheksiz imkoniyatlar taqdim etadi.
                                   </p>

                                   <div className="space-y-6">
                                        <ProTipItem
                                             icon={<Keyboard size={24} />}
                                             title="Ilmiy Klaviatura"
                                             desc="Matematika va fizika fanlari uchun murakkab formulalarni osongina kiriting."
                                        />
                                        <ProTipItem
                                             icon={<FileText size={24} />}
                                             title="Avtomatik Hisobot"
                                             desc="Har bir o'quvchi uchun alohida va umumiy sinf uchun tahliliy PDF natijalarni oling."
                                        />
                                        <ProTipItem
                                             icon={<Zap size={24} />}
                                             title="Tezkor Tekshirish"
                                             desc="Test yakunlanishi bilan natijalar tayyor. Vaqtingizni o'quvchilarga bag'ishlang."
                                        />
                                   </div>
                              </div>

                              <div className="relative">
                                   <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-8 md:p-12 shadow-2xl">
                                        <div className="flex items-center gap-4 mb-10">
                                             <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white">
                                                  <Info size={24} />
                                             </div>
                                             <div>
                                                  <h4 className="font-black text-xl">Muhim Maslahat!</h4>
                                                  <p className="text-white/40 text-sm">Samaradorlikni oshirish uchun</p>
                                             </div>
                                        </div>
                                        <p className="text-white/80 leading-relaxed italic mb-8 border-l-4 border-primary pl-6 py-2">
                                             "Abiturentlar uchun test yaratayotganda, 'DTM Standart' rejimini tanlang. Bu ularga real imtihon atmosferasini his qilishga yordam beradi."
                                        </p>
                                        <div className="flex items-center gap-4">
                                             <div className="w-12 h-12 bg-slate-800 rounded-full" />
                                             <div>
                                                  <p className="font-bold">Akmal Rejabboyev</p>
                                                  <p className="text-xs text-white/40 uppercase tracking-widest font-bold">Matematika O'qituvchisi</p>
                                             </div>
                                        </div>
                                   </div>
                              </div>
                         </div>
                    </div>
               </section>

               {/* How it Works Section */}
               <section id="how-it-works" className="py-32 bg-white">
                    <div className="max-w-7xl mx-auto px-6 text-center">
                         <h2 className="text-4xl md:text-6xl font-black font-display text-slate-900 mb-20">3 Qadamda Boshlang</h2>
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-20 relative">
                              <div className="hidden md:block absolute top-1/4 left-1/4 right-1/4 h-0.5 bg-slate-100 border-dashed border-2 -z-10" />
                              <StepItem number="01" title="Botni Ishga Tushiring" desc="Telegram botimizga o'ting va /start buyrug'ini bosing." />
                              <StepItem number="02" title="Test Yarating" desc="O'qituvchi bo'limidan savollar va kalitlarni kiriting." />
                              <StepItem number="03" title="Natijalarni Oling" desc="Talabalar testni yakunlagach, tayyor PDF hisobotni yuklang." />
                         </div>
                    </div>
               </section>

               {/* CTA Section */}
               <section className="py-32 bg-primary relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] bg-[size:40px_40px] opacity-10" />
                    <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
                         <h2 className="text-4xl md:text-6xl font-black font-display text-white mb-8">Hali ham o'ylayapsizmi?</h2>
                         <p className="text-white/70 text-xl max-w-2xl mx-auto mb-12 font-medium">Minglab o'qituvchilar va o'quvchilar allaqachon bizning platformamizdan foydalanmoqda.</p>
                         <Link href={links.bot_link} className="inline-flex items-center gap-4 bg-white text-primary px-12 py-6 rounded-[2.5rem] font-black text-xl shadow-2xl hover:scale-105 transition-all">
                              Hoziroq Qo'shiling <ArrowRight size={24} strokeWidth={3} />
                         </Link>
                    </div>
               </section>

               {/* Footer */}
               <footer className="py-20 border-t border-slate-100 bg-white">
                    <div className="max-w-7xl mx-auto px-6">
                         <div className="flex flex-col md:flex-row justify-between items-center gap-10">
                              <div className="flex items-center gap-3">
                                   <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white">
                                        <Zap size={20} fill="currentColor" />
                                   </div>
                                   <span className="text-2xl font-black font-display text-slate-900">Titul Bot</span>
                              </div>
                              <div className="flex gap-8 text-sm font-bold text-slate-400 uppercase tracking-widest">
                                   <a href="#" className="hover:text-primary transition-colors">Maxfiylik</a>
                                   <a href="#" className="hover:text-primary transition-colors">Shartlar</a>
                                   <a href="https://t.me/Kamunal_manitoring_bot" className="hover:text-primary transition-colors">Yordam</a>
                              </div>
                              <p className="text-slate-400 font-bold">© 2026 Titul Test Bot. Premium Experience.</p>
                         </div>
                    </div>
               </footer>
          </div>
     );
}

function StatItem({ value, label, icon }: { value: number, label: string, icon: any }) {
     const [displayValue, setDisplayValue] = useState(0);

     useEffect(() => {
          let start = 0;
          const end = value;
          const duration = 2000;
          const increment = end / (duration / 16);
          const animate = () => {
               start += increment;
               if (start < end) {
                    setDisplayValue(Math.floor(start));
                    requestAnimationFrame(animate);
               } else {
                    setDisplayValue(end);
               }
          };
          animate();
     }, [value]);

     return (
          <div className="flex flex-col items-center text-center">
               <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6 shadow-sm ring-8 ring-slate-50/50">
                    {icon}
               </div>
               <p className="text-5xl font-black font-display text-slate-900 mb-2">{displayValue.toLocaleString()}+</p>
               <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">{label}</p>
          </div>
     );
}

function FeatureCard({ icon, title, desc, color }: { icon: any, title: string, desc: string, color: string }) {
     return (
          <motion.div
               whileHover={{ y: -10, rotateZ: 1 }}
               className="bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-sm hover:shadow-[0_20px_100px_rgba(0,0,0,0.05)] transition-all duration-500 group"
          >
               <div className={`w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-8 group-hover:bg-primary group-hover:text-white transition-all duration-500 ${color}`}>
                    {icon}
               </div>
               <h3 className="text-3xl font-black mb-6 font-display text-slate-900">{title}</h3>
               <p className="text-slate-500 leading-relaxed font-medium text-lg">
                    {desc}
               </p>
          </motion.div>
     );
}

function StepItem({ number, title, desc }: { number: string, title: string, desc: string }) {
     return (
          <div className="flex flex-col items-center group">
               <div className="w-24 h-24 bg-white border-2 border-slate-100 rounded-full flex items-center justify-center mb-8 relative z-10 group-hover:border-primary group-hover:shadow-xl group-hover:shadow-primary/20 transition-all duration-500">
                    <span className="text-3xl font-black text-slate-300 group-hover:text-primary transition-colors">{number}</span>
               </div>
               <h3 className="text-2xl font-black mb-4 font-display text-slate-900">{title}</h3>
               <p className="text-slate-500 font-medium leading-relaxed">
                    {desc}
               </p>
          </div>
     );
}
function SubjectCard({ icon, name, color }: { icon: any, name: string, color: string }) {
     return (
          <motion.div
               whileHover={{ y: -5, scale: 1.05 }}
               className={`flex flex-col items-center justify-center p-8 rounded-[2.5rem] border border-slate-100 shadow-sm transition-all cursor-pointer ${color}`}
          >
               <div className="mb-4">{icon}</div>
               <span className="font-black text-xs uppercase tracking-widest text-center">{name}</span>
          </motion.div>
     );
}

function ProTipItem({ icon, title, desc }: { icon: any, title: string, desc: string }) {
     return (
          <div className="flex gap-6 items-start">
               <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-primary shrink-0">
                    {icon}
               </div>
               <div>
                    <h4 className="font-bold text-lg mb-1">{title}</h4>
                    <p className="text-white/40 text-sm">{desc}</p>
               </div>
          </div>
     );
}
