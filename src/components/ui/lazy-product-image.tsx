'use client';

import React, { useState, useEffect } from 'react';
import { dbService } from '@/services/db';

interface LazyProductImageProps {
  productId: string;
  productName: string;
  className?: string;
  defaultImage?: string;
}

export function LazyProductImage({
  productId,
  productName,
  className = '',
  defaultImage = '/logo.png'
}: LazyProductImageProps) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function fetchImage() {
      try {
        const images = await dbService.getProductImages(productId);
        if (active) {
          setImgUrl(images?.[0] || defaultImage);
        }
      } catch (e) {
        console.error('Error loading product image:', e);
        if (active) {
          setImgUrl(defaultImage);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    fetchImage();
    return () => {
      active = false;
    };
  }, [productId, defaultImage]);

  if (loading) {
    return (
      <div className={`animate-pulse bg-stone-100 flex items-center justify-center ${className}`}>
        <span className="text-[10px] text-stone-400 font-medium font-sans">Carregando...</span>
      </div>
    );
  }

  return (
    <img
      src={imgUrl || defaultImage}
      alt={productName}
      loading="lazy"
      className={className}
    />
  );
}
