export const SEND_EV = "__SOCKETIO_SEND__";
export const RECV_EV = "__SOCKETIO_RECV__";

export function createRoomId(prefix: string, location: string) {
  return `${prefix}/${location}`;
}
