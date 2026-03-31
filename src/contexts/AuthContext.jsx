import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, googleProvider, db } from '../lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged, GoogleAuthProvider } from 'firebase/auth';
import { 
    doc, getDoc, setDoc, updateDoc, 
    collection, getDocs, query, where 
} from 'firebase/firestore';
import ProfileSetup from '../components/ProfileSetup';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [companies, setCompanies] = useState([]);
    const [currentCompanyId, setCurrentCompanyId] = useState(null);
    const [loading, setLoading] = useState(true);

    // Sign in with Google
    const loginWithGoogle = async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;

            // Check if user exists in Firestore
            const userRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userRef);

            if (!userDoc.exists()) {
                // Create basic user profile
                await setDoc(userRef, {
                    email: user.email,
                    displayName: user.displayName,
                    role: 'user', // Default role
                    createdAt: new Date().toISOString()
                });
            }
            return user;
        } catch (error) {
            console.error("Google Sign In Error", error);
            throw error;
        }
    };

    const logout = () => {
        setCurrentCompanyId(null);
        setCompanies([]);
        return signOut(auth);
    };

    const loginForAdminExport = async () => {
        const provider = new GoogleAuthProvider();
        provider.addScope('https://www.googleapis.com/auth/spreadsheets');
        provider.setCustomParameters({ prompt: 'consent' });
        const result = await signInWithPopup(auth, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        return credential.accessToken;
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);

            if (user) {
                try {
                    const userRef = doc(db, 'users', user.uid);
                    const userSnap = await getDoc(userRef);
                    
                    if (userSnap.exists()) {
                        const data = userSnap.data();
                        data.roles = data.roles || [];
                        setUserData(data);
                        
                        const isSA = data.role === 'superadmin';
                        setIsSuperAdmin(isSA);
                        
                        // Fetch Companies the user belongs to (or all if Super Admin)
                        let compsSnap;
                        if (isSA) {
                            compsSnap = await getDocs(collection(db, 'companies'));
                        } else {
                            const q = query(collection(db, 'companies'), where('adminIds', 'array-contains', user.uid));
                            compsSnap = await getDocs(q);
                        }
                        
                        const compList = compsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                        setCompanies(compList);
                        
                        // Select default company
                        const activeId = data.activeCompanyId || (compList.length > 0 ? compList[0].id : null);
                        setCurrentCompanyId(activeId);
                        
                        // Check if admin and get roles in CURRENT company
                        const currentComp = compList.find(c => c.id === activeId);
                        const companyRoles = currentComp?.roles?.[user.uid] || [];
                        
                        setIsAdmin(isSA || (currentComp?.adminIds || []).includes(user.uid) || companyRoles.includes('admin'));
                        
                        // Update userData with current company roles
                        setUserData(prev => ({ ...prev, roles: companyRoles }));
                    }
                } catch (e) {
                    console.error("Auth Load Error:", e);
                } finally {
                    setLoading(false);
                }
            } else {
                setUserData(null);
                setCompanies([]);
                setCurrentCompanyId(null);
                setIsAdmin(false);
                setIsSuperAdmin(false);
                setLoading(false);
            }
        });

        return unsubscribe;
    }, []);

    const switchCompany = async (companyId) => {
        if (!currentUser) return;
        setCurrentCompanyId(companyId);
        // Persist selection
        await updateDoc(doc(db, 'users', currentUser.uid), { activeCompanyId: companyId });
        window.location.reload(); // Refresh to clear states
    };

    const value = {
        currentUser,
        userData,
        isAdmin,
        isSuperAdmin,
        companies,
        currentCompanyId,
        switchCompany,
        loginWithGoogle,
        logout,
        loginForAdminExport
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && (currentUser && userData && companies.length === 0 && !isSuperAdmin ? <ProfileSetup /> : children)}
        </AuthContext.Provider>
    );
}
