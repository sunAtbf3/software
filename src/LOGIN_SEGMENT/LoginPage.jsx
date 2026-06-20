import { useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useLoginMutation } from "../REDUX_FEATURES/REDUX_SLICES/Login_Api/authApi";
import { setCredentials } from "../REDUX_FEATURES/REDUX_SLICES/Login_Api/authSlice";
import LOGO from "../assets/removebg.png";
import { toast } from "../Components/shared/ToastConfig";

const getErrorMessage = (error) =>
  error?.data?.message || error?.error || "Unable to login. Please try again.";

const LoginPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [login, { isLoading, error }] = useLoginMutation();

  const apiErrorMessage = useMemo(() => getErrorMessage(error), [error]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const cleanedPhone = phone.replace(/[^\d]/g, "");
    if (cleanedPhone.length !== 10) {
      toast.error("Phone must be exactly 10 digits.");
      return;
    }
    if (!password || password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    try {
      // Unwrapping the mutation directly to tap into the active response context explicitly
      const payload = await login({ phone: cleanedPhone, password }).unwrap();
      dispatch(setCredentials(payload));
      navigate("/dashboard", { replace: true });
    } catch (err) {
      console.error("Login failed:", err);
      // Backend error payload extractor targeting specific explicit error context mapping 
      const parsedServerError = err?.data?.message || err?.error || apiErrorMessage;
      toast.error(parsedServerError);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-100/40 flex font-sans antialiased selection:bg-blue-500 selection:text-white overflow-hidden relative">

      {/* ── LEFT PANE: Premium Slanted Software Architecture Panel (Hidden on Mobile) ── */}
      <div className="hidden lg:flex lg:w-[45%] bg-[#0B0F19] relative overflow-hidden flex-col justify-between p-12 z-10 [clip-path:polygon(0_0,100%_0,88%_100%,0_100%)]">
        {/* Ambient Grid Lines Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293712_1px,transparent_1px),linear-gradient(to_bottom,#1f293712_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        <div className="absolute top-[-20%] left-[-10%] w-[700px] h-[700px] bg-blue-600/15 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[10%] w-[600px] h-[600px] bg-indigo-600/15 rounded-full blur-[140px]" />

        {/* Stable Build Badge Element */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="h-9 px-3.5 py-1 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center backdrop-blur-md">
            <span className="text-[11px] font-bold text-blue-400 uppercase tracking-widest font-mono">v1.0.0 Stable Build</span>
          </div>
        </div>

        {/* Value Proposition Framework */}
        <div className="relative z-10 my-auto max-w-lg pr-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            Enterprise Infrastructure Portal
          </span>
          <h1 className="text-4xl xl:text-5xl font-extrabold text-white tracking-tight leading-[1.15]">
            Manage your digital ecosystem from a single command center.
          </h1>
          <p className="mt-4 text-[15px] text-slate-400 leading-relaxed">
            Streamline workflows, view real-time data metrics, and deploy operations with our premium desktop environment.
          </p>

          {/* SaaS Core Operational Panel Simulation */}
          <div className="mt-12 p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/70 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
              </div>
              <span className="text-[11px] text-slate-500 font-mono">bizcentro_network_status: active</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-white/[0.01] border border-white/5 rounded-xl">
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Server Load</p>
                <p className="text-lg font-bold text-slate-200 mt-0.5 font-mono">24.2%</p>
              </div>
              <div className="p-3 bg-white/[0.01] border border-white/5 rounded-xl">
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Sessions</p>
                <p className="text-lg font-bold text-slate-200 mt-0.5 font-mono">1,482</p>
              </div>
              <div className="p-3 bg-blue-500/[0.03] border border-blue-500/20 rounded-xl">
                <p className="text-[10px] text-blue-400 uppercase font-bold tracking-wider">Latency</p>
                <p className="text-lg font-bold text-blue-300 mt-0.5 font-mono">14ms</p>
              </div>
            </div>
          </div>
        </div>

        {/* Left pane side info anchor */}
        <div className="relative z-10 text-xs text-slate-500 font-medium tracking-wide">
          © {new Date().getFullYear()} BizCentro Inc. Powered by premium cloud matrix security.
        </div>
      </div>

      {/* ── RIGHT PANE: Clean High-Resolution Adaptive Login Form Portal ── */}
      <div className="w-full lg:w-[55%] flex flex-col justify-between p-6 sm:p-12 md:p-16 relative z-20">

        {/* Mobile View Top Layout Logo Unit */}
        <div className="flex items-center justify-between lg:hidden w-full mb-6">
          <div className="h-32 sm:h-40 overflow-hidden flex items-center">
            <img src={LOGO} alt="BizCentro" className="h-full object-contain" />
          </div>
          <span className="text-[11px] font-mono bg-slate-200/60 text-slate-600 px-2.5 py-1 rounded-lg border border-slate-300/40">v1.0.0</span>
        </div>

        {/* Main Center UI Block Wrapper */}
        <div className="mt-4 sm:mt-10 lg:mt-14 mb-auto w-full max-w-[460px] mx-auto space-y-8 bg-white/40 lg:bg-transparent p-6 sm:p-10 lg:p-0 rounded-3xl border border-white/30 lg:border-transparent backdrop-blur-sm lg:backdrop-blur-none shadow-xl shadow-slate-100/50 lg:shadow-none">

          {/* Desktop Max-Scaled Brand Image Layout Container */}
          <div className="space-y-4">
            <div className="hidden lg:flex h-48 xl:h-56 items-center justify-start mb-6 overflow-hidden">
              <img
                src={LOGO}
                alt="BizCentro Branding"
                className="max-h-full max-w-full object-contain object-left"
              />
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Sign in to your account
            </h2>
            <p className="text-sm font-medium text-slate-500">
              Welcome back! Enter your authenticated credentials below.
            </p>
          </div>

          {/* Authentication Inputs Structure */}
          <form className="space-y-6" onSubmit={handleSubmit}>

            {/* Phone Layout Area */}
            <div className="space-y-2">
              <label htmlFor="phone" className="block text-[13px] font-bold text-slate-700 tracking-wider uppercase">
                Phone Number
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                  <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <input
                  id="phone"
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  inputMode="numeric"
                  maxLength={10}
                  className="w-full pl-11 pr-4 py-3.5 text-[15px] text-slate-900 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 shadow-sm placeholder:text-slate-400"
                  placeholder="10-digit mobile number"
                  autoComplete="username"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password Layout Area */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-[13px] font-bold text-slate-700 tracking-wider uppercase">
                  Password
                </label>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                  <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3.5 text-[15px] text-slate-900 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 shadow-sm placeholder:text-slate-400"
                  placeholder="Enter secure password"
                  autoComplete="current-password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Form Action Submitter Button (Changed label to 'Login') */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-slate-900 hover:bg-slate-800 active:bg-black text-white font-bold py-3.5 rounded-xl shadow-md shadow-slate-900/10 focus:outline-none focus:ring-4 focus:ring-slate-900/10 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed text-base flex items-center justify-center gap-2 mt-4"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Authenticating...
                </>
              ) : (
                "Login"
              )}
            </button>
          </form>

        </div>

        {/* Small Bottom Copyright Footer */}
        <div className="block lg:hidden text-center text-[11px] text-slate-400 mt-8">
          © {new Date().getFullYear()} BizCentro Inc. All rights reserved.
        </div>
      </div>

    </div>
  );
};

export default LoginPage;
// use upper code which is updated ui

// import { useMemo, useState } from "react";
// import { useDispatch } from "react-redux";
// import { useNavigate } from "react-router-dom";
// import { useLoginMutation } from "../REDUX_FEATURES/REDUX_SLICES/Login_Api/authApi";
// import { setCredentials } from "../REDUX_FEATURES/REDUX_SLICES/Login_Api/authSlice";

// const getErrorMessage = (error) =>
//   error?.data?.message || error?.error || "Unable to login. Please try again.";

// const LoginPage = () => {
//   const dispatch = useDispatch();
//   const navigate = useNavigate();
//   const [phone, setPhone] = useState("");
//   const [password, setPassword] = useState("");
//   const [showPassword, setShowPassword] = useState(false);
//   const [localError, setLocalError] = useState("");
//   const [login, { isLoading, error }] = useLoginMutation();

//   const apiErrorMessage = useMemo(() => getErrorMessage(error), [error]);

//   const handleSubmit = async (event) => {
//     event.preventDefault();
//     setLocalError("");

//     const cleanedPhone = phone.replace(/[^\d]/g, "");
//     if (cleanedPhone.length !== 10) {
//       setLocalError("Phone must be exactly 10 digits.");
//       return;
//     }
//     if (!password || password.length < 6) {
//       setLocalError("Password must be at least 6 characters.");
//       return;
//     }

//     try {
//       const payload = await login({ phone: cleanedPhone, password }).unwrap();
//       dispatch(setCredentials(payload));
//       navigate("/dashboard", { replace: true });
//     } catch (_err) {
//       console.error("Login failed:", _err);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-blue-50/50 flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
//       {/* Decorative background gradients */}
//       <div className="absolute -top-40 -left-40 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
//       <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none" />

//       <div className="w-full max-w-[400px] bg-white border border-gray-200/80 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 z-10">
//         <div className="px-8 pt-8 pb-6 border-b border-gray-100 bg-gray-50/50 rounded-t-2xl">
//           <div className="flex flex-col items-center text-center">
//             <div className="h-16 flex items-center justify-center mb-4 overflow-hidden rounded-lg bg-slate-900 px-4 py-2 border border-slate-800 shadow-sm">
//               <img
//                 src="/bigfeathers-logo-cropped.png"
//                 alt="BigFeathers"
//                 className="max-h-full object-contain"
//               />
//             </div>
//             <h1 className="text-xl font-bold text-gray-900 tracking-tight">BizCentro Portal</h1>
//             <p className="text-xs text-gray-500 mt-1">Please sign in to access your dashboard</p>
//           </div>
//         </div>

//         <form className="p-8 space-y-4" onSubmit={handleSubmit}>
//           <div>
//             <label htmlFor="phone" className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
//               Phone Number
//             </label>
//             <div className="relative">
//               <input
//                 id="phone"
//                 type="text"
//                 value={phone}
//                 onChange={(e) => setPhone(e.target.value)}
//                 inputMode="numeric"
//                 maxLength={10}
//                 className="w-full px-3.5 py-2 text-sm text-gray-800 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/50 transition-all duration-200 shadow-sm"
//                 placeholder="10-digit mobile number"
//                 autoComplete="username"
//                 disabled={isLoading}
//               />
//             </div>
//           </div>

//           <div>
//             <label htmlFor="password" className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
//               Password
//             </label>
//             <div className="relative">
//               <input
//                 id="password"
//                 type={showPassword ? "text" : "password"}
//                 value={password}
//                 onChange={(e) => setPassword(e.target.value)}
//                 className="w-full px-3.5 py-2 text-sm text-gray-800 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/50 transition-all duration-200 shadow-sm pr-10"
//                 placeholder="Enter password"
//                 autoComplete="current-password"
//                 disabled={isLoading}
//               />
//               <button
//                 type="button"
//                 onClick={() => setShowPassword((prev) => !prev)}
//                 className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
//                 aria-label={showPassword ? "Hide password" : "Show password"}
//                 tabIndex={-1}
//                 disabled={isLoading}
//               >
//                 {showPassword ? (
//                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
//                   </svg>
//                 ) : (
//                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
//                   </svg>
//                 )}
//               </button>
//             </div>
//           </div>

//           {(localError || error) && (
//             <div className="bg-red-50 border border-red-200 text-red-800 px-3.5 py-2.5 rounded-lg text-xs leading-normal">
//               {localError || apiErrorMessage}
//             </div>
//           )}

//           <button
//             type="submit"
//             disabled={isLoading}
//             className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium py-2.5 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600/40 focus:ring-offset-2 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed text-sm mt-2"
//           >
//             {isLoading ? "Signing in..." : "Login"}
//           </button>
//         </form>

//         <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 rounded-b-2xl text-center">
//           <p className="text-[10px] text-gray-400 font-medium tracking-wide">
//             BizCentro Premium Desktop Client v1.0.0
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default LoginPage;
