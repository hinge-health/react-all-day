import * as Bluebird from "bluebird";
import { configure, mount } from "enzyme";
import * as Adapter from "enzyme-adapter-react-16";
import * as React from "react";
import { Provider } from "react-redux";
import App from "./App";
import { Breadcrumb } from "./Breadcrumb";
import { configureStore } from "./redux";
import { DELAY_MAX } from "./Server";
//import { render } from "react-dom";
import XReactDom from "react-dom";

configure({ adapter: new Adapter() });

test("Challenge 1: Breadcrumb component", () => {
  /**
   * Flesh out the `Breadcrumb` to take an array of numbers and render the DOM
   * structure for a breadcrumb list as demonstrated here (but don't use anchor
   * tags `<a>`):
   * https://bulma.io/documentation/components/breadcrumb/
   *
   * - Items in the breadcrumb list must be rounded to
   *     **3 significant digits** with leading and trailing zeroes.
   *
   * When that's done, unskip this test and run `yarn test` in a console to see
   * the result.
   */

  const component = mount(<Breadcrumb values={[0.2, 0.44456, 13.33]} />);
  expect(
    component.contains(
      <div className="breadcrumb">
        <ul>
          <li>0.200</li>
          <li>0.445</li>
          <li>13.330</li>
        </ul>
      </div>
    )
  ).toBe(true);

  /**
   * Notes on my attempt: 
   * As it stands, compilation of this test results in an error
   * "Index 0 closes the circle." This is something to do with the 
   * stringify function, but I'm not sure how to resolve it.
   * Ideally, this function would iterate through the Breadcrumb values
   * array depending on the array's length and format each element 
   * into a DOM structure.  
   */

  class Breadcrumb extends React.PureComponent<Props> {
  <nav class="breadcrumb is-medium" aria-label="breadcrumbs">
    <ul>
      <li>{values[0]}</li>
      <li>{values[1]}</li>
      <li>{values[2]}</li>
    </ul>
   </nav>
   }
   ReactDOM.render(document.getElementById('root'));

});

skip.test("Challenge 2: dispatching redux actions", () => {
  /**
   * The App component is set up to display the current count for the counter
   * reducer.
   *
   * Modify the App component so that it will increment the counter by
   * **the current count** when the `#increment-btn` element is clicked.
   */

  const store = configureStore();
  const app = mount(
    <Provider store={store}>
      <App />
    </Provider>
  );
  const button = app.find("#increment-btn");

  expect(app.contains(<p className="title">{1}</p>)).toBe(true);

  button.simulate("click");

  expect(app.contains(<p className="title">{2}</p>)).toBe(true);

  button.simulate("click");

  expect(app.contains(<p className="title">{4}</p>)).toBe(true);

  button.simulate("click");

  expect(app.contains(<p className="title">{8}</p>)).toBe(true);

  button.simulate("click");

  expect(app.contains(<p className="title">{16}</p>)).toBe(true);
});

test.skip("Challenge 3: async redux actions", async () => {
  /**
   * This test will have you watch the progress of an asynchronous action
   * dispatch. Redux Thunk is already included in the project, but feel free to
   * use your library of choice (Redux Saga, Redux Observable, etc...)
   *
   * Modify the `App` component such that clicking the `#delay-increment-btn`
   * element will increment the counter with a 1 second delay (using the
   * `delayIncrement` action creator).
   *
   * While the increment is pending, display a "Loading" indicator using a span
   * element like so: `<span>Loading...</span>`.
   *
   * Bonus: Make the test run faster by using Sinon and getting rid of the
   * `Bluebird.delay` call.
   */

  const store = configureStore();
  const app = mount(
    <Provider store={store}>
      <App />
    </Provider>
  );
  const button = app.find("#delay-increment-btn");

  expect(app.contains(<p className="title">{1}</p>)).toBe(true);
  expect(app.contains(<span>Loading...</span>)).toBe(false);

  button.simulate("click");
  app.update(); // Ensure the component has re-rendered.

  expect(app.contains(<p className="title">{1}</p>)).toBe(true);
  expect(app.contains(<span>Loading...</span>)).toBe(true);

  await Bluebird.delay(2000);
  app.update();

  expect(app.contains(<p className="title">{2}</p>)).toBe(true);
  expect(app.contains(<span>Loading...</span>)).toBe(false);
});

test.skip("Challenge 4: remote API call", async () => {
  /**
   * For this test, write an action creator that calls the `getStuff()`
   * function from `Server.ts`. This method returns a promise that
   * eventually resolves with an array of numbers ranging from 0 to 1. To
   * successfully complete this challenge the following requirements must be
   * satisfied:
   *
   * - `App.tsx` must use the `Breadcrumb` component to display each number that
   *     is  **less than 0.5**.
   * - All components must be stateless (the results of the `getStuff()` call
   *     must be stored using a new reducer).
   * - The `Breadcrumb` must **not** re-render if `#increment-btn` is clicked.
   *
   * Once that action creator is ready, hook it up to the
   * `#remote-fetch-btn` element and unskip this test.
   *
   * Bonus 1: Make the test more reliable by reading the results of the
   * `getStuff` call from the store and using that to assert the contents of
   * the `Breadcrumb` list.
   *
   * Bonus 2: Add tests for the new action creator and reducer.
   *
   * Bonus 3: Use Sinon to make the test deterministic and eliminate all random
   * behavior.
   */

  const store = configureStore();
  const app = mount(
    <Provider store={store}>
      <App />
    </Provider>
  );
  const button = app.find("#remote-fetch-btn");

  button.simulate("click");
  await Bluebird.delay(DELAY_MAX);
  app.update();

  expect(app.contains(<li />)).toBe(true);
});
