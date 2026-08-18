// Central icon system — replaces the emoji that used to stand in for icons.
// One source of truth so category and review-tag glyphs stay consistent
// everywhere they appear (nav, cards, review form, business page, leaderboard).
import {
  UtensilsCrossed,
  ShoppingBag,
  Sparkles,
  House,
  Briefcase,
  Drama,
  Folder,
  Handshake,
  Gem,
  Wallet,
  Smile,
  Brain,
  Zap,
  BadgeCheck,
  Award,
  type LucideIcon,
} from "lucide-react";

/** Top-level category groups (match CATEGORY_TREE slugs). */
const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  "food-drink": UtensilsCrossed,
  "shopping": ShoppingBag,
  "health-beauty": Sparkles,
  "home-auto": House,
  "professional-services": Briefcase,
  "entertainment-recreation": Drama,
};

/** Review + staff-quality tag keys. */
const TAG_ICON_MAP: Record<string, LucideIcon> = {
  // service-quality tags
  service: Handshake,
  quality: Gem,
  cleanliness: Sparkles,
  value: Wallet,
  experience: Smile,
  // staff qualities
  friendly: Smile,
  knowledgeable: Brain,
  efficient: Zap,
  professional: BadgeCheck,
  "went-above-and-beyond": Award,
};

export function CategoryIcon({
  slug,
  size = 16,
  className,
  strokeWidth = 2,
}: {
  slug: string;
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  const Icon = CATEGORY_ICON_MAP[slug] ?? Folder;
  return <Icon size={size} className={className} strokeWidth={strokeWidth} aria-hidden />;
}

export function TagIcon({
  tagKey,
  size = 16,
  className,
  strokeWidth = 2,
}: {
  tagKey: string;
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  const Icon = TAG_ICON_MAP[tagKey] ?? Sparkles;
  return <Icon size={size} className={className} strokeWidth={strokeWidth} aria-hidden />;
}
