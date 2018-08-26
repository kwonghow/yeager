export interface Cancelable<T = any> {
  cancel: () => void;
  promise: Promise<T>;
}

/**
 * Simple function that wraps a Promise and makes it cancelable.
 * Useful for cancelling a Promise that's created in constructor,
 * but may or may not resolve before the component is unmounted.
 *
 * See https://facebook.github.io/react/blog/2015/12/16/ismounted-antipattern.html
 * for an explanation of why `isMounted` is not used instead.
 *
 * @template T
 * @template any
 * @param {Promise<T>} promise
 * @returns {Cancelable<T>}
 */
export const cancelable = <T = any>(promise: Promise<T>): Cancelable<T> => {
  let isCancelled = false;

  const wrapper = new Promise<any>((resolve, reject) => {
    promise
      .then((val) => (isCancelled ? reject({ canceled: true }) : resolve(val)))
      .catch(
        (err: any) => (isCancelled ? reject({ canceled: true }) : reject(err)),
      );
  });

  return {
    promise: wrapper,
    cancel: () => (isCancelled = true),
  };
};

export const isCanceled = (result: any): result is { canceled: boolean } => {
  if (result && (result as { canceled: boolean }).canceled) {
    return true;
  }

  return false;
};
