/** @desc Returns Linux epoch in seconds. */
export function now() {
  return Math.floor(new Date().getTime() / 1000);
}

/** @desc Returns seconds since a previous time in seconds. */
export function secondsSince(time: number) {
  return now() - time;
}
