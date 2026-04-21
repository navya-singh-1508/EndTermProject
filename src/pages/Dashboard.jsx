import { useState, useEffect, useMemo } from 'react';
import { useTrip } from '../context/TripContext';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

const Dashboard = () => {
  // Context states & methods
  const { user } = useAuth();
  const { trips, loading: tripsLoading, addTrip, updateTrip, deleteTrip } = useTrip();

  // Form states
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budget, setBudget] = useState('');
  const [notes, setNotes] = useState('');
  
  const [editingId, setEditingId] = useState(null);
  const [formError, setFormError] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Global Expenses State (For Analytics)
  const [globalExpenses, setGlobalExpenses] = useState([]);
  const [expensesLoading, setExpensesLoading] = useState(false);

  // 1. Fetch ALL expenses for the user to power the Analytics Dashboard
  useEffect(() => {
    const fetchGlobalExpenses = async () => {
      if (!user) {
        setGlobalExpenses([]); // Reset on logout
        return;
      }
      try {
        setExpensesLoading(true);
        const q = query(collection(db, 'expenses'), where('userId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        const loadedExpenses = [];
        querySnapshot.forEach((doc) => {
          loadedExpenses.push(doc.data());
        });
        setGlobalExpenses(loadedExpenses);
      } catch (error) {
        console.error("Error fetching global expenses: ", error);
      } finally {
        setExpensesLoading(false);
      }
    };
    
    fetchGlobalExpenses();
  }, [user]);


  // 2. Compute Analytics efficiently using useMemo
  const analyticsData = useMemo(() => {
    // Scaffold out base totals
    const totals = { food: 0, travel: 0, stay: 0, misc: 0 };
    
    // Sum it up
    globalExpenses.forEach(ex => {
      if (totals[ex.category] !== undefined) {
        totals[ex.category] += ex.amount;
      }
    });

    // Structure array specifically for mapping a bar chart UI
    const mapped = [
      { name: 'Food & Dining', value: totals.food, color: 'bg-orange-400', icon: '🍽️' },
      { name: 'Travel & Transit', value: totals.travel, color: 'bg-blue-400', icon: '✈️' },
      { name: 'Accommodation', value: totals.stay, color: 'bg-indigo-400', icon: '🏨' },
      { name: 'Miscellaneous', value: totals.misc, color: 'bg-emerald-400', icon: '🛍️' }
    ];
    
    // Sort descending internally
    mapped.sort((a,b) => b.value - a.value);
    
    // The highest categorical spend dictates 100% width on the bar charts
    const maxVal = mapped[0].value || 1; // Fallback to 1 to prevent division constraints
    const totalSpent = globalExpenses.reduce((sum, item) => sum + item.amount, 0);

    return { mapped, maxVal, totalSpent };
  }, [globalExpenses]);


  // Boilerplate CRUD Submissions
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!destination || !startDate || !endDate || !budget) return setFormError("Please fill out all required fields.");
    if (isSubmitting) return; // Prevent double clicks
    
    setFormError(""); 
    setIsSubmitting(true); // Disable button

    const tripData = { destination, startDate, endDate, budget: Number(budget), notes };

    try {
      if (editingId) {
        await updateTrip(editingId, tripData);
        setEditingId(null);
      } else {
        await addTrip(tripData);
      }
      setDestination(''); setStartDate(''); setEndDate(''); setBudget(''); setNotes('');
    } catch (err) {
      setFormError("An error occurred while saving the trip.");
    } finally {
      setIsSubmitting(false); // Enable button
    }
  };

  const handleDeleteTrip = async (id) => {
    if (deletingId) return; // Prevent multiple simultaneous deletes
    setDeletingId(id);
    try {
      await deleteTrip(id);
    } catch (error) {
      console.error("Failed to delete trip");
    } finally {
      setDeletingId(null);
    }
  };

  const handleEditClick = (trip) => {
    setEditingId(trip.id); setDestination(trip.destination); setStartDate(trip.startDate);
    setEndDate(trip.endDate); setBudget(trip.budget); setNotes(trip.notes || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null); setDestination(''); setStartDate(''); setEndDate(''); setBudget(''); setNotes(''); setFormError('');
  };

  // Quick header stats
  const totalTrips = trips.length;
  const totalBudgetSpent = trips.reduce((sum, t) => sum + (Number(t.budget) || 0), 0);

  return (
    <div className="max-w-7xl mx-auto py-8 lg:py-12">
      
      {/* SaaS Dashboard Header Area */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">Overview Dashboard</h1>
          <p className="text-slate-500 font-medium mt-2">Manage your adventures, itineraries, and trip expenses.</p>
        </div>
        
        {/* Quick SaaS Stats Bento row */}
        {!tripsLoading && trips.length > 0 && (
          <div className="flex gap-4">
             <div className="bg-white border border-slate-200 px-6 py-4 rounded-[1.5rem] shadow-sm text-center">
                <p className="text-[10px] sm:text-xs text-slate-400 font-black uppercase tracking-widest">Total Trips</p>
                <p className="text-2xl font-extrabold text-slate-800 mt-1">{totalTrips}</p>
             </div>
             <div className="bg-white border border-slate-200 px-6 py-4 rounded-[1.5rem] shadow-sm text-center">
                <p className="text-[10px] sm:text-xs text-slate-400 font-black uppercase tracking-widest">Budgets</p>
                <p className="text-2xl font-extrabold text-blue-600 mt-1">${totalBudgetSpent.toLocaleString()}</p>
             </div>
          </div>
        )}
      </div>

      {/* Main Bento Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 lg:gap-10">
        
        {/* --- FORM SECTION (Left Sidebar Container) --- */}
        <div className="xl:col-span-4">
          <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm hover:shadow-md border border-slate-100 lg:sticky lg:top-24 transition duration-300">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3">
              <span className="bg-blue-50 text-blue-600 p-2.5 rounded-xl border border-blue-100">✨</span>
              {editingId ? "Edit Trip Details" : "Plan New Trip"}
            </h2>
            
            {formError && <p className="bg-red-50 text-red-600 text-sm font-semibold p-4 rounded-xl mb-6 border border-red-100">{formError}</p>}
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-slate-700 text-sm font-bold mb-2">Destination *</label>
                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm font-medium focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none transition-all" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="e.g. Tokyo, Japan" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 text-sm font-bold mb-2">Starts *</label>
                  <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm font-medium focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none transition-all" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div>
                  <label className="block text-slate-700 text-sm font-bold mb-2">Ends *</label>
                  <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm font-medium focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none transition-all" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 text-sm font-bold mb-2">Budget ($) *</label>
                <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm font-medium focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none transition-all" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="0" />
              </div>

              <div>
                <label className="block text-slate-700 text-sm font-bold mb-2">Notes</label>
                <textarea className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm font-medium focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none transition-all" value={notes} onChange={(e) => setNotes(e.target.value)} rows="3" placeholder="Expectations, info..."></textarea>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className={`flex-1 font-bold py-3.5 rounded-xl transition-all duration-300 tracking-wide ${isSubmitting ? 'bg-slate-400 text-slate-100 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-slate-800 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200 active:translate-y-0'}`}
                >
                  {isSubmitting ? (editingId ? "Updating..." : "Creating...") : (editingId ? "Update Info" : "Create Trip")}
                </button>
                {editingId && !isSubmitting && (
                  <button type="button" onClick={handleCancelEdit} className="bg-slate-100 text-slate-600 font-bold py-3.5 px-6 rounded-xl hover:bg-slate-200 transition-colors">
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* --- DISPLAY SECTIONS (Right Sidebar Container) --- */}
        <div className="xl:col-span-8 flex flex-col gap-8">
          
          {tripsLoading ? (
            <div className="flex justify-center items-center h-64 border-2 border-dashed border-slate-200 rounded-[2rem] bg-slate-50/50">
              <p className="text-slate-400 font-bold animate-pulse flex items-center gap-3">
                <span className="h-5 w-5 rounded-full border-2 border-slate-400 border-t-transparent animate-spin"></span>
                Generating workspace...
              </p>
            </div>
          ) : trips.length === 0 ? (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] p-12 text-center flex flex-col justify-center items-center h-[500px]">
              <div className="bg-white p-5 rounded-full shadow-sm mb-5 text-4xl ring-4 ring-slate-100">🌍</div>
              <h3 className="text-2xl font-extrabold text-slate-800">Your map is blank</h3>
              <p className="text-slate-500 font-medium mt-3 max-w-sm mx-auto leading-relaxed">Fill out the planner on the left to start charting your first destination.</p>
            </div>
          ) : (
            <>
              {/* NEW ANALYTICS BENTO BOX */}
              <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8 hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 border-b border-slate-100 pb-5">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Global Spending Analytics</h2>
                    <p className="text-slate-500 font-medium text-sm mt-1">Cross-trip categorical breakdowns</p>
                  </div>
                  <span className="bg-blue-50 text-blue-700 font-extrabold px-5 py-2.5 rounded-xl border border-blue-100 shadow-sm shrink-0">
                    Total: ${analyticsData.totalSpent.toLocaleString()}
                  </span>
                </div>

                {expensesLoading ? (
                  <p className="text-slate-400 font-medium py-6 text-center animate-pulse">Running global metric aggregations...</p>
                ) : analyticsData.totalSpent === 0 ? (
                  <div className="py-8 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center">
                    <p className="text-slate-500 font-medium">No expenses logged across any trips yet.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {analyticsData.mapped.map((cat, index) => {
                      // Native lightweight CSS-driven bar chart mapping proportions intrinsically!
                      const widthPercent = cat.value > 0 ? ((cat.value / analyticsData.maxVal) * 100) : 0;
                      return (
                        <div key={index} className="relative group">
                          <div className="flex justify-between items-center mb-2.5 text-sm font-bold text-slate-700">
                            <span className="flex items-center gap-2">
                              <span className="text-lg">{cat.icon}</span> 
                              {cat.name}
                            </span>
                            <span className="text-slate-900">${cat.value.toLocaleString()}</span>
                          </div>
                          {/* CSS Background Track */}
                          <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden shadow-inner">
                              {/* Dynamic CSS Progress Fill */}
                              <div 
                                className={`h-full ${cat.color} rounded-full transition-all duration-1000 ease-out`} 
                                style={{ width: `${widthPercent}%` }}
                              ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* TRIPS LIST */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                {trips.map((trip) => (
                  <div key={trip.id} className="group bg-white rounded-[2rem] shadow-sm hover:shadow-xl border border-slate-100 flex flex-col justify-between transition-all duration-300 transform hover:-translate-y-1.5 overflow-hidden">
                    
                    {/* Card Header (SaaS thumbnail simulation) */}
                    <div className="h-2 w-full bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 opacity-80 group-hover:opacity-100 transition-opacity"></div>
                    
                    <div className="p-7 md:p-8 flex flex-col h-full justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-6 gap-2">
                          <h3 className="text-2xl font-black text-slate-900 leading-tight">
                            {trip.destination}
                          </h3>
                          <span className="bg-blue-50 text-blue-700 text-xs font-black px-4 py-1.5 rounded-full whitespace-nowrap border border-blue-100">
                            ${trip.budget.toLocaleString()}
                          </span>
                        </div>
                        
                        <div className="flex items-center text-sm text-slate-500 font-semibold mb-6 bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                          <span className="mr-3 opacity-60">🗓️</span>
                          {trip.startDate}
                          <span className="mx-3 opacity-30 text-lg leading-none">→</span>
                          {trip.endDate}
                        </div>

                        {trip.notes && (
                          <p className="text-sm font-medium text-slate-600 bg-slate-50/50 rounded-xl p-4 mb-6 border border-slate-100/50 line-clamp-3 leading-relaxed">
                            {trip.notes}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex flex-col sm:flex-row items-center gap-3 mt-auto pt-6 border-t border-slate-50">
                        <Link 
                          to={`/trip/${trip.id}`} 
                          className="w-full sm:flex-[5] bg-blue-600 text-white py-3.5 rounded-xl hover:bg-blue-700 hover:shadow-md hover:shadow-blue-200 transition-all text-center text-sm font-bold tracking-wide"
                        >
                          Open Workspace
                        </Link>
                        <div className="flex w-full sm:flex-[3] gap-2">
                          <button 
                            onClick={() => handleEditClick(trip)} 
                            className="flex-1 bg-slate-100 text-slate-600 py-3.5 rounded-xl hover:bg-slate-200 hover:text-slate-900 transition-colors text-center text-sm font-bold"
                            title="Edit"
                          >
                            ✎
                          </button>
                          <button 
                            onClick={() => handleDeleteTrip(trip.id)} 
                            disabled={deletingId === trip.id}
                            className={`flex-[1.5] py-3.5 rounded-xl transition-all text-center text-sm font-bold ${deletingId === trip.id ? 'bg-red-100 text-red-400 cursor-not-allowed' : 'bg-red-50 text-red-500 hover:bg-red-500 hover:text-white'}`}
                            title="Delete"
                          >
                            {deletingId === trip.id ? "Deleting..." : "✕"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
