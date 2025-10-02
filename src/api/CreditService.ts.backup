/**
 * JiMeng 积分服务
 * 负责处理用户积分查询和领取功能
 */

import { JimengApiClient } from './ApiClient.js';

export class CreditService extends JimengApiClient {
  /**
   * 获取积分信息
   * @returns 积分信息
   */
  public async getCredit(): Promise<Record<string, number>> {
    const result = await this.request(
      'POST',
      '/commerce/v1/benefits/user_credit',
      {},
      {},
      { 'Referer': 'https://jimeng.jianying.com/ai-tool/image/generate' }
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
  public async receiveCredit(): Promise<void> {
    try {
      const credit = await this.request(
        'POST',
        '/commerce/v1/benefits/credit_receive',
        { 'time_zone': 'Asia/Shanghai' },
        {},
        { 'Referer': 'https://jimeng.jianying.com/ai-tool/image/generate' }
      );
      
      // 检查返回状态
      if (credit?.ret && credit.ret !== '0') {
        if (credit.ret === '1014' && credit.errmsg === 'system busy') {
          console.log("🟡 积分系统繁忙，跳过积分领取（这通常不会影响图片生成）");
          return; // 不抛错，继续执行
        } else {
          console.log(`⚠️ 积分领取异常: ret=${credit.ret}, errmsg=${credit.errmsg || '未知错误'}`);
          return; // 不抛错，继续执行
        }
      }
      
      console.log("✅ 积分领取成功", credit);
    } catch (error) {
      console.log("⚠️ 积分领取请求失败，但不影响图片生成:", (error as Error).message);
      // 不抛错，允许图片生成继续进行
    }
  }
}