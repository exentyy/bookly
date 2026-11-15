export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";

type Relationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

type Table<Row, Insert, Update, Relations extends Relationship[] = []> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: Relations;
};

export type Database = {
  public: {
    Tables: {
      salons: Table<
        { id: string; city_id: string; slug: string; name: string; description: string; status: "draft" | "published" | "legacy_unclaimed"; created_at: string; updated_at: string },
        { id?: string; city_id: string; slug: string; name: string; description?: string; status?: "draft" | "published" | "legacy_unclaimed"; created_at?: string; updated_at?: string },
        { name?: string; description?: string; status?: "draft" | "published" }
      >;
      salon_memberships: Table<
        { salon_id: string; user_id: string; role: "owner" | "admin" | "specialist"; created_at: string },
        { salon_id: string; user_id: string; role: "owner" | "admin" | "specialist"; created_at?: string },
        never
      >;
      profiles: Table<
        { id: string; display_name: string | null; avatar_url: string | null; phone: string | null; created_at: string; updated_at: string },
        { id: string; display_name?: string | null; avatar_url?: string | null; phone?: string | null; created_at?: string; updated_at?: string },
        { display_name?: string | null; avatar_url?: string | null; phone?: string | null; updated_at?: string }
      >;
      cities: Table<
        { id: string; slug: string; name: string; timezone: string; is_active: boolean; created_at: string },
        { id?: string; slug: string; name: string; timezone?: string; is_active?: boolean; created_at?: string },
        { slug?: string; name?: string; timezone?: string; is_active?: boolean }
      >;
      specialists: Table<
        { id: string; city_id: string; salon_id: string; name: string; title: string; bio: string | null; experience_years: number; rating: number; rating_count: number; is_active: boolean; created_at: string; updated_at: string },
        { id?: string; city_id: string; salon_id: string; name: string; title: string; bio?: string | null; experience_years?: number; rating?: number; rating_count?: number; is_active?: boolean; created_at?: string; updated_at?: string },
        { name?: string; title?: string; bio?: string | null; experience_years?: number; is_active?: boolean },
        [{ foreignKeyName: "specialists_city_id_fkey"; columns: ["city_id"]; isOneToOne: false; referencedRelation: "cities"; referencedColumns: ["id"] }]
      >;
      services: Table<
        { id: string; city_id: string; salon_id: string; name: string; category: string; description: string; duration_minutes: number; price_rub: number; image_url: string | null; is_active: boolean; created_at: string; updated_at: string },
        { id?: string; city_id: string; salon_id: string; name: string; category: string; description: string; duration_minutes: number; price_rub: number; image_url?: string | null; is_active?: boolean; created_at?: string; updated_at?: string },
        { name?: string; category?: string; description?: string; duration_minutes?: number; price_rub?: number; image_url?: string | null; is_active?: boolean },
        [{ foreignKeyName: "services_city_id_fkey"; columns: ["city_id"]; isOneToOne: false; referencedRelation: "cities"; referencedColumns: ["id"] }]
      >;
      specialist_services: Table<
        { specialist_id: string; service_id: string; salon_id: string; created_at: string },
        { specialist_id: string; service_id: string; salon_id: string; created_at?: string },
        never,
        [
          { foreignKeyName: "specialist_services_specialist_id_fkey"; columns: ["specialist_id"]; isOneToOne: false; referencedRelation: "specialists"; referencedColumns: ["id"] },
          { foreignKeyName: "specialist_services_service_id_fkey"; columns: ["service_id"]; isOneToOne: false; referencedRelation: "services"; referencedColumns: ["id"] }
        ]
      >;
      bookings: Table<
        { id: string; customer_id: string; salon_id: string; city_id: string; service_id: string; specialist_id: string; starts_at: string; ends_at: string; status: BookingStatus; service_name: string; price_rub: number; duration_minutes: number; customer_note: string | null; created_at: string; updated_at: string },
        { id?: string; customer_id: string; salon_id: string; city_id: string; service_id: string; specialist_id: string; starts_at: string; ends_at: string; status?: BookingStatus; service_name: string; price_rub: number; duration_minutes: number; customer_note?: string | null; created_at?: string; updated_at?: string },
        { status?: "cancelled" },
        [
          { foreignKeyName: "bookings_customer_id_fkey"; columns: ["customer_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "bookings_city_id_fkey"; columns: ["city_id"]; isOneToOne: false; referencedRelation: "cities"; referencedColumns: ["id"] },
          { foreignKeyName: "bookings_service_id_fkey"; columns: ["service_id"]; isOneToOne: false; referencedRelation: "services"; referencedColumns: ["id"] },
          { foreignKeyName: "bookings_specialist_id_fkey"; columns: ["specialist_id"]; isOneToOne: false; referencedRelation: "specialists"; referencedColumns: ["id"] }
        ]
      >;
      specialist_availability: Table<
        { id: string; specialist_id: string; salon_id: string; starts_at: string; ends_at: string; created_at: string },
        { id?: string; specialist_id: string; salon_id: string; starts_at: string; ends_at: string; created_at?: string },
        never
      >;
    };
    Views: Record<string, never>;
    Functions: {
      bookly_create_salon: {
        Args: { p_city_id: string; p_slug: string; p_name: string; p_description?: string };
        Returns: string;
      };
      bookly_confirm_booking: {
        Args: { p_salon_id: string; p_booking_id: string };
        Returns: string;
      };
      bookly_available_slots: {
        Args: { p_service_id: string; p_specialist_id: string; p_day: string };
        Returns: { starts_at: string; ends_at: string }[];
      };
      bookly_create_booking: {
        Args: { p_service_id: string; p_specialist_id: string; p_starts_at: string };
        Returns: string;
      };
    };
    Enums: { booking_status: BookingStatus };
    CompositeTypes: Record<string, never>;
  };
};
