// src/server.ts
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// src/api.ts
import axios from "axios";
import * as crypto from "crypto";
import path from "path";
import fs from "fs";
import crc32 from "crc32";

// src/utils/a_bogus.ts
function rc4_encrypt(plaintext, key) {
  const s = [];
  for (let i2 = 0; i2 < 256; i2++) {
    s[i2] = i2;
  }
  let j = 0;
  for (let i2 = 0; i2 < 256; i2++) {
    j = (j + s[i2] + key.charCodeAt(i2 % key.length)) % 256;
    [s[i2], s[j]] = [s[j], s[i2]];
  }
  let i = 0;
  j = 0;
  const cipher = [];
  for (let k = 0; k < plaintext.length; k++) {
    i = (i + 1) % 256;
    j = (j + s[i]) % 256;
    [s[i], s[j]] = [s[j], s[i]];
    const t = (s[i] + s[j]) % 256;
    cipher.push(String.fromCharCode(s[t] ^ plaintext.charCodeAt(k)));
  }
  return cipher.join("");
}
function le(e, r) {
  r %= 32;
  return (e << r | e >>> 32 - r) >>> 0;
}
function de(e) {
  if (0 <= e && e < 16) return 2043430169;
  if (16 <= e && e < 64) return 2055708042;
  console.error("invalid j for constant Tj");
  return void 0;
}
function pe(e, r, t, n) {
  if (0 <= e && e < 16) return (r ^ t ^ n) >>> 0;
  if (16 <= e && e < 64) return (r & t | r & n | t & n) >>> 0;
  console.error("invalid j for bool function FF");
  return 0;
}
function he(e, r, t, n) {
  if (0 <= e && e < 16) return (r ^ t ^ n) >>> 0;
  if (16 <= e && e < 64) return (r & t | ~r & n) >>> 0;
  console.error("invalid j for bool function GG");
  return 0;
}
function reset() {
  this.reg[0] = 1937774191;
  this.reg[1] = 1226093241;
  this.reg[2] = 388252375;
  this.reg[3] = 3666478592;
  this.reg[4] = 2842636476;
  this.reg[5] = 372324522;
  this.reg[6] = 3817729613;
  this.reg[7] = 2969243214;
  this.chunk = [];
  this.size = 0;
}
function write(e) {
  const a = typeof e === "string" ? (() => {
    let n = encodeURIComponent(e).replace(/%([0-9A-F]{2})/g, (_, r) => String.fromCharCode(parseInt(r, 16)));
    const arr = new Array(n.length);
    Array.prototype.forEach.call(n, (ch, idx) => {
      arr[idx] = ch.charCodeAt(0);
    });
    return arr;
  })() : e;
  this.size += a.length;
  let f = 64 - this.chunk.length;
  if (a.length < f) {
    this.chunk = this.chunk.concat(a);
  } else {
    this.chunk = this.chunk.concat(a.slice(0, f));
    while (this.chunk.length >= 64) {
      this._compress(this.chunk);
      if (f < a.length) {
        this.chunk = a.slice(f, Math.min(f + 64, a.length));
      } else {
        this.chunk = [];
      }
      f += 64;
    }
  }
}
function se(str, len, pad) {
  return pad.repeat(len - str.length) + str;
}
function sum(e, t) {
  if (e) {
    this.reset();
    this.write(e);
  }
  this._fill();
  for (let f = 0; f < this.chunk.length; f += 64) {
    this._compress(this.chunk.slice(f, f + 64));
  }
  let i = null;
  if (t === "hex") {
    i = "";
    for (let f = 0; f < 8; f++) {
      i += se(this.reg[f].toString(16), 8, "0");
    }
  } else {
    i = new Array(32);
    for (let f = 0; f < 8; f++) {
      let c = this.reg[f];
      i[4 * f + 3] = (255 & c) >>> 0;
      c >>>= 8;
      i[4 * f + 2] = (255 & c) >>> 0;
      c >>>= 8;
      i[4 * f + 1] = (255 & c) >>> 0;
      c >>>= 8;
      i[4 * f] = (255 & c) >>> 0;
    }
  }
  this.reset();
  return i;
}
function _compress(t) {
  if (t.length < 64) {
    console.error("compress error: not enough data");
  } else {
    const f = (() => {
      const r = new Array(132);
      for (let idx = 0; idx < 16; idx++) {
        r[idx] = idx * 4 < t.length ? t[idx * 4] << 24 : 0;
        r[idx] |= idx * 4 + 1 < t.length ? t[idx * 4 + 1] << 16 : 0;
        r[idx] |= idx * 4 + 2 < t.length ? t[idx * 4 + 2] << 8 : 0;
        r[idx] |= idx * 4 + 3 < t.length ? t[idx * 4 + 3] : 0;
        r[idx] >>>= 0;
      }
      for (let n = 16; n < 68; n++) {
        let a = r[n - 16] ^ r[n - 9] ^ le(r[n - 3], 15);
        a = a ^ le(a, 15) ^ le(a, 23);
        r[n] = (a ^ le(r[n - 13], 7) ^ r[n - 6]) >>> 0;
      }
      for (let n = 0; n < 64; n++) {
        r[n + 68] = (r[n] ^ r[n + 4]) >>> 0;
      }
      return r;
    })();
    const i = this.reg.slice(0);
    for (let c = 0; c < 64; c++) {
      let o = le(i[0], 12) + i[4] + le(de(c), c);
      let s = ((o = le((4294967295 & o) >>> 0, 7)) ^ le(i[0], 12)) >>> 0;
      let u = pe(c, i[0], i[1], i[2]);
      u = (4294967295 & u + i[3] + s + f[c + 68]) >>> 0;
      let b = he(c, i[4], i[5], i[6]);
      b = (4294967295 & b + i[7] + o + f[c]) >>> 0;
      i[3] = i[2];
      i[2] = le(i[1], 9);
      i[1] = i[0];
      i[0] = u;
      i[7] = i[6];
      i[6] = le(i[5], 19);
      i[5] = i[4];
      i[4] = (b ^ le(b, 9) ^ le(b, 17)) >>> 0;
    }
    for (let l = 0; l < 8; l++) {
      this.reg[l] = (this.reg[l] ^ i[l]) >>> 0;
    }
  }
}
function _fill() {
  const a = 8 * this.size;
  let f = this.chunk.push(128) % 64;
  if (64 - f < 8) f -= 64;
  while (f < 56) {
    this.chunk.push(0);
    f++;
  }
  for (let i = 0; i < 4; i++) {
    const c = Math.floor(a / 4294967296);
    this.chunk.push(c >>> 8 * (3 - i) & 255);
  }
  for (let i = 0; i < 4; i++) {
    this.chunk.push(a >>> 8 * (3 - i) & 255);
  }
}
var SM3 = class {
  constructor() {
    this.reset = reset;
    this.write = write;
    this.sum = sum;
    this._compress = _compress;
    this._fill = _fill;
    this.reg = [];
    this.chunk = [];
    this.size = 0;
    this.reset();
  }
};
var s_obj = {
  s0: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
  s1: "Dkdpgh4ZKsQB80/Mfvw36XI1R25+WUAlEi7NLboqYTOPuzmFjJnryx9HVGcaStCe=",
  s2: "Dkdpgh4ZKsQB80/Mfvw36XI1R25-WUAlEi7NLboqYTOPuzmFjJnryx9HVGcaStCe=",
  s3: "ckdp1h4ZKsUB80/Mfvw36XIgR25+WQAlEi7NLboqYTOPuzmFjJnryx9HVGDaStCe",
  s4: "Dkdpgh2ZmsQB80/MfvV36XI1R45-WUAlEixNLwoqYTOPuzKFjJnry79HbGcaStCe"
};
function result_encrypt(long_str, num = null) {
  const constant = {
    "0": 16515072,
    "1": 258048,
    "2": 4032,
    "str": num ? s_obj[num] : s_obj["s0"]
  };
  let result = "";
  let lound = 0;
  let long_int = get_long_int(lound, long_str);
  for (let i = 0; i < Math.floor(long_str.length / 3 * 4); i++) {
    if (Math.floor(i / 4) !== lound) {
      lound += 1;
      long_int = get_long_int(lound, long_str);
    }
    let key = i % 4;
    let temp_int;
    switch (key) {
      case 0:
        temp_int = (long_int & constant["0"]) >> 18;
        result += constant["str"].charAt(temp_int);
        break;
      case 1:
        temp_int = (long_int & constant["1"]) >> 12;
        result += constant["str"].charAt(temp_int);
        break;
      case 2:
        temp_int = (long_int & constant["2"]) >> 6;
        result += constant["str"].charAt(temp_int);
        break;
      case 3:
        temp_int = long_int & 63;
        result += constant["str"].charAt(temp_int);
        break;
      default:
        break;
    }
  }
  return result;
}
function get_long_int(round, long_str) {
  round = round * 3;
  return long_str.charCodeAt(round) << 16 | long_str.charCodeAt(round + 1) << 8 | long_str.charCodeAt(round + 2);
}
function gener_random(random, option) {
  return [
    random & 255 & 170 | option[0] & 85,
    // 163
    random & 255 & 85 | option[0] & 170,
    //87
    random >> 8 & 255 & 170 | option[1] & 85,
    //37
    random >> 8 & 255 & 85 | option[1] & 170
    //41
  ];
}
function generate_rc4_bb_str(url_search_params, user_agent, window_env_str, suffix = "cus", Arguments = [0, 1, 14]) {
  const sm3 = new SM3();
  const start_time = Date.now();
  const url_search_params_list = sm3.sum(sm3.sum(url_search_params + suffix));
  const cus = sm3.sum(sm3.sum(suffix));
  const ua = sm3.sum(result_encrypt(rc4_encrypt(user_agent, String.fromCharCode(390625e-8, 1, 14)), "s3"));
  const end_time = Date.now();
  const b = {
    8: 3,
    10: end_time,
    15: {
      "aid": 6383,
      "pageId": 6241,
      "boe": false,
      "ddrt": 7,
      "paths": {
        "include": [{}, {}, {}, {}, {}, {}, {}],
        "exclude": []
      },
      "track": {
        "mode": 0,
        "delay": 300,
        "paths": []
      },
      "dump": true,
      "rpU": ""
    },
    16: start_time,
    18: 44,
    19: [1, 0, 1, 5]
  };
  b[20] = b[16] >> 24 & 255;
  b[21] = b[16] >> 16 & 255;
  b[22] = b[16] >> 8 & 255;
  b[23] = b[16] & 255;
  b[24] = b[16] / 256 / 256 / 256 / 256 >> 0;
  b[25] = b[16] / 256 / 256 / 256 / 256 / 256 >> 0;
  b[26] = Arguments[0] >> 24 & 255;
  b[27] = Arguments[0] >> 16 & 255;
  b[28] = Arguments[0] >> 8 & 255;
  b[29] = Arguments[0] & 255;
  b[30] = Arguments[1] / 256 & 255;
  b[31] = Arguments[1] % 256 & 255;
  b[32] = Arguments[1] >> 24 & 255;
  b[33] = Arguments[1] >> 16 & 255;
  b[34] = Arguments[2] >> 24 & 255;
  b[35] = Arguments[2] >> 16 & 255;
  b[36] = Arguments[2] >> 8 & 255;
  b[37] = Arguments[2] & 255;
  b[38] = url_search_params_list[21];
  b[39] = url_search_params_list[22];
  b[40] = cus[21];
  b[41] = cus[22];
  b[42] = ua[23];
  b[43] = ua[24];
  b[44] = b[10] >> 24 & 255;
  b[45] = b[10] >> 16 & 255;
  b[46] = b[10] >> 8 & 255;
  b[47] = b[10] & 255;
  b[48] = b[8];
  b[49] = b[10] / 256 / 256 / 256 / 256 >> 0;
  b[50] = b[10] / 256 / 256 / 256 / 256 / 256 >> 0;
  b[51] = b[15]["pageId"];
  b[52] = b[15]["pageId"] >> 24 & 255;
  b[53] = b[15]["pageId"] >> 16 & 255;
  b[54] = b[15]["pageId"] >> 8 & 255;
  b[55] = b[15]["pageId"] & 255;
  b[56] = b[15]["aid"];
  b[57] = b[15]["aid"] & 255;
  b[58] = b[15]["aid"] >> 8 & 255;
  b[59] = b[15]["aid"] >> 16 & 255;
  b[60] = b[15]["aid"] >> 24 & 255;
  const window_env_list = [];
  for (let index = 0; index < window_env_str.length; index++) {
    window_env_list.push(window_env_str.charCodeAt(index));
  }
  b[64] = window_env_list.length;
  b[65] = b[64] & 255;
  b[66] = b[64] >> 8 & 255;
  b[69] = [].length;
  b[70] = b[69] & 255;
  b[71] = b[69] >> 8 & 255;
  b[72] = b[18] ^ b[20] ^ b[26] ^ b[30] ^ b[38] ^ b[40] ^ b[42] ^ b[21] ^ b[27] ^ b[31] ^ b[35] ^ b[39] ^ b[41] ^ b[43] ^ b[22] ^ b[28] ^ b[32] ^ b[36] ^ b[23] ^ b[29] ^ b[33] ^ b[37] ^ b[44] ^ b[45] ^ b[46] ^ b[47] ^ b[48] ^ b[49] ^ b[50] ^ b[24] ^ b[25] ^ b[52] ^ b[53] ^ b[54] ^ b[55] ^ b[57] ^ b[58] ^ b[59] ^ b[60] ^ b[65] ^ b[66] ^ b[70] ^ b[71];
  let bb = [
    b[18],
    b[20],
    b[52],
    b[26],
    b[30],
    b[34],
    b[58],
    b[38],
    b[40],
    b[53],
    b[42],
    b[21],
    b[27],
    b[54],
    b[55],
    b[31],
    b[35],
    b[57],
    b[39],
    b[41],
    b[43],
    b[22],
    b[28],
    b[32],
    b[60],
    b[36],
    b[23],
    b[29],
    b[33],
    b[37],
    b[44],
    b[45],
    b[59],
    b[46],
    b[47],
    b[48],
    b[49],
    b[50],
    b[24],
    b[25],
    b[65],
    b[66],
    b[70],
    b[71]
  ];
  bb = bb.concat(window_env_list).concat(b[72]);
  return rc4_encrypt(String.fromCharCode(...bb), String.fromCharCode(121));
}
function generate_random_str() {
  let random_str_list = [];
  random_str_list = random_str_list.concat(gener_random(Math.random() * 1e4, [3, 45]));
  random_str_list = random_str_list.concat(gener_random(Math.random() * 1e4, [1, 0]));
  random_str_list = random_str_list.concat(gener_random(Math.random() * 1e4, [1, 5]));
  return String.fromCharCode(...random_str_list);
}
function generate_a_bogus(url_search_params, user_agent) {
  const result_str = generate_random_str() + generate_rc4_bb_str(
    url_search_params,
    user_agent,
    "1536|747|1536|834|0|30|0|0|1536|834|1536|864|1525|747|24|24|Win32"
  );
  return result_encrypt(result_str, "s4") + "=";
}

// src/utils/index.ts
import { v4 as uuidv4 } from "uuid";
function toUrlParams(obj) {
  const params = new URLSearchParams();
  Object.entries(obj).forEach(([key, value]) => {
    if (value !== void 0 && value !== null) {
      if (Array.isArray(value)) {
        value.forEach((v) => params.append(key, String(v)));
      } else {
        params.append(key, String(value));
      }
    }
  });
  return params.toString();
}
var generateMsToken = (randomlength = 128) => {
  const baseStr = "ABCDEFGHIGKLMNOPQRSTUVWXYZabcdefghigklmnopqrstuvwxyz0123456789=";
  let random_str = "";
  const length = baseStr.length - 1;
  for (let i = 0; i < randomlength; i++) {
    random_str += baseStr[Math.floor(Math.random() * length)];
  }
  return random_str;
};
var generateUuid = () => {
  return uuidv4();
};
var jsonEncode = (obj) => {
  return JSON.stringify(obj);
};
var urlEncode = (str) => {
  return encodeURI(str);
};
var unixTimestamp = () => {
  return parseInt(`${Date.now() / 1e3}`);
};

// src/api.ts
var MODEL_MAP = {
  "jimeng-4.0": "high_aes_general_v40",
  // 从实际网络请求中获取的正确模型名称
  "jimeng-3.1": "high_aes_general_v30l_art_fangzhou:general_v3.0_18b",
  "jimeng-3.0": "high_aes_general_v30l:general_v3.0_18b",
  "jimeng-2.1": "high_aes_general_v21_L:general_v2.1_L",
  "jimeng-2.0-pro": "high_aes_general_v20_L:general_v2.0_L",
  "jimeng-2.0": "high_aes_general_v20:general_v2.0",
  "jimeng-1.4": "high_aes_general_v14:general_v1.4",
  "jimeng-xl-pro": "text2img_xl_sft",
  // video
  "jimeng-video-3.0-pro": "dreamina_ic_generate_video_model_vgfm_3.0_pro",
  "jimeng-video-3.0": "dreamina_ic_generate_video_model_vgfm_3.0",
  "jimeng-video-2.0": "dreamina_ic_generate_video_model_vgfm_lite",
  "jimeng-video-2.0-pro": "dreamina_ic_generate_video_model_vgfm1.0",
  // multi-frame video
  "jimeng-video-multiframe": "dreamina_ic_generate_video_model_vgfm_3.0"
};
var DEFAULT_MODEL = "jimeng-4.0";
var DEFAULT_VIDEO_MODEL = "jimeng-video-3.0";
var DEFAULT_BLEND_MODEL = "jimeng-3.0";
var DRAFT_VERSION = "3.0.2";
var DEFAULT_ASSISTANT_ID = "513695";
var WEB_ID = Math.random() * 1e18 + 7e18;
var USER_ID = generateUuid().replace(/-/g, "");
var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
var ASPECT_RATIO_PRESETS = [
  { name: "auto", ratio: 0, displayName: "\u667A\u80FD", imageRatio: 1 },
  { name: "21:9", ratio: 21 / 9, displayName: "21:9", imageRatio: 8 },
  { name: "16:9", ratio: 16 / 9, displayName: "16:9", imageRatio: 3 },
  { name: "3:2", ratio: 3 / 2, displayName: "3:2", imageRatio: 7 },
  { name: "4:3", ratio: 4 / 3, displayName: "4:3", imageRatio: 4 },
  { name: "1:1", ratio: 1, displayName: "1:1", imageRatio: 1 },
  { name: "3:4", ratio: 3 / 4, displayName: "3:4", imageRatio: 2 },
  { name: "2:3", ratio: 2 / 3, displayName: "2:3", imageRatio: 6 },
  { name: "9:16", ratio: 9 / 16, displayName: "9:16", imageRatio: 5 }
];
var ImageDimensionCalculator = class {
  static calculateDimensions(aspectRatio = "auto") {
    const preset = ASPECT_RATIO_PRESETS.find((p) => p.name === aspectRatio);
    if (!preset) {
      throw new Error(`\u4E0D\u652F\u6301\u7684\u5BBD\u9AD8\u6BD4: ${aspectRatio}. \u652F\u6301\u7684\u503C: ${ASPECT_RATIO_PRESETS.map((p) => p.name).join(", ")}`);
    }
    if (preset.name === "auto") {
      return { width: 1024, height: 1024, imageRatio: preset.imageRatio };
    }
    const dimensions = this.STANDARD_DIMENSIONS[preset.name];
    if (!dimensions) {
      throw new Error(`\u672A\u627E\u5230 ${aspectRatio} \u7684\u5C3A\u5BF8\u914D\u7F6E`);
    }
    return {
      width: dimensions.width,
      height: dimensions.height,
      imageRatio: preset.imageRatio
    };
  }
  static getPresetByName(name) {
    return ASPECT_RATIO_PRESETS.find((p) => p.name === name);
  }
  static getAllPresets() {
    return ASPECT_RATIO_PRESETS;
  }
  static getStandardDimensions() {
    return this.STANDARD_DIMENSIONS;
  }
};
// 标准尺寸映射表（基于用户提供的精确规格）
ImageDimensionCalculator.STANDARD_DIMENSIONS = {
  "21:9": { width: 3024, height: 1296 },
  "16:9": { width: 2560, height: 1440 },
  "3:2": { width: 2496, height: 1664 },
  "4:3": { width: 2304, height: 1728 },
  "1:1": { width: 2048, height: 2048 },
  "3:4": { width: 1728, height: 2304 },
  "2:3": { width: 1664, height: 2496 },
  "9:16": { width: 1440, height: 2560 }
};
function getResolutionType(width, height) {
  const maxDimension = Math.max(width, height);
  if (maxDimension <= 1024) {
    return "1k";
  } else if (maxDimension <= 1536) {
    return "1.5k";
  } else if (maxDimension <= 2048) {
    return "2k";
  } else if (maxDimension <= 2560) {
    return "2.5k";
  } else {
    return "3k";
  }
}
function generateCookie(refreshToken) {
  return [
    `_tea_web_id=${WEB_ID}`,
    `is_staff_user=false`,
    `store-region=cn-gd`,
    `store-region-src=uid`,
    `sid_guard=${refreshToken}%7C${unixTimestamp()}%7C5184000%7CMon%2C+03-Feb-2025+08%3A17%3A09+GMT`,
    `uid_tt=${USER_ID}`,
    `uid_tt_ss=${USER_ID}`,
    `sid_tt=${refreshToken}`,
    `sessionid=${refreshToken}`,
    `sessionid_ss=${refreshToken}`,
    `sid_tt=${refreshToken}`
  ].join("; ");
}
var JimengApiClient = class {
  constructor(token) {
    this.getUploadImageProofUrl = "https://imagex.bytedanceapi.com/";
    this.refreshToken = token || process.env.JIMENG_API_TOKEN || "";
    if (!this.refreshToken) {
      throw new Error("JIMENG_API_TOKEN \u73AF\u5883\u53D8\u91CF\u672A\u8BBE\u7F6E");
    }
  }
  /**
   * 获取模型映射
   * @param model 模型名称
   * @returns 映射后的模型名称
   */
  getModel(model) {
    const mappedModel = MODEL_MAP[model] || MODEL_MAP[DEFAULT_MODEL];
    console.log(`\u{1F50D} \u6A21\u578B\u6620\u5C04\u8C03\u8BD5: ${model} -> ${mappedModel} (\u66F4\u65B0\u65F6\u95F4: ${(/* @__PURE__ */ new Date()).toISOString()})`);
    return mappedModel;
  }
  /**
   * 发送请求到即梦API
   * @param method 请求方法
   * @param path 请求路径
   * @param data 请求数据
   * @param params 请求参数
   * @param headers 请求头
   * @returns 响应结果
   */
  async request(method, path2, data = {}, params = {}, headers = {}) {
    const baseUrl = "https://jimeng.jianying.com";
    const url = path2.includes("https://") ? path2 : `${baseUrl}${path2}`;
    const FAKE_HEADERS = {
      Accept: "application/json, text/plain, */*",
      "Accept-Encoding": "gzip, deflate, br, zstd",
      "Accept-language": "zh-CN,zh;q=0.9",
      "Cache-control": "no-cache",
      "Last-event-id": "undefined",
      Appid: DEFAULT_ASSISTANT_ID,
      Appvr: "5.8.0",
      Origin: "https://jimeng.jianying.com",
      Pragma: "no-cache",
      Priority: "u=1, i",
      Referer: "https://jimeng.jianying.com",
      Pf: "7",
      "Sec-Ch-Ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
      "Sec-Ch-Ua-Mobile": "?0",
      "Sec-Ch-Ua-Platform": '"Windows"',
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
      "User-Agent": UA
    };
    const requestHeaders = {
      ...FAKE_HEADERS,
      "Cookie": generateCookie(this.refreshToken),
      ...headers
    };
    try {
      const response = await axios({
        method: method.toLowerCase(),
        url,
        data: method.toUpperCase() !== "GET" ? data : void 0,
        params: method.toUpperCase() === "GET" ? { ...data, ...params } : params,
        headers: requestHeaders,
        timeout: 6e4
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(`\u5373\u68A6API\u8BF7\u6C42\u9519\u8BEF: ${JSON.stringify(error.response.data)}`);
      } else {
        throw new Error(`\u5373\u68A6API\u8BF7\u6C42\u5931\u8D25: ${error}`);
      }
    }
  }
  /**
   * 获取积分信息
   * @returns 积分信息
   */
  async getCredit() {
    const result = await this.request(
      "POST",
      "/commerce/v1/benefits/user_credit",
      {},
      {},
      { "Referer": "https://jimeng.jianying.com/ai-tool/image/generate" }
    );
    const credit = result.credit || {};
    const giftCredit = credit.gift_credit || 0;
    const purchaseCredit = credit.purchase_credit || 0;
    const vipCredit = credit.vip_credit || 0;
    return {
      giftCredit,
      purchaseCredit,
      vipCredit,
      totalCredit: giftCredit + purchaseCredit + vipCredit
    };
  }
  /**
   * 领取积分
   */
  async receiveCredit() {
    const credit = await this.request(
      "POST",
      "/commerce/v1/benefits/credit_receive",
      { "time_zone": "Asia/Shanghai" },
      {},
      { "Referer": "https://jimeng.jianying.com/ai-tool/image/generate" }
    );
    console.log("\u9886\u53D6\u79EF\u5206", credit);
  }
  /**
   * 即梦AI图像生成（支持批量生成）
   * @param params 图像生成参数
   * @returns 生成的图像URL列表
   */
  async generateImage(params) {
    console.log("\u{1F50D} [API Client] generateImage method called");
    console.log("\u{1F50D} [API Client] Token in this instance:", this.refreshToken ? "[PROVIDED]" : "[MISSING]");
    console.log("\u{1F50D} [API Client] Parameters received:", JSON.stringify({
      filePath: params.filePath,
      prompt: params.prompt ? `${params.prompt.substring(0, 50)}...` : void 0,
      model: params.model,
      aspectRatio: params.aspectRatio,
      sample_strength: params.sample_strength,
      negative_prompt: params.negative_prompt
    }, null, 2));
    return await this.generateImageWithBatch(params);
  }
  /**
   * 批量生成图像，支持自动继续生成
   * @param params 图像生成参数
   * @returns 生成的图像URL列表
   */
  async generateImageWithBatch(params) {
    console.log("\u{1F50D} [API Client] generateImageWithBatch called");
    console.log("\u{1F50D} [API Client] Full params object:", JSON.stringify(params, null, 2));
    console.log("\u{1F50D} [API Client] Validating parameters...");
    if (!params.prompt || typeof params.prompt !== "string") {
      console.error("\u{1F50D} [API Client] Parameter validation failed: prompt is invalid");
      console.error("\u{1F50D} [API Client] prompt value:", params.prompt);
      console.error("\u{1F50D} [API Client] prompt type:", typeof params.prompt);
      throw new Error("prompt\u5FC5\u987B\u662F\u975E\u7A7A\u5B57\u7B26\u4E32");
    }
    console.log("\u{1F50D} [API Client] Parameter validation passed");
    const hasFilePath = Boolean(params == null ? void 0 : params.filePath);
    let uploadID = null;
    if (params == null ? void 0 : params.filePath) {
      uploadID = await this.uploadCoverFile(params.filePath);
    }
    const modelName = hasFilePath ? DEFAULT_BLEND_MODEL : params.model || DEFAULT_MODEL;
    const actualModel = this.getModel(modelName);
    const creditInfo = await this.getCredit();
    if (creditInfo.totalCredit <= 0) {
      await this.receiveCredit();
    }
    console.log("\u{1F50D} \u5F00\u59CB\u7B2C\u4E00\u6B21\u56FE\u50CF\u751F\u6210\u8BF7\u6C42...");
    const firstResult = await this.performSingleGeneration(params, actualModel, modelName, hasFilePath, uploadID);
    let allResults = [...firstResult.imageUrls];
    const historyId = firstResult.historyId;
    let recordData = firstResult.recordData;
    if (!historyId) {
      throw new Error("\u672A\u80FD\u83B7\u53D6\u5386\u53F2\u8BB0\u5F55ID");
    }
    console.log(`\u{1F50D} \u7B2C\u4E00\u6B21\u751F\u6210\u5B8C\u6210\uFF0C\u83B7\u5F97 ${firstResult.imageUrls.length} \u5F20\u56FE\u7247`);
    if (firstResult.needsContinuation) {
      console.log("\u{1F50D} \u8F6E\u8BE2\u8FC7\u7A0B\u4E2D\u68C0\u6D4B\u5230\u9700\u8981\u7EE7\u7EED\u751F\u6210\uFF0C\u7ACB\u5373\u53D1\u9001\u7EE7\u7EED\u751F\u6210\u8BF7\u6C42");
      try {
        const continuationResult = await this.performContinuationGeneration(
          params,
          actualModel,
          modelName,
          hasFilePath,
          uploadID,
          historyId,
          allResults.length
        );
        allResults.push(...continuationResult.imageUrls);
        recordData = continuationResult.recordData;
        console.log(`\u{1F50D} \u7EE7\u7EED\u751F\u6210\u5B8C\u6210\uFF0C\u65B0\u589E ${continuationResult.imageUrls.length} \u5F20\u56FE\u7247\uFF0C\u603B\u8BA1 ${allResults.length} \u5F20`);
      } catch (error) {
        console.error(`\u{1F50D} \u7EE7\u7EED\u751F\u6210\u5931\u8D25:`, error);
      }
    }
    let continuationCount = 0;
    const maxContinuations = 10;
    while (continuationCount < maxContinuations && this.shouldContinueGeneration(recordData, allResults.length)) {
      continuationCount++;
      console.log(`\u{1F50D} \u5F00\u59CB\u7B2C${continuationCount + 1}\u6B21\u7EE7\u7EED\u751F\u6210\u8BF7\u6C42...`);
      try {
        const continuationResult = await this.performContinuationGeneration(
          params,
          actualModel,
          modelName,
          hasFilePath,
          uploadID,
          historyId,
          allResults.length
        );
        allResults.push(...continuationResult.imageUrls);
        recordData = continuationResult.recordData;
        console.log(`\u{1F50D} \u7B2C${continuationCount + 1}\u6B21\u7EE7\u7EED\u751F\u6210\u5B8C\u6210\uFF0C\u65B0\u589E ${continuationResult.imageUrls.length} \u5F20\u56FE\u7247\uFF0C\u603B\u8BA1 ${allResults.length} \u5F20`);
      } catch (error) {
        console.error(`\u{1F50D} \u7B2C${continuationCount + 1}\u6B21\u7EE7\u7EED\u751F\u6210\u5931\u8D25:`, error);
        break;
      }
    }
    console.log(`\u{1F50D} \u6279\u91CF\u751F\u6210\u5B8C\u6210\uFF0C\u603B\u5171\u751F\u6210\u4E86 ${allResults.length} \u5F20\u56FE\u7247`);
    const deduplicatedResults = this.deduplicateImageUrls(allResults);
    if (deduplicatedResults.length !== allResults.length) {
      console.log(`\u26A0\uFE0F \u68C0\u6D4B\u5230\u91CD\u590D\u56FE\u7247\uFF0C\u5DF2\u53BB\u91CD: ${allResults.length} -> ${deduplicatedResults.length}`);
    }
    return deduplicatedResults;
  }
  /**
   * 执行单次生成（第一次请求）
   */
  async performSingleGeneration(params, actualModel, modelName, hasFilePath, uploadID) {
    var _a2, _b;
    const { rqData, rqParams } = this.buildGenerationRequestData(
      params,
      actualModel,
      modelName,
      hasFilePath,
      uploadID
    );
    console.log("\u{1F50D} \u56FE\u50CF\u751F\u6210\u8BF7\u6C42\u53C2\u6570:", JSON.stringify({
      requestedModel: modelName,
      actualModel,
      rqData: {
        extend: rqData.extend,
        draft_content_sample: rqData.draft_content.substring(0, 200) + "..."
      }
    }, null, 2));
    const result = await this.request(
      "POST",
      "/mweb/v1/aigc_draft/generate",
      rqData,
      rqParams
    );
    const pollResult = await this.pollResultWithHistoryExtended(result, 0);
    const itemList = pollResult.itemList;
    const recordData = pollResult.recordData;
    const needsContinuation = pollResult.needsContinuation;
    const debugData = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      requestedModel: modelName,
      actualModel,
      pollResult: itemList,
      originalResult: result,
      recordData
    };
    const fs2 = await import("fs");
    const debugFileName = `debug-jimeng-response-${modelName}-${Date.now()}.json`;
    fs2.writeFileSync(debugFileName, JSON.stringify(debugData, null, 2));
    console.log("\u{1F50D} \u5B8C\u6574\u8FD4\u56DE\u6570\u636E\u5DF2\u4FDD\u5B58\u5230:", debugFileName);
    const imageUrls = this.extractImageUrls(itemList);
    return {
      imageUrls,
      historyId: ((_b = (_a2 = result == null ? void 0 : result.data) == null ? void 0 : _a2.aigc_data) == null ? void 0 : _b.history_record_id) || null,
      recordData,
      needsContinuation
    };
  }
  /**
   * 执行继续生成请求
   */
  async performContinuationGeneration(params, actualModel, modelName, hasFilePath, uploadID, historyId, currentItemCount = 0) {
    const { rqData, rqParams } = this.buildGenerationRequestData(
      params,
      actualModel,
      modelName,
      hasFilePath,
      uploadID,
      historyId,
      true
    );
    console.log("\u{1F50D} \u7EE7\u7EED\u751F\u6210\u8BF7\u6C42\u53C2\u6570:", JSON.stringify({
      action: rqData.action,
      history_id: rqData.history_id,
      requestedModel: modelName,
      actualModel
    }, null, 2));
    const result = await this.request(
      "POST",
      "/mweb/v1/aigc_draft/generate",
      rqData,
      rqParams
    );
    const pollResult = await this.pollResultWithHistoryExtended(result, currentItemCount);
    const itemList = pollResult.itemList;
    const recordData = pollResult.recordData;
    const imageUrls = this.extractImageUrls(itemList);
    return {
      imageUrls,
      recordData
    };
  }
  /**
   * 判断是否需要继续生成
   */
  shouldContinueGeneration(recordData, currentCount) {
    if (!recordData) {
      console.log("\u{1F50D} \u65E0recordData\uFF0C\u505C\u6B62\u7EE7\u7EED\u751F\u6210");
      return false;
    }
    const finishedCount = recordData.finished_image_count || 0;
    const totalCount = recordData.total_image_count || 0;
    const taskStatus = recordData.status;
    const confirmStatus = recordData.confirm_status;
    console.log(`\u{1F50D} \u751F\u6210\u72B6\u6001\u68C0\u67E5: finished_image_count=${finishedCount}, total_image_count=${totalCount}, currentCount=${currentCount}, status=${taskStatus}, confirm_status=${confirmStatus}`);
    if (taskStatus === 30) {
      console.log("\u{1F50D} \u4EFB\u52A1\u72B6\u6001\u4E3A30\uFF08\u5931\u8D25\uFF09\uFF0C\u505C\u6B62\u7EE7\u7EED\u751F\u6210");
      return false;
    }
    if (totalCount > 4 && currentCount < totalCount) {
      console.log(`\u{1F50D} \u9700\u8981\u7EE7\u7EED\u751F\u6210: \u76EE\u6807${totalCount}\u5F20(>4\u5F20)\uFF0C\u5DF2\u83B7\u5F97${currentCount}\u5F20`);
      return true;
    }
    if (totalCount <= 4) {
      console.log(`\u{1F50D} \u6807\u51C6\u751F\u6210\u5B8C\u6210: \u603B\u6570${totalCount}\u5F20(<=4\u5F20)\uFF0C\u5DF2\u83B7\u5F97${currentCount}\u5F20\uFF0C\u65E0\u9700\u7EE7\u7EED\u751F\u6210`);
      return false;
    }
    console.log("\u{1F50D} \u6240\u6709\u6761\u4EF6\u90FD\u4E0D\u6EE1\u8DB3\uFF0C\u505C\u6B62\u7EE7\u7EED\u751F\u6210");
    return false;
  }
  /**
   * 构建通用的生成请求数据
   * @param params 图像生成参数
   * @param actualModel 实际模型名称
   * @param modelName 请求的模型名称
   * @param hasFilePath 是否有文件路径
   * @param uploadID 上传文件ID
   * @param historyId 历史记录ID（继续生成时使用）
   * @param isContinuation 是否是继续生成请求
   */
  buildGenerationRequestData(params, actualModel, modelName, hasFilePath, uploadID, historyId, isContinuation = false) {
    const componentId = generateUuid();
    console.log("\u{1F50D} [API Client] Calculating dimensions for aspectRatio:", params.aspectRatio || "auto");
    try {
      const dimensions2 = ImageDimensionCalculator.calculateDimensions(params.aspectRatio || "auto");
      const { width: width2, height: height2, imageRatio: imageRatio2 } = dimensions2;
      console.log(`\u{1F50D} [API Client] Dimension calculation successful:`);
      console.log(`\u{1F50D} [API Client] - Input aspectRatio: ${params.aspectRatio || "auto"}`);
      console.log(`\u{1F50D} [API Client] - Calculated width: ${width2}`);
      console.log(`\u{1F50D} [API Client] - Calculated height: ${height2}`);
      console.log(`\u{1F50D} [API Client] - Calculated imageRatio: ${imageRatio2}`);
    } catch (dimensionError) {
      console.error("\u{1F50D} [API Client] Dimension calculation failed:");
      console.error("\u{1F50D} [API Client] Error:", dimensionError);
      console.error("\u{1F50D} [API Client] aspectRatio value:", params.aspectRatio);
      throw dimensionError;
    }
    const dimensions = ImageDimensionCalculator.calculateDimensions(params.aspectRatio || "auto");
    const { width, height, imageRatio } = dimensions;
    console.log(`\u{1F50D} \u4F7F\u7528\u5BBD\u9AD8\u6BD4: ${params.aspectRatio || "auto"}\uFF0C\u8BA1\u7B97\u5C3A\u5BF8: ${width}x${height}`);
    let abilities = {};
    if (hasFilePath) {
      abilities = {
        "blend": {
          "type": "",
          "id": generateUuid(),
          "min_features": [],
          "core_param": {
            "type": "",
            "id": generateUuid(),
            "model": actualModel,
            "prompt": params.prompt + "##",
            "sample_strength": params.sample_strength || 0.5,
            "image_ratio": imageRatio,
            "large_image_info": {
              "type": "",
              "id": generateUuid(),
              "height": height,
              "width": width,
              "resolution_type": getResolutionType(width, height)
            },
            "intelligent_ratio": false
          },
          "ability_list": [
            {
              "type": "",
              "id": generateUuid(),
              "name": "byte_edit",
              "image_uri_list": [uploadID],
              "image_list": [
                {
                  "type": "image",
                  "id": generateUuid(),
                  "source_from": "upload",
                  "platform_type": 1,
                  "name": "",
                  "image_uri": uploadID,
                  "width": 0,
                  "height": 0,
                  "format": "",
                  "uri": uploadID
                }
              ],
              "strength": 0.5
            }
          ],
          "history_option": {
            "type": "",
            "id": generateUuid()
          },
          "prompt_placeholder_info_list": [
            {
              "type": "",
              "id": generateUuid(),
              "ability_index": 0
            }
          ],
          "postedit_param": {
            "type": "",
            "id": generateUuid(),
            "generate_type": 0
          }
        }
      };
    } else {
      abilities = {
        "generate": {
          "type": "",
          "id": generateUuid(),
          "core_param": {
            "type": "",
            "id": generateUuid(),
            "model": actualModel,
            "prompt": params.prompt,
            "negative_prompt": params.negative_prompt || "",
            "seed": Math.floor(Math.random() * 1e8) + 25e8,
            "sample_strength": params.sample_strength || 0.5,
            "image_ratio": imageRatio,
            "large_image_info": {
              "type": "",
              "id": generateUuid(),
              "height": height,
              "width": width,
              "resolution_type": getResolutionType(width, height)
            },
            "intelligent_ratio": false
          },
          "history_option": {
            "type": "",
            "id": generateUuid()
          }
        }
      };
    }
    const baseData = {
      "extend": {
        "root_model": actualModel,
        "template_id": ""
      },
      "submit_id": generateUuid(),
      "metrics_extra": hasFilePath ? void 0 : jsonEncode({
        "templateId": "",
        "generateCount": 1,
        "promptSource": "custom",
        "templateSource": "",
        "lastRequestId": "",
        "originRequestId": ""
      }),
      "draft_content": jsonEncode({
        "type": "draft",
        "id": generateUuid(),
        "min_version": DRAFT_VERSION,
        "is_from_tsn": true,
        "version": "3.2.9",
        "main_component_id": componentId,
        "component_list": [{
          "type": "image_base_component",
          "id": componentId,
          "min_version": DRAFT_VERSION,
          "aigc_mode": "workbench",
          "metadata": {
            "type": "",
            "id": generateUuid(),
            "created_platform": 3,
            "created_platform_version": "",
            "created_time_in_ms": Date.now(),
            "created_did": ""
          },
          "generate_type": hasFilePath ? "blend" : "generate",
          "abilities": {
            "type": "",
            "id": generateUuid(),
            ...abilities
          }
        }]
      })
    };
    if (isContinuation && historyId) {
      baseData.action = 2;
      baseData.history_id = historyId;
    }
    const rqParams = {
      "babi_param": urlEncode(jsonEncode({
        "scenario": "image_video_generation",
        "feature_key": hasFilePath ? "to_image_referenceimage_generate" : "aigc_to_image",
        "feature_entrance": "to_image",
        "feature_entrance_detail": hasFilePath ? "to_image-referenceimage-byte_edit" : `to_image-${actualModel}`
      })),
      "aid": parseInt(DEFAULT_ASSISTANT_ID),
      "device_platform": "web",
      "region": "cn",
      "webId": WEB_ID,
      "web_component_open_flag": 1
    };
    return {
      rqData: baseData,
      rqParams
    };
  }
  /**
   * 构建智能多帧视频生成请求数据
   */
  async buildMultiFrameVideoRequest(params, actualModel) {
    if (!params.multiFrames || params.multiFrames.length === 0) {
      throw new Error("\u591A\u5E27\u6A21\u5F0F\u9700\u8981\u63D0\u4F9BmultiFrames\u53C2\u6570");
    }
    if (params.multiFrames.length > 10) {
      throw new Error(`\u667A\u80FD\u591A\u5E27\u6700\u591A\u652F\u630110\u5E27\uFF0C\u5F53\u524D\u63D0\u4F9B\u4E86${params.multiFrames.length}\u5E27`);
    }
    for (const frame of params.multiFrames) {
      if (frame.duration_ms < 1e3 || frame.duration_ms > 5e3) {
        throw new Error(`\u5E27${frame.idx}\u7684duration_ms\u5FC5\u987B\u57281000-5000ms\u8303\u56F4\u5185\uFF081-5\u79D2\uFF09`);
      }
    }
    const processedFrames = [];
    for (const frame of params.multiFrames) {
      const uploadID = await this.uploadCoverFile(frame.image_path);
      processedFrames.push({
        type: "",
        id: generateUuid(),
        idx: frame.idx,
        duration_ms: frame.duration_ms,
        prompt: frame.prompt,
        media_info: {
          type: "",
          id: generateUuid(),
          media_type: 1,
          image_info: {
            type: "image",
            id: generateUuid(),
            source_from: "upload",
            platform_type: 1,
            name: "",
            image_uri: uploadID,
            width: params.width || 864,
            height: params.height || 1184,
            format: "",
            uri: uploadID
          }
        }
      });
    }
    const componentId = generateUuid();
    const metricsExtra = jsonEncode({
      "isDefaultSeed": 1,
      "originSubmitId": generateUuid(),
      "isRegenerate": false,
      "enterFrom": "click",
      "functionMode": "multi_frame"
    });
    const rqParams = {
      msToken: generateMsToken(),
      aigc_features: "app_lip_sync",
      web_version: "6.6.0",
      "da_version": "3.2.9",
      "aid": parseInt(DEFAULT_ASSISTANT_ID),
      "device_platform": "web",
      "region": "cn",
      "webId": WEB_ID,
      "web_component_open_flag": 1
    };
    rqParams["a_bogus"] = generate_a_bogus(toUrlParams(rqParams), UA);
    const rqData = {
      "extend": {
        "root_model": actualModel,
        "m_video_commerce_info": {
          "benefit_type": "basic_video_operation_vgfm_v_three",
          "resource_id": "generate_video",
          "resource_id_type": "str",
          "resource_sub_type": "aigc"
        },
        "m_video_commerce_info_list": [{
          "benefit_type": "basic_video_operation_vgfm_v_three",
          "resource_id": "generate_video",
          "resource_id_type": "str",
          "resource_sub_type": "aigc"
        }]
      },
      "submit_id": generateUuid(),
      "metrics_extra": metricsExtra,
      "draft_content": jsonEncode({
        "type": "draft",
        "id": generateUuid(),
        "min_version": "3.0.5",
        "min_features": ["AIGC_GenerateType_VideoMultiFrame"],
        "is_from_tsn": true,
        "version": "3.2.9",
        "main_component_id": componentId,
        "component_list": [{
          "type": "video_base_component",
          "id": componentId,
          "min_version": "1.0.0",
          "aigc_mode": "workbench",
          "metadata": {
            "type": "",
            "id": generateUuid(),
            "created_platform": 3,
            "created_platform_version": "",
            "created_time_in_ms": Date.now().toString(),
            "created_did": ""
          },
          "generate_type": "gen_video",
          "abilities": {
            "type": "",
            "id": generateUuid(),
            "gen_video": {
              "type": "",
              "id": generateUuid(),
              "text_to_video_params": {
                "type": "",
                "id": generateUuid(),
                "video_gen_inputs": [{
                  "type": "",
                  "id": generateUuid(),
                  "min_version": "3.0.5",
                  "prompt": params.prompt || "",
                  "video_mode": 2,
                  "fps": params.fps || 24,
                  "duration_ms": params.duration_ms || 1e4,
                  "resolution": params.resolution || "720p",
                  "multi_frames": processedFrames
                }],
                "video_aspect_ratio": params.video_aspect_ratio || "3:4",
                "seed": Math.floor(Math.random() * 1e8) + 25e8,
                "model_req_key": actualModel,
                "priority": 0
              },
              "video_task_extra": metricsExtra
            }
          }
        }]
      }),
      "http_common_info": {
        "aid": parseInt(DEFAULT_ASSISTANT_ID)
      }
    };
    return {
      rqData,
      rqParams
    };
  }
  /**
   * 去重图片URL列表，基于图片ID
   */
  deduplicateImageUrls(urls) {
    const seen = /* @__PURE__ */ new Set();
    const uniqueUrls = [];
    for (const url of urls) {
      const match = url.match(/([a-f0-9]{32})/);
      const imageId = match ? match[1] : url;
      if (!seen.has(imageId)) {
        seen.add(imageId);
        uniqueUrls.push(url);
      }
    }
    console.log(`\u{1F50D} \u53BB\u91CD\u7ED3\u679C: \u539F\u59CB${urls.length}\u5F20 -> \u53BB\u91CD\u540E${uniqueUrls.length}\u5F20`);
    return uniqueUrls;
  }
  /**
   * 从itemList中提取图片URL
   */
  extractImageUrls(itemList) {
    console.log("\u{1F50D} itemList \u9879\u76EE\u6570\u91CF:", (itemList == null ? void 0 : itemList.length) || 0);
    const resultList = (itemList || []).map((item, index) => {
      var _a2, _b, _c, _d, _e, _f, _g;
      console.log(`\u{1F50D} \u5904\u7406\u7B2C${index}\u9879:`, JSON.stringify(item, null, 2));
      let imageUrl = ((_c = (_b = (_a2 = item == null ? void 0 : item.image) == null ? void 0 : _a2.large_images) == null ? void 0 : _b[0]) == null ? void 0 : _c.image_url) || ((_d = item == null ? void 0 : item.common_attr) == null ? void 0 : _d.cover_url) || ((_e = item == null ? void 0 : item.image) == null ? void 0 : _e.url) || ((_f = item == null ? void 0 : item.image) == null ? void 0 : _f.image_url) || (item == null ? void 0 : item.cover_url) || (item == null ? void 0 : item.url);
      if (!imageUrl && ((_g = item == null ? void 0 : item.image) == null ? void 0 : _g.large_images)) {
        for (const img of item.image.large_images) {
          if ((img == null ? void 0 : img.image_url) || (img == null ? void 0 : img.url)) {
            imageUrl = img.image_url || img.url;
            break;
          }
        }
      }
      console.log(`\u{1F50D} \u63D0\u53D6\u5230\u7684URL:`, imageUrl);
      return imageUrl;
    }).filter(Boolean);
    console.log("\u{1F50D} \u672C\u8F6E\u63D0\u53D6\u7684\u56FE\u7247\u7ED3\u679C:", resultList);
    return resultList;
  }
  /**
   * 扩展的轮询方法，返回更多详细信息
   * @param result 初始请求结果
   * @param lastItemCount 上次轮询时的项目数量，用于增量返回（可选）
   */
  async pollResultWithHistoryExtended(result, lastItemCount = 0) {
    var _a2, _b, _c, _d;
    const historyId = (_b = (_a2 = result == null ? void 0 : result.data) == null ? void 0 : _a2.aigc_data) == null ? void 0 : _b.history_record_id;
    if (!historyId) {
      if (result == null ? void 0 : result.errmsg) {
        throw new Error(result.errmsg);
      } else {
        throw new Error("\u8BB0\u5F55ID\u4E0D\u5B58\u5728");
      }
    }
    let status = 20;
    let failCode = null;
    let itemList = [];
    let recordData = null;
    let pollCount = 0;
    let needsContinuation = false;
    const maxPollCount = 20;
    console.log("\u{1F50D} \u5F00\u59CB\u8F6E\u8BE2\uFF0ChistoryId:", historyId);
    while ((status === 20 || status === 45 || status === 42) && pollCount < maxPollCount) {
      pollCount++;
      let waitTime;
      if (status === 45) {
        waitTime = pollCount === 1 ? 3e4 : 1e4;
      } else if (status === 42) {
        waitTime = pollCount === 1 ? 15e3 : 8e3;
      } else {
        waitTime = pollCount === 1 ? 2e4 : 5e3;
      }
      console.log(`\u{1F50D} \u8F6E\u8BE2\u7B2C ${pollCount} \u6B21\uFF0C\u72B6\u6001=${status}\uFF0C\u7B49\u5F85 ${waitTime / 1e3} \u79D2...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      const result2 = await this.request(
        "POST",
        "/mweb/v1/get_history_by_ids",
        {
          "history_ids": [historyId],
          "image_info": {
            "width": 2048,
            "height": 2048,
            "format": "webp",
            "image_scene_list": [
              { "scene": "smart_crop", "width": 360, "height": 360, "uniq_key": "smart_crop-w:360-h:360", "format": "webp" },
              { "scene": "smart_crop", "width": 480, "height": 480, "uniq_key": "smart_crop-w:480-h:480", "format": "webp" },
              { "scene": "smart_crop", "width": 720, "height": 720, "uniq_key": "smart_crop-w:720-h:720", "format": "webp" },
              { "scene": "smart_crop", "width": 720, "height": 480, "uniq_key": "smart_crop-w:720-h:480", "format": "webp" },
              { "scene": "smart_crop", "width": 360, "height": 240, "uniq_key": "smart_crop-w:360-h:240", "format": "webp" },
              { "scene": "smart_crop", "width": 240, "height": 320, "uniq_key": "smart_crop-w:240-h:320", "format": "webp" },
              { "scene": "smart_crop", "width": 480, "height": 640, "uniq_key": "smart_crop-w:480-h:640", "format": "webp" },
              { "scene": "normal", "width": 2400, "height": 2400, "uniq_key": "2400", "format": "webp" },
              { "scene": "normal", "width": 1080, "height": 1080, "uniq_key": "1080", "format": "webp" },
              { "scene": "normal", "width": 720, "height": 720, "uniq_key": "720", "format": "webp" },
              { "scene": "normal", "width": 480, "height": 480, "uniq_key": "480", "format": "webp" },
              { "scene": "normal", "width": 360, "height": 360, "uniq_key": "360", "format": "webp" }
            ]
          },
          "http_common_info": {
            "aid": parseInt(DEFAULT_ASSISTANT_ID)
          }
        }
      );
      const record = (_c = result2 == null ? void 0 : result2.data) == null ? void 0 : _c[historyId];
      if (!record) {
        throw new Error("\u8BB0\u5F55\u4E0D\u5B58\u5728");
      }
      status = record.status;
      failCode = record.fail_code;
      recordData = record;
      console.log(`\u{1F50D} \u8F6E\u8BE2\u72B6\u6001: status=${status}, failCode=${failCode}, itemList\u957F\u5EA6=${((_d = record.item_list) == null ? void 0 : _d.length) || 0}`);
      console.log(`\u{1F50D} \u8BE6\u7EC6\u72B6\u6001: total_image_count=${record.total_image_count}, finished_image_count=${record.finished_image_count}, confirm_status=${record.confirm_status}`);
      const totalCount = record.total_image_count || 0;
      if (totalCount > 4 && !needsContinuation) {
        console.log("\u{1F50D} \u68C0\u6D4B\u5230\u9700\u8981\u751F\u6210\u8D85\u8FC74\u5F20\u56FE\u7247\uFF0C\u6807\u8BB0\u9700\u8981\u7EE7\u7EED\u751F\u6210");
        needsContinuation = true;
      }
      if (status === 30) {
        if (failCode === "2038") {
          throw new Error("\u5185\u5BB9\u88AB\u8FC7\u6EE4");
        }
        throw new Error("\u751F\u6210\u5931\u8D25");
      }
      if (record.item_list && record.item_list.length > 0) {
        const currentItemList = record.item_list;
        const finishedCount = record.finished_image_count || 0;
        const totalCount2 = record.total_image_count || 0;
        console.log(`\u{1F50D} \u5F53\u524D\u72B6\u6001\u68C0\u67E5: item_list\u957F\u5EA6=${currentItemList.length}, finished_count=${finishedCount}, total_count=${totalCount2}, status=${status}`);
        const isVideoGeneration = finishedCount === 0 && totalCount2 === 0 && currentItemList.length > 0;
        if (isVideoGeneration) {
          console.log(`\u{1F50D} \u68C0\u6D4B\u5230\u89C6\u9891\u751F\u6210\u6A21\u5F0F: status=${status}, itemList\u957F\u5EA6=${currentItemList.length}`);
        }
        const isBatchComplete = (
          // 视频生成完成条件：status=50且有itemList项目
          isVideoGeneration && status === 50 && currentItemList.length > 0 || // 条件1: 达到了一个批次的大小（4张图片），且状态稳定
          currentItemList.length >= 4 && status !== 20 && status !== 45 && status !== 42 || // 条件2: finished_image_count达到了total_image_count（全部完成）
          totalCount2 > 0 && finishedCount >= totalCount2 || // 条件3: 对于小批次（<=4张），等待所有状态指示完成
          totalCount2 > 0 && totalCount2 <= 4 && finishedCount >= totalCount2 && status !== 20 || // 条件4: 当检测到需要继续生成且已达到批次上限（4张）时，立即完成当前批次
          needsContinuation && currentItemList.length >= 4 && finishedCount >= 4
        );
        if (isBatchComplete) {
          const incrementalItems = currentItemList.slice(lastItemCount);
          console.log("\u{1F50D} \u672C\u8F6E\u751F\u6210\u5B8C\u6210\uFF0C\u8FD4\u56DE\u7ED3\u679C");
          console.log(`\u{1F50D} \u603B\u9879\u76EE\u6570: ${currentItemList.length}, \u4E0A\u6B21\u6570\u91CF: ${lastItemCount}, \u65B0\u589E\u9879\u76EE: ${incrementalItems.length}`);
          console.log(`\u{1F50D} \u5B8C\u6210\u6761\u4EF6: item_list\u957F\u5EA6=${currentItemList.length}, finished=${finishedCount}, total=${totalCount2}, status=${status}`);
          return { itemList: incrementalItems, recordData, needsContinuation };
        } else {
          console.log("\u{1F50D} \u672C\u8F6E\u751F\u6210\u672A\u5B8C\u6210\uFF0C\u7EE7\u7EED\u8F6E\u8BE2...");
          console.log(`\u{1F50D} \u7B49\u5F85\u6761\u4EF6: item_list\u957F\u5EA6=${currentItemList.length}, finished=${finishedCount}, total=${totalCount2}, status=${status}`);
        }
      }
      if (status !== 20 && status !== 45) {
        console.log(`\u{1F50D} \u9047\u5230\u65B0\u72B6\u6001 ${status}\uFF0C\u7EE7\u7EED\u8F6E\u8BE2...`);
      }
    }
    if (pollCount >= maxPollCount) {
      console.log("\u{1F50D} \u8F6E\u8BE2\u8D85\u65F6\uFF0C\u4F46\u72B6\u6001\u4ECD\u4E3A20\uFF0C\u8FD4\u56DE\u7A7A\u6570\u7EC4");
    }
    return { itemList: [], recordData, needsContinuation };
  }
  async pollResultWithHistory(result) {
    const extendedResult = await this.pollResultWithHistoryExtended(result, 0);
    return extendedResult.itemList;
  }
  /**
  * 获取上传凭证所需Ak和Tk
  */
  async getUploadAuth() {
    return new Promise(async (resolve, reject) => {
      try {
        const authRes = await this.request(
          "POST",
          "/mweb/v1/get_upload_token?aid=513695&da_version=3.2.2&aigc_features=app_lip_sync",
          {
            scene: 2
          },
          {}
        );
        if (!authRes.data) {
          reject(authRes.errmsg ?? "\u83B7\u53D6\u4E0A\u4F20\u51ED\u8BC1\u5931\u8D25,\u8D26\u53F7\u53EF\u80FD\u5DF2\u6389\u7EBF!");
          return;
        }
        resolve(authRes.data);
      } catch (err) {
        console.error("\u83B7\u53D6\u4E0A\u4F20\u51ED\u8BC1\u5931\u8D25:", err);
        reject(err);
      }
    });
  }
  async getFileContent(filePath) {
    try {
      if (filePath.includes("https://") || filePath.includes("http://")) {
        const res = await axios.get(filePath, { responseType: "arraybuffer" });
        return Buffer.from(res.data);
      } else {
        const absolutePath = path.resolve(filePath);
        return await fs.promises.readFile(absolutePath);
      }
    } catch (error) {
      console.error("Failed to read file:", error);
      throw new Error(`\u8BFB\u53D6\u6587\u4EF6\u5931\u8D25: filePath`);
    }
  }
  generateRandomString(length) {
    let result = "";
    const characters = "abcdefghijklmnopqrstuvwxyz0123456789";
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }
  /**
  * 生成请求所需Header
  */
  addHeaders(amzDate, sessionToken, requestBody) {
    const headers = {
      "X-Amz-Date": amzDate,
      "X-Amz-Security-Token": sessionToken
    };
    if (Object.keys(requestBody).length > 0) {
      headers["X-Amz-Content-Sha256"] = crypto.createHash("sha256").update(JSON.stringify(requestBody)).digest("hex");
    }
    return headers;
  }
  /**
   * 生成请求所需Header
   */
  async generateAuthorizationAndHeader(accessKeyID, secretAccessKey, sessionToken, region, service, requestMethod, requestParams, requestBody = {}) {
    return new Promise((resolve) => {
      const now = /* @__PURE__ */ new Date();
      const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, "").slice(0, 15) + "Z";
      const requestHeaders = this.addHeaders(
        amzDate,
        sessionToken,
        requestBody
      );
      if (Object.keys(requestBody).length > 0) {
        requestHeaders["X-Amz-Content-Sha256"] = crypto.createHash("sha256").update(JSON.stringify(requestBody)).digest("hex");
      }
      const authorizationParams = [
        "AWS4-HMAC-SHA256 Credential=" + accessKeyID + "/" + this.credentialString(amzDate, region, service),
        "SignedHeaders=" + this.signedHeaders(requestHeaders),
        "Signature=" + this.signature(
          secretAccessKey,
          amzDate,
          region,
          service,
          requestMethod,
          requestParams,
          requestHeaders,
          requestBody
        )
      ];
      const authorization = authorizationParams.join(", ");
      const headers = {};
      for (const key in requestHeaders) {
        headers[key] = requestHeaders[key];
      }
      headers["Authorization"] = authorization;
      resolve(headers);
    });
  }
  /**
   * 获取credentialString
   */
  credentialString(amzDate, region, service) {
    const credentialArr = [
      amzDate.substring(0, 8),
      region,
      service,
      "aws4_request"
    ];
    return credentialArr.join("/");
  }
  /**
   * 生成http请求参数字符串
   */
  httpBuildQuery(params) {
    const searchParams = new URLSearchParams();
    for (const key in params) {
      if (params == null ? void 0 : params.hasOwnProperty(key)) {
        searchParams.append(key, params[key]);
      }
    }
    return searchParams.toString();
  }
  signedHeaders(requestHeaders) {
    const headers = [];
    Object.keys(requestHeaders).forEach(function(r) {
      r = r.toLowerCase();
      headers.push(r);
    });
    return headers.sort().join(";");
  }
  /**
   * 生成canonicalString
   */
  canonicalString(requestMethod, requestParams, requestHeaders, requestBody) {
    let canonicalHeaders = [];
    const headerKeys = Object.keys(requestHeaders).sort();
    for (let i = 0; i < headerKeys.length; i++) {
      canonicalHeaders.push(
        headerKeys[i].toLowerCase() + ":" + requestHeaders[headerKeys[i]]
      );
    }
    canonicalHeaders = canonicalHeaders.join("\n") + "\n";
    let body = "";
    if (Object.keys(requestBody).length > 0) {
      body = JSON.stringify(requestBody);
    }
    const canonicalStringArr = [
      requestMethod.toUpperCase(),
      "/",
      this.httpBuildQuery(requestParams),
      canonicalHeaders,
      this.signedHeaders(requestHeaders),
      crypto.createHash("sha256").update(body).digest("hex")
    ];
    return canonicalStringArr.join("\n");
  }
  signature(secretAccessKey, amzDate, region, service, requestMethod, requestParams, requestHeaders, requestBody) {
    const amzDay = amzDate.substring(0, 8);
    const kDate = crypto.createHmac("sha256", "AWS4" + secretAccessKey).update(amzDay).digest();
    const kRegion = crypto.createHmac("sha256", kDate).update(region).digest();
    const kService = crypto.createHmac("sha256", kRegion).update(service).digest();
    const signingKey = crypto.createHmac("sha256", kService).update("aws4_request").digest();
    const stringToSignArr = [
      "AWS4-HMAC-SHA256",
      amzDate,
      this.credentialString(amzDate, region, service),
      crypto.createHash("sha256").update(
        this.canonicalString(
          requestMethod,
          requestParams,
          requestHeaders,
          requestBody
        )
      ).digest("hex")
    ];
    const stringToSign = stringToSignArr.join("\n");
    return crypto.createHmac("sha256", signingKey).update(stringToSign).digest("hex");
  }
  /**
   * 上传文件到远程服务器
   * @param url 上传地址
   * @param fileContent 文件内容
   * @param headers 请求头
   * @param method HTTP 方法
   * @param proxy
   */
  async uploadFile(url, fileContent, headers, method = "PUT") {
    return new Promise(async (resolve, reject) => {
      const res = await this.request(
        "POST",
        url,
        fileContent,
        {},
        headers
      );
      resolve(res);
    });
  }
  /**
   * 上传文件
   */
  async uploadCoverFile(filePath) {
    return new Promise(async (resolve, reject) => {
      var _a2, _b;
      try {
        console.log("\u5F00\u59CB\u4E0A\u4F20\u6587\u4EF6:", filePath);
        const uploadAuth = await this.getUploadAuth();
        const imageRes = await this.getFileContent(filePath);
        const imageCrc32 = crc32(imageRes).toString(16);
        const getUploadImageProofRequestParams = {
          Action: "ApplyImageUpload",
          FileSize: imageRes.length,
          ServiceId: "tb4s082cfz",
          Version: "2018-08-01",
          s: this.generateRandomString(11)
        };
        const requestHeadersInfo = await this.generateAuthorizationAndHeader(
          uploadAuth.access_key_id,
          uploadAuth.secret_access_key,
          uploadAuth.session_token,
          "cn-north-1",
          "imagex",
          "GET",
          getUploadImageProofRequestParams
        );
        const uploadImgRes = await this.request(
          "GET",
          this.getUploadImageProofUrl + "?" + this.httpBuildQuery(getUploadImageProofRequestParams),
          {},
          {},
          requestHeadersInfo
        );
        if ((_a2 = uploadImgRes == null ? void 0 : uploadImgRes["Response  "]) == null ? void 0 : _a2.hasOwnProperty("Error")) {
          reject(uploadImgRes["Response "]["Error"]["Message"]);
          return;
        }
        const UploadAddress = uploadImgRes.Result.UploadAddress;
        const uploadImgUrl = `https://${UploadAddress.UploadHosts[0]}/upload/v1/${UploadAddress.StoreInfos[0].StoreUri}`;
        const imageUploadRes = await this.uploadFile(
          uploadImgUrl,
          imageRes,
          {
            Authorization: UploadAddress.StoreInfos[0].Auth,
            "Content-Crc32": imageCrc32,
            "Content-Type": "application/octet-stream"
            // 'X-Storage-U': '3674996648187204',
          },
          "POST"
        );
        if (imageUploadRes.code !== 2e3) {
          reject(imageUploadRes.message);
          return;
        }
        const commitImgParams = {
          Action: "CommitImageUpload",
          FileSize: imageRes.length,
          ServiceId: "tb4s082cfz",
          Version: "2018-08-01"
          // user_id: userUid,
        };
        const commitImgContent = {
          SessionKey: UploadAddress.SessionKey
        };
        const commitImgHead = await this.generateAuthorizationAndHeader(
          uploadAuth.access_key_id,
          uploadAuth.secret_access_key,
          uploadAuth.session_token,
          "cn-north-1",
          "imagex",
          "POST",
          commitImgParams,
          commitImgContent
        );
        const commitImg = await this.request(
          "POST",
          this.getUploadImageProofUrl + "?" + this.httpBuildQuery(commitImgParams),
          commitImgContent,
          {},
          {
            ...commitImgHead,
            "Content-Type": "application/json"
          }
        );
        if ((_b = commitImg["Response "]) == null ? void 0 : _b.hasOwnProperty("Error")) {
          reject(commitImg["Response  "]["Error"]["Message"]);
          return;
        }
        resolve(commitImg.Result.Results[0].Uri);
      } catch (err) {
        console.error("\u4E0A\u4F20\u6587\u4EF6\u5931\u8D25:", err);
        const errorMessage = (err == null ? void 0 : err.message) || err || "\u672A\u77E5";
        reject("\u4E0A\u4F20\u5931\u8D25,\u5931\u8D25\u539F\u56E0:" + errorMessage);
      }
    });
  }
  /**
   * 生成智能多帧视频
   */
  async generateMultiFrameVideo(params, actualModel) {
    var _a2, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q;
    console.log("\u{1F50D} \u5F00\u59CB\u667A\u80FD\u591A\u5E27\u89C6\u9891\u751F\u6210...");
    const { rqData, rqParams } = await this.buildMultiFrameVideoRequest(params, actualModel);
    console.log("\u{1F50D} \u591A\u5E27\u89C6\u9891\u751F\u6210\u8BF7\u6C42\u53C2\u6570:", {
      model: actualModel,
      frameCount: (_a2 = params.multiFrames) == null ? void 0 : _a2.length,
      aspectRatio: params.video_aspect_ratio,
      duration: params.duration_ms
    });
    const result = await this.request(
      "POST",
      "/mweb/v1/aigc_draft/generate",
      rqData,
      rqParams
    );
    const pollResult = await this.pollResultWithHistoryExtended(result, 0);
    const itemList = pollResult.itemList;
    const debugData = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      requestType: "multiframe-video",
      actualModel,
      pollResult: itemList,
      originalResult: result,
      recordData: pollResult.recordData
    };
    const fs2 = await import("fs");
    const debugFileName = `debug-jimeng-video-response-${Date.now()}.json`;
    fs2.writeFileSync(debugFileName, JSON.stringify(debugData, null, 2));
    console.log("\u{1F50D} \u5B8C\u6574\u89C6\u9891\u8FD4\u56DE\u6570\u636E\u5DF2\u4FDD\u5B58\u5230:", debugFileName);
    let videoUrl;
    if (itemList && itemList.length > 0) {
      const item = itemList[0];
      console.log("\u{1F50D} \u68C0\u67E5\u89C6\u9891\u6570\u636E\u7ED3\u6784 keys:", Object.keys(item || {}));
      videoUrl = ((_d = (_c = (_b = item == null ? void 0 : item.video) == null ? void 0 : _b.transcoded_video) == null ? void 0 : _c.origin) == null ? void 0 : _d.video_url) || ((_e = item == null ? void 0 : item.video) == null ? void 0 : _e.video_url) || ((_g = (_f = item == null ? void 0 : item.video) == null ? void 0 : _f.origin) == null ? void 0 : _g.video_url) || ((_h = item == null ? void 0 : item.common_attr) == null ? void 0 : _h.cover_url) || ((_i = item == null ? void 0 : item.aigc_video_params) == null ? void 0 : _i.video_url) || (item == null ? void 0 : item.url) || (item == null ? void 0 : item.video_url);
      console.log("\u{1F50D} \u5C1D\u8BD5\u7684URL\u8DEF\u5F84\u7ED3\u679C:", {
        "video?.transcoded_video?.origin?.video_url": (_l = (_k = (_j = item == null ? void 0 : item.video) == null ? void 0 : _j.transcoded_video) == null ? void 0 : _k.origin) == null ? void 0 : _l.video_url,
        "video?.video_url": (_m = item == null ? void 0 : item.video) == null ? void 0 : _m.video_url,
        "video?.origin?.video_url": (_o = (_n = item == null ? void 0 : item.video) == null ? void 0 : _n.origin) == null ? void 0 : _o.video_url,
        "common_attr?.cover_url": (_p = item == null ? void 0 : item.common_attr) == null ? void 0 : _p.cover_url,
        "aigc_video_params?.video_url": (_q = item == null ? void 0 : item.aigc_video_params) == null ? void 0 : _q.video_url,
        "url": item == null ? void 0 : item.url,
        "video_url": item == null ? void 0 : item.video_url
      });
      if (!videoUrl && (item == null ? void 0 : item.video)) {
        console.log("\u{1F50D} \u6DF1\u5EA6\u68C0\u67E5 video \u5BF9\u8C61 keys:", Object.keys(item.video || {}));
        if (item.video.transcoded_video) {
          console.log("\u{1F50D} \u68C0\u67E5 transcoded_video keys:", Object.keys(item.video.transcoded_video || {}));
        }
      }
    } else {
      console.log("\u{1F50D} \u8B66\u544A: itemList\u4E3A\u7A7A\u6216\u957F\u5EA6\u4E3A0");
    }
    console.log("\u{1F50D} \u591A\u5E27\u89C6\u9891\u751F\u6210\u7ED3\u679C:", videoUrl);
    return videoUrl;
  }
  async generateVideo(params) {
    var _a2, _b, _c, _d;
    if (!params.prompt || typeof params.prompt !== "string") {
      throw new Error("prompt\u5FC5\u987B\u662F\u975E\u7A7A\u5B57\u7B26\u4E32");
    }
    const isMultiFrameMode = params.multiFrames && params.multiFrames.length > 0;
    const modelName = params.model || (isMultiFrameMode ? "jimeng-video-multiframe" : DEFAULT_VIDEO_MODEL);
    const actualModel = this.getModel(modelName);
    console.log(`\u{1F50D} \u89C6\u9891\u751F\u6210\u6A21\u5F0F: ${isMultiFrameMode ? "\u667A\u80FD\u591A\u5E27" : "\u4F20\u7EDF\u6A21\u5F0F"}`);
    console.log(`\u{1F50D} \u4F7F\u7528\u6A21\u578B: ${modelName} -> ${actualModel}`);
    const creditInfo = await this.getCredit();
    if (creditInfo.totalCredit <= 0) {
      await this.receiveCredit();
    }
    if (isMultiFrameMode) {
      return this.generateMultiFrameVideo(params, actualModel);
    }
    let first_frame_image = void 0;
    let end_frame_image = void 0;
    if (params == null ? void 0 : params.filePath) {
      let uploadIDs = [];
      for (const item of params.filePath) {
        const uploadID = await this.uploadCoverFile(item);
        uploadIDs.push(uploadID);
      }
      if (uploadIDs[0]) {
        first_frame_image = {
          format: "",
          height: params.height || 1024,
          id: generateUuid(),
          image_uri: uploadIDs[0],
          name: "",
          platform_type: 1,
          source_from: "upload",
          type: "image",
          uri: uploadIDs[0],
          width: params.width || 1024
        };
      }
      if (uploadIDs[1]) {
        end_frame_image = {
          format: "",
          height: params.height || 1024,
          id: generateUuid(),
          image_uri: uploadIDs[1],
          name: "",
          platform_type: 1,
          source_from: "upload",
          type: "image",
          uri: uploadIDs[1],
          width: params.width || 1024
        };
      }
      if (!first_frame_image && !end_frame_image) {
        throw new Error("\u4E0A\u4F20\u5C01\u9762\u56FE\u7247\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u56FE\u7247\u8DEF\u5F84\u662F\u5426\u6B63\u786E");
      }
    }
    const componentId = generateUuid();
    const metricsExtra = jsonEncode({
      "enterFrom": "click",
      "isDefaultSeed": 1,
      "promptSource": "custom",
      "isRegenerate": false,
      "originSubmitId": generateUuid()
    });
    const rqParams = {
      msToken: generateMsToken(),
      aigc_features: "app_lip_sync",
      web_version: "6.6.0",
      "da_version": "3.2.9",
      "aid": parseInt(DEFAULT_ASSISTANT_ID),
      "device_platform": "web",
      "region": "cn",
      "webId": WEB_ID,
      "web_component_open_flag": 1
    };
    rqParams["a_bogus"] = generate_a_bogus(toUrlParams(rqParams), UA);
    const rqData = {
      "extend": {
        "root_model": end_frame_image ? MODEL_MAP["jimeng-video-3.0"] : actualModel,
        "m_video_commerce_info": {
          benefit_type: "basic_video_operation_vgfm_v_three",
          resource_id: "generate_video",
          resource_id_type: "str",
          resource_sub_type: "aigc"
        },
        "m_video_commerce_info_list": [{
          benefit_type: "basic_video_operation_vgfm_v_three",
          resource_id: "generate_video",
          resource_id_type: "str",
          resource_sub_type: "aigc"
        }]
      },
      "submit_id": generateUuid(),
      "metrics_extra": metricsExtra,
      "draft_content": jsonEncode({
        "type": "draft",
        "id": generateUuid(),
        "min_version": "3.0.5",
        "is_from_tsn": true,
        "version": "3.2.8",
        "main_component_id": componentId,
        "component_list": [{
          "type": "video_base_component",
          "id": componentId,
          "min_version": "1.0.0",
          "metadata": {
            "type": "",
            "id": generateUuid(),
            "created_platform": 3,
            "created_platform_version": "",
            "created_time_in_ms": Date.now(),
            "created_did": ""
          },
          "generate_type": "gen_video",
          "aigc_mode": "workbench",
          "abilities": {
            "type": "",
            "id": generateUuid(),
            "gen_video": {
              "id": generateUuid(),
              "type": "",
              "text_to_video_params": {
                "type": "",
                "id": generateUuid(),
                "model_req_key": actualModel,
                "priority": 0,
                "seed": Math.floor(Math.random() * 1e8) + 25e8,
                "video_aspect_ratio": "1:1",
                "video_gen_inputs": [{
                  duration_ms: 5e3,
                  first_frame_image,
                  end_frame_image,
                  fps: 24,
                  id: generateUuid(),
                  min_version: "3.0.5",
                  prompt: params.prompt,
                  resolution: params.resolution || "720p",
                  type: "",
                  video_mode: 2
                }]
              },
              "video_task_extra": metricsExtra
            }
          }
        }]
      })
    };
    const result = await this.request(
      "POST",
      "/mweb/v1/aigc_draft/generate",
      rqData,
      rqParams
    );
    const itemList = await this.pollResultWithHistory(result);
    const videoUrl = (_d = (_c = (_b = (_a2 = itemList == null ? void 0 : itemList[0]) == null ? void 0 : _a2.video) == null ? void 0 : _b.transcoded_video) == null ? void 0 : _c.origin) == null ? void 0 : _d.video_url;
    console.log("\u751F\u6210\u89C6\u9891\u7ED3\u679C:", videoUrl);
    return videoUrl;
  }
  /**
   * 视频补帧方法 - 将低帧率视频提升至30fps或60fps
   * 
   * 功能说明：
   * - 对已生成的视频进行帧插值处理，提升视频播放流畅度
   * - 支持24fps→30fps或24fps→60fps的帧率提升
   * - 使用AI技术生成中间帧，保持视频内容连贯性
   * 
   * @param params 补帧参数
   * @param params.videoId 原始视频ID
   * @param params.originHistoryId 原始生成历史ID
   * @param params.targetFps 目标帧率，支持30或60
   * @param params.originFps 原始视频帧率
   * @param params.duration 视频时长（毫秒），可选
   * @returns 处理后的高帧率视频URL
   */
  async frameInterpolation(params) {
    var _a2, _b, _c, _d, _e;
    console.log("\u{1F3AC} \u5F00\u59CB\u89C6\u9891\u8865\u5E27\u5904\u7406...");
    console.log(`\u{1F4CB} \u8865\u5E27\u53C2\u6570: ${params.originFps}fps -> ${params.targetFps}fps`);
    const creditInfo = await this.getCredit();
    if (creditInfo.totalCredit <= 0) {
      await this.receiveCredit();
    }
    const submitId = generateUuid();
    const modelKey = this.getModel("jimeng-video-multiframe");
    const metricsExtra = JSON.stringify({
      promptSource: "custom",
      isDefaultSeed: 1,
      originSubmitId: submitId,
      enterFrom: "click",
      isRegenerate: false,
      functionMode: "multi_frame"
    });
    const draftContent = {
      type: "draft",
      id: generateUuid(),
      min_version: "3.1.0",
      min_features: ["AIGC_GenerateType_VideoInsertFrame", "AIGC_GenerateType_VideoMultiFrame"],
      is_from_tsn: true,
      version: "3.2.9",
      main_component_id: generateUuid(),
      component_list: [{
        type: "video_base_component",
        id: generateUuid(),
        min_version: "1.0.0",
        aigc_mode: "workbench",
        metadata: {
          type: "",
          id: generateUuid(),
          created_platform: 3,
          created_platform_version: "",
          created_time_in_ms: Date.now().toString(),
          created_did: ""
        },
        generate_type: "gen_video",
        abilities: {
          type: "",
          id: generateUuid(),
          gen_video: {
            type: "",
            id: generateUuid(),
            text_to_video_params: {
              type: "",
              id: generateUuid(),
              video_gen_inputs: [{
                type: "",
                id: generateUuid(),
                min_version: "3.0.5",
                prompt: "\u89C6\u9891\u8865\u5E27\u5904\u7406",
                lens_motion_type: "",
                motion_speed: "",
                vid: params.videoId,
                video_mode: 2,
                fps: params.originFps,
                duration_ms: params.duration || 1e4,
                template_id: 0,
                v2v_opt: {
                  type: "",
                  id: generateUuid(),
                  min_version: "3.1.0",
                  insert_frame: {
                    type: "",
                    id: generateUuid(),
                    enable: true,
                    target_fps: params.targetFps,
                    origin_fps: params.originFps,
                    duration_ms: params.duration || 1e4
                  }
                },
                origin_history_id: params.originHistoryId,
                resolution: "720p"
              }]
            },
            scene: "insert_frame",
            video_task_extra: metricsExtra,
            video_ref_params: {
              type: "",
              id: generateUuid(),
              generate_type: 0,
              item_id: parseInt(params.videoId.replace("v", "")),
              origin_history_id: params.originHistoryId
            }
          },
          process_type: 3
        }
      }]
    };
    const requestData = {
      extend: {
        root_model: modelKey,
        m_video_commerce_info: {
          benefit_type: "video_frame_interpolation",
          resource_id: "generate_video",
          resource_id_type: "str",
          resource_sub_type: "aigc"
        },
        m_video_commerce_info_list: [{
          benefit_type: "video_frame_interpolation",
          resource_id: "generate_video",
          resource_id_type: "str",
          resource_sub_type: "aigc"
        }]
      },
      submit_id: submitId,
      metrics_extra: metricsExtra,
      draft_content: JSON.stringify(draftContent),
      http_common_info: { aid: 513695 }
    };
    const rqParams = {
      "babi_param": urlEncode(jsonEncode({
        "scenario": "image_video_generation",
        "feature_key": "aigc_to_video",
        "feature_entrance": "to_video",
        "feature_entrance_detail": "to_video-jimeng-video-multiframe"
      })),
      "aid": parseInt(DEFAULT_ASSISTANT_ID),
      "device_platform": "web",
      "region": "cn",
      "webId": WEB_ID,
      "web_component_open_flag": 1
    };
    rqParams["a_bogus"] = generate_a_bogus(toUrlParams(rqParams), UA);
    const result = await this.request(
      "POST",
      "/mweb/v1/aigc_draft/generate",
      requestData,
      rqParams
    );
    console.log("\u{1F50D} \u5F00\u59CB\u8F6E\u8BE2\u8865\u5E27\u7ED3\u679C...");
    const pollResult = await this.pollResultWithHistoryExtended(result);
    const itemList = pollResult.itemList;
    let videoUrl;
    if (itemList && itemList.length > 0) {
      const item = itemList[0];
      videoUrl = ((_c = (_b = (_a2 = item == null ? void 0 : item.video) == null ? void 0 : _a2.transcoded_video) == null ? void 0 : _b.origin) == null ? void 0 : _c.video_url) || ((_d = item == null ? void 0 : item.video) == null ? void 0 : _d.video_url) || ((_e = item == null ? void 0 : item.common_attr) == null ? void 0 : _e.cover_url);
    }
    console.log("\u{1F3AC} \u8865\u5E27\u5904\u7406\u5B8C\u6210:", videoUrl);
    return videoUrl;
  }
  /**
   * 视频分辨率提升方法 - 将低分辨率视频提升至更高分辨率
   * 
   * 功能说明：
   * - 对已生成的视频进行超分辨率处理，提升视频画质和清晰度
   * - 支持将视频分辨率提升至原来的2倍或更高（如704x1248 → 1408x2496）
   * - 使用AI技术重建视频细节，保持画面质量和内容完整性
   * 
   * @param params 分辨率提升参数
   * @param params.videoId 原始视频ID
   * @param params.originHistoryId 原始生成历史ID  
   * @param params.targetWidth 目标宽度
   * @param params.targetHeight 目标高度
   * @param params.originWidth 原始宽度
   * @param params.originHeight 原始高度
   * @returns 处理后的高分辨率视频URL
   */
  async superResolution(params) {
    var _a2, _b, _c, _d, _e;
    console.log("\u{1F3A8} \u5F00\u59CB\u89C6\u9891\u5206\u8FA8\u7387\u63D0\u5347\u5904\u7406...");
    console.log(`\u{1F4CB} \u5206\u8FA8\u7387\u63D0\u5347: ${params.originWidth}x${params.originHeight} -> ${params.targetWidth}x${params.targetHeight}`);
    const creditInfo = await this.getCredit();
    if (creditInfo.totalCredit <= 0) {
      await this.receiveCredit();
    }
    const submitId = generateUuid();
    const modelKey = this.getModel("jimeng-video-multiframe");
    const metricsExtra = JSON.stringify({
      promptSource: "custom",
      isDefaultSeed: 1,
      originSubmitId: submitId,
      enterFrom: "click",
      isRegenerate: false,
      functionMode: "multi_frame"
    });
    const draftContent = {
      type: "draft",
      id: generateUuid(),
      min_version: "3.1.0",
      min_features: ["AIGC_GenerateType_VideoSuperResolution", "AIGC_GenerateType_VideoMultiFrame"],
      is_from_tsn: true,
      version: "3.2.9",
      main_component_id: generateUuid(),
      component_list: [{
        type: "video_base_component",
        id: generateUuid(),
        min_version: "1.0.0",
        aigc_mode: "workbench",
        metadata: {
          type: "",
          id: generateUuid(),
          created_platform: 3,
          created_platform_version: "",
          created_time_in_ms: Date.now().toString(),
          created_did: ""
        },
        generate_type: "gen_video",
        abilities: {
          type: "",
          id: generateUuid(),
          gen_video: {
            type: "",
            id: generateUuid(),
            text_to_video_params: {
              type: "",
              id: generateUuid(),
              video_gen_inputs: [{
                type: "",
                id: generateUuid(),
                min_version: "3.0.5",
                prompt: "\u89C6\u9891\u5206\u8FA8\u7387\u63D0\u5347\u5904\u7406",
                lens_motion_type: "",
                motion_speed: "",
                vid: params.videoId,
                video_mode: 2,
                fps: 24,
                duration_ms: 1e4,
                template_id: 0,
                v2v_opt: {
                  type: "",
                  id: generateUuid(),
                  min_version: "3.1.0",
                  super_resolution: {
                    type: "",
                    id: generateUuid(),
                    enable: true,
                    target_width: params.targetWidth,
                    target_height: params.targetHeight,
                    origin_width: params.originWidth,
                    origin_height: params.originHeight
                  }
                },
                origin_history_id: params.originHistoryId,
                resolution: "720p"
              }]
            },
            scene: "super_resolution",
            video_task_extra: metricsExtra,
            video_ref_params: {
              type: "",
              id: generateUuid(),
              generate_type: 0,
              item_id: parseInt(params.videoId.replace("v", "")),
              origin_history_id: params.originHistoryId
            }
          },
          process_type: 2
        }
      }]
    };
    const requestData = {
      extend: {
        root_model: modelKey,
        m_video_commerce_info: {
          benefit_type: "video_upscale",
          resource_id: "generate_video",
          resource_id_type: "str",
          resource_sub_type: "aigc"
        },
        m_video_commerce_info_list: [{
          benefit_type: "video_upscale",
          resource_id: "generate_video",
          resource_id_type: "str",
          resource_sub_type: "aigc"
        }]
      },
      submit_id: submitId,
      metrics_extra: metricsExtra,
      draft_content: JSON.stringify(draftContent),
      http_common_info: { aid: 513695 }
    };
    const rqParams = {
      "babi_param": urlEncode(jsonEncode({
        "scenario": "image_video_generation",
        "feature_key": "aigc_to_video",
        "feature_entrance": "to_video",
        "feature_entrance_detail": "to_video-jimeng-video-multiframe"
      })),
      "aid": parseInt(DEFAULT_ASSISTANT_ID),
      "device_platform": "web",
      "region": "cn",
      "webId": WEB_ID,
      "web_component_open_flag": 1
    };
    rqParams["a_bogus"] = generate_a_bogus(toUrlParams(rqParams), UA);
    const result = await this.request(
      "POST",
      "/mweb/v1/aigc_draft/generate",
      requestData,
      rqParams
    );
    console.log("\u{1F50D} \u5F00\u59CB\u8F6E\u8BE2\u5206\u8FA8\u7387\u63D0\u5347\u7ED3\u679C...");
    const pollResult = await this.pollResultWithHistoryExtended(result);
    const itemList = pollResult.itemList;
    let videoUrl;
    if (itemList && itemList.length > 0) {
      const item = itemList[0];
      videoUrl = ((_c = (_b = (_a2 = item == null ? void 0 : item.video) == null ? void 0 : _a2.transcoded_video) == null ? void 0 : _b.origin) == null ? void 0 : _c.video_url) || ((_d = item == null ? void 0 : item.video) == null ? void 0 : _d.video_url) || ((_e = item == null ? void 0 : item.common_attr) == null ? void 0 : _e.cover_url);
    }
    console.log("\u{1F3A8} \u5206\u8FA8\u7387\u63D0\u5347\u5B8C\u6210:", videoUrl);
    return videoUrl;
  }
};
var getApiClient = () => {
  const token = process.env.JIMENG_API_TOKEN;
  console.log("\u{1F50D} [API Client Factory] Creating API client instance");
  console.log("\u{1F50D} [API Client Factory] Environment token available:", !!token);
  if (!token) {
    console.error("\u{1F50D} [API Client Factory] WARNING: JIMENG_API_TOKEN not found in environment variables");
    console.error(
      "\u{1F50D} [API Client Factory] Available env vars starting with JIMENG:",
      Object.keys(process.env).filter((key) => key.startsWith("JIMENG"))
    );
  }
  return new JimengApiClient(token);
};
var apiClient = null;
var generateImage = (params) => {
  console.log("\u{1F50D} [API Export] generateImage called with params:", JSON.stringify({
    filePath: params.filePath,
    prompt: params.prompt ? `${params.prompt.substring(0, 100)}...` : void 0,
    model: params.model,
    aspectRatio: params.aspectRatio,
    sample_strength: params.sample_strength,
    negative_prompt: params.negative_prompt,
    refresh_token: params.refresh_token ? "[PROVIDED]" : "[MISSING]"
  }, null, 2));
  if (!apiClient) {
    console.log("\u{1F50D} [API Export] Initializing API client on first use");
    apiClient = getApiClient();
  }
  console.log("\u{1F50D} [API Export] API Client instance available:", !!apiClient);
  return apiClient.generateImage(params);
};
var generateVideo = (params) => {
  if (!apiClient) {
    console.log("\u{1F50D} [API Export] Initializing API client for generateVideo");
    apiClient = getApiClient();
  }
  return apiClient.generateVideo(params);
};
var frameInterpolation = (params) => {
  if (!apiClient) {
    console.log("\u{1F50D} [API Export] Initializing API client for frameInterpolation");
    apiClient = getApiClient();
  }
  return apiClient.frameInterpolation(params);
};
var superResolution = (params) => {
  if (!apiClient) {
    console.log("\u{1F50D} [API Export] Initializing API client for superResolution");
    apiClient = getApiClient();
  }
  return apiClient.superResolution(params);
};

// src/server.ts
console.error("\u{1F680} [MCP DEBUG] server.ts loaded at:", (/* @__PURE__ */ new Date()).toISOString());
console.error("\u{1F680} [MCP DEBUG] Node.js version:", process.version);
console.error("\u{1F680} [MCP DEBUG] Working directory:", process.cwd());
console.error("\u{1F680} [MCP DEBUG] Environment token available:", !!process.env.JIMENG_API_TOKEN);
var _a;
console.error("\u{1F680} [MCP DEBUG] Environment token length:", ((_a = process.env.JIMENG_API_TOKEN) == null ? void 0 : _a.length) || "N/A");
var createServer = () => {
  console.error("\u{1F680} [MCP DEBUG] Creating MCP server instance...");
  const server = new McpServer({
    name: "Jimeng MCP Server",
    version: "1.0.0"
  });
  console.error("\u{1F680} [MCP DEBUG] MCP server instance created successfully");
  server.tool(
    "hello",
    { name: z.string().describe("\u8981\u95EE\u5019\u7684\u59D3\u540D") },
    async ({ name }) => ({
      content: [{ type: "text", text: `\u4F60\u597D\uFF0C${name}\uFF01` }]
    })
  );
  console.error("\u{1F680} [MCP DEBUG] Registering generateImage tool...");
  server.tool(
    "generateImage",
    {
      filePath: z.string().optional().describe("\u672C\u5730\u56FE\u7247\u8DEF\u5F84\u6216\u56FE\u7247URL\uFF08\u53EF\u9009\uFF0C\u82E5\u586B\u5199\u5219\u4E3A\u56FE\u7247\u6DF7\u5408/\u53C2\u8003\u56FE\u751F\u6210\u529F\u80FD\uFF09"),
      prompt: z.string().describe("\u751F\u6210\u56FE\u50CF\u7684\u6587\u672C\u63CF\u8FF0"),
      model: z.string().optional().describe("\u6A21\u578B\u540D\u79F0\uFF0C\u53EF\u9009\u503C: jimeng-4.0,jimeng-3.0, jimeng-2.1, jimeng-2.0-pro, jimeng-2.0, jimeng-1.4, jimeng-xl-pro"),
      aspectRatio: z.string().optional().default("auto").describe("\u5BBD\u9AD8\u6BD4\u9884\u8BBE\uFF0C\u652F\u6301\u4EE5\u4E0B\u9009\u9879: auto(\u667A\u80FD), 21:9(\u8D85\u5BBD\u5C4F), 16:9(\u6807\u51C6\u5BBD\u5C4F), 3:2(\u6444\u5F71), 4:3(\u4F20\u7EDF), 1:1(\u6B63\u65B9\u5F62), 3:4(\u7AD6\u5C4F), 2:3(\u4E66\u7C4D), 9:16(\u624B\u673A\u7AD6\u5C4F)"),
      sample_strength: z.number().min(0).max(1).optional().default(0.5).describe("\u7CBE\u7EC6\u5EA6\uFF0C\u8303\u56F40-1\uFF0C\u9ED8\u8BA40.5\u3002\u6570\u503C\u8D8A\u5C0F\u8D8A\u63A5\u8FD1\u53C2\u8003\u56FE"),
      negative_prompt: z.string().optional().default("").describe("\u53CD\u5411\u63D0\u793A\u8BCD\uFF0C\u544A\u8BC9\u6A21\u578B\u4E0D\u8981\u751F\u6210\u4EC0\u4E48\u5185\u5BB9")
    },
    async (params) => {
      var _a2, _b;
      console.error("\u{1F525} [MCP DEBUG] =================================");
      console.error("\u{1F525} [MCP DEBUG] generateImage tool called!");
      console.error("\u{1F525} [MCP DEBUG] Timestamp:", (/* @__PURE__ */ new Date()).toISOString());
      console.error("\u{1F525} [MCP DEBUG] Raw params received:", JSON.stringify(params, null, 2));
      console.error("\u{1F525} [MCP DEBUG] =================================");
      try {
        console.log("\u{1F50D} [MCP Server] Received raw parameters:", JSON.stringify(params, null, 2));
        const hasToken = !!process.env.JIMENG_API_TOKEN;
        console.log("\u{1F50D} [MCP Server] Environment token available:", hasToken);
        if (hasToken) {
          console.log("\u{1F50D} [MCP Server] Token length:", (_a2 = process.env.JIMENG_API_TOKEN) == null ? void 0 : _a2.length);
        }
        console.log("\u{1F50D} [MCP Server] Validated parameters for API call:");
        console.log("  - filePath:", params.filePath || "undefined");
        console.log("  - prompt:", params.prompt ? `"${params.prompt.substring(0, 50)}..."` : "undefined");
        console.log("  - model:", params.model || "undefined");
        console.log("  - aspectRatio:", params.aspectRatio || "undefined");
        console.log("  - sample_strength:", params.sample_strength);
        console.log("  - negative_prompt:", params.negative_prompt || "empty");
        const imageUrls = await generateImage({
          filePath: params.filePath,
          prompt: params.prompt,
          model: params.model,
          aspectRatio: params.aspectRatio,
          sample_strength: params.sample_strength,
          negative_prompt: params.negative_prompt
        });
        if (!imageUrls || Array.isArray(imageUrls) && imageUrls.length === 0) {
          return {
            content: [{ type: "text", text: "\u56FE\u50CF\u751F\u6210\u5931\u8D25\uFF1A\u672A\u80FD\u83B7\u53D6\u56FE\u50CFURL" }],
            isError: true
          };
        }
        let responseText = "";
        if (typeof imageUrls === "string") {
          responseText = imageUrls;
        } else if (Array.isArray(imageUrls)) {
          responseText = imageUrls.join("\n");
        }
        return {
          content: [{
            type: "text",
            text: responseText
          }]
        };
      } catch (error) {
        console.error("\u{1F50D} [MCP Server] Error caught in generateImage tool:");
        console.error("\u{1F50D} [MCP Server] Error type:", (_b = error == null ? void 0 : error.constructor) == null ? void 0 : _b.name);
        console.error("\u{1F50D} [MCP Server] Error message:", error instanceof Error ? error.message : String(error));
        if (error instanceof Error && error.stack) {
          console.error("\u{1F50D} [MCP Server] Error stack:", error.stack);
        }
        console.error("\u{1F50D} [MCP Server] Parameters when error occurred:", JSON.stringify({
          filePath: params.filePath,
          prompt: params.prompt ? `${params.prompt.substring(0, 100)}...` : void 0,
          model: params.model,
          aspectRatio: params.aspectRatio,
          sample_strength: params.sample_strength,
          negative_prompt: params.negative_prompt
        }, null, 2));
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `\u56FE\u50CF\u751F\u6210\u5931\u8D25: ${errorMessage}` }],
          isError: true
        };
      }
    }
  );
  console.error("\u{1F680} [MCP DEBUG] generateImage tool registered successfully");
  server.tool(
    "generateVideo",
    {
      filePath: z.array(z.string()).optional().describe("\u9996\u5E27\u548C\u5C3E\u5E27\u56FE\u7247\u8DEF\u5F84\uFF0C\u652F\u6301\u6570\u7EC4\uFF0C\u6700\u591A2\u4E2A\u5143\u7D20\uFF0C\u5206\u522B\u4E3A\u9996\u5E27\u548C\u5C3E\u5E27\uFF08\u4F20\u7EDF\u6A21\u5F0F\uFF09"),
      multiFrames: z.array(z.object({
        idx: z.number().describe("\u5E27\u7D22\u5F15"),
        duration_ms: z.number().min(1e3).max(5e3).describe("\u5E27\u6301\u7EED\u65F6\u95F4\uFF08\u6BEB\u79D2\uFF0C\u8303\u56F4\uFF1A1000-5000ms\uFF0C\u53731-5\u79D2\uFF09"),
        prompt: z.string().describe("\u8BE5\u5E27\u7684\u63D0\u793A\u8BCD"),
        image_path: z.string().describe("\u8BE5\u5E27\u7684\u56FE\u7247\u8DEF\u5F84")
      })).max(10).optional().describe("\u667A\u80FD\u591A\u5E27\u914D\u7F6E\uFF0C\u652F\u6301\u591A\u4E2A\u5173\u952E\u5E27\uFF08\u6700\u591A10\u5E27\uFF09"),
      resolution: z.string().optional().describe("\u5206\u8FA8\u7387\uFF0C\u53EF\u9009720p\u62161080p\uFF0C\u9ED8\u8BA4720p"),
      model: z.string().optional().describe("\u6A21\u578B\u540D\u79F0\uFF0C\u4F20\u7EDF\u6A21\u5F0F\u9ED8\u8BA4jimeng-video-3.0\uFF0C\u591A\u5E27\u6A21\u5F0F\u9ED8\u8BA4jimeng-video-multiframe"),
      prompt: z.string().describe("\u751F\u6210\u89C6\u9891\u7684\u6587\u672C\u63CF\u8FF0\uFF08\u4F20\u7EDF\u6A21\u5F0F\uFF09\u6216\u5168\u5C40\u63D0\u793A\u8BCD\uFF08\u591A\u5E27\u6A21\u5F0F\uFF09"),
      width: z.number().min(512).max(2560).optional().default(1024).describe("\u89C6\u9891\u5BBD\u5EA6\uFF0C\u8303\u56F4512-2560\uFF0C\u9ED8\u8BA41024"),
      height: z.number().min(512).max(2560).optional().default(1024).describe("\u89C6\u9891\u9AD8\u5EA6\uFF0C\u8303\u56F4512-2560\uFF0C\u9ED8\u8BA41024"),
      fps: z.number().min(12).max(30).optional().default(24).describe("\u5E27\u7387\uFF0C\u8303\u56F412-30\uFF0C\u9ED8\u8BA424\uFF08\u591A\u5E27\u6A21\u5F0F\uFF09"),
      duration_ms: z.number().min(3e3).max(15e3).optional().describe("\u603B\u65F6\u957F\uFF08\u6BEB\u79D2\uFF0C\u8303\u56F43000-15000ms\uFF0C\u591A\u5E27\u6A21\u5F0F\uFF09"),
      video_aspect_ratio: z.string().optional().describe("\u89C6\u9891\u6BD4\u4F8B\uFF0C\u5982'3:4'\uFF08\u591A\u5E27\u6A21\u5F0F\uFF09"),
      refresh_token: z.string().optional().describe("\u5373\u68A6API\u4EE4\u724C\uFF08\u53EF\u9009\uFF0C\u901A\u5E38\u4ECE\u73AF\u5883\u53D8\u91CF\u8BFB\u53D6\uFF09"),
      req_key: z.string().optional().describe("\u81EA\u5B9A\u4E49\u53C2\u6570\uFF0C\u517C\u5BB9\u65E7\u63A5\u53E3")
    },
    async (params) => {
      try {
        const videoUrl = await generateVideo({
          filePath: params.filePath,
          multiFrames: params.multiFrames,
          resolution: params.resolution,
          model: params.model,
          prompt: params.prompt,
          width: params.width,
          height: params.height,
          fps: params.fps,
          duration_ms: params.duration_ms,
          video_aspect_ratio: params.video_aspect_ratio,
          refresh_token: params.refresh_token,
          req_key: params.req_key
        });
        if (!videoUrl) {
          return {
            content: [{ type: "text", text: "\u89C6\u9891\u751F\u6210\u5931\u8D25\uFF1A\u672A\u80FD\u83B7\u53D6\u89C6\u9891URL" }],
            isError: true
          };
        }
        return {
          content: [{ type: "text", text: videoUrl }]
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `\u89C6\u9891\u751F\u6210\u5931\u8D25: ${errorMessage}` }],
          isError: true
        };
      }
    }
  );
  server.tool(
    "frameInterpolation",
    {
      videoId: z.string().describe("\u89C6\u9891ID"),
      originHistoryId: z.string().describe("\u539F\u59CB\u751F\u6210\u5386\u53F2ID"),
      targetFps: z.union([z.literal(30), z.literal(60)]).describe("\u76EE\u6807\u5E27\u7387\uFF1A30\u621660fps"),
      originFps: z.number().describe("\u539F\u59CB\u5E27\u7387"),
      duration: z.number().optional().describe("\u89C6\u9891\u65F6\u957F\uFF08\u6BEB\u79D2\uFF09\uFF0C\u53EF\u9009")
    },
    async (params) => {
      try {
        const videoUrl = await frameInterpolation({
          videoId: params.videoId,
          originHistoryId: params.originHistoryId,
          targetFps: params.targetFps,
          originFps: params.originFps,
          duration: params.duration
        });
        if (!videoUrl) {
          return {
            content: [{ type: "text", text: "\u89C6\u9891\u8865\u5E27\u5931\u8D25\uFF1A\u672A\u80FD\u83B7\u53D6\u5904\u7406\u540E\u7684\u89C6\u9891URL" }],
            isError: true
          };
        }
        return {
          content: [{ type: "text", text: videoUrl }]
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `\u89C6\u9891\u8865\u5E27\u5931\u8D25: ${errorMessage}` }],
          isError: true
        };
      }
    }
  );
  server.tool(
    "superResolution",
    {
      videoId: z.string().describe("\u89C6\u9891ID"),
      originHistoryId: z.string().describe("\u539F\u59CB\u751F\u6210\u5386\u53F2ID"),
      targetWidth: z.number().min(768).max(2560).describe("\u76EE\u6807\u5BBD\u5EA6\uFF0C\u8303\u56F4768-2560\u50CF\u7D20"),
      targetHeight: z.number().min(768).max(2560).describe("\u76EE\u6807\u9AD8\u5EA6\uFF0C\u8303\u56F4768-2560\u50CF\u7D20"),
      originWidth: z.number().describe("\u539F\u59CB\u5BBD\u5EA6"),
      originHeight: z.number().describe("\u539F\u59CB\u9AD8\u5EA6")
    },
    async (params) => {
      try {
        const videoUrl = await superResolution({
          videoId: params.videoId,
          originHistoryId: params.originHistoryId,
          targetWidth: params.targetWidth,
          targetHeight: params.targetHeight,
          originWidth: params.originWidth,
          originHeight: params.originHeight
        });
        if (!videoUrl) {
          return {
            content: [{ type: "text", text: "\u89C6\u9891\u5206\u8FA8\u7387\u63D0\u5347\u5931\u8D25\uFF1A\u672A\u80FD\u83B7\u53D6\u5904\u7406\u540E\u7684\u89C6\u9891URL" }],
            isError: true
          };
        }
        return {
          content: [{ type: "text", text: videoUrl }]
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `\u89C6\u9891\u5206\u8FA8\u7387\u63D0\u5347\u5931\u8D25: ${errorMessage}` }],
          isError: true
        };
      }
    }
  );
  server.resource(
    "greeting",
    new ResourceTemplate("greeting://{name}", { list: void 0 }),
    async (uri, { name }) => ({
      contents: [{
        uri: uri.href,
        text: `\u6B22\u8FCE\u4F7F\u7528Jimeng MCP\u670D\u52A1\u5668\uFF0C${name}\uFF01`
      }]
    })
  );
  server.resource(
    "info",
    "info://server",
    async (uri) => ({
      contents: [{
        uri: uri.href,
        text: `
            Jimeng MCP \u670D\u52A1\u5668
            \u7248\u672C: 1.0.0
            \u8FD0\u884C\u4E8E: ${process.platform}
            Node\u7248\u672C: ${process.version}
        `
      }]
    })
  );
  server.resource(
    "jimeng-ai",
    "jimeng-ai://info",
    async (uri) => ({
      contents: [{
        uri: uri.href,
        text: `
          \u5373\u68A6AI\u56FE\u50CF\u751F\u6210\u670D\u52A1
          -----------------
          \u901A\u8FC7\u4F7F\u7528 generateImage \u5DE5\u5177\u63D0\u4EA4\u56FE\u50CF\u751F\u6210\u8BF7\u6C42

          \u9700\u8981\u5728\u73AF\u5883\u53D8\u91CF\u4E2D\u8BBE\u7F6E:
          JIMENG_API_TOKEN - \u5373\u68A6API\u4EE4\u724C\uFF08\u4ECE\u5373\u68A6\u7F51\u7AD9\u83B7\u53D6\u7684sessionid\uFF09

          \u53C2\u6570\u8BF4\u660E:
          - filePath: \u672C\u5730\u56FE\u7247\u8DEF\u5F84\u6216\u56FE\u7247URL\uFF08\u53EF\u9009\uFF0C\u82E5\u586B\u5199\u5219\u4E3A\u56FE\u7247\u6DF7\u5408/\u53C2\u8003\u56FE\u751F\u6210\u529F\u80FD\uFF09
          - prompt: \u751F\u6210\u56FE\u50CF\u7684\u6587\u672C\u63CF\u8FF0\uFF08\u5FC5\u586B\uFF09
          - model: \u6A21\u578B\u540D\u79F0\uFF0C\u53EF\u9009\u503C: jimeng-3.0, jimeng-2.1, jimeng-2.0-pro, jimeng-2.0, jimeng-1.4, jimeng-xl-pro\uFF08\u53EF\u9009\uFF09
          - width: \u56FE\u50CF\u5BBD\u5EA6\uFF0C\u9ED8\u8BA4\u503C\uFF1A1024\uFF08\u53EF\u9009\uFF09
          - height: \u56FE\u50CF\u9AD8\u5EA6\uFF0C\u9ED8\u8BA4\u503C\uFF1A1024\uFF08\u53EF\u9009\uFF09
          - sample_strength: \u7CBE\u7EC6\u5EA6\uFF0C\u9ED8\u8BA4\u503C\uFF1A0.5\uFF0C\u8303\u56F40-1\uFF08\u53EF\u9009\uFF09
          - negative_prompt: \u53CD\u5411\u63D0\u793A\u8BCD\uFF0C\u544A\u8BC9\u6A21\u578B\u4E0D\u8981\u751F\u6210\u4EC0\u4E48\u5185\u5BB9\uFF08\u53EF\u9009\uFF09

          \u793A\u4F8B:
          generateImage({
            "filePath": "./test.png",
            "prompt": "\u4E00\u53EA\u53EF\u7231\u7684\u732B\u54AA",
            "model": "jimeng-2.1",
            "width": 1024,
            "height": 1024,
            "sample_strength": 0.7,
            "negative_prompt": "\u6A21\u7CCA\uFF0C\u626D\u66F2\uFF0C\u4F4E\u8D28\u91CF"
          })
        `
      }]
    })
  );
  server.resource(
    "jimeng-ai-video",
    "jimeng-ai-video://info",
    async (uri) => ({
      contents: [{
        uri: uri.href,
        text: `
          \u5373\u68A6AI\u89C6\u9891\u751F\u6210\u670D\u52A1
          -----------------
          \u901A\u8FC7\u4F7F\u7528 generateVideo \u5DE5\u5177\u63D0\u4EA4\u89C6\u9891\u751F\u6210\u8BF7\u6C42
          \u652F\u6301\u4F20\u7EDF\u9996\u5C3E\u5E27\u6A21\u5F0F\u548C\u667A\u80FD\u591A\u5E27\u6A21\u5F0F

          \u9700\u8981\u5728\u73AF\u5883\u53D8\u91CF\u4E2D\u8BBE\u7F6E:
          JIMENG_API_TOKEN - \u5373\u68A6API\u4EE4\u724C\uFF08\u4ECE\u5373\u68A6\u7F51\u7AD9\u83B7\u53D6\u7684sessionid\uFF09

          \u{1F3AC} \u4F20\u7EDF\u6A21\u5F0F\u53C2\u6570:
          - filePath: \u9996\u5E27\u548C\u5C3E\u5E27\u56FE\u7247\u8DEF\u5F84\uFF0C\u652F\u6301\u6570\u7EC4\uFF0C\u6700\u591A2\u4E2A\u5143\u7D20\uFF0C\u5206\u522B\u4E3A\u9996\u5E27\u548C\u5C3E\u5E27\uFF08\u53EF\u9009\uFF09
          - prompt: \u751F\u6210\u89C6\u9891\u7684\u6587\u672C\u63CF\u8FF0\uFF08\u5FC5\u586B\uFF09
          - model: \u6A21\u578B\u540D\u79F0\uFF0C\u9ED8\u8BA4jimeng-video-3.0\uFF08\u53EF\u9009\uFF09

          \u{1F3AD} \u667A\u80FD\u591A\u5E27\u6A21\u5F0F\u53C2\u6570:
          - multiFrames: \u667A\u80FD\u591A\u5E27\u914D\u7F6E\uFF0C\u652F\u6301\u591A\u4E2A\u5173\u952E\u5E27\uFF08\u6570\u7EC4\uFF0C\u6700\u591A10\u5E27\uFF09
            - idx: \u5E27\u7D22\u5F15
            - duration_ms: \u5E27\u6301\u7EED\u65F6\u95F4\uFF08\u6BEB\u79D2\uFF0C\u8303\u56F4\uFF1A1000-5000ms\uFF0C\u53731-5\u79D2\uFF09
            - prompt: \u8BE5\u5E27\u7684\u63D0\u793A\u8BCD
            - image_path: \u8BE5\u5E27\u7684\u56FE\u7247\u8DEF\u5F84
          - model: \u6A21\u578B\u540D\u79F0\uFF0C\u9ED8\u8BA4jimeng-video-multiframe\uFF08\u53EF\u9009\uFF09
          - fps: \u5E27\u7387\uFF0C\u9ED8\u8BA424\uFF08\u53EF\u9009\uFF09
          - duration_ms: \u603B\u65F6\u957F\uFF08\u6BEB\u79D2\uFF0C\u53EF\u9009\uFF09
          - video_aspect_ratio: \u89C6\u9891\u6BD4\u4F8B\uFF0C\u5982"3:4"\uFF08\u53EF\u9009\uFF09

          \u{1F527} \u901A\u7528\u53C2\u6570:
          - resolution: \u5206\u8FA8\u7387\uFF0C\u53EF\u9009720p\u62161080p\uFF0C\u9ED8\u8BA4720p\uFF08\u53EF\u9009\uFF09
          - width: \u89C6\u9891\u5BBD\u5EA6\uFF0C\u9ED8\u8BA41024\uFF08\u53EF\u9009\uFF09
          - height: \u89C6\u9891\u9AD8\u5EA6\uFF0C\u9ED8\u8BA41024\uFF08\u53EF\u9009\uFF09
          - refresh_token: \u5373\u68A6API\u4EE4\u724C\uFF08\u53EF\u9009\uFF0C\u901A\u5E38\u4ECE\u73AF\u5883\u53D8\u91CF\u8BFB\u53D6\uFF09
          - req_key: \u81EA\u5B9A\u4E49\u53C2\u6570\uFF0C\u517C\u5BB9\u65E7\u63A5\u53E3\uFF08\u53EF\u9009\uFF09

          \u{1F4DD} \u4F20\u7EDF\u6A21\u5F0F\u793A\u4F8B:
          generateVideo({
            "filePath": ["./first.png", "./last.png"],
            "prompt": "\u4E00\u53EA\u5C0F\u72D7\u5728\u8349\u5730\u4E0A\u5954\u8DD1\uFF0C\u9633\u5149\u660E\u5A9A\uFF0C\u9AD8\u6E05",
            "model": "jimeng-video-3.0",
            "resolution": "720p"
          })

          \u{1F4DD} \u667A\u80FD\u591A\u5E27\u6A21\u5F0F\u793A\u4F8B:
          generateVideo({
            "multiFrames": [
              {
                "idx": 0,
                "duration_ms": 3000,
                "prompt": "\u524D\u63A8",
                "image_path": "./frame1.png"
              },
              {
                "idx": 1,
                "duration_ms": 2000,
                "prompt": "\u540E\u63A8",
                "image_path": "./frame2.png"
              }
            ],
            "prompt": "\u573A\u666F\u5207\u6362\u52A8\u753B",
            "model": "jimeng-video-multiframe",
            "duration_ms": 5000,
            "video_aspect_ratio": "3:4"
          })
        `
      }]
    })
  );
  return server;
};
var startServer = async () => {
  const server = createServer();
  const transport = new StdioServerTransport();
  console.log("Jimeng MCP Server \u6B63\u5728\u542F\u52A8...");
  await server.connect(transport);
  console.log("Jimeng MCP Server \u5DF2\u542F\u52A8");
  return { server, transport };
};

export {
  ASPECT_RATIO_PRESETS,
  ImageDimensionCalculator,
  generateImage,
  generateVideo,
  createServer,
  startServer
};
//# sourceMappingURL=chunk-LEG7AZ4A.js.map