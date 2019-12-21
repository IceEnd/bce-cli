interface PKG {
  version: string;
}

declare module '*.json' {
  const value: any;
  export default value;
}

declare module 'bce-sdk-js';
