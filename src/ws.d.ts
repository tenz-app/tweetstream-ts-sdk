declare module "ws" {
  export const WebSocket: typeof globalThis.WebSocket;
  const defaultExport: {
    WebSocket: typeof globalThis.WebSocket;
  };

  export default defaultExport;
}
