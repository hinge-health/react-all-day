/**
 * The real meat and potatoes here is the `startAsync` action creator - if you're trying to understand how to keep track
 * of a promise within a container (e.g. to show a progress spinner) that is a good place to start.
 *
 * The concept basically revolves around keeping the state of asynchronous calls (promises) in one place, each tracked
 * by a unique string ID.
 *
 * There's a bit of machinery in here that resembles garbage collection - without this the app would slowly leak memory
 * while keeping track of state for every promise created with `startAsync`. Containers can decide they're interested in
 * the state of a promise by calling `retainAsyncState` to keep it from being automatically cleaned up.
 *
 * The net effect of this is to keep state out of the components, and not have promises leaking everywhere.
 */

import * as Bluebird from "bluebird";
import {
  ASYNC_FINISHED,
  ASYNC_REJECTED,
  ASYNC_RESOLVED,
  ASYNC_STARTED,
  CLEAN_ASYNC_STATE,
  RELEASE_ASYNC_STATE,
  RESET_ASYNC_STATE,
  RETAIN_ASYNC_STATE
} from "../constants";
import { AsyncStatus } from "../reducers/async";
import { selectAsyncStatus } from "../selectors/async";
import { Action, MetaAction, ThunkAction } from "./interfaces";

/** A function that returns a Promise. */
type PromiseThunk<T> = () => PromiseLike<T>;

export interface AsyncMetadata {
  asyncId: string;
}

/**
 * This is slightly evil, but the promises returned by `startAsync` have an `id` property attached to them.
 *
 * The alternative is having multiple return values, which would make promise chaining significantly less elegant.
 */
export interface AsyncCallPromise<T> extends Bluebird<T> {
  id: string;
}

export interface AsyncMetaAction extends MetaAction<AsyncMetadata> {
  type:
    | typeof ASYNC_FINISHED
    | typeof ASYNC_RESOLVED
    | typeof ASYNC_STARTED
    | typeof CLEAN_ASYNC_STATE
    | typeof RELEASE_ASYNC_STATE
    | typeof RESET_ASYNC_STATE
    | typeof RETAIN_ASYNC_STATE;
}

export interface AsyncErrorAction extends Action<Error, AsyncMetadata> {
  error: true;
  type: typeof ASYNC_REJECTED;
}

export type AsyncAction = AsyncMetaAction | AsyncErrorAction;

/** How long to wait before attempting to automatically clean up the state. See `cleanAsyncState`. */
export const CLEAN_DELAY = 1000;
/** A collection of pending callbacks to `cleanAsyncState`. */
export const pendingCleanCallbacks: {
  [id: string]: number;
} = {};
/**
 * A collection of promises generated by `startAsync`. This is cached so that repeated calls to `startAsync` with the
 * same async ID can return the same promise rather than make the async call again.
 */
export const asyncCallCache: { [id: string]: AsyncCallPromise<{}> } = {};
/** The next async ID to use. */
let nextAsyncId = 0;

/**
 * Generates a unique async call ID for calls that do not want to explicitly set one.
 */
function genAsyncId() {
  return `async-${nextAsyncId++}`;
}

function isPromise<T>(p: {}): p is PromiseLike<T> {
  const maybePromise = p as PromiseLike<T>;
  return typeof maybePromise.then === "function";
}

export const actionCreators = {
  /**
   * This action creator will be called automatically after `CLEAN_DELAY` milliseconds when using `startAsync` to clean
   * up the state for the async call. If the retain count is greater than zero nothing will happen, and the state will
   * instead be cleared once `releaseAsyncState` is eventually called. This takes care of the case where an async call
   * is used in a "fire and forget" fashion and there are no mounted containers actually watching the state of that
   * call.
   *
   * This is not typically called directly, use `startAsync` instead.
   *
   * @param id The async call ID.
   */
  cleanAsyncState(id: string): AsyncMetaAction {
    clearTimeout(pendingCleanCallbacks[id]);
    delete pendingCleanCallbacks[id];
    return { meta: { asyncId: id }, type: CLEAN_ASYNC_STATE };
  },
  /**
   * Call this action creator to indicate that a container is no longer interested in the results of an async call. This
   * will decrement an internal reference count, and when it hits zero the state for that call will be erased (if it's
   * not still pending).
   *
   * @param id The async call ID.
   */
  releaseAsyncState(id: string): AsyncMetaAction {
    return { meta: { asyncId: id }, type: RELEASE_ASYNC_STATE };
  },
  /**
   * Call this action creator to reset the state of a finished (`RESOLVED` or `REJECTED`) async call back to
   * `NOT_STARTED`.
   *
   * @param id The async call ID.
   */
  resetAsyncState(id: string): AsyncMetaAction {
    return { meta: { asyncId: id }, type: RESET_ASYNC_STATE };
  },
  /**
   * Call this action creator to indicate that a container is interested in the results of an async call. The state will
   * remain in the store until all containers that have called `retainAsyncState` eventually call `releaseAsyncState`.
   *
   * Note that it is perfectly valid (and expected) to call this for async calls that have not started yet!
   *
   * Containers have `CLEAN_DELAY` milliseconds to dispatch this action after calling `startAsync` or else the state
   * will be cleaned up automatically.
   *
   * See `containers/AsyncTracker` for a way to automate this a bit.
   *
   * @param id The async call ID.
   */
  retainAsyncState(id: string): AsyncMetaAction {
    return { meta: { asyncId: id }, type: RETAIN_ASYNC_STATE };
  },
  /**
   * Indicate that an async call is finished. Normally this will do nothing because it's called after `rejectAsync` or
   * `resolveAsync`, but if a promise is cancelled the async state would be stuck at PENDING until this is called.
   *
   * This is not typically called directly, use `startAsync` instead.
   *
   * @param id The async call ID.
   */
  finishAsync(id: string): AsyncMetaAction {
    return { meta: { asyncId: id }, type: ASYNC_FINISHED };
  },
  /**
   * Indicate that an async call was rejected.
   *
   * This is not typically called directly, use `startAsync` instead.
   *
   * @param id The async call ID.
   * @param error The error thrown.
   */
  rejectAsync(id: string, error: Error): AsyncErrorAction {
    return {
      error: true,
      meta: { asyncId: id },
      payload: error,
      type: ASYNC_REJECTED
    };
  },
  /**
   * Indicate that an async call was completed successfully.
   *
   * This is not typically called directly, use `startAsync` instead.
   *
   * @param id The async call ID.
   */
  resolveAsync(id: string): AsyncMetaAction {
    return { meta: { asyncId: id }, type: ASYNC_RESOLVED };
  },
  /**
   * Track the state of an asynchronous call (represented as a promise). Containers interested in the status of the call
   * should call `retainAsyncState` on the returned promise's ID. Note that `retainAsyncState` may/should be called
   * before calling this function!
   *
   * @param thunk A promise, or a promise thunk (a function that returns a promise, preferred). Bluebird promises are
   * OK; the returned promise will be cast to a bluebird promise regardless.
   * @param asyncId An explicit ID to use for this async call. This is useful for calls where only one should be pending
   * at a time; attempts to make another async call with the same ID will instead return the same value as the previous
   * call. This works best when passing a thunk rather than a promise as the first argument. If not provided, an
   * automatic unique ID will be generated.
   * @returns Either the original promise passed in as `thunk`, or the same promise that was returned from a previous
   * invocation of `startAsync` if an explicit `asyncId` is passed and the call is currently pending. This promise also
   * has an additional `id` property in case an explicit `asyncId` was not provided.
   */
  startAsync<T>(
    thunk: PromiseLike<T> | PromiseThunk<T>,
    asyncId?: string
  ): ThunkAction<AsyncCallPromise<T>> {
    return (dispatch, getState) => {
      const id = asyncId || genAsyncId();
      const existingState = selectAsyncStatus(getState(), id);

      if (existingState === AsyncStatus.PENDING) {
        const existingPromise = asyncCallCache[id];

        if (existingPromise === undefined) {
          throw new Error(
            `Attempted to fork off an existing async call (${id}) but promise is missing from cache.`
          );
        }

        /* istanbul ignore next */
        if (isPromise(thunk)) {
          console.warn(
            `A promise was passed directly to startAsync while an existing async call was pending for ${id}, ` +
              `which can lead to unexpected behavior. Either wait for the existing call to finish, cancel it, or pass ` +
              `a thunk instead. Passing a thunk will completely prevent the async call from starting if it's already ` +
              `pending.`
          );
        }

        return existingPromise as AsyncCallPromise<T>;
      }

      dispatch<AsyncMetaAction>({ meta: { asyncId: id }, type: ASYNC_STARTED });
      clearTimeout(pendingCleanCallbacks[id]);

      const p = isPromise(thunk) ? thunk : thunk();
      let b = p instanceof Bluebird ? p : Bluebird.resolve(p);

      b = b
        .then(res => {
          dispatch(actionCreators.resolveAsync(id));
          return res;
        })
        .catch(err => {
          dispatch(actionCreators.rejectAsync(id, err));
          throw err;
        })
        .finally(() => {
          delete asyncCallCache[id];
          dispatch(actionCreators.finishAsync(id));
          // HACK: Casting the delay as any forces typescript to assume the DOM version of setTimeout.
          pendingCleanCallbacks[id] = (setTimeout(
            () => dispatch(actionCreators.cleanAsyncState(id)),
            CLEAN_DELAY
          ) as any) as number;
        });

      const a = b as AsyncCallPromise<T>;
      a.id = id;
      asyncCallCache[id] = a;
      return a;
    };
  }
};
