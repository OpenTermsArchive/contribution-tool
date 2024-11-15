type WithClassname<T = {}> = T & { className?: string };

declare module '@opentermsarchive/engine/fetch';
declare module '@opentermsarchive/engine/extract';
declare module '@opentermsarchive/engine/sourceDocument';

declare module '*.svg' {
  const content: React.FC<React.SVGProps<SVGSVGElement>>;
  export default content;
}
