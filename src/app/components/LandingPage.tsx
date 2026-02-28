import { Link } from "react-router";
import { motion } from "motion/react";
import {
  Shield,
  Sparkles,
  Bell,
  TrendingUp,
  MapPin,
  ArrowRight,
  Zap,
  CheckCircle2,
  Star,
  ChevronRight,
  Users,
  Lock,
  BarChart3,
  Eye,
} from "lucide-react";
import { ScoreRing } from "./ScoreRing";
import { listings } from "./data";
import { ImageWithFallback } from "./figma/ImageWithFallback";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#111117] to-[#0a0a0f] text-white">
      {/* Ambient blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-purple-500/15 rounded-full blur-[150px]" />
        <div className="absolute top-[40%] -left-40 w-[400px] h-[400px] bg-blue-500/15 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-[30%] w-[300px] h-[300px] bg-emerald-500/10 rounded-full blur-[120px]" />
      </div>

      {/* Navigation */}
      <nav className="relative z-20 container mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Zap className="w-5 h-5" />
          </div>
          <span className="text-[20px]" style={{ fontWeight: 700 }}>
            HomePilot
          </span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-[14px] text-gray-400 hover:text-white transition-colors">
            Features
          </a>
          <a href="#how-it-works" className="text-[14px] text-gray-400 hover:text-white transition-colors">
            How It Works
          </a>
          <a href="#social-proof" className="text-[14px] text-gray-400 hover:text-white transition-colors">
            Testimonials
          </a>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/home"
            className="hidden sm:block px-4 py-2 rounded-lg text-[14px] text-gray-300 hover:text-white transition-colors"
            style={{ fontWeight: 500 }}
          >
            Sign In
          </Link>
          <Link
            to="/onboarding"
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 transition-all text-[14px] shadow-lg shadow-purple-500/20"
            style={{ fontWeight: 600 }}
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* ═══════════ HERO ═══════════ */}
      <section className="relative z-10 container mx-auto px-6 pt-16 pb-24 md:pt-24 md:pb-32">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto text-center"
        >
          <div className="inline-flex items-center gap-2 bg-white/[0.06] border border-white/10 rounded-full px-4 py-1.5 mb-8">
            <Sparkles size={14} className="text-purple-400" />
            <span className="text-[13px] text-gray-300" style={{ fontWeight: 500 }}>
              AI-powered rental intelligence for Gen Z
            </span>
          </div>
          <h1
            className="text-[44px] sm:text-[56px] md:text-[72px] mb-6 bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent"
            style={{ fontWeight: 800, lineHeight: 1.05 }}
          >
            AI That Hunts
            <br />
            Apartments For You.
          </h1>
          <p className="text-[18px] md:text-[22px] text-gray-400 mb-10 max-w-2xl mx-auto" style={{ lineHeight: 1.5 }}>
            HomePilot monitors listings, predicts approval odds, detects scams, and tells you exactly when to apply.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/onboarding"
              className="inline-flex items-center gap-2.5 px-8 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 transition-all shadow-xl shadow-purple-500/25 hover:shadow-purple-500/40 text-[16px]"
              style={{ fontWeight: 600 }}
            >
              Create Renter Passport
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/home"
              className="inline-flex items-center gap-2 px-6 py-4 rounded-xl bg-white/[0.06] border border-white/10 hover:bg-white/[0.1] transition-all text-gray-300 text-[16px]"
              style={{ fontWeight: 500 }}
            >
              <Eye size={18} />
              View Demo
            </Link>
          </div>
        </motion.div>

        {/* Live Dashboard Preview */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="max-w-5xl mx-auto mt-20"
        >
          <div className="rounded-2xl bg-gradient-to-b from-white/10 to-white/[0.03] p-[1px] shadow-2xl shadow-black/40">
            <div className="rounded-2xl bg-gradient-to-br from-[#12131f] to-[#0c0d17] p-6 md:p-8 overflow-hidden">
              {/* Browser chrome */}
              <div className="flex items-center gap-3 mb-6">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
                  <div className="w-3 h-3 rounded-full bg-[#FDBC40]" />
                  <div className="w-3 h-3 rounded-full bg-[#33C748]" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="bg-white/[0.06] rounded-lg px-4 py-1.5 max-w-xs">
                    <span className="text-[12px] text-gray-500">homepilot.ai/dashboard</span>
                  </div>
                </div>
              </div>

              {/* Mini dashboard */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Score card */}
                <div className="bg-white/[0.04] rounded-xl p-5 border border-white/[0.06]">
                  <div className="flex items-center gap-4">
                    <ScoreRing score={847} size={72} strokeWidth={5} label="" />
                    <div>
                      <p className="text-[#10B981] text-[12px]" style={{ fontWeight: 600 }}>
                        Excellent
                      </p>
                      <p className="text-white text-[20px]" style={{ fontWeight: 700 }}>
                        847
                      </p>
                      <p className="text-gray-500 text-[11px]">Renter Score</p>
                    </div>
                  </div>
                </div>

                {/* Listing cards */}
                {listings.slice(0, 2).map((l) => (
                  <div
                    key={l.id}
                    className="bg-white/[0.04] rounded-xl overflow-hidden border border-white/[0.06]"
                  >
                    <div className="relative h-24">
                      <ImageWithFallback
                        src={l.image}
                        alt={l.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 right-2 bg-[#10B981] px-2 py-0.5 rounded-md">
                        <span className="text-white text-[11px]" style={{ fontWeight: 700 }}>
                          {l.matchPercent}%
                        </span>
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="text-white text-[13px] truncate" style={{ fontWeight: 600 }}>
                        {l.title}
                      </p>
                      <p className="text-gray-500 text-[11px]">${l.price.toLocaleString()}/mo</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ═══════════ LOGOS / SOCIAL PROOF BAR ═══════════ */}
      <section className="relative z-10 border-y border-white/[0.06] py-10">
        <div className="container mx-auto px-6">
          <p className="text-center text-gray-500 text-[13px] mb-6" style={{ fontWeight: 500 }}>
            TRUSTED BY RENTERS AT
          </p>
          <div className="flex items-center justify-center gap-10 md:gap-16 flex-wrap opacity-40">
            {["NYU", "Columbia", "MIT", "Stanford", "UT Austin", "UCLA"].map((name) => (
              <span key={name} className="text-[16px] text-gray-300 tracking-wider" style={{ fontWeight: 700 }}>
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ FEATURES ═══════════ */}
      <section id="features" className="relative z-10 container mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-[36px] md:text-[44px] mb-4"
            style={{ fontWeight: 700 }}
          >
            Everything you need to
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              win your next apartment
            </span>
          </motion.h2>
          <p className="text-gray-400 text-[18px] max-w-xl mx-auto">
            Six powerful features working together so you never miss a listing again.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
          {[
            {
              icon: Shield,
              title: "Verified Renter Passport",
              desc: "Build a trusted profile that landlords love. Complete verification increases approval by 40%.",
              gradient: "from-blue-500/20 to-blue-600/20",
              border: "border-blue-500/20",
              iconColor: "text-blue-400",
            },
            {
              icon: Sparkles,
              title: "Acceptance Probability Engine",
              desc: "AI predicts your approval odds for each listing based on your profile and landlord preferences.",
              gradient: "from-purple-500/20 to-purple-600/20",
              border: "border-purple-500/20",
              iconColor: "text-purple-400",
            },
            {
              icon: Bell,
              title: "Proactive AI Alerts",
              desc: "Get notified instantly when new listings match your criteria, before the competition sees them.",
              gradient: "from-green-500/20 to-green-600/20",
              border: "border-green-500/20",
              iconColor: "text-green-400",
            },
            {
              icon: TrendingUp,
              title: "Auto-Optimization Strategy",
              desc: "AI suggests profile improvements that boost approval rates by analyzing successful applications.",
              gradient: "from-orange-500/20 to-orange-600/20",
              border: "border-orange-500/20",
              iconColor: "text-orange-400",
            },
            {
              icon: MapPin,
              title: "Livability + Risk Intelligence",
              desc: "Detect scams, analyze neighborhood safety, and get insights on commute times and amenities.",
              gradient: "from-red-500/20 to-red-600/20",
              border: "border-red-500/20",
              iconColor: "text-red-400",
            },
            {
              icon: Zap,
              title: "1-Click Smart Apply",
              desc: "Apply to any listing instantly with your Renter Passport. No more filling out forms repeatedly.",
              gradient: "from-cyan-500/20 to-cyan-600/20",
              border: "border-cyan-500/20",
              iconColor: "text-cyan-400",
            },
          ].map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="rounded-2xl bg-gradient-to-br from-white/[0.05] to-white/[0.01] p-7 border border-white/[0.08] hover:border-white/[0.15] transition-all group"
            >
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-5 border ${feature.border} group-hover:scale-110 transition-transform`}
              >
                <feature.icon className={`w-6 h-6 ${feature.iconColor}`} />
              </div>
              <h3 className="text-[18px] mb-2" style={{ fontWeight: 600 }}>
                {feature.title}
              </h3>
              <p className="text-gray-400 text-[14px]" style={{ lineHeight: 1.6 }}>
                {feature.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══════════ HOW IT WORKS ═══════════ */}
      <section id="how-it-works" className="relative z-10 container mx-auto px-6 py-24">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-[36px] md:text-[44px] text-center mb-16"
          style={{ fontWeight: 700 }}
        >
          Three steps to your{" "}
          <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            dream apartment
          </span>
        </motion.h2>
        <div className="grid md:grid-cols-3 gap-8 lg:gap-12 max-w-5xl mx-auto">
          {[
            {
              step: "01",
              title: "Build Your Passport",
              desc: "Upload documents, set preferences, and let AI build your verified renter profile in minutes.",
              icon: Shield,
            },
            {
              step: "02",
              title: "AI Hunts 24/7",
              desc: "Our copilot continuously scans thousands of listings and scores each one against your profile.",
              icon: BarChart3,
            },
            {
              step: "03",
              title: "Apply & Win",
              desc: "Get real-time alerts for high-match listings and apply instantly with your verified passport.",
              icon: Zap,
            },
          ].map((item, i) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="text-center"
            >
              <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/15 to-purple-500/15 border border-white/10 mb-6">
                <item.icon size={32} className="text-blue-400" />
                <span
                  className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white text-[12px] flex items-center justify-center"
                  style={{ fontWeight: 700 }}
                >
                  {item.step}
                </span>
              </div>
              <h3 className="text-[20px] mb-3" style={{ fontWeight: 600 }}>
                {item.title}
              </h3>
              <p className="text-gray-400 text-[15px]" style={{ lineHeight: 1.6 }}>
                {item.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══════════ STATS BAR ═══════════ */}
      <section className="relative z-10 border-y border-white/[0.06] py-16">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto text-center">
            {[
              { value: "12K+", label: "Renters onboarded" },
              { value: "94%", label: "Approval success rate" },
              { value: "2.4hrs", label: "Avg. time to match" },
              { value: "48K+", label: "Listings scanned daily" },
            ].map((stat) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <p
                  className="text-[32px] md:text-[40px] bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"
                  style={{ fontWeight: 800, lineHeight: 1 }}
                >
                  {stat.value}
                </p>
                <p className="text-gray-500 text-[13px] mt-2">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ TESTIMONIALS ═══════════ */}
      <section id="social-proof" className="relative z-10 container mx-auto px-6 py-24">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-[36px] md:text-[44px] text-center mb-4"
          style={{ fontWeight: 700 }}
        >
          Loved by renters
        </motion.h2>
        <p className="text-gray-400 text-[18px] text-center mb-14 max-w-xl mx-auto">
          Hear from students and young professionals who found their home with HomePilot.
        </p>

        <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {[
            {
              name: "Sarah Kim",
              school: "NYU, Class of '25",
              text: "HomePilot told me to apply within the hour and I got approved the same day. Without the AI alert, I would have missed it completely.",
              score: 892,
            },
            {
              name: "Marcus Johnson",
              school: "UT Austin, Grad Student",
              text: "The scam detection saved me from a fake listing. And the Renter Passport made my real applications way stronger.",
              score: 834,
            },
            {
              name: "Priya Patel",
              school: "Stanford, Remote Worker",
              text: "Moving cross-country was stressful until HomePilot's AI started hunting listings for me. Found my dream apartment in SF in 3 days.",
              score: 871,
            },
          ].map((testimonial, i) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-gradient-to-br from-white/[0.06] to-white/[0.02] rounded-2xl p-6 border border-white/[0.08]"
            >
              <div className="flex items-center gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} size={14} className="text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <p className="text-gray-300 text-[14px] mb-6" style={{ lineHeight: 1.7 }}>
                "{testimonial.text}"
              </p>
              <div className="flex items-center gap-3 pt-4 border-t border-white/[0.06]">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-[13px] text-white" style={{ fontWeight: 700 }}>
                  {testimonial.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div className="flex-1">
                  <p className="text-white text-[14px]" style={{ fontWeight: 600 }}>
                    {testimonial.name}
                  </p>
                  <p className="text-gray-500 text-[12px]">{testimonial.school}</p>
                </div>
                <div className="text-right">
                  <p className="text-[#10B981] text-[16px]" style={{ fontWeight: 700 }}>
                    {testimonial.score}
                  </p>
                  <p className="text-gray-500 text-[10px]">Score</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══════════ SECURITY BANNER ═══════════ */}
      <section className="relative z-10 container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto bg-gradient-to-r from-[#10B981]/10 to-[#10B981]/5 rounded-2xl p-8 border border-[#10B981]/15 flex flex-col md:flex-row items-center gap-6">
          <div className="w-14 h-14 rounded-2xl bg-[#10B981]/15 flex items-center justify-center shrink-0">
            <Lock size={28} className="text-[#10B981]" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-white text-[18px] mb-1" style={{ fontWeight: 600 }}>
              Bank-level security, always
            </h3>
            <p className="text-gray-400 text-[14px]">
              AES-256 encryption, SOC 2 compliant, and your data is never sold. Documents are only shared with your explicit consent.
            </p>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            {["SOC 2", "AES-256", "GDPR"].map((badge) => (
              <span
                key={badge}
                className="text-[11px] text-[#10B981] bg-[#10B981]/10 px-3 py-1 rounded-lg border border-[#10B981]/15"
                style={{ fontWeight: 600 }}
              >
                {badge}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ FINAL CTA ═══════════ */}
      <section className="relative z-10 container mx-auto px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto rounded-2xl bg-gradient-to-br from-blue-600/20 via-purple-600/15 to-blue-600/10 p-12 md:p-16 text-center border border-white/10 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/5" />
          <div className="relative z-10">
            <h2 className="text-[32px] md:text-[44px] mb-4" style={{ fontWeight: 700 }}>
              Ready to find your
              <br />
              perfect apartment?
            </h2>
            <p className="text-[18px] text-gray-300 mb-10 max-w-lg mx-auto">
              Join thousands of renters using AI to get approved faster. Set up your passport in under 5 minutes.
            </p>
            <Link
              to="/onboarding"
              className="inline-flex items-center gap-2.5 px-10 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 transition-all shadow-xl shadow-purple-500/25 text-[16px]"
              style={{ fontWeight: 600 }}
            >
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <p className="text-gray-500 text-[13px] mt-4">No credit card required</p>
          </div>
        </motion.div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="relative z-10 border-t border-white/[0.06]">
        <div className="container mx-auto px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Zap className="w-4 h-4" />
                </div>
                <span className="text-[16px]" style={{ fontWeight: 700 }}>
                  HomePilot
                </span>
              </div>
              <p className="text-gray-500 text-[13px]">
                AI-powered apartment hunting for the next generation.
              </p>
            </div>
            <div>
              <h4 className="text-white text-[14px] mb-3" style={{ fontWeight: 600 }}>
                Product
              </h4>
              {["Dashboard", "Listings", "Passport", "AI Alerts"].map((item) => (
                <p key={item} className="text-gray-500 text-[13px] mb-2 hover:text-gray-300 cursor-pointer transition-colors">
                  {item}
                </p>
              ))}
            </div>
            <div>
              <h4 className="text-white text-[14px] mb-3" style={{ fontWeight: 600 }}>
                Resources
              </h4>
              {["Help Center", "Blog", "API Docs", "Status"].map((item) => (
                <p key={item} className="text-gray-500 text-[13px] mb-2 hover:text-gray-300 cursor-pointer transition-colors">
                  {item}
                </p>
              ))}
            </div>
            <div>
              <h4 className="text-white text-[14px] mb-3" style={{ fontWeight: 600 }}>
                Legal
              </h4>
              {["Privacy", "Terms", "Security", "Cookies"].map((item) => (
                <p key={item} className="text-gray-500 text-[13px] mb-2 hover:text-gray-300 cursor-pointer transition-colors">
                  {item}
                </p>
              ))}
            </div>
          </div>
          <div className="border-t border-white/[0.06] pt-8 flex flex-col md:flex-row items-center justify-between">
            <p className="text-gray-600 text-[13px]">
              &copy; 2026 HomePilot, Inc. All rights reserved.
            </p>
            <p className="text-gray-600 text-[12px] mt-2 md:mt-0">
              AI-powered apartment hunting.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}