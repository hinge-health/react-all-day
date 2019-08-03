import * as React from "react";
import { bindActionCreators } from 'redux';
import { connect } from "react-redux";
import "./App.css";
import { RootState } from "./redux/reducers";
import { counterActions } from "./redux/actions";

interface ConnectProps {
  counter: number;
  onIncrement: (amount?: number) => void;
  onIncrementAsync: (amount?: number) => void;
}

type Props = {} & ConnectProps;

interface State {
  isLoading: boolean
};

export class App extends React.PureComponent<Props, State> {
  constructor(props: ConnectProps) {
    super(props);
    this.state = { isLoading: false };
  }

  incrementByCurrVal() {
    const { onIncrement } = this.props;
    onIncrement(this.props.counter);
  }

  async incrementAsync() {
    const { onIncrementAsync } = this.props;
    await this.setState({
      isLoading: true
    });

    await onIncrementAsync()
    this.setState({ isLoading: false });
  }

  render() {
    return (
      <>
        <section className="hero is-primary">
          <div className="hero-body">
            <div className="container">
              <h1 className="title">Counter App</h1>
            </div>
          </div>
        </section>
        { this.state.isLoading && <span>Loading...</span> }
        <section className="container">
          <div className="level">
            <div className="level-item has-text-centered">
              <div>
                <p className="heading">Counter</p>
                <p className="title">{this.props.counter}</p>
              </div>
            </div>
          </div>
          <div className="field is-grouped">
            <p className="control">
              <button onClick={ this.incrementByCurrVal.bind(this) } className="button" id="increment-btn">
                Click to increment
              </button>
            </p>
            <p className="control">
              <button onClick={ this.incrementAsync.bind(this) } className="button" id="delay-increment-btn">
                Click to increment slowly
              </button>
            </p>
            <p className="control">
              <button className="button" id="remote-fetch-btn">
                Click to fetch server-side
              </button>
            </p>
          </div>
        </section>
      </>
    );
  }
}

const mapStateToProps = (state: RootState) => ({
  counter: state.counter.value
});

const mapDispatchToProps = (dispatch: any) => // TODO: figure out this type
  bindActionCreators({
    onIncrement: counterActions.increment,
    onIncrementAsync: counterActions.delayIncrement
  }, dispatch)

export default connect(mapStateToProps, mapDispatchToProps)(App);
