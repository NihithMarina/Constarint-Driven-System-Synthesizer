import { useState, useEffect } from 'react';
import { 
  Shield, 
  Cpu, 
  Database, 
  Layers, 
  Network, 
  Activity, 
  Lock, 
  Mail, 
  User, 
  ArrowRight, 
  RefreshCw, 
  Terminal, 
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles
} from 'lucide-react';

export default function AuthPage({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Floating ambient terminal log stream for cyber aesthetic
  const [tickerLogs, setTickerLogs] = useState([
    'Initializing CDSS Secure Auth Portal...',
    'System status: ONLINE | Node replication active',
    'Connected to SQLite state pool successfully.'
  ]);

  useEffect(() => {
    const messages = [
      'Performing dynamic vulnerability check...',
      'Syncing with core constraint metrics...',
      'Pre-compiling optimization modules...',
      'Awaiting credentials handshake...',
      'Secure token layer ready.',
      'Active candidate scores optimized: 88/100',
      'Telemetry simulation buffer flushed.'
    ];

    const interval = setInterval(() => {
      const randomMsg = messages[Math.floor(Math.random() * messages.length)];
      setTickerLogs(prev => [
        `[${new Date().toLocaleTimeString()}] ${randomMsg}`,
        ...prev.slice(0, 3)
      ]);
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!email || !password || (!isLogin && !username)) {
      setError('Please fill in all required fields.');
      setLoading(false);
      return;
    }

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const payload = isLogin 
      ? { email, password } 
      : { email, username, password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.detail || 'Authentication failed. Please verify credentials.');
      }

      if (isLogin) {
        setSuccess('Authentication successful! Initializing environment...');
        setTimeout(() => {
          // Store user session details
          localStorage.setItem('isAuthenticated', 'true');
          localStorage.setItem('user', JSON.stringify(data.user));
          localStorage.setItem('token', data.token);
          onLoginSuccess(data.user);
        }, 1200);
      } else {
        setSuccess('Account provisioned successfully! You can now sign in.');
        setTimeout(() => {
          setIsLogin(true);
          setPassword('');
          setSuccess('');
          setLoading(false);
        }, 1800);
      }
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleGuestAccess = () => {
    setLoading(true);
    setSuccess('Bypassing credentials... Loading dynamic sandbox sandbox-mode.');
    setTimeout(() => {
      const guestUser = { id: 'guest-user', username: 'Guest Architect', email: 'guest@cdss.local' };
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('user', JSON.stringify(guestUser));
      localStorage.setItem('token', 'guest-token-bypass');
      onLoginSuccess(guestUser);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col md:flex-row relative overflow-hidden">
      
      {/* Background cyber grid and ambient spots */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-900/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-indigo-950/15 rounded-full blur-3xl pointer-events-none" />

      {/* LEFT COLUMN: Features, Interactive metrics, styling showcase */}
      <div className="flex-1 p-8 md:p-16 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-900/80 z-10 bg-slate-950/50 backdrop-blur-sm">
        
        {/* Brand Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 flex items-center justify-center rounded-xl font-bold text-white tracking-tighter shadow-lg shadow-blue-500/20">
            <Cpu className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-bold text-lg text-white leading-tight">Constraint Driven</h1>
              <span className="bg-blue-950/80 text-blue-400 border border-blue-900/60 text-[9px] px-2 py-0.5 rounded-full font-bold">
                v2.4
              </span>
            </div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">System Synthesizer (CDSS)</p>
          </div>
        </div>

        {/* Dynamic Interactive Features list */}
        <div className="my-12 md:my-0 space-y-8 max-w-lg">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white leading-tight">
              Design, model, and simulate cloud architectures.
            </h2>
            <p className="text-slate-400 text-xs mt-2 leading-relaxed">
              CDSS processes engineering constraints dynamically to propose high-availability topologies, cost estimations, and trade-offs.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="mt-1 p-1 bg-slate-900 border border-slate-800 rounded text-blue-400">
                <Network className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Interactive Topologies</h3>
                <p className="text-[11px] text-slate-400">Visualize nodes, ingress routing, datastores, and message brokers instantly.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-1 p-1 bg-slate-900 border border-slate-800 rounded text-emerald-400">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Failover Telemetry</h3>
                <p className="text-[11px] text-slate-400">Simulate database master failure, serverless spikes, and caching degradation.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-1 p-1 bg-slate-900 border border-slate-800 rounded text-indigo-400">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Rule-Based Compliance</h3>
                <p className="text-[11px] text-slate-400">Identify Single Points of Ingress failure, network bottlenecks, and SLA alignment.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Ambient Live Logs Widget */}
        <div className="bg-slate-950 border border-slate-900 rounded-xl p-4 font-mono text-[10px] text-slate-500 shadow-inner max-w-md hidden md:block">
          <div className="flex items-center justify-between border-b border-slate-900 pb-2 mb-2">
            <span className="text-slate-400 font-bold flex items-center gap-1.5 uppercase">
              <Terminal className="w-3.5 h-3.5 text-blue-400" /> Core Engine Logs
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="space-y-1.5">
            {tickerLogs.map((log, i) => (
              <div key={i} className={`truncate ${i === 0 ? 'text-slate-300' : 'text-slate-600'}`}>
                {log}
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: Authentic Form Section */}
      <div className="flex-1 p-8 md:p-16 flex flex-col justify-center items-center z-10">
        
        <div className="w-full max-w-md bg-slate-900/65 border border-slate-800 p-8 rounded-2xl shadow-2xl backdrop-blur">
          
          {/* Header Switcher */}
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                {isLogin ? 'Welcome Back' : 'Create Architecture Hub'}
              </h2>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                {isLogin ? 'Enter Secure Sandbox' : 'Provision platform access'}
              </p>
            </div>
            
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setSuccess('');
              }}
              className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
            >
              {isLogin ? 'Sign Up' : 'Log In'}
            </button>
          </div>

          {/* Error and Success notifications */}
          {error && (
            <div className="bg-red-950/40 border border-red-900/60 p-3 rounded-lg mb-6 flex items-start gap-2.5 text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-emerald-950/40 border border-emerald-900/60 p-3 rounded-lg mb-6 flex items-start gap-2.5 text-emerald-400 text-xs">
              <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Username only for sign up */}
            {!isLogin && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Username
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="architect_zero"
                    className="w-full bg-slate-950 border border-slate-800/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-600 transition-all outline-none"
                  />
                </div>
              </div>
            )}

            {/* Email field */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-slate-950 border border-slate-800/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-600 transition-all outline-none"
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Password
                </label>
                {isLogin && (
                  <button 
                    type="button" 
                    onClick={() => setError('Contact system administrator for reset keys.')}
                    className="text-[10px] text-slate-500 hover:text-slate-400 transition-colors"
                  >
                    Forgot Key?
                  </button>
                )}
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-950 border border-slate-800/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 rounded-lg pl-9 pr-10 py-2 text-xs text-white placeholder-slate-600 transition-all outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:text-slate-400 text-white font-semibold text-xs py-2.5 px-4 rounded-lg shadow-lg hover:shadow-blue-500/15 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>{isLogin ? 'Sign In to Portal' : 'Register Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* OR divider */}
          <div className="relative my-6 text-center">
            <hr className="border-slate-800/80" />
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 px-3 text-[9px] text-slate-500 uppercase tracking-widest font-mono">
              Or bypass credentials
            </span>
          </div>

          {/* Guest login */}
          <button
            onClick={handleGuestAccess}
            disabled={loading}
            className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 font-medium"
          >
            <span>Enter as Guest Architect</span>
          </button>

          {/* Footer constraints notice */}
          <p className="text-[9px] text-slate-500 text-center leading-relaxed mt-6">
            Access protected by standard client encryption. Active session coordinates will be maintained securely.
          </p>

        </div>

      </div>

    </div>
  );
}
