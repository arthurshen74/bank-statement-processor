import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getConfig } from '../config';

/**
 * Hook to load images from authenticated GridFS endpoints
 * Fetches images with JWT authorization and creates blob URLs for use in <img> tags
 *
 * @param {string} fileId - GridFS file ID (ObjectId as string)
 * @returns {Object} { imageUrl, loading, error }
 */
export const useAuthenticatedImage = (fileId) => {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { accessToken } = useAuth();

  useEffect(() => {
    // Skip if no fileId provided
    if (!fileId) {
      setLoading(false);
      return;
    }

    let blobUrl = null;
    let cancelled = false;

    const fetchImage = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = accessToken;
        if (!token) {
          throw new Error('No authentication token available');
        }

        const config = getConfig();
        const url = `${config.apiBaseUrl}/statements/images/${fileId}`;

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
        }

        const blob = await response.blob();

        // Don't update state if component was unmounted
        if (cancelled) {
          return;
        }

        // Create blob URL
        blobUrl = URL.createObjectURL(blob);
        setImageUrl(blobUrl);
      } catch (err) {
        if (!cancelled) {
          console.error('Error loading authenticated image:', err);
          setError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchImage();

    // Cleanup function: revoke blob URL when component unmounts or fileId changes
    return () => {
      cancelled = true;
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [fileId, accessToken]);

  return { imageUrl, loading, error };
};
