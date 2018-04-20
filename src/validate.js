/* 
 * Modification of the ws project. Copyright (c) 2011 Einar Otto Stangvik. 
 * Available on https://github.com/websockets/ws/
 * 
 * This work is licensed under the terms of the MIT license.
 */

import isValidUtf8 from 'utf-8-validate';

export { isValidUtf8 };

/**
 * Check if a status code is allowed in a CLOSE frame
 */
export function isValidStatusCode(code) {
  return (
    (code >= 1000 &&
      code <= 1013 &&
      code !== 1004 &&
      code !== 1005 &&
      code !== 1006) ||
    (code >= 3000 && code <= 4999)
  );
}
