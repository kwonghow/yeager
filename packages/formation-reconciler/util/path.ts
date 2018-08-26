import { Field, FormState } from '../types';

/**
 * getFieldNameFromPath
 *
 * Given a field path `someCompositeField.someChildField.someGrandchildField`,
 * returns `someGrandchildField`.
 *
 * @param {string)} path
 * @returns {string =>}
 */
export const getFieldNameFromPath = (path: string): string => {
  const pathArray = path.split('.');

  // top-level field
  if (pathArray.length === 1) {
    return pathArray[0];
  }

  return pathArray[pathArray.length - 1];
};

/**
 * getFormStatePath
 *
 * Takes a 'naked' path that can be used to access deep fields in FormData and
 * injects intermediate `value` fields so it can be used to access Fields in
 * FormState (immutable map). If internalId is given, the element of the
 * path array is replaced with the internalId.
 *
 * @param {string} path
 * @param {string} internalId
 * @returns {string[]} formStatePath
 */
export const getFormStatePath = (path: string, internalId?: string): string[] => {
  const withValuePath = path.replace('.', '.value.');
  const formStatePath = withValuePath.split('.');

  if (internalId) {
    formStatePath[formStatePath.length - 1] = internalId;
  }

  return formStatePath;
};

/**
 * getInPath
 *
 * Convenience method for retrieving a nested Field with a 'naked' path.
 *
 * @param {FormState} state
 * @param {string[]} path
 * @returns {Field}
 */
export const getInPath = (state: FormState, path: string[]): Field => {
  let [head, ...tail] = path;
  let currentValue: any;

  while (tail.length > 0) {
    currentValue = tail.length > 1 ? state.get(head).value : state.get(head);
    [head, ...tail] = tail;
  }

  return currentValue;
};
