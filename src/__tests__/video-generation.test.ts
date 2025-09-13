/**
 * 视频生成功能测试
 * 测试重构后的视频生成API功能，包括传统模式和多帧模式
 */

import { generateVideo } from '../api.js';
import { JimengClient } from '../api/JimengClient.js';
import type { VideoGenerationParams, MultiFrameConfig } from '../types/api.types.js';

// Mock JimengClient以避免实际API调用
jest.mock('../api/JimengClient.js');
const MockedJimengClient = JimengClient as jest.MockedClass<typeof JimengClient>;

describe('视频生成功能测试', () => {
  
  let mockClient: jest.Mocked<JimengClient>;
  
  beforeEach(() => {
    // 重置所有mock
    jest.clearAllMocks();
    
    // 创建mock客户端实例
    mockClient = {
      generateVideo: jest.fn(),
      getRefreshToken: jest.fn(),
    } as any;
    
    // Mock构造函数返回mock实例
    MockedJimengClient.mockImplementation(() => mockClient);
  });

  // 1. 基础视频生成测试
  describe('基础视频生成', () => {
    it('应该成功生成基础视频', async () => {
      const mockVideoUrl = 'https://example.com/video.mp4';
      mockClient.generateVideo.mockResolvedValue(mockVideoUrl);

      const params: VideoGenerationParams = {
        prompt: '一段美丽的自然风景视频',
        refresh_token: 'test-token-123'
      };

      const result = await generateVideo(params);

      expect(MockedJimengClient).toHaveBeenCalledWith('test-token-123');
      expect(mockClient.generateVideo).toHaveBeenCalledWith(params);
      expect(result).toBe(mockVideoUrl);
    });

    it('应该在缺少refresh_token时抛出错误', async () => {
      const params: VideoGenerationParams = {
        prompt: '测试视频'
      } as any; // 故意缺少refresh_token

      await expect(generateVideo(params)).rejects.toThrow('refresh_token is required');
      expect(MockedJimengClient).not.toHaveBeenCalled();
    });
  });

  // 2. 传统视频生成模式测试
  describe('传统视频生成模式', () => {
    it('应该支持单个首帧图像', async () => {
      const mockVideoUrl = 'https://example.com/video.mp4';
      mockClient.generateVideo.mockResolvedValue(mockVideoUrl);

      const params: VideoGenerationParams = {
        prompt: '基于首帧图像的视频',
        refresh_token: 'test-token',
        filePath: ['/path/to/start-frame.jpg'],
        resolution: '720p'
      };

      await generateVideo(params);
      expect(mockClient.generateVideo).toHaveBeenCalledWith(
        expect.objectContaining({ 
          filePath: ['/path/to/start-frame.jpg'],
          resolution: '720p'
        })
      );
    });

    it('应该支持首帧和尾帧图像', async () => {
      const mockVideoUrl = 'https://example.com/video.mp4';
      mockClient.generateVideo.mockResolvedValue(mockVideoUrl);

      const params: VideoGenerationParams = {
        prompt: '从首帧到尾帧的视频',
        refresh_token: 'test-token',
        filePath: ['/path/to/start-frame.jpg', '/path/to/end-frame.jpg'],
        resolution: '1080p'
      };

      await generateVideo(params);
      expect(mockClient.generateVideo).toHaveBeenCalledWith(
        expect.objectContaining({ 
          filePath: ['/path/to/start-frame.jpg', '/path/to/end-frame.jpg'],
          resolution: '1080p'
        })
      );
    });

    it('应该支持自定义尺寸', async () => {
      const mockVideoUrl = 'https://example.com/video.mp4';
      mockClient.generateVideo.mockResolvedValue(mockVideoUrl);

      const params: VideoGenerationParams = {
        prompt: '自定义尺寸视频',
        refresh_token: 'test-token',
        width: 1280,
        height: 720
      };

      await generateVideo(params);
      expect(mockClient.generateVideo).toHaveBeenCalledWith(
        expect.objectContaining({ 
          width: 1280,
          height: 720
        })
      );
    });
  });

  // 3. 多帧视频生成模式测试
  describe('多帧视频生成模式', () => {
    it('应该支持多帧配置生成', async () => {
      const mockVideoUrl = 'https://example.com/multiframe-video.mp4';
      mockClient.generateVideo.mockResolvedValue(mockVideoUrl);

      const multiFrames: MultiFrameConfig[] = [
        {
          idx: 0,
          duration_ms: 2000,
          prompt: '第一帧：阳光明媚的早晨',
          image_path: '/path/to/frame1.jpg'
        },
        {
          idx: 1,
          duration_ms: 3000,
          prompt: '第二帧：夕阳西下的黄昏',
          image_path: '/path/to/frame2.jpg'
        }
      ];

      const params: VideoGenerationParams = {
        prompt: '多帧智能视频生成',
        refresh_token: 'test-token',
        multiFrames,
        duration_ms: 5000,
        fps: 24,
        video_aspect_ratio: '16:9'
      };

      await generateVideo(params);
      expect(mockClient.generateVideo).toHaveBeenCalledWith(
        expect.objectContaining({ 
          multiFrames,
          duration_ms: 5000,
          fps: 24,
          video_aspect_ratio: '16:9'
        })
      );
    });

    it('应该支持最多10个关键帧', async () => {
      const mockVideoUrl = 'https://example.com/10frame-video.mp4';
      mockClient.generateVideo.mockResolvedValue(mockVideoUrl);

      const multiFrames: MultiFrameConfig[] = Array.from({ length: 10 }, (_, i) => ({
        idx: i,
        duration_ms: 1500,
        prompt: `第${i + 1}帧场景`,
        image_path: `/path/to/frame${i + 1}.jpg`
      }));

      const params: VideoGenerationParams = {
        prompt: '10帧超长视频',
        refresh_token: 'test-token',
        multiFrames,
        duration_ms: 15000,
        fps: 30
      };

      await generateVideo(params);
      expect(mockClient.generateVideo).toHaveBeenCalledWith(
        expect.objectContaining({ 
          multiFrames: expect.arrayContaining([
            expect.objectContaining({ idx: 0 }),
            expect.objectContaining({ idx: 9 })
          ])
        })
      );
      expect(params.multiFrames).toHaveLength(10);
    });

    it('应该验证帧持续时间范围', async () => {
      const multiFrames: MultiFrameConfig[] = [
        {
          idx: 0,
          duration_ms: 500, // 小于最小值1000ms
          prompt: '无效持续时间',
          image_path: '/path/to/frame.jpg'
        }
      ];

      const params: VideoGenerationParams = {
        prompt: '无效参数测试',
        refresh_token: 'test-token',
        multiFrames
      };

      // 这里的验证应该由客户端处理
      mockClient.generateVideo.mockRejectedValue(new Error('duration_ms 必须在1000-5000ms范围内'));

      await expect(generateVideo(params)).rejects.toThrow('duration_ms 必须在1000-5000ms范围内');
    });
  });

  // 4. 模型支持测试
  describe('模型支持', () => {
    it('应该支持指定视频模型', async () => {
      const mockVideoUrl = 'https://example.com/video.mp4';
      mockClient.generateVideo.mockResolvedValue(mockVideoUrl);

      const params: VideoGenerationParams = {
        prompt: '指定模型的视频',
        refresh_token: 'test-token',
        model: 'jimeng-video-3.0'
      };

      await generateVideo(params);
      expect(mockClient.generateVideo).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'jimeng-video-3.0' })
      );
    });

    it('应该支持多帧专用模型', async () => {
      const mockVideoUrl = 'https://example.com/multiframe-video.mp4';
      mockClient.generateVideo.mockResolvedValue(mockVideoUrl);

      const params: VideoGenerationParams = {
        prompt: '多帧模型视频',
        refresh_token: 'test-token',
        model: 'jimeng-video-multiframe',
        multiFrames: [{
          idx: 0,
          duration_ms: 3000,
          prompt: '多帧场景',
          image_path: '/path/to/frame.jpg'
        }]
      };

      await generateVideo(params);
      expect(mockClient.generateVideo).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'jimeng-video-multiframe' })
      );
    });
  });

  // 5. 高级参数测试
  describe('高级参数设置', () => {
    it('应该支持不同的视频比例', async () => {
      const mockVideoUrl = 'https://example.com/portrait-video.mp4';
      mockClient.generateVideo.mockResolvedValue(mockVideoUrl);

      const params: VideoGenerationParams = {
        prompt: '竖屏视频',
        refresh_token: 'test-token',
        video_aspect_ratio: '9:16'
      };

      await generateVideo(params);
      expect(mockClient.generateVideo).toHaveBeenCalledWith(
        expect.objectContaining({ video_aspect_ratio: '9:16' })
      );
    });

    it('应该支持自定义帧率', async () => {
      const mockVideoUrl = 'https://example.com/high-fps-video.mp4';
      mockClient.generateVideo.mockResolvedValue(mockVideoUrl);

      const params: VideoGenerationParams = {
        prompt: '高帧率视频',
        refresh_token: 'test-token',
        fps: 30,
        multiFrames: [{
          idx: 0,
          duration_ms: 2000,
          prompt: '流畅动作',
          image_path: '/path/to/frame.jpg'
        }]
      };

      await generateVideo(params);
      expect(mockClient.generateVideo).toHaveBeenCalledWith(
        expect.objectContaining({ fps: 30 })
      );
    });

    it('应该支持兼容性参数req_key', async () => {
      const mockVideoUrl = 'https://example.com/legacy-video.mp4';
      mockClient.generateVideo.mockResolvedValue(mockVideoUrl);

      const params: VideoGenerationParams = {
        prompt: '兼容性测试视频',
        refresh_token: 'test-token',
        req_key: 'legacy-video-key-456'
      };

      await generateVideo(params);
      expect(mockClient.generateVideo).toHaveBeenCalledWith(
        expect.objectContaining({ req_key: 'legacy-video-key-456' })
      );
    });
  });

  // 6. 边界值测试
  describe('边界值测试', () => {
    it('应该处理最小时长视频', async () => {
      const mockVideoUrl = 'https://example.com/short-video.mp4';
      mockClient.generateVideo.mockResolvedValue(mockVideoUrl);

      const params: VideoGenerationParams = {
        prompt: '最短视频',
        refresh_token: 'test-token',
        duration_ms: 3000, // 最小3秒
        multiFrames: [{
          idx: 0,
          duration_ms: 3000,
          prompt: '短暂场景',
          image_path: '/path/to/frame.jpg'
        }]
      };

      await generateVideo(params);
      expect(mockClient.generateVideo).toHaveBeenCalledWith(
        expect.objectContaining({ duration_ms: 3000 })
      );
    });

    it('应该处理最大时长视频', async () => {
      const mockVideoUrl = 'https://example.com/long-video.mp4';
      mockClient.generateVideo.mockResolvedValue(mockVideoUrl);

      const params: VideoGenerationParams = {
        prompt: '最长视频',
        refresh_token: 'test-token',
        duration_ms: 15000, // 最大15秒
        multiFrames: [{
          idx: 0,
          duration_ms: 5000,
          prompt: '长场景',
          image_path: '/path/to/frame.jpg'
        }]
      };

      await generateVideo(params);
      expect(mockClient.generateVideo).toHaveBeenCalledWith(
        expect.objectContaining({ duration_ms: 15000 })
      );
    });

    it('应该处理最大尺寸视频', async () => {
      const mockVideoUrl = 'https://example.com/large-video.mp4';
      mockClient.generateVideo.mockResolvedValue(mockVideoUrl);

      const params: VideoGenerationParams = {
        prompt: '大尺寸视频',
        refresh_token: 'test-token',
        width: 2560,
        height: 2560
      };

      await generateVideo(params);
      expect(mockClient.generateVideo).toHaveBeenCalledWith(
        expect.objectContaining({ width: 2560, height: 2560 })
      );
    });
  });

  // 7. 错误处理测试
  describe('错误处理', () => {
    it('应该正确处理视频生成错误', async () => {
      const errorMessage = '视频生成失败';
      mockClient.generateVideo.mockRejectedValue(new Error(errorMessage));

      const params: VideoGenerationParams = {
        prompt: '错误测试视频',
        refresh_token: 'test-token'
      };

      await expect(generateVideo(params)).rejects.toThrow(errorMessage);
    });

    it('应该正确处理认证错误', async () => {
      mockClient.generateVideo.mockRejectedValue(new Error('无效的API令牌'));

      const params: VideoGenerationParams = {
        prompt: '认证测试视频',
        refresh_token: 'invalid-token'
      };

      await expect(generateVideo(params)).rejects.toThrow('无效的API令牌');
    });

    it('应该正确处理参数验证错误', async () => {
      mockClient.generateVideo.mockRejectedValue(new Error('多帧配置不能超过10个'));

      const multiFrames: MultiFrameConfig[] = Array.from({ length: 11 }, (_, i) => ({
        idx: i,
        duration_ms: 1000,
        prompt: `过多帧${i}`,
        image_path: `/path/to/frame${i}.jpg`
      }));

      const params: VideoGenerationParams = {
        prompt: '参数错误测试',
        refresh_token: 'test-token',
        multiFrames
      };

      await expect(generateVideo(params)).rejects.toThrow('多帧配置不能超过10个');
    });
  });
});