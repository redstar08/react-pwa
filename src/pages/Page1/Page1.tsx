import React, { useState } from 'react';
import { InboxOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { message, Upload } from 'antd';

import request from '@/api/request';
import { chunkSize, createChunks, calculateHash } from './utils';
import { PromisePool } from './PromisePool';

const { Dragger } = Upload;

const limitPool = PromisePool(5);

const uploadChunks = async (
  chunksFormDataList: FormData[],
  file: File,
  onProgress?: (...args: any) => void,
) => {
  try {
    const results = chunksFormDataList.map((formData: FormData) => {
      return limitPool(() =>
        request('/upload', {
          requestType: 'file',
          data: formData,
        } as any),
      ).then((res) => {
        onProgress?.(file, { ...res.data, status: 'uploading' });
      });
    });
    return Promise.all(results);
  } catch (error) {
    message.error('上传失败');
    return [];
  }
};

const uploadFile = async (file: File, onProgress?: (...args: any) => void) => {
  try {
    // 文件信息
    const { name, size, type } = file;
    // 文件分片
    const chunksList = createChunks(file, { chunkSize });
    // 计算 hash
    const hash = await calculateHash(chunksList);
    console.log('customRequest -> ', file, hash);

    const fileInfo = {
      name,
      size,
      type,
      hash,
      uid: (file as any).uid,
    };

    const { data } = await request('/verifyUpload', { data: { ...fileInfo, chunkSize } });
    const { shouldUpload, existChunks } = data || {};

    if (!shouldUpload) {
      onProgress?.(file, data);
      return message.info('秒传，已经上传过了');
    }

    // 构造 formData 对象
    const chunksFormDataList = chunksList
      .filter((chunk, index) => !existChunks.includes(`${hash}-${index}`))
      .map((chunk, index) => {
        const formData = new FormData();
        formData.append('fileName', name);
        formData.append('fileType', type);
        formData.append('fileSize', size + '');
        formData.append('fileHash', hash);
        formData.append('chunk', chunk);
        formData.append('chunkSize', chunk.size + '');
        formData.append('chunkHash', `${hash}-${index}`);
        formData.append('index', `${index}`);
        return formData;
      });

    // 等待切片上传
    await uploadChunks(chunksFormDataList, file, onProgress);

    // 合并切片
    const results = await request('/merge', { data: { ...fileInfo, chunkSize } });
    onProgress?.(file, { ...results.data, status: 'done' });

    return fileInfo;
  } catch (error) {
    message.error('上传失败');
  }
};

const Page1: React.FC = () => {
  const [fileList, setFileList] = useState<any[]>([]);

  const props: UploadProps = {
    listType: 'picture',
    multiple: true,
    fileList,
    // beforeUpload(flie, fileList) {
    //   console.log('beforeUpload -> flie, fileList', flie, fileList);
    // },
    customRequest: (options) => {
      // console.log('customRequest -> options', options);
      const { file } = options;
      // 开始上传
      uploadFile(file as File, (file, res) => {
        console.log('onProgress -> ', res);
        const _fileList = fileList.map((item) => {
          if (item.uid === file.uid) {
            item.percent = res.percents;
            item.status = res.status || 'uploading';
          }
          return item;
        });
        setFileList(_fileList);
      });
    },
    onChange(info) {
      // console.log('onChange -> info', info);
      // [
      //   {
      //     uid: '0',
      //     name: 'xxx.png',
      //     status: 'uploading',
      //     percent: 33,
      //   },
      // ];
      const fileList = info.fileList.map((file) => {
        if (info.file.uid === file.uid) {
          const { uid, name } = file;
          return {
            uid,
            name,
            status: 'uploading',
            percent: 0,
          };
        }
        return file;
      });
      setFileList(fileList);
    },
  };

  return (
    <div style={{ width: '50vw', margin: '50px auto' }}>
      <Dragger {...props}>
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">Click or drag file to this area to upload</p>
        <p className="ant-upload-hint">
          Support for a single or bulk upload. Strictly prohibited from uploading company data or
          other banned files.
        </p>
      </Dragger>
    </div>
  );
};

export default Page1;
