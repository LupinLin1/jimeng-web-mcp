/**
 * Unit tests for new CreditService implementation
 * Tests composition pattern instead of inheritance
 */

import { jest, describe, it, expect, beforeAll, beforeEach, afterEach } from '@jest/globals';
import { NewCreditService, InsufficientCreditsError } from '../../src/api/NewCreditService.js';
import { HttpClient } from '../../src/api/HttpClient.js';

describe('NewCreditService (Composition Pattern)', () => {
  let creditService: NewCreditService;
  let httpClient: HttpClient;
  let mockRequest: jest.SpyInstance;

  beforeAll(() => {
    process.env.JIMENG_API_TOKEN = 'test-token-12345';
    httpClient = new HttpClient();
    creditService = new NewCreditService(httpClient);
  });

  beforeEach(() => {
    // Mock the request method
    mockRequest = jest.spyOn(httpClient, 'request');
  });

  afterEach(() => {
    mockRequest.mockRestore();
  });

  describe('Composition Pattern Architecture', () => {
    it('should use injected HttpClient', () => {
      expect(creditService['httpClient']).toBe(httpClient);
    });

    it('should not extend any base class (composition, not inheritance)', () => {
      const proto = Object.getPrototypeOf(creditService);
      expect(proto.constructor.name).toBe('NewCreditService');

      // Should only have NewCreditService in the prototype chain
      const protoChain: string[] = [];
      let current = creditService;
      while (Object.getPrototypeOf(current) !== null) {
        current = Object.getPrototypeOf(current);
        protoChain.push(current.constructor.name);
      }

      expect(protoChain).toEqual(['NewCreditService', 'Object']);
      expect(protoChain).not.toContain('JimengApiClient');
      expect(protoChain).not.toContain('BaseClient');
    });
  });

  describe('getBalance', () => {
    it('should return total credits on success', async () => {
      mockRequest.mockResolvedValue({
        credit: {
          gift_credit: 10,
          purchase_credit: 20,
          vip_credit: 30
        }
      });

      const balance = await creditService.getBalance();

      expect(balance).toBe(60);
      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: '/commerce/v1/benefits/user_credit'
        })
      );
    });

    it('should return 0 on failure instead of throwing', async () => {
      mockRequest.mockRejectedValue(new Error('Network error'));

      const balance = await creditService.getBalance();

      expect(balance).toBe(0);
    });
  });

  describe('getCredit', () => {
    it('should return detailed credit info', async () => {
      mockRequest.mockResolvedValue({
        credit: {
          gift_credit: 15,
          purchase_credit: 25,
          vip_credit: 35
        }
      });

      const credit = await creditService.getCredit();

      expect(credit).toEqual({
        giftCredit: 15,
        purchaseCredit: 25,
        vipCredit: 35,
        totalCredit: 75
      });
    });

    it('should handle missing credit data', async () => {
      mockRequest.mockResolvedValue({});

      const credit = await creditService.getCredit();

      expect(credit).toEqual({
        giftCredit: 0,
        purchaseCredit: 0,
        vipCredit: 0,
        totalCredit: 0
      });
    });
  });

  describe('hasEnoughCredits', () => {
    beforeEach(() => {
      mockRequest.mockResolvedValue({
        credit: {
          gift_credit: 50,
          purchase_credit: 0,
          vip_credit: 0
        }
      });
    });

    it('should return true when credits are sufficient', async () => {
      const result = await creditService.hasEnoughCredits(30);
      expect(result).toBe(true);
    });

    it('should return false when credits are insufficient', async () => {
      const result = await creditService.hasEnoughCredits(100);
      expect(result).toBe(false);
    });
  });

  describe('deductCredits', () => {
    it('should throw InsufficientCreditsError when not enough credits', async () => {
      mockRequest.mockResolvedValue({
        credit: { gift_credit: 10, purchase_credit: 0, vip_credit: 0 }
      });

      await expect(creditService.deductCredits(50, 'Test deduction'))
        .rejects
        .toThrow(InsufficientCreditsError);

      await expect(creditService.deductCredits(50, 'Test'))
        .rejects
        .toThrow('需要50积分，当前10');
    });

    it('should succeed when enough credits available', async () => {
      mockRequest.mockResolvedValue({
        credit: { gift_credit: 100, purchase_credit: 0, vip_credit: 0 }
      });

      await expect(creditService.deductCredits(50, 'Test deduction'))
        .resolves
        .not.toThrow();
    });
  });
});
