"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CATEGORY_TREE } from "@/lib/categoryTree";

export default function CategoryMegaMenu() {
  const [open, setOpen] = useState(false);
  const [activeSlug, setActiveSlug] = useState<string>(
    CATEGORY_TREE[0]?.slug ?? ""
  );
  const [isMobile, setIsMobile] = useState(false);

  const triggerRef = useRef<HTMLDivElement | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [desktopMenuPosition, setDesktopMenuPosition] = useState<{
    left: number;
    top: number;
    width: number;
  }>({
    left: 12,
    top: 56,
    width: 860,
  });

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 900);
    }

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  function openMenu() {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setOpen(true);
  }

  function closeMenuSoon() {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }

    closeTimeoutRef.current = setTimeout(() => {
      setOpen(false);
    }, 120);
  }

  useLayoutEffect(() => {
    if (!open || isMobile || !triggerRef.current) return;

    function updateDesktopMenuPosition() {
      if (!triggerRef.current) return;

      const rect = triggerRef.current.getBoundingClientRect();
      const gutter = 12;
      const width = Math.min(860, window.innerWidth - gutter * 2);

      // Center under trigger when possible, but keep fully inside viewport.
      const idealLeft = rect.left + rect.width / 2 - width / 2;
      const maxLeft = window.innerWidth - width - gutter;
      const left = Math.max(gutter, Math.min(idealLeft, maxLeft));

      // No vertical gap between trigger and menu.
      const top = rect.bottom;

      setDesktopMenuPosition({
        left,
        top,
        width,
      });
    }

    updateDesktopMenuPosition();

    window.addEventListener("resize", updateDesktopMenuPosition);
    window.addEventListener("scroll", updateDesktopMenuPosition, true);

    return () => {
      window.removeEventListener("resize", updateDesktopMenuPosition);
      window.removeEventListener("scroll", updateDesktopMenuPosition, true);
    };
  }, [open, isMobile]);

  const activeGroup =
    CATEGORY_TREE.find((group) => group.slug === activeSlug) ?? CATEGORY_TREE[0];

  if (isMobile) {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            fontSize: 15,
            fontWeight: 600,
            padding: "10px 12px",
          }}
        >
          Browse Categories
        </button>

        {open && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 2000,
              background: "rgba(0,0,0,0.35)",
              display: "flex",
              justifyContent: "center",
              alignItems: "flex-start",
              padding: 12,
            }}
            onClick={() => setOpen(false)}
          >
            <div
              style={{
                width: "100%",
                maxWidth: 720,
                maxHeight: "calc(100vh - 24px)",
                marginTop: 8,
                background: "#fff",
                borderRadius: 16,
                overflow: "hidden",
                display: "grid",
                gridTemplateRows: "auto 1fr",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "16px 18px",
                  borderBottom: "1px solid #eee",
                }}
              >
                <strong style={{ fontSize: 18 }}>Browse Categories</strong>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  style={{
                    border: "1px solid #ddd",
                    background: "#fff",
                    borderRadius: 10,
                    padding: "8px 10px",
                    cursor: "pointer",
                  }}
                >
                  Close
                </button>
              </div>

              <div
                style={{
                  overflowY: "auto",
                  padding: 16,
                  display: "grid",
                  gap: 20,
                }}
              >
                {CATEGORY_TREE.map((group) => (
                  <div key={group.slug}>
                    <Link
                      href={`/search?category=${encodeURIComponent(group.slug)}`}
                      onClick={() => setOpen(false)}
                      style={{
                        display: "inline-block",
                        textDecoration: "none",
                        color: "#111",
                        fontWeight: 800,
                        marginBottom: 10,
                        fontSize: 17,
                      }}
                    >
                      {group.name}
                    </Link>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                        gap: 10,
                      }}
                    >
                      {group.children.map((subcategory) => (
                        <Link
                          key={subcategory.slug}
                          href={`/search?category=${encodeURIComponent(
                            subcategory.slug
                          )}`}
                          onClick={() => setOpen(false)}
                          style={{
                            textDecoration: "none",
                            color: "#111",
                            border: "1px solid #ddd",
                            borderRadius: 10,
                            padding: "10px 12px",
                            background: "#fff",
                          }}
                        >
                          {subcategory.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div
      ref={triggerRef}
      style={{ position: "relative" }}
      onMouseEnter={openMenu}
      onMouseLeave={closeMenuSoon}
    >
      <button
        type="button"
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
          fontSize: 15,
          fontWeight: 600,
          padding: "10px 12px",
        }}
      >
        Browse Categories
      </button>

      {open && (
        <div
          onMouseEnter={openMenu}
          onMouseLeave={closeMenuSoon}
          style={{
            position: "fixed",
            top: desktopMenuPosition.top,
            left: desktopMenuPosition.left,
            width: desktopMenuPosition.width,
            maxWidth: "calc(100vw - 24px)",
            display: "grid",
            gridTemplateColumns: "220px minmax(0, 1fr)",
            border: "1px solid #ddd",
            borderRadius: 14,
            overflow: "hidden",
            background: "#fff",
            boxShadow: "0 12px 30px rgba(0,0,0,0.12)",
            zIndex: 1000,
            minHeight: 380,
          }}
        >
          <div
            style={{
              borderRight: "1px solid #eee",
              background: "#fafafa",
              overflowY: "auto",
              maxHeight: "70vh",
            }}
          >
            {CATEGORY_TREE.map((group) => {
              const isActive = group.slug === activeSlug;

              return (
                <Link
                  key={group.slug}
                  href={`/search?category=${encodeURIComponent(group.slug)}`}
                  onMouseEnter={() => setActiveSlug(group.slug)}
                  style={{
                    display: "block",
                    padding: "14px 16px",
                    textDecoration: "none",
                    color: "#111",
                    background: isActive ? "#fff" : "transparent",
                    fontWeight: isActive ? 700 : 500,
                  }}
                >
                  {group.name}
                </Link>
              );
            })}
          </div>

          <div
            style={{
              padding: 20,
              overflowY: "auto",
              maxHeight: "70vh",
            }}
          >
            <div style={{ marginBottom: 16 }}>
              <Link
                href={`/search?category=${encodeURIComponent(activeGroup.slug)}`}
                style={{ textDecoration: "none", color: "#111" }}
              >
                <h3 style={{ marginTop: 0, marginBottom: 8 }}>
                  {activeGroup.name}
                </h3>
              </Link>
              <div style={{ color: "#666", fontSize: 14 }}>
                Browse all {activeGroup.name.toLowerCase()} businesses
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: 12,
              }}
            >
              {activeGroup.children.map((subcategory) => (
                <Link
                  key={subcategory.slug}
                  href={`/search?category=${encodeURIComponent(
                    subcategory.slug
                  )}`}
                  style={{
                    textDecoration: "none",
                    color: "#111",
                    border: "1px solid #ddd",
                    borderRadius: 10,
                    padding: "12px 14px",
                    background: "#fff",
                  }}
                >
                  {subcategory.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}