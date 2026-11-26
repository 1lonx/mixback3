export type Role = 'owner' | 'artist';

export type ProjectStatus = 'active' | 'approved' | 'archived';

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Project {
  id: string;
  title: string;
  artist: string;
  description: string;
  status: ProjectStatus;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectSummary extends Project {
  role: Role;
  versionsCount: number;
  openComments: number;
}

export interface Member {
  userId: string;
  name: string;
  email: string;
  role: Role;
}

export interface Version {
  id: string;
  projectId: string;
  number: number;
  note: string;
  fileUrl: string;
  durationSec: number;
  peaks: number[] | null;
  lufs: number;
  peakDb: number;
  createdAt: string;
}

export interface ProjectDetail {
  project: Project;
  role: Role;
  members: Member[];
  versions: Version[];
}

export interface Comment {
  id: string;
  versionId: string;
  authorId: string;
  authorName: string;
  timeSec: number;
  text: string;
  resolved: boolean;
  createdAt: string;
}

export type ChecklistCategory = 'low' | 'vocal' | 'highs' | 'space' | 'dynamics' | 'other';

export interface ChecklistItem {
  id: string;
  category: ChecklistCategory;
  text: string;
  commentIds: string[];
  timeSec: number;
  done: boolean;
}

export interface Checklist {
  versionId: string;
  generatedAt: string;
  items: ChecklistItem[];
}

export interface Session {
  user: User;
  token: string;
}

export type SortKey = 'updated' | 'title' | 'comments';

export interface ProjectsQuery {
  q: string;
  status: ProjectStatus | 'all';
  sort: SortKey;
}

export interface ProfileStats {
  projectsOwned: number;
  projectsShared: number;
  versions: number;
  comments: number;
  resolved: number;
}

export interface Profile {
  user: User;
  createdAt: string;
  stats: ProfileStats;
  session: { createdAt: string; expiresAt: string };
}

export type ServiceKind = 'mixing' | 'mastering' | 'vocal' | 'editing';

export const SERVICE_KINDS: readonly ServiceKind[] = ['mixing', 'mastering', 'vocal', 'editing'];

export const GENRES = [
  'Поп',
  'Рок',
  'Хип-хоп',
  'Электроника',
  'Метал',
  'Инди',
  'Джаз',
  'Фолк',
] as const;
export type Genre = (typeof GENRES)[number];

export interface Service {
  id: string;
  kind: ServiceKind;
  title: string;
  description: string;
  priceRub: number;
  days: number;
}

export interface PortfolioTrack {
  id: string;
  engineerId: string;
  title: string;
  genre: Genre;
  description: string;
  fileUrl: string;
  durationSec: number;
  peaks: number[] | null;
  createdAt: string;
}

export interface EngineerProfile {
  userId: string;
  headline: string;
  bio: string;
  genres: Genre[];
  services: Service[];
  published: boolean;
  coverUrl?: string | null;
  updatedAt: string;
}

export interface Review {
  id: string;
  engineerId: string;
  orderId: string;
  authorId: string;
  authorName: string;
  rating: number;
  text: string;
  createdAt: string;
}

export interface EngineerSummary {
  userId: string;
  name: string;
  headline: string;
  genres: Genre[];
  kinds: ServiceKind[];
  minPrice: number | null;
  rating: number | null;
  reviewsCount: number;
  completedOrders: number;
  coverUrl: string | null;
}

export interface EngineerDetail extends EngineerSummary {
  bio: string;
  services: Service[];
  portfolio: PortfolioTrack[];
  reviews: Review[];
  published: boolean;
  isMe: boolean;
}

export interface MyEngineer {
  profile: EngineerProfile;
  portfolio: PortfolioTrack[];
}

export type EngineerSort = 'rating' | 'price' | 'orders';

export interface EngineersQuery {
  q: string;
  kind: ServiceKind | 'all';
  genre: Genre | 'all';
  maxPrice: number | null;
  sort: EngineerSort;
}

export type OrderStatus =
  'pending' | 'in_progress' | 'delivered' | 'completed' | 'declined' | 'cancelled';

export type OrderAction = 'accept' | 'decline' | 'cancel' | 'deliver' | 'revise' | 'complete';

export type OrderSide = 'client' | 'engineer';

export interface Order {
  id: string;
  engineerId: string;
  clientId: string;
  serviceId: string;
  serviceTitle: string;
  serviceKind: ServiceKind;
  priceRub: number;
  days: number;
  brief: string;
  status: OrderStatus;
  projectId: string | null;
  reviewed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrderView extends Order {
  engineerName: string;
  clientName: string;
  side: OrderSide;
}

export interface OrderDetail extends OrderView {
  review: Review | null;
}

export interface OrdersQuery {
  side: OrderSide;
  status: OrderStatus | 'all';
}

export interface Message {
  id: string;
  orderId: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string;
}
