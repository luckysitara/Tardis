export interface Community {
  id: string;
  name: string;
  description: string;
  banner_url: string;
  avatar_url: string;
  memberCount: number;
  member_count?: number; // legacy/server compatibility
  is_gated: boolean;
  is_member: boolean;
  is_public: boolean;
}
