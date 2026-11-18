import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bug, Eye, EyeOff, User, Mail, Lock, CheckCircle2, XCircle, Loader2, ChevronDown, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "developer",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  
  // Custom Dropdown State
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Toast State
  const [toast, setToast] = useState(null);

  const roles = [
    { value: "developer", label: "Developer", desc: "Can create and manage tickets" },
    { value: "viewer", label: "Viewer", desc: "Read-only access to workspace" },
  ];

  const handleChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  };

  const handleRoleSelect = (value) => {
    setFormData({ ...formData, role: value });
    setIsDropdownOpen(false);
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
      await register(formData);
      
      // Show success toast
      showToast("success", "Account created successfully!");
      
      // Wait to let user see the toast, then redirect
      setTimeout(() => {
        navigate("/login", {
          replace: true,
          state: { message: "Account created successfully. Please sign in.", type: "success" },
        });
      }, 1500);

    } catch (err) {
      const detail = err.response?.data?.detail;
      showToast("error", typeof detail === "string" ? detail : "Registration failed. Please check your details.");
      setLoading(false);
    }
  };

  // --- Animation Variants ---
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30, filter: "blur(4px)" },
    visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
  };

  const formCardVariants = {
    hidden: { opacity: 0, scale: 0.95, rotateX: 10, y: 40 },
    visible: { 
      opacity: 1, scale: 1, rotateX: 0, y: 0, 
      transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1], staggerChildren: 0.1, delayChildren: 0.3 } 
    },
  };

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
              toast.type === "success" 
                ? "border-green-500/30 text-green-600 dark:text-green-400" 
                : "border-red-500/30 text-red-500"
            }`}
            style={{ background: toast.type === "success" ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)" }}
          >
            {toast.type === "success" ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
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
              <h3 className="mt-6 text-xl font-bold" style={{ color: "var(--text-primary)" }}>Creating account...</h3>
              <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                Setting up your workspace profile.
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
        className="relative z-10 w-full max-w-md my-8"
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
            Create your workspace account
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
            <h2 className="text-2xl font-semibold">Create account</h2>
            <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              Join your team and start tracking issues.
            </p>
          </motion.div>

          <form onSubmit={handleSubmit} className="mt-7 space-y-5">
            
            {/* Full Name Input */}
            <motion.div variants={itemVariants}>
              <label className="mb-2 block text-sm font-medium">Full name</label>
              <div className="relative group">
                <motion.div
                  initial={false}
                  animate={{ opacity: focusedField === "full_name" ? 1 : 0, scale: focusedField === "full_name" ? 1 : 0.98 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 rounded-xl border-2 border-blue-500 pointer-events-none"
                  style={{ boxShadow: "0 0 15px rgba(59, 130, 246, 0.4)" }}
                />
                <User 
                  size={18} 
                  className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-200 ${focusedField === "full_name" ? "text-blue-500" : ""}`} 
                  style={{ color: focusedField === "full_name" ? "" : "var(--text-secondary)" }} 
                />
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  onFocus={() => setFocusedField("full_name")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Enter your full name"
                  required
                  maxLength={150}
                  autoComplete="name"
                  className="relative w-full rounded-xl border py-3 pl-10 pr-4 text-sm outline-none transition-colors duration-200 bg-transparent disabled:opacity-50"
                  style={{ borderColor: focusedField === "full_name" ? "transparent" : "var(--border-color)", color: "var(--text-primary)" }}
                />
              </div>
            </motion.div>

            {/* Email Input */}
            <motion.div variants={itemVariants}>
              <label className="mb-2 block text-sm font-medium">Email address</label>
              <div className="relative group">
                <motion.div
                  initial={false}
                  animate={{ opacity: focusedField === "email" ? 1 : 0, scale: focusedField === "email" ? 1 : 0.98 }}
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
                  autoComplete="email"
                  className="relative w-full rounded-xl border py-3 pl-10 pr-4 text-sm outline-none transition-colors duration-200 bg-transparent disabled:opacity-50"
                  style={{ borderColor: focusedField === "email" ? "transparent" : "var(--border-color)", color: "var(--text-primary)" }}
                />
              </div>
            </motion.div>

            {/* Password Input */}
            <motion.div variants={itemVariants}>
              <label className="mb-2 block text-sm font-medium">Password</label>
              <div className="relative group">
                <motion.div
                  initial={false}
                  animate={{ opacity: focusedField === "password" ? 1 : 0, scale: focusedField === "password" ? 1 : 0.98 }}
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
                  placeholder="Create a password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="relative w-full rounded-xl border py-3 pl-10 pr-12 text-sm outline-none transition-colors duration-200 bg-transparent disabled:opacity-50"
                  style={{ borderColor: focusedField === "password" ? "transparent" : "var(--border-color)", color: "var(--text-primary)" }}
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

            {/* --- Custom iOS Style Dropdown --- */}
            <motion.div variants={itemVariants} className="relative z-20">
              <label className="mb-2 block text-sm font-medium">Account role</label>
              
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)} // Delay to allow click
                  className="flex w-full items-center justify-between rounded-xl border py-3 px-4 text-sm outline-none transition-all duration-200 bg-transparent"
                  style={{ 
                    borderColor: isDropdownOpen ? "transparent" : "var(--border-color)", 
                    color: "var(--text-primary)",
                    boxShadow: isDropdownOpen ? "0 0 0 2px #3b82f6" : "none" 
                  }}
                >
                  <span className="flex items-center gap-2">
                    {roles.find(r => r.value === formData.role)?.label}
                  </span>
                  <motion.div
                    animate={{ rotate: isDropdownOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown size={18} style={{ color: "var(--text-secondary)" }} />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {isDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-xl border shadow-2xl backdrop-blur-xl"
                      style={{ 
                        borderColor: "var(--border-color)", 
                        background: "var(--card-background)",
                        boxShadow: "0 10px 40px -10px rgba(0,0,0,0.3)"
                      }}
                    >
                      {roles.map((role) => (
                        <button
                          key={role.value}
                          type="button"
                          onClick={() => handleRoleSelect(role.value)}
                          className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-black/5 dark:hover:bg-white/5"
                        >
                          <div className="mt-0.5 flex h-4 w-4 items-center justify-center">
                            {formData.role === role.value && (
                              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                                <Check size={16} className="text-blue-500" />
                              </motion.div>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{role.label}</p>
                            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{role.desc}</p>
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <p className="mt-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                Administrator accounts are managed separately.
              </p>
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
                      Creating account...
                    </>
                  ) : (
                    "Create account"
                  )}
                </span>
              </motion.button>
            </motion.div>
          </form>

          <motion.div variants={itemVariants} className="mt-7 text-center">
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Already have an account?{" "}
              <Link to="/login" className="font-semibold text-blue-500 transition-colors hover:text-blue-400">
                Sign in
              </Link>
            </p>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Register;