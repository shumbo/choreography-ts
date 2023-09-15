/**
 * Given a wrapper function and a set of methods, wrap each method in the set with the wrapper function.
 * @param wrapper
 * @param methods
 * @returns a copy of the methods object with each method wrapped
 */
export function wrapMethods<T extends Record<string, any>>(
  wrapper: (m: any) => any,
  methods: T,
) {
  const copy = { ...methods };
  for (const [name, fn] of Object.entries(methods)) {
    (copy as any)[name] = wrapper(fn);
  }
  return copy;
}
