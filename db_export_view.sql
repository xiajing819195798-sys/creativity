-- 在 CloudBase PostgreSQL 的 SQL 编辑器中执行一次。
-- 该视图不会复制或删除数据，只把 payload JSON 展开为便于导出的独立列。
CREATE OR REPLACE VIEW public.creativity_submissions_export AS
SELECT
  student_id,
  grade,
  class_code,
  started_at,
  submitted_at,
  total_seconds,
  payload ->> 'condition' AS condition,
  payload ->> 'completed_tasks' AS completed_tasks,

  payload ->> 'anchor_illustration_titles_response' AS q1_illustration_titles,
  payload ->> 'anchor_illustration_titles_seconds' AS q1_seconds,
  payload ->> 'anchor_illustration_titles_fluency_unique' AS q1_fluency_unique,

  payload ->> 'anchor_2983_response' AS q2_2983_story,
  payload ->> 'anchor_2983_seconds' AS q2_seconds,

  payload ->> 'anchor_library_improve_response' AS q3_accessible_library,
  payload ->> 'anchor_library_improve_seconds' AS q3_seconds,

  payload ->> 'aut_cup_response' AS q4_cup_uses,
  payload ->> 'aut_cup_seconds' AS q4_seconds,
  payload ->> 'aut_cup_fluency_unique' AS q4_fluency_unique,

  payload ->> 'human_ai_bunny_initial_ideas' AS q5_initial_ideas,
  payload ->> 'human_ai_bunny_selected_idea' AS q5_selected_idea,
  payload ->> 'human_ai_bunny_condition' AS q5_condition,
  payload ->> 'human_ai_bunny_reflection_weakness' AS q5_reflection_weakness,
  payload ->> 'human_ai_bunny_reflection_improvement' AS q5_reflection_improvement,
  payload ->> 'human_ai_bunny_chat_json' AS q5_ai_chat,
  payload ->> 'human_ai_bunny_ai_error' AS q5_ai_error,
  payload ->> 'human_ai_bunny_response' AS q5_final_answer,
  payload ->> 'human_ai_bunny_seconds' AS q5_seconds,

  payload ->> 'ai_message_count' AS ai_message_count,
  payload ->> 'ai_user_message_count' AS ai_user_message_count,
  payload ->> 'answers_json' AS all_answers_json,
  payload ->> 'task_started_json' AS task_started_json,
  payload ->> 'task_seconds_json' AS task_seconds_json,
  payload ->> 'instrument_version' AS instrument_version,
  payload ->> 'client_submitted_at' AS client_submitted_at,
  payload ->> 'user_agent' AS user_agent,
  payload AS raw_payload
FROM public.creativity_submissions;

COMMENT ON VIEW public.creativity_submissions_export IS
  '创造性思维测评平铺导出视图：五题答案、过程用时、随机条件与完整AI对话';
