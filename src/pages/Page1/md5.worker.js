import { chunkSize, createChunks, calculateHash } from './utils';

self.addEventListener('message', async function ({ data }) {
  try {
    const { file } = data;
    const chunks = await createChunks(file, { chunkSize });
    const hash = await calculateHash(chunks);
    // const start = Date.now();
    // while (Date.now() - start < 5000) {}
    console.log('md5.worker.js -> data', chunks, hash);
    // 提交线程信息
    self.postMessage({ hash, chunks });
  } catch (error) {
    self.postMessage({ error });
  } finally {
    self.close();
  }
});
