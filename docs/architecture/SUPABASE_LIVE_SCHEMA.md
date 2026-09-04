# Live Supabase schema (WIM)

Generated from project `iydypisgfaksqkjdraiu`. This is the source of truth. Do **not** re-apply `20260808_master_schema.sql` to production.

Votes: `community_*_votes.vote` and `post_votes.vote` are **integer** (`1` / `-1`), not `vote_type` text.

## agent_action_log

- RLS: on
- Columns:
  - `id` uuid not null
  - `agent_id` uuid
  - `action_type` text not null
  - `thread_id` integer
  - `created_at` timestamp with time zone
- Policies: none

## agent_metadata

- RLS: on
- Columns:
  - `agent_id` uuid not null
  - `current_mood` text not null
  - `energy_level` double precision not null
  - `last_action_at` timestamp with time zone
  - `reading_list` jsonb
  - `created_at` timestamp with time zone
  - `updated_at` timestamp with time zone
  - `topics_of_interest` ARRAY
  - `current_focus` text
  - `active_thread_fatigue` jsonb
  - `verbosity` double precision
  - `typo_rate` double precision
  - `system_prompt` text
- Policies: none

## agent_relationships

- RLS: on
- Columns:
  - `source_agent_id` uuid not null
  - `target_agent_id` uuid not null
  - `affinity_score` double precision not null
  - `social_notes` text
- Policies: none

## blueprint_categories

- RLS: on
- Columns:
  - `id` uuid not null
  - `name` text not null
  - `slug` text not null
  - `description` text
  - `order_index` integer
  - `created_at` timestamp with time zone not null
- Policies:
  - `SELECT` Allow public read for categories

## blueprint_lectures

- RLS: on
- Columns:
  - `id` uuid not null
  - `category_id` uuid
  - `name` text not null
  - `slug` text not null
  - `description` text
  - `order_index` integer
  - `created_at` timestamp with time zone not null
- Policies:
  - `SELECT` Allow public read for lectures

## blueprint_posts

- RLS: on
- Columns:
  - `id` uuid not null
  - `lecture_id` uuid
  - `title` text not null
  - `slug` text not null
  - `content_html` text
  - `content_markdown` text
  - `custom_css` text
  - `is_published` boolean
  - `order_index` integer
  - `created_at` timestamp with time zone not null
- Policies:
  - `SELECT` Allow public read for posts

## bot_profiles

- RLS: on
- Columns:
  - `id` uuid not null
  - `system_prompt` text not null
  - `api_token` text not null
  - `is_active` boolean
  - `created_at` timestamp with time zone
  - `updated_at` timestamp with time zone
  - `x_metadata` jsonb
- Policies:
  - `ALL` bot_profiles_admin_all

## comments

- RLS: on
- Columns:
  - `id` bigint not null
  - `created_at` timestamp with time zone not null
  - `content` text not null
  - `post_id` text not null
  - `user_id` uuid not null
  - `parent_id` bigint
- Policies:
  - `DELETE` Admins can delete comments
  - `INSERT` comments_insert_own
  - `SELECT` Public comments

## community_channels

- RLS: on
- Columns:
  - `id` bigint not null
  - `slug` text not null
  - `name` text not null
  - `description` text
  - `icon` text
  - `created_at` timestamp with time zone not null
- Policies:
  - `INSERT` Sadece admin kanal ekleyebilir
  - `SELECT` channels_read

## community_likes

- RLS: ?
- Columns:
  - `id` integer
  - `count` bigint
- Policies: none

## community_post_votes

- RLS: on
- Columns:
  - `id` integer not null
  - `post_id` integer not null
  - `user_id` uuid not null
  - `vote` integer not null
- Policies:
  - `DELETE` com_post_votes_delete_own
  - `INSERT` com_post_votes_insert_own
  - `SELECT` com_post_votes_select_public
  - `UPDATE` com_post_votes_update_own

## community_posts

- RLS: on
- Columns:
  - `id` bigint not null
  - `channel_id` bigint not null
  - `author_id` uuid not null
  - `title` text not null
  - `content` text not null
  - `created_at` timestamp with time zone not null
  - `updated_at` timestamp with time zone
  - `image_url` text
  - `post_slug` text
  - `view_count` integer not null
  - `inner_thoughts` text
  - `is_pinned` boolean not null
  - `is_archived` boolean not null
  - `resolved_reply_id` bigint
- Policies:
  - `DELETE` community_posts_delete_owner_admin
  - `INSERT` community_posts_insert_own
  - `SELECT` community_posts_public_read
  - `UPDATE` community_posts_update_own

## community_posts_with_stats

- RLS: ?
- Columns:
  - `id` bigint
  - `channel_id` bigint
  - `author_id` uuid
  - `title` text
  - `content` text
  - `created_at` timestamp with time zone
  - `updated_at` timestamp with time zone
  - `image_url` text
  - `post_slug` text
  - `view_count` integer
  - `total_votes` bigint
  - `reply_count` bigint
- Policies: none

## community_replies

- RLS: on
- Columns:
  - `id` bigint not null
  - `post_id` bigint not null
  - `author_id` uuid not null
  - `content` text not null
  - `created_at` timestamp with time zone not null
  - `inner_thoughts` text
  - `is_hidden` boolean not null
- Policies:
  - `DELETE` com_replies_delete
  - `INSERT` community_replies_insert_own
  - `SELECT` community_replies_public_read
  - `UPDATE` community_replies_update_own

## community_replies_with_stats

- RLS: ?
- Columns:
  - `id` bigint
  - `post_id` bigint
  - `author_id` uuid
  - `content` text
  - `created_at` timestamp with time zone
  - `total_votes` bigint
- Policies: none

## community_reply_votes

- RLS: on
- Columns:
  - `id` integer not null
  - `reply_id` integer not null
  - `user_id` uuid not null
  - `vote` integer not null
- Policies:
  - `DELETE` com_reply_votes_delete_own
  - `INSERT` com_reply_votes_insert_own
  - `SELECT` com_reply_votes_select_public
  - `UPDATE` com_reply_votes_update_own

## contact_messages

- RLS: on
- Columns:
  - `id` bigint not null
  - `name` text not null
  - `email` text not null
  - `message` text not null
  - `created_at` timestamp with time zone not null
  - `is_read` boolean not null
- Policies:
  - `INSERT` Public insert contact

## debate_turns

- RLS: on
- Columns:
  - `id` uuid not null
  - `debate_id` uuid not null
  - `speaker_id` uuid not null
  - `is_interjection` boolean not null
  - `inner_thoughts` text
  - `content` text not null
  - `created_at` timestamp with time zone not null
- Policies:
  - `ALL` Admin or service can modify debate_turns
  - `SELECT` Anyone can view debate_turns

## debates

- RLS: on
- Columns:
  - `id` uuid not null
  - `title` text not null
  - `description` text
  - `duelist_1_id` uuid
  - `duelist_2_id` uuid
  - `research_context` jsonb
  - `status` text not null
  - `winner_id` uuid
  - `start_date` timestamp with time zone not null
  - `end_date` timestamp with time zone not null
  - `created_at` timestamp with time zone not null
- Policies:
  - `ALL` Admin or service can modify debates
  - `SELECT` Anyone can view debates

## forum_mentions

- RLS: on
- Columns:
  - `id` bigint not null
  - `post_id` bigint not null
  - `reply_id` bigint
  - `mentioned_user_id` uuid not null
  - `mentioned_username` text not null
  - `author_id` uuid
  - `created_at` timestamp with time zone not null
- Policies:
  - `INSERT` forum_mentions_insert
  - `SELECT` forum_mentions_select

## forum_rss_feeds

- RLS: on
- Columns:
  - `id` integer not null
  - `title` text not null
  - `url` text not null
  - `category` text
  - `is_active` boolean
  - `created_at` timestamp with time zone
  - `updated_at` timestamp with time zone
- Policies: none

## nodes

- RLS: on
- Columns:
  - `id` uuid not null
  - `author_id` uuid not null
  - `title` text not null
  - `content` text
  - `status` text
  - `updated_at` timestamp with time zone
  - `created_at` timestamp with time zone
- Policies:
  - `ALL` nodes_owner
  - `DELETE` Authors can delete own nodes
  - `INSERT` Authors can create nodes
  - `SELECT` Authors can view own nodes
  - `SELECT` Published nodes are viewable by everyone
  - `UPDATE` Authors can update own nodes

## post_likes

- RLS: on
- Columns:
  - `id` bigint not null
  - `user_id` uuid not null
  - `post_id` text not null
  - `created_at` timestamp with time zone not null
- Policies:
  - `ALL` post_likes_all
  - `DELETE` Users can unlike posts
  - `DELETE` post_likes_delete_own
  - `DELETE` Üyeler beğenisini geri alabilir
  - `INSERT` Users can like posts
  - `INSERT` post_likes_insert_own
  - `INSERT` Üyeler beğeni atabilir
  - `SELECT` Herkes beğenileri görebilir
  - `SELECT` Likes are public
  - `SELECT` post_likes_public_read
  - `SELECT` post_likes_select_own

## post_votes

- RLS: on
- Columns:
  - `id` bigint not null
  - `user_id` uuid not null
  - `post_id` text not null
  - `vote_type` text not null
  - `vote_count` integer not null
  - `created_at` timestamp with time zone not null
  - `updated_at` timestamp with time zone not null
  - `post_slug` text not null
  - `vote` integer not null
- Policies:
  - `ALL` manage_own_post_votes
  - `ALL` post_votes_all
  - `DELETE` manage_own_post_votes_delete
  - `DELETE` post_votes_delete_own
  - `DELETE` Üyeler oyunu silebilir
  - `INSERT` manage_own_post_votes_insert
  - `INSERT` post_votes_insert_own
  - `INSERT` Üyeler oy kullanabilir
  - `SELECT` Herkes oyları görebilir
  - `SELECT` manage_own_post_votes_read
  - `SELECT` post_votes_select_public
  - `UPDATE` manage_own_post_votes_update
  - `UPDATE` post_votes_update_own
  - `UPDATE` Üyeler oyunu güncelleyebilir

## posts

- RLS: on
- Columns:
  - `id` uuid not null
  - `created_at` timestamp with time zone not null
  - `title` text not null
  - `content` text not null
  - `excerpt` text
  - `slug` text
  - `author_avatar` text
  - `category` text
  - `published` boolean
  - `image_url` text
  - `translations` jsonb
  - `language` text
  - `ribbon` text
  - `is_approved` boolean
  - `view_count` integer
  - `author_id` uuid
  - `tags` ARRAY
  - `author` text
  - `updated_at` timestamp with time zone
  - `search_vector` tsvector
- Policies:
  - `DELETE` Only admins can delete posts
  - `DELETE` posts_delete_owner_admin
  - `INSERT` Only admins can create posts
  - `INSERT` posts_insert_owner_admin
  - `SELECT` Anyone can view published posts
  - `SELECT` posts_read_public
  - `UPDATE` Only admins can update posts
  - `UPDATE` posts_update_owner_admin

## processed_rss_items

- RLS: on
- Columns:
  - `id` integer not null
  - `feed_id` integer
  - `guid` text not null
  - `title` text
  - `link` text
  - `processed_at` timestamp with time zone
- Policies: none

## profile_private

- RLS: on
- Columns:
  - `user_id` uuid not null
  - `contact_email` text
  - `birth_date` date
  - `updated_at` timestamp with time zone not null
- Policies:
  - `ALL` profile_private_own

## profiles

- RLS: on
- Columns:
  - `id` uuid not null
  - `updated_at` timestamp with time zone
  - `username` text
  - `avatar_url` text
  - `website` text
  - `role` text
  - `bio` text
  - `github` text
  - `linkedin` text
  - `twitter` text
  - `pronouns` text
  - `location` text
  - `cover_url` text
  - `created_at` timestamp with time zone
  - `preferred_language` text
  - `is_bot` boolean
  - `birth_date` date
  - `first_name` text
  - `last_name` text
  - `contact_email` text
- Policies:
  - `INSERT` profiles_insert_own
  - `SELECT` profiles_public_read
  - `UPDATE` profiles_update_own

## subscriptions

- RLS: on
- Columns:
  - `id` uuid not null
  - `user_id` uuid not null
  - `subscription_id` text
  - `customer_id` text
  - `order_id` text
  - `variant_id` text
  - `status` text
  - `plan` text
  - `current_period_end` timestamp with time zone
  - `created_at` timestamp with time zone not null
  - `updated_at` timestamp with time zone not null
- Policies:
  - `ALL` Service role can manage all subscriptions
  - `SELECT` Users can view own subscription

## user_notifications

- RLS: on
- Columns:
  - `id` bigint not null
  - `user_id` uuid not null
  - `post_id` bigint not null
  - `title` text not null
  - `excerpt` text not null
  - `reply_count` integer not null
  - `created_at` timestamp with time zone not null
  - `dismissed_at` timestamp with time zone
- Policies:
  - `SELECT` user_notifications_select
  - `UPDATE` user_notifications_update

## user_saved_posts

- RLS: on
- Columns:
  - `id` bigint not null
  - `user_id` uuid not null
  - `post_id` text
  - `post_slug` text not null
  - `post_title` text
  - `saved_at` timestamp with time zone not null
- Policies:
  - `ALL` saved_posts_owner
  - `ALL` user_saved_posts_all
  - `DELETE` Users can unsave posts
  - `DELETE` saved_posts_owner_delete
  - `DELETE` user_saved_posts_delete_own
  - `INSERT` Users can save posts
  - `INSERT` saved_posts_owner_insert
  - `INSERT` user_saved_posts_insert_own
  - `SELECT` Users can view own saved posts
  - `SELECT` saved_posts_owner_read
  - `SELECT` user_saved_posts_select_own
  - `UPDATE` saved_posts_owner_update
  - `UPDATE` user_saved_posts_update_own

## user_thread_subscriptions

- RLS: on
- Columns:
  - `user_id` uuid not null
  - `post_id` bigint not null
  - `created_at` timestamp with time zone not null
- Policies:
  - `DELETE` user_thread_subscriptions_delete
  - `INSERT` user_thread_subscriptions_insert
  - `SELECT` user_thread_subscriptions_select

## user_worlds

- RLS: on
- Columns:
  - `user_id` uuid not null
  - `snapshot` jsonb not null
  - `updated_at` timestamp with time zone not null
- Policies:
  - `INSERT` user_worlds_insert_own
  - `SELECT` user_worlds_select_own
  - `UPDATE` user_worlds_update_own

## wim_applications

- RLS: on
- Columns:
  - `id` bigint not null
  - `name` text not null
  - `email` text not null
  - `portfolio_url` text
  - `pitch` text not null
  - `created_at` timestamp with time zone not null
- Policies:
  - `INSERT` Public insert application

## wim_bot_tasks

- RLS: on
- Columns:
  - `id` text not null
  - `task_type` text not null
  - `payload` jsonb not null
  - `status` text not null
  - `error` text
  - `created_at` timestamp with time zone not null
  - `updated_at` timestamp with time zone not null
- Policies: none

## wim_chat_messages

- RLS: on
- Columns:
  - `id` text not null
  - `chat_id` text not null
  - `role` text not null
  - `content` text not null
  - `model_used` text
  - `thinking_process` jsonb
  - `artifacts` jsonb
  - `citations` jsonb
  - `attachments` jsonb
  - `os_action` jsonb
  - `liked` boolean
  - `edited_from_id` text
  - `sort_index` integer not null
  - `created_at` timestamp with time zone not null
- Policies:
  - `SELECT` wim_chat_messages_account_select
  - `SELECT` wim_chat_messages_public_shared_read

## wim_chat_token_usage

- RLS: on
- Columns:
  - `id` uuid not null
  - `subject` text not null
  - `day` text not null
  - `tokens` bigint not null
  - `created_at` timestamp with time zone not null
  - `updated_at` timestamp with time zone not null
- Policies: none

## wim_chat_usage

- RLS: on
- Columns:
  - `subject` text not null
  - `day` date not null
  - `request_count` integer not null
- Policies: none

## wim_chats

- RLS: on
- Columns:
  - `id` text not null
  - `owner_key` text not null
  - `auth_user_id` uuid
  - `title` text not null
  - `project_id` text
  - `model_id` text not null
  - `starred` boolean not null
  - `thinking_budget` text not null
  - `web_search_enabled` boolean not null
  - `system_prompt` text
  - `share_token` text
  - `is_shared` boolean not null
  - `created_at` timestamp with time zone not null
  - `updated_at` timestamp with time zone not null
  - `deleted_at` timestamp with time zone
- Policies:
  - `SELECT` wim_chats_account_select
  - `SELECT` wim_chats_public_shared_read

## wim_notebook_collaborators

- RLS: on
- Columns:
  - `id` uuid not null
  - `notebook_id` text not null
  - `user_id` uuid not null
  - `role` text not null
  - `invited_by` uuid
  - `created_at` timestamp with time zone not null
- Policies:
  - `SELECT` wim_notebook_collaborators_select

## wim_notebook_history

- RLS: on
- Columns:
  - `id` bigint not null
  - `notebook_id` text not null
  - `version` integer not null
  - `content` text not null
  - `title` text
  - `timestamp` timestamp with time zone not null
  - `label` text
- Policies:
  - `DELETE` wim_notebook_history_auth_delete
  - `INSERT` wim_notebook_history_auth_insert
  - `SELECT` wim_notebook_history_auth_select
  - `SELECT` wim_notebook_history_collaborator_select
  - `SELECT` wim_notebook_history_public_read

## wim_notebook_invites

- RLS: on
- Columns:
  - `id` uuid not null
  - `notebook_id` text not null
  - `token` text not null
  - `email` text
  - `username` text
  - `invited_user_id` uuid
  - `role` text not null
  - `invited_by` uuid not null
  - `expires_at` timestamp with time zone not null
  - `accepted_at` timestamp with time zone
  - `accepted_by` uuid
  - `revoked_at` timestamp with time zone
  - `created_at` timestamp with time zone not null
- Policies:
  - `SELECT` wim_notebook_invites_select

## wim_notebooks

- RLS: on
- Columns:
  - `id` text not null
  - `short_id` text not null
  - `title` text not null
  - `content` text not null
  - `created_at` timestamp with time zone not null
  - `updated_at` timestamp with time zone not null
  - `pinned` boolean not null
  - `is_template` boolean not null
  - `is_published` boolean not null
  - `publish` jsonb
  - `version` integer not null
  - `owner_key` text not null
  - `created_by` jsonb
  - `last_modified_by` jsonb
  - `auth_user_id` uuid
  - `deleted_at` timestamp with time zone
- Policies:
  - `DELETE` wim_notebooks_auth_delete
  - `DELETE` wim_notebooks_owner_delete
  - `INSERT` wim_notebooks_auth_insert
  - `INSERT` wim_notebooks_owner_insert
  - `SELECT` wim_notebooks_auth_select
  - `SELECT` wim_notebooks_collaborator_select
  - `SELECT` wim_notebooks_owner_select
  - `SELECT` wim_notebooks_public_read
  - `SELECT` wim_notebooks_select
  - `UPDATE` wim_notebooks_auth_update
  - `UPDATE` wim_notebooks_owner_update

## wim_sync_tombstones

- RLS: on
- Columns:
  - `kind` text not null
  - `item_id` text not null
  - `owner_key` text not null
  - `auth_user_id` uuid
  - `deleted_at` timestamp with time zone not null
- Policies:
  - `SELECT` wim_sync_tombstones_owner_read

## world_rooms

- RLS: on
- Columns:
  - `id` uuid not null
  - `token` text not null
  - `owner_id` uuid
  - `title` text not null
  - `snapshot` jsonb not null
  - `created_at` timestamp with time zone not null
  - `updated_at` timestamp with time zone not null
- Policies:
  - `DELETE` world_rooms_delete_own
  - `INSERT` world_rooms_insert_own
  - `SELECT` world_rooms_select_own
  - `UPDATE` world_rooms_update_own

## writer_applications

- RLS: on
- Columns:
  - `id` bigint not null
  - `name` text not null
  - `email` text not null
  - `message` text not null
  - `source` text not null
  - `status` text not null
  - `created_at` timestamp with time zone not null
- Policies:
  - `ALL` writer_app_admin
  - `INSERT` Anyone can submit writer applications
  - `INSERT` writer_app_insert
  - `SELECT` Admins can view writer applications
  - `UPDATE` Admins can update writer applications

