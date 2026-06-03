'use client';

import { create } from 'zustand';
import * as authApi from '@/lib/api/auth';
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from './storage';
import type { User } from '@/lib/types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isHydrated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hydrate: () => Promise<void>;
  getAccessToken: () => string | null;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isLoading: false,
  isHydrated: false,

  getAccessToken: () => get().accessToken ?? getAccessToken(),

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const tokens = await authApi.login(email, password);
      setTokens(tokens.accessToken, tokens.refreshToken);
      const { user } = await authApi.getMe(tokens.accessToken);
      set({ user, accessToken: tokens.accessToken });
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (email, password) => {
    set({ isLoading: true });
    try {
      const tokens = await authApi.register(email, password);
      setTokens(tokens.accessToken, tokens.refreshToken);
      const { user } = await authApi.getMe(tokens.accessToken);
      set({ user, accessToken: tokens.accessToken });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: () => {
    clearTokens();
    set({ user: null, accessToken: null });
  },

  hydrate: async () => {
    const stored = getAccessToken();
    const refresh = getRefreshToken();
    if (!stored && !refresh) {
      set({ isHydrated: true });
      return;
    }

    set({ isLoading: true });
    try {
      let token = stored;
      if (token) {
        try {
          const { user } = await authApi.getMe(token);
          set({ user, accessToken: token, isHydrated: true });
          return;
        } catch {
          /* try refresh */
        }
      }
      if (refresh) {
        const tokens = await authApi.refresh(refresh);
        setTokens(tokens.accessToken, tokens.refreshToken);
        token = tokens.accessToken;
        const { user } = await authApi.getMe(token);
        set({ user, accessToken: token, isHydrated: true });
        return;
      }
      clearTokens();
    } catch {
      clearTokens();
      set({ user: null, accessToken: null });
    } finally {
      set({ isLoading: false, isHydrated: true });
    }
  },
}));
