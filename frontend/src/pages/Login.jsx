import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Bug, Eye, EyeOff, Lock, Mail, ShieldCheck, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  
  const [toast, setToast] = useState(null);
  const hasShownToast = useRef(false); // Prevents StrictMode double-firing

  // Check for incoming toast messages
  useEffect(() => {
    // Only run if there is a message AND we haven't shown it yet
    if (location.state?.message && !hasShownToast.current) {
      const { message, type } = location.state;

      // 1. Mark as shown so StrictMode doesn't double-trigger
      hasShownToast.current = true;

      // 2. Set the toast
      setToast({ type, message });
      
      // 3. Clear the state immediately so it doesn't fire on refresh
      navigate(location.pathname, { replace: true, state: {} });

      // 4. Set an independent timer to hide the toast
      // Because this is inside the if-block and guarded by a ref, it will reliably fire
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [location.state, navigate]);

  const handleChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
  };

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setToast(null);

    try {
      await login(formData);
      
      setTimeout(() => {
        navigate("/dashboard", { 
          replace: true,
          state: { message: "Signed in successfully! Welcome back.", type: "success" }
        });
      }, 1500);

    } catch (err) {
      const errorMsg = err.response?.data?.detail || "Login failed. Please check your credentials.";
      showToast("error", errorMsg);
      setLoading(false);
    }
  };

  // --- Animation Variants ---
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.2 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30, filter: "blur(4px)" },
    visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
  };

  const formCardVariants = {
    hidden: { opacity: 0, scale: 0.95, rotateX: 10, y: 40 },
    visible: { 
      opacity: 1, scale: 1, rotateX: 0, y: 0, 
      transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1], staggerChildren: 0.1, delayChildren: 0.4 } 
    },
  };

  const isSuccess = toast?.type === "success" || toast?.type === "register";

  return (
    <div 
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 perspective-[1000px] transition-colors duration-500"
      style={{ background: "var(--background)", color: "var(--text-primary)" }}
    >
      
      {/* --- Custom Toast Notification --- */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, x: -100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -100, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className={`fixed top-6 left-6 z-[100] flex items-center gap-3 rounded-xl border px-4 py-3 shadow-2xl backdrop-blur-md ${
              isSuccess
                ? "border-green-500/30 text-green-600 dark:text-green-400" 
                : "border-red-500/30 text-red-600 dark:text-red-400"
            }`}
            style={{ 
              background: isSuccess 
                ? "rgba(34, 197, 94, 0.1)" 
                : "rgba(239, 68, 68, 0.1)" 
            }}
          >
            {isSuccess ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
            <span className="text-sm font-medium">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Full Screen Loading Overlay --- */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-black/60 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center rounded-3xl border p-8 shadow-2xl"
              style={{ background: "var(--card-background)", borderColor: "var(--border-color)" }}
            >
              <div className="relative flex h-20 w-20 items-center justify-center">
                <motion.div 
                  animate={{ rotate: 360 }} 
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 rounded-full border-4 border-blue-500/20 border-t-blue-600"
                />
                <Bug size={32} className="text-blue-600" />
              </div>
              <h3 className="mt-6 text-xl font-bold">Signing you in...</h3>
              <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                Please wait while we secure your workspace.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Cinematic Animated Background --- */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ x: [0, 80, 0, -80, 0], y: [0, -50, 50, -50, 0], scale: [1, 1.1, 0.9, 1.1, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/20 blur-[100px]"
        />
        <motion.div
          animate={{ x: [0, -70, 0, 70, 0], y: [0, 60, -60, 60, 0], scale: [1, 0.9, 1.1, 0.9, 1] }}
          transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-500/20 blur-[120px]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)]" />
      </div>

      {/* --- Main Content --- */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-md"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="mb-8 text-center">
          <motion.div 
            whileHover={{ scale: 1.05, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30 cursor-pointer"
          >
            <Bug size={30} className="text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold tracking-tight">Bug Tracker</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
            Manage projects. Track issues. Build better software.
          </p>
        </motion.div>

        {/* 3D Form Card */}
        <motion.div 
          variants={formCardVariants}
          className="rounded-3xl border p-8 shadow-2xl backdrop-blur-xl"
          style={{ 
            borderColor: "var(--border-color)", 
            background: "var(--card-background)",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
          }}
        >
          <motion.div variants={itemVariants}>
            <h2 className="text-2xl font-semibold">Welcome back</h2>
            <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              Sign in to continue to your workspace.
            </p>
          </motion.div>

          <form onSubmit={handleSubmit} className="mt-7 space-y-5">
            
            {/* Email Input */}
            <motion.div variants={itemVariants}>
              <label className="mb-2 block text-sm font-medium">Email address</label>
              <div className="relative group">
                <motion.div
                  initial={false}
                  animate={{
                    opacity: focusedField === "email" ? 1 : 0,
                    scale: focusedField === "email" ? 1 : 0.98,
                  }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 rounded-xl border-2 border-blue-500 pointer-events-none"
                  style={{ boxShadow: "0 0 15px rgba(59, 130, 246, 0.4)" }}
                />
                <Mail 
                  size={18} 
                  className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-200 ${focusedField === "email" ? "text-blue-500" : ""}`} 
                  style={{ color: focusedField === "email" ? "" : "var(--text-secondary)" }} 
                />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="you@example.com"
                  required
                  disabled={loading}
                  autoComplete="email"
                  className="relative w-full rounded-xl border py-3 pl-10 pr-4 text-sm outline-none transition-colors duration-200 bg-transparent disabled:opacity-50"
                  style={{ 
                    borderColor: focusedField === "email" ? "transparent" : "var(--border-color)", 
                    color: "var(--text-primary)" 
                  }}
                />
              </div>
            </motion.div>

            {/* Password Input */}
            <motion.div variants={itemVariants}>
              <label className="mb-2 block text-sm font-medium">Password</label>
              <div className="relative group">
                <motion.div
                  initial={false}
                  animate={{
                    opacity: focusedField === "password" ? 1 : 0,
                    scale: focusedField === "password" ? 1 : 0.98,
                  }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 rounded-xl border-2 border-blue-500 pointer-events-none"
                  style={{ boxShadow: "0 0 15px rgba(59, 130, 246, 0.4)" }}
                />
                <Lock 
                  size={18} 
                  className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-200 ${focusedField === "password" ? "text-blue-500" : ""}`} 
                  style={{ color: focusedField === "password" ? "" : "var(--text-secondary)" }} 
                />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Enter your password"
                  required
                  disabled={loading}
                  autoComplete="current-password"
                  className="relative w-full rounded-xl border py-3 pl-10 pr-12 text-sm outline-none transition-colors duration-200 bg-transparent disabled:opacity-50"
                  style={{ 
                    borderColor: focusedField === "password" ? "transparent" : "var(--border-color)", 
                    color: "var(--text-primary)" 
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70 z-10"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </motion.div>

            {/* Submit Button */}
            <motion.div variants={itemVariants}>
              <motion.button
                whileHover={{ scale: 1.02, boxShadow: "0 10px 25px -5px rgba(59, 130, 246, 0.5)" }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {!loading && (
                  <motion.div 
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg]"
                  />
                )}
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign in"
                  )}
                </span>
              </motion.button>
            </motion.div>
          </form>

          <motion.div variants={itemVariants} className="mt-7 text-center">
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Don't have an account?{" "}
              <Link to="/register" className="font-semibold text-blue-500 transition-colors hover:text-blue-400">
                Create account
              </Link>
            </p>
          </motion.div>
        </motion.div>

        {/* Footer */}
        <motion.div variants={itemVariants} className="mt-8 flex items-center justify-center gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
          <ShieldCheck size={14} />
          <span>Secure workspace powered by Bug Tracker</span>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Login;