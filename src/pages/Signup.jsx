import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || !confirmPassword) return setError('Please fill in all fields.');
    if (password !== confirmPassword) return setError('Passwords do not match.');

    try {
      setError(''); setLoading(true);
      await signup(email, password);
      navigate('/');
    } catch (err) {
      setError('Failed to sign up: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16 md:mt-20 p-8 sm:p-10 bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Create Account</h2>
        <p className="text-slate-500 font-medium mt-2">Join NomadFlow and start charting</p>
      </div>
      
      {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-semibold border border-red-100">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-slate-700 font-bold mb-2 text-sm">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm font-medium focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none transition-all"
            placeholder="name@company.com"
          />
        </div>
        
        <div>
          <label className="block text-slate-700 font-bold mb-2 text-sm">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm font-medium focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none transition-all"
            placeholder="Min 6 Characters"
          />
        </div>

        <div>
           <label className="block text-slate-700 font-bold mb-2 text-sm">Confirm Password</label>
           <input
             type="password"
             value={confirmPassword}
             onChange={(e) => setConfirmPassword(e.target.value)}
             className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm font-medium focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none transition-all"
             placeholder="Match your password"
           />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 disabled:opacity-50 hover:shadow-lg hover:shadow-blue-200 transition-all duration-300 hover:-translate-y-0.5 mt-2"
        >
          {loading ? 'Creating Identity...' : 'Sign Up'}
        </button>
      </form>
      
      <p className="mt-8 text-center text-slate-500 font-medium text-sm">
        Already have an account? <Link to="/login" className="text-blue-600 font-bold hover:text-blue-700 hover:underline">Log in</Link>
      </p>
    </div>
  );
};

export default Signup;
