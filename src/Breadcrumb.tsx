import * as React from "react";

export interface Props {
  values: number[];
}

const FIXED = 3;

export class Breadcrumb extends React.PureComponent<Props> {
  constructor(props: Props) {
    super(props);
  }

  getList() {
    const { values } = this.props;
    return values.map((val, index) => React.createElement('li', { key: index }, val.toFixed(FIXED)));
  }

  render() {
    return (
      <div className="breadcrumb">
        <ul>{ this.getList() }</ul>
      </div>
    );
  }
}
