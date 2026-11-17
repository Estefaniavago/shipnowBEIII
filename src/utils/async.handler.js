// Envuelve un controller (sync o async) y deriva cualquier error al middleware global.
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve()
    .then(() => fn(req, res, next))
    .catch(next);
