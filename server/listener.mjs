export function listenServer(server, port, host) {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      server.off("listening", ready);
      server.off("error", failed);
    };
    const ready = () => {
      cleanup();
      resolve(server.address());
    };
    const failed = (error) => {
      cleanup();
      reject(error);
    };
    server.once("listening", ready);
    server.once("error", failed);
    try {
      server.listen(port, host);
    } catch (error) {
      failed(error);
    }
  });
}
