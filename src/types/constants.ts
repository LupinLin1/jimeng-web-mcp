// Model mapping constants
export const MODEL_MAP: Record<string, string> = {
  'jimeng-4.0': 'high_aes_general_v40',
  'jimeng-3.1': 'high_aes_general_v30l_art_fangzhou:general_v3.0_18b',
  'jimeng-3.0': 'high_aes_general_v30l:general_v3.0_18b',
  'jimeng-2.1': 'high_aes_general_v21_L:general_v2.1_L',
  'jimeng-2.0-pro': 'high_aes_general_v20_L:general_v2.0_L',
  'jimeng-2.0': 'high_aes_general_v20:general_v2.0',
  'jimeng-1.4': 'high_aes_general_v14:general_v1.4',
  'jimeng-xl-pro': 'text2img_xl_sft',
  'jimeng-video-3.0-pro': 'dreamina_ic_generate_video_model_vgfm_3.0_pro',
  'jimeng-video-3.0': 'dreamina_ic_generate_video_model_vgfm_3.0',
  'jimeng-video-2.0': 'dreamina_ic_generate_video_model_vgfm_lite',
  'jimeng-video-2.0-pro': 'dreamina_ic_generate_video_model_vgfm1.0',
  'jimeng-video-multiframe': 'dreamina_ic_generate_video_model_vgfm_3.0'
};

// Default configuration
export const DEFAULT_CONFIG = {
  MODEL: 'jimeng-4.0' as const,
  VIDEO_MODEL: 'jimeng-video-3.0' as const,
  BLEND_MODEL: 'jimeng-3.0' as const,
  DRAFT_VERSION: '3.2.9' as const,
  REQUEST_TIMEOUT: 60000,
  MAX_POLL_COUNT: 20,
  INITIAL_WAIT_TIME: 20000,
  SUBSEQUENT_WAIT_TIME: 5000
};

// API endpoints
export const API_ENDPOINTS = {
  CREDIT: '/commerce/v1/benefits/user_credit',
  RECEIVE_CREDIT: '/commerce/v1/benefits/credit_receive',
  GENERATE_IMAGE: '/mweb/v1/aigc_draft/generate',
  GENERATE_VIDEO: '/mweb/v1/aigc_draft/generate',
  GET_HISTORY: '/mweb/v1/get_history_by_ids',
  UPLOAD_AUTH: '/mweb/v1/get_upload_token',
  UPLOAD_FILE: '/mweb/v1/upload/file',
  UPLOAD_COMMIT: '/mweb/v1/upload/commit',
  FRAME_INTERPOLATION: '/mweb/v1/video/frame_interpolation',
  SUPER_RESOLUTION: '/mweb/v1/video/super_resolution'
} as const;