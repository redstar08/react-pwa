export const PromisePool = (limit) => {
  const deque = [];
  let activeCount = 0;

  const run = async ({ task, resolve, reject }) => {
    try {
      activeCount++;
      const res = task();
      resolve(res);
      await res;
    } catch (error) {
      reject(error);
    } finally {
      activeCount--;
      if (deque.length > 0) {
        deque.shift()();
      }
    }
  };

  const addTask = ({ task, resolve, reject }) => {
    deque.push(() => run({ task, resolve, reject }));
    (async () => {
      await Promise.resolve();
      if (deque.length > 0 && activeCount < limit) {
        deque.shift()();
      }
    })();
  };

  const generator = (task) => {
    return new Promise((resolve, reject) => {
      addTask({ task, resolve, reject });
    });
  };

  return generator;
};
