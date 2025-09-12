// from https://github.com/NearHuiwen/TiktokDouyinCrawler/blob/main/utils/a_bogus.js
// All the content in this article is only for learning and communication use, not for any other purpose, strictly prohibited for commercial use and illegal use, otherwise all the consequences are irrelevant to the author!

function rc4_encrypt(plaintext: string, key: string): string {
    const s: number[] = [];
    for (let i = 0; i < 256; i++) {
        s[i] = i;
    }
    let j = 0;
    for (let i = 0; i < 256; i++) {
        j = (j + s[i] + key.charCodeAt(i % key.length)) % 256;
        [s[i], s[j]] = [s[j], s[i]];
    }

    let i = 0;
    j = 0;
    const cipher: string[] = [];
    for (let k = 0; k < plaintext.length; k++) {
        i = (i + 1) % 256;
        j = (j + s[i]) % 256;
        [s[i], s[j]] = [s[j], s[i]];
        const t = (s[i] + s[j]) % 256;
        cipher.push(String.fromCharCode(s[t] ^ plaintext.charCodeAt(k)));
    }
    return cipher.join('');
}

function le(e: number, r: number): number {
    r %= 32;
    return ((e << r) | (e >>> (32 - r))) >>> 0;
}

function de(e: number): number | undefined {
    if (0 <= e && e < 16) return 2043430169;
    if (16 <= e && e < 64) return 2055708042;
    console.error("invalid j for constant Tj");
    return undefined;
}

function pe(e: number, r: number, t: number, n: number): number {
    if (0 <= e && e < 16) return (r ^ t ^ n) >>> 0;
    if (16 <= e && e < 64) return (r & t | r & n | t & n) >>> 0;
    console.error('invalid j for bool function FF');
    return 0;
}

function he(e: number, r: number, t: number, n: number): number {
    if (0 <= e && e < 16) return (r ^ t ^ n) >>> 0;
    if (16 <= e && e < 64) return (r & t | ~r & n) >>> 0;
    console.error('invalid j for bool function GG');
    return 0;
}

function reset(this: SM3): void {
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

function write(this: SM3, e: string | number[]): void {
    const a: number[] = typeof e === "string"
        ? (() => {
            let n = encodeURIComponent(e).replace(/%([0-9A-F]{2})/g, (_, r) => String.fromCharCode(parseInt(r, 16)));
            const arr = new Array(n.length);
            Array.prototype.forEach.call(n, (ch: string, idx: number) => {
                arr[idx] = ch.charCodeAt(0);
            });
            return arr;
        })()
        : e;
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

function se(str: string, len: number, pad: string): string {
    return pad.repeat(len - str.length) + str;
}

function sum(this: SM3, e?: string | number[], t?: 'hex'): string | number[] {
    if (e) {
        this.reset();
        this.write(e);
    }
    this._fill();
    for (let f = 0; f < this.chunk.length; f += 64) {
        this._compress(this.chunk.slice(f, f + 64));
    }
    let i: string | number[] | null = null;
    if (t === 'hex') {
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
    return i!;
}

function _compress(this: SM3, t: Array<number>): void {
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
            let o = le(i[0], 12) + i[4] + le(de(c)!, c);
            let s = ((o = le((4294967295 & o) >>> 0, 7)) ^ le(i[0], 12)) >>> 0;
            let u = pe(c, i[0], i[1], i[2]);
            u = (4294967295 & (u + i[3] + s + f[c + 68])) >>> 0;
            let b = he(c, i[4], i[5], i[6]);
            b = (4294967295 & (b + i[7] + o + f[c])) >>> 0;
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

function _fill(this: SM3): void {
    const a = 8 * this.size;
    let f = this.chunk.push(128) % 64;
    if (64 - f < 8) f -= 64;
    while (f < 56) {
        this.chunk.push(0);
        f++;
    }
    for (let i = 0; i < 4; i++) {
        const c = Math.floor(a / 4294967296);
        this.chunk.push((c >>> (8 * (3 - i))) & 255);
    }
    for (let i = 0; i < 4; i++) {
        this.chunk.push((a >>> (8 * (3 - i))) & 255);
    }
}

class SM3 {
    reg: number[];
    chunk: number[];
    size: number;
    constructor() {
        this.reg = [];
        this.chunk = [];
        this.size = 0;
        this.reset();
    }
    reset = reset;
    write = write;
    sum = sum;
    _compress = _compress;
    _fill = _fill;
}

// Move s_obj outside the function for proper type inference
const s_obj = {
    s0: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
    s1: "Dkdpgh4ZKsQB80/Mfvw36XI1R25+WUAlEi7NLboqYTOPuzmFjJnryx9HVGcaStCe=",
    s2: "Dkdpgh4ZKsQB80/Mfvw36XI1R25-WUAlEi7NLboqYTOPuzmFjJnryx9HVGcaStCe=",
    s3: "ckdp1h4ZKsUB80/Mfvw36XIgR25+WQAlEi7NLboqYTOPuzmFjJnryx9HVGDaStCe",
    s4: "Dkdpgh2ZmsQB80/MfvV36XI1R45-WUAlEixNLwoqYTOPuzKFjJnry79HbGcaStCe"
};

function result_encrypt(long_str: string, num: keyof typeof s_obj | null = null): string {
    const constant = {
        "0": 16515072,
        "1": 258048,
        "2": 4032,
        "str": num ? s_obj[num] : s_obj["s0"],
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
        let temp_int: number;
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

function get_long_int(round: number, long_str: string): number {
    round = round * 3;
    return (long_str.charCodeAt(round) << 16) | (long_str.charCodeAt(round + 1) << 8) | (long_str.charCodeAt(round + 2));
}

function gener_random(random: number, option: number[]): number[] {
    return [
        ((random & 255 & 170) | (option[0] & 85)), // 163
        ((random & 255 & 85) | (option[0] & 170)), //87
        ((random >> 8 & 255 & 170) | (option[1] & 85)), //37
        ((random >> 8 & 255 & 85) | (option[1] & 170)), //41
    ];
}

function generate_rc4_bb_str(
    url_search_params: string,
    user_agent: string,
    window_env_str: string,
    suffix = "cus",
    Arguments: number[] = [0, 1, 14]
): string {
    const sm3 = new SM3();
    const start_time = Date.now();

    // url_search_params两次sm3之的结果
    const url_search_params_list = sm3.sum(sm3.sum(url_search_params + suffix)) as number[];
    // 对后缀两次sm3之的结果
    const cus = sm3.sum(sm3.sum(suffix)) as number[];
    // 对ua处理之后的结果
    const ua = sm3.sum(result_encrypt(rc4_encrypt(user_agent, String.fromCharCode(0.00390625, 1, 14)), "s3")) as number[];

    const end_time = Date.now();
    const b: { [key: number]: any } = {
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
        19: [1, 0, 1, 5],
    };

    b[20] = (b[16] >> 24) & 255;
    b[21] = (b[16] >> 16) & 255;
    b[22] = (b[16] >> 8) & 255;
    b[23] = b[16] & 255;
    b[24] = (b[16] / 256 / 256 / 256 / 256) >> 0;
    b[25] = (b[16] / 256 / 256 / 256 / 256 / 256) >> 0;

    b[26] = (Arguments[0] >> 24) & 255;
    b[27] = (Arguments[0] >> 16) & 255;
    b[28] = (Arguments[0] >> 8) & 255;
    b[29] = Arguments[0] & 255;

    b[30] = (Arguments[1] / 256) & 255;
    b[31] = (Arguments[1] % 256) & 255;
    b[32] = (Arguments[1] >> 24) & 255;
    b[33] = (Arguments[1] >> 16) & 255;

    b[34] = (Arguments[2] >> 24) & 255;
    b[35] = (Arguments[2] >> 16) & 255;
    b[36] = (Arguments[2] >> 8) & 255;
    b[37] = Arguments[2] & 255;

    b[38] = url_search_params_list[21];
    b[39] = url_search_params_list[22];

    b[40] = cus[21];
    b[41] = cus[22];

    b[42] = ua[23];
    b[43] = ua[24];

    b[44] = (b[10] >> 24) & 255;
    b[45] = (b[10] >> 16) & 255;
    b[46] = (b[10] >> 8) & 255;
    b[47] = b[10] & 255;
    b[48] = b[8];
    b[49] = (b[10] / 256 / 256 / 256 / 256) >> 0;
    b[50] = (b[10] / 256 / 256 / 256 / 256 / 256) >> 0;

    b[51] = b[15]['pageId'];
    b[52] = (b[15]['pageId'] >> 24) & 255;
    b[53] = (b[15]['pageId'] >> 16) & 255;
    b[54] = (b[15]['pageId'] >> 8) & 255;
    b[55] = b[15]['pageId'] & 255;

    b[56] = b[15]['aid'];
    b[57] = b[15]['aid'] & 255;
    b[58] = (b[15]['aid'] >> 8) & 255;
    b[59] = (b[15]['aid'] >> 16) & 255;
    b[60] = (b[15]['aid'] >> 24) & 255;

    const window_env_list: number[] = [];
    for (let index = 0; index < window_env_str.length; index++) {
        window_env_list.push(window_env_str.charCodeAt(index));
    }
    b[64] = window_env_list.length;
    b[65] = b[64] & 255;
    b[66] = (b[64] >> 8) & 255;

    b[69] = [].length;
    b[70] = b[69] & 255;
    b[71] = (b[69] >> 8) & 255;

    b[72] = b[18] ^ b[20] ^ b[26] ^ b[30] ^ b[38] ^ b[40] ^ b[42] ^ b[21] ^ b[27] ^ b[31] ^ b[35] ^ b[39] ^ b[41] ^ b[43] ^ b[22] ^
        b[28] ^ b[32] ^ b[36] ^ b[23] ^ b[29] ^ b[33] ^ b[37] ^ b[44] ^ b[45] ^ b[46] ^ b[47] ^ b[48] ^ b[49] ^ b[50] ^ b[24] ^
        b[25] ^ b[52] ^ b[53] ^ b[54] ^ b[55] ^ b[57] ^ b[58] ^ b[59] ^ b[60] ^ b[65] ^ b[66] ^ b[70] ^ b[71];

    let bb: number[] = [
        b[18], b[20], b[52], b[26], b[30], b[34], b[58], b[38], b[40], b[53], b[42], b[21], b[27], b[54], b[55], b[31],
        b[35], b[57], b[39], b[41], b[43], b[22], b[28], b[32], b[60], b[36], b[23], b[29], b[33], b[37], b[44], b[45],
        b[59], b[46], b[47], b[48], b[49], b[50], b[24], b[25], b[65], b[66], b[70], b[71]
    ];
    bb = bb.concat(window_env_list).concat(b[72]);
    return rc4_encrypt(String.fromCharCode(...bb), String.fromCharCode(121));
}

function generate_random_str(): string {
    let random_str_list: number[] = [];
    random_str_list = random_str_list.concat(gener_random(Math.random() * 10000, [3, 45]));
    random_str_list = random_str_list.concat(gener_random(Math.random() * 10000, [1, 0]));
    random_str_list = random_str_list.concat(gener_random(Math.random() * 10000, [1, 5]));
    return String.fromCharCode(...random_str_list);
}

export function generate_a_bogus(url_search_params: string, user_agent: string): string {
    const result_str = generate_random_str() + generate_rc4_bb_str(
        url_search_params,
        user_agent,
        "1536|747|1536|834|0|30|0|0|1536|834|1536|864|1525|747|24|24|Win32"
    );
    return result_encrypt(result_str, "s4") + "=";
}

//测试调用
// console.log(generate_a_bogus(
//     "device_platform=webapp&aid=6383&channel=channel_pc_web&update_version_code=170400&pc_client_type=1&version_code=170400&version_name=17.4.0&cookie_enabled=true&screen_width=1536&screen_height=864&browser_language=zh-CN&browser_platform=Win32&browser_name=Chrome&browser_version=123.0.0.0&browser_online=true&engine_name=Blink&engine_version=123.0.0.0&os_name=Windows&os_version=10&cpu_core_num=16&device_memory=8&platform=PC&downlink=10&effective_type=4g&round_trip_time=50&webid=7362810250930783783&msToken=VkDUvz1y24CppXSl80iFPr6ez-3FiizcwD7fI1OqBt6IICq9RWG7nCvxKb8IVi55mFd-wnqoNkXGnxHrikQb4PuKob5Q-YhDp5Um215JzlBszkUyiEvR",
//     "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
// ));
