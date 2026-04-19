/**
 * storeRef — a tiny module that holds a reference to the Redux store
 * so the Axios interceptor can dispatch actions (e.g. auto-logout on 401)
 * without creating a circular dependency.
 *
 * Usage:
 *   - Call setStore(store) once in store/index.js after the store is created.
 *   - Call getStore() anywhere in src/api to read or dispatch.
 */

let _store = null;

export const setStore = (store) => {
    _store = store;
};

export const getStore = () => _store;
