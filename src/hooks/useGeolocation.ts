'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { saveUserPreferences } from '@/services/profileService';

const LOCATION_CACHE_KEY = 'nubo_user_location';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in ms

interface CachedLocation {
  lat: number;
  lng: number;
  timestamp: number;
}

export function useGeolocation(userId?: string | null) {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'unsupported'>('prompt');

  const saveLocationToDb = useCallback(async (lat: number, lng: number, uId: string) => {
    try {
      await saveUserPreferences(uId, {
        device_latitude: lat,
        device_longitude: lng,
      });
      // Trigger a match recalculation RPC
      await supabase.rpc('calculate_match', { p_profile_id: uId });
      
      // Dispatch custom event to notify components to refresh their opportunity lists
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('nubo-matches-updated'));
      }
    } catch (err) {
      console.error('[useGeolocation] Failed to save coordinates to database:', err);
    }
  }, []);

  const requestLocation = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setPermissionState('unsupported');
      setLoading(false);
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        const newCache: CachedLocation = {
          lat,
          lng,
          timestamp: Date.now(),
        };

        localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(newCache));
        setLocation({ lat, lng });
        setPermissionState('granted');
        setError(null);
        setLoading(false);

        if (userId) {
          saveLocationToDb(lat, lng, userId);
        }
      },
      (err) => {
        console.warn('[useGeolocation] Permission denied or failed:', err);
        setError(err.message);
        setPermissionState(err.code === err.PERMISSION_DENIED ? 'denied' : 'prompt');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [userId, saveLocationToDb]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check cache first
    const cached = localStorage.getItem(LOCATION_CACHE_KEY);
    if (cached) {
      try {
        const parsed: CachedLocation = JSON.parse(cached);
        const age = Date.now() - parsed.timestamp;
        if (age < CACHE_TTL) {
          setLocation({ lat: parsed.lat, lng: parsed.lng });
          setPermissionState('granted');
          setLoading(false);

          // Sync to DB if we have a user
          if (userId) {
            saveLocationToDb(parsed.lat, parsed.lng, userId);
          }
          return;
        }
      } catch (e) {
        localStorage.removeItem(LOCATION_CACHE_KEY);
      }
    }

    // No cache or expired: check navigator permission state
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setPermissionState(result.state as 'prompt' | 'granted' | 'denied');
        if (result.state === 'granted') {
          requestLocation();
        } else {
          setLoading(false);
        }
      }).catch(() => {
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [userId, requestLocation, saveLocationToDb]);

  return { location, loading, error, permissionState, requestLocation };
}
