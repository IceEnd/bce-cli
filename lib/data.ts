import colors from 'colors/safe';
import fs from 'fs';
import inquirer from 'inquirer';
import path from 'path';

const BCERC: string = path.join(process.env.HOME ? process.env.HOME : '../', '.bcereolrc');

/******* helper *******/
export function getBCEInfo() {
  return fs.existsSync(BCERC) ? JSON.parse(fs.readFileSync(BCERC, 'utf-8')) : { current: '' };
}

function setBCEInfo(data: any): void {
  try {
    fs.writeFileSync(BCERC, JSON.stringify(data));
  } catch (ex) {
    process.exit(1);
    console.log(ex);
  }
}

function addValidate(input: string): boolean {
  if (input.trim()) {
    return true;
  }
  return false;
}

function urlValidate(input: string): boolean {
  return /[-a-zA-Z0-9@:%._\\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\\+.~#?&//=]*)/.test(input);
}
/******* helper end *******/

/******* interface *******/
interface IAnswers {
  name: string;
  host: string;
  prefix: string;
  bucket: string;
  endpoint: string;
  ak: string;
  sk: string;
}

export interface IConfig {
  name: string;
  host: string;
  bucket: string;
  prefix: string;
  config: {
    endpoint: string;
    credentials: {
      ak: string;
      sk: string;
    }
  };
}
/******* interface end *******/

export async function add(): Promise<void> {
  const answers: IAnswers = await inquirer
    .prompt([
      {
        name: 'name',
        prefix: '*',
        type: 'input',
        validate: addValidate,
      },
      {
        name: 'bucket',
        type: 'input',
        prefix: '*',
        validate: addValidate,
      },
      {
        name: 'host',
        type: 'input',
        validate: (input: string): boolean => {
          if (input) {
            return urlValidate(input);
          }
          return true;
        },
      },
      {
        name: 'prefix',
        type: 'input',
        message: 'prefix',
      },
      {
        name: 'endpoint',
        prefix: '*',
        type: 'input',
        validate: urlValidate,
      },
      {
        name: 'ak',
        prefix: '*',
        type: 'input',
        validate: addValidate,
      },
      {
        name: 'sk',
        prefix: '*',
        type: 'input',
        validate: addValidate,
      },
    ]);
  const bceInfo = getBCEInfo();
  const config = bceInfo.config || [];
  let hasRepeat: boolean = false;
  for (const item of config) {
    if (item.name === answers.name.trim()) {
      hasRepeat = true;
    }
  }
  if (hasRepeat) {
    console.log(colors.red('duplicate bce names.'));
    return;
  }
  config.push({
    name: answers.name.trim(),
    bucket: answers.bucket.trim(),
    host: answers.host.trim(),
    prefix: answers.prefix.trim(),
    config: {
      endpoint: answers.endpoint.trim().replace(/\/+$/, ''),
      credentials: {
        ak: answers.ak.trim(),
        sk: answers.sk.trim(),
      },
    },
  });
  bceInfo.config = config;
  setBCEInfo(bceInfo);
  console.log('');
  console.log(colors.green(`add bce config [${answers.name}] success`));
  return;
}

export function list(): void {
  const bceInfo = getBCEInfo();
  const current: string = bceInfo.current || '';
  const config: IConfig[] = bceInfo.config || [];
  const res = [];
  for (const item of config) {
    res.push({
      name: item.name,
      bucket: item.name,
      host: item.host,
      prefix: item.prefix,
      default: item.name === current,
    });
  }
  console.log();
  console.table(res);
  console.log();
  return;
}

export function use(name: string): void {
  const bceInfo = getBCEInfo();
  const config: IConfig[] = bceInfo.config || [];
  let hasFound: boolean = false;
  for (const item of config) {
    if (item.name === name) {
      hasFound = true;
      break;
    }
  }
  console.log();
  if (hasFound) {
    bceInfo.current = name;
    setBCEInfo(bceInfo);
    console.log(colors.green(`Bucket has been set to ${name}`));
  } else {
    console.log(colors.red(`Cannot found ${name}`));
  }
  console.log();
  return;
}

export function remove(name: string): void {
  const bceInfo = getBCEInfo();
  const config: IConfig[] = bceInfo.config || [];
  const newConig = config.filter((item) => item.name !== name);
  if (bceInfo.current === name) {
    bceInfo.current = '';
  }
  bceInfo.config = newConig;
  setBCEInfo(bceInfo);
  console.log();
  console.log(colors.green(`Remove ${name} success`));
  console.log();
}
