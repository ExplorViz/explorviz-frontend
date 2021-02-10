export default function isObject(obj: any): obj is object {
  return Object.prototype.toString.call(obj) === '[object Object]';
}
