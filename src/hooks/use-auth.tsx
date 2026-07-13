import { useState, useEffect, createContext, useContext } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

interface UserProfile {
  fullName: string;
  role: "teacher" | "student" | "admin" | "uploader";
  usid?: string;
  email: string;
  class?: string;
  [key: string]: any;
}

interface AuthContextType {
  user:
    | User
    | null
    | {
        email: string;
        uid: string;
        displayName: string;
        photoURL?: string | null;
      };
  profile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sqaaf_teacher_profile");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          return null;
        }
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(true);

  const updateProfileState = (prof: UserProfile | null) => {
    if (typeof window !== "undefined") {
      if (prof) {
        const saved = localStorage.getItem("sqaaf_teacher_profile");
        let merged = { ...prof };
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed && parsed.email === prof.email) {
              merged = { ...parsed, ...prof };
            }
          } catch (e) {
            console.error("Failed to parse saved teacher profile", e);
          }
        }
        setProfile(merged);
        localStorage.setItem("sqaaf_teacher_profile", JSON.stringify(merged));
      } else {
        setProfile(null);
        localStorage.removeItem("sqaaf_teacher_profile");
      }
    } else {
      setProfile(prof);
    }
  };

  useEffect(() => {
    // Check for hardcoded Super Admin session
    const isSuperAdmin = sessionStorage.getItem("is_super_admin");
    if (isSuperAdmin === "true") {
      setUser({
        email: "superadmin123@gmail.com",
        uid: "superadmin-fix",
        displayName: "Super Admin",
      });
      updateProfileState({
        fullName: "Super Admin",
        role: "admin",
        email: "superadmin123@gmail.com",
      });
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setLoading(true);
        setUser(user);
        try {
          // Try to fetch from 'teachers' collection first, then 'users' (students)
          const teacherDoc = await getDoc(doc(db, "teachers", user.uid));
          if (teacherDoc.exists()) {
            updateProfileState({
              ...teacherDoc.data(),
              role: "teacher",
            } as UserProfile);
          } else {
            const studentDoc = await getDoc(doc(db, "users", user.uid));
            if (studentDoc.exists()) {
              const data = studentDoc.data();
              updateProfileState({
                ...data,
                role: data.role || "student",
              } as UserProfile);
            } else {
              // Fallback for showcase if document doesn't exist
              console.warn(
                "No Firestore document found. Using fallback profile.",
              );
              updateProfileState({
                fullName: user.displayName || "Demo User",
                role: "teacher",
                email: user.email || "",
              });
            }
          }
        } catch (error) {
          console.error(
            "Failed to fetch user profile (possible Firestore Rules issue):",
            error,
          );
          // Fallback for showcase if Firestore fails (e.g. missing permissions)
          updateProfileState({
            fullName: user.displayName || "Demo User",
            role: "teacher",
            email: user.email || "",
          });
        }
      } else {
        setUser(null);
        updateProfileState(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
