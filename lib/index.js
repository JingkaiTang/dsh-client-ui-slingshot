/**
 * Host-side registration for the slingshot toy.
 *
 * The toy itself is browser-only: every bit of logic lives in the client
 * bundle (`./client`). This entry exists only so the loader row has a valid
 * host plugin to mount — it does nothing on the host plane.
 */
const apply = () => {};

export default apply;
export { apply };
