import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTrip } from '../context/TripContext';
import { db } from '../services/firebase';
import { collection, addDoc, getDocs, doc, deleteDoc, query, where, serverTimestamp } from 'firebase/firestore';

const TripDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { trips, loading: tripsLoading } = useTrip();
  const trip = trips.find(t => t.id === id);

  const [activeTab, setActiveTab] = useState('itinerary');

  // ====================== EXPENSES LOGIC ======================
  const [expenses, setExpenses] = useState([]);
  const [expensesLoading, setExpensesLoading] = useState(false);
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [deletingExpenseId, setDeletingExpenseId] = useState(null);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('food');
  const [expenseNote, setExpenseNote] = useState('');
  const [expenseError, setExpenseError] = useState('');

  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        setExpensesLoading(true);
        const q = query(collection(db, 'expenses'), where('tripId', '==', id));
        const querySnapshot = await getDocs(q);
        const loadedExpenses = [];
        querySnapshot.forEach((doc) => {
          loadedExpenses.push({ id: doc.id, ...doc.data() });
        });
        setExpenses(loadedExpenses);
      } catch (error) {
        console.error("Error fetching expenses: ", error);
      } finally {
        setExpensesLoading(false);
      }
    };
    if (user && id) fetchExpenses();
  }, [id, user]);

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!amount || isNaN(amount)) return setExpenseError("Please enter a valid amount.");
    if (isAddingExpense) return;
    setExpenseError('');
    setIsAddingExpense(true);

    const tempId = Date.now().toString();
    const newExpense = { userId: user.uid, tripId: id, amount: Number(amount), category, note: expenseNote };
    
    // 1. Optimistic UI update BEFORE network
    setExpenses(prev => [...prev, { id: tempId, ...newExpense }]);
    setAmount(''); setCategory('food'); setExpenseNote('');

    try {
      // 2. Perform network request
      const docRef = await addDoc(collection(db, 'expenses'), { ...newExpense, createdAt: serverTimestamp() });
      
      // 3. Invisible sync
      setExpenses(prev => prev.map(ex => (ex.id === tempId ? { ...ex, id: docRef.id } : ex)));
    } catch (err) {
      setExpenseError("Failed to log expense.");
      // 4. Revert optimistic update
      setExpenses(prev => prev.filter(ex => ex.id !== tempId));
    } finally {
      setIsAddingExpense(false);
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (deletingExpenseId) return;
    
    const exBackup = expenses.find(e => e.id === expenseId);
    setDeletingExpenseId(expenseId);
    
    // 1. Optimistic UI delete BEFORE network
    setExpenses(prev => prev.filter(ex => ex.id !== expenseId));

    try {
      await deleteDoc(doc(db, 'expenses', expenseId));
    } catch (err) {
      console.error("Failed to delete expense: ", err);
      // 2. Revert optimistic delete
      if (exBackup) setExpenses(prev => [...prev, exBackup]);
    } finally {
      setDeletingExpenseId(null);
    }
  };

  const totalExpenses = useMemo(() => expenses.reduce((sum, item) => sum + item.amount, 0), [expenses]);

  const highestCategory = useMemo(() => {
    if (expenses.length === 0) return "None";
    const totalsByCategory = { food: 0, travel: 0, stay: 0, misc: 0 };
    expenses.forEach(ex => totalsByCategory[ex.category] !== undefined && (totalsByCategory[ex.category] += ex.amount));

    let maxCat = 'food';
    let maxAmt = totalsByCategory.food;
    for (const [cat, sum] of Object.entries(totalsByCategory)) {
      if (sum > maxAmt) { maxAmt = sum; maxCat = cat; }
    }
    return maxCat.charAt(0).toUpperCase() + maxCat.slice(1);
  }, [expenses]);


  // ====================== ITINERARY LOGIC ======================
  const [itinerary, setItinerary] = useState([]);
  const [itinLoading, setItinLoading] = useState(false);
  const [isAddingItin, setIsAddingItin] = useState(false);
  const [deletingItinId, setDeletingItinId] = useState(null);
  const [itinDate, setItinDate] = useState('');
  const [itinActivity, setItinActivity] = useState('');
  const [itinTime, setItinTime] = useState('');
  const [itinNotes, setItinNotes] = useState('');
  const [itinError, setItinError] = useState('');

  useEffect(() => {
    const fetchItinerary = async () => {
      try {
        setItinLoading(true);
        const q = query(collection(db, 'itineraries'), where('tripId', '==', id));
        const querySnapshot = await getDocs(q);
        const loadedItinerary = [];
        querySnapshot.forEach((doc) => {
          loadedItinerary.push({ id: doc.id, ...doc.data() });
        });
        setItinerary(loadedItinerary);
      } catch (error) {
        console.error("Error fetching itinerary: ", error);
      } finally {
        setItinLoading(false);
      }
    };
    if (user && id) fetchItinerary();
  }, [id, user]);

  const handleAddItinerary = async (e) => {
    e.preventDefault();
    if (!itinDate || !itinActivity) return setItinError("Please fill in Date & Activity.");
    if (isAddingItin) return;
    setItinError('');
    setIsAddingItin(true);

    const tempId = Date.now().toString();
    const newItem = { userId: user.uid, tripId: id, date: itinDate, activity: itinActivity, time: itinTime, notes: itinNotes };
    
    // 1. Optimistic UI update BEFORE network request
    setItinerary(prev => [...prev, { id: tempId, ...newItem }]);
    setItinActivity(''); setItinTime(''); setItinNotes('');

    try {
      // 2. Background task
      const docRef = await addDoc(collection(db, 'itineraries'), { ...newItem, createdAt: serverTimestamp() });
      // 3. Invisible sync
      setItinerary(prev => prev.map(it => (it.id === tempId ? { ...it, id: docRef.id } : it)));
    } catch (err) {
      setItinError("Failed to save activity.");
      // 4. Revert 
      setItinerary(prev => prev.filter(it => it.id !== tempId));
    } finally {
      setIsAddingItin(false);
    }
  };

  const handleDeleteItinerary = async (itemId) => {
    if (deletingItinId) return;
    
    const itBackup = itinerary.find(i => i.id === itemId);
    setDeletingItinId(itemId);
    
    // 1. Optimistic UI update BEFORE network
    setItinerary(prev => prev.filter(it => it.id !== itemId));

    try {
      await deleteDoc(doc(db, 'itineraries', itemId));
    } catch (err) {
      console.error("Failed to delete itinerary: ", err);
      // 2. Revert Optimistic Delete
      if (itBackup) setItinerary(prev => [...prev, itBackup]);
    } finally {
      setDeletingItinId(null);
    }
  };

  const groupedItinerary = useMemo(() => {
    const groups = {};
    itinerary.forEach(item => {
      if (!groups[item.date]) groups[item.date] = [];
      groups[item.date].push(item);
    });
    const sortedDates = Object.keys(groups).sort();
    sortedDates.forEach(date => {
      groups[date].sort((a, b) => {
        if (!a.time) return 1; 
        if (!b.time) return -1;
        return a.time.localeCompare(b.time); 
      });
    });
    return { groups, sortedDates };
  }, [itinerary]);


  // ====================== RENDERING ======================
  if (tripsLoading) return (
     <div className="flex justify-center items-center h-[60vh]">
        <div className="h-6 w-6 rounded-full border-2 border-slate-400 border-t-transparent animate-spin"></div>
     </div>
  );

  if (!trip) return (
    <div className="max-w-7xl mx-auto py-12 px-4">
       <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] p-12 text-center h-96 flex flex-col justify-center items-center">
        <h2 className="text-2xl font-extrabold text-slate-800">Trip Not Found</h2>
        <p className="text-slate-500 mt-2 font-medium mb-6">This destination was lost in the void.</p>
        <Link to="/" className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-sm shadow-blue-200">Return Home</Link>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto py-8 lg:py-10">
      
      {/* SaaS App Header Breadcrumb */}
      <Link to="/" className="text-slate-400 hover:text-slate-800 font-bold text-sm mb-6 inline-flex items-center gap-2 transition bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100">
        &larr; Back to Trips
      </Link>
      
      {/* Title Header Card */}
      <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100 mb-10 flex flex-col md:flex-row md:justify-between md:items-end gap-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
        <div className="z-10">
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">{trip.destination}</h1>
          <p className="text-slate-500 font-medium mt-3 flex items-center gap-2">
             <span className="bg-slate-100 p-1.5 rounded-md px-3 text-sm border border-slate-200">🗓️ {trip.startDate}</span>
             <span className="opacity-50">to</span>
             <span className="bg-slate-100 p-1.5 rounded-md px-3 text-sm border border-slate-200">🗓️ {trip.endDate}</span>
          </p>
        </div>
        <div className="md:text-right bg-slate-50 px-6 py-4 rounded-2xl border border-slate-200 z-10 w-full md:w-auto text-center md:text-left shadow-inner">
          <p className="text-xs text-slate-400 uppercase tracking-widest font-black">Trip Budget</p>
          <p className="text-3xl font-extrabold text-indigo-600 mt-1">${trip.budget.toLocaleString()}</p>
        </div>
      </div>

      {/* Segmented SaaS Tabs */}
      <div className="flex p-1.5 bg-slate-200/60 rounded-2xl border border-slate-200 mb-8 max-w-sm mx-auto md:mx-0 shadow-inner">
        <button 
          onClick={() => setActiveTab('itinerary')}
          className={`flex-1 py-3 px-4 font-bold text-sm rounded-xl transition-all duration-300 ${activeTab === 'itinerary' ? 'bg-white text-slate-900 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-700'}`}
        >
          📍 Itinerary Grid
        </button>
        <button 
          onClick={() => setActiveTab('expenses')}
          className={`flex-1 py-3 px-4 font-bold text-sm rounded-xl transition-all duration-300 ${activeTab === 'expenses' ? 'bg-white text-slate-900 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-700'}`}
        >
          💰 Finances
        </button>
      </div>

      <div className="w-full transition-all duration-500 ease-in-out">
        {activeTab === 'expenses' ? (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 lg:gap-10 animate-in fade-in zoom-in-95 duration-300">
            {/* Left: ADD EXPENSE Form */}
            <div className="xl:col-span-4">
              <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100 lg:sticky lg:top-24">
                <h2 className="text-xl font-bold text-slate-800 border-b pb-4 mb-6 flex items-center gap-2">Log Transaction</h2>
                {expenseError && <div className="bg-red-50 text-red-600 p-3 rounded-xl border border-red-100 mb-6 text-sm font-semibold">{expenseError}</div>}
                
                <form onSubmit={handleAddExpense} className="space-y-5">
                  <div>
                    <label className="block text-slate-700 text-sm font-bold mb-2">Cost ($) *</label>
                    <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition text-sm font-medium" placeholder="45.50" />
                  </div>
                  <div>
                    <label className="block text-slate-700 text-sm font-bold mb-2">Category *</label>
                    <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition text-sm font-medium">
                      <option value="food">🍽️ Food & Dining</option>
                      <option value="travel">✈️ Travel & Transit</option>
                      <option value="stay">🏨 Accommodation</option>
                      <option value="misc">🛍️ General / Misc</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 text-sm font-bold mb-2">Note / Merchant</label>
                    <input type="text" value={expenseNote} onChange={(e) => setExpenseNote(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition text-sm font-medium" placeholder="E.g. Uber to Airport" />
                  </div>
                  <button type="submit" disabled={isAddingExpense} className={`w-full font-bold py-3.5 mt-2 rounded-xl shadow-sm transition-all ${isAddingExpense ? 'bg-slate-400 text-slate-100 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-slate-800 hover:-translate-y-0.5'}`}>
                    {isAddingExpense ? "Saving..." : "Save Transaction"}
                  </button>
                </form>
              </div>
            </div>
            
            {/* Right: EXPENSES Stats & List */}
            <div className="xl:col-span-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                <div className={`p-8 rounded-[2.5rem] border relative overflow-hidden ${totalExpenses > trip.budget ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
                  <p className={`text-xs uppercase tracking-widest font-black mb-2 relative z-10 ${totalExpenses > trip.budget ? 'text-red-600' : 'text-emerald-700'}`}>Total Expenditures</p>
                  <p className={`text-5xl font-black relative z-10 ${totalExpenses > trip.budget ? 'text-red-700' : 'text-emerald-800'}`}>${totalExpenses.toLocaleString()}</p>
                  <div className="mt-6 pt-4 border-t border-black/5 flex items-center gap-2 relative z-10">
                    <p className={`font-bold text-sm bg-white/60 px-3 py-1.5 rounded-lg backdrop-blur-sm ${totalExpenses > trip.budget ? 'text-red-700' : 'text-emerald-800'}`}>
                      {totalExpenses > trip.budget ? "⚠️ Budget Exceeded" : "✅ Inside Budget Constraints"}
                    </p>
                  </div>
                </div>
                
                <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-sm relative overflow-hidden">
                  <p className="text-xs uppercase tracking-widest font-black mb-2 text-slate-400">Primary Sink</p>
                  <p className="text-4xl font-black text-slate-900">{highestCategory}</p>
                  <div className="mt-8 pt-4 border-t border-slate-100/80">
                    <p className="font-bold text-sm text-slate-500">Highest grossing category block</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 md:p-8">
                <h2 className="text-xl font-bold text-slate-800 border-b pb-4 mb-6">Archive Tracker</h2>
                {expensesLoading ? (
                  <p className="py-8 text-slate-400 font-bold text-center animate-pulse">Scanning ledger...</p>
                ) : expenses.length === 0 ? (
                  <div className="py-12 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[1.5rem] text-center">
                     <p className="text-slate-500 font-semibold">Your ledger is completely clean.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {expenses.map((expense) => (
                      <div key={expense.id} className="group flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 hover:bg-slate-50 px-4 rounded-2xl transition-colors border border-transparent hover:border-slate-100">
                        <div className="flex gap-4 items-center">
                          <div className="bg-slate-100 w-12 h-12 flex justify-center items-center rounded-2xl border border-slate-200">
                             <span className="font-bold text-slate-600 text-sm uppercase">{expense.category.substring(0, 3)}</span>
                          </div>
                          <div>
                            <p className="text-slate-900 font-bold">{expense.note || <span className="opacity-40 italic font-medium">Uncategorized Event</span>}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6 mt-4 sm:mt-0 ml-16 sm:ml-0 border-t sm:border-0 pt-3 sm:pt-0 border-slate-100">
                          <p className="text-xl font-black text-slate-800">${expense.amount}</p>
                          <button onClick={() => handleDeleteExpense(expense.id)} disabled={deletingExpenseId === expense.id} className={`font-bold text-xs px-3 py-2 rounded-xl transition-colors uppercase tracking-widest ${deletingExpenseId === expense.id ? 'bg-red-100 text-red-300 cursor-not-allowed' : 'text-red-500 bg-red-50 hover:bg-red-500 hover:text-white'}`}>
                            {deletingExpenseId === expense.id ? "..." : "Wipe"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 lg:gap-10 animate-in fade-in zoom-in-95 duration-300">
            {/* Left: ADD ITINERARY Form */}
            <div className="xl:col-span-4">
              <div className="bg-indigo-900 text-white p-6 md:p-8 rounded-[2rem] shadow-md border border-indigo-800 lg:sticky lg:top-24 relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-700/50 rounded-full blur-3xl"></div>
                <h2 className="text-xl font-bold text-indigo-50 border-b border-indigo-800/50 pb-4 mb-6 relative">Log Blueprint</h2>
                {itinError && <div className="bg-red-500/20 text-red-200 p-3 rounded-xl border border-red-500/30 mb-6 text-sm font-semibold relative">{itinError}</div>}
                
                <form onSubmit={handleAddItinerary} className="space-y-4 relative">
                  <div>
                    <label className="block text-indigo-200 text-xs font-bold uppercase tracking-wider mb-2">Block Date *</label>
                    <input type="date" value={itinDate} onChange={(e) => setItinDate(e.target.value)} className="w-full bg-indigo-950/50 border border-indigo-700 text-indigo-50 rounded-xl p-3 focus:ring-2 focus:ring-indigo-400 outline-none text-sm font-medium" />
                  </div>
                  <div>
                    <label className="block text-indigo-200 text-xs font-bold uppercase tracking-wider mb-2">Time Slice</label>
                    <input type="time" value={itinTime} onChange={(e) => setItinTime(e.target.value)} className="w-full bg-indigo-950/50 border border-indigo-700 text-indigo-50 rounded-xl p-3 focus:ring-2 focus:ring-indigo-400 outline-none text-sm font-medium" />
                  </div>
                  <div>
                    <label className="block text-indigo-200 text-xs font-bold uppercase tracking-wider mb-2">Action / Target *</label>
                    <input type="text" value={itinActivity} onChange={(e) => setItinActivity(e.target.value)} className="w-full bg-indigo-950/50 border border-indigo-700 text-indigo-50 rounded-xl p-3 focus:ring-2 focus:ring-indigo-400 outline-none text-sm font-medium placeholder-indigo-400" placeholder="e.g. Scuba diving class" />
                  </div>
                  <div>
                    <label className="block text-indigo-200 text-xs font-bold uppercase tracking-wider mb-2">Internal Note</label>
                    <textarea value={itinNotes} onChange={(e) => setItinNotes(e.target.value)} className="w-full bg-indigo-950/50 border border-indigo-700 text-indigo-50 rounded-xl p-3 focus:ring-2 focus:ring-indigo-400 outline-none text-sm font-medium placeholder-indigo-400" placeholder="Bring towels..." rows="2"></textarea>
                  </div>
                  <button type="submit" disabled={isAddingItin} className={`w-full font-bold py-3.5 mt-2 rounded-xl shadow-md transition-all active:translate-y-0 ${isAddingItin ? 'bg-indigo-300 text-indigo-50 cursor-not-allowed' : 'bg-indigo-500 text-white hover:bg-indigo-400 hover:-translate-y-0.5'}`}>
                    {isAddingItin ? "Appending..." : "Append Sequence"}
                  </button>
                </form>
              </div>
            </div>

            {/* Right: ITINERARY List */}
            <div className="xl:col-span-8">
              <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 md:p-10 min-h-[500px]">
                <h2 className="text-2xl font-black text-slate-800 border-b border-slate-100 pb-5 mb-8 flex justify-between items-center">
                  Target Blueprint
                </h2>
                
                {itinLoading ? (
                  <p className="text-center py-6 text-slate-400 font-bold animate-pulse">Syncing chronological grids...</p>
                ) : itinerary.length === 0 ? (
                  <div className="text-center py-16 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] text-slate-500 flex flex-col items-center">
                    <span className="text-4xl mb-4 bg-white p-4 shadow-sm rounded-full">📅</span>
                    <p className="font-bold text-lg text-slate-700">Sequence is blank.</p>
                    <p className="text-sm font-medium mt-1 text-slate-400">Generate a block in the left panel to build the day matrix.</p>
                  </div>
                ) : (
                  <div className="space-y-10">
                    {groupedItinerary.sortedDates.map((date, index) => (
                      <div key={date} className="relative group">
                        {/* Blueprint decorative structural line */}
                        <div className="absolute left-[20px] top-12 bottom-0 w-[3px] bg-slate-100 rounded-full z-0 group-hover:bg-indigo-100 transition-colors"></div>
                        
                        {/* Day Matrix Node */}
                        <div className="flex items-center gap-4 mb-5 relative z-10">
                          <div className="bg-indigo-600 text-white w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shadow-md shadow-indigo-200 ring-4 ring-white animate-in zoom-in duration-500">
                            {index + 1}
                          </div>
                          <div>
                            <h3 className="text-xl font-black text-slate-900 leading-none">Day {index + 1}</h3>
                            <span className="text-slate-400 font-semibold text-xs tracking-widest uppercase">{date}</span>
                          </div>
                        </div>
                        
                        {/* Cards Frame */}
                        <div className="pl-14 pr-2 space-y-4">
                          {groupedItinerary.groups[date].map(item => (
                            <div key={item.id} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:shadow-lg hover:border-indigo-200 transition-all duration-300 relative group/card flex flex-col sm:flex-row justify-between items-start gap-4 hover:-translate-y-1">
                              <div>
                                {item.time ? (
                                  <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 text-[11px] font-black px-2.5 py-1.5 rounded-lg mb-3 border border-indigo-100 uppercase tracking-widest">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    0{item.time}h
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-500 text-[10px] font-black px-2 py-1 rounded-lg mb-3 uppercase tracking-widest">
                                    Flexible block
                                  </span>
                                )}
                                <h4 className="font-extrabold text-slate-800 text-lg leading-tight">{item.activity}</h4>
                                {item.notes && <p className="text-slate-500 font-medium text-sm mt-3 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">{item.notes}</p>}
                              </div>
                              <button 
                                onClick={() => handleDeleteItinerary(item.id)}
                                disabled={deletingItinId === item.id}
                                className={`sm:opacity-0 group-hover/card:opacity-100 focus:opacity-100 px-4 py-2 rounded-xl transition-all font-bold text-xs uppercase tracking-widest shrink-0 self-end sm:self-center ${deletingItinId === item.id ? 'bg-red-100 text-red-300 cursor-not-allowed' : 'text-red-500 bg-red-50 hover:bg-red-500 hover:text-white'}`}
                              >
                                {deletingItinId === item.id ? "..." : "Wipe"}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      </div>

    </div>
  );
};

export default TripDetails;
