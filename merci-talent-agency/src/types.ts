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
  model_main_image?: string;
  model_images?: string[];
  isGrayscale?: boolean;
  slug: string;
  active: boolean;
  instagram?: string;
  x_url?: string;
  japaneseName?: string;
  description?: string;
  tags?: string[];
  profilePdf?: string;
  sort_order?: number;
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
  about_text?: string;
  service_model_casting_text?: string;
  service_event_staffing_text?: string;
  service_production_text?: string;
  artists_image?: string;
  event_partners_image?: string;
  models_image?: string;
  animals_image?: string;
  address?: string;
  phone?: string;
  email?: string;
  contact_email?: string;
  instagram_url?: string;
  x_url?: string;
  updated_at: string;
}

export type OrderStatus = 'pending' | 'assigned' | 'completed' | 'cancelled';

export interface Order {
  id: string;
  company_name: string;
  contact_person: string;
  email: string;
  deadline?: string;
  project_name?: string;
  location_postal_code?: string;
  location_prefecture?: string;
  location_city?: string;
  location_address_detail?: string;
  rehearsal?: string;
  rehearsal_date?: string;
  rehearsal_start_time?: string;
  rehearsal_end_time?: string;
  rehearsal_location?: string;
  main_event_date?: string;
  main_event_start_time?: string;
  main_event_end_time?: string;
  hiring_count?: string;
  job_description?: string;
  conditions?: string[];
  costume_provided?: string;
  costume_image_url?: string;
  selection_method?: string;
  hourly_daily_rate?: string;
  transportation?: string;
  meal_allowance?: string;
  status: OrderStatus;
  created_at: string;
}

export type Category = 'artists' | 'event-partners' | 'models' | 'animals' | 'women' | 'men' | 'feature-talent' | 'commercial';
