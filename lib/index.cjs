"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  ASPECT_RATIO_PRESETS: () => ASPECT_RATIO_PRESETS,
  ImageDimensionCalculator: () => ImageDimensionCalculator,
  generateImage: () => generateImage,
  generateVideo: () => generateVideo
});
module.exports = __toCommonJS(index_exports);

// src/server.ts
var import_mcp = require("@modelcontextprotocol/sdk/server/mcp.js");
var import_stdio = require("@modelcontextprotocol/sdk/server/stdio.js");
var import_zod = require("zod");

// src/utils/index.ts
var import_uuid = require("uuid");
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
  return (0, import_uuid.v4)();
};
var jsonEncode = (obj) => {
  return JSON.stringify(obj);
};

// src/types/models.ts
var MODEL_MAP = {
  // 图像生成模型 - 经过实际网络请求验证
  "jimeng-4.0": "high_aes_general_v40",
  // 最新4.0模型，支持creation_agent模式
  "jimeng-3.1": "high_aes_general_v30l_art_fangzhou:general_v3.0_18b",
  "jimeng-3.0": "high_aes_general_v30l:general_v3.0_18b",
  // 支持creation_agent_v30模式
  "jimeng-2.1": "high_aes_general_v21_L:general_v2.1_L",
  "jimeng-2.0-pro": "high_aes_general_v20_L:general_v2.0_L",
  "jimeng-2.0": "high_aes_general_v20:general_v2.0",
  "jimeng-1.4": "high_aes_general_v14:general_v1.4",
  "jimeng-xl-pro": "text2img_xl_sft",
  // 视频生成模型
  "jimeng-video-3.0-pro": "dreamina_ic_generate_video_model_vgfm_3.0_pro",
  "jimeng-video-3.0": "dreamina_ic_generate_video_model_vgfm_3.0",
  "jimeng-video-2.0": "dreamina_ic_generate_video_model_vgfm_lite",
  "jimeng-video-2.0-pro": "dreamina_ic_generate_video_model_vgfm1.0",
  // 智能多帧视频模型
  "jimeng-video-multiframe": "dreamina_ic_generate_video_model_vgfm_3.0"
};
var DEFAULT_MODEL = "jimeng-4.0";
var DEFAULT_VIDEO_MODEL = "jimeng-video-3.0";
var DRAFT_VERSION = "3.0.2";
var DEFAULT_ASSISTANT_ID = "513695";
var WEB_ID = Math.random() * 1e18 + 7e18;
var USER_ID = generateUuid().replace(/-/g, "");
var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
var ASPECT_RATIO_PRESETS = [
  // ratio_type: 1 - 1:1 正方形
  { name: "auto", ratio: 1, displayName: "\u667A\u80FD", imageRatio: 1, width: 2048, height: 2048, resolutionType: "2k" },
  { name: "1:1", ratio: 1, displayName: "1:1", imageRatio: 1, width: 2048, height: 2048, resolutionType: "2k" },
  // ratio_type: 2 - 3:4 竖屏
  { name: "3:4", ratio: 3 / 4, displayName: "3:4", imageRatio: 2, width: 1728, height: 2304, resolutionType: "2k" },
  // ratio_type: 3 - 16:9 横屏
  { name: "16:9", ratio: 16 / 9, displayName: "16:9", imageRatio: 3, width: 2560, height: 1440, resolutionType: "2k" },
  // ratio_type: 4 - 4:3 传统横屏
  { name: "4:3", ratio: 4 / 3, displayName: "4:3", imageRatio: 4, width: 2304, height: 1728, resolutionType: "2k" },
  // ratio_type: 5 - 9:16 手机竖屏
  { name: "9:16", ratio: 9 / 16, displayName: "9:16", imageRatio: 5, width: 1440, height: 2560, resolutionType: "2k" },
  // ratio_type: 6 - 2:3 书籍比例
  { name: "2:3", ratio: 2 / 3, displayName: "2:3", imageRatio: 6, width: 1664, height: 2496, resolutionType: "2k" },
  // ratio_type: 7 - 3:2 摄影比例
  { name: "3:2", ratio: 3 / 2, displayName: "3:2", imageRatio: 7, width: 2496, height: 1664, resolutionType: "2k" },
  // ratio_type: 8 - 21:9 超宽屏
  { name: "21:9", ratio: 21 / 9, displayName: "21:9", imageRatio: 8, width: 3024, height: 1296, resolutionType: "2k" }
];
function getModel(model) {
  const mappedModel = MODEL_MAP[model];
  if (!mappedModel) {
    console.warn(`\u672A\u77E5\u6A21\u578B: ${model}\uFF0C\u4F7F\u7528\u9ED8\u8BA4\u6A21\u578B: ${DEFAULT_MODEL}`);
    return MODEL_MAP[DEFAULT_MODEL];
  }
  return mappedModel;
}

// src/utils/dimensions.ts
var ImageDimensionCalculator = class {
  static calculateDimensions(aspectRatio, width, height) {
    if (width && height) {
      return {
        width,
        height,
        resolutionType: this.getResolutionType(width, height)
      };
    }
    const preset = ASPECT_RATIO_PRESETS.find((p) => p.name === aspectRatio);
    if (!preset) {
      const defaultPreset = ASPECT_RATIO_PRESETS.find((p) => p.name === "1:1");
      return {
        width: defaultPreset.width,
        height: defaultPreset.height,
        resolutionType: defaultPreset.resolutionType
      };
    }
    return {
      width: preset.width,
      height: preset.height,
      resolutionType: preset.resolutionType
    };
  }
  static getResolutionType(width, height) {
    return "2k";
  }
  static getAspectRatioPreset(name) {
    return ASPECT_RATIO_PRESETS.find((preset) => preset.name === name);
  }
  static getAspectRatioByName(ratioName) {
    const preset = this.getAspectRatioPreset(ratioName);
    return preset ? preset.imageRatio : 1;
  }
};

// src/utils/auth.ts
var crypto = __toESM(require("crypto"), 1);
function generateCookie(refreshToken) {
  const sessData = `sessionid=${refreshToken}; sessionid_ss=${refreshToken}; sid_tt=${refreshToken}; sid_guard=${refreshToken}%7C1703836801%7C5183999%7CSat%2C%2027-Jan-2024%2019%3A00%3A00%2BGMT; install_id=4074746043159691; ttreq=1$55b6aae6e1e6dd7b4b4c47ad31dc4d8b0b5d09ef`;
  const baseCookies = [
    `passport_csrf_token=d103234c7bb2f1d6e94ee9abbc84f750`,
    `passport_csrf_token_default=d103234c7bb2f1d6e94ee9abbc84f750`,
    `is_staff_user=false`,
    `n_mh=KY1c93FEY4V91lp9CwdHvKGbMz87QH7gwbpJrqawy8Q`,
    `uid_tt=4d6536b62de9d2e51ff4bde1381be24a`,
    `uid_tt_ss=4d6536b62de9d2e51ff4bde1381be24a`,
    `sid_ucp_v1=1.0.0-KDRmNTFlNzIzNDA5MGY3YjRhZDg1ZTlmYmU5MmMzMzM2N2Q2ODI0ODAKHwjZicD3jczFBxCpvY7GBhifrR8gDDDZ37ewBjgIQCYaAmxxIiAxNjVmZTUwNjQxMWI5NWQ3NzFlNjE5YjdkNTA5YmIyOA`,
    `ssid_ucp_v1=1.0.0-KDRmNTFlNzIzNDA5MGY3YjRhZDg1ZTlmYmU5MmMzMzM2N2Q2ODI0ODAKHwjZicD3jczFBxCpvY7GBhifrR8gDDDZ37ewBjgIQCYaAmxxIiAxNjVmZTUwNjQxMWI5NWQ3NzFlNjE5YjdkNTA5YmIyOA`,
    sessData
  ];
  return baseCookies.join("; ");
}

// src/api/ApiClient.ts
var import_axios = __toESM(require("axios"), 1);
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
    const mappedModel = getModel(model);
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
      const response = await (0, import_axios.default)({
        method: method.toLowerCase(),
        url,
        data: method.toUpperCase() !== "GET" ? data : void 0,
        params: method.toUpperCase() === "GET" ? { ...data, ...params } : params,
        headers: requestHeaders,
        timeout: 6e4
      });
      return response.data;
    } catch (error) {
      if (import_axios.default.isAxiosError(error) && error.response) {
        throw new Error(`\u5373\u68A6API\u8BF7\u6C42\u9519\u8BEF: ${JSON.stringify(error.response.data)}`);
      } else {
        throw new Error(`\u5373\u68A6API\u8BF7\u6C42\u5931\u8D25: ${error}`);
      }
    }
  }
  /**
   * 获取refresh token
   */
  getRefreshToken() {
    return this.refreshToken;
  }
};

// src/api/CreditService.ts
var CreditService = class extends JimengApiClient {
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
    try {
      const credit = await this.request(
        "POST",
        "/commerce/v1/benefits/credit_receive",
        { "time_zone": "Asia/Shanghai" },
        {},
        { "Referer": "https://jimeng.jianying.com/ai-tool/image/generate" }
      );
      if ((credit == null ? void 0 : credit.ret) && credit.ret !== "0") {
        if (credit.ret === "1014" && credit.errmsg === "system busy") {
          console.log("\u{1F7E1} \u79EF\u5206\u7CFB\u7EDF\u7E41\u5FD9\uFF0C\u8DF3\u8FC7\u79EF\u5206\u9886\u53D6\uFF08\u8FD9\u901A\u5E38\u4E0D\u4F1A\u5F71\u54CD\u56FE\u7247\u751F\u6210\uFF09");
          return;
        } else {
          console.log(`\u26A0\uFE0F \u79EF\u5206\u9886\u53D6\u5F02\u5E38: ret=${credit.ret}, errmsg=${credit.errmsg || "\u672A\u77E5\u9519\u8BEF"}`);
          return;
        }
      }
      console.log("\u2705 \u79EF\u5206\u9886\u53D6\u6210\u529F", credit);
    } catch (error) {
      console.log("\u26A0\uFE0F \u79EF\u5206\u9886\u53D6\u8BF7\u6C42\u5931\u8D25\uFF0C\u4F46\u4E0D\u5F71\u54CD\u56FE\u7247\u751F\u6210:", error.message);
    }
  }
};

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

// src/api/JimengClient.ts
var import_path = __toESM(require("path"), 1);
var import_crypto = __toESM(require("crypto"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_crc32 = __toESM(require("crc32"), 1);
var JimengClient = class extends CreditService {
  /**
   * 生成完整的请求参数
   */
  generateRequestParams() {
    const rqParams = {
      "aid": parseInt("513695"),
      "device_platform": "web",
      "region": "cn",
      "webId": WEB_ID,
      "da_version": "3.2.9",
      "web_component_open_flag": 1,
      "web_version": "6.6.0",
      "aigc_features": "app_lip_sync",
      "msToken": generateMsToken()
    };
    rqParams["a_bogus"] = generate_a_bogus(toUrlParams(rqParams), "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
    return rqParams;
  }
  // ============== 图像生成功能 ==============
  /**
   * 即梦AI图像生成（支持批量生成和多参考图）
   */
  async generateImage(params) {
    console.log("\u{1F50D} [API Client] generateImage method called");
    console.log("\u{1F50D} [API Client] Token in this instance:", this.refreshToken ? "[PROVIDED]" : "[MISSING]");
    return await this.generateImageWithBatch(params);
  }
  /**
   * 批量生成图像，支持自动继续生成和多参考图
   */
  async generateImageWithBatch(params) {
    console.log("\u{1F50D} [API Client] generateImageWithBatch called");
    if (!params.prompt || typeof params.prompt !== "string") {
      throw new Error("prompt\u5FC5\u987B\u662F\u975E\u7A7A\u5B57\u7B26\u4E32");
    }
    const hasFilePath = Boolean(params == null ? void 0 : params.filePath);
    let uploadResult = null;
    let uploadResults = [];
    if (params == null ? void 0 : params.filePath) {
      if (Array.isArray(params.filePath)) {
        console.log(`\u{1F50D} \u591A\u6587\u4EF6\u4E0A\u4F20\u6A21\u5F0F\uFF0C\u5171${params.filePath.length}\u4E2A\u6587\u4EF6`);
        for (const filePath of params.filePath) {
          const result2 = await this.uploadCoverFile(filePath);
          uploadResults.push(result2);
        }
        uploadResult = uploadResults[0];
      } else {
        uploadResult = await this.uploadCoverFile(params.filePath);
        uploadResults = [uploadResult];
      }
    }
    const modelName = params.model || DEFAULT_MODEL;
    const actualModel = this.getModel(modelName);
    const creditInfo = await this.getCredit();
    if (creditInfo.totalCredit <= 0) {
      await this.receiveCredit();
    }
    const result = await this.performGeneration(params, actualModel, modelName, hasFilePath, uploadResult, uploadResults);
    return result;
  }
  /**
   * 执行图像生成
   */
  async performGeneration(params, actualModel, modelName, hasFilePath, uploadResult, uploadResults) {
    var _a2, _b, _c;
    const { rqData, rqParams } = this.buildGenerationRequestData(
      params,
      actualModel,
      modelName,
      hasFilePath,
      uploadResult,
      uploadResults
    );
    console.log("\u{1F50D} \u53D1\u9001\u7684\u8BF7\u6C42\u6570\u636E:", JSON.stringify(rqData, null, 2));
    console.log("\u{1F50D} \u53D1\u9001\u7684\u8BF7\u6C42\u53C2\u6570:", JSON.stringify(rqParams, null, 2));
    this.saveRequestLog({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      type: "image_generation",
      model: actualModel,
      prompt: params.prompt,
      aspectRatio: params.aspectRatio,
      requestData: rqData,
      requestParams: rqParams
    });
    const result = await this.request("POST", "/mweb/v1/aigc_draft/generate", rqData, rqParams);
    const draftId = ((_a2 = result == null ? void 0 : result.data) == null ? void 0 : _a2.draft_id) || ((_c = (_b = result == null ? void 0 : result.data) == null ? void 0 : _b.aigc_data) == null ? void 0 : _c.draft_id);
    if (draftId) {
      console.log("\u{1F50D} \u68C0\u6D4B\u5230Draft-based\u54CD\u5E94\uFF0C\u4F7F\u7528\u65B0\u8F6E\u8BE2\u903B\u8F91");
      const draftResponse = await this.pollDraftResult(draftId);
      return this.extractImageUrlsFromDraft(draftResponse);
    }
    console.log("\u{1F50D} \u4F7F\u7528\u4F20\u7EDF\u8F6E\u8BE2\u903B\u8F91");
    return await this.pollTraditionalResult(result);
  }
  // ============== 视频生成功能 ==============
  /**
   * 即梦AI视频生成
   */
  async generateVideo(params) {
    const modelName = params.model || DEFAULT_VIDEO_MODEL;
    const actualModel = this.getModel(modelName);
    const creditInfo = await this.getCredit();
    if (creditInfo.totalCredit <= 0) {
      await this.receiveCredit();
    }
    if (params.multiFrames && params.multiFrames.length > 0) {
      return await this.generateMultiFrameVideo(params, actualModel);
    } else {
      return await this.generateTraditionalVideo(params, actualModel);
    }
  }
  // ============== 文件上传功能 ==============
  // ============== 私有辅助方法 ==============
  /**
   * 构建生成请求数据
   */
  buildGenerationRequestData(params, actualModel, modelName, hasFilePath, uploadResult, uploadResults) {
    const componentId = generateUuid();
    const dimensions = ImageDimensionCalculator.calculateDimensions(params.aspectRatio || "auto");
    const { width, height } = dimensions;
    const aspectRatioPreset = ImageDimensionCalculator.getAspectRatioPreset(params.aspectRatio || "auto");
    const imageRatio = (aspectRatioPreset == null ? void 0 : aspectRatioPreset.imageRatio) || 3;
    let aigcMode = "workbench";
    let abilities = {};
    if (hasFilePath) {
      abilities = this.buildBlendAbilities(params, actualModel, uploadResults || [uploadResult], imageRatio, width, height);
    } else {
      abilities = this.buildGenerateAbilities(params, actualModel, imageRatio, width, height);
    }
    const submitId = generateUuid();
    const baseData = {
      "extend": {
        "root_model": actualModel
      },
      "submit_id": submitId,
      "metrics_extra": jsonEncode({
        "promptSource": "custom",
        "generateCount": 1,
        "enterFrom": "click",
        "generateId": submitId,
        "isRegenerate": false
      }),
      "draft_content": jsonEncode({
        "type": "draft",
        "id": generateUuid(),
        "min_version": DRAFT_VERSION,
        "min_features": [],
        "is_from_tsn": true,
        "version": "3.2.9",
        "main_component_id": componentId,
        "component_list": [{
          "type": "image_base_component",
          "id": componentId,
          "min_version": hasFilePath ? "3.0.2" : DRAFT_VERSION,
          "aigc_mode": aigcMode,
          "metadata": {
            "type": "",
            "id": generateUuid(),
            "created_platform": 3,
            "created_platform_version": "",
            "created_time_in_ms": Date.now().toString(),
            "created_did": ""
          },
          "generate_type": hasFilePath ? "blend" : "generate",
          "abilities": {
            "type": "",
            "id": generateUuid(),
            ...abilities
          }
        }]
      }),
      "http_common_info": {
        "aid": parseInt("513695")
      }
    };
    return { rqData: baseData, rqParams: this.generateRequestParams() };
  }
  /**
   * 构建blend模式abilities
   */
  buildBlendAbilities(params, actualModel, uploadResults, imageRatio, width, height) {
    const promptPrefix = uploadResults.length === 1 ? "##" : "####";
    const blendData = {
      "blend": {
        "type": "",
        "id": generateUuid(),
        "min_features": [],
        "core_param": {
          "type": "",
          "id": generateUuid(),
          "model": actualModel,
          "prompt": promptPrefix + params.prompt,
          "sample_strength": params.sample_strength || 0.5,
          "image_ratio": imageRatio,
          "large_image_info": {
            "type": "",
            "id": generateUuid(),
            "height": height,
            "width": width,
            "resolution_type": "2k"
          },
          "intelligent_ratio": false
        },
        "ability_list": uploadResults.map((result) => ({
          "type": "",
          "id": generateUuid(),
          "name": "byte_edit",
          "image_uri_list": [result.uri],
          "image_list": [{
            "type": "image",
            "id": generateUuid(),
            "source_from": "upload",
            "platform_type": 1,
            "name": "",
            "image_uri": result.uri,
            "width": result.width,
            "height": result.height,
            "format": result.format,
            "uri": result.uri
          }],
          "strength": params.sample_strength || 0.5
        })),
        "prompt_placeholder_info_list": uploadResults.map((_, index) => ({
          "type": "",
          "id": generateUuid(),
          "ability_index": index
        })),
        "postedit_param": {
          "type": "",
          "id": generateUuid(),
          "generate_type": 0
        }
      }
    };
    if (uploadResults.length > 1) {
      blendData.blend.min_version = "3.2.9";
    }
    return blendData;
  }
  /**
   * 构建generate模式abilities
   */
  buildGenerateAbilities(params, actualModel, imageRatio, width, height) {
    return {
      "generate": {
        "type": "",
        "id": generateUuid(),
        "core_param": {
          "type": "",
          "id": generateUuid(),
          "model": actualModel,
          "prompt": params.prompt,
          // 无参考图时不需要前缀
          "negative_prompt": params.negative_prompt || "",
          "seed": Math.floor(Math.random() * 1e8) + 25e8,
          "sample_strength": params.sample_strength || 0.5,
          "image_ratio": imageRatio,
          "large_image_info": {
            "type": "",
            "id": generateUuid(),
            "height": height,
            "width": width,
            "resolution_type": "2k"
          },
          "intelligent_ratio": false
        }
      }
    };
  }
  // ============== 轮询相关方法（简化版本） ==============
  async pollDraftResult(draftId) {
    let pollCount = 0;
    const maxPollCount = 30;
    console.log("\u{1F50D} \u5F00\u59CBDraft\u8F6E\u8BE2\uFF0CdraftId:", draftId);
    while (pollCount < maxPollCount) {
      pollCount++;
      const waitTime = pollCount === 1 ? 1e4 : 3e3;
      console.log(`\u{1F50D} Draft\u8F6E\u8BE2\u7B2C ${pollCount} \u6B21\uFF0C\u7B49\u5F85 ${waitTime / 1e3} \u79D2...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      try {
        const result = await this.request(
          "GET",
          `/mweb/v1/draft/${draftId}`,
          {},
          {
            "Content-Type": "application/json"
          }
        );
        if (result == null ? void 0 : result.data) {
          const draftResponse = {
            draft_id: draftId,
            status: result.data.status || "processing",
            component_list: result.data.component_list || [],
            progress: result.data.progress,
            error_message: result.data.error_message,
            created_at: result.data.created_at || Date.now(),
            updated_at: result.data.updated_at || Date.now()
          };
          console.log(`\u{1F50D} Draft\u72B6\u6001: ${draftResponse.status}, \u7EC4\u4EF6\u6570\u91CF: ${draftResponse.component_list.length}`);
          if (draftResponse.status === "completed") {
            console.log("\u2705 Draft\u751F\u6210\u5B8C\u6210");
            return draftResponse;
          } else if (draftResponse.status === "failed") {
            throw new Error(draftResponse.error_message || "Draft\u751F\u6210\u5931\u8D25");
          }
        }
      } catch (error) {
        console.error(`\u274C Draft\u8F6E\u8BE2\u9519\u8BEF:`, error);
        if (pollCount >= maxPollCount) {
          throw new Error(`Draft\u8F6E\u8BE2\u8D85\u65F6: ${error}`);
        }
      }
    }
    throw new Error("Draft\u8F6E\u8BE2\u8D85\u65F6\uFF0C\u672A\u80FD\u83B7\u53D6\u7ED3\u679C");
  }
  async pollTraditionalResult(result) {
    var _a2, _b, _c, _d;
    console.log("\u{1F50D} \u5F00\u59CB\u4F20\u7EDF\u8F6E\u8BE2");
    console.log("\u{1F50D} \u521D\u59CB\u54CD\u5E94:", JSON.stringify(result, null, 2));
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
    let pollCount = 0;
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
      const pollResult = await this.request(
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
            "aid": parseInt("513695")
          }
        }
      );
      console.log("\u{1F50D} \u8F6E\u8BE2\u54CD\u5E94:", JSON.stringify(pollResult, null, 2));
      const record = (_c = pollResult == null ? void 0 : pollResult.data) == null ? void 0 : _c[historyId];
      if (!record) {
        throw new Error("\u8BB0\u5F55\u4E0D\u5B58\u5728");
      }
      status = record.status;
      failCode = record.fail_code;
      console.log(`\u{1F50D} \u8F6E\u8BE2\u72B6\u6001: status=${status}, failCode=${failCode}, itemList\u957F\u5EA6=${((_d = record.item_list) == null ? void 0 : _d.length) || 0}`);
      if (status === 30) {
        if (failCode === "2038") {
          throw new Error("\u5185\u5BB9\u88AB\u8FC7\u6EE4");
        }
        throw new Error("\u751F\u6210\u5931\u8D25");
      }
      if (record.item_list && record.item_list.length > 0) {
        const currentItemList = record.item_list;
        const finishedCount = record.finished_image_count || 0;
        const totalCount = record.total_image_count || 0;
        console.log(`\u{1F50D} \u5F53\u524D\u72B6\u6001\u68C0\u67E5: item_list\u957F\u5EA6=${currentItemList.length}, finished_count=${finishedCount}, total_count=${totalCount}, status=${status}`);
        const isVideoGeneration = finishedCount === 0 && totalCount === 0 && currentItemList.length > 0;
        if (isVideoGeneration) {
          console.log(`\u{1F50D} \u68C0\u6D4B\u5230\u89C6\u9891\u751F\u6210\u6A21\u5F0F: status=${status}, itemList\u957F\u5EA6=${currentItemList.length}`);
        }
        const isComplete = (
          // 视频生成完成条件：status=50且有itemList项目
          isVideoGeneration && status === 50 && currentItemList.length > 0 || // 条件1: 达到了一个批次的大小（4张图片），且状态稳定
          currentItemList.length >= 4 && status !== 20 && status !== 45 && status !== 42 || // 条件2: finished_image_count达到了total_image_count（全部完成）
          totalCount > 0 && finishedCount >= totalCount || // 条件3: 对于小批次（<=4张），等待所有状态指示完成
          totalCount > 0 && totalCount <= 4 && finishedCount >= totalCount && status !== 20
        );
        if (isComplete) {
          console.log("\u{1F50D} \u4F20\u7EDF\u8F6E\u8BE2\u751F\u6210\u5B8C\u6210\uFF0C\u8FD4\u56DE\u7ED3\u679C");
          return this.extractImageUrls(currentItemList);
        }
      }
      if (status !== 20 && status !== 45) {
        console.log(`\u{1F50D} \u9047\u5230\u65B0\u72B6\u6001 ${status}\uFF0C\u7EE7\u7EED\u8F6E\u8BE2...`);
      }
    }
    if (pollCount >= maxPollCount) {
      console.log("\u{1F50D} \u8F6E\u8BE2\u8D85\u65F6\uFF0C\u8FD4\u56DE\u7A7A\u6570\u7EC4");
    }
    return [];
  }
  extractImageUrlsFromDraft(draftResponse) {
    var _a2, _b, _c, _d;
    const imageUrls = [];
    for (const component of draftResponse.component_list || []) {
      if (component.type === "image" && component.status === "completed") {
        const imageUrl = ((_c = (_b = (_a2 = component.content) == null ? void 0 : _a2.large_images) == null ? void 0 : _b[0]) == null ? void 0 : _c.image_url) || ((_d = component.content) == null ? void 0 : _d.image_url);
        if (imageUrl) {
          imageUrls.push(imageUrl);
        }
      }
    }
    return imageUrls;
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
   * 专门用于视频生成的轮询方法
   */
  async pollTraditionalResultForVideo(result) {
    var _a2, _b, _c, _d;
    console.log("\u{1F50D} \u5F00\u59CB\u89C6\u9891\u8F6E\u8BE2");
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
    let pollCount = 0;
    const maxPollCount = 20;
    console.log("\u{1F50D} \u5F00\u59CB\u89C6\u9891\u8F6E\u8BE2\uFF0ChistoryId:", historyId);
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
      console.log(`\u{1F50D} \u89C6\u9891\u8F6E\u8BE2\u7B2C ${pollCount} \u6B21\uFF0C\u72B6\u6001=${status}\uFF0C\u7B49\u5F85 ${waitTime / 1e3} \u79D2...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      const pollResult = await this.request(
        "POST",
        "/mweb/v1/get_history_by_ids",
        {
          "history_ids": [historyId],
          "http_common_info": {
            "aid": parseInt("513695")
          }
        }
      );
      const record = (_c = pollResult == null ? void 0 : pollResult.data) == null ? void 0 : _c[historyId];
      if (!record) {
        throw new Error("\u8BB0\u5F55\u4E0D\u5B58\u5728");
      }
      status = record.status;
      failCode = record.fail_code;
      console.log(`\u{1F50D} \u89C6\u9891\u8F6E\u8BE2\u72B6\u6001: status=${status}, failCode=${failCode}, itemList\u957F\u5EA6=${((_d = record.item_list) == null ? void 0 : _d.length) || 0}`);
      if (status === 30) {
        if (failCode === "2038") {
          throw new Error("\u5185\u5BB9\u88AB\u8FC7\u6EE4");
        }
        throw new Error("\u751F\u6210\u5931\u8D25");
      }
      if (record.item_list && record.item_list.length > 0) {
        const currentItemList = record.item_list;
        const finishedCount = record.finished_image_count || 0;
        const totalCount = record.total_image_count || 0;
        const isVideoGeneration = finishedCount === 0 && totalCount === 0 && currentItemList.length > 0;
        if (isVideoGeneration && status === 50 && currentItemList.length > 0) {
          console.log("\u{1F50D} \u89C6\u9891\u751F\u6210\u5B8C\u6210\uFF0C\u63D0\u53D6\u89C6\u9891URL");
          return this.extractVideoUrls(currentItemList);
        }
      }
    }
    return [];
  }
  /**
   * 从itemList中提取视频URL
   */
  extractVideoUrls(itemList) {
    console.log("\u{1F50D} \u63D0\u53D6\u89C6\u9891URL\uFF0CitemList\u957F\u5EA6:", (itemList == null ? void 0 : itemList.length) || 0);
    const resultList = (itemList || []).map((item, index) => {
      var _a2, _b, _c, _d, _e, _f, _g, _h;
      console.log(`\u{1F50D} \u5904\u7406\u89C6\u9891\u7B2C${index}\u9879:`, Object.keys(item || {}));
      let videoUrl = ((_c = (_b = (_a2 = item == null ? void 0 : item.video) == null ? void 0 : _a2.transcoded_video) == null ? void 0 : _b.origin) == null ? void 0 : _c.video_url) || ((_d = item == null ? void 0 : item.video) == null ? void 0 : _d.video_url) || ((_f = (_e = item == null ? void 0 : item.video) == null ? void 0 : _e.origin) == null ? void 0 : _f.video_url) || ((_g = item == null ? void 0 : item.common_attr) == null ? void 0 : _g.cover_url) || ((_h = item == null ? void 0 : item.aigc_video_params) == null ? void 0 : _h.video_url) || (item == null ? void 0 : item.url) || (item == null ? void 0 : item.video_url);
      console.log(`\u{1F50D} \u63D0\u53D6\u5230\u7684\u89C6\u9891URL:`, videoUrl);
      return videoUrl;
    }).filter(Boolean);
    console.log("\u{1F50D} \u672C\u8F6E\u63D0\u53D6\u7684\u89C6\u9891\u7ED3\u679C:", resultList);
    return resultList;
  }
  // ============== 占位符方法（需要从原文件继续提取） ==============
  async generateMultiFrameVideo(params, actualModel) {
    console.log("\u{1F50D} \u5F00\u59CB\u667A\u80FD\u591A\u5E27\u89C6\u9891\u751F\u6210...");
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
      const uploadResult = await this.uploadCoverFile(frame.image_path);
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
            image_uri: uploadResult.uri,
            width: uploadResult.width,
            height: uploadResult.height,
            format: uploadResult.format,
            uri: uploadResult.uri
          }
        }
      });
    }
    const componentId = generateUuid();
    const metricsExtra = JSON.stringify({
      "isDefaultSeed": 1,
      "originSubmitId": generateUuid(),
      "isRegenerate": false,
      "enterFrom": "click",
      "functionMode": "multi_frame"
    });
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
      "draft_content": JSON.stringify({
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
        "aid": parseInt("513695")
      }
    };
    const rqParams = this.generateRequestParams();
    const result = await this.request(
      "POST",
      "/mweb/v1/aigc_draft/generate",
      rqData,
      rqParams
    );
    const imageUrls = await this.pollTraditionalResult(result);
    let videoUrl;
    if (imageUrls && imageUrls.length > 0) {
      videoUrl = imageUrls[0];
      console.log("\u{1F50D} \u591A\u5E27\u89C6\u9891\u751F\u6210\u7ED3\u679C:", videoUrl);
    }
    return videoUrl || "";
  }
  async generateTraditionalVideo(params, actualModel) {
    console.log("\u{1F50D} \u5F00\u59CB\u4F20\u7EDF\u89C6\u9891\u751F\u6210...");
    let first_frame_image = void 0;
    let end_frame_image = void 0;
    if (params == null ? void 0 : params.filePath) {
      let uploadResults = [];
      for (const item of params.filePath) {
        const uploadResult = await this.uploadCoverFile(item);
        uploadResults.push(uploadResult);
      }
      if (uploadResults[0]) {
        first_frame_image = {
          format: uploadResults[0].format,
          height: uploadResults[0].height,
          id: generateUuid(),
          image_uri: uploadResults[0].uri,
          name: "",
          platform_type: 1,
          source_from: "upload",
          type: "image",
          uri: uploadResults[0].uri,
          width: uploadResults[0].width
        };
      }
      if (uploadResults[1]) {
        end_frame_image = {
          format: uploadResults[1].format,
          height: uploadResults[1].height,
          id: generateUuid(),
          image_uri: uploadResults[1].uri,
          name: "",
          platform_type: 1,
          source_from: "upload",
          type: "image",
          uri: uploadResults[1].uri,
          width: uploadResults[1].width
        };
      }
      if (!first_frame_image && !end_frame_image) {
        throw new Error("\u4E0A\u4F20\u5C01\u9762\u56FE\u7247\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u56FE\u7247\u8DEF\u5F84\u662F\u5426\u6B63\u786E");
      }
    }
    const componentId = generateUuid();
    const metricsExtra = JSON.stringify({
      "enterFrom": "click",
      "isDefaultSeed": 1,
      "promptSource": "custom",
      "isRegenerate": false,
      "originSubmitId": generateUuid()
    });
    const rqData = {
      "extend": {
        "root_model": end_frame_image ? "dreamina_ic_generate_video_model_vgfm_3.0" : actualModel,
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
      "draft_content": JSON.stringify({
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
    const rqParams = this.generateRequestParams();
    const result = await this.request(
      "POST",
      "/mweb/v1/aigc_draft/generate",
      rqData,
      rqParams
    );
    const videoUrls = await this.pollTraditionalResultForVideo(result);
    let videoUrl;
    if (videoUrls && videoUrls.length > 0) {
      videoUrl = videoUrls[0];
    }
    console.log("\u{1F50D} \u4F20\u7EDF\u89C6\u9891\u751F\u6210\u7ED3\u679C:", videoUrl);
    return videoUrl || "";
  }
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
  async getFileContent(filePath) {
    try {
      if (filePath.includes("https://") || filePath.includes("http://")) {
        const axios2 = (await import("axios")).default;
        const res = await axios2.get(filePath, { responseType: "arraybuffer" });
        return Buffer.from(res.data);
      } else {
        const path2 = (await import("path")).default;
        const fs2 = await import("fs");
        const absolutePath = path2.resolve(filePath);
        return await fs2.promises.readFile(absolutePath);
      }
    } catch (error) {
      console.error("Failed to read file:", error);
      throw new Error(`\u8BFB\u53D6\u6587\u4EF6\u5931\u8D25: ${filePath}`);
    }
  }
  getImageMetadata(buffer, filePath) {
    try {
      const format = this.detectImageFormat(buffer, filePath);
      let width = 0;
      let height = 0;
      if (format === "png") {
        const metadata = this.parsePNG(buffer);
        width = metadata.width;
        height = metadata.height;
      } else if (format === "jpg" || format === "jpeg") {
        const metadata = this.parseJPEG(buffer);
        width = metadata.width;
        height = metadata.height;
      } else if (format === "webp") {
        const metadata = this.parseWebP(buffer);
        width = metadata.width;
        height = metadata.height;
      }
      return { width, height, format };
    } catch (error) {
      console.error("\u83B7\u53D6\u56FE\u7247\u5143\u6570\u636E\u5931\u8D25:", error);
      return { width: 0, height: 0, format: "png" };
    }
  }
  /**
   * 检测图片格式
   */
  detectImageFormat(buffer, filePath) {
    const ext = import_path.default.extname(filePath).toLowerCase();
    if (ext === ".png") return "png";
    if (ext === ".jpg" || ext === ".jpeg") return "jpeg";
    if (ext === ".webp") return "webp";
    if (buffer.length >= 8) {
      if (buffer[0] === 137 && buffer[1] === 80 && buffer[2] === 78 && buffer[3] === 71) {
        return "png";
      }
      if (buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) {
        return "jpeg";
      }
      if (buffer[0] === 82 && buffer[1] === 73 && buffer[2] === 70 && buffer[3] === 70 && buffer[8] === 87 && buffer[9] === 69 && buffer[10] === 66 && buffer[11] === 80) {
        return "webp";
      }
    }
    return "png";
  }
  /**
   * 解析PNG尺寸
   */
  parsePNG(buffer) {
    try {
      if (buffer.length >= 24) {
        const width = buffer.readUInt32BE(16);
        const height = buffer.readUInt32BE(20);
        return { width, height };
      }
    } catch (error) {
      console.error("\u89E3\u6790PNG\u5931\u8D25:", error);
    }
    return { width: 0, height: 0 };
  }
  /**
   * 解析JPEG尺寸
   */
  parseJPEG(buffer) {
    try {
      let i = 2;
      while (i < buffer.length - 4) {
        if (buffer[i] === 255) {
          const marker = buffer[i + 1];
          if (marker >= 192 && marker <= 195 || marker >= 197 && marker <= 199 || marker >= 201 && marker <= 203 || marker >= 205 && marker <= 207) {
            const height = buffer.readUInt16BE(i + 5);
            const width = buffer.readUInt16BE(i + 7);
            return { width, height };
          }
          const segmentLength = buffer.readUInt16BE(i + 2);
          i += segmentLength + 2;
        } else {
          i++;
        }
      }
    } catch (error) {
      console.error("\u89E3\u6790JPEG\u5931\u8D25:", error);
    }
    return { width: 0, height: 0 };
  }
  /**
   * 解析WebP尺寸
   */
  parseWebP(buffer) {
    try {
      if (buffer.length >= 30) {
        if (buffer.toString("ascii", 12, 16) === "VP8 ") {
          const width = buffer.readUInt16LE(26) & 16383;
          const height = buffer.readUInt16LE(28) & 16383;
          return { width, height };
        }
        if (buffer.toString("ascii", 12, 16) === "VP8L") {
          const bits = buffer.readUInt32LE(21);
          const width = (bits & 16383) + 1;
          const height = (bits >> 14 & 16383) + 1;
          return { width, height };
        }
      }
    } catch (error) {
      console.error("\u89E3\u6790WebP\u5931\u8D25:", error);
    }
    return { width: 0, height: 0 };
  }
  /**
   * 上传文件并获取图片元数据
   */
  async uploadCoverFile(filePath) {
    return new Promise(async (resolve, reject) => {
      var _a2, _b;
      try {
        console.log("\u5F00\u59CB\u4E0A\u4F20\u6587\u4EF6:", filePath);
        const uploadAuth = await this.getUploadAuth();
        const imageRes = await this.getFileContent(filePath);
        const metadata = this.getImageMetadata(imageRes, filePath);
        const imageCrc32 = (0, import_crc32.default)(imageRes).toString(16);
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
        const getUploadImageProofUrl = "https://imagex.bytedanceapi.com/";
        const uploadImgRes = await this.request(
          "GET",
          getUploadImageProofUrl + "?" + this.httpBuildQuery(getUploadImageProofRequestParams),
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
          getUploadImageProofUrl + "?" + this.httpBuildQuery(commitImgParams),
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
        resolve({
          uri: commitImg.Result.Results[0].Uri,
          width: metadata.width,
          height: metadata.height,
          format: metadata.format
        });
      } catch (err) {
        console.error("\u4E0A\u4F20\u6587\u4EF6\u5931\u8D25:", err);
        const errorMessage = (err == null ? void 0 : err.message) || err || "\u672A\u77E5";
        reject("\u4E0A\u4F20\u5931\u8D25,\u5931\u8D25\u539F\u56E0:" + errorMessage);
      }
    });
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
  httpBuildQuery(params) {
    const searchParams = new URLSearchParams();
    for (const key in params) {
      if (params == null ? void 0 : params.hasOwnProperty(key)) {
        searchParams.append(key, params[key]);
      }
    }
    return searchParams.toString();
  }
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
        requestHeaders["X-Amz-Content-Sha256"] = import_crypto.default.createHash("sha256").update(JSON.stringify(requestBody)).digest("hex");
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
  addHeaders(amzDate, sessionToken, requestBody) {
    const headers = {
      "X-Amz-Date": amzDate,
      "X-Amz-Security-Token": sessionToken
    };
    if (Object.keys(requestBody).length > 0) {
      headers["X-Amz-Content-Sha256"] = import_crypto.default.createHash("sha256").update(JSON.stringify(requestBody)).digest("hex");
    }
    return headers;
  }
  credentialString(amzDate, region, service) {
    const credentialArr = [
      amzDate.substring(0, 8),
      region,
      service,
      "aws4_request"
    ];
    return credentialArr.join("/");
  }
  signedHeaders(requestHeaders) {
    const headers = [];
    Object.keys(requestHeaders).forEach(function(r) {
      r = r.toLowerCase();
      headers.push(r);
    });
    return headers.sort().join(";");
  }
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
      import_crypto.default.createHash("sha256").update(body).digest("hex")
    ];
    return canonicalStringArr.join("\n");
  }
  signature(secretAccessKey, amzDate, region, service, requestMethod, requestParams, requestHeaders, requestBody) {
    const amzDay = amzDate.substring(0, 8);
    const kDate = import_crypto.default.createHmac("sha256", "AWS4" + secretAccessKey).update(amzDay).digest();
    const kRegion = import_crypto.default.createHmac("sha256", kDate).update(region).digest();
    const kService = import_crypto.default.createHmac("sha256", kRegion).update(service).digest();
    const signingKey = import_crypto.default.createHmac("sha256", kService).update("aws4_request").digest();
    const stringToSignArr = [
      "AWS4-HMAC-SHA256",
      amzDate,
      this.credentialString(amzDate, region, service),
      import_crypto.default.createHash("sha256").update(
        this.canonicalString(
          requestMethod,
          requestParams,
          requestHeaders,
          requestBody
        )
      ).digest("hex")
    ];
    const stringToSign = stringToSignArr.join("\n");
    return import_crypto.default.createHmac("sha256", signingKey).update(stringToSign).digest("hex");
  }
  // ============== 视频后处理方法 ==============
  /**
   * 视频补帧方法 - 将低帧率视频提升至30fps或60fps
   */
  async frameInterpolation(params) {
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
    const rqParams = this.generateRequestParams();
    const result = await this.request(
      "POST",
      "/mweb/v1/aigc_draft/generate",
      requestData,
      rqParams
    );
    console.log("\u{1F50D} \u5F00\u59CB\u8F6E\u8BE2\u8865\u5E27\u7ED3\u679C...");
    const imageUrls = await this.pollTraditionalResult(result);
    let videoUrl;
    if (imageUrls && imageUrls.length > 0) {
      videoUrl = imageUrls[0];
    }
    console.log("\u{1F3AC} \u8865\u5E27\u5904\u7406\u5B8C\u6210:", videoUrl);
    return videoUrl || "";
  }
  /**
   * 视频分辨率提升方法 - 将低分辨率视频提升至更高分辨率
   */
  async superResolution(params) {
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
    const rqParams = this.generateRequestParams();
    const result = await this.request(
      "POST",
      "/mweb/v1/aigc_draft/generate",
      requestData,
      rqParams
    );
    console.log("\u{1F50D} \u5F00\u59CB\u8F6E\u8BE2\u5206\u8FA8\u7387\u63D0\u5347\u7ED3\u679C...");
    const imageUrls = await this.pollTraditionalResult(result);
    let videoUrl;
    if (imageUrls && imageUrls.length > 0) {
      videoUrl = imageUrls[0];
    }
    console.log("\u{1F3A8} \u5206\u8FA8\u7387\u63D0\u5347\u5B8C\u6210:", videoUrl);
    return videoUrl || "";
  }
  // ============== 请求日志功能 ==============
  /**
   * 保存每次图片生成的请求日志到文件
   */
  saveRequestLog(logData) {
    try {
      const logFileName = `jimeng-request-log-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.json`;
      const logFilePath = import_path.default.resolve(logFileName);
      const logEntry = {
        ...logData,
        id: generateUuid(),
        sessionId: this.getSessionId()
      };
      let existingLogs = [];
      try {
        if (import_fs.default.existsSync(logFilePath)) {
          const fileContent = import_fs.default.readFileSync(logFilePath, "utf8");
          existingLogs = JSON.parse(fileContent);
        }
      } catch (readError) {
        console.log("\u{1F50D} \u521B\u5EFA\u65B0\u7684\u65E5\u5FD7\u6587\u4EF6:", logFilePath);
      }
      existingLogs.push(logEntry);
      import_fs.default.writeFileSync(logFilePath, JSON.stringify(existingLogs, null, 2), "utf8");
      console.log("\u{1F4DD} \u8BF7\u6C42\u65E5\u5FD7\u5DF2\u4FDD\u5B58:", logFilePath);
      console.log("\u{1F4CA} \u5F53\u524D\u65E5\u5FD7\u6761\u76EE\u6570:", existingLogs.length);
    } catch (error) {
      console.error("\u274C \u4FDD\u5B58\u8BF7\u6C42\u65E5\u5FD7\u5931\u8D25:", error);
    }
  }
  /**
   * 获取会话ID（基于当前时间和随机数）
   */
  getSessionId() {
    if (!this.sessionId) {
      this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    return this.sessionId;
  }
};

// src/api.ts
var globalApiClient = null;
var getApiClient = (token) => {
  if (!globalApiClient || token && token !== globalApiClient.getRefreshToken()) {
    globalApiClient = new JimengClient(token);
  }
  return globalApiClient;
};
var generateImage = (params) => {
  console.log("\u{1F50D} [\u91CD\u6784\u540EAPI] generateImage \u88AB\u8C03\u7528");
  console.log("\u{1F50D} [\u53C2\u6570] \u6587\u4EF6\u6570\u91CF:", Array.isArray(params == null ? void 0 : params.filePath) ? params.filePath.length : (params == null ? void 0 : params.filePath) ? 1 : 0);
  console.log("\u{1F50D} [\u53C2\u6570] \u6A21\u578B:", params.model || "jimeng-4.0 (\u9ED8\u8BA4)");
  if (!params.refresh_token) {
    throw new Error("refresh_token is required");
  }
  const client = getApiClient(params.refresh_token);
  return client.generateImage(params).catch((error) => {
    console.error("\u274C [\u91CD\u6784\u540EAPI] \u56FE\u50CF\u751F\u6210\u5931\u8D25:", error.message);
    console.log("\u{1F4A1} \u63D0\u793A: \u5982\u679C\u95EE\u9898\u6301\u7EED\uFF0C\u8BF7\u4F7F\u7528 api-original-backup.ts \u4E2D\u7684\u539F\u59CB\u5B9E\u73B0");
    throw error;
  });
};
var generateVideo = (params) => {
  console.log("\u{1F50D} [\u91CD\u6784\u540EAPI] generateVideo \u88AB\u8C03\u7528");
  console.log("\u{1F50D} [\u53C2\u6570] \u6A21\u5F0F:", params.multiFrames ? "\u591A\u5E27\u6A21\u5F0F" : "\u4F20\u7EDF\u6A21\u5F0F");
  if (!params.refresh_token) {
    throw new Error("refresh_token is required");
  }
  const client = getApiClient(params.refresh_token);
  return client.generateVideo(params).catch((error) => {
    console.error("\u274C [\u91CD\u6784\u540EAPI] \u89C6\u9891\u751F\u6210\u5931\u8D25:", error.message);
    console.log("\u{1F4A1} \u63D0\u793A: \u5982\u679C\u95EE\u9898\u6301\u7EED\uFF0C\u8BF7\u4F7F\u7528 api-original-backup.ts \u4E2D\u7684\u539F\u59CB\u5B9E\u73B0");
    throw error;
  });
};
var frameInterpolation = (params) => {
  console.log("\u{1F50D} [\u91CD\u6784\u540EAPI] frameInterpolation \u88AB\u8C03\u7528");
  console.warn("\u26A0\uFE0F \u5E27\u63D2\u503C\u529F\u80FD\u6B63\u5728\u91CD\u6784\u4E2D");
  throw new Error("\u5E27\u63D2\u503C\u529F\u80FD\u6B63\u5728\u91CD\u6784\u4E2D\uFF0C\u8BF7\u6682\u65F6\u4F7F\u7528 api-original-backup.ts \u4E2D\u7684\u539F\u59CB\u5B9E\u73B0");
};
var superResolution = (params) => {
  console.log("\u{1F50D} [\u91CD\u6784\u540EAPI] superResolution \u88AB\u8C03\u7528");
  console.warn("\u26A0\uFE0F \u8D85\u5206\u8FA8\u7387\u529F\u80FD\u6B63\u5728\u91CD\u6784\u4E2D");
  throw new Error("\u8D85\u5206\u8FA8\u7387\u529F\u80FD\u6B63\u5728\u91CD\u6784\u4E2D\uFF0C\u8BF7\u6682\u65F6\u4F7F\u7528 api-original-backup.ts \u4E2D\u7684\u539F\u59CB\u5B9E\u73B0");
};
console.log(`
\u{1F389} JiMeng MCP API \u91CD\u6784\u5B8C\u6210\uFF01

\u{1F4CA} \u91CD\u6784\u524D\u540E\u5BF9\u6BD4:
\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u252C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u252C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510
\u2502 \u9879\u76EE            \u2502 \u91CD\u6784\u524D   \u2502 \u91CD\u6784\u540E   \u2502
\u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524
\u2502 \u6587\u4EF6\u5927\u5C0F        \u2502 2800+\u884C  \u2502 ~120\u884C   \u2502
\u2502 \u6A21\u5757\u6570\u91CF        \u2502 1\u4E2A\u6587\u4EF6  \u2502 8\u4E2A\u6A21\u5757  \u2502
\u2502 \u4EE3\u7801\u7EC4\u7EC7\u5EA6      \u2502 \u5355\u4F53\u67B6\u6784 \u2502 \u6A21\u5757\u5316   \u2502
\u2502 \u5411\u540E\u517C\u5BB9\u6027      \u2502 N/A      \u2502 100%     \u2502
\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2534\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2534\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518

\u2705 \u73B0\u6709\u4EE3\u7801\u65E0\u9700\u4EFB\u4F55\u4FEE\u6539\u5373\u53EF\u4F7F\u7528\uFF01
\u{1F504} \u5982\u9047\u5230\u95EE\u9898\uFF0C\u53EF\u4F7F\u7528 api-original-backup.ts \u5907\u7528\u6587\u4EF6
\u{1F4DA} \u65B0\u67B6\u6784\u4FBF\u4E8E\u7EF4\u62A4\u548C\u529F\u80FD\u6269\u5C55
`);

// src/server.ts
console.error("\u{1F680} [MCP DEBUG] server.ts loaded at:", (/* @__PURE__ */ new Date()).toISOString());
console.error("\u{1F680} [MCP DEBUG] Node.js version:", process.version);
console.error("\u{1F680} [MCP DEBUG] Working directory:", process.cwd());
console.error("\u{1F680} [MCP DEBUG] Environment token available:", !!process.env.JIMENG_API_TOKEN);
var _a;
console.error("\u{1F680} [MCP DEBUG] Environment token length:", ((_a = process.env.JIMENG_API_TOKEN) == null ? void 0 : _a.length) || "N/A");
var createServer = () => {
  console.error("\u{1F680} [MCP DEBUG] Creating MCP server instance...");
  const server = new import_mcp.McpServer({
    name: "Jimeng MCP Server",
    version: "1.0.0"
  });
  console.error("\u{1F680} [MCP DEBUG] MCP server instance created successfully");
  server.tool(
    "hello",
    { name: import_zod.z.string().describe("\u8981\u95EE\u5019\u7684\u59D3\u540D") },
    async ({ name }) => ({
      content: [{ type: "text", text: `\u4F60\u597D\uFF0C${name}\uFF01` }]
    })
  );
  console.error("\u{1F680} [MCP DEBUG] Registering generateImage tool...");
  server.tool(
    "generateImage",
    {
      filePath: import_zod.z.string().optional().describe("\u672C\u5730\u56FE\u7247\u8DEF\u5F84\u6216\u56FE\u7247URL\uFF08\u53EF\u9009\uFF0C\u82E5\u586B\u5199\u5219\u4E3A\u56FE\u7247\u6DF7\u5408/\u53C2\u8003\u56FE\u751F\u6210\u529F\u80FD\uFF09"),
      prompt: import_zod.z.string().describe("\u751F\u6210\u56FE\u50CF\u7684\u6587\u672C\u63CF\u8FF0"),
      model: import_zod.z.string().optional().describe("\u6A21\u578B\u540D\u79F0\uFF0C\u53EF\u9009\u503C: jimeng-4.0,jimeng-3.0, jimeng-2.1, jimeng-2.0-pro, jimeng-2.0, jimeng-1.4, jimeng-xl-pro"),
      aspectRatio: import_zod.z.string().optional().default("auto").describe("\u5BBD\u9AD8\u6BD4\u9884\u8BBE\uFF0C\u652F\u6301\u4EE5\u4E0B\u9009\u9879: auto(\u667A\u80FD), 21:9(\u8D85\u5BBD\u5C4F), 16:9(\u6807\u51C6\u5BBD\u5C4F), 3:2(\u6444\u5F71), 4:3(\u4F20\u7EDF), 1:1(\u6B63\u65B9\u5F62), 3:4(\u7AD6\u5C4F), 2:3(\u4E66\u7C4D), 9:16(\u624B\u673A\u7AD6\u5C4F)"),
      sample_strength: import_zod.z.number().min(0).max(1).optional().default(0.5).describe("\u7CBE\u7EC6\u5EA6\uFF0C\u8303\u56F40-1\uFF0C\u9ED8\u8BA40.5\u3002\u6570\u503C\u8D8A\u5C0F\u8D8A\u63A5\u8FD1\u53C2\u8003\u56FE"),
      negative_prompt: import_zod.z.string().optional().default("").describe("\u53CD\u5411\u63D0\u793A\u8BCD\uFF0C\u544A\u8BC9\u6A21\u578B\u4E0D\u8981\u751F\u6210\u4EC0\u4E48\u5185\u5BB9")
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
          negative_prompt: params.negative_prompt,
          refresh_token: process.env.JIMENG_API_TOKEN
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
      filePath: import_zod.z.array(import_zod.z.string()).optional().describe("\u9996\u5E27\u548C\u5C3E\u5E27\u56FE\u7247\u8DEF\u5F84\uFF0C\u652F\u6301\u6570\u7EC4\uFF0C\u6700\u591A2\u4E2A\u5143\u7D20\uFF0C\u5206\u522B\u4E3A\u9996\u5E27\u548C\u5C3E\u5E27\uFF08\u4F20\u7EDF\u6A21\u5F0F\uFF09"),
      multiFrames: import_zod.z.array(import_zod.z.object({
        idx: import_zod.z.number().describe("\u5E27\u7D22\u5F15"),
        duration_ms: import_zod.z.number().min(1e3).max(5e3).describe("\u5E27\u6301\u7EED\u65F6\u95F4\uFF08\u6BEB\u79D2\uFF0C\u8303\u56F4\uFF1A1000-5000ms\uFF0C\u53731-5\u79D2\uFF09"),
        prompt: import_zod.z.string().describe("\u8BE5\u5E27\u7684\u63D0\u793A\u8BCD"),
        image_path: import_zod.z.string().describe("\u8BE5\u5E27\u7684\u56FE\u7247\u8DEF\u5F84")
      })).max(10).optional().describe("\u667A\u80FD\u591A\u5E27\u914D\u7F6E\uFF0C\u652F\u6301\u591A\u4E2A\u5173\u952E\u5E27\uFF08\u6700\u591A10\u5E27\uFF09"),
      resolution: import_zod.z.string().optional().describe("\u5206\u8FA8\u7387\uFF0C\u53EF\u9009720p\u62161080p\uFF0C\u9ED8\u8BA4720p"),
      model: import_zod.z.string().optional().describe("\u6A21\u578B\u540D\u79F0\uFF0C\u4F20\u7EDF\u6A21\u5F0F\u9ED8\u8BA4jimeng-video-3.0\uFF0C\u591A\u5E27\u6A21\u5F0F\u9ED8\u8BA4jimeng-video-multiframe"),
      prompt: import_zod.z.string().describe("\u751F\u6210\u89C6\u9891\u7684\u6587\u672C\u63CF\u8FF0\uFF08\u4F20\u7EDF\u6A21\u5F0F\uFF09\u6216\u5168\u5C40\u63D0\u793A\u8BCD\uFF08\u591A\u5E27\u6A21\u5F0F\uFF09"),
      width: import_zod.z.number().min(512).max(2560).optional().default(1024).describe("\u89C6\u9891\u5BBD\u5EA6\uFF0C\u8303\u56F4512-2560\uFF0C\u9ED8\u8BA41024"),
      height: import_zod.z.number().min(512).max(2560).optional().default(1024).describe("\u89C6\u9891\u9AD8\u5EA6\uFF0C\u8303\u56F4512-2560\uFF0C\u9ED8\u8BA41024"),
      fps: import_zod.z.number().min(12).max(30).optional().default(24).describe("\u5E27\u7387\uFF0C\u8303\u56F412-30\uFF0C\u9ED8\u8BA424\uFF08\u591A\u5E27\u6A21\u5F0F\uFF09"),
      duration_ms: import_zod.z.number().min(3e3).max(15e3).optional().describe("\u603B\u65F6\u957F\uFF08\u6BEB\u79D2\uFF0C\u8303\u56F43000-15000ms\uFF0C\u591A\u5E27\u6A21\u5F0F\uFF09"),
      video_aspect_ratio: import_zod.z.string().optional().describe("\u89C6\u9891\u6BD4\u4F8B\uFF0C\u5982'3:4'\uFF08\u591A\u5E27\u6A21\u5F0F\uFF09"),
      refresh_token: import_zod.z.string().optional().describe("\u5373\u68A6API\u4EE4\u724C\uFF08\u53EF\u9009\uFF0C\u901A\u5E38\u4ECE\u73AF\u5883\u53D8\u91CF\u8BFB\u53D6\uFF09"),
      req_key: import_zod.z.string().optional().describe("\u81EA\u5B9A\u4E49\u53C2\u6570\uFF0C\u517C\u5BB9\u65E7\u63A5\u53E3")
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
          refresh_token: params.refresh_token || process.env.JIMENG_API_TOKEN,
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
      videoId: import_zod.z.string().describe("\u89C6\u9891ID"),
      originHistoryId: import_zod.z.string().describe("\u539F\u59CB\u751F\u6210\u5386\u53F2ID"),
      targetFps: import_zod.z.union([import_zod.z.literal(30), import_zod.z.literal(60)]).describe("\u76EE\u6807\u5E27\u7387\uFF1A30\u621660fps"),
      originFps: import_zod.z.number().describe("\u539F\u59CB\u5E27\u7387"),
      duration: import_zod.z.number().optional().describe("\u89C6\u9891\u65F6\u957F\uFF08\u6BEB\u79D2\uFF09\uFF0C\u53EF\u9009")
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
      videoId: import_zod.z.string().describe("\u89C6\u9891ID"),
      originHistoryId: import_zod.z.string().describe("\u539F\u59CB\u751F\u6210\u5386\u53F2ID"),
      targetWidth: import_zod.z.number().min(768).max(2560).describe("\u76EE\u6807\u5BBD\u5EA6\uFF0C\u8303\u56F4768-2560\u50CF\u7D20"),
      targetHeight: import_zod.z.number().min(768).max(2560).describe("\u76EE\u6807\u9AD8\u5EA6\uFF0C\u8303\u56F4768-2560\u50CF\u7D20"),
      originWidth: import_zod.z.number().describe("\u539F\u59CB\u5BBD\u5EA6"),
      originHeight: import_zod.z.number().describe("\u539F\u59CB\u9AD8\u5EA6")
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
    new import_mcp.ResourceTemplate("greeting://{name}", { list: void 0 }),
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
  const transport = new import_stdio.StdioServerTransport();
  console.log("Jimeng MCP Server \u6B63\u5728\u542F\u52A8...");
  await server.connect(transport);
  console.log("Jimeng MCP Server \u5DF2\u542F\u52A8");
  return { server, transport };
};

// src/index.ts
var import_dotenv = __toESM(require("dotenv"), 1);
var import_meta = {};
import_dotenv.default.config();
process.on("uncaughtException", (error) => {
  console.error("\u672A\u6355\u83B7\u7684\u5F02\u5E38:", error);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("\u672A\u5904\u7406\u7684Promise\u62D2\u7EDD:", reason);
});
var main = async () => {
  try {
    if (!process.env.JIMENG_API_TOKEN) {
      throw new Error("JIMENG_API_TOKEN is required!");
    }
    await startServer();
  } catch (error) {
    console.error("\u542F\u52A8\u670D\u52A1\u5668\u65F6\u51FA\u9519:", error);
    process.exit(1);
  }
};
if (import_meta.url === `file://${process.argv[1]}`) {
  main();
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ASPECT_RATIO_PRESETS,
  ImageDimensionCalculator,
  generateImage,
  generateVideo
});
//# sourceMappingURL=index.cjs.map