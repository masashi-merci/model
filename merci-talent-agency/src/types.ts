export interface Model {
  id: string;
  name: string;
  category: string;
  height: string;
  bust: string;
  waist: string;
  hips: string;
  shoes: string;
  hair: string;
  eyes: string;
  images: string[];
  mainImage: string;
  isGrayscale?: boolean;
  slug: string;
  active: boolean;
  instagram?: string;
  x_url?: string;
  japaneseName?: string;
  description?: string;
  tags?: string[];
  profilePdf?: string;
  created_at: string;
  updated_at?: string;
}

export interface News {
  id: string;
  title: string;
  content: string;
  date: string;
  image?: string;
  isGrayscale?: boolean;
  active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Work {
  id: string;
  title: string;
  description: string;
  date: string;
  image?: string;
  category?: string;
  active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface User {
  uid: string;
  email: string;
  role: 'admin';
}

export interface SiteSettings {
  id: string;
  hero_image: string;
  about_image: string;
  artists_image?: string;
  event_partners_image?: string;
  models_image?: string;
  address?: string;
  phone?: string;
  email?: string;
  contact_email?: string;
  instagram_url?: string;
  x_url?: string;
  updated_at: string;
}

export type Category = 'artists' | 'event-partners' | 'models' | 'women' | 'men' | 'feature-talent' | 'commercial';
