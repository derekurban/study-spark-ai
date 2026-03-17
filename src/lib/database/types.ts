export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
	public: {
		Tables: {
			friend_in_class: {
				Row: {
					class_id: string
					friend_id: string
				}
				Insert: {
					class_id: string
					friend_id: string
				}
				Update: {
					class_id?: string
					friend_id?: string
				}
				Relationships: [
					{
						foreignKeyName: 'friend_in_class_class_id_fkey'
						columns: ['class_id']
						referencedRelation: 'study_class'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'friend_in_class_friend_id_fkey'
						columns: ['friend_id']
						referencedRelation: 'users'
						referencedColumns: ['id']
					},
				]
			}
			friends_with: {
				Row: {
					friend_id: string
					owner_id: string
				}
				Insert: {
					friend_id: string
					owner_id: string
				}
				Update: {
					friend_id?: string
					owner_id?: string
				}
				Relationships: [
					{
						foreignKeyName: 'friends_with_friend_id_fkey'
						columns: ['friend_id']
						referencedRelation: 'profile'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'friends_with_owner_id_fkey'
						columns: ['owner_id']
						referencedRelation: 'users'
						referencedColumns: ['id']
					},
				]
			}
			invite_link: {
				Row: {
					created_at: string
					id: string
					owner_id: string
					resource_id: string
					type: string
				}
				Insert: {
					created_at?: string
					id?: string
					owner_id?: string
					resource_id: string
					type: string
				}
				Update: {
					created_at?: string
					id?: string
					owner_id?: string
					resource_id?: string
					type?: string
				}
				Relationships: [
					{
						foreignKeyName: 'invite_link_owner_id_fkey'
						columns: ['owner_id']
						referencedRelation: 'users'
						referencedColumns: ['id']
					},
				]
			}
			profile: {
				Row: {
					created_at: string
					id: string
					username: string
				}
				Insert: {
					created_at?: string
					id?: string
					username: string
				}
				Update: {
					created_at?: string
					id?: string
					username?: string
				}
				Relationships: [
					{
						foreignKeyName: 'profile_id_fkey'
						columns: ['id']
						referencedRelation: 'users'
						referencedColumns: ['id']
					},
				]
			}
			sharing_material: {
				Row: {
					from_user_id: string
					material_id: string
					to_user_id: string
				}
				Insert: {
					from_user_id?: string
					material_id: string
					to_user_id: string
				}
				Update: {
					from_user_id?: string
					material_id?: string
					to_user_id?: string
				}
				Relationships: [
					{
						foreignKeyName: 'sharing_material_from_user_id_fkey'
						columns: ['from_user_id']
						referencedRelation: 'users'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'sharing_material_material_id_fkey'
						columns: ['material_id']
						referencedRelation: 'study_material'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'sharing_material_to_user_id_fkey'
						columns: ['to_user_id']
						referencedRelation: 'users'
						referencedColumns: ['id']
					},
				]
			}
			study_chapter: {
				Row: {
					created_at: string
					id: string
					material_id: string
					owner_id: string
					page_num: number
				}
				Insert: {
					created_at?: string
					id?: string
					material_id: string
					owner_id?: string
					page_num: number
				}
				Update: {
					created_at?: string
					id?: string
					material_id?: string
					owner_id?: string
					page_num?: number
				}
				Relationships: [
					{
						foreignKeyName: 'study_chapter_material_id_fkey'
						columns: ['material_id']
						referencedRelation: 'study_material'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'study_chapter_owner_id_fkey'
						columns: ['owner_id']
						referencedRelation: 'users'
						referencedColumns: ['id']
					},
				]
			}
			study_chunk: {
				Row: {
					chapter_id: string
					chunk_order: number
					content: string
					created_at: string
					embedding: string | null
					id: string
					owner_id: string
				}
				Insert: {
					chapter_id: string
					chunk_order: number
					content: string
					created_at?: string
					embedding?: string | null
					id?: string
					owner_id?: string
				}
				Update: {
					chapter_id?: string
					chunk_order?: number
					content?: string
					created_at?: string
					embedding?: string | null
					id?: string
					owner_id?: string
				}
				Relationships: [
					{
						foreignKeyName: 'study_chunk_chapter_id_fkey'
						columns: ['chapter_id']
						referencedRelation: 'study_chapter'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'study_chunk_owner_id_fkey'
						columns: ['owner_id']
						referencedRelation: 'users'
						referencedColumns: ['id']
					},
				]
			}
			study_class: {
				Row: {
					created_at: string
					id: string
					owner_id: string
					title: string
				}
				Insert: {
					created_at?: string
					id?: string
					owner_id?: string
					title: string
				}
				Update: {
					created_at?: string
					id?: string
					owner_id?: string
					title?: string
				}
				Relationships: [
					{
						foreignKeyName: 'study_class_owner_id_fkey'
						columns: ['owner_id']
						referencedRelation: 'users'
						referencedColumns: ['id']
					},
				]
			}
			study_material: {
				Row: {
					class_id: string
					created_at: string
					file_path: string
					id: string
					owner_id: string
					public: boolean
					title: string
				}
				Insert: {
					class_id: string
					created_at?: string
					file_path: string
					id?: string
					owner_id?: string
					public?: boolean
					title: string
				}
				Update: {
					class_id?: string
					created_at?: string
					file_path?: string
					id?: string
					owner_id?: string
					public?: boolean
					title?: string
				}
				Relationships: [
					{
						foreignKeyName: 'study_material_class_id_fkey'
						columns: ['class_id']
						referencedRelation: 'study_class'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'study_material_owner_id_fkey'
						columns: ['owner_id']
						referencedRelation: 'users'
						referencedColumns: ['id']
					},
				]
			}
			study_tag: {
				Row: {
					class_id: string
					color: string
					created_at: string
					id: string
					owner_id: string
					title: string
				}
				Insert: {
					class_id: string
					color: string
					created_at?: string
					id?: string
					owner_id?: string
					title: string
				}
				Update: {
					class_id?: string
					color?: string
					created_at?: string
					id?: string
					owner_id?: string
					title?: string
				}
				Relationships: [
					{
						foreignKeyName: 'study_tag_class_id_fkey'
						columns: ['class_id']
						referencedRelation: 'study_class'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'study_tag_owner_id_fkey'
						columns: ['owner_id']
						referencedRelation: 'users'
						referencedColumns: ['id']
					},
				]
			}
		}
		Views: {
			[_ in never]: never
		}
		Functions: {
			can_select_class: {
				Args: {
					in_user_id: string
					in_class_id: string
				}
				Returns: boolean
			}
			hnswhandler: {
				Args: {
					'': unknown
				}
				Returns: unknown
			}
			ivfflathandler: {
				Args: {
					'': unknown
				}
				Returns: unknown
			}
			match_chunk: {
				Args: {
					query_embedding: string
					match_threshold: number
					match_count: number
					material_id?: string
					class_id?: string
				}
				Returns: {
					id: string
					content: string
					similarity: number
				}[]
			}
			match_chunk_kw: {
				Args: {
					query_text: string
					match_count: number
					material_id?: string
					class_id?: string
				}
				Returns: {
					id: string
					content: string
					similarity: number
				}[]
			}
			vector_avg: {
				Args: {
					'': number[]
				}
				Returns: string
			}
			vector_dims: {
				Args: {
					'': string
				}
				Returns: number
			}
			vector_norm: {
				Args: {
					'': string
				}
				Returns: number
			}
			vector_out: {
				Args: {
					'': string
				}
				Returns: unknown
			}
			vector_send: {
				Args: {
					'': string
				}
				Returns: string
			}
			vector_typmod_in: {
				Args: {
					'': unknown[]
				}
				Returns: number
			}
		}
		Enums: {
			[_ in never]: never
		}
		CompositeTypes: {
			[_ in never]: never
		}
	}
}

// Schema: public
// Tables
export type FriendInClass = Database['public']['Tables']['friend_in_class']['Row']
export type InsertFriendInClass = Database['public']['Tables']['friend_in_class']['Insert']
export type UpdateFriendInClass = Database['public']['Tables']['friend_in_class']['Update']

export type FriendsWith = Database['public']['Tables']['friends_with']['Row']
export type InsertFriendsWith = Database['public']['Tables']['friends_with']['Insert']
export type UpdateFriendsWith = Database['public']['Tables']['friends_with']['Update']

export type InviteLink = Database['public']['Tables']['invite_link']['Row']
export type InsertInviteLink = Database['public']['Tables']['invite_link']['Insert']
export type UpdateInviteLink = Database['public']['Tables']['invite_link']['Update']

export type Profile = Database['public']['Tables']['profile']['Row']
export type InsertProfile = Database['public']['Tables']['profile']['Insert']
export type UpdateProfile = Database['public']['Tables']['profile']['Update']

export type SharingMaterial = Database['public']['Tables']['sharing_material']['Row']
export type InsertSharingMaterial = Database['public']['Tables']['sharing_material']['Insert']
export type UpdateSharingMaterial = Database['public']['Tables']['sharing_material']['Update']

export type StudyChapter = Database['public']['Tables']['study_chapter']['Row']
export type InsertStudyChapter = Database['public']['Tables']['study_chapter']['Insert']
export type UpdateStudyChapter = Database['public']['Tables']['study_chapter']['Update']

export type StudyChunk = Database['public']['Tables']['study_chunk']['Row']
export type InsertStudyChunk = Database['public']['Tables']['study_chunk']['Insert']
export type UpdateStudyChunk = Database['public']['Tables']['study_chunk']['Update']

export type StudyClass = Database['public']['Tables']['study_class']['Row']
export type InsertStudyClass = Database['public']['Tables']['study_class']['Insert']
export type UpdateStudyClass = Database['public']['Tables']['study_class']['Update']

export type StudyMaterial = Database['public']['Tables']['study_material']['Row']
export type InsertStudyMaterial = Database['public']['Tables']['study_material']['Insert']
export type UpdateStudyMaterial = Database['public']['Tables']['study_material']['Update']

export type StudyTag = Database['public']['Tables']['study_tag']['Row']
export type InsertStudyTag = Database['public']['Tables']['study_tag']['Insert']
export type UpdateStudyTag = Database['public']['Tables']['study_tag']['Update']

// Functions
export type ArgsCanSelectClass = Database['public']['Functions']['can_select_class']['Args']
export type ReturnTypeCanSelectClass =
	Database['public']['Functions']['can_select_class']['Returns']

export type ArgsHnswhandler = Database['public']['Functions']['hnswhandler']['Args']
export type ReturnTypeHnswhandler = Database['public']['Functions']['hnswhandler']['Returns']

export type ArgsIvfflathandler = Database['public']['Functions']['ivfflathandler']['Args']
export type ReturnTypeIvfflathandler = Database['public']['Functions']['ivfflathandler']['Returns']

export type ArgsMatchChunk = Database['public']['Functions']['match_chunk']['Args']
export type ReturnTypeMatchChunk = Database['public']['Functions']['match_chunk']['Returns']

export type ArgsMatchChunkKw = Database['public']['Functions']['match_chunk_kw']['Args']
export type ReturnTypeMatchChunkKw = Database['public']['Functions']['match_chunk_kw']['Returns']

export type ArgsVectorAvg = Database['public']['Functions']['vector_avg']['Args']
export type ReturnTypeVectorAvg = Database['public']['Functions']['vector_avg']['Returns']

export type ArgsVectorDims = Database['public']['Functions']['vector_dims']['Args']
export type ReturnTypeVectorDims = Database['public']['Functions']['vector_dims']['Returns']

export type ArgsVectorNorm = Database['public']['Functions']['vector_norm']['Args']
export type ReturnTypeVectorNorm = Database['public']['Functions']['vector_norm']['Returns']

export type ArgsVectorOut = Database['public']['Functions']['vector_out']['Args']
export type ReturnTypeVectorOut = Database['public']['Functions']['vector_out']['Returns']

export type ArgsVectorSend = Database['public']['Functions']['vector_send']['Args']
export type ReturnTypeVectorSend = Database['public']['Functions']['vector_send']['Returns']

export type ArgsVectorTypmodIn = Database['public']['Functions']['vector_typmod_in']['Args']
export type ReturnTypeVectorTypmodIn =
	Database['public']['Functions']['vector_typmod_in']['Returns']
