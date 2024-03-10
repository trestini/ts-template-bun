export default async function(ms: number) {
  return new Promise((resolve, _) => {
    const timer = setInterval(() => {
      clearInterval(timer);
      resolve(true);
    }, ms);
  });
}
