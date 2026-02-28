import { Link } from "react-router";
import { motion } from "motion/react";
import { Shield, Sparkles, Bell, TrendingUp, MapPin, ArrowRight } from "lucide-react";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#111117] to-[#0a0a0f] text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Animated gradient blobs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-[120px]" />
          <div className="absolute top-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-[120px]" />
        </div>

        {/* Navigation */}
        <nav className="relative z-10 container mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-xl font-semibold">RentLayer</span>
          </div>
          <Link
            to="/onboarding"
            className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
          >
            Sign In
          </Link>
        </nav>

        {/* Hero Content */}
        <div className="relative z-10 container mx-auto px-6 py-24 md:py-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl mx-auto text-center"
          >
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent">
              AI That Hunts Apartments For You.
            </h1>
            <p className="text-xl md:text-2xl text-gray-400 mb-8 max-w-2xl mx-auto">
              RentLayer monitors listings, predicts approval odds, detects scams, and tells you exactly when to apply.
            </p>
            <Link
              to="/onboarding"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 transition-all shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40"
            >
              Create Renter Passport
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>

          {/* Dashboard Preview Mock */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="max-w-5xl mx-auto mt-20"
          >
            <div className="rounded-2xl bg-gradient-to-b from-white/10 to-white/5 p-1 shadow-2xl">
              <div className="rounded-xl bg-gradient-to-br from-[#1a1a24] to-[#0f0f15] p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <div className="flex gap-2">
                    <div className="w-20 h-3 rounded bg-white/5" />
                    <div className="w-20 h-3 rounded bg-white/5" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-lg bg-white/5 p-4 space-y-3">
                      <div className="h-3 w-3/4 rounded bg-white/10" />
                      <div className="h-2 w-1/2 rounded bg-white/5" />
                      <div className="h-24 rounded bg-gradient-to-br from-blue-500/20 to-purple-500/20" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="relative z-10 container mx-auto px-6 py-24">
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] p-8 border border-white/10"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center mb-4 border border-blue-500/20">
              <Shield className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Verified Renter Passport</h3>
            <p className="text-gray-400">
              Build a trusted profile that landlords love. Complete verification increases approval by 40%.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] p-8 border border-white/10"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/20 flex items-center justify-center mb-4 border border-purple-500/20">
              <Sparkles className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Acceptance Probability Engine</h3>
            <p className="text-gray-400">
              AI predicts your approval odds for each listing based on your profile and landlord preferences.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] p-8 border border-white/10"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/20 flex items-center justify-center mb-4 border border-green-500/20">
              <Bell className="w-6 h-6 text-green-400" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Proactive AI Alerts</h3>
            <p className="text-gray-400">
              Get notified instantly when new listings match your criteria, before the competition sees them.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] p-8 border border-white/10"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/20 flex items-center justify-center mb-4 border border-orange-500/20">
              <TrendingUp className="w-6 h-6 text-orange-400" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Auto-Optimization Strategy</h3>
            <p className="text-gray-400">
              AI suggests profile improvements that boost approval rates by analyzing successful applications.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] p-8 border border-white/10"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500/20 to-red-600/20 flex items-center justify-center mb-4 border border-red-500/20">
              <MapPin className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Livability + Risk Intelligence</h3>
            <p className="text-gray-400">
              Detect scams, analyze neighborhood safety, and get insights on commute times and amenities.
            </p>
          </motion.div>
        </div>
      </div>

      {/* How It Works */}
      <div className="relative z-10 container mx-auto px-6 py-24">
        <h2 className="text-4xl font-bold text-center mb-16">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-12 max-w-5xl mx-auto">
          {[
            { step: "01", title: "Upload Profile", desc: "Share your financial info, preferences, and documents securely." },
            { step: "02", title: "AI Monitors Listings", desc: "Our AI continuously scans new listings and scores each one for you." },
            { step: "03", title: "Apply with Confidence", desc: "Get alerts when high-match listings appear and apply at the perfect time." },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="text-center"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 mb-6">
                <span className="text-2xl font-bold bg-gradient-to-br from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  {item.step}
                </span>
              </div>
              <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
              <p className="text-gray-400">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* CTA Footer */}
      <div className="relative z-10 container mx-auto px-6 py-24">
        <div className="max-w-4xl mx-auto rounded-2xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 p-12 text-center border border-white/10">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to find your perfect apartment?</h2>
          <p className="text-xl text-gray-300 mb-8">
            Join thousands of renters using AI to get approved faster.
          </p>
          <Link
            to="/onboarding"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 transition-all shadow-lg"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 container mx-auto px-6 py-12 border-t border-white/10">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-xl font-semibold">RentLayer</span>
          </div>
          <p className="text-gray-500">© 2026 RentLayer. AI-powered apartment hunting.</p>
        </div>
      </footer>
    </div>
  );
}
