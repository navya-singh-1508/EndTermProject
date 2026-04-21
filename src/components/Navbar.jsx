import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Failed to log out', err);
    }
  };

  return (
    <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 shadow-sm border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center transition-all">
        <Link to="/" className="text-2xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-80 transition-opacity">
          NomadFlow
        </Link>
        <div className="flex items-center space-x-6">
          {user ? (
            <>
              <span className="text-slate-600 text-sm hidden sm:inline-block font-semibold bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
                {user.email}
              </span>
              <button 
                onClick={handleLogout} 
                className="text-slate-500 hover:text-red-600 transition-colors text-sm font-bold"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-slate-600 hover:text-blue-600 font-bold text-sm transition-colors">
                Login
              </Link>
              <Link to="/signup" className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition duration-300 shadow-sm shadow-blue-200 hover:shadow-blue-300 hover:-translate-y-0.5 text-sm">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
