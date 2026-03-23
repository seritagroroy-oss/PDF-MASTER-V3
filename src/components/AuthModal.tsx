import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Mail, Lock, User as UserIcon, ArrowRight,
  AlertCircle, CheckCircle2, ShieldCheck, RefreshCw,
  Chrome, Smartphone, Phone
} from 'lucide-react';
import {
  auth, googleProvider, isConfigured,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  sendEmailVerification, signInWithPopup, updateProfile,
  signInWithPhoneNumber, RecaptchaVerifier, PhoneAuthProvider, signInWithCredential,
} from '../firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: { name: string; email: string }) => void;
}

type Step = 'form' | 'verify-email' | 'verify-phone' | 'success';
type AuthTab = 'email' | 'phone';

// Country codes
const COUNTRY_CODES = [
  { flag: '🇫🇷', code: '+33', name: 'France' },
  { flag: '🇧🇪', code: '+32', name: 'Belgique' },
  { flag: '🇨🇭', code: '+41', name: 'Suisse' },
  { flag: '🇨🇦', code: '+1',  name: 'Canada' },
  { flag: '🇺🇸', code: '+1',  name: 'États-Unis' },
  { flag: '🇩🇿', code: '+213', name: 'Algérie' },
  { flag: '🇲🇦', code: '+212', name: 'Maroc' },
  { flag: '🇸🇳', code: '+221', name: 'Sénégal' },
  { flag: '🇳🇬', code: '+234', name: 'Nigeria' },
  { flag: '🇨🇮', code: '+225', name: "Côte d'Ivoire" },
  { flag: '🇬🇧', code: '+44',  name: 'Royaume-Uni' },
  { flag: '🇩🇪', code: '+49',  name: 'Allemagne' },
  { flag: '🇪🇸', code: '+34',  name: 'Espagne' },
  { flag: '🇧🇷', code: '+55',  name: 'Brésil' },
];

const FIREBASE_ERRORS: Record<string, string> = {
  'auth/email-already-in-use':   'Cette adresse email est déjà utilisée.',
  'auth/invalid-email':           'Adresse email invalide.',
  'auth/weak-password':           'Le mot de passe doit contenir au moins 6 caractères.',
  'auth/user-not-found':          'Aucun compte trouvé avec cet email.',
  'auth/wrong-password':          'Mot de passe incorrect.',
  'auth/too-many-requests':       'Trop de tentatives. Attendez quelques minutes.',
  'auth/network-request-failed':  'Erreur réseau. Vérifiez votre connexion.',
  'auth/popup-closed-by-user':    'Connexion Google annulée.',
  'auth/invalid-phone-number':    'Numéro de téléphone invalide. Incluez l\'indicatif pays.',
  'auth/invalid-verification-code': 'Code SMS incorrect. Réessayez.',
  'auth/code-expired':            'Le code SMS a expiré. Demandez-en un nouveau.',
  'auth/quota-exceeded':          'Quota SMS dépassé. Réessayez plus tard.',
};

const getErr = (code: string) => FIREBASE_ERRORS[code] || `Erreur (${code})`;

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLogin }) => {
  const [tab, setTab]   = useState<AuthTab>('email');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [step, setStep] = useState<Step>('form');

  // Email fields
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [name, setName]         = useState('');

  // Phone fields
  const [countryCode, setCountryCode] = useState(COUNTRY_CODES[0]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneName, setPhoneName]     = useState('');
  const [showCountryList, setShowCountryList] = useState(false);

  // SMS OTP
  const [smsOtp, setSmsOtp]               = useState(['', '', '', '', '', '']);
  const [confirmationResult, setConfResult] = useState<any>(null);
  const recaptchaRef                        = useRef<any>(null);

  // State
  const [error, setError]           = useState('');
  const [isLoading, setIsLoading]   = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Fallback OTP (no Firebase)
  const [fbkotp, setFbkOtp]           = useState(['', '', '', '', '', '']);
  const [fbkGenerated, setFbkGenerated] = useState('');
  const [fbkTimer, setFbkTimer]         = useState(60);
  const [fbkCanResend, setFbkCanResend] = useState(false);

  const isFirebase = isConfigured;

  // Resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  // Fallback OTP timer
  useEffect(() => {
    if (step !== 'verify-email' || isFirebase) return;
    setFbkTimer(60); setFbkCanResend(false);
    const iv = setInterval(() => setFbkTimer(t => { if (t <= 1) { clearInterval(iv); setFbkCanResend(true); return 0; } return t - 1; }), 1000);
    return () => clearInterval(iv);
  }, [step, fbkGenerated, isFirebase]);

  // Fix recaptcha div on mount
  useEffect(() => {
    if (!isOpen) return;
    return () => {
      // Cleanup recaptcha when modal closes
      if (recaptchaRef.current) { try { recaptchaRef.current.clear(); } catch {} recaptchaRef.current = null; }
    };
  }, [isOpen]);

  // ── EMAIL SIGNUP ────────────────────────────────────────────
  const handleEmailSignup = async () => {
    setIsLoading(true); setError('');
    try {
      const cred = await createUserWithEmailAndPassword(auth!, email, password);
      await updateProfile(cred.user, { displayName: name });
      await sendEmailVerification(cred.user);
      setResendCooldown(60); setStep('verify-email');
    } catch (e: any) { setError(getErr(e.code)); }
    finally { setIsLoading(false); }
  };

  // ── EMAIL LOGIN ─────────────────────────────────────────────
  const handleEmailLogin = async () => {
    setIsLoading(true); setError('');
    try {
      const cred = await signInWithEmailAndPassword(auth!, email, password);
      if (!cred.user.emailVerified) {
        setError("Email non vérifié. Consultez votre boîte mail.");
        setStep('verify-email'); setIsLoading(false); return;
      }
      doLogin(cred.user.displayName || email.split('@')[0], cred.user.email!);
    } catch (e: any) { setError(getErr(e.code)); }
    finally { setIsLoading(false); }
  };

  // ── GOOGLE ──────────────────────────────────────────────────
  const handleGoogle = async () => {
    if (!isFirebase) return;
    setIsLoading(true); setError('');
    try {
      const r = await signInWithPopup(auth!, googleProvider!);
      doLogin(r.user.displayName || 'Utilisateur', r.user.email!);
    } catch (e: any) { setError(getErr(e.code)); }
    finally { setIsLoading(false); }
  };

  // ── PHONE: SEND SMS ─────────────────────────────────────────
  const handleSendSMS = async () => {
    setError('');
    const fullPhone = `${countryCode.code}${phoneNumber.replace(/^0/, '')}`;
    if (!/^\+\d{7,15}$/.test(fullPhone)) {
      setError('Numéro invalide. Ex : 06 12 34 56 78');
      return;
    }
    setIsLoading(true);
    try {
      if (!recaptchaRef.current) {
        recaptchaRef.current = new RecaptchaVerifier!(auth!, 'recaptcha-container', { size: 'invisible' });
      }
      const result = await signInWithPhoneNumber!(auth!, fullPhone, recaptchaRef.current);
      setConfResult(result);
      setResendCooldown(60);
      setStep('verify-phone');
    } catch (e: any) {
      setError(getErr(e.code));
      if (recaptchaRef.current) { try { recaptchaRef.current.clear(); } catch {} recaptchaRef.current = null; }
    } finally { setIsLoading(false); }
  };

  // ── PHONE: VERIFY CODE ──────────────────────────────────────
  const handleVerifyPhone = async () => {
    setError('');
    const code = smsOtp.join('');
    if (code.length !== 6) { setError('Entrez le code complet.'); return; }
    setIsLoading(true);
    try {
      const credential = PhoneAuthProvider!.credential(confirmationResult.verificationId, code);
      const result = await signInWithCredential!(auth!, credential);
      const displayName = phoneName || result.user.displayName || `+${phoneNumber}`;
      if (phoneName) await updateProfile(result.user, { displayName: phoneName });
      doLogin(displayName, result.user.phoneNumber || fullNumber());
    } catch (e: any) { setError(getErr(e.code)); }
    finally { setIsLoading(false); }
  };

  const fullNumber = () => `${countryCode.code}${phoneNumber.replace(/^0/, '')}`;

  // ── RESEND ──────────────────────────────────────────────────
  const handleResend = async () => {
    if (step === 'verify-phone') { setSmsOtp(['', '', '', '', '', '']); await handleSendSMS(); return; }
    if (!isFirebase) {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      setFbkGenerated(code); setFbkOtp(['', '', '', '', '', '']); setFbkCanResend(false); setFbkTimer(60);
      console.info(`[DEV] Code OTP: ${code}`); return;
    }
    try { await sendEmailVerification(auth!.currentUser!); setResendCooldown(60); } catch (e: any) { setError(getErr(e.code)); }
  };

  // ── FALLBACK NO-FIREBASE EMAIL ───────────────────────────────
  const handleFallbackEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (password.length < 6) { setError('Mot de passe trop court (min 6 car.).'); return; }
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 700));
    if (mode === 'signup') {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      setFbkGenerated(code); console.info(`[DEV] Code: ${code}`);
      setIsLoading(false); setStep('verify-email');
    } else {
      const stored = localStorage.getItem(`pdfmaster_account_${email}`);
      if (!stored) { setError('Aucun compte trouvé.'); setIsLoading(false); return; }
      const acc = JSON.parse(stored);
      if (acc.password !== btoa(password)) { setError('Mot de passe incorrect.'); setIsLoading(false); return; }
      setIsLoading(false);
      doLogin(acc.name, email);
    }
  };

  const handleFallbackOtpSubmit = () => {
    if (fbkotp.join('') !== fbkGenerated) { setError('Code incorrect (voir console F12).'); return; }
    localStorage.setItem(`pdfmaster_account_${email}`, JSON.stringify({ name, email, password: btoa(password), createdAt: new Date().toISOString() }));
    doLogin(name, email);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    if (tab === 'phone') { e.preventDefault(); isFirebase ? handleSendSMS() : setError("L'authentification par téléphone nécessite Firebase."); return; }
    if (isFirebase) { e.preventDefault(); mode === 'signup' ? handleEmailSignup() : handleEmailLogin(); }
    else handleFallbackEmailSubmit(e);
  };

  const doLogin = (displayName: string, identifier: string) => {
    setStep('success');
    setTimeout(() => { onLogin({ name: displayName, email: identifier }); onClose(); resetState(); }, 1400);
  };

  const resetState = () => {
    setTab('email'); setMode('login'); setStep('form');
    setEmail(''); setPassword(''); setName(''); setPhoneNumber(''); setPhoneName('');
    setError(''); setSmsOtp(['', '', '', '', '', '']); setFbkOtp(['', '', '', '', '', '']);
    setResendCooldown(0); setConfResult(null);
  };

  const handleSmsOtpChange = (i: number, v: string) => {
    if (v.length > 1) return;
    const n = [...smsOtp]; n[i] = v; setSmsOtp(n);
    if (v && i < 5) document.getElementById(`sms-otp-${i + 1}`)?.focus();
  };

  const handleFbkOtpChange = (i: number, v: string) => {
    if (v.length > 1) return;
    const n = [...fbkotp]; n[i] = v; setFbkOtp(n);
    if (v && i < 5) document.getElementById(`fbk-otp-${i + 1}`)?.focus();
  };

  const headerBg  = step === 'success' ? 'from-emerald-500 to-teal-600' : 'from-indigo-600 to-violet-700';
  const headerIcon = step === 'verify-email' ? Mail : step === 'verify-phone' ? Smartphone : step === 'success' ? CheckCircle2 : UserIcon;
  const HeaderIcon = headerIcon;

  const headerTitle =
    step === 'verify-email'  ? 'Vérifiez vos emails'     :
    step === 'verify-phone'  ? 'Code SMS'                 :
    step === 'success'       ? 'Connecté !'               :
    mode  === 'login'        ? 'Bienvenue'                : 'Créer un compte';
  const headerSub =
    step === 'verify-email'  ? `Email envoyé à ${email}` :
    step === 'verify-phone'  ? `SMS envoyé au ${fullNumber()}` :
    step === 'success'       ? 'Votre espace est prêt.'  :
    tab   === 'phone'        ? 'Connexion par téléphone' : (mode === 'login' ? 'Heureux de vous revoir !' : 'Rejoignez PDF Master.');

  // ── RENDER ───────────────────────────────────────────────────
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => { onClose(); resetState(); }}
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-md" />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 20 }}
            className="relative w-full max-w-md overflow-hidden rounded-[2.5rem] bg-white shadow-2xl max-h-[95vh] flex flex-col"
          >
            {/* Header banner */}
            <div className={`shrink-0 h-36 p-8 text-white relative overflow-hidden bg-gradient-to-br ${headerBg}`}>
              <div className="absolute top-0 right-0 p-6 pointer-events-none opacity-[0.08]">
                <HeaderIcon size={130} />
              </div>
              <button onClick={() => { onClose(); resetState(); }}
                className="absolute right-5 top-5 rounded-full bg-black/20 p-2 hover:bg-black/40 transition-all">
                <X size={18} />
              </button>
              {(step === 'verify-email' || step === 'verify-phone') && (
                <button onClick={() => setStep('form')}
                  className="absolute left-5 top-5 text-xs font-bold bg-black/20 px-3 py-1.5 rounded-full hover:bg-black/40 transition-all">
                  ← Retour
                </button>
              )}
              <h2 className="text-3xl font-display font-bold mt-2">{headerTitle}</h2>
              <p className="mt-1 text-white/75 text-sm truncate">{headerSub}</p>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-7">
                {/* SUCCESS */}
                {step === 'success' && (
                  <div className="py-8 flex flex-col items-center text-center gap-4">
                    <div className="h-20 w-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                      <CheckCircle2 size={40} />
                    </div>
                    <p className="text-slate-500 font-medium">Bienvenue sur votre espace personnel !</p>
                  </div>
                )}

                {/* EMAIL VERIFY */}
                {step === 'verify-email' && (
                  <div className="space-y-5">
                    {isFirebase ? (
                      <div className="text-center space-y-4">
                        <div className="h-14 w-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
                          <Mail size={26} />
                        </div>
                        <p className="text-sm text-slate-500 leading-relaxed">
                          Cliquez sur le lien dans l'email envoyé à<br />
                          <strong className="text-slate-800">{email}</strong>, puis connectez-vous ici.
                        </p>
                        <button onClick={() => { setStep('form'); setMode('login'); }}
                          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-4 font-bold text-white text-sm hover:bg-indigo-700 transition-all">
                          J'ai confirmé mon email <ArrowRight size={18} />
                        </button>
                        <button onClick={handleResend} disabled={resendCooldown > 0}
                          className="text-sm font-bold text-indigo-600 disabled:text-slate-400 hover:underline flex items-center gap-1 mx-auto">
                          <RefreshCw size={13} />
                          {resendCooldown > 0 ? `Renvoyer dans ${resendCooldown}s` : "Renvoyer l'email"}
                        </button>
                      </div>
                    ) : (
                      // Fallback OTP
                      <>
                        <p className="text-sm text-slate-500 text-center">
                          Code à 6 chiffres — consultez la <span className="text-indigo-600 font-bold">console (F12)</span>
                        </p>
                        <div className="flex justify-center gap-2">
                          {fbkotp.map((d, i) => (
                            <input key={i} id={`fbk-otp-${i}`} type="text" inputMode="numeric" maxLength={1} value={d}
                              onChange={e => handleFbkOtpChange(i, e.target.value)}
                              onKeyDown={e => { if (e.key === 'Backspace' && !fbkotp[i] && i > 0) document.getElementById(`fbk-otp-${i - 1}`)?.focus(); }}
                              autoFocus={i === 0}
                              className="w-11 h-13 rounded-xl border-2 border-slate-200 text-center text-xl font-bold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all" />
                          ))}
                        </div>
                        {error && <div className="flex items-center gap-2 text-rose-500 text-xs font-bold bg-rose-50 p-3 rounded-xl"><AlertCircle size={13} />{error}</div>}
                        <button onClick={handleFallbackOtpSubmit} disabled={fbkotp.join('').length !== 6}
                          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3.5 font-bold text-white text-sm hover:bg-indigo-700 transition-all disabled:opacity-40 disabled:pointer-events-none">
                          <ShieldCheck size={16} />Confirmer
                        </button>
                        <div className="text-center text-sm text-slate-500">
                          {fbkCanResend ? (
                            <button onClick={handleResend} className="font-bold text-indigo-600 flex items-center gap-1 mx-auto"><RefreshCw size={13} />Renvoyer</button>
                          ) : <span>Nouveau code dans <strong>{fbkTimer}s</strong></span>}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* PHONE OTP VERIFY */}
                {step === 'verify-phone' && (
                  <div className="space-y-5">
                    <p className="text-sm text-slate-500 text-center leading-relaxed">
                      Code SMS envoyé au <strong className="text-slate-800">{fullNumber()}</strong>
                    </p>
                    <div className="flex justify-center gap-2">
                      {smsOtp.map((d, i) => (
                        <input key={i} id={`sms-otp-${i}`} type="text" inputMode="numeric" maxLength={1} value={d}
                          onChange={e => handleSmsOtpChange(i, e.target.value)}
                          onKeyDown={e => { if (e.key === 'Backspace' && !smsOtp[i] && i > 0) document.getElementById(`sms-otp-${i - 1}`)?.focus(); }}
                          autoFocus={i === 0}
                          className="w-12 h-14 rounded-2xl border-2 border-slate-200 text-center text-2xl font-bold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all" />
                      ))}
                    </div>
                    {error && <div className="flex items-center gap-2 text-rose-500 text-xs font-bold bg-rose-50 p-3 rounded-xl"><AlertCircle size={13} />{error}</div>}
                    <button onClick={handleVerifyPhone} disabled={isLoading || smsOtp.join('').length !== 6}
                      className="w-full flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-4 font-bold text-white text-sm hover:bg-indigo-700 transition-all disabled:opacity-40 disabled:pointer-events-none">
                      {isLoading ? <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><ShieldCheck size={16} />Vérifier le code SMS</>}
                    </button>
                    <div className="text-center text-sm text-slate-500">
                      {resendCooldown > 0 ? (
                        <span>Renvoyer dans <strong className="text-slate-800">{resendCooldown}s</strong></span>
                      ) : (
                        <button onClick={handleResend} className="font-bold text-indigo-600 flex items-center gap-1 mx-auto hover:underline">
                          <RefreshCw size={13} />Renvoyer le SMS
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* MAIN FORM */}
                {step === 'form' && (
                  <>
                    {/* Tabs Email / Téléphone */}
                    <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl mb-6">
                      <button onClick={() => { setTab('email'); setError(''); }}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === 'email' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                        <Mail size={15} />Email
                      </button>
                      <button onClick={() => { setTab('phone'); setError(''); }}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === 'phone' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                        <Phone size={15} />Téléphone
                      </button>
                    </div>

                    <form onSubmit={handleFormSubmit} className="space-y-4">
                      {/* PHONE TAB */}
                      {tab === 'phone' && (
                        <>
                          {!isFirebase && (
                            <div className="flex items-start gap-2 text-amber-700 text-xs font-bold bg-amber-50 p-3 rounded-xl border border-amber-100">
                              <AlertCircle size={14} className="mt-0.5 shrink-0" />
                              L'authentification par téléphone nécessite Firebase configuré.
                            </div>
                          )}
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nom (optionnel)</label>
                            <div className="relative group">
                              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors"><UserIcon size={16} /></div>
                              <input type="text" value={phoneName} onChange={e => setPhoneName(e.target.value)} placeholder="Jean Dupont"
                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-medium outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-400" />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Numéro de téléphone</label>
                            <div className="flex gap-2 relative">
                              {/* Country picker */}
                              <button type="button" onClick={() => setShowCountryList(!showCountryList)}
                                className="shrink-0 flex items-center gap-1.5 px-3 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-700 hover:border-indigo-400 transition-all min-w-[90px]">
                                <span>{countryCode.flag}</span>
                                <span>{countryCode.code}</span>
                              </button>
                              {showCountryList && (
                                <div className="absolute top-full left-0 mt-1 z-50 bg-white rounded-2xl border border-slate-200 shadow-xl w-64 max-h-52 overflow-y-auto">
                                  {COUNTRY_CODES.map(c => (
                                    <button key={c.code + c.name} type="button"
                                      onClick={() => { setCountryCode(c); setShowCountryList(false); }}
                                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-indigo-50 text-sm font-medium text-slate-700 transition-colors">
                                      <span className="text-xl">{c.flag}</span>
                                      <span>{c.name}</span>
                                      <span className="ml-auto text-slate-400 text-xs font-bold">{c.code}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                              <div className="relative flex-1 group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors"><Smartphone size={16} /></div>
                                <input type="tel" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                                  placeholder="06 12 34 56 78" required
                                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-medium outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-400" />
                              </div>
                            </div>
                          </div>
                          {/* Invisible recaptcha container */}
                          <div id="recaptcha-container" />
                        </>
                      )}

                      {/* EMAIL TAB */}
                      {tab === 'email' && (
                        <>
                          {!isFirebase && (
                            <div className="flex items-start gap-2 text-amber-700 text-xs font-bold bg-amber-50 p-3 rounded-xl border border-amber-100">
                              <AlertCircle size={14} className="mt-0.5 shrink-0" />Firebase non configuré — mode local (cet appareil uniquement).
                            </div>
                          )}
                          {mode === 'signup' && (
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nom complet</label>
                              <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors"><UserIcon size={16} /></div>
                                <input required type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Jean Dupont"
                                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-medium outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-400" />
                              </div>
                            </div>
                          )}
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email</label>
                            <div className="relative group">
                              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors"><Mail size={16} /></div>
                              <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jean@exemple.com"
                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-medium outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-400" />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mot de passe</label>
                            <div className="relative group">
                              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors"><Lock size={16} /></div>
                              <input required type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-medium outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-400" />
                            </div>
                          </div>
                        </>
                      )}

                      {error && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                          className="flex items-center gap-2 text-rose-500 text-xs font-bold bg-rose-50 p-3 rounded-xl border border-rose-100">
                          <AlertCircle size={13} />{error}
                        </motion.div>
                      )}

                      <button disabled={isLoading} type="submit"
                        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-4 text-sm font-bold text-white shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 transition-all disabled:opacity-70 disabled:pointer-events-none">
                        {isLoading
                          ? <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          : tab === 'phone'
                            ? <><Smartphone size={17} />Envoyer le code SMS</>
                            : <>{mode === 'login' ? 'Se connecter' : 'Créer mon compte'}<ArrowRight size={17} /></>
                        }
                      </button>

                      {tab === 'email' && isFirebase && (
                        <>
                          <div className="relative py-2 flex items-center">
                            <div className="flex-1 border-t border-slate-100" />
                            <span className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ou</span>
                            <div className="flex-1 border-t border-slate-100" />
                          </div>
                          <button type="button" onClick={handleGoogle}
                            className="w-full flex items-center justify-center gap-3 rounded-2xl border-2 border-slate-200 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all">
                            <Chrome size={18} className="text-blue-500" />Continuer avec Google
                          </button>
                        </>
                      )}

                      {tab === 'email' && (
                        <p className="text-center text-sm text-slate-500">
                          {mode === 'login' ? 'Pas encore de compte ?' : 'Déjà un compte ?'}{' '}
                          <button type="button" onClick={() => { setMode(m => m === 'login' ? 'signup' : 'login'); setError(''); }}
                            className="font-bold text-indigo-600 hover:underline">
                            {mode === 'login' ? 'Inscrivez-vous' : 'Connectez-vous'}
                          </button>
                        </p>
                      )}
                    </form>
                  </>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 bg-slate-50 px-7 py-4 border-t border-slate-100 text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {isFirebase ? '🔒 Sécurisé par Firebase / Google' : '🔒 Mode local — même appareil'}
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
