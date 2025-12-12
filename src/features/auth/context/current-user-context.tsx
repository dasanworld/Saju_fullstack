"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useUser } from "@clerk/nextjs";

type CurrentUser = {
  id: string;
  clerkUserId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
};

type CurrentUserContextValue = {
  user: CurrentUser | null;
  status: "loading" | "authenticated" | "unauthenticated";
  isAuthenticated: boolean;
  isLoading: boolean;
};

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null);

type CurrentUserProviderProps = {
  children: ReactNode;
};

export const CurrentUserProvider = ({ children }: CurrentUserProviderProps) => {
  const { user, isLoaded, isSignedIn } = useUser();

  const value = useMemo<CurrentUserContextValue>(() => {
    if (!isLoaded) {
      return {
        user: null,
        status: "loading",
        isAuthenticated: false,
        isLoading: true,
      };
    }

    if (!isSignedIn || !user) {
      return {
        user: null,
        status: "unauthenticated",
        isAuthenticated: false,
        isLoading: false,
      };
    }

    return {
      user: {
        id: user.id,
        clerkUserId: user.id,
        email: user.primaryEmailAddress?.emailAddress ?? null,
        firstName: user.firstName,
        lastName: user.lastName,
        imageUrl: user.imageUrl,
      },
      status: "authenticated",
      isAuthenticated: true,
      isLoading: false,
    };
  }, [isLoaded, isSignedIn, user]);

  return (
    <CurrentUserContext.Provider value={value}>
      {children}
    </CurrentUserContext.Provider>
  );
};

export const useCurrentUserContext = () => {
  const value = useContext(CurrentUserContext);

  if (!value) {
    throw new Error("CurrentUserProvider가 트리 상단에 필요합니다.");
  }

  return value;
};
