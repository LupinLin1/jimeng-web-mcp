import express from 'express'
import { generateImage, generateVideo } from '../src/api'

async function start() {
  const app = express();
  const port = process.env.PORT || 3000;

  app.use(express.json());

  app.post('/generateImage', async (req, res) => {
    try {
      const result = await generateImage(req.body);
      return res.json(result);
    } catch (err) {
      console.error('生成失败:', err);
      return res.status(500).json({ error: '生成错误: ' + err });
    }
  });
  app.post('/generateVideo', async (req, res) => {
    try {
      const result = await generateVideo(req.body);
      return res.json(result);
    } catch (err) {
      console.error('生成失败:', err);
      return res.status(500).json({ error: '生成错误: ' + err });
    }
  });

  app.listen(port, () => {
    console.log(`🚀 Server is running at http://localhost:${port}`);
  });
}

start().catch((err) => {
  console.error('服务启动失败:', err);
})

