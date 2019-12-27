#!/usr/bin/env node
import program from 'commander';
import { putFile, putFolder } from './lib/bos';
import { add, detail, edit, list, remove, use} from './lib/data';
import PKG from './package.json';

program
  .version(PKG.version);

program
  .command('ls')
  .description('list all the buckets')
  .action(list);

program
  .command('show <name>')
  .description('show detail of the bucket')
  .action(detail);

program
  .command('config <name>')
  .description('set bucket info')
  .usage('[options] <name ...>')
  .option('-h --host <host>', 'bucket host', '')
  .option('-p --prefix <prefix>', 'object key prefix', '')
  .option('-b --bucket <bucket>', 'bucket', '')
  .option('-e --endpoint <endpoint>', 'endpoint', '')
  .option('-a --ak <ak>', '', '')
  .option('-s --sk <sk>', '', '')
  .action(edit);

program
  .command('add')
  .description('add bucket info')
  .action(add);

program
  .command('use <name>')
  .description('change bucket')
  .action(use);

program
  .command('remove <bucket>')
  .description('delete bucket')
  .action(remove);

program
  .command('put <file>')
  .description('put file to bos')
  .usage('[options] <file ...>')
  .option('-b --bucket <bucket>', 'bucket name', '')
  .option('-p --prefix <prefix>', 'prefix', '')
  .option('-k --objectKey <objectKey>', 'object key', '')
  .option('-c --cache <cache>', 'cache control', '')
  .option('--md5', 'use md5 name file', true)
  .option('--no-md5', 'do not use md5 name file')
  .option('-o --override', 'override', false)
  .action(putFile);

program
  .command('putfolder <dir>')
  .description('put folder to bos')
  .usage('[options] <dir ...>')
  .option('-b --bucket <name>', 'bucket name', '')
  .option('-p --prefix <prefix>', 'bos prefix path', '')
  .option('-l --limit <limit>', 'upload limit', 10)
  .option('-e --ext <ext>', 'file ext name', '')
  .option('-f --flat', 'flat folder', false)
  .option('-c --cache <cache>', 'cache control', '')
  .option('--md5', 'use md5 name file', true)
  .option('--no-md5', 'do not use md5 name file')
  .option('-o --override', 'override', false)
  .action(putFolder);

program
  .parse(process.argv);

if (process.argv.length === 2) {
  program.outputHelp();
}
