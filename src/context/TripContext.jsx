import { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { useAuth } from './AuthContext'; // Import useAuth to associate trips with the logged-in user

// Create Context
const TripContext = createContext(null);

export const TripProvider = ({ children }) => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // We need the user to link trips to an account
  const { user } = useAuth(); 

  // Read: Fetch trips that belong to the current user
  const getTrips = async () => {
    if (!user) return; // Don't fetch if user isn't logged in
    
    try {
      setLoading(true);
      
      // Query Firestore for documents where 'userId' matches the logged-in user's UID
      const q = query(collection(db, 'trips'), where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      const loadedTrips = [];
      querySnapshot.forEach((doc) => {
        // Push document data into array while including the generated document id
        loadedTrips.push({ id: doc.id, ...doc.data() });
      });
      
      setTrips(loadedTrips);
    } catch (error) {
      console.error("Error fetching trips: ", error);
    } finally {
      setLoading(false);
    }
  };

  // Automatically fetch trips when the logged-in user changes
  useEffect(() => {
    if (user) {
      getTrips();
    } else {
      setTrips([]); // Clear trips if user logs out
    }
  }, [user]);

  // Create: Add a new trip to Firestore
  const addTrip = async (tripData) => {
    // 1. Optimistic UI Update: Create temporary ID and update UI instantly BEFORE network request
    const tempId = Date.now().toString(); 
    const newTrip = { id: tempId, ...tripData, userId: user.uid };
    
    setTrips(prevTrips => [...prevTrips, newTrip]);

    try {
      // 2. Network Request in Background
      const docRef = await addDoc(collection(db, 'trips'), {
        ...tripData,
        userId: user.uid, // Tie the trip document to this user
        createdAt: serverTimestamp() // Add a creation timestamp automatically
      });
      
      // 3. Invisible sync: Swap temporary ID with true Firestore ID so future updates/deletes work
      setTrips(prevTrips => prevTrips.map(trip => (trip.id === tempId ? { ...trip, id: docRef.id } : trip)));
    } catch (error) {
      console.error("Error adding trip: ", error);
      // Revert Optimistic Update on failure
      setTrips(prevTrips => prevTrips.filter(trip => trip.id !== tempId));
      throw error;
    }
  };

  // Update: Modify an existing trip document
  const updateTrip = async (id, updatedData) => {
    // Find before update for fallback
    const tripBackup = trips.find(t => t.id === id);
    
    // 1. Optimistic UI update instantly
    setTrips(prevTrips => prevTrips.map(trip => (trip.id === id ? { ...trip, ...updatedData } : trip)));
    
    try {
      const tripRef = doc(db, 'trips', id);
      await updateDoc(tripRef, updatedData);
    } catch (error) {
      console.error("Error updating trip: ", error);
      // Revert Optimistic Update on failure
      if (tripBackup) {
        setTrips(prevTrips => prevTrips.map(trip => (trip.id === id ? tripBackup : trip)));
      }
      throw error;
    }
  };

  // Delete: Remove a trip from Firestore
  const deleteTrip = async (id) => {
    // Backup before delete
    const tripBackup = trips.find(t => t.id === id);
    
    // 1. Optimistic UI update instantly BEFORE network action
    setTrips(prevTrips => prevTrips.filter(trip => trip.id !== id));
    
    try {
      const tripRef = doc(db, 'trips', id);
      await deleteDoc(tripRef);
    } catch (error) {
      console.error("Error deleting trip: ", error);
      // Revert Optimistic Update on failure
      if (tripBackup) {
        setTrips(prevTrips => [...prevTrips, tripBackup]);
      }
      throw error;
    }
  };

  const value = {
    trips,
    loading,
    getTrips,
    addTrip,
    updateTrip,
    deleteTrip
  };

  return (
    <TripContext.Provider value={value}>
      {children}
    </TripContext.Provider>
  );
};

// Hook to easily consume this context
export const useTrip = () => useContext(TripContext);
