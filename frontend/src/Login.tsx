import CryptoJS from 'crypto-js';
import { useState } from 'react';
import { useNavigate } from 'react-router';

function Login() {
  const secret = import.meta.env.VITE_SECRET_KEY;
  const [token, setToken] = useState('');
  const navigate = useNavigate();

  /* ───────── helpers ───────── */
  const clearVolatileCaches = () => sessionStorage.clear();        // ✨ NEW

  const encryptData = (data: string) => {
    if (!secret) throw new Error('Secret key is not defined');
    return CryptoJS.AES.encrypt(JSON.stringify(data), secret).toString();
  };

  /* ───────── handlers ───────── */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;

    clearVolatileCaches();                                         // ✨ 1st step
    localStorage.setItem('encryptedToken', encryptData(token.trim()));
    navigate('/admin');
  };

  const handleOAuth = () => {
    clearVolatileCaches();                                         // ✨ 1st step
    window.location.href = 'http://localhost:3000/login';
  };

  /* ───────── UI ───────── */
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0c0c0def] text-white">
      <div className="bg-[#9797b94e] p-6 rounded-xl shadow-md w-96">
        <h2 className="text-[22px] font-bold mb-6 text-center">
          Login with your GitHub token
        </h2>

        {/* ── paste-a-token form ─────────────────────────────── */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            className="shadow appearance-none border rounded w-full py-2 px-3 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="Paste a Personal Access Token"
            onChange={e => setToken(e.target.value)}
            value={token}
          />

          <button
            type="submit"
            className="w-full flex justify-center items-center bg-[#FF9977] hover:bg-[#ffc073] text-white font-bold py-2 px-4 rounded"
          >
            Proceed
          </button>
        </form>

        {/* ── OR divider ─────────────────────────────────────── */}
        <div className="my-6 flex items-center">
          <hr className="flex-grow border-t border-gray-400" />
          <span className="px-3 text-gray-300 text-sm uppercase">or</span>
          <hr className="flex-grow border-t border-gray-400" />
        </div>

        {/* ── OAuth button ───────────────────────────────────── */}
        <button
          onClick={handleOAuth}
          className="cursor-pointer w-full flex items-center justify-center gap-2 bg-[#24292E] hover:bg-[#1b1f23] text-white font-bold py-2 px-4 rounded"
        >
          <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 .2a8 8 0 0 0-2.53 15.6c.4.07.55-.17.55-.38v-1.3c-2.23.48-2.7-1.08-2.7-1.08-.36-.92-.88-1.17-.88-1.17-.72-.5.05-.49.05-.49.8.06 1.23.83 1.23.83.71 1.22 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.97 0-.88.32-1.6.84-2.17-.08-.2-.36-1.02.08-2.13 0 0 .67-.22 2.2.83a7.7 7.7 0 0 1 4 0c1.53-1.05 2.2-.83 2.2-.83.44 1.11.16 1.93.08 2.14.52.57.84 1.29.84 2.17 0 3.08-1.87 3.77-3.65 3.97.29.26.54.77.54 1.55v2.3c0 .21.15.46.55.38A8 8 0 0 0 8 .2z" />
          </svg>
          Sign&nbsp;in with GitHub
        </button>

        <p className="mt-4 text-center text-blue-300 underline cursor-pointer">
          Instructions
        </p>
      </div>
    </div>
  );
}

export default Login;
