import SparkMD5 from 'spark-md5';

const blobSlice = File.prototype.slice || File.prototype.mozSlice || File.prototype.webkitSlice;

export const chunkSize = 2 * 512 * 1024;

export const createChunks = (file, { chunkSize = chunkSize } = {}) => {
  const size = file.size;
  const chunksList = [];
  for (let start = 0; start < size; start += chunkSize) {
    const fileChunk = blobSlice.call(file, start, Math.min(size, start + chunkSize));
    chunksList.push(fileChunk);
  }
  return chunksList;
};

export const calculateHash = (chunksList) => {
  return new Promise((resolve, reject) => {
    const chunksLen = chunksList.length;
    const spark = new SparkMD5();
    const read = async (i) => {
      if (i === chunksLen) {
        return;
      }
      const fileReader = new FileReader();
      fileReader.onload = (e) => {
        const bytes = e.target.result;
        spark.append(bytes);
        read(i + 1);
        if (i === chunksLen - 1) {
          resolve(spark.end());
        }
      };
      fileReader.onerror = (e) => {
        reject(e);
      };
      const blob = chunksList[i];
      // 开启切片大小优化
      // const midSize = Math.floor(chunkSize / 2);
      // if (i === 0 || i === chunksLen - 1) {
      //   const startBytes = blob.slice(0, 2);
      //   const midBytes = blob.slice(midSize, midSize + 2);
      //   const endBytes = blob.slice(chunkSize - 2, chunkSize);
      //   fileReader.readAsArrayBuffer(new Blob([startBytes, midBytes, endBytes]));
      // } else {
      //   fileReader.readAsArrayBuffer(blob);
      // }

      fileReader.readAsArrayBuffer(blob);
    };
    read(0);
  });
};
