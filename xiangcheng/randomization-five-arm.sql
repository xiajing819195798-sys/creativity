-- 五组分配表只保存随机令牌和组别，不保存学号或作答。
-- 以当前相城施测设置版本为批次，每五次开始分配中五组各一次。
BEGIN;
CREATE TABLE public.creativity_xc_five_arm_assignments_20261110 (
  config_version text NOT NULL,
  client_token uuid NOT NULL,
  block_number bigint NOT NULL CHECK (block_number >= 0),
  block_slot smallint NOT NULL CHECK (block_slot BETWEEN 0 AND 4),
  group_code text NOT NULL CHECK (group_code IN ('control','early_socratic','early_feedback','late_socratic','late_feedback')),
  allocated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (config_version, client_token),
  UNIQUE (config_version, block_number, block_slot),
  UNIQUE (config_version, block_number, group_code)
);
ALTER TABLE public.creativity_xc_five_arm_assignments_20261110 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.creativity_xc_five_arm_assignments_20261110 FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.creativity_xc_allocate_five_arm_20261110(p_config_version text, p_client_token uuid, p_grade integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  prior public.creativity_xc_five_arm_assignments_20261110%ROWTYPE;
  number_assigned bigint;
  next_block bigint;
  next_slot smallint;
  chosen text;
BEGIN
  IF p_client_token IS NULL OR p_grade IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.creativity_config_xiangcheng_202611 c
    WHERE c.config_key = 'xiangcheng_202611' AND c.is_open
      AND c.version = p_config_version AND p_grade = ANY(c.allowed_grades)
  ) THEN
    RAISE EXCEPTION '测评未开放或设置已变更';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('xiangcheng-five-arm:' || p_config_version, 0));
  SELECT * INTO prior FROM public.creativity_xc_five_arm_assignments_20261110
    WHERE config_version = p_config_version AND client_token = p_client_token;
  IF FOUND THEN
    RETURN pg_catalog.jsonb_build_object('group_code',prior.group_code,'block_number',prior.block_number,'block_slot',prior.block_slot,'allocated_at',prior.allocated_at);
  END IF;
  SELECT pg_catalog.count(*) INTO number_assigned FROM public.creativity_xc_five_arm_assignments_20261110
    WHERE config_version = p_config_version;
  next_block := number_assigned / 5;
  next_slot := (number_assigned % 5)::smallint;
  SELECT candidate INTO chosen
  FROM pg_catalog.unnest(ARRAY['control','early_socratic','early_feedback','late_socratic','late_feedback']::text[]) AS candidate
  WHERE NOT EXISTS (
    SELECT 1 FROM public.creativity_xc_five_arm_assignments_20261110 a
    WHERE a.config_version = p_config_version AND a.block_number = next_block AND a.group_code = candidate
  )
  ORDER BY pg_catalog.random() LIMIT 1;
  INSERT INTO public.creativity_xc_five_arm_assignments_20261110
    (config_version,client_token,block_number,block_slot,group_code)
  VALUES (p_config_version,p_client_token,next_block,next_slot,chosen)
  RETURNING * INTO prior;
  RETURN pg_catalog.jsonb_build_object('group_code',prior.group_code,'block_number',prior.block_number,'block_slot',prior.block_slot,'allocated_at',prior.allocated_at);
END;
$$;
REVOKE ALL ON FUNCTION public.creativity_xc_allocate_five_arm_20261110(text,uuid,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.creativity_xc_allocate_five_arm_20261110(text,uuid,integer) TO anon, authenticated;
COMMIT;
