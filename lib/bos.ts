import colors from 'colors/safe';
import fs from 'fs';
import klaw from 'klaw';
import md5 from 'md5';
import ora from 'ora';
import pLimit from 'p-limit';
import path from 'path';

import { getBCEInfo, IConfig } from './data';

// tslint:disable-next-line:no-var-requires
const BosClient = require('bce-sdk-js').BosClient;

const log = console.log;

const DEFAULT_PUT_HEADERS = {
  'Cache-Control': 'max-age=315360000',
};

/******* interface *******/
interface IPutOptions {
  bucket: string;
  prefix: string;
  override: boolean;
  objectKey?: string;
  limit?: number;
  flat?: boolean;
  ext?: string;
  cache: string;
  md5: string;
}

interface IClientConstructor {
  endpoint: string;
  credentials: {
    ak: string;
    sk: string;
  };
}

enum PromiseStatus {
  FULFILLED = 'fulfilled',
  REJECTED = 'rejected',
  PENDING = 'pending',
}
/******* interface end *******/

/******* helper *******/
function walkFiles(dirPath: string, options: IPutOptions): Promise<any> {
  const { ext } = options;
  const files: any[] = [];
  let extSet = new Set();
  let filter = (item: any): boolean => true;
  if (ext) {
    extSet = new Set(ext.split(','));
    filter = (item: any): boolean => extSet.has(path.extname(item.path).replace(/^\./, ''));
  }
  return new Promise((resolve, reject) => {
    klaw(dirPath)
      .on('data', (item) => {
          if (!item.stats.isDirectory() && filter(item)) {
              // 文件过滤
              files.push(item.path);
          }
      })
      .on('error', (err) => reject(err))
      .on('end', () => resolve(files));
  });
}

class Client extends BosClient {
  constructor(config: IClientConstructor) {
    super(config);
  }

  /**
   * 上传文件前判断是否覆盖
   *
   * @param {string} bucketName Bucket Name
   * @param {string} objectKey 文件key
   * @param {string} filePath 文件路径
   * @param {?boolean} options.override 是否覆盖
   * @param {?string} option.cacheControl cache control
   */
  public async putObjectFromFileAndCheck(
    bucketName: string,
    objectKey: string,
    filePath: string,
    {
      override = false,
      cache = '',
    },
  ) {
    if (!override) { // 判断是否会覆盖
      let fileExist = false;
      try {
          await this.getObjectMetadata(bucketName, objectKey);
          fileExist = true;
      } catch (err) {
          // objectKey不存在
      }
      if (fileExist) {
        return {
          EXISTS: true,
        };
      }
    }

    const headers = Object.assign({}, DEFAULT_PUT_HEADERS);
    if (cache) {
      headers['Cache-Control'] = cache;
    }
    return this.putObjectFromFile(bucketName, objectKey, filePath, headers);
  }
}

function generateObjectKey(dir: string, config: IConfig, options: IPutOptions, relative: string = ''): string {
  // 1. objectKey = config.prefix + prefix + relative? + (hash | filename) + ext
  // 2. or = objectKey
  const { objectKey, prefix, md5: needMd5 } = options;
  let bosObjectKey: string = '';
  if (objectKey) {
    bosObjectKey = objectKey;
  } else {
    const fcp = (config.prefix || '').replace(/\/+$/, '');
    bosObjectKey += fcp ? `${fcp}/` : '';
    const fp = (prefix || '').replace(/\/+$/, '');
    bosObjectKey += fp ? `${fp}/` : '';
    bosObjectKey += relative ? `${relative}/` : '';
    const ext = path.extname(dir);
    if (needMd5) {
      const basename = `${path.basename(dir)}${Date.now()}`;
      bosObjectKey += `${md5(basename)}${ext}`;
    } else {
      const basename = path.basename(dir);
      bosObjectKey += basename;
    }
  }
  return bosObjectKey;
}

function generateObjectUrl(objectKey: string, config: IConfig): string {
  const { host, bucket } = config;
  if (host) {
    return `${host}/${objectKey}`;
  }
  const newHost = config.config.endpoint.replace(/^(https?:\/\/)(?=.*)/, `$1${bucket}.`);
  return `${newHost}/${objectKey}`;
}

function getConfig(options: IPutOptions): any {
  const { bucket } = options;
  const bceInfo = getBCEInfo();
  const current: string = bucket || bceInfo.current;
  if (!current) {
    log(colors.red('please choose bucket'));
    return null;
  }
  const config = bceInfo.config.filter((item: IConfig) => item.name === current);
  if (!config || config.length <= 0) {
    log(colors.red(`Cannot found ${current}`));
    return null;
  }
  const target: IConfig = config[0];
  return target;
}

// Promise.allSettled
function allSettled(promises: Array<Promise<any>>): Promise<any> {
  const length = promises.length;
  const res = new Array(length);
  let i = 0;
  return new Promise((resolve, reject) => {
    const complete = (index: number, value: any, status: PromiseStatus) => {
      res[index] = {
        status,
        value,
      };
      i++;
      if (i >= length) {
        resolve(res);
      }
    };
    promises.forEach((promise, index) => {
      try {
        promise.then(
          (value: any) => complete(index, value, PromiseStatus.FULFILLED),
          (error: any) => complete(index, error, PromiseStatus.REJECTED),
        );
      } catch (error) {
        reject(error);
      }
    });
  });
}
/******* helper end *******/

export async function putFile(dir: string, options: IPutOptions) {
  const target = getConfig(options);
  if (!target) {
    return;
  }
  const filePath = path.resolve(process.cwd(), dir);
  const client = new Client(target.config);
  const bosObjectKey = generateObjectKey(filePath, target, options);
  const spinner = ora({
    text: `Uploading ${dir}`,
    color: 'blue',
  }).start();
  try {
    const res = await client.putObjectFromFileAndCheck(target.bucket, bosObjectKey, filePath, options);
    if (res.EXISTS) {
      spinner.fail(`[exists] ${generateObjectUrl(bosObjectKey, target)} already exists.`);
      log(colors.yellow('Use -o to override.'));
    } else {
      spinner.succeed(`[success] ${generateObjectUrl(bosObjectKey, target)}`);
    }
  } catch (error) {
    spinner.fail(`[fail] ${generateObjectUrl(bosObjectKey, target)}`);
    log(colors.red(error));
  }
}

export async function putFolder(dir: string, options: IPutOptions) {
  const folderPath = path.resolve(process.cwd(), dir);
  if (!fs.existsSync(folderPath)) {
    log(colors.red(`${folderPath} does not exist`));
    return;
  }
  const target = getConfig(options);
  const client = new Client(target.config);
  const files = await walkFiles(folderPath, options);

  const limit = pLimit(options.limit || 10);

  const queue = [];

  for (const file of files) {
    let relative = '';
    if (!options.flat) {
      relative = path.relative(folderPath, path.dirname(file));
    }
    const relativePath = path.relative(folderPath, file);
    const bosObjectKey = generateObjectKey(file, target, options, relative);
    queue.push(
      limit(async () => {
          const spinner = ora({
            text: `uploading ${file}`,
          }).start();
          try {
            const res = await client.putObjectFromFileAndCheck(target.bucket, bosObjectKey, file, options);
            if (res.EXISTS) {
              spinner.fail(`[exists] ${relativePath}(${colors.yellow(generateObjectUrl(bosObjectKey, target))})`);
            } else {
              spinner.succeed(`[success] ${relativePath}(${colors.yellow(generateObjectUrl(bosObjectKey, target))})`);
            }
          } catch (error) {
            spinner.fail(`[failed] ${relativePath}`);
          }
      }),
    );
    await allSettled(queue);
  }
}
