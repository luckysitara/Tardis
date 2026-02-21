export interface Community {
  id: string;
  name: string;
  description: string;
  banner_image_url: string;
  profile_image_url: string;
  member_count: number;
  is_gated: boolean;
  is_member: boolean;
}
