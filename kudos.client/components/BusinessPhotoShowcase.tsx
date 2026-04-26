"use client";

import { useEffect, useRef, useState } from "react";
import { getPlaceholderImage } from "@/lib/placeholderImages";

type Photo = {
  id: string;
  originalUrl: string;
  uploadedByUserId?: string | null;
};

type Props = {
  photos: Photo[];
  businessName: string;
  currentUserId?: string | null;
  onDeletePhoto?: (photoId: string) => void;
};

const DESKTOP_VISIBLE_COUNT = 3;
const MOBILE_VISIBLE_COUNT = 1;
const MOBILE_BREAKPOINT = 800;
const AUTO_ROTATE_MS = 5000;
const SWIPE_THRESHOLD = 40;

export default function BusinessPhotoShowcase({
  photos,
  businessName,
  currentUserId,
  onDeletePhoto,
}: Props) {
  const [startIndex, setStartIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [visibleCount, setVisibleCount] = useState(DESKTOP_VISIBLE_COUNT);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const touchStartXRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);

  useEffect(() => {
    function updateVisibleCount() {
      if (window.innerWidth <= MOBILE_BREAKPOINT) {
        setVisibleCount(MOBILE_VISIBLE_COUNT);
      } else {
        setVisibleCount(DESKTOP_VISIBLE_COUNT);
      }
    }

    updateVisibleCount();
    window.addEventListener("resize", updateVisibleCount);

    return () => window.removeEventListener("resize", updateVisibleCount);
  }, []);

  function goNext() {
    setStartIndex((prev) => (prev + 1) % photos.length);
  }

  function goPrev() {
    setStartIndex((prev) => (prev - 1 + photos.length) % photos.length);
  }

  useEffect(() => {
    if (photos.length <= visibleCount || isPaused) return;

    const timer = window.setInterval(() => {
      goNext();
    }, AUTO_ROTATE_MS);

    return () => window.clearInterval(timer);
  }, [photos.length, visibleCount, isPaused]);

  if (photos.length === 0) {
    const placeholder = getPlaceholderImage([]);
    return (
      <div style={{ marginBottom: 32 }}>
        <div style={{
          height: 250,
          borderRadius: 14,
          backgroundImage: `linear-gradient(to top, rgba(0,0,0,0.3), rgba(0,0,0,0.05) 50%), url(${placeholder})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          padding: 24,
        }}>
          <span style={{ color: "white", fontSize: 14, fontWeight: 600, opacity: 0.8 }}>
            No photos yet — be the first to add one!
          </span>
        </div>
      </div>
    );
  }

  const visiblePhotos = Array.from({
    length: Math.min(visibleCount, photos.length),
  }).map((_, i) => photos[(startIndex + i) % photos.length]);

  function handleTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    touchStartXRef.current = e.changedTouches[0].clientX;
    touchEndXRef.current = null;
  }

  function handleTouchMove(e: React.TouchEvent<HTMLDivElement>) {
    touchEndXRef.current = e.changedTouches[0].clientX;
  }

  function handleTouchEnd() {
    if (touchStartXRef.current === null || touchEndXRef.current === null) {
      return;
    }

    const deltaX = touchEndXRef.current - touchStartXRef.current;

    if (Math.abs(deltaX) >= SWIPE_THRESHOLD) {
      if (deltaX < 0) {
        goNext();
      } else {
        goPrev();
      }
    }

    touchStartXRef.current = null;
    touchEndXRef.current = null;
  }

  const shouldShowControls = photos.length > visibleCount;

  async function handleDelete(photoId: string) {
    if (!onDeletePhoto) return;
    setDeletingId(photoId);
    try {
      onDeletePhoto(photoId);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div
      style={{ marginBottom: 32 }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div
        className="business-photo-grid"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {visiblePhotos.map((photo, i) => {
          const isOwner = currentUserId && photo.uploadedByUserId === currentUserId;

          return (
            <div
              key={`${photo.id}-${i}`}
              className="business-photo-card"
              style={{
                backgroundImage: `linear-gradient(to top, rgba(0,0,0,0.28), rgba(0,0,0,0.08) 35%, rgba(0,0,0,0) 70%), url(${photo.originalUrl})`,
                position: "relative",
              }}
              aria-label={`${businessName} photo ${i + 1}`}
            >
              {isOwner && onDeletePhoto && (
                <button
                  type="button"
                  className="photo-delete-btn"
                  disabled={deletingId === photo.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(photo.id);
                  }}
                  title="Delete your photo"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                  </svg>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {shouldShowControls && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 12,
            marginTop: 12,
          }}
        >
          <button
            type="button"
            onClick={goPrev}
            style={arrowStyle}
            aria-label="Previous photos"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={goNext}
            style={arrowStyle}
            aria-label="Next photos"
          >
            ›
          </button>
        </div>
      )}

      <style jsx>{`
        .business-photo-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .business-photo-card {
          height: 300px;
          border-radius: 14px;
          overflow: hidden;
          background-color: #ddd;
          background-size: cover;
          background-repeat: no-repeat;
          background-position: center;
          transition: transform 0.3s ease;
          will-change: transform;
        }

        .business-photo-card:hover {
          transform: scale(1.03);
        }

        .photo-delete-btn {
          position: absolute;
          top: 10px;
          right: 10px;
          background: rgba(0,0,0,0.6);
          border: none;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: white;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .photo-delete-btn:hover {
          background: rgba(220,38,38,0.8);
        }

        .business-photo-card:hover .photo-delete-btn {
          opacity: 1;
        }

        @media (max-width: 800px) {
          .business-photo-grid {
            grid-template-columns: 1fr;
          }

          .business-photo-card {
            height: 540px;
          }

          .business-photo-card:hover {
            transform: none;
          }

          .photo-delete-btn {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

const arrowStyle: React.CSSProperties = {
  border: "1px solid var(--color-border)",
  background: "var(--color-surface)",
  borderRadius: 999,
  width: 40,
  height: 40,
  cursor: "pointer",
  fontSize: 18,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all 0.15s",
};
