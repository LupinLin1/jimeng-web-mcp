/**
 * CreditService - 积分管理服务
 * 使用组合模式，依赖HttpClient而非继承
 * 负责积分查询和领取功能
 */

import { HttpClient } from './HttpClient.js';

export interface CreditInfo {
  giftCredit: number;
  purchaseCredit: number;
  vipCredit: number;
  totalCredit: number;
}

/**
 * CreditService类（新版本 - 组合模式）
 */
export class NewCreditService {
  constructor(private httpClient: HttpClient) {}

  /**
   * 获取积分余额
   */
  async getBalance(): Promise<number> {
    try {
      const credit = await this.getCredit();
      return credit.totalCredit;
    } catch (error) {
      console.error('查询积分失败:', error);
      return 0; // 失败时返回0而非抛出异常
    }
  }

  /**
   * 获取详细积分信息
   */
  async getCredit(): Promise<CreditInfo> {
    const result = await this.httpClient.request({
      method: 'POST',
      url: '/commerce/v1/benefits/user_credit',
      data: {},
      headers: { 'Referer': 'https://jimeng.jianying.com/ai-tool/image/generate' }
    });

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
  async receiveCredit(): Promise<void> {
    try {
      const credit = await this.httpClient.request({
        method: 'POST',
        url: '/commerce/v1/benefits/credit_receive',
        data: { 'time_zone': 'Asia/Shanghai' },
        headers: { 'Referer': 'https://jimeng.jianying.com/ai-tool/image/generate' }
      });

      // 检查返回状态
      if (credit?.ret && credit.ret !== '0') {
        if (credit.ret === '1014' && credit.errmsg === 'system busy') {
          throw new Error('系统繁忙，请稍后重试');
        }
        throw new Error(credit.errmsg || '领取积分失败');
      }
    } catch (error) {
      throw new Error(`领取积分失败: ${error}`);
    }
  }

  /**
   * 检查是否有足够积分
   */
  async hasEnoughCredits(amount: number): Promise<boolean> {
    const balance = await this.getBalance();
    return balance >= amount;
  }

  /**
   * 扣除积分（记录原因）
   */
  async deductCredits(amount: number, reason: string): Promise<void> {
    const hasEnough = await this.hasEnoughCredits(amount);
    if (!hasEnough) {
      const balance = await this.getBalance();
      throw new InsufficientCreditsError(amount, balance);
    }

    console.log(`扣除积分: ${amount}, 原因: ${reason}`);
    // 注：实际扣除由JiMeng API自动处理
  }
}

/**
 * 积分不足错误
 */
export class InsufficientCreditsError extends Error {
  constructor(required: number, available: number) {
    super(`需要${required}积分，当前${available}`);
    this.name = 'InsufficientCreditsError';
  }
}
