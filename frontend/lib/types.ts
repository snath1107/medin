// These mirror the response shapes in backend/app/schemas.py.

/** A rich-text document produced by the TipTap editor. */
export type RichText = { type: "doc"; content?: unknown[] };

export type Visibility = "public" | "connections" | "private";

export interface UserBrief {
  id: number;
  name: string;
  avatar_url: string | null;
  specialization: string;
  hospital: string | null;
}

export interface UserCard extends UserBrief {
  city: string | null;
  experience_years: number;
  is_following: boolean;
}

export interface Me {
  id: number;
  email: string;
  name: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  headline: string | null;
  specialization: string;
  experience_years: number;
  hospital: string | null;
  city: string | null;
  state: string | null;
  doctor_id: string | null;
  about: string | null;
}

export interface Experience {
  id: number;
  position: string;
  organization: string;
  start_date: string;
  end_date: string | null;
  is_current: boolean;
  description: string | null;
}

export interface Education {
  id: number;
  degree: string;
  institution: string;
  start_year: number;
  end_year: number | null;
}

export interface Publication {
  id: number;
  title: string;
  journal: string | null;
  year: number | null;
  url: string | null;
  doi: string | null;
}

export interface Profile extends Omit<UserCard, "is_following"> {
  first_name: string;
  last_name: string;
  headline: string | null;
  state: string | null;
  about: string | null;
  is_me: boolean;
  is_following: boolean;
  /** `drafts` is only sent for your own profile. */
  stats: { posts: number; followers: number; following: number; drafts: number | null };
  experiences: Experience[];
  educations: Education[];
  publications: Publication[];
}

export interface Post {
  id: number;
  title: string;
  content: RichText;
  preview_text: string | null;
  first_image: string | null;
  tags: string[];
  visibility: Visibility;
  is_anonymous: boolean;
  created_at: string;
  /** null for anonymous posts */
  author: UserBrief | null;
  is_mine: boolean;
  is_following_author: boolean;
  like_count: number;
  comment_count: number;
  repost_count: number;
  is_liked: boolean;
  is_reposted: boolean;
}

export interface PostInput {
  title: string;
  content: RichText;
  tags: string[];
  visibility: Visibility;
  is_anonymous: boolean;
}

export interface Comment {
  id: number;
  post_id: number;
  content: RichText;
  created_at: string;
  author: UserBrief;
  is_mine: boolean;
}

/** One page of a cursor-paginated list. */
export interface Page<T> {
  items: T[];
  /** Send back as `before_id` for the next page; null means no more pages. */
  next_cursor: number | null;
}

export interface Suggestions {
  same_hospital: UserCard[];
  same_specialization: UserCard[];
}

export interface SearchResults {
  query: string;
  users: UserCard[];
  posts: Post[];
}

export interface EngagementPrompt {
  id: number;
  title: string;
  body: string;
  suggested_tags: string[];
}

export interface InviteStatus {
  valid: boolean;
  inviter: UserBrief | null;
  expires_at: string | null;
}

export interface Invite {
  id: number;
  created_at: string;
  expires_at: string;
  used_at: string | null;
  used_by: UserBrief | null;
}
